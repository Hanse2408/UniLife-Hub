import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  MapPin,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyBookingsApi } from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyBookings from "../../assets/illustrations/empty-bookings.png";

const payableStatuses = ["APPROVED", "PAYMENT_PENDING"];
const progressSteps = ["Requested", "Approved", "Payment", "Confirmed"];

function formatCurrency(amount) {
  return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function getProgressIndex(status) {
  if (status === "REQUESTED") return 0;
  if (status === "APPROVED") return 1;
  if (status === "PAYMENT_PENDING") return 2;
  if (status === "CONFIRMED") return 3;
  return -1;
}

function getBookingMeta(booking) {
  if (booking.status === "REQUESTED") {
    return {
      title: "Awaiting landlord review",
      description: "Your request has been submitted. The landlord needs to approve or reject it before payment can happen.",
    };
  }

  if (booking.status === "APPROVED") {
    return {
      title: "Approved and ready for payment",
      description: "The landlord approved your request. Complete the demo payment step to secure this room.",
    };
  }

  if (booking.status === "PAYMENT_PENDING") {
    return {
      title: "Payment still required",
      description: "This booking is waiting for your payment. Once the demo gateway step is complete, the stay can be confirmed.",
    };
  }

  if (booking.status === "CONFIRMED") {
    return {
      title: "Stay confirmed",
      description: "Your booking payment is complete and the accommodation workflow is now active.",
    };
  }

  if (booking.status === "REJECTED") {
    return {
      title: "Request declined",
      description: booking.rejectionReason || "The landlord declined this request.",
    };
  }

  if (booking.status === "CANCELLED") {
    return {
      title: "Booking cancelled",
      description: "This booking is no longer active.",
    };
  }

  return {
    title: "Booking update",
    description: "Check this booking for the latest accommodation status.",
  };
}

export default function BookingsDashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getMyBookingsApi();
        setBookings(data.bookings || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      awaitingReview: bookings.filter((b) => b.status === "REQUESTED").length,
      readyToPay: bookings.filter((b) => payableStatuses.includes(b.status)).length,
      confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
      declined: bookings.filter((b) => ["CANCELLED", "REJECTED"].includes(b.status)).length,
    };
  }, [bookings]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Student Accommodation"
        title="My Bookings"
        description="Track your accommodation requests, approvals, payment progress, and confirmed stays in one place."
        backgroundImage={dashboardBanner}
        compact
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total bookings" value={stats.total} tone="indigo" icon={Building2} />
        <StatCard title="Awaiting review" value={stats.awaitingReview} tone="amber" icon={Clock3} />
        <StatCard title="Ready to pay" value={stats.readyToPay} tone="blue" icon={CreditCard} />
        <StatCard title="Confirmed stays" value={stats.confirmed} tone="emerald" icon={CheckCircle2} />
        <StatCard title="Declined / closed" value={stats.declined} tone="rose" icon={CircleX} />
      </div>

      {loading ? (
        <LoadingState
          title="Loading bookings"
          description="Pulling in your accommodation requests, approval states, and payment actions."
        />
      ) : bookings.length === 0 ? (
        <EmptyState
          image={emptyBookings}
          imageAlt="No bookings illustration"
          title="No bookings yet"
          description="Start by exploring available student accommodation listings and send your first booking request."
          action={
            <Link to="/student/listings" className="btn-primary">
              Browse listings
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const meta = getBookingMeta(booking);
            const progressIndex = getProgressIndex(booking.status);
            const amountDueNow = booking.totalBookingAmount || booking.keyMoneyAmount || booking.rentAmount || 0;
            const hasListingLink = Boolean(booking.listingId?._id);

            return (
              <div key={booking._id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900 sm:text-xl">
                        {booking.listingId?.title || "Listing unavailable"}
                      </h4>
                      <StatusBadge value={booking.status} />
                      {payableStatuses.includes(booking.status) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                          Action required
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} strokeWidth={2.1} className="text-slate-400" />
                      {booking.listingId?.location?.city || "Unknown city"} / {booking.listingId?.location?.area || "Unknown area"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400/80 sm:inline">
                      #{String(booking._id).slice(-6).toUpperCase()}
                    </span>

                    {hasListingLink && !["REJECTED", "CANCELLED"].includes(booking.status) && (
                      <button
                        type="button"
                        onClick={() => navigate("/student/chat", { state: { listingId: booking.listingId._id, listingTitle: booking.listingId?.title } })}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
                        title="Chat with landlord"
                      >
                        <MessageSquare size={14} strokeWidth={2.2} />
                        Chat
                      </button>
                    )}

                    {payableStatuses.includes(booking.status) ? (
                      <Link to={`/student/bookings/${booking._id}/pay`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 text-sm font-bold text-white shadow-md shadow-slate-900/15 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-lg active:scale-[0.98]">
                        Complete payment
                      </Link>
                    ) : booking.status === "CONFIRMED" ? (
                      <Link to="/student/payments" className="btn-secondary">
                        View payments
                      </Link>
                    ) : hasListingLink ? (
                      <Link to={`/student/listings/${booking.listingId._id}`} className="btn-secondary">
                        View listing
                      </Link>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        No action available
                      </span>
                    )}
                  </div>
                </div>

                {/* Info message */}
                <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
                  <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-6 ${payableStatuses.includes(booking.status)
                    ? "border border-amber-100 bg-amber-50/70 text-amber-800"
                    : booking.status === "CONFIRMED"
                      ? "border border-emerald-100 bg-emerald-50/70 text-emerald-800"
                      : "bg-slate-50 text-slate-600"
                    }`}>
                    <div className="mt-0.5 shrink-0">
                      {payableStatuses.includes(booking.status) ? (
                        <CreditCard size={16} strokeWidth={2} className="text-amber-500" />
                      ) : booking.status === "CONFIRMED" ? (
                        <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-500" />
                      ) : (
                        <Clock3 size={16} strokeWidth={2} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{meta.title}</div>
                      <div className="mt-0.5 text-[13px] opacity-80">{meta.description}</div>
                    </div>
                  </div>
                </div>

                {/* Key details */}
                <div className="grid gap-px bg-slate-100 sm:grid-cols-2 md:grid-cols-4">
                  <div className="border-l-2 border-indigo-400 bg-white px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <Wallet size={12} strokeWidth={2.2} className="text-indigo-400" />
                      Amount Due Now
                    </div>
                    <div className="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900">
                      {formatCurrency(amountDueNow)}
                    </div>
                  </div>

                  <div className="border-l-2 border-emerald-400 bg-white px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <CreditCard size={12} strokeWidth={2.2} className="text-emerald-400" />
                      Monthly Rent
                    </div>
                    <div className="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900">
                      {formatCurrency(booking.rentAmount)}
                    </div>
                  </div>

                  <div className="border-l-2 border-blue-400 bg-white px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <CalendarDays size={12} strokeWidth={2.2} className="text-blue-400" />
                      Move-in Date
                    </div>
                    <div className="mt-1.5 text-sm font-bold text-slate-900">
                      {formatDate(booking.moveInDate)}
                    </div>
                  </div>

                  <div className="border-l-2 border-cyan-400 bg-white px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <CalendarDays size={12} strokeWidth={2.2} className="text-cyan-400" />
                      Visit Date
                    </div>
                    <div className="mt-1.5 text-sm font-bold text-slate-900">
                      {formatDate(booking.visitDate)}
                    </div>
                  </div>
                </div>

                {["REJECTED", "CANCELLED"].includes(booking.status) ? (
                  <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                      {booking.rejectionReason || "This booking is not active anymore. You can explore other listings and submit a new request."}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                    <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Booking Progress
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      {progressSteps.map((step, index) => {
                        const complete = progressIndex > index;
                        const current = progressIndex === index;

                        return (
                          <div
                            key={step}
                            className={`relative overflow-hidden rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${current
                              ? "border-blue-300 bg-blue-50 text-blue-800 shadow-sm shadow-blue-100/60 ring-2 ring-blue-200/50"
                              : complete
                                ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-700"
                                : "border-slate-200 bg-slate-50/50 text-slate-400"
                              }`}
                          >
                            {current && (
                              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                            )}
                            <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${current ? "text-blue-600" : complete ? "text-emerald-500/70" : "text-slate-400"
                              }`}>
                              Step {index + 1}
                            </div>
                            <div className={`mt-0.5 font-semibold ${current ? "text-blue-800" : ""
                              }`}>{step}</div>
                            {complete && (
                              <CheckCircle2 size={14} className="absolute right-3 top-3 text-emerald-400" />
                            )}
                            {current && (
                              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-400/50" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}