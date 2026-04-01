import {
    ArrowRight,
    ArrowUpDown,
    Building2,
    CheckCircle2,
    CircleX,
    Clock3,
    MapPin,
    Pencil,
    Plus,
    Power,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyListingsApi, toggleListingStatusApi, deleteListingApi } from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import listingPlaceholder from "../../assets/placeholders/listing-placeholder.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

function formatCurrency(amount) {
    return `LKR ${(amount || 0).toLocaleString()}`;
}


function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-GB");
}


const listingStatusConfig = {
    ACTIVE: { dot: "bg-emerald-500", label: "Active", bg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60" },
    UNAVAILABLE: { dot: "bg-slate-400", label: "Unavailable", bg: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60" },
    PENDING_APPROVAL: { dot: "bg-amber-500", label: "Pending", bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60" },
    REJECTED: { dot: "bg-rose-500", label: "Rejected", bg: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" },
    SUSPENDED: { dot: "bg-rose-500", label: "Suspended", bg: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" },
};

function getStatusLabel(listing) {
    const occupancy = listing.currentOccupancy || 0;
    const maxOcc = listing.maxOccupants || 0;
    if (listing.status === "UNAVAILABLE" && maxOcc > 0 && occupancy >= maxOcc) return "Full · Unavailable";
    return listingStatusConfig[listing.status]?.label || "Unknown";
}

/* ── Page ───────────────────────────────────────────────────── */

export default function LandlordListingsPage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("newest");

    const loadListings = async () => {
        try {
            setLoading(true);
            const { data } = await getMyListingsApi();
            setListings(data.listings || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load your listings");
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, []);

    const handleToggleStatus = async (listingId) => {
        try {
            setActionLoading(listingId);
            const { data } = await toggleListingStatusApi(listingId);
            toast.success(data.message);
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to toggle status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (listingId) => {
        if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;
        try {
            setActionLoading(listingId);
            const { data } = await deleteListingApi(listingId);
            toast.success(data.message);
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete listing");
        } finally {
            setActionLoading(null);
        }
    };

    const stats = useMemo(() => {
        const occupiedBeds = listings.reduce((sum, l) => sum + (l.currentOccupancy || 0), 0);
        const totalCapacity = listings.reduce((sum, l) => sum + (l.maxOccupants || 0), 0);
        return {
            total: listings.length,
            active: listings.filter((l) => l.status === "ACTIVE").length,
            pending: listings.filter((l) => l.status === "PENDING_APPROVAL").length,
            unavailable: listings.filter((l) => l.status === "UNAVAILABLE").length,
            rejected: listings.filter((l) => l.status === "REJECTED").length,
            suspended: listings.filter((l) => l.status === "SUSPENDED").length,
            full: listings.filter(
                (l) => l.status === "UNAVAILABLE" || ((l.maxOccupants || 0) > 0 && (l.currentOccupancy || 0) >= l.maxOccupants)
            ).length,
            occupiedBeds,
            totalCapacity,
        };
    }, [listings]);

    const filteredListings = useMemo(() => {
        let result = [...listings];

        if (statusFilter !== "ALL") {
            result = result.filter((l) => l.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (l) =>
                    (l.title || "").toLowerCase().includes(q) ||
                    (l.location?.city || "").toLowerCase().includes(q) ||
                    (l.location?.area || "").toLowerCase().includes(q) ||
                    (l.location?.addressLine || "").toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            switch (sortOrder) {
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "highest_rent":
                    return (b.rent || 0) - (a.rent || 0);
                case "lowest_rent":
                    return (a.rent || 0) - (b.rent || 0);
                case "availability": {
                    const aAvail = a.status === "ACTIVE" && (a.maxOccupants || 0) > (a.currentOccupancy || 0);
                    const bAvail = b.status === "ACTIVE" && (b.maxOccupants || 0) > (b.currentOccupancy || 0);
                    return aAvail === bAvail ? 0 : aAvail ? -1 : 1;
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [listings, searchQuery, statusFilter, sortOrder]);

    const activeLabel = statusFilter === "ALL"
        ? "All listings"
        : listingStatusConfig[statusFilter]?.label ?? "Listings";

    return (
        <div className="space-y-5">

            {/* ── Hero ── */}
            <PageHero
                eyebrow="LANDLORD WORKSPACE"
                title="My Listings"
                description="Manage your properties, track availability, and keep listings ready for student bookings."
                backgroundImage={dashboardBanner}
                compact
            />

            {/* ── KPI summary ── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    title="Total listings"
                    value={stats.total}
                    tone="indigo"
                    icon={Building2}
                    subtitle="Properties in your portfolio"
                />
                <StatCard
                    title="Active"
                    value={stats.active}
                    tone="emerald"
                    icon={CheckCircle2}
                    subtitle="Live and accepting bookings"
                />
                <StatCard
                    title="Pending approval"
                    value={stats.pending}
                    tone="amber"
                    icon={Clock3}
                    subtitle="Awaiting admin review"
                />
                <StatCard
                    title="Full / unavailable"
                    value={stats.full}
                    tone="rose"
                    icon={CircleX}
                    subtitle="Not accepting new bookings"
                />
                <StatCard
                    title="Occupied beds"
                    value={`${stats.occupiedBeds}/${stats.totalCapacity || 0}`}
                    tone="blue"
                    icon={Users}
                    subtitle="Beds filled across all properties"
                />
            </div>

            {/* ── Search & Filter Bar ── */}
            <div className="space-y-2.5">

                {/* Row 1 — Search field + New Listing CTA */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search
                            size={17}
                            strokeWidth={2.1}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-[13.5px] text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Search by title, city, or address…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                aria-label="Clear search"
                            >
                                <X size={13} strokeWidth={2.3} />
                            </button>
                        )}
                    </div>
                    <Link
                        to="/landlord/listings/create"
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 text-[13px] font-bold text-white shadow-md shadow-slate-900/15 transition-all hover:from-slate-800 hover:to-slate-700 hover:shadow-lg active:scale-[0.97]"
                    >
                        <Plus size={15} strokeWidth={2.5} />
                        New Listing
                    </Link>
                </div>

                {/* Row 2 — Status pill tabs + sort + count */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">

                    {/* Status tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { value: "ALL", label: "All", count: stats.total },
                            { value: "ACTIVE", label: "Active", count: stats.active },
                            { value: "PENDING_APPROVAL", label: "Pending", count: stats.pending },
                            { value: "UNAVAILABLE", label: "Unavailable", count: stats.unavailable },
                            { value: "REJECTED", label: "Rejected", count: stats.rejected },
                            { value: "SUSPENDED", label: "Suspended", count: stats.suspended },
                        ].map((tab) => {
                            const active = statusFilter === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${active
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                                        }`}
                                >
                                    {tab.label}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort dropdown + result count */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11.5px] font-medium text-slate-400">
                            {filteredListings.length}{" "}
                            {filteredListings.length === 1 ? "listing" : "listings"}
                        </span>
                        <div className="relative">
                            <ArrowUpDown
                                size={12}
                                strokeWidth={2.3}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <select
                                className="h-8 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-[12px] font-semibold text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="highest_rent">Highest rent</option>
                                <option value="lowest_rent">Lowest rent</option>
                                <option value="availability">Availability</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content area ── */}
            {loading ? (
                <LoadingState
                    title="Loading listings"
                    description="Pulling in your property portfolio, occupancy levels, and moderation statuses."
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon="🏠"
                    tone="indigo"
                    title="No listings yet"
                    description="Create your first accommodation listing to start the landlord approval and booking workflow."
                    action={
                        <Link to="/landlord/listings/create" className="btn-primary">
                            Create first listing
                        </Link>
                    }
                />
            ) : filteredListings.length === 0 ? (
                <EmptyState
                    compact
                    icon={<Building2 size={28} strokeWidth={1.8} />}
                    title="No matching listings"
                    description="Try adjusting your search query or status filter."
                    tone="slate"
                    action={
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }}
                        >
                            Clear filters
                        </button>
                    }
                />
            ) : (
                <div className="space-y-4">

                    {/* Section header */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Property portfolio
                            </div>
                            <h4 className="mt-1 text-base font-bold text-slate-900">
                                {activeLabel}
                            </h4>
                        </div>
                        <span className="shrink-0 rounded-2xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                            {filteredListings.length}{" "}
                            {filteredListings.length === 1 ? "property" : "properties"}
                        </span>
                    </div>

                    {/* Listing cards */}
                    {filteredListings.map((listing) => {
                        const occupancy = listing.currentOccupancy || 0;
                        const maxOcc = listing.maxOccupants || 0;
                        const occPercent = maxOcc > 0 ? Math.round((occupancy / maxOcc) * 100) : 0;
                        const statusCfg = listingStatusConfig[listing.status] || listingStatusConfig.UNAVAILABLE;
                        const isLoading = actionLoading === listing._id;

                        return (
                            <div key={listing._id} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
                                <div className="flex flex-col lg:flex-row">
                                    {/* Thumbnail */}
                                    <div className="relative h-48 shrink-0 overflow-hidden bg-slate-100 lg:h-auto lg:w-56">
                                        <img
                                            src={listing.photos?.[0] || listingPlaceholder}
                                            alt={listing.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onError={(event) => { event.currentTarget.src = listingPlaceholder; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                        {/* Floating status badge */}
                                        <div className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm ${statusCfg.bg} backdrop-blur-sm`}>
                                            <span className={`h-2 w-2 rounded-full ${statusCfg.dot} ring-2 ring-white/30`} />
                                            {getStatusLabel(listing)}
                                        </div>
                                    </div>

                                    {/* Content area */}
                                    <div className="flex flex-1 flex-col p-5 sm:p-6 lg:border-l lg:border-slate-100">
                                        {/* Header row */}
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[15px] font-bold text-slate-900 transition-colors group-hover:text-indigo-600">{listing.title}</h4>
                                                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
                                                    <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-slate-400" />
                                                    {listing.location?.city || "Unknown"}, {listing.location?.area || "Unknown"}
                                                </p>
                                            </div>
                                            <Link
                                                to={`/landlord/listings/${listing._id}/edit`}
                                                className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-[11.5px] font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 hover:shadow-md sm:inline-flex"
                                            >
                                                <Pencil size={12} strokeWidth={2.2} />
                                                Edit Details
                                            </Link>
                                        </div>

                                        {/* Metrics row */}
                                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                                            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monthly Rent</p>
                                                <p className="mt-1 text-sm font-bold text-slate-800">{formatCurrency(listing.rent)}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Occupancy</p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800">{occupancy}/{maxOcc}</span>
                                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${occPercent >= 100 ? "bg-emerald-500" : occPercent >= 50 ? "bg-sky-500" : "bg-amber-500"}`}
                                                            style={{ width: `${Math.min(occPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {listing.roomType && (
                                                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Room Type</p>
                                                    <p className="mt-1 text-sm font-bold text-slate-800">{listing.roomType}</p>
                                                </div>
                                            )}
                                            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                                                    <span className="text-sm font-bold text-slate-800">{getStatusLabel(listing)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions footer */}
                                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                            <Link
                                                to={`/landlord/listings/${listing._id}/edit`}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[11.5px] font-bold text-indigo-700 transition-all duration-200 hover:bg-indigo-100 hover:shadow-sm sm:hidden"
                                            >
                                                <Pencil size={12} strokeWidth={2.2} />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleToggleStatus(listing._id)}
                                                disabled={isLoading}
                                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[11.5px] font-bold transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${listing.status === "ACTIVE"
                                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    }`}
                                            >
                                                <Power size={12} strokeWidth={2.5} />
                                                {listing.status === "ACTIVE" ? "Set Inactive" : "Set Active"}
                                            </button>

                                            <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />

                                            <button
                                                onClick={() => handleDelete(listing._id)}
                                                disabled={isLoading}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11.5px] font-semibold text-slate-500 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={11} strokeWidth={2.2} />
                                                Delete
                                            </button>

                                            <span className="hidden flex-1 sm:block" />

                                            <Link
                                                to={`/landlord/listings/${listing._id}/edit`}
                                                className="ml-auto hidden items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[11.5px] font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-[0.97] lg:inline-flex"
                                            >
                                                View full details
                                                <ArrowRight size={13} strokeWidth={2.2} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}