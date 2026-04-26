import {
    Bus,
    CalendarDays,
    CreditCard,
    LockKeyhole,
    Mail,
    MapPin,
    ShieldCheck,
    Users,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getTransportBookingApi, payTransportBookingApi } from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

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

function FieldLabel({ icon: Icon, children }) {
    return (
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Icon size={16} strokeWidth={2.2} className="text-slate-400" />
            <span>{children}</span>
        </label>
    );
}

export default function TransportPaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [form, setForm] = useState({
        cardName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
        email: "",
        agree: false,
    });

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data } = await getTransportBookingApi(id);
                setBooking(data.booking || null);
            } catch {
                setBooking(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            cardName: prev.cardName || user?.fullName || "",
            email: prev.email || user?.email || "",
        }));
    }, [user?.email, user?.fullName]);

    const validation = useMemo(() => {
        const errors = {};
        if (!form.cardName.trim() || form.cardName.trim().length < 3) errors.cardName = "Cardholder name is required";
        if (form.cardNumber.replace(/\s/g, "").length !== 16) errors.cardNumber = "Card number must contain 16 digits";
        if (!isValidExpiry(form.expiry)) errors.expiry = "Enter a valid future expiry date";
        if (!/^\d{3}$/.test(form.cvv)) errors.cvv = "CVV must be 3 digits";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
        if (!form.agree) errors.agree = "You must confirm this is a demo payment";
        return errors;
    }, [form]);

    const canSubmit = Object.keys(validation).length === 0;

    const handlePay = async (e) => {
        e.preventDefault();
        if (!canSubmit || !booking) {
            toast.error("Please complete all payment fields correctly");
            return;
        }
        try {
            setProcessing(true);
            await payTransportBookingApi(booking._id);
            toast.success("Payment successful. Booking confirmed!");
            navigate("/student/transport/bookings");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Payment failed. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <LoadingState title="Loading payment gateway" description="Preparing your transport booking checkout." />;
    }

    if (!booking) {
        return (
            <EmptyState
                icon="🎫"
                tone="amber"
                title="Booking not found"
                description="We could not load this transport booking payment page."
                action={<Link to="/student/transport/bookings" className="btn-primary">Back to bookings</Link>}
            />
        );
    }

    if (booking.status !== "PENDING") {
        return (
            <EmptyState
                icon="🔒"
                tone="slate"
                title="Payment not available"
                description="This booking is not currently waiting for payment."
                action={<Link to="/student/transport/bookings" className="btn-primary">Back to bookings</Link>}
            />
        );
    }

    const listing = booking.listingId;

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport Payment"
                title="Complete Your Trip Payment"
                description="Confirm your booking and complete the demo payment to secure your seat."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                {/* Left - Payment Form */}
                <div className="space-y-6">
                    <div className="card p-6 sm:p-7">
                        <div className="mb-6">
                            <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                                Demo Only
                            </div>
                            <h3 className="mt-3 text-2xl font-bold text-slate-900">Demo card checkout</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Enter demo card details below. This page simulates the transport payment step and does not process real money.
                            </p>
                        </div>

                        {/* Demo Card Visual */}
                        <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 p-6 text-white shadow-[0_24px_48px_rgba(15,23,42,0.22)]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                                    UniLife Demo Gateway
                                </div>
                                <CreditCard size={20} strokeWidth={2.2} className="text-white/80" />
                            </div>
                            <div className="mt-8 text-2xl font-black tracking-[0.18em] sm:text-3xl">
                                {form.cardNumber || "1234 5678 9012 3456"}
                            </div>
                            <div className="mt-8 flex items-end justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Cardholder</div>
                                    <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-white">
                                        {form.cardName || user?.fullName || "Cardholder Name"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Expiry / CVV</div>
                                    <div className="mt-2 text-sm font-semibold tracking-[0.16em] text-white">
                                        {form.expiry || "MM/YY"}  {form.cvv || "CVV"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 sm:p-7">
                        <form className="space-y-6" onSubmit={handlePay}>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Receipt Details</div>
                                <div className="mt-4">
                                    <FieldLabel icon={Mail}>Receipt email</FieldLabel>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="student@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                    />
                                    {validation.email && <p className="mt-2 text-xs text-rose-600">{validation.email}</p>}
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Card Details</div>
                                <div className="mt-4 space-y-5">
                                    <div>
                                        <FieldLabel icon={CreditCard}>Cardholder name</FieldLabel>
                                        <input
                                            className="input"
                                            placeholder="Your Name"
                                            value={form.cardName}
                                            onChange={(e) => setForm((prev) => ({ ...prev, cardName: e.target.value }))}
                                        />
                                        {validation.cardName && <p className="mt-2 text-xs text-rose-600">{validation.cardName}</p>}
                                    </div>
                                    <div>
                                        <FieldLabel icon={CreditCard}>Card number</FieldLabel>
                                        <input
                                            className="input"
                                            inputMode="numeric"
                                            placeholder="1234 5678 9012 3456"
                                            value={form.cardNumber}
                                            onChange={(e) => setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                                        />
                                        {validation.cardNumber && <p className="mt-2 text-xs text-rose-600">{validation.cardNumber}</p>}
                                    </div>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div>
                                            <FieldLabel icon={CalendarDays}>Expiry</FieldLabel>
                                            <input
                                                className="input"
                                                inputMode="numeric"
                                                placeholder="MM/YY"
                                                value={form.expiry}
                                                onChange={(e) => setForm((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                                            />
                                            {validation.expiry && <p className="mt-2 text-xs text-rose-600">{validation.expiry}</p>}
                                        </div>
                                        <div>
                                            <FieldLabel icon={LockKeyhole}>CVV</FieldLabel>
                                            <input
                                                className="input"
                                                inputMode="numeric"
                                                placeholder="123"
                                                value={form.cvv}
                                                onChange={(e) => setForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                                            />
                                            {validation.cvv && <p className="mt-2 text-xs text-rose-600">{validation.cvv}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                <div className="font-semibold text-slate-900">Demo gateway note</div>
                                <div className="mt-2">
                                    Use any dummy 16-digit card number, a valid future expiry date, and a 3-digit CVV.
                                    This checkout exists only for your final project demo.
                                </div>
                            </div>

                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={form.agree}
                                    onChange={(e) => setForm((prev) => ({ ...prev, agree: e.target.checked }))}
                                />
                                <span>
                                    I understand this is a demo payment gateway for academic use only and no real financial transaction will be processed.
                                </span>
                            </label>
                            {validation.agree && <p className="-mt-2 text-xs text-rose-600">{validation.agree}</p>}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link to="/student/transport/bookings" className="btn-secondary flex-1 text-center">
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                    disabled={processing || !canSubmit}
                                >
                                    {processing ? "Processing..." : `Pay Rs. ${(booking.totalPrice || 0).toLocaleString()}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right - Booking Summary */}
                <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                    <div className="card p-6">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Payment Summary
                        </div>
                        <h4 className="mt-2 text-xl font-bold text-slate-900">Transport booking checkout</h4>

                        <div className="mt-5 space-y-4">
                            {/* Route */}
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Bus size={16} strokeWidth={2.2} className="text-slate-400" />
                                    Route
                                </div>
                                <div className="mt-2 font-semibold text-slate-900">
                                    {listing?.startLocation?.name || "—"} → {listing?.destination?.name || "—"}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                    {listing?.vehicleType || "—"} · Departure {listing?.departureTime || "—"}
                                </div>
                            </div>

                            {/* Pickup & Dropoff */}
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                        <MapPin size={12} /> Pickup
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{booking.pickupStop?.name || "—"}</div>
                                </div>
                                <div className="rounded-2xl bg-rose-50 p-4">
                                    <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                                        <MapPin size={12} /> Drop-off
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{booking.dropoffStop?.name || "—"}</div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid gap-3 grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={12} /> Journey Date</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">
                                        {booking.journeyDate ? new Date(booking.journeyDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="text-xs text-slate-500 flex items-center gap-1"><Users size={12} /> Passengers</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{booking.passengers}</div>
                                </div>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center">
                            <div className="text-xs font-semibold uppercase text-emerald-600">Total Amount</div>
                            <div className="text-3xl font-black text-emerald-700 mt-1">
                                Rs. {(booking.totalPrice || 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-600">
                            <ShieldCheck size={14} /> Demo payment — no real money charged
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
