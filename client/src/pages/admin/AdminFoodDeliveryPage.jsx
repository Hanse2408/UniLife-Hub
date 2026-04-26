import {
    CheckCircle2,
    Clock3,
    MapPin,
    Phone,
    Search,
    Truck,
    UtensilsCrossed,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    dispatchFoodOrderApi,
    getAllFoodOrdersAdminApi,
    markFoodOrderDeliveredApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";

function formatCurrency(value) {
    return `LKR ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(raw) {
    if (!raw) return "—";
    return new Date(raw).toLocaleString("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

const STATUS_META = {
    pending: { label: "Awaiting vendor", color: "bg-amber-50 text-amber-700 border-amber-200" },
    food_processing: { label: "Vendor preparing — needs dispatch", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    out_for_delivery: { label: "Out for delivery", color: "bg-blue-50 text-blue-700 border-blue-200" },
    delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const DELIVERY_STEPS = [
    { key: "pending", label: "Order placed" },
    { key: "food_processing", label: "Vendor preparing" },
    { key: "out_for_delivery", label: "Out for delivery" },
    { key: "delivered", label: "Delivered" },
];

function getStepIndex(status) {
    const map = { pending: 0, food_processing: 1, out_for_delivery: 2, delivered: 3 };
    return map[status] ?? -1;
}

export default function AdminFoodDeliveryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [query, setQuery] = useState("");
    const [viewFilter, setViewFilter] = useState("all");

    const loadOrders = async () => {
        try {
            setLoading(true);
            const { data } = await getAllFoodOrdersAdminApi();
            setOrders(data.orders || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load orders");
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const handleDispatch = async (orderId) => {
        try {
            setActionLoadingId(orderId);
            await dispatchFoodOrderApi(orderId);
            toast.success("Order dispatched for delivery");
            await loadOrders();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to dispatch order");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeliver = async (orderId) => {
        try {
            setActionLoadingId(orderId);
            await markFoodOrderDeliveredApi(orderId);
            toast.success("Order marked as delivered");
            await loadOrders();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update order");
        } finally {
            setActionLoadingId(null);
        }
    };

    const stats = useMemo(() => {
        const needsDispatch = orders.filter((o) => o.order_status === "food_processing").length;
        const inTransit = orders.filter((o) => o.order_status === "out_for_delivery").length;
        const delivered = orders.filter((o) => o.order_status === "delivered").length;
        const totalValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        return { needsDispatch, inTransit, delivered, totalValue };
    }, [orders]);

    const filteredOrders = useMemo(() => {
        let list = orders;

        if (viewFilter === "dispatch") list = list.filter((o) => o.order_status === "food_processing");
        else if (viewFilter === "transit") list = list.filter((o) => o.order_status === "out_for_delivery");
        else if (viewFilter === "delivered") list = list.filter((o) => o.order_status === "delivered");

        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(
                (o) =>
                    String(o._id).toLowerCase().includes(q) ||
                    (o.student_id?.fullName || "").toLowerCase().includes(q) ||
                    (o.delivery_address || "").toLowerCase().includes(q) ||
                    (o.delivery_phone || "").toLowerCase().includes(q)
            );
        }

        return list;
    }, [orders, viewFilter, query]);

    return (
        <div className="space-y-6">
            <PageHero
                title="Campus Food Delivery"
                description="Manage order dispatch and delivery confirmation across all vendor orders. Vendors prepare the food — campus dispatches and delivers."
                backgroundImage={dashboardBanner}
            />

            {loading ? (
                <LoadingState
                    title="Loading food orders"
                    description="Fetching all orders from the platform for dispatch and delivery management."
                />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Needs dispatch"
                            value={stats.needsDispatch}
                            subtitle="Orders ready for campus delivery pickup."
                            tone="indigo"
                            icon="🍱"
                        />
                        <StatCard
                            title="In transit"
                            value={stats.inTransit}
                            subtitle="Orders currently heading to students."
                            tone="blue"
                            icon={Truck}
                        />
                        <StatCard
                            title="Delivered today"
                            value={stats.delivered}
                            subtitle="Successfully completed deliveries."
                            tone="emerald"
                            icon={CheckCircle2}
                        />
                        <StatCard
                            title="Total order value"
                            value={formatCurrency(stats.totalValue)}
                            subtitle="Combined value across all orders."
                            tone="amber"
                            icon={Wallet}
                        />
                    </div>

                    <div className="card p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Delivery filters
                                </div>
                                <h3 className="mt-2 text-2xl font-bold text-slate-900">Find orders needing action</h3>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                                {filteredOrders.length} of {orders.length} orders shown
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                            <label className="relative block">
                                <Search
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    className="input pl-11"
                                    placeholder="Search by order ID, student name, phone, or address"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </label>

                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: "all", label: "All orders" },
                                    { key: "dispatch", label: "Needs dispatch" },
                                    { key: "transit", label: "In transit" },
                                    { key: "delivered", label: "Delivered" },
                                ].map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setViewFilter(f.key)}
                                        className={viewFilter === f.key ? "btn-primary" : "btn-secondary"}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {orders.length === 0 ? (
                        <EmptyState
                            icon="🍱"
                            title="No food orders on the platform yet"
                            description="Once students place food orders, they will appear here for campus delivery management."
                            tone="indigo"
                        />
                    ) : filteredOrders.length === 0 ? (
                        <EmptyState
                            compact
                            icon="🔎"
                            title="No orders match the current filters"
                            description="Try a different search term or switch to a broader queue view."
                            tone="slate"
                            action={
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => { setQuery(""); setViewFilter("all"); }}
                                >
                                    Clear filters
                                </button>
                            }
                        />
                    ) : (
                        <div className="space-y-5">
                            {filteredOrders.map((order) => {
                                const meta = STATUS_META[order.order_status] || STATUS_META.pending;
                                const stepIndex = getStepIndex(order.order_status);
                                const isBusy = actionLoadingId === order._id;

                                return (
                                    <article key={order._id} className="card overflow-hidden p-6">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div>
                                                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                                                    Order #{String(order._id).slice(-6).toUpperCase()}
                                                </div>
                                                <h3 className="mt-3 text-2xl font-bold text-slate-900">{meta.label}</h3>
                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Clock3 size={16} />
                                                        {formatDateTime(order.order_date || order.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <StatusBadge value={order.payment_status?.toUpperCase()} />
                                                <StatusBadge value={order.order_status?.toUpperCase()} />
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-3xl bg-slate-50 p-4">
                                                <div className="text-sm text-slate-500">Student</div>
                                                <div className="mt-2 font-semibold text-slate-900">
                                                    {order.student_id?.fullName || "Student"}
                                                </div>
                                                {order.student_id?.email && (
                                                    <div className="mt-1 text-xs text-slate-500">{order.student_id.email}</div>
                                                )}
                                            </div>
                                            <div className="rounded-3xl bg-slate-50 p-4">
                                                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                                                    <Phone size={14} />
                                                    Phone
                                                </div>
                                                <div className="mt-2 font-semibold text-slate-900">
                                                    {order.delivery_phone || "Not provided"}
                                                </div>
                                            </div>
                                            <div className="rounded-3xl bg-indigo-50 p-4">
                                                <div className="text-sm text-indigo-600">Order total</div>
                                                <div className="mt-2 text-2xl font-black text-indigo-700">
                                                    {formatCurrency(order.total_amount)}
                                                </div>
                                            </div>
                                            <div className="rounded-3xl bg-slate-50 p-4">
                                                <div className="text-sm text-slate-500">Items</div>
                                                <div className="mt-2 font-semibold text-slate-900">
                                                    {(order.items || []).length} item{(order.items || []).length !== 1 ? "s" : ""}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                                            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                                                <MapPin size={14} />
                                                Delivery address
                                            </div>
                                            <div className="mt-2 font-semibold text-slate-900">
                                                {order.delivery_address || "No address provided"}
                                            </div>
                                        </div>

                                        {/* Items list */}
                                        {(order.items || []).length > 0 && (
                                            <div className="mt-4 rounded-3xl border border-slate-100 p-4">
                                                <div className="text-sm font-semibold text-slate-900 mb-3">Order contents</div>
                                                <div className="space-y-2">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-sm">
                                                            <span className="font-medium text-slate-800">
                                                                {item.food_item_id?.name || "Food item"} × {item.quantity}
                                                            </span>
                                                            <span className="text-slate-500">
                                                                LKR {(Number(item.price_at_time || 0) * item.quantity).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Delivery progress steps */}
                                        {order.order_status !== "cancelled" && (
                                            <div className="mt-4 rounded-3xl border border-slate-100 p-4">
                                                <div className="text-sm font-semibold text-slate-900 mb-4">Delivery progress</div>
                                                <div className="grid gap-3 md:grid-cols-4">
                                                    {DELIVERY_STEPS.map((step, index) => {
                                                        const complete = stepIndex >= index;
                                                        const current = stepIndex === index;
                                                        return (
                                                            <div
                                                                key={step.key}
                                                                className={`rounded-2xl border px-4 py-3 ${current
                                                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                                                    : complete
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : "border-slate-200 bg-white text-slate-400"
                                                                    }`}
                                                            >
                                                                <div className="text-xs font-semibold uppercase tracking-[0.2em]">
                                                                    Step {index + 1}
                                                                </div>
                                                                <div className="mt-2 text-sm font-semibold">{step.label}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons — only admin can dispatch and mark delivered */}
                                        {order.order_status === "food_processing" && (
                                            <div className="mt-5 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    className="btn-primary flex items-center gap-2"
                                                    onClick={() => handleDispatch(order._id)}
                                                    disabled={isBusy}
                                                >
                                                    <Truck size={16} />
                                                    {isBusy ? "Dispatching…" : "Dispatch for Delivery"}
                                                </button>
                                                <p className="self-center text-sm text-slate-500">
                                                    Notifies the student that their order is on the way.
                                                </p>
                                            </div>
                                        )}

                                        {order.order_status === "out_for_delivery" && (
                                            <div className="mt-5 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    className="btn-primary flex items-center gap-2"
                                                    onClick={() => handleDeliver(order._id)}
                                                    disabled={isBusy}
                                                >
                                                    <CheckCircle2 size={16} />
                                                    {isBusy ? "Updating…" : "Mark as Delivered"}
                                                </button>
                                                <p className="self-center text-sm text-slate-500">
                                                    Confirms delivery and notifies the student.
                                                </p>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
