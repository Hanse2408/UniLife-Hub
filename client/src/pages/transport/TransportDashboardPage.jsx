import {
    Bus,
    CalendarDays,
    ClipboardList,
    MapPin,
    Plus,
    Route,
    Trash2,
    Clock3,
    CheckCircle2,
    XCircle,
    Armchair,
    Banknote,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyTransportListingsApi, deleteTransportListingApi } from "../../api/client";
import PageHero from "../../components/common/PageHero";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import ConfirmModal from "../../components/common/ConfirmModal";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

function formatCurrency(amount) {
    return `Rs. ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatTime(timeStr) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
}

function statusIcon(status) {
    switch (status) {
        case "APPROVED": return <CheckCircle2 size={14} className="text-emerald-500" />;
        case "REJECTED": return <XCircle size={14} className="text-rose-500" />;
        default: return <Clock3 size={14} className="text-amber-500" />;
    }
}

export default function TransportDashboardPage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchListings = async () => {
        try {
            setLoading(true);
            const { data } = await getMyTransportListingsApi();
            setListings(data.listings || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load transport listings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleDelete = async () => {
        try {
            await deleteTransportListingApi(deleteTarget._id);
            toast.success("Transport listing deleted");
            setDeleteTarget(null);
            await fetchListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete listing");
        }
    };

    const stats = {
        total: listings.length,
        active: listings.filter((l) => l.isActive).length,
        totalSeats: listings.reduce((sum, l) => sum + (l.availableSeats || 0), 0),
        busRoutes: listings.filter((l) => l.vehicleType === "BUS").length,
    };

    return (
        <>
            <div className="space-y-6">
                <PageHero
                    eyebrow="Transport Workspace"
                    title="Your Transport Dashboard"
                    description="Manage bus and van routes, track bookings, and monitor your transport listings."
                    backgroundImage={dashboardBanner}
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Total routes" value={stats.total} tone="indigo" icon={Route} />
                    <StatCard title="Active listings" value={stats.active} tone="emerald" icon={Bus} />
                    <StatCard title="Total seats" value={stats.totalSeats} tone="blue" icon={Armchair} />
                    <StatCard title="Bus routes" value={stats.busRoutes} tone="amber" icon={Bus} />
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Quick navigation</div>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">Manage your transport operations</h3>
                        </div>
                        <Link to="/transport-manager/create" className="btn-primary inline-flex items-center gap-2">
                            <Plus size={15} />
                            Add Route
                        </Link>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Link to="/transport-manager/create" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><Plus size={18} /></div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Add new route</div>
                                <div className="mt-0.5 text-xs text-slate-500">Create a bus or van transport listing.</div>
                            </div>
                        </Link>
                        <Link to="/transport-manager/bookings" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><ClipboardList size={18} /></div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Bookings & Payments</div>
                                <div className="mt-0.5 text-xs text-slate-500">View passenger bookings and revenue.</div>
                            </div>
                        </Link>
                        <Link to="/transport-manager/reviews" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><ClipboardList size={18} /></div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Reviews</div>
                                <div className="mt-0.5 text-xs text-slate-500">See ratings from your passengers.</div>
                            </div>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <LoadingState
                        title="Loading transport listings"
                        description="Fetching your bus and van routes."
                    />
                ) : listings.length === 0 ? (
                    <EmptyState
                        icon="🚌"
                        title="No transport listings yet"
                        description="Create your first bus or van route to get started."
                        tone="indigo"
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Your routes
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">
                                    All transport listings
                                </h3>
                            </div>
                            <Link to="/transport-manager/create" className="btn-primary inline-flex items-center gap-2">
                                <Plus size={16} /> Add route
                            </Link>
                        </div>

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
                                        <div className="flex items-center gap-1">
                                            {statusIcon(listing.status)}
                                            <StatusBadge value={listing.status} />
                                        </div>
                                    </div>

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

                                    {listing.departureTime && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                            <CalendarDays size={14} />
                                            Departure: {formatTime(listing.departureTime)}
                                        </div>
                                    )}

                                    {listing.rejectionReason && (
                                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                            <strong>Rejection reason:</strong> {listing.rejectionReason}
                                        </div>
                                    )}

                                    <div className="mt-5 flex gap-3">
                                        <Link
                                            to={`/transport-manager/edit/${listing._id}`}
                                            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                            onClick={() => setDeleteTarget(listing)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!deleteTarget}
                title="Delete transport listing?"
                description={
                    deleteTarget
                        ? `Delete the ${deleteTarget.vehicleType?.toLowerCase()} route from ${deleteTarget.startLocation?.name} to ${deleteTarget.destination?.name}? This cannot be undone.`
                        : ""
                }
                confirmLabel="Delete listing"
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </>
    );
}
