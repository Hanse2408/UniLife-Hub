import {
	CalendarDays,
	CreditCard,
	Mail,
	MapPin,
	Package,
	ReceiptText,
	ShieldCheck,
	Smartphone,
	Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { checkoutStudentFoodApi, getStudentFoodCartApi } from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import { useAuth } from "../../contexts/AuthContext";

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function FieldMessage({ message }) {
	if (!message) return null;

	return <p className="mt-2 text-xs font-medium text-rose-600">{message}</p>;
}

function formatCardNumber(value) {
	const digits = value.replace(/\D/g, "").slice(0, 16);
	return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value) {
	const digits = value.replace(/\D/g, "").slice(0, 4);
	if (digits.length <= 2) return digits;
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

function isValidExpiry(expiry) {
	if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;

	const [month, year] = expiry.split("/").map(Number);
	if (month < 1 || month > 12) return false;

	const now = new Date();
	const currentYear = now.getFullYear() % 100;
	const currentMonth = now.getMonth() + 1;

	if (year < currentYear) return false;
	if (year === currentYear && month < currentMonth) return false;

	return true;
}

export default function FoodPaymentPage() {
	const navigate = useNavigate();
	const { user } = useAuth();

	const [cart, setCart] = useState(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);

	const [deliveryForm, setDeliveryForm] = useState({
		deliveryAddress: "",
		deliveryPhone: "",
	});

	const [paymentForm, setPaymentForm] = useState({
		cardName: "",
		cardNumber: "",
		expiry: "",
		cvv: "",
		email: "",
		agree: false,
	});

	const loadCart = async () => {
		try {
			setLoading(true);
			const { data } = await getStudentFoodCartApi();

			if (!data.items || data.items.length === 0) {
				setCart(null);
				return;
			}

			setCart({
				items: data.items,
				totals: data.totals || { subtotal: 0, deliveryFee: 0, total: 0 },
			});
		} catch (error) {
			setCart(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCart();
	}, []);

	useEffect(() => {
		if (!user) return;

		setDeliveryForm((prev) => ({
			...prev,
			deliveryPhone: prev.deliveryPhone || user.phone || "",
		}));

		setPaymentForm((prev) => ({
			...prev,
			cardName: prev.cardName || user.fullName || "",
			email: prev.email || user.email || "",
		}));
	}, [user]);

	const quantityCount = useMemo(
		() => cart?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0,
		[cart]
	);

	const validation = useMemo(() => {
		const errors = {};
		const phoneDigits = deliveryForm.deliveryPhone.replace(/\D/g, "");

		if (!deliveryForm.deliveryAddress.trim() || deliveryForm.deliveryAddress.trim().length < 5) {
			errors.deliveryAddress = "Delivery address is required (min 5 characters)";
		}

		if (!deliveryForm.deliveryPhone.trim() || phoneDigits.length < 7) {
			errors.deliveryPhone = "Valid phone number is required";
		}

		if (!paymentForm.cardName.trim() || paymentForm.cardName.trim().length < 3) {
			errors.cardName = "Cardholder name is required";
		}

		if (paymentForm.cardNumber.replace(/\s/g, "").length !== 16) {
			errors.cardNumber = "Card number must contain 16 digits";
		}

		if (!isValidExpiry(paymentForm.expiry)) {
			errors.expiry = "Enter a valid future expiry date";
		}

		if (!/^\d{3}$/.test(paymentForm.cvv)) {
			errors.cvv = "CVV must be 3 digits";
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentForm.email)) {
			errors.email = "Enter a valid email address";
		}

		if (!paymentForm.agree) {
			errors.agree = "You must confirm this is a demo payment";
		}

		return errors;
	}, [deliveryForm, paymentForm]);

	const canSubmit = Object.keys(validation).length === 0;

	const handlePay = async (event) => {
		event.preventDefault();

		if (!canSubmit || !cart) {
			toast.error("Please complete all payment fields correctly");
			return;
		}

		try {
			setProcessing(true);
			await checkoutStudentFoodApi(deliveryForm);
			toast.success("Payment successful. Food order placed!");
			navigate("/student/food/orders");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Payment failed. Please try again.");
		} finally {
			setProcessing(false);
		}
	};

	if (loading) {
		return (
			<LoadingState
				title="Loading payment gateway"
				description="Preparing your food checkout totals, delivery details, and demo payment form."
			/>
		);
	}

	if (!cart || cart.items.length === 0) {
		return (
			<EmptyState
				icon="🛒"
				title="Cart is empty"
				description="Add some food items to your cart before proceeding to checkout."
				tone="amber"
				action={
					<Link to="/student/food/browse" className="btn-primary">
						Browse food items
					</Link>
				}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Food Checkout"
				title="Complete Your Food Order Payment"
				description="Add your delivery details and confirm your food order."
				backgroundImage={dashboardBanner}
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="card p-5">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
							<ShieldCheck size={20} strokeWidth={2.2} />
						</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Demo payment only</div>
							<div className="text-sm text-slate-500">Use dummy card details for the academic checkout flow.</div>
						</div>
					</div>
				</div>

				<div className="card p-5">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
							<Truck size={20} strokeWidth={2.2} />
						</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Delivery ready</div>
							<div className="text-sm text-slate-500">Your address and phone are used for the simulated delivery flow.</div>
						</div>
					</div>
				</div>

				<div className="card p-5">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
							<ReceiptText size={20} strokeWidth={2.2} />
						</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Order tracking next</div>
							<div className="text-sm text-slate-500">After payment, the order moves into the vendor processing timeline.</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1fr_380px]">
				<div className="card p-6">
					<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
						<div>
							<h3 className="text-2xl font-bold text-slate-900">Payment Details</h3>
							<p className="mt-2 text-sm text-slate-500">
								Fill in the delivery and demo card details below to continue.
							</p>
						</div>

						<span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700">
							DEMO ONLY
						</span>
					</div>

					<form className="space-y-6" onSubmit={handlePay}>
						<div className="rounded-[28px] bg-slate-50 p-5">
							<div className="flex items-center gap-2 text-lg font-bold text-slate-900">
								<MapPin size={18} strokeWidth={2.2} />
								Delivery details
							</div>

							<div className="mt-4 space-y-4">
								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Delivery Address
									</label>
									<textarea
										rows="3"
										className="input"
										placeholder="Hostel Block A, Room 204, University Campus"
										value={deliveryForm.deliveryAddress}
										onChange={(event) =>
											setDeliveryForm((prev) => ({ ...prev, deliveryAddress: event.target.value }))
										}
									/>
									<FieldMessage message={validation.deliveryAddress} />
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Delivery Phone
									</label>
									<div className="relative">
										<Smartphone size={16} strokeWidth={2.1} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
										<input
											type="tel"
											className="input pl-11"
											placeholder="0771234567"
											value={deliveryForm.deliveryPhone}
											onChange={(event) =>
												setDeliveryForm((prev) => ({ ...prev, deliveryPhone: event.target.value }))
											}
										/>
									</div>
									<FieldMessage message={validation.deliveryPhone} />
								</div>
							</div>
						</div>

						<div>
							<div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
								<CreditCard size={18} strokeWidth={2.2} />
								Card payment
							</div>

							<div className="space-y-5">
								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Cardholder name
									</label>
									<input
										className="input"
										placeholder="Narada Weera"
										value={paymentForm.cardName}
										onChange={(event) =>
											setPaymentForm((prev) => ({ ...prev, cardName: event.target.value }))
										}
									/>
									<FieldMessage message={validation.cardName} />
								</div>

								<div>
									<label className="mb-2 block text-sm font-semibold text-slate-700">
										Card number
									</label>
									<input
										className="input"
										placeholder="1234 5678 9012 3456"
										value={paymentForm.cardNumber}
										onChange={(event) =>
											setPaymentForm((prev) => ({
												...prev,
												cardNumber: formatCardNumber(event.target.value),
											}))
										}
									/>
									<FieldMessage message={validation.cardNumber} />
								</div>

								<div className="grid gap-5 md:grid-cols-2">
									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											Expiry
										</label>
										<input
											className="input"
											placeholder="MM/YY"
											value={paymentForm.expiry}
											onChange={(event) =>
												setPaymentForm((prev) => ({
													...prev,
													expiry: formatExpiry(event.target.value),
												}))
											}
										/>
										<FieldMessage message={validation.expiry} />
									</div>

									<div>
										<label className="mb-2 block text-sm font-semibold text-slate-700">
											CVV
										</label>
										<input
											type="password"
											className="input"
											placeholder="123"
											value={paymentForm.cvv}
											onChange={(event) =>
												setPaymentForm((prev) => ({
													...prev,
													cvv: event.target.value.replace(/\D/g, "").slice(0, 3),
												}))
											}
										/>
										<FieldMessage message={validation.cvv} />
									</div>
								</div>

								<div>
									<label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
										<Mail size={15} strokeWidth={2.1} />
										Receipt email
									</label>
									<input
										type="email"
										className="input"
										placeholder="student@example.com"
										value={paymentForm.email}
										onChange={(event) =>
											setPaymentForm((prev) => ({ ...prev, email: event.target.value }))
										}
									/>
									<FieldMessage message={validation.email} />
								</div>

								<div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
									<div className="flex items-center gap-2 font-semibold text-slate-900">
										<CreditCard size={16} strokeWidth={2.1} />
										Demo gateway note
									</div>
									<div className="mt-2">
										Use any dummy 16-digit card number, a valid future expiry date, and a 3-digit CVV.
										This is a simulated checkout for your project demo only.
									</div>
								</div>

								<label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
									<input
										type="checkbox"
										checked={paymentForm.agree}
										onChange={(event) =>
											setPaymentForm((prev) => ({ ...prev, agree: event.target.checked }))
										}
									/>
									<span>
										I understand this is a demo payment gateway for academic use only.
									</span>
								</label>
								<FieldMessage message={validation.agree} />
							</div>
						</div>

						<div className="flex gap-3">
							<Link to="/student/food/cart" className="btn-secondary flex-1">
								Back to Cart
							</Link>

							<button type="submit" className="btn-primary flex-1" disabled={processing || !canSubmit}>
								{processing ? "Processing..." : "Pay Now"}
							</button>
						</div>
					</form>
				</div>

				<div className="space-y-6">
					<div className="card p-6">
						<h4 className="text-xl font-bold text-slate-900">Order Summary</h4>

						<div className="mt-5 space-y-3">
							<div className="rounded-2xl bg-slate-50 p-3">
								<div className="text-xs text-slate-500">Total Items</div>
								<div className="mt-1 font-semibold text-slate-900">
									{quantityCount} serving{quantityCount !== 1 ? "s" : ""}
								</div>
							</div>

							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-slate-500">Subtotal</span>
									<span className="font-medium text-slate-900">{formatCurrency(cart.totals.subtotal)}</span>
								</div>

								<div className="flex justify-between">
									<span className="text-slate-500">Delivery Fee</span>
									<span className="font-medium text-slate-900">{formatCurrency(cart.totals.deliveryFee)}</span>
								</div>
							</div>

							<div className="rounded-2xl bg-orange-50 p-4">
								<div className="text-sm text-orange-600">Amount to pay now</div>
								<div className="mt-1 text-2xl font-black text-orange-700">
									{formatCurrency(cart.totals.total)}
								</div>
							</div>
						</div>
					</div>

					<div className="card p-6">
						<h4 className="text-lg font-bold text-slate-900">Your Cart Items</h4>
						<div className="mt-4 space-y-3">
							{cart.items.map((item) => (
								<div key={item.cart_id} className="rounded-xl bg-slate-50 p-3">
									<div className="font-medium text-slate-900">{item.name}</div>
									<div className="mt-1 flex justify-between text-sm text-slate-600">
										<span>Qty: {item.quantity}</span>
										<span>{formatCurrency(item.price)} each</span>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="card p-6">
						<h4 className="text-lg font-bold text-slate-900">What happens after payment?</h4>
						<div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
							<div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
								<Package size={16} strokeWidth={2.1} className="mt-1 shrink-0 text-indigo-600" />
								<span>Your food order is created and marked as paid in the system.</span>
							</div>
							<div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
								<Truck size={16} strokeWidth={2.1} className="mt-1 shrink-0 text-amber-600" />
								<span>The vendor receives the order and moves it through preparation and delivery.</span>
							</div>
							<div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
								<CalendarDays size={16} strokeWidth={2.1} className="mt-1 shrink-0 text-emerald-600" />
								<span>You can track the full order progress from the My Orders page.</span>
							</div>
						</div>
					</div>

					<div className="card p-6">
						<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
							<Smartphone size={15} strokeWidth={2.1} />
							Contact on delivery
						</div>
						<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
							<div className="font-semibold text-slate-900">Primary contact</div>
							<div className="mt-1">{deliveryForm.deliveryPhone || "Add a phone number before paying."}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
