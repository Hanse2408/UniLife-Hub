import {
    Building2,
    CalendarDays,
    ChevronLeft,
    CreditCard,
    LockKeyhole,
    Mail,
    MapPin,
    ReceiptText,
    ShieldCheck,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getBookingByIdApi,
    payBookingAmountApi,
} from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
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

function formatCurrency(amount) {
    return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString();
}

function FieldLabel({ icon: Icon, children }) {
    return (
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Icon size={16} strokeWidth={2.2} className="text-slate-400" />
            <span>{children}</span>
        </label>
    );
}

export default function BookingPaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [touched, setTouched] = useState({});

    const markTouched = (field) =>
        setTouched((prev) => ({ ...prev, [field]: true }));
    const showError = (field) => submitted || touched[field];

    const [form, setForm] = useState({
        cardName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
        email: "",
        agree: false,
    });

    const loadBooking = async () => {
        try {
            setLoading(true);
            const { data } = await getBookingByIdApi(id);
            setBooking(data.booking || null);
        } catch (error) {
            setBooking(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBooking();
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

        if (!form.cardName.trim() || form.cardName.trim().length < 3) {
            errors.cardName = "Cardholder name is required";
        }

        if (form.cardNumber.replace(/\s/g, "").length !== 16) {
            errors.cardNumber = "Card number must contain 16 digits";
        }

        if (!isValidExpiry(form.expiry)) {
            errors.expiry = "Enter a valid future expiry date";
        }

        if (!/^\d{3}$/.test(form.cvv)) {
            errors.cvv = "CVV must be 3 digits";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = "Enter a valid email address";
        }

        if (!form.agree) {
            errors.agree = "You must confirm this is a demo payment";
        }

        return errors;
    }, [form]);

    const canSubmit = Object.keys(validation).length === 0;
    const amountDueNow = booking?.totalBookingAmount || booking?.keyMoneyAmount || booking?.rentAmount || 0;
    const paymentTypeLabel = booking?.keyMoneyAmount > 0 ? "Key Money" : "First Month Rent";

    const handlePay = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!canSubmit || !booking) {
            toast.error("Please complete all payment fields correctly");
            return;
        }

        try {
            setProcessing(true);

            await payBookingAmountApi(booking._id);

            toast.success("Payment successful. Booking confirmed.");
            navigate("/student/payments");
        } catch (error) {
            toast.error(
                error?.response?.data?.message || "Payment failed. Please try again."
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <LoadingState
                title="Loading payment gateway"
                description="Preparing your booking summary, demo checkout form, and payment validation."
            />
        );
    }

    if (!booking) {
        return (
            <EmptyState
                icon="💳"
                tone="amber"
                title="Booking not found"
                description="We could not load this booking payment page."
                action={
                    <Link to="/student/bookings" className="btn-primary">
                        Back to bookings
                    </Link>
                }
            />
        );
    }

    if (!["PAYMENT_PENDING", "APPROVED"].includes(booking.status)) {
        return (
            <EmptyState
                icon="🔒"
                tone="slate"
                title="Payment not available"
                description="This booking is not currently waiting for payment."
                action={
                    <Link to="/student/bookings" className="btn-primary">
                        Back to bookings
                    </Link>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Booking Payment"
                title="Complete Your Booking Payment"
                description="Confirm your booking and complete the payment to secure your accommodation."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                    <div className="card p-6 sm:p-7">
                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                                    Demo Only
                                </div>
                                <h3 className="mt-3 text-2xl font-bold text-slate-900">Demo card checkout</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Enter demo card details below. This page simulates the booking payment step and does not process real money.
                                </p>
                            </div>

                            <StatusBadge value={booking.status} />
                        </div>

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
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                                        Cardholder
                                    </div>
                                    <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-white">
                                        {form.cardName || user?.fullName || "Cardholder Name"}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                                        Expiry / CVV
                                    </div>
                                    <div className="mt-2 text-sm font-semibold tracking-[0.16em] text-white">
                                        {form.expiry || "MM/YY"}  {form.cvv || "CVV"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 sm:p-7">
                        <form className="space-y-5" onSubmit={handlePay}>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Receipt Details
                                </div>
                                <div className="mt-4">
                                    <FieldLabel icon={Mail}>Receipt email</FieldLabel>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="student@example.com"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, email: e.target.value }))
                                        }
                                        onBlur={() => markTouched("email")}
                                    />
                                    {showError("email") && validation.email ? (
                                        <p className="mt-2 text-xs text-rose-600">{validation.email}</p>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Card Details
                                </div>

                                <div className="mt-4 space-y-4">
                                    <div>
                                        <FieldLabel icon={CreditCard}>Cardholder name</FieldLabel>
                                        <input
                                            className="input"
                                            placeholder="Narada Weera"
                                            value={form.cardName}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, cardName: e.target.value }))
                                            }
                                            onBlur={() => markTouched("cardName")}
                                        />
                                        {showError("cardName") && validation.cardName ? (
                                            <p className="mt-2 text-xs text-rose-600">{validation.cardName}</p>
                                        ) : null}
                                    </div>

                                    <div>
                                        <FieldLabel icon={CreditCard}>Card number</FieldLabel>
                                        <div className="relative">
                                            <input
                                                className="input pr-20 font-mono tracking-[0.14em]"
                                                inputMode="numeric"
                                                placeholder="1234 5678 9012 3456"
                                                maxLength={19}
                                                value={form.cardNumber}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        cardNumber: formatCardNumber(e.target.value),
                                                    }))
                                                }
                                                onBlur={() => markTouched("cardNumber")}
                                            />
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Demo
                                                </span>
                                            </div>
                                        </div>
                                        {showError("cardNumber") && validation.cardNumber ? (
                                            <p className="mt-2 text-xs text-rose-600">{validation.cardNumber}</p>
                                        ) : null}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <FieldLabel icon={CalendarDays}>Expiry</FieldLabel>
                                            <input
                                                className="input text-center font-mono tracking-[0.2em]"
                                                inputMode="numeric"
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                value={form.expiry}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        expiry: formatExpiry(e.target.value),
                                                    }))
                                                }
                                                onBlur={() => markTouched("expiry")}
                                            />
                                            {showError("expiry") && validation.expiry ? (
                                                <p className="mt-2 text-xs text-rose-600">{validation.expiry}</p>
                                            ) : null}
                                        </div>

                                        <div>
                                            <FieldLabel icon={LockKeyhole}>CVV</FieldLabel>
                                            <input
                                                className="input text-center font-mono tracking-[0.3em]"
                                                inputMode="numeric"
                                                placeholder="•••"
                                                maxLength={3}
                                                value={form.cvv}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        cvv: e.target.value.replace(/\D/g, "").slice(0, 3),
                                                    }))
                                                }
                                                onBlur={() => markTouched("cvv")}
                                            />
                                            {showError("cvv") && validation.cvv ? (
                                                <p className="mt-2 text-xs text-rose-600">{validation.cvv}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                                <span className="font-semibold text-slate-700">Demo note:</span> Use any 16-digit number, a future expiry, and a 3-digit CVV.
                            </div>

                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={form.agree}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, agree: e.target.checked }))
                                    }
                                />
                                <span>
                                    I understand this is a demo payment gateway for academic use only and no real financial transaction will be processed.
                                </span>
                            </label>
                            {submitted && validation.agree ? (
                                <p className="-mt-2 text-xs text-rose-600">{validation.agree}</p>
                            ) : null}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link to="/student/bookings" className="btn-secondary flex-1">
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={processing}
                                >
                                    <LockKeyhole size={15} strokeWidth={2.2} />
                                    {processing ? "Processing..." : `Pay ${formatCurrency(amountDueNow)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                    <div className="card p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Payment Summary
                                </div>
                                <h4 className="mt-2 text-xl font-bold text-slate-900">Booking checkout</h4>
                            </div>
                            <StatusBadge value={booking.status} />
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Building2 size={16} strokeWidth={2.2} className="text-slate-400" />
                                    Listing
                                </div>
                                <div className="mt-2 font-semibold text-slate-900">
                                    {booking.listingId?.title || "Accommodation listing"}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <MapPin size={14} strokeWidth={2.2} />
                                    <span>
                                        {booking.listingId?.location?.city || "Unknown city"} / {booking.listingId?.location?.area || "Unknown area"}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="text-sm text-slate-500">Move-in date</div>
                                    <div className="mt-1 font-semibold text-slate-900">
                                        {formatDate(booking.moveInDate)}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="text-sm text-slate-500">Monthly rent</div>
                                    <div className="mt-1 font-semibold text-slate-900">
                                        {formatCurrency(booking.rentAmount)}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm text-slate-500">Payment type</div>
                                <div className="mt-1 font-semibold text-slate-900">{paymentTypeLabel}</div>
                                {booking.keyMoneyAmount > 0 ? (
                                    <div className="mt-2 text-xs leading-5 text-slate-500">
                                        This property requires key money upfront. Monthly rent of {formatCurrency(booking.rentAmount)} will be billed from 30 days after move-in.
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-2xl bg-indigo-50 p-4">
                                <div className="text-sm text-indigo-600">Amount to pay now</div>
                                <div className="mt-1 text-2xl font-black tracking-tight text-indigo-700">
                                    {formatCurrency(amountDueNow)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <ShieldCheck size={16} strokeWidth={2.2} className="text-emerald-500" />
                            What happens after payment?
                        </div>

                        <div className="mt-4 space-y-2.5">
                            {[
                                "Your booking becomes confirmed",
                                "You are added to a housing group",
                                "Rent billing scheduled 30 days after move-in",
                                "Payment reminders appear in your dashboard",
                            ].map((text, i) => (
                                <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm leading-6 text-slate-600">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                        {i + 1}
                                    </span>
                                    {text}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-900">
                        <div className="flex items-center gap-2 font-semibold">
                            <ReceiptText size={16} strokeWidth={2.2} />
                            Student-friendly demo note
                        </div>
                        <div className="mt-2">
                            This page is designed to behave like a real checkout so your accommodation flow feels complete in the project demo, while still remaining safe for testing.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
