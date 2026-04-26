import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowDownNarrowWide,
    Building2,
    ClipboardList,
    CreditCard,
    MapPin,
    MessageCircle,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Users,
    Wallet,
    Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import ListingCard from "../../components/accommodation/ListingCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    getMyBookingsApi,
    getMyPaymentHistoryApi,
    getMyTicketsApi,
    getMyCurrentHousingGroupApi,
    getListingsApi,
    getInboxApi,
} from "../../api/client";

function friendlyStatus(status) {
    const map = {
        REQUESTED: "Requested",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        PAYMENT_PENDING: "Payment Pending",
        CONFIRMED: "Confirmed",
        ACTIVE_STAY: "Active Stay",
        CANCELLED: "Cancelled",
        COMPLETED: "Completed",
    };
    return map[status] || status;
}

function friendlyTicketStatus(status) {
    const map = { PENDING: "Pending", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };
    return map[status] || status;
}

/* ── Skeleton card shown during loading ── */
function ListingSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="aspect-[16/10] bg-slate-200" />
            <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="grid grid-cols-3 gap-2">
                    <div className="h-10 rounded-lg bg-slate-100" />
                    <div className="h-10 rounded-lg bg-slate-100" />
                    <div className="h-10 rounded-lg bg-slate-100" />
                </div>
                <div className="flex gap-1.5">
                    <div className="h-5 w-12 rounded-full bg-slate-100" />
                    <div className="h-5 w-10 rounded-full bg-slate-100" />
                    <div className="h-5 w-14 rounded-full bg-slate-100" />
                </div>
                <div className="h-9 rounded-lg bg-slate-200" />
            </div>
        </div>
    );
}

/* ── Sort helpers ── */
const SORT_OPTIONS = [
    { value: "newest", label: "Newest first" },
    { value: "price-asc", label: "Price: Low → High" },
    { value: "price-desc", label: "Price: High → Low" },
    { value: "available", label: "Available soonest" },
];

