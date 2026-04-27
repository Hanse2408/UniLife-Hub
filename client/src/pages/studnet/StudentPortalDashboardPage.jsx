import { useEffect, useState } from "react";
import {
    Building2,
    Bus,
    User,
    UtensilsCrossed,
    Wallet,
    ClipboardList,
    ShoppingCart,
    Ticket,
    Bell,
} from "lucide-react";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    getMyBookingsApi,
    getStudentFoodOrdersApi,
    getMyTransportBookingsApi,
    getMyCurrentHousingGroupApi,
    getRentStatusApi,
    getNotificationsApi,
} from "../../api/client";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

export default function StudentPortalDashboardPage() {
    const [stats, setStats] = useState({ bookings: [], orders: [], trips: [], housingGroup: null, rentStatus: null, notifications: [] });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const [bRes, oRes, trRes, hgRes, rsRes, nRes] = await Promise.allSettled([
                getMyBookingsApi(),
                getStudentFoodOrdersApi(),
                getMyTransportBookingsApi(),
                getMyCurrentHousingGroupApi(),
                getRentStatusApi(),
                getNotificationsApi(),
            ]);
            setStats({
                bookings: bRes.status === "fulfilled" ? bRes.value.data.bookings || [] : [],
                orders: oRes.status === "fulfilled" ? oRes.value.data.orders || [] : [],
                trips: trRes.status === "fulfilled" ? trRes.value.data.bookings || [] : [],
                housingGroup: hgRes.status === "fulfilled" ? hgRes.value.data.housingGroup || null : null,
                rentStatus: rsRes.status === "fulfilled" ? rsRes.value.data || null : null,
                notifications: nRes.status === "fulfilled" ? nRes.value.data.notifications || nRes.value.data || [] : [],
            });
            setLoaded(true);
        })();
    }, []);

    // ── Accommodation stat ────────────────────────────────────────
    const activeBooking = stats.bookings.find((b) =>
        ["APPROVED", "PAYMENT_PENDING", "CONFIRMED", "ACTIVE_STAY"].includes(b.status),
    ) || stats.bookings[0];
    const accomValue = activeBooking ? friendlyStatus(activeBooking.status) : "None";

    // ── Food stat ─────────────────────────────────────────────────
    const now = new Date();
    const thisWeekOrders = stats.orders.filter((o) => {
        const d = new Date(o.order_date || o.createdAt);
        return (now - d) / 86400000 <= 7;
    });
    const weekSpend = thisWeekOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // ── Transport stat ────────────────────────────────────────────
    const confirmedTrips = stats.trips.filter((t) => t.status === "CONFIRMED").length;
    const totalSpent = stats.trips
        .filter((t) => t.status === "CONFIRMED")
        .reduce((s, t) => s + (t.totalPrice || 0), 0);

    // ── Rent stat ─────────────────────────────────────────────────
    const rs = stats.rentStatus;
    let rentValue = "No housing";
    if (rs?.hasHousingGroup) {
        rentValue = rs.isPaid ? "Paid" : rs.rentAmount ? formatCurrency(rs.rentAmount) : "Due";
    }

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Portal"
                title="Welcome to UniLife Hub"
                description="Your one-stop campus companion — housing, food, transport, and more."
                backgroundImage={dashboardBanner}
            />

            {/* Quick Actions — same layout as transport hub */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={Building2}
                    title="Accommodation"
                    description="Listings, bookings, payments, and maintenance."
                    to="/student/accommodation"
                />
                <QuickActionCard
                    icon={UtensilsCrossed}
                    title="Food"
                    description="Browse meals, order, plan your week."
                    to="/student/food"
                    tone="amber"
                />
                <QuickActionCard
                    icon={Bus}
                    title="Transport"
                    description="Routes, bookings, and trip planning."
                    to="/student/transport"
                    tone="blue"
                />
                <QuickActionCard
                    icon={User}
                    title="Profile"
                    description="Account details and personal settings."
                    to="/student/profile"
                    tone="slate"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Building2}
                    title="Accommodation"
                    value={loaded ? accomValue : "—"}
                    tone="indigo"
                />
                <StatCard
                    icon={UtensilsCrossed}
                    title="Food This Week"
                    value={loaded ? (weekSpend > 0 ? formatCurrency(weekSpend) : "LKR 0.00") : "—"}
                    tone="amber"
                />
                <StatCard
                    icon={Ticket}
                    title="Transport Bookings"
                    value={loaded ? confirmedTrips : "—"}
                    tone="blue"
                />
                <StatCard
                    icon={Wallet}
                    title="Monthly Rent"
                    value={loaded ? rentValue : "—"}
                    tone="emerald"
                />
            </div>

            {/* ── Recent Summaries ── */}
            {loaded && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Recent Bookings */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Building2 size={16} /> Recent Bookings
                        </h3>
                        {stats.bookings.length === 0 ? (
                            <p className="text-sm text-slate-400">No bookings yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {stats.bookings.slice(0, 4).map((b) => (
                                    <li key={b._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                        <span className="font-medium text-slate-700 truncate max-w-[55%]">
                                            {b.listing?.title || "Accommodation"}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.status === "ACTIVE_STAY" || b.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                                                b.status === "APPROVED" || b.status === "PAYMENT_PENDING" ? "bg-amber-100 text-amber-700" :
                                                    b.status === "REJECTED" || b.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                                        "bg-slate-100 text-slate-600"
                                            }`}>
                                            {friendlyStatus(b.status)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Food Orders */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <UtensilsCrossed size={16} /> Recent Orders
                        </h3>
                        {stats.orders.length === 0 ? (
                            <p className="text-sm text-slate-400">No food orders yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {stats.orders.slice(0, 4).map((o) => (
                                    <li key={o._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                        <span className="font-medium text-slate-700 truncate max-w-[55%]">
                                            {o.items?.[0]?.food_item?.name || "Food order"}
                                            {o.items?.length > 1 ? ` +${o.items.length - 1}` : ""}
                                        </span>
                                        <span className="text-slate-500">{formatCurrency(o.total_amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Trips */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Bus size={16} /> Recent Trips
                        </h3>
                        {stats.trips.length === 0 ? (
                            <p className="text-sm text-slate-400">No trips yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {stats.trips.slice(0, 4).map((t) => (
                                    <li key={t._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                        <span className="font-medium text-slate-700 truncate max-w-[55%]">
                                            {t.route?.name || t.route?.origin || "Trip"}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                                                t.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                                    "bg-slate-100 text-slate-600"
                                            }`}>
                                            {t.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Notifications */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Bell size={16} /> Recent Notifications
                        </h3>
                        {stats.notifications.length === 0 ? (
                            <p className="text-sm text-slate-400">No notifications yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {stats.notifications.slice(0, 4).map((n) => (
                                    <li key={n._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                        <p className="font-medium text-slate-700 truncate">{n.title || n.message}</p>
                                        {n.title && n.message && (
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{n.message}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
