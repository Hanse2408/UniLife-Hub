import {
    ArrowUpDown,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleX,
    Clock3,
    MapPin,
    Pencil,
    Plus,
    Power,
    ReceiptText,
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

function getListingMeta(listing) {
    const occupancy = listing.currentOccupancy || 0;
    const capacity = listing.maxOccupants || 0;

    if (listing.status === "PENDING_APPROVAL") {
        return {
            title: "Awaiting admin review",
            description: "This listing is submitted and waiting for approval before students can see it.",
        };
    }

    if (listing.status === "ACTIVE") {
        if (capacity > 0 && occupancy >= capacity) {
            return {
                title: "Currently full",
                description: "The listing is active, but all available spaces are occupied right now.",
            };
        }
        return {
            title: "Live for student bookings",
            description: "Students can browse this property and send booking requests through the accommodation flow.",
        };
    }

    if (listing.status === "UNAVAILABLE") {
        return {
            title: "Temporarily unavailable",
            description: "The listing is not accepting new bookings until occupancy frees up again.",
        };
    }

    if (listing.status === "REJECTED") {
        return {
            title: "Needs revision",
            description: listing.rejectionReason || "This listing was rejected during review and needs changes before resubmission.",
        };
    }

    if (listing.status === "SUSPENDED") {
        return {
            title: "Suspended from discovery",
            description: "This listing is currently hidden from students and needs follow-up before it can go live again.",
        };
    }

    return {
        title: "Listing update",
        description: "Review this property for the latest availability and moderation state.",
    };
}

/* ── Status badge ─────────────────────────────────────────── */

const STATUS_CONFIG = {
    ACTIVE: {
        label: "Active",
        classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
        dot: "bg-emerald-500",
    },
    PENDING_APPROVAL: {
        label: "Pending approval",
        classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
        dot: "bg-amber-500",
    },
    UNAVAILABLE: {
        label: "Unavailable",
        classes: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
        dot: "bg-slate-400",
    },
    REJECTED: {
        label: "Rejected",
        classes: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
        dot: "bg-rose-500",
    },
    SUSPENDED: {
        label: "Suspended",
        classes: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
        dot: "bg-rose-500",
    },
};

function ListingStatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || {
        label: String(status).replaceAll("_", " "),
        classes: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
        dot: "bg-slate-400",
    };
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${config.classes}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}

/* ── Occupancy bar ────────────────────────────────────────── */

