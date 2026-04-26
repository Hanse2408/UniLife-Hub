import {
    ArrowRight,
    Clock,
    CalendarCheck,
    Wallet,
    Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Meka oyage Spring Boot backend ekata connect wena client.js eke APIs walata wenas karanna
import {
    getStudentFacilityCartApi,
    updateStudentFacilityCartItemApi,
    removeStudentFacilityCartItemApi,
} from "../../api/client";

import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export default function FacilityBookingCartPage() {
    const navigate = useNavigate();
    const [cart, setCart] = useState({ items: [], totals: { subtotal: 0, serviceFee: 0, total: 0 } });
    const [loading, setLoading] = useState(true);
    const [actingCartItemId, setActingCartItemId] = useState("");

    const loadCart = async () => {
        try {
            setLoading(true);
            const { data } = await getStudentFacilityCartApi();
            setCart({
                items: data.items || [],
                totals: data.totals || { subtotal: 0, serviceFee: 0, total: 0 },
            });
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load booking cart");
            setCart({ items: [], totals: { subtotal: 0, serviceFee: 0, total: 0 } });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
    }, []);

    // Facilities waladi quantity eka 'hours' widiyata consider karamu
    const updateDuration = async (cartItemId, hours) => {
        try {
            setActingCartItemId(cartItemId);
            if (hours <= 0) {
                await removeStudentFacilityCartItemApi(cartItemId);
                toast.success("Facility removed from booking list");
            } else {
                await updateStudentFacilityCartItemApi(cartItemId, { durationHours: hours });
            }
            await loadCart();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update booking duration");
        } finally {
            setActingCartItemId("");
        }
    };

    const stats = useMemo(() => {
        const totalHours = cart.items.reduce((sum, item) => sum + Number(item.durationHours || 0), 0);

        return {
            lineItems: cart.items.length,
            totalHours,
        };
    }, [cart.items]);

    const handleProceedToPayment = () => {
        if (cart.items.length === 0) {
            toast.error("Your booking list is empty");
            return;
        }
        navigate("/student/facilities/payment");
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Facilities"
                title="Pending Bookings"
                description="Review your selected facilities, adjust booking hours, and see the total before confirmation."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Facilities Selected" value={stats.lineItems} tone="indigo" icon={CalendarCheck} />
                <StatCard title="Total Reserved Hours" value={stats.totalHours} tone="amber" icon={Clock} />
                <StatCard title="Amount Due" value={formatCurrency(cart.totals.total)} tone="emerald" icon={Wallet} />
            </div>

            {loading ? (
                <LoadingState
                    title="Loading your booking list"
                    description="Calculating hourly rates, service fees, and checking availability."
                />
            ) : cart.items.length === 0 ? (
                <EmptyState
                    icon="🏢"
                    title="Your booking list is empty"
                    description="Browse campus facilities and select spaces before proceeding to checkout."
                    tone="indigo"
                    action={
                        <Link to="/student/facilities/browse" className="btn-primary">
                            Browse Facilities
                        </Link>
                    }
                />
            ) : (
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    <div className="card p-6">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Reserved Spaces</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    Adjust your booking duration (hours) here before moving to payment.
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
                                        <div className="h-24 overflow-hidden rounded-2xl bg-white relative">
                                            <img
                                                src={item.image_url || FALLBACK_IMAGE}
                                                alt={item.facilityName}
                                                className="h-full w-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.src = FALLBACK_IMAGE;
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <div className="font-semibold text-slate-900">{item.facilityName}</div>
                                            <div className="mt-1 text-sm text-slate-500">Date: {item.bookingDate || "Pending Schedule"}</div>
                                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                                                <span>{formatCurrency(item.hourlyRate)} / hour</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-semibold text-slate-900">
                                                    Subtotal: {formatCurrency(Number(item.hourlyRate || 0) * Number(item.durationHours || 0))}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => updateDuration(item.cart_id, item.durationHours - 1)}
                                                disabled={actingCartItemId === item.cart_id}
                                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {item.durationHours <= 1 ? <Trash2 size={16} className="text-rose-500" /> : "-"}
                                            </button>

                                            <span className="w-16 text-center text-sm font-semibold">
                                                {item.durationHours} {item.durationHours === 1 ? "hr" : "hrs"}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => updateDuration(item.cart_id, item.durationHours + 1)}
                                                disabled={actingCartItemId === item.cart_id}
                                                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                            <h4 className="text-xl font-bold text-slate-900">Booking Summary</h4>

                            <div className="mt-5 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Facilities</span>
                                    <span className="font-medium text-slate-900">{stats.lineItems}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(cart.totals.subtotal)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Service/Cleaning Fee</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(cart.totals.serviceFee)}</span>
                                </div>

                                <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                                    <span className="font-semibold text-slate-900">Total Amount</span>
                                    <span className="font-black text-slate-900">{formatCurrency(cart.totals.total)}</span>
                                </div>
                            </div>

                            <button
                                className="btn-primary mt-5 w-full bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                                disabled={cart.items.length === 0}
                                onClick={handleProceedToPayment}
                            >
                                Confirm & Pay <ArrowRight size={16} strokeWidth={2.2} />
                            </button>
                        </div>

                        <div className="card p-6">
                            <h4 className="text-lg font-bold text-slate-900">Before you confirm</h4>
                            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">Review your booking hours and dates one more time to avoid conflicts.</div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">Use any valid-looking dummy card details in the PayHere demo gateway.</div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">After payment, your reservation will move directly to the facility management queue.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}