import { ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  approveBookingApi,
  getLandlordBookingsApi,
  rejectBookingApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyBookings from "../../assets/illustrations/empty-bookings.png";
import BookingCard from "../../components/accommodation/BookingCard";
import BookingFilters from "../../components/accommodation/BookingFilters";
import BookingSummaryCards from "../../components/accommodation/BookingSummaryCards";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";

export default function LandlordBookingsDashboardPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  /* ── Filters ── */
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await getLandlordBookingsApi();
      setBookings(data.bookings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  /* ── Actions ── */
  const handleApprove = async () => {
    try {
      await approveBookingApi(approveTarget._id);
      toast.success("Booking approved");
      setApproveTarget(null);
      await loadBookings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to approve booking");
    }
  };

  const handleReject = async (reason) => {
    try {
      await rejectBookingApi(rejectTarget._id, { rejectionReason: reason });
      toast.success("Booking rejected");
      setRejectTarget(null);
      await loadBookings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject booking");
    }
  };

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: bookings.length,
    requested: bookings.filter((b) => b.status === "REQUESTED").length,
    paymentPending: bookings.filter((b) => ["APPROVED", "PAYMENT_PENDING"].includes(b.status)).length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    closed: bookings.filter((b) => ["REJECTED", "CANCELLED"].includes(b.status)).length,
  }), [bookings]);

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    let result = [...bookings];

    // Status filter
    if (statusFilter === "REQUESTED") {
      result = result.filter((b) => b.status === "REQUESTED");
    } else if (statusFilter === "PAYMENT_PENDING") {
      result = result.filter((b) => ["APPROVED", "PAYMENT_PENDING"].includes(b.status));
    } else if (statusFilter === "CONFIRMED") {
      result = result.filter((b) => b.status === "CONFIRMED");
    } else if (statusFilter === "CLOSED") {
      result = result.filter((b) => ["REJECTED", "CANCELLED"].includes(b.status));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          (b.studentId?.fullName || "").toLowerCase().includes(q) ||
          (b.studentId?.email || "").toLowerCase().includes(q) ||
          (b.listingId?.title || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return result;
  }, [bookings, statusFilter, searchQuery, sortOrder]);

  /* Auto-expand first booking when very few results on desktop */
  const autoExpandFirst = !loading && filtered.length > 0 && filtered.length <= 3;

  return (
    <>
      <div className="space-y-6">
        {/* ── Hero ── */}
        <PageHero
          eyebrow="LANDLORD WORKSPACE"
          title="Bookings"
          description="Manage requests, approvals, and tenant stays."
          backgroundImage={dashboardBanner}
          compact
        />

        {/* ── KPI cards ── */}
        <BookingSummaryCards stats={stats} />

        {/* ── Filters ── */}
        <BookingFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />

        {/* ── Content ── */}
        {loading ? (
          <LoadingState
            title="Loading bookings"
            description="Fetching student requests and payment progress."
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            image={emptyBookings}
            imageAlt="No bookings illustration"
            title="No booking requests yet"
            description="When students request one of your listings, the full approval workflow will appear here."
            action={
              <Link to="/landlord/listings" className="btn-primary">
                View listings
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} strokeWidth={1.8} />}
            title="No matching bookings"
            description="Try adjusting your filters or search query."
            compact
          />
        ) : (
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Booking log
                </div>
                <h4 className="mt-1.5 text-lg font-bold text-slate-900">
                  Booking activity
                </h4>
              </div>
              <span className="shrink-0 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600">
                {filtered.length} {filtered.length === 1 ? "booking" : "bookings"}
              </span>
            </div>

            {filtered.map((booking, index) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onApprove={setApproveTarget}
                onReject={setRejectTarget}
                defaultExpanded={autoExpandFirst && index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <ConfirmModal
        open={!!approveTarget}
        title="Approve booking request?"
        description={
          approveTarget
            ? `Approve the booking request for ${approveTarget.studentId?.fullName || "this student"}?`
            : ""
        }
        confirmLabel="Approve booking"
        onConfirm={handleApprove}
        onClose={() => setApproveTarget(null)}
      />

      <ConfirmModal
        open={!!rejectTarget}
        title="Reject booking request?"
        description="Please provide a reason before rejecting this booking request."
        confirmLabel="Reject booking"
        confirmTone="danger"
        requireReason
        reasonLabel="Rejection reason"
        reasonPlaceholder="Explain why this booking request is being rejected..."
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
      />
    </>
  );
}
