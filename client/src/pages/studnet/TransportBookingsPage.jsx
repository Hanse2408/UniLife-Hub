import {
    Bus,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Star,
    Ticket,
    Trash2,
    Users,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import EmptyState from "../../components/common/EmptyState";
import ReviewModal from "../../components/common/ReviewModal";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import { getMyTransportBookingsApi, clearTransportHistoryApi, checkReviewExistsApi, createReviewApi } from "../../api/client";

export default function TransportBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [reviewModalBookingId, setReviewModalBookingId] = useState(null);
    const [reviewedBookings, setReviewedBookings] = useState({});
    const [submittingReview, setSubmittingReview] = useState(false);

    const loadBookings = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await getMyTransportBookingsApi();
            const loaded = data.bookings || [];
            setBookings(loaded);
            const confirmed = loaded.filter((b) => b.status === "CONFIRMED");
            const checks = await Promise.allSettled(confirmed.map((b) => checkReviewExistsApi(b._id)));
            const reviewed = {};
            confirmed.forEach((b, i) => {
                if (checks[i].status === "fulfilled" && checks[i].value.data.hasReviewed) {
                    reviewed[b._id] = checks[i].value.data.review;
                }
            });
            setReviewedBookings(reviewed);
        } catch {
            toast.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSubmitBookingReview = async ({ rating, comment }) => {
        try {
            setSubmittingReview(true);
            await createReviewApi({ entityType: "TRANSPORT_BOOKING", entityId: reviewModalBookingId, rating, comment });
            toast.success("Review submitted!");
            const { data } = await checkReviewExistsApi(reviewModalBookingId);
            setReviewedBookings((prev) => ({ ...prev, [reviewModalBookingId]: data.review }));
            setReviewModalBookingId(null);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    useEffect(() => { loadBookings(); }, [loadBookings]);

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to clear your transport booking history? This will remove all confirmed and cancelled bookings.")) return;
        try {
            setClearing(true);
            const { data } = await clearTransportHistoryApi();
            toast.success(data.message || "History cleared");
            loadBookings();
        } catch {
            toast.error("Failed to clear history");
        } finally {
            setClearing(false);
        }
    };

    const hasHistory = bookings.some((b) => b.status === "CONFIRMED" || b.status === "CANCELLED");

    const statusColors = {
        CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
        CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport"
                title="My Bookings"
                description="View and manage your transport trip bookings."
                backgroundImage={dashboardBanner}
            />

            {/* Clear History Button */}
            {!loading && hasHistory && (
                <div className="flex justify-end">
                    <button
                        onClick={handleClearHistory}
                        disabled={clearing}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        {clearing ? "Clearing..." : "Clear History"}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                </div>
            ) : bookings.length === 0 ? (
                <EmptyState
                    icon="🎫"
                    title="No bookings yet"
                    description="Search for transport routes and book your first trip."
                    action={
                        <Link
                            to="/student/transport/search"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                        >
                            Search Trips
                        </Link>
                    }
                />
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => {
                        const listing = booking.listingId;
                        return (
                            <div key={booking._id} className="card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${listing?.vehicleType === "BUS" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                                                <Bus size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">
                                                    {listing?.startLocation?.name || "—"} → {listing?.destination?.name || "—"}
                                                </div>
                                                <div className="text-xs text-slate-500">{listing?.vehicleType || "—"}</div>
                                            </div>
                                            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusColors[booking.status] || "bg-slate-50 text-slate-600"}`}>
                                                {booking.status}
                                            </span>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-600 mt-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays size={14} className="text-slate-400" />
                                                <span>{booking.journeyDate ? new Date(booking.journeyDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock3 size={14} className="text-slate-400" />
                                                <span>{listing?.departureTime || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-slate-400" />
                                                <span>{booking.passengers} passenger{booking.passengers > 1 ? "s" : ""}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="text-slate-400" />
                                                <span className="font-bold text-emerald-700">Rs. {booking.totalPrice?.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} /> Pickup: <strong>{booking.pickupStop?.name || "—"}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} /> Drop-off: <strong>{booking.dropoffStop?.name || "—"}</strong>
                                            </span>
                                        </div>

                                        {booking.paymentRef && (
                                            <div className="mt-2 text-xs text-slate-400">
                                                Ref: {booking.paymentRef}
                                            </div>
                                        )}

                                        {booking.status === "PENDING" && (
                                            <div className="mt-3">
                                                <Link
                                                    to={`/student/transport/bookings/${booking._id}/pay`}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
                                                >
                                                    <Wallet size={14} /> Pay Now
                                                </Link>
                                            </div>
                                        )}

                                        {booking.status === "CONFIRMED" && (
                                            <div className="mt-3">
                                                {reviewedBookings[booking._id] ? (
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} size={14} className={s <= reviewedBookings[booking._id].rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                                                        ))}
                                                        <span className="ml-1 font-bold text-slate-700">{reviewedBookings[booking._id].rating}/5</span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setReviewModalBookingId(booking._id)}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition"
                                                    >
                                                        <Star size={14} /> Rate this trip
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ReviewModal
                open={!!reviewModalBookingId}
                onClose={() => setReviewModalBookingId(null)}
                onSubmit={handleSubmitBookingReview}
                title="Rate this transport trip"
                submitting={submittingReview}
            />
        </div>
    );
}
