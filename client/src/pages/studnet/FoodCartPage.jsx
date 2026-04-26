import {
	ArrowRight,
	Package,
	ShoppingCart,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
	getStudentFoodCartApi,
	updateStudentFoodCartItemApi,
	removeStudentFoodCartItemApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

const FALLBACK_IMAGE =
	"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop";

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export default function FoodCartPage() {
	const navigate = useNavigate();
	const [cart, setCart] = useState({ items: [], totals: { subtotal: 0, deliveryFee: 0, total: 0 } });
	const [loading, setLoading] = useState(true);
	const [actingCartItemId, setActingCartItemId] = useState("");

	const loadCart = async () => {
		try {
			setLoading(true);
			const { data } = await getStudentFoodCartApi();
			setCart({
				items: data.items || [],
				totals: data.totals || { subtotal: 0, deliveryFee: 0, total: 0 },
			});
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to load cart");
			setCart({ items: [], totals: { subtotal: 0, deliveryFee: 0, total: 0 } });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCart();
	}, []);

	const updateQty = async (cartItemId, quantity) => {
		try {
			setActingCartItemId(cartItemId);
			if (quantity <= 0) {
				await removeStudentFoodCartItemApi(cartItemId);
			} else {
				await updateStudentFoodCartItemApi(cartItemId, { quantity });
			}
			await loadCart();
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to update cart");
		} finally {
			setActingCartItemId("");
		}
	};

	const stats = useMemo(() => {
		const quantityCount = cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

		return {
			lineItems: cart.items.length,
			quantityCount,
		};
	}, [cart.items]);

	const handleProceedToPayment = () => {
		if (cart.items.length === 0) {
			toast.error("Your cart is empty");
			return;
		}

		navigate("/student/food/payment");
	};

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Student Food"
				title="My Cart"
				description="Review your meals, adjust quantities, and see the total before you checkout."
				backgroundImage={dashboardBanner}
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<StatCard title="Cart lines" value={stats.lineItems} tone="indigo" icon={ShoppingCart} />
				<StatCard title="Total servings" value={stats.quantityCount} tone="amber" icon={Package} />
				<StatCard title="Amount due" value={formatCurrency(cart.totals.total)} tone="emerald" icon={Wallet} />
			</div>

			{loading ? (
				<LoadingState
					title="Loading your cart"
					description="Collecting selected meals, delivery fees, and the latest food checkout totals."
				/>
			) : cart.items.length === 0 ? (
				<EmptyState
					icon="🛒"
					title="Your food cart is empty"
					description="Browse food items and add meals before proceeding to checkout."
					tone="amber"
					action={
						<Link to="/student/food/browse" className="btn-primary">
							Browse meals
						</Link>
					}
				/>
			) : (
				<div className="grid gap-6 xl:grid-cols-[1fr_380px]">
					<div className="card p-6">
						<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 className="text-xl font-bold text-slate-900">Cart Items</h3>
								<p className="mt-2 text-sm text-slate-500">
									Adjust quantities here before moving into payment.
								</p>
							</div>
							<div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
								<div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
									Checkout total
								</div>
								<div className="mt-1 text-sm font-bold text-slate-900">
									{formatCurrency(cart.totals.total)}
								</div>
							</div>
						</div>

						<div className="space-y-4">
							{cart.items.map((item) => (
								<div
									key={item.cart_id}
									className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
								>
									<div className="grid gap-4 md:grid-cols-[92px_1fr_auto] md:items-center">
										<div className="h-24 overflow-hidden rounded-2xl bg-white">
											<img
												src={item.image_url || FALLBACK_IMAGE}
												alt={item.name}
												className="h-full w-full object-cover"
												onError={(event) => {
													event.currentTarget.src = FALLBACK_IMAGE;
												}}
											/>
										</div>

										<div>
											<div className="font-semibold text-slate-900">{item.name}</div>
											<div className="mt-1 text-sm text-slate-500">{item.category}</div>
											<div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
												<span>{formatCurrency(item.price)} each</span>
												<span className="text-slate-300">•</span>
												<span className="font-semibold text-slate-900">
													Line total {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2 md:justify-end">
											<button
												type="button"
												onClick={() => updateQty(item.cart_id, item.quantity - 1)}
												disabled={actingCartItemId === item.cart_id}
												className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
											>
												-
											</button>

											<span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>

											<button
												type="button"
												onClick={() => updateQty(item.cart_id, item.quantity + 1)}
												disabled={actingCartItemId === item.cart_id}
												className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-60"
											>
												+
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="space-y-6">
						<div className="card p-6">
							<h4 className="text-xl font-bold text-slate-900">Order Summary</h4>

							<div className="mt-5 space-y-3 text-sm">
								<div className="flex justify-between">
									<span className="text-slate-500">Line items</span>
									<span className="font-medium text-slate-900">{stats.lineItems}</span>
								</div>

								<div className="flex justify-between">
									<span className="text-slate-500">Subtotal</span>
									<span className="font-medium text-slate-900">{formatCurrency(cart.totals.subtotal)}</span>
								</div>

								<div className="flex justify-between">
									<span className="text-slate-500">Delivery</span>
									<span className="font-medium text-slate-900">{formatCurrency(cart.totals.deliveryFee)}</span>
								</div>

								<div className="flex justify-between border-t border-slate-100 pt-3 text-base">
									<span className="font-semibold text-slate-900">Total</span>
									<span className="font-black text-slate-900">{formatCurrency(cart.totals.total)}</span>
								</div>
							</div>

							<button
								className="btn-primary mt-5 w-full"
								disabled={cart.items.length === 0}
								onClick={handleProceedToPayment}
							>
								Proceed to payment <ArrowRight size={16} strokeWidth={2.2} />
							</button>
						</div>

						<div className="card p-6">
							<h4 className="text-lg font-bold text-slate-900">Before you pay</h4>
							<div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
								<div className="rounded-2xl bg-slate-50 px-4 py-3">Review delivery details and cart quantities one more time.</div>
								<div className="rounded-2xl bg-slate-50 px-4 py-3">Use any valid-looking dummy card details in the demo gateway.</div>
								<div className="rounded-2xl bg-slate-50 px-4 py-3">After payment, the order moves straight into vendor processing and order tracking.</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