function OccupancyBar({ current, max }) {
    const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
    const barColor =
        pct >= 90 ? "from-rose-400 to-rose-500" :
            pct >= 60 ? "from-sky-400 to-blue-500" :
                "from-emerald-400 to-teal-500";
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">Occupancy</span>
                <span className="text-[11px] font-bold text-slate-700">{current}/{max} · {pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/* ── Accent stripe helper ─────────────────────────────────── */

function getAccentStripe(status) {
    switch (status) {
        case "ACTIVE": return "from-emerald-400 to-teal-400";
        case "PENDING_APPROVAL": return "from-amber-400 to-orange-400";
        case "REJECTED": return "from-rose-500 to-pink-400";
        case "SUSPENDED": return "from-rose-400 to-rose-500";
        default: return "from-slate-300 to-slate-400";
    }
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
        : STATUS_CONFIG[statusFilter]?.label ?? "Listings";

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
                        className="btn-primary h-11 shrink-0"
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
                        const meta = getListingMeta(listing);
                        const isBusy = actionLoading === listing._id;
                        const isActive = listing.status === "ACTIVE";

                        return (
                            <article
                                key={listing._id}
                                className="card overflow-hidden transition-shadow hover:shadow-md"
                            >
                                {/* Status accent stripe */}
                                <div className={`h-1 w-full bg-gradient-to-r ${getAccentStripe(listing.status)}`} />

                                <div className="flex flex-col sm:flex-row">
                                    {/* Thumbnail */}
                                    <div className="relative w-full shrink-0 overflow-hidden bg-slate-100 sm:w-44 xl:w-52">
                                        <img
                                            src={listing.photos?.[0] || listingPlaceholder}
                                            alt={listing.title}
                                            className="h-52 w-full object-cover sm:h-full"
                                            onError={(e) => { e.currentTarget.src = listingPlaceholder; }}
                                        />
                                    </div>

                                    {/* Card body */}
                                    <div className="flex min-h-[220px] flex-1 flex-col gap-3 p-4 sm:p-5">

                                        {/* Row 1: Identity + status badge */}
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[1.05rem] font-extrabold leading-snug text-slate-900 line-clamp-1">
                                                    {listing.title}
                                                </h4>
                                                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                                                    <MapPin size={12} strokeWidth={2.2} className="shrink-0 text-slate-400" />
                                                    <span className="line-clamp-1">
                                                        {listing.location?.city || "Unknown city"} / {listing.location?.area || "Unknown area"}
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                                                    {listing.location?.addressLine || "Address not provided"}
                                                </p>
                                            </div>
                                            <ListingStatusBadge status={listing.status} />
                                        </div>

                                        {/* Row 2: Key metrics grid */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                                            {[
                                                { label: "Rent / mo", value: formatCurrency(listing.rent) },
                                                { label: "Key money", value: listing.keyMoney > 0 ? formatCurrency(listing.keyMoney) : "—" },
                                                { label: "Type", value: listing.roomType || "N/A" },
                                                { label: "Capacity", value: `${listing.currentOccupancy || 0}/${listing.maxOccupants || 0}` },
                                            ].map((item) => (
                                                <div key={item.label}>
                                                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                        {item.label}
                                                    </div>
                                                    <div className="mt-1 text-sm font-bold text-slate-800">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Row 3: Occupancy bar */}
                                        <OccupancyBar
                                            current={listing.currentOccupancy || 0}
                                            max={listing.maxOccupants || 0}
                                        />

                                        {/* Row 4: Status context note */}
                                        <div className={`rounded-xl px-3.5 py-2.5 text-xs leading-5 ${listing.status === "REJECTED" || listing.status === "SUSPENDED"
                                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                                            : listing.status === "PENDING_APPROVAL"
                                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                                : "bg-slate-50 text-slate-600 ring-1 ring-slate-100"
                                            }`}>
                                            <span className="font-semibold">{meta.title}.</span>{" "}
                                            <span>{meta.description}</span>
                                        </div>

                                        {/* Row 5: Amenity chips */}
                                        {(listing.facilities?.length || 0) > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {listing.facilities.slice(0, 5).map((facility) => (
                                                    <span
                                                        key={facility}
                                                        className="rounded-lg bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/70"
                                                    >
                                                        {facility}
                                                    </span>
                                                ))}
                                                {listing.facilities.length > 5 && (
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/70">
                                                        +{listing.facilities.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Row 6: Footer — metadata + actions */}
                                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                                            <div className="flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-slate-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ReceiptText size={11} strokeWidth={2.2} />
                                                    {String(listing._id).slice(-6).toUpperCase()}
                                                </span>
                                                <span className="text-slate-200">·</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays size={11} strokeWidth={2.2} />
                                                    {formatDate(listing.createdAt)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    to={`/landlord/listings/${listing._id}/edit`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97]"
                                                >
                                                    <Pencil size={12} strokeWidth={2.3} />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleToggleStatus(listing._id)}
                                                    disabled={isBusy}
                                                    type="button"
                                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold ring-1 transition-all active:scale-[0.97] disabled:opacity-60 ${isActive
                                                        ? "bg-amber-50 text-amber-700 ring-amber-200/80 hover:bg-amber-100"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200/80 hover:bg-emerald-100"
                                                        }`}
                                                >
                                                    <Power size={12} strokeWidth={2.3} />
                                                    {isBusy ? "Updating…" : isActive ? "Deactivate" : "Activate"}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(listing._id)}
                                                    disabled={isBusy}
                                                    type="button"
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/80 transition-all hover:bg-rose-100 active:scale-[0.97] disabled:opacity-60"
                                                >
                                                    <Trash2 size={12} strokeWidth={2.3} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}