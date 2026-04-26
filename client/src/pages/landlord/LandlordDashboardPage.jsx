import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Bed,
    Building2,
    CalendarCheck,
    ClipboardList,
    CreditCard,
    Eye,
    Home,
    MapPin,
    Pencil,
    Plus,
    Power,
    Sparkles,
    Trash2,
    TrendingUp,
    Users,
    Wallet,
    Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getLandlordBookingsApi,
    getLandlordPaymentHistoryApi,
    getLandlordTicketsApi,
    getMyListingsApi,
    getNotificationsApi,
    toggleListingStatusApi,
    deleteListingApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import listingPlaceholder from "../../assets/placeholders/listing-placeholder.png";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/StatusBadge";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatCurrencyShort(amount) {
    const num = Number(amount || 0);
    if (num >= 1_000_000) return `LKR ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `LKR ${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K`;
    return formatCurrency(num);
}

const quickActions = [
    {
        to: "/landlord/listings",
        title: "My Listings",
        description: "Manage all your property listings",
        icon: Building2,
        tone: "indigo",
    },
    {
        to: "/landlord/tickets",
        title: "Maintenance",
        description: "Track and resolve tenant issues",
        icon: Wrench,
        tone: "blue",
    },
    {
        to: "/landlord/bookings",
        title: "Bookings",
        description: "Review and confirm requests",
        icon: ClipboardList,
        tone: "amber",
    },
    {
        to: "/landlord/payments",
        title: "Payments",
        description: "Track rent and booking revenue",
        icon: CreditCard,
        tone: "emerald",
    },
];

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

export default function LandlordDashboardPage() {
    const [summary, setSummary] = useState({
        listings: [],
        bookings: [],
        payments: [],
        tickets: [],
        notifications: { unreadCount: 0, notifications: [] },
    });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const [listingsRes, bookingsRes, paymentsRes, ticketsRes, notifRes] = await Promise.allSettled([
                getMyListingsApi(),
                getLandlordBookingsApi(),
                getLandlordPaymentHistoryApi(),
                getLandlordTicketsApi(),
                getNotificationsApi(),
            ]);

            if (
                listingsRes.status === "rejected" &&
                bookingsRes.status === "rejected" &&
                paymentsRes.status === "rejected" &&
                ticketsRes.status === "rejected"
            ) {
                toast.error("Failed to load landlord dashboard");
            }

            setSummary({
                listings: listingsRes.status === "fulfilled" ? listingsRes.value.data.listings || [] : [],
                bookings: bookingsRes.status === "fulfilled" ? bookingsRes.value.data.bookings || [] : [],
                payments: paymentsRes.status === "fulfilled" ? paymentsRes.value.data.payments || [] : [],
                tickets: ticketsRes.status === "fulfilled" ? ticketsRes.value.data.tickets || [] : [],
                notifications: notifRes.status === "fulfilled" ? notifRes.value.data : { unreadCount: 0, notifications: [] },
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const stats = useMemo(() => {
        const occupiedBeds = summary.listings.reduce(
            (sum, listing) => sum + Number(listing.currentOccupancy || 0),
            0
        );
        const totalCapacity = summary.listings.reduce(
            (sum, listing) => sum + Number(listing.maxOccupants || 0),
            0
        );
        const totalPaid = summary.payments
            .filter((payment) => payment.status === "PAID")
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        return {
            listingCount: summary.listings.length,
            activeListings: summary.listings.filter((listing) => listing.status === "ACTIVE").length,
            pendingListings: summary.listings.filter((listing) => listing.status === "PENDING_APPROVAL").length,
            unavailableListings: summary.listings.filter((listing) => listing.status === "UNAVAILABLE").length,
            occupiedBeds,
            totalCapacity,
            occupancyRate: totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0,
            requestedBookings: summary.bookings.filter((booking) => booking.status === "REQUESTED").length,
            paymentPending: summary.bookings.filter((booking) => ["APPROVED", "PAYMENT_PENDING"].includes(booking.status)).length,
            confirmedBookings: summary.bookings.filter((booking) => booking.status === "CONFIRMED").length,
            totalPaid,
            openTickets: summary.tickets.filter((ticket) => ticket.status !== "RESOLVED").length,
            overdueTickets: summary.tickets.filter((ticket) => ticket.isOverdue && ticket.status !== "RESOLVED").length,
            resolvedTickets: summary.tickets.filter((ticket) => ticket.status === "RESOLVED").length,
        };
    }, [summary]);

    const attentionItems = useMemo(() => {
        const items = [];
        if (stats.overdueTickets > 0) items.push({ label: `${stats.overdueTickets} overdue ticket${stats.overdueTickets !== 1 ? "s" : ""}`, tone: "rose", to: "/landlord/tickets" });
        if (stats.requestedBookings > 0) items.push({ label: `${stats.requestedBookings} booking request${stats.requestedBookings !== 1 ? "s" : ""} pending`, tone: "amber", to: "/landlord/bookings" });
        if (stats.pendingListings > 0) items.push({ label: `${stats.pendingListings} listing${stats.pendingListings !== 1 ? "s" : ""} awaiting approval`, tone: "amber", to: "/landlord/listings" });
        return items;
    }, [stats]);

    const handleToggleStatus = async (listingId) => {
        try {
            setActionLoading(listingId);
            const { data } = await toggleListingStatusApi(listingId);
            toast.success(data.message);
            await loadDashboard();
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
            await loadDashboard();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete listing");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Hero Banner ── */}
            <section className="relative overflow-hidden rounded-[28px] shadow-lg shadow-slate-900/10">
                <img src={dashboardBanner} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-cyan-800/50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_50%)]" />

                <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.3em] text-white/75 backdrop-blur-sm">
                                <Home size={12} strokeWidth={2.5} />
                                Landlord Dashboard
                            </div>
                            <h1 className="mt-4 text-[1.75rem] font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-[2rem]">
                                Property Portfolio Overview
                            </h1>
                            <p className="mt-2.5 max-w-lg text-[0.9rem] leading-relaxed text-white/70">
                                Monitor your portfolio health, manage listings, track revenue, and stay on top of maintenance — all from one place.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/landlord/listings/create"
                                className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-white px-5 text-[13px] font-bold text-slate-900 shadow-lg shadow-black/15 transition-all duration-200 hover:bg-white/90 hover:shadow-xl active:scale-[0.97]"
                            >
                                <Plus size={15} strokeWidth={2.5} />
                                Create Listing
                            </Link>
                            <Link
                                to="/landlord/bookings"
                                className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-5 text-[13px] font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.97]"
                            >
                                <Eye size={15} strokeWidth={2.2} />
                                View Bookings
                            </Link>
                        </div>
                    </div>

                    {/* Mini stats strip inside hero */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
                        {[
                            { label: "Portfolio", value: stats.listingCount, icon: Building2 },
                            { label: "Occupied", value: `${stats.occupancyRate}%`, icon: Users },
                            { label: "Earned", value: formatCurrencyShort(stats.totalPaid), icon: TrendingUp },
                            { label: "Maintenance", value: stats.openTickets, icon: Wrench },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-white/50">
                                    <item.icon size={12} strokeWidth={2.2} />
                                    {item.label}
                                </div>
                                <div className="mt-1.5 text-xl font-black tracking-tight text-white">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {loading ? (
                <LoadingState
                    title="Loading dashboard"
                    description="Fetching your listings, bookings, payments, and tickets."
                />
            ) : (
                <>
                    {/* ── Attention Needed Strip ── */}
                    {attentionItems.length > 0 && (
                        <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 shadow-sm">
                            <div className="flex items-center gap-3 px-5 py-3 sm:px-6">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                    <AlertTriangle size={15} strokeWidth={2.4} />
                                </div>
                                <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800/70">Needs Attention</span>
                                    {attentionItems.map((item, idx) => (
                                        <Link key={idx} to={item.to} className={`inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${item.tone === "rose" ? "text-rose-700 hover:text-rose-800" : "text-amber-700 hover:text-amber-800"}`}>
                                            {item.label}
                                            <ArrowRight size={12} strokeWidth={2.5} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── KPI Metrics Row ── */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {/* Active Listings */}
                        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                            <div className="h-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Active Listings</p>
                                        <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-900">{stats.activeListings}</p>
                                        <p className="mt-2.5 text-xs leading-5 text-slate-500">
                                            <span className="font-semibold text-slate-600">{stats.listingCount}</span> total{stats.unavailableListings > 0 && <> · {stats.unavailableListings} inactive</>}{stats.pendingListings > 0 && <> · <span className="font-semibold text-amber-600">{stats.pendingListings} pending</span></>}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                        <Building2 size={20} strokeWidth={2.2} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Occupancy */}
                        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                            <div className="h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600" />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Bed Occupancy</p>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-[2rem] font-black leading-none tracking-tight text-slate-900">{stats.occupiedBeds}/{stats.totalCapacity || 0}</span>
                                            <span className="text-sm font-bold text-sky-600">{stats.occupancyRate}%</span>
                                        </div>
                                        <div className="mt-3">
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-500" style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }} />
                                            </div>
                                            <p className="mt-1.5 text-xs text-slate-500">Beds filled across all properties</p>
                                        </div>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                                        <Bed size={20} strokeWidth={2.2} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Revenue */}
                        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Revenue Collected</p>
                                        <p className="mt-2 text-[1.65rem] font-black leading-none tracking-tight text-slate-900">{formatCurrency(stats.totalPaid)}</p>
                                        <p className="mt-2.5 text-xs leading-5 text-slate-500">
                                            <span className="font-semibold text-emerald-600">{summary.payments.filter((p) => p.status === "PAID").length}</span> successful payments received
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                                        <Wallet size={20} strokeWidth={2.2} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Open Tickets */}
                        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                            <div className={`h-1 bg-gradient-to-r ${stats.overdueTickets > 0 ? "from-rose-500 via-pink-500 to-fuchsia-500" : "from-sky-500 via-cyan-500 to-blue-600"}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Open Tickets</p>
                                        <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-900">{stats.openTickets}</p>
                                        <p className="mt-2.5 text-xs leading-5 text-slate-500">
                                            {stats.overdueTickets > 0 ? (
                                                <><span className="font-semibold text-rose-600">{stats.overdueTickets} overdue</span> · {stats.resolvedTickets} resolved</>
                                            ) : (
                                                <><span className="font-semibold text-slate-600">{stats.resolvedTickets}</span> resolved so far</>
                                            )}
                                        </p>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stats.overdueTickets > 0 ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100" : "bg-sky-50 text-sky-600 ring-1 ring-sky-100"}`}>
                                        <Wrench size={20} strokeWidth={2.2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Quick Navigation Panel ── */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-7">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>
                                <p className="mt-0.5 text-[13px] text-slate-500">Jump into your most-used management tools</p>
                            </div>
                            <Link to="/landlord/listings/create" className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 px-4 text-xs font-bold text-white shadow-sm shadow-slate-900/10 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-md active:scale-[0.97]">
                                <Plus size={13} strokeWidth={2.5} />
                                New Listing
                            </Link>
                        </div>
                        <div className="border-t border-slate-100">
                            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.title}
                                        to={action.to}
                                        className="group flex items-center gap-4 bg-white px-6 py-5 transition-all duration-200 hover:bg-slate-50/80"
                                    >
                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-${action.tone}-50 text-${action.tone}-600 ring-1 ring-${action.tone}-100 transition-transform duration-200 group-hover:scale-105`}>
                                            <action.icon size={19} strokeWidth={2.2} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-700">{action.title}</span>
                                                <ArrowUpRight size={13} strokeWidth={2.5} className="text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500" />
                                            </div>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{action.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Published Listings Section ── */}
                    <div>
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                        <Building2 size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">Your Properties</h3>
                                        <p className="text-xs text-slate-500">Manage listings, availability, and occupancy</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {summary.listings.length > 0 && (
                                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                                        {summary.listings.length} {summary.listings.length === 1 ? "property" : "properties"}
                                    </span>
                                )}
                                <Link to="/landlord/listings" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700">
                                    View all
                                    <ArrowRight size={13} strokeWidth={2.5} />
                                </Link>
                            </div>
                        </div>

                        {summary.listings.length === 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                                    <Building2 size={28} strokeWidth={1.6} />
                                </div>
                                <h4 className="mt-5 text-lg font-bold text-slate-900">No listings yet</h4>
                                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Create your first property listing and start accepting student booking requests today.</p>
                                <Link to="/landlord/listings/create" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 text-sm font-bold text-white shadow-md shadow-slate-900/15 transition-all hover:from-slate-800 hover:to-slate-700 active:scale-[0.97]">
                                    <Plus size={15} strokeWidth={2.5} />
                                    Create Your First Listing
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {summary.listings.map((listing) => {
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
                                                                    <div className={`h-full rounded-full transition-all ${occPercent >= 100 ? "bg-emerald-500" : occPercent >= 50 ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${Math.min(occPercent, 100)}%` }} />
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
                                                        {/* Primary: Edit (mobile only) + Toggle status */}
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

                                                        {/* Separator */}
                                                        <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />

                                                        {/* Destructive: Delete */}
                                                        <button
                                                            onClick={() => handleDelete(listing._id)}
                                                            disabled={isLoading}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11.5px] font-semibold text-slate-500 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 size={11} strokeWidth={2.2} />
                                                            Delete
                                                        </button>

                                                        <span className="hidden flex-1 sm:block" />

                                                        {/* View full details */}
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
                </>
            )}
        </div>
    );
}