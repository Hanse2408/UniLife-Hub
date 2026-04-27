import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getPendingVendorsApi,
  verifyVendorApi,
  rejectVendorApi,
} from "../../api/client";
import adminIllustration from "../../assets/illustrations/admin-verification.png";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

export default function PendingVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const { data } = await getPendingVendorsApi();
      setVendors(data.vendors || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load vendors");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleVerify = async () => {
    try {
      await verifyVendorApi(verifyTarget._id);
      toast.success("Vendor verified successfully");
      setVerifyTarget(null);
      await loadVendors();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to verify vendor");
    }
  };

  const handleReject = async () => {
    try {
      await rejectVendorApi(rejectTarget._id);
      toast.success("Vendor rejected successfully");
      setRejectTarget(null);
      await loadVendors();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject vendor");
    }
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const recent = vendors.filter(
      (vendor) => now - new Date(vendor.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
    ).length;

    return {
      total: vendors.length,
      withPhone: vendors.filter((vendor) => Boolean(vendor.phone)).length,
      recent,
    };
  }, [vendors]);

  return (
    <>
      <div className="space-y-6">
        <PageHero
          eyebrow="Admin Console"
          title="Pending Vendors"
          description="Review food vendor registration requests and approve trusted sellers before they enter the food system."
          backgroundImage={dashboardBanner}
          sideImage={adminIllustration}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending vendors" value={stats.total} tone="amber" icon={Store} />
          <StatCard
            title="Review status"
            value={stats.total > 0 ? "Action needed" : "Clear"}
            tone={stats.total > 0 ? "rose" : "emerald"}
            icon={stats.total > 0 ? XCircle : CheckCircle2}
          />
          <StatCard title="Profiles with phone" value={stats.withPhone} tone="blue" icon={Phone} />
          <StatCard title="Recent signups" value={stats.recent} tone="indigo" icon={Clock3} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <QuickActionCard
            to="/admin/landlords"
            icon={ShieldCheck}
            title="Landlord reviews"
            description="Move between accommodation verification and vendor moderation without leaving the admin review flow."
            tone="indigo"
            eyebrow="Accommodation"
          />
          <QuickActionCard
            to="/admin/listings"
            icon={Building2}
            title="Listing moderation"
            description="Check property approvals alongside seller verification so marketplace trust stays consistent."
            tone="emerald"
            eyebrow="Moderation"
          />
          <QuickActionCard
            to="/admin/notifications"
            icon={Bell}
            title="Admin notifications"
            description="Track vendor verification outcomes and other moderation events from one place."
            tone="amber"
            eyebrow="Updates"
          />
        </div>

        {loading ? (
          <LoadingState
            title="Loading vendor reviews"
            description="Collecting pending vendor verification requests for food marketplace moderation."
          />
        ) : vendors.length === 0 ? (
          <EmptyState
            image={adminIllustration}
            imageAlt="Admin verification illustration"
            title="No pending vendors"
            description="All vendor verification requests have been processed."
            tone="emerald"
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {vendors.map((vendor) => (
              <div key={vendor._id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{vendor.fullName}</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      This vendor needs admin verification before food items and orders can enter the live marketplace workflow.
                    </p>
                  </div>

                  <StatusBadge value={vendor.vendorVerificationStatus} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Mail size={14} strokeWidth={2.1} />
                      Email
                    </div>
                    <div className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {vendor.email}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Phone size={14} strokeWidth={2.1} />
                      Phone
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {vendor.phone || "No phone number"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CalendarDays size={14} strokeWidth={2.1} />
                      Registered On
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {new Date(vendor.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Verification unlocks vendor dashboard access for live marketplace operations, food item publishing, and order handling.
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    onClick={() => setVerifyTarget(vendor)}
                  >
                    Verify
                  </button>

                  <button
                    className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                    onClick={() => setRejectTarget(vendor)}
                  >
                    Reject
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <UserRound size={14} strokeWidth={2.1} />
                    Vendor ID {String(vendor._id).slice(-6).toUpperCase()}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={14} strokeWidth={2.1} />
                    Marketplace verification queue
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!verifyTarget}
        title="Verify vendor account?"
        description={
          verifyTarget
            ? `Approve ${verifyTarget.fullName} as a verified vendor?`
            : ""
        }
        confirmLabel="Verify vendor"
        onConfirm={handleVerify}
        onClose={() => setVerifyTarget(null)}
      />

      <ConfirmModal
        open={!!rejectTarget}
        title="Reject vendor registration?"
        description={
          rejectTarget
            ? `Reject the vendor registration request for ${rejectTarget.fullName}?`
            : ""
        }
        confirmLabel="Reject"
        confirmTone="danger"
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
      />
    </>
  );
}
