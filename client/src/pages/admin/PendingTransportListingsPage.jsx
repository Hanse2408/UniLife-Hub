import {
    Bell,
    Bus,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Route,
    ShieldCheck,
    UserRound,
    XCircle,
    Armchair,
    Banknote,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getPendingTransportListingsApi,
    approveTransportListingApi,
    rejectTransportListingApi,
} from "../../api/client";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

function formatCurrency(amount) {
    return `Rs. ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export default function PendingTransportListingsPage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approveTarget, setApproveTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const loadListings = async () => {
        try {
            setLoading(true);
            const { data } = await getPendingTransportListingsApi();
            setListings(data.listings || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load transport listings");
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, []);

    const handleApprove = async () => {
        try {
            await approveTransportListingApi(approveTarget._id);
            toast.success("Transport listing approved");
            setApproveTarget(null);
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to approve listing");
        }
    };

    const handleReject = async () => {
        try {
            await rejectTransportListingApi(rejectTarget._id, {
                rejectionReason: rejectionReason || undefined,
            });
            toast.success("Transport listing rejected");
            setRejectTarget(null);
            setRejectionReason("");
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reject listing");
        }
    };

    const stats = useMemo(() => {
        const busCount = listings.filter((l) => l.vehicleType === "BUS").length;
        const vanCount = listings.filter((l) => l.vehicleType === "VAN").length;
        return {
            total: listings.length,
            buses: busCount,
            vans: vanCount,
        };
    }, [listings]);

    return (
        <>
            <div className="space-y-6">
                <PageHero
                    eyebrow="Admin Console"
                    title="Pending Transport Listings"
                    description="Review and approve transport route listings submitted by verified transport managers."
                    backgroundImage={dashboardBanner}
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Pending listings" value={stats.total} tone="amber" icon={Route} />
                    <StatCard
                        title="Review status"
                        value={stats.total > 0 ? "Action needed" : "Clear"}
                        tone={stats.total > 0 ? "rose" : "emerald"}
                        icon={stats.total > 0 ? XCircle : CheckCircle2}
                    />
                    <StatCard title="Bus routes" value={stats.buses} tone="indigo" icon={Bus} />
                    <StatCard title="Van routes" value={stats.vans} tone="blue" icon={Bus} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <QuickActionCard
                        to="/admin/transport-managers"
                        icon={ShieldCheck}
                        title="Transport manager reviews"
                        description="Verify transport managers before their listings can be approved."
                        tone="indigo"
                        eyebrow="Verification"
                    />
                    <QuickActionCard
                        to="/admin/vendors"
                        icon={ShieldCheck}
                        title="Vendor reviews"
                        description="Switch to food vendor verification queue."
                        tone="emerald"
                        eyebrow="Food"
                    />
                    <QuickActionCard
                        to="/admin/notifications"
                        icon={Bell}
                        title="Admin notifications"
                        description="Track transport approval outcomes and moderation events."
                        tone="amber"
                        eyebrow="Updates"
                    />
                </div>

                {loading ? (
                    <LoadingState
                        title="Loading transport listing reviews"
                        description="Collecting pending transport route listings for review."
                    />
                ) : listings.length === 0 ? (
                    <EmptyState
                        icon="🚌"
                        title="No pending transport listings"
                        description="All transport listing approval requests have been processed."
                        tone="emerald"
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {listings.map((listing) => (
                            <div key={listing._id} className="card p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${listing.vehicleType === "BUS"
                                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                            }`}>
                                            <Bus size={18} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                {listing.vehicleType}
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900">
                                                {listing.startLocation?.name} → {listing.destination?.name}
                                            </h4>
                                        </div>
                                    </div>
                                    <StatusBadge value={listing.status} />
                                </div>

                                {/* Manager info */}
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        <UserRound size={14} />
                                        Submitted by
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-900">
                                        {listing.managerId?.fullName || "Unknown"} ({listing.managerId?.email || "N/A"})
                                    </div>
                                </div>

                                {/* Route details */}
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <MapPin size={12} /> Distance
                                        </div>
                                        <div className="mt-1 text-sm font-bold text-slate-900">
                                            {listing.totalDistanceKm?.toFixed(1)} km
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <Clock3 size={12} /> Duration
                                        </div>
                                        <div className="mt-1 text-sm font-bold text-slate-900">
                                            {listing.estimatedJourneyMin} min
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <Armchair size={12} /> Seats
                                        </div>
                                        <div className="mt-1 text-sm font-bold text-slate-900">
                                            {listing.availableSeats}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <Banknote size={12} /> Price
                                        </div>
                                        <div className="mt-1 text-sm font-bold text-slate-900">
                                            {formatCurrency(listing.priceRs)}
                                        </div>
                                    </div>
                                </div>

                                {listing.stops && listing.stops.length > 0 && (
                                    <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                                            Stops ({listing.stops.length})
                                        </div>
                                        <div className="mt-1 text-sm text-blue-800">
                                            {listing.stops.map((s) => s.name).join(" → ")}
                                        </div>
                                    </div>
                                )}

                                {listing.facilities && listing.facilities.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {listing.facilities.map((f) => (
                                            <span
                                                key={f}
                                                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                                            >
                                                {f.replace(/_/g, " ")}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                    Approving this listing makes it visible to students. The manager must be verified before approval.
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                        onClick={() => setApproveTarget(listing)}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                        onClick={() => setRejectTarget(listing)}
                                    >
                                        Reject
                                    </button>
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Route size={14} strokeWidth={2.1} />
                                        Listing ID {String(listing._id).slice(-6).toUpperCase()}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <ShieldCheck size={14} strokeWidth={2.1} />
                                        Transport moderation queue
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!approveTarget}
                title="Approve transport listing?"
                description={
                    approveTarget
                        ? `Approve the ${approveTarget.vehicleType?.toLowerCase()} route from ${approveTarget.startLocation?.name} to ${approveTarget.destination?.name}?`
                        : ""
                }
                confirmLabel="Approve listing"
                onConfirm={handleApprove}
                onClose={() => setApproveTarget(null)}
            />

            {/* Reject modal with reason */}
            <ConfirmModal
                open={!!rejectTarget}
                title="Reject transport listing?"
                description={
                    rejectTarget
                        ? `Reject the ${rejectTarget.vehicleType?.toLowerCase()} route from ${rejectTarget.startLocation?.name} to ${rejectTarget.destination?.name}?`
                        : ""
                }
                confirmLabel="Reject listing"
                onConfirm={handleReject}
                onClose={() => {
                    setRejectTarget(null);
                    setRejectionReason("");
                }}
            >
                <div className="mt-3">
                    <label className="text-sm font-semibold text-slate-700">Rejection reason (optional)</label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this listing is being rejected..."
                        className="input mt-2 w-full h-24 resize-none"
                    />
                </div>
            </ConfirmModal>
        </>
    );
}
