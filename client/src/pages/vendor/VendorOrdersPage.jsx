import { Clock3, Search, Truck, UtensilsCrossed, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
	getVendorFoodOrdersApi,
	updateVendorFoodOrderStatusApi,
} from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const statusOptions = ["pending", "food_processing"];

const orderSteps = [
	{ key: "pending", label: "Queued" },
	{ key: "food_processing", label: "Cooking" },
	{ key: "out_for_delivery", label: "Dispatch" },
	{ key: "delivered", label: "Delivered" },
];

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatDateTime(value) {
	if (!value) {
		return "Date unavailable";
	}

	return new Date(value).toLocaleString("en-LK", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function getStepIndex(status) {
	return orderSteps.findIndex((step) => step.key === status);
}

function getOrderMeta(status) {
	switch (status) {
		case "food_processing":
			return {
				title: "In preparation",
				description: "The kitchen has accepted this order and is actively preparing it.",
			};
		case "out_for_delivery":
			return {
				title: "Out for delivery",
				description: "Preparation is complete and the order is moving toward the student.",
			};
		case "delivered":
			return {
				title: "Completed",
				description: "This order has been delivered successfully.",
			};
		case "cancelled":
			return {
				title: "Cancelled",
				description: "This order is no longer active in the fulfilment queue.",
			};
		default:
			return {
				title: "Awaiting action",
				description: "A new order is in the queue and ready for kitchen acknowledgement.",
			};
	}
}

export default function VendorOrdersPage() {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [viewFilter, setViewFilter] = useState("all");
	const [updatingOrderId, setUpdatingOrderId] = useState("");

	const loadOrders = async () => {
		try {
			setLoading(true);
			const { data } = await getVendorFoodOrdersApi();
			setOrders(data.orders || []);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to load vendor orders");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadOrders();
	}, []);

	const handleStatusChange = async (orderId, status) => {
		const currentOrder = orders.find((order) => order._id === orderId);
		if (!currentOrder || currentOrder.order_status === status) {
			return;
		}

		try {
			setUpdatingOrderId(orderId);
			await updateVendorFoodOrderStatusApi(orderId, { status });
			setOrders((current) =>
				current.map((order) =>
					order._id === orderId ? { ...order, order_status: status } : order
				)
			);
			toast.success("Order status updated successfully");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to update order");
		} finally {
			setUpdatingOrderId("");
		}
	};

	const totalSales = orders.reduce(
		(sum, order) => sum + Number(order.total_amount || 0),
		0
	);
	const activeOrders = orders.filter(
		(order) => order.order_status === "pending" || order.order_status === "food_processing"
	).length;
	const deliveryOrders = orders.filter(
		(order) => order.order_status === "out_for_delivery"
	).length;

	const filteredOrders = orders.filter((order) => {
		const searchValue = [
			order._id,
			order.student_id?.fullName,
			order.delivery_address,
			order.delivery_phone,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();

		const matchesQuery = !query.trim() || searchValue.includes(query.trim().toLowerCase());

		if (!matchesQuery) {
			return false;
		}

		if (viewFilter === "active") {
			return order.order_status === "pending" || order.order_status === "food_processing";
		}

		if (viewFilter === "delivery") {
			return order.order_status === "out_for_delivery";
		}

		if (viewFilter === "delivered") {
			return order.order_status === "delivered";
		}

		return true;
	});

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Vendor Orders"
				title="Keep the order queue visible and moving"
				description="See all student orders and track them from preparation to delivery."
				backgroundImage={dashboardBanner}
			/>

			{loading ? (
				<LoadingState
					title="Loading vendor orders"
					description="Pulling the current student order queue and fulfilment state from the vendor API."
				/>
			) : (
				<>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<StatCard
							title="Orders received"
							value={orders.length}
							subtitle="Every order currently attached to your vendor account."
							tone="indigo"
							icon="🧾"
						/>
						<StatCard
							title="Kitchen queue"
							value={activeOrders}
							subtitle="Orders still waiting on preparation work or acknowledgement."
							tone="amber"
							icon={UtensilsCrossed}
						/>
						<StatCard
							title="Out for delivery"
							value={deliveryOrders}
							subtitle="Orders already dispatched and heading toward students."
							tone="blue"
							icon={Truck}
						/>
						<StatCard
							title="Order value"
							value={formatCurrency(totalSales)}
							subtitle="Displayed using the same raw rupee-style totals returned by the backend."
							tone="emerald"
							icon={Wallet}
						/>
					</div>

					<div className="card p-5">
						<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
							<div>
								<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
									Queue filters
								</div>
								<h3 className="mt-2 text-2xl font-bold text-slate-900">Find the orders that matter now</h3>
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
									placeholder="Search by order ID, student, phone, or address"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
								/>
							</label>

							<div className="flex flex-wrap gap-2">
								{[
									{ key: "all", label: "All orders" },
									{ key: "active", label: "Need action" },
									{ key: "delivery", label: "Out for delivery" },
									{ key: "delivered", label: "Delivered" },
								].map((filter) => (
									<button
										key={filter.key}
										type="button"
										onClick={() => setViewFilter(filter.key)}
										className={viewFilter === filter.key ? "btn-primary" : "btn-secondary"}
									>
										{filter.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{orders.length === 0 ? (
						<EmptyState
							icon="🍱"
							title="No orders have reached this vendor account yet"
							description="Once students place food orders, they will appear here with delivery details, item lines, and fulfilment status controls."
							tone="amber"
							action={
								<Link to="/vendor/items" className="btn-primary">
									Build the menu
								</Link>
							}
						/>
					) : filteredOrders.length === 0 ? (
						<EmptyState
							compact
							icon="🔎"
							title="No orders match the current filters"
							description="Try a different search term or switch back to a broader queue view."
							tone="slate"
							action={
								<button
									type="button"
									className="btn-secondary"
									onClick={() => {
										setQuery("");
										setViewFilter("all");
									}}
								>
									Clear filters
								</button>
							}
						/>
					) : (
						<div className="space-y-5">
							{filteredOrders.map((order) => {
								const meta = getOrderMeta(order.order_status);
								const currentStepIndex = getStepIndex(order.order_status);

								return (
									<article key={order._id} className="card overflow-hidden p-6">
										<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
											<div>
												<div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
													Order #{String(order._id).slice(-6).toUpperCase()}
												</div>
												<h3 className="mt-3 text-2xl font-bold text-slate-900">{meta.title}</h3>
												<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
													{meta.description}
												</p>
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
											</div>
											<div className="rounded-3xl bg-slate-50 p-4">
												<div className="text-sm text-slate-500">Phone</div>
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
												<div className="text-sm text-slate-500">Payment state</div>
												<div className="mt-2 font-semibold text-slate-900">
													{order.payment_status || "pending"}
												</div>
											</div>
										</div>

										<div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
											<div className="text-sm text-slate-500">Delivery address</div>
											<div className="mt-2 font-semibold text-slate-900">
												{order.delivery_address || "No address provided"}
											</div>
										</div>

										<div className="mt-5 rounded-3xl border border-slate-100 p-4">
											<div className="flex flex-wrap items-start justify-between gap-4">
												<div>
													<div className="text-sm font-semibold text-slate-900">Fulfilment progress</div>
													<p className="mt-1 text-sm text-slate-500">
														Update the queue as the kitchen moves from preparation to delivery.
													</p>
												</div>

												<label className="min-w-[240px]">
													<span className="mb-2 block text-sm font-semibold text-slate-700">
														Update order status
													</span>
													<select
														className="select"
														value={order.order_status}
														onChange={(event) => handleStatusChange(order._id, event.target.value)}
														disabled={updatingOrderId === order._id}
													>
														{statusOptions.map((status) => (
															<option key={status} value={status}>
																{status.replaceAll("_", " ")}
															</option>
														))}
													</select>
												</label>
											</div>

											{order.order_status === "cancelled" ? (
												<div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
													This order has been cancelled and is no longer part of the active vendor queue.
												</div>
											) : (
												<div className="mt-4 grid gap-3 md:grid-cols-4">
													{orderSteps.map((step, index) => {
														const complete = currentStepIndex >= index;
														const current = currentStepIndex === index;

														return (
															<div
																key={step.key}
																className={`rounded-2xl border px-4 py-3 ${current
																	? "border-indigo-200 bg-indigo-50 text-indigo-700"
																	: complete
																		? "border-emerald-200 bg-emerald-50 text-emerald-700"
																		: "border-slate-200 bg-white text-slate-500"
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
											)}
										</div>

										<div className="mt-5 rounded-3xl border border-slate-100 p-4">
											<div className="text-base font-bold text-slate-900">Items in this order</div>
											<div className="mt-4 space-y-3">
												{(order.items || []).map((item, index) => {
													const lineTotal = Number(item.price_at_time || 0) * Number(item.quantity || 0);

													return (
														<div
															key={`${order._id}-${index}`}
															className="rounded-2xl bg-slate-50 px-4 py-3"
														>
															<div className="flex flex-wrap items-start justify-between gap-3">
																<div>
																	<div className="font-semibold text-slate-900">
																		{item.food_item_id?.name || "Food item"}
																	</div>
																	<div className="mt-1 text-sm text-slate-500">
																		Unit price: {formatCurrency(item.price_at_time)}
																	</div>
																</div>
																<div className="text-right text-sm text-slate-500">
																	<div>Qty: {item.quantity}</div>
																	<div className="mt-1 font-semibold text-slate-900">
																		{formatCurrency(lineTotal)}
																	</div>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										</div>
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