function sortListings(list, sortBy) {
    const sorted = [...list];
    switch (sortBy) {
        case "price-asc":
            return sorted.sort((a, b) => (a.rent || 0) - (b.rent || 0));
        case "price-desc":
            return sorted.sort((a, b) => (b.rent || 0) - (a.rent || 0));
        case "available":
            return sorted.sort((a, b) => new Date(a.availableFrom || 0) - new Date(b.availableFrom || 0));
        case "newest":
        default:
            return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
}

export default function AccommodationHubPage() {
    const [data, setData] = useState({ bookings: [], payments: [], tickets: [], group: null });
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [listings, setListings] = useState([]);
    const [listingsLoading, setListingsLoading] = useState(true);
    const [listingsError, setListingsError] = useState(false);
    const [filters, setFilters] = useState({ city: "", area: "", roomType: "", minRent: "", maxRent: "" });
    const [sortBy, setSortBy] = useState("newest");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const [bRes, pRes, tRes, gRes, inboxRes] = await Promise.allSettled([
                getMyBookingsApi(),
                getMyPaymentHistoryApi(),
                getMyTicketsApi(),
                getMyCurrentHousingGroupApi(),
                getInboxApi(),
            ]);
            setData({
                bookings: bRes.status === "fulfilled" ? bRes.value.data.bookings || [] : [],
                payments: pRes.status === "fulfilled" ? pRes.value.data.payments || [] : [],
                tickets: tRes.status === "fulfilled" ? tRes.value.data.tickets || [] : [],
                group: gRes.status === "fulfilled" ? gRes.value.data.housingGroup || gRes.value.data || null : null,
            });
            if (inboxRes.status === "fulfilled") {
                const total = (inboxRes.value.data.inbox || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0);
                setChatUnreadCount(total);
            }
            setLoaded(true);
        })();
    }, []);

    const loadListings = async (customFilters = filters) => {
        try {
            setListingsLoading(true);
            setListingsError(false);
            const params = {};
            Object.entries(customFilters).forEach(([key, value]) => {
                if (value !== "") params[key] = value;
            });
            const { data } = await getListingsApi(params);
            setListings(data.listings || []);
        } catch {
            setListings([]);
            setListingsError(true);
        } finally {
            setListingsLoading(false);
        }
    };

    useEffect(() => { loadListings(); }, []);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        loadListings(filters);
    };

    const handleReset = () => {
        const blank = { city: "", area: "", roomType: "", minRent: "", maxRent: "" };
        setFilters(blank);
        setSortBy("newest");
        loadListings(blank);
    };

    const sortedListings = useMemo(() => sortListings(listings, sortBy), [listings, sortBy]);
    const activeFilterCount = useMemo(
        () => Object.values(filters).filter((v) => String(v).trim() !== "").length,
        [filters],
    );

    // ── Stats ─────────────────────────────────────────────────────
    const activeBooking = data.bookings.find((b) =>
        ["APPROVED", "PAYMENT_PENDING", "CONFIRMED", "ACTIVE_STAY"].includes(b.status),
    ) || data.bookings[0];
    const bookingValue = activeBooking ? friendlyStatus(activeBooking.status) : "Not Booked";

    const pendingPayment = data.payments.find((p) => p.status === "PENDING");
    const paymentValue = pendingPayment ? `LKR ${Number(pendingPayment.amount || 0).toLocaleString("en-LK")}` : "No dues";

    const openTickets = data.tickets.filter((t) => t.status !== "RESOLVED");
    const maintenanceValue = `${openTickets.length} Open`;

    const group = data.group;
    const memberCount = group?.members?.length || 0;
    const groupValue = group && group.status === "ACTIVE" ? `${memberCount} Member${memberCount !== 1 ? "s" : ""}` : "Not Joined";

    return (
        <div className="space-y-6">
            {/* ── Hero ── */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
                <img src={dashboardBanner} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-cyan-800/50" />

                <div className="relative z-10 flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.7rem]">
                            Find Your Ideal Stay
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                            Browse listings, manage bookings, handle payments, and connect with landlords — all in one place.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <a href="#listings-section" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label="Browse available listings">
                            <Search size={13} /> Browse Listings
                        </a>
                        <Link to="/student/bookings" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label="View my bookings">
                            <ClipboardList size={13} /> My Bookings
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { icon: Building2, label: "Booking Status", value: loaded ? bookingValue : "—", hint: "Current accommodation request", tone: "indigo" },
                    { icon: CreditCard, label: "Next Payment", value: loaded ? paymentValue : "—", hint: "Upcoming rent or deposit", tone: "emerald" },
                    { icon: Wrench, label: "Maintenance", value: loaded ? maintenanceValue : "—", hint: "Unresolved support tickets", tone: "amber" },
                    { icon: Users, label: "Housing Group", value: loaded ? groupValue : "—", hint: "Your roommate group status", tone: "blue" },
                ].map(({ icon: Icon, label, value, hint, tone }) => {
                    const colors = {
                        indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
                        emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
                        amber: "border-amber-100 bg-amber-50 text-amber-600",
                        blue: "border-sky-100 bg-sky-50 text-sky-600",
                    };
                    return (
                        <div key={label} className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors[tone]} transition-colors`}>
                                <Icon size={18} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                                <p className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-slate-900">{value}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Quick Navigation ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { to: "/student/bookings", icon: ClipboardList, label: "My Bookings", desc: "Track requests & confirmed stays", color: "indigo", badge: 0 },
                    { to: "/student/payments", icon: Wallet, label: "Payments", desc: "Payment history & pending dues", color: "emerald", badge: 0 },
                    { to: "/student/tickets", icon: Wrench, label: "Maintenance", desc: "Raise issues & track responses", color: "amber", badge: 0 },
                    { to: "/student/chat", icon: MessageCircle, label: "Chat", desc: "Message landlords directly", color: "blue", badge: chatUnreadCount },
                ].map(({ to, icon: Icon, label, desc, color, badge }) => {
                    const hoverBorder = {
                        indigo: "hover:border-indigo-200",
                        emerald: "hover:border-emerald-200",
                        amber: "hover:border-amber-200",
                        blue: "hover:border-sky-200",
                    };
                    const iconBg = {
                        indigo: "bg-indigo-50 text-indigo-600",
                        emerald: "bg-emerald-50 text-emerald-600",
                        amber: "bg-amber-50 text-amber-600",
                        blue: "bg-sky-50 text-sky-600",
                    };
                    const hoverText = {
                        indigo: "group-hover:text-indigo-600",
                        emerald: "group-hover:text-emerald-600",
                        amber: "group-hover:text-amber-600",
                        blue: "group-hover:text-sky-600",
                    };
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${hoverBorder[color]}`}
                        >
                            <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg[color]}`}>
                                <Icon size={16} strokeWidth={2.2} />
                                {badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold leading-none text-white">
                                        {badge > 9 ? "9+" : badge}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className={`text-sm font-bold text-slate-800 ${hoverText[color]}`}>
                                    {label}
                                    {badge > 0 && (
                                        <span className="ml-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                                            {badge > 9 ? "9+" : badge}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Available Listings */}
            <div id="listings-section" className="space-y-4">
                {/* Filter panel */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <SlidersHorizontal size={15} strokeWidth={2.2} className="text-slate-400" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </div>
                        {!listingsLoading && !listingsError && (
                            <span className="text-xs text-slate-500">
                                {listings.length} listing{listings.length !== 1 ? "s" : ""} found
                            </span>
                        )}
                    </div>

                    <form className="p-4" onSubmit={handleSubmit}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Building2 size={12} /> City
                                </label>
                                <input
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Colombo"
                                    value={filters.city}
                                    onChange={(e) => handleFilterChange("city", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <MapPin size={12} /> Area
                                </label>
                                <input
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Malabe"
                                    value={filters.area}
                                    onChange={(e) => handleFilterChange("area", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Building2 size={12} /> Room Type
                                </label>
                                <select
                                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 bg-[length:14px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-sm text-slate-800 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    style={{
                                        backgroundImage:
                                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                                    }}
                                    value={filters.roomType}
                                    onChange={(e) => handleFilterChange("roomType", e.target.value)}
                                >
                                    <option value="">All types</option>
                                    <option value="SINGLE">Single</option>
                                    <option value="SHARED">Shared</option>
                                    <option value="ANNEX">Annex</option>
                                    <option value="APARTMENT">Apartment</option>
                                    <option value="HOUSE">House</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Wallet size={12} /> Min Rent
                                </label>
                                <input
                                    type="number"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="25,000"
                                    value={filters.minRent}
                                    onChange={(e) => handleFilterChange("minRent", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Wallet size={12} /> Max Rent
                                </label>
                                <input
                                    type="number"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="60,000"
                                    value={filters.maxRent}
                                    onChange={(e) => handleFilterChange("maxRent", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 sm:justify-end">
                            <button
                                type="button"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                                onClick={handleReset}
                            >
                                <RotateCcw size={13} />
                                Reset
                            </button>
                            <button
                                type="submit"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                                disabled={listingsLoading}
                            >
                                <Search size={13} />
                                {listingsLoading ? "Searching…" : "Search"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results bar with sort */}
                {!listingsLoading && !listingsError && listings.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm">
                        <div className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">{listings.length}</span>{" "}
                            listing{listings.length !== 1 ? "s" : ""}
                            {activeFilterCount > 0 && (
                                <span className="ml-1 text-slate-400">
                                    · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ArrowDownNarrowWide size={14} className="text-slate-400" />
                            <select
                                className="h-8 appearance-none rounded-md border border-slate-200 bg-slate-50/60 bg-[length:12px] bg-[right_8px_center] bg-no-repeat pl-2 pr-7 text-xs font-medium text-slate-700 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                style={{
                                    backgroundImage:
                                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                                }}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Listings grid / states */}
                {listingsLoading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ListingSkeleton key={i} />
                        ))}
                    </div>
                ) : listingsError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <AlertTriangle size={22} />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">Unable to load listings</h4>
                        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                            Something went wrong while fetching available properties. Please check your connection and try again.
                        </p>
                        <button
                            type="button"
                            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                            onClick={() => loadListings(filters)}
                        >
                            <RotateCcw size={13} /> Retry
                        </button>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                            🏠
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">No listings found</h4>
                        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                            {activeFilterCount > 0
                                ? "No properties match your current filters. Try broadening your search criteria."
                                : "There are no available listings right now. Check back later for new properties."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                                onClick={handleReset}
                            >
                                <RotateCcw size={13} /> Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedListings.map((listing) => (
                            <ListingCard key={listing._id} listing={listing} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
