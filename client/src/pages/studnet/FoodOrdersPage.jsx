import {
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	MapPin,
	Package,
	ReceiptText,
	Star,
	Truck,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getStudentFoodOrdersApi, checkReviewExistsApi, createReviewApi } from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import ReviewModal from "../../components/common/ReviewModal";

const orderSteps = [
	{ key: "pending", label: "Pending" },
	{ key: "food_processing", label: "Preparing" },
	{ key: "out_for_delivery", label: "On the way" },
	{ key: "delivered", label: "Delivered" },
];

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatDateTime(value) {
	if (!value) return "N/A";

	return new Date(value).toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getOrderStepIndex(status) {
	return orderSteps.findIndex((step) => step.key === status);
}

function getOrderMeta(order) {
	if (order.order_status === "pending") {
		return {
			title: "Order placed successfully",
			description: "The payment is complete and the order is waiting for the vendor to start processing.",
		};
	}

	if (order.order_status === "food_processing") {
		return {
			title: "Vendor is preparing your meal",
			description: "The vendor has accepted the order and is working through preparation now.",
		};
	}

	if (order.order_status === "out_for_delivery") {
		return {
			title: "Out for delivery",
			description: "Your food is on the way to the address you submitted during checkout.",
		};
	}

	if (order.order_status === "delivered") {
		return {
			title: "Delivered successfully",
			description: "This order completed the full checkout-to-delivery flow successfully.",
		};
	}

	if (order.order_status === "cancelled") {
		return {
			title: "Order cancelled",
			description: "This order did not complete the full delivery workflow.",
		};
	}

	return {
		title: "Order update",
		description: "Check the current order status and delivery details below.",
	};
}

export default function FoodOrdersPage() {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [reviewModalOrderId, setReviewModalOrderId] = useState(null);
	const [reviewedOrders, setReviewedOrders] = useState({});
	const [submittingReview, setSubmittingReview] = useState(false);

	const loadOrders = async () => {
		try {
			setLoading(true);
			const { data } = await getStudentFoodOrdersApi();
			const loadedOrders = data.orders || [];
			setOrders(loadedOrders);
			// Check review status for delivered orders
			const delivered = loadedOrders.filter((o) => o.order_status === "delivered");
			const checks = await Promise.allSettled(delivered.map((o) => checkReviewExistsApi(o._id)));
			const reviewed = {};
			delivered.forEach((o, i) => {
				if (checks[i].status === "fulfilled") {
					const d = checks[i].value.data;
					if (d.hasReviewed) reviewed[o._id] = d.review;
				}
			});
			setReviewedOrders(reviewed);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to load food orders");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmitOrderReview = async ({ rating, comment }) => {
		try {
			setSubmittingReview(true);
			await createReviewApi({ entityType: "FOOD_ORDER", entityId: reviewModalOrderId, rating, comment });
			toast.success("Review submitted!");
			const { data } = await checkReviewExistsApi(reviewModalOrderId);
			setReviewedOrders((prev) => ({ ...prev, [reviewModalOrderId]: data.review }));
			setReviewModalOrderId(null);
		} catch (err) {
			toast.error(err?.response?.data?.message || "Failed to submit review");
		} finally {
			setSubmittingReview(false);
		}
	};

	useEffect(() => {
		loadOrders();
	}, []);

	const stats = useMemo(() => {
		return {
			total: orders.length,
			active: orders.filter((order) => !["delivered", "cancelled"].includes(order.order_status)).length,
			delivered: orders.filter((order) => order.order_status === "delivered").length,
			paidTotal: orders
				.filter((order) => order.payment_status === "paid")
				.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
		};
	}, [orders]);

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Student Food"
				title="My Food Orders"
				description="Track every food order from payment confirmation through preparation, delivery, and completed history."
				backgroundImage={dashboardBanner}
			/>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard title="Total orders" value={stats.total} tone="indigo" icon={ClipboardList} />
				<StatCard title="Active deliveries" value={stats.active} tone="amber" icon={Truck} />
				<StatCard title="Delivered" value={stats.delivered} tone="emerald" icon={CheckCircle2} />
				<StatCard title="Paid total" value={formatCurrency(stats.paidTotal)} tone="blue" icon={Wallet} />
			</div>

			{loading ? (
				<LoadingState
					title="Loading food orders"
					description="Collecting your checkout history, delivery progress, and food order totals."
				/>
			) : orders.length === 0 ? (
				<EmptyState
					icon="📦"
					title="No food orders yet"
					description="Your placed food orders will appear here after checkout."
					tone="amber"
					action={
						<Link to="/student/food/browse" className="btn-primary">
							Browse meals
						</Link>
					}
				/>
			) : (
				<div className="space-y-5">
					{orders.map((order) => {
						const meta = getOrderMeta(order);
						const stepIndex = getOrderStepIndex(order.order_status);
						const itemCount = (order.items || []).reduce(
							(sum, item) => sum + Number(item.quantity || 0),
							0
						);

						return (
							<div key={order._id} className="card p-6">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<h3 className="text-xl font-bold text-slate-900">
											Food Order #{String(order._id).slice(-6).toUpperCase()}
										</h3>
										<p className="mt-2 text-sm text-slate-500">
											{formatDateTime(order.order_date || order.createdAt)}
										</p>
									</div>

									<div className="flex flex-wrap gap-2">
										<StatusBadge value={order.payment_status?.toUpperCase()} />
										<StatusBadge value={order.order_status?.toUpperCase()} />
									</div>
								</div>

								<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
									<div className="font-semibold text-slate-900">{meta.title}</div>
									<div className="mt-1">{meta.description}</div>
								</div>

								<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
									<div className="rounded-2xl bg-slate-50 p-4">
										<div className="flex items-center gap-2 text-sm text-slate-500">
											<MapPin size={14} strokeWidth={2.1} />
											Delivery address
										</div>
										<div className="mt-1 font-semibold text-slate-900">{order.delivery_address}</div>
									</div>

									<div className="rounded-2xl bg-slate-50 p-4">
										<div className="text-sm text-slate-500">Phone</div>
										<div className="mt-1 font-semibold text-slate-900">{order.delivery_phone}</div>
									</div>

									<div className="rounded-2xl bg-indigo-50 p-4">
										<div className="text-sm text-indigo-600">Total amount</div>
										<div className="mt-1 text-xl font-black text-indigo-700">{formatCurrency(order.total_amount)}</div>
									</div>

									<div className="rounded-2xl bg-slate-50 p-4">
										<div className="flex items-center gap-2 text-sm text-slate-500">
											<CalendarDays size={14} strokeWidth={2.1} />
											Placed on
										</div>
										<div className="mt-1 font-semibold text-slate-900">
											{formatDateTime(order.order_date || order.createdAt)}
										</div>
										<div className="mt-2 text-sm text-slate-500">
											{itemCount} serving{itemCount !== 1 ? "s" : ""}
										</div>
									</div>
								</div>

								{order.order_status === "cancelled" ? (
									<div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
										This order was cancelled and is no longer moving through the delivery pipeline.
									</div>
								) : (
									<div className="mt-5">
										<div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
											Order Progress
										</div>
										<div className="grid gap-3 sm:grid-cols-4">
											{orderSteps.map((step, index) => {
												const complete = stepIndex >= index;
												const current = stepIndex === index;

												return (
													<div
														key={step.key}
														className={`rounded-2xl border px-4 py-3 text-sm transition ${complete
															? "border-emerald-200 bg-emerald-50 text-emerald-700"
															: "border-slate-200 bg-white text-slate-400"
															} ${current ? "ring-2 ring-emerald-100" : ""}`}
													>
														<div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
															Step {index + 1}
														</div>
														<div className="mt-1 font-semibold">{step.label}</div>
													</div>
												);
											})}
										</div>
									</div>
								)}

								<div className="mt-5">
									<h4 className="mb-3 text-base font-bold text-slate-900">Items</h4>
									<div className="space-y-3">
										{(order.items || []).map((item, index) => (
											<div
												key={`${order._id}-${index}`}
												className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
											>
												<div className="flex items-center justify-between gap-3">
													<div className="font-medium text-slate-900">
														{item.food_item_id?.name || "Food item"}
													</div>
													<div className="text-slate-500">Qty: {item.quantity}</div>
												</div>
												<div className="mt-1 text-slate-500">
													{formatCurrency(item.price_at_time)} each • Line total {formatCurrency(Number(item.price_at_time || 0) * Number(item.quantity || 0))}
												</div>
											</div>
										))}
									</div>
								</div>

								<div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
									<span className="inline-flex items-center gap-2">
										<ReceiptText size={14} strokeWidth={2.1} />
										Order ID {String(order._id).slice(-6).toUpperCase()}
									</span>

									{order.order_status === "delivered" && (
										reviewedOrders[order._id] ? (
											<span className="inline-flex items-center gap-1 normal-case tracking-normal text-sm">
												{[1, 2, 3, 4, 5].map((s) => (
													<Star key={s} size={14} className={s <= reviewedOrders[order._id].rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
												))}
												<span className="ml-1 font-bold text-slate-700">{reviewedOrders[order._id].rating}/5</span>
											</span>
										) : (
											<button
												onClick={() => setReviewModalOrderId(order._id)}
												className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold normal-case tracking-normal text-white hover:bg-indigo-700 transition"
											>
												Rate this order
											</button>
										)
									)}

									<span className="inline-flex items-center gap-2">
										<Package size={14} strokeWidth={2.1} />
										Food delivery workflow
									</span>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<ReviewModal
				open={!!reviewModalOrderId}
				onClose={() => setReviewModalOrderId(null)}
				onSubmit={handleSubmitOrderReview}
				title="Rate this food order"
				submitting={submittingReview}
			/>
		</div>
	);
}
