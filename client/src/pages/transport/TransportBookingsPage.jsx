import {
    Bus,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    MapPin,
    Users,
    Wallet,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getManagerBookingsApi } from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusStyles = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-rose-100 text-rose-700",
};

export default function TransportBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data } = await getManagerBookingsApi();
                setBookings(data.bookings || []);
            } catch (error) {
                toast.error(error?.response?.data?.message || "Failed to load bookings");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const stats = useMemo(() => {
        const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
        const totalRevenue = confirmed.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        return {
            total: bookings.length,
            pending: bookings.filter((b) => b.status === "PENDING").length,
            confirmed: confirmed.length,
            cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
            totalRevenue,
        };
    }, [bookings]);

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport Manager"
                title="Bookings & Payments"
                description="View all passenger bookings across your routes and track payment status."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total bookings" value={stats.total} tone="indigo" icon={Users} />
                <StatCard title="Pending" value={stats.pending} tone="amber" icon={Clock3} />
                <StatCard title="Confirmed" value={stats.confirmed} tone="emerald" icon={CheckCircle2} />
                <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue)} tone="blue" icon={Wallet} />
            </div>

            {loading ? (
                <LoadingState title="Loading bookings" description="Fetching passenger bookings and payment records." />
            ) : bookings.length === 0 ? (
                <EmptyState
                    icon="🚌"
                    tone="indigo"
                    title="No bookings yet"
                    description="Students will appear here once they book seats on your routes."
                />
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="text-lg font-bold text-slate-900">
                                        {booking.pickupStop?.name || "Pickup"} → {booking.dropoffStop?.name || "Dropoff"}
                                    </h4>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays size={14} />
                                            {booking.journeyDate}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users size={14} />
                                            {booking.passengers} passenger{booking.passengers > 1 ? "s" : ""}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Bus size={14} />
                                            {booking.listingId?.vehicleType || "—"}
                                        </span>
                                        {booking.listingId?.departureTime && (
                                            <span className="flex items-center gap-1">
                                                <Clock3 size={14} />
                                                {booking.listingId.departureTime}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[booking.status] || "bg-slate-100 text-slate-600"}`}>
                                    {booking.status}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-slate-50 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passenger</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">
                                        {booking.studentId?.fullName || "Unknown"}
                                    </div>
                                    <div className="text-xs text-slate-500">{booking.studentId?.email || ""}</div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(booking.totalPrice)}</div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900">
                                        {booking.paymentRef ? (
                                            <span className="flex items-center gap-1 text-emerald-700">
                                                <CreditCard size={14} /> {booking.paymentRef}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">Unpaid</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
