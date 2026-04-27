import {
    AlertTriangle,
    Bus,
    CalendarDays,
    Clock3,
    MapPin,
    Search,
    Star,
    Ticket,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import EmptyState from "../../components/common/EmptyState";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    browseTransportListingsApi,
    getMyTransportBookingsApi,
    getCurrentTripPlanApi,
    initTripPlanApi,
} from "../../api/client";

export default function StudentTransportHubPage() {
    const [listings, setListings] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [budgetExceeded, setBudgetExceeded] = useState(false);
    const [showBudgetPopup, setShowBudgetPopup] = useState(false);
    const [tripPlanTotal, setTripPlanTotal] = useState(0);
    const [tripPlanBudget, setTripPlanBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState("");
    const [budgetSaving, setBudgetSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [listRes, bookRes, planRes] = await Promise.allSettled([
                browseTransportListingsApi(),
                getMyTransportBookingsApi(),
                getCurrentTripPlanApi(),
            ]);
            if (listRes.status === "fulfilled") setListings(listRes.value.data.listings || []);
            if (bookRes.status === "fulfilled") setBookings(bookRes.value.data.bookings || []);
            if (planRes.status === "fulfilled") {
                const exceeded = planRes.value.data.budgetExceeded;
                setBudgetExceeded(!!exceeded);
                if (exceeded) setShowBudgetPopup(true);
                setTripPlanTotal(planRes.value.data.totalPlanned || 0);
                setTripPlanBudget(planRes.value.data.plan?.weeklyBudget || 0);
                setBudgetInput(String(planRes.value.data.plan?.weeklyBudget || ""));
            }
        } catch {
            toast.error("Failed to load transport data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleUpdateBudget = async () => {
        if (!budgetInput || Number(budgetInput) <= 0) { toast.error("Enter a valid budget"); return; }
        try {
            setBudgetSaving(true);
            const { data } = await initTripPlanApi({ weeklyBudget: Number(budgetInput) });
            setTripPlanBudget(data.plan?.weeklyBudget || 0);
            // Re-check budget status
            const planRes = await getCurrentTripPlanApi();
            const exceeded = planRes.data.budgetExceeded;
            setBudgetExceeded(!!exceeded);
            setTripPlanTotal(planRes.data.totalPlanned || 0);
            if (!exceeded) setShowBudgetPopup(false);
            toast.success("Budget updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update budget");
        } finally {
            setBudgetSaving(false);
        }
    };

    const totalRoutes = listings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
    const totalSpent = bookings
        .filter((b) => b.status === "CONFIRMED")
        .reduce((s, b) => s + (b.totalPrice || 0), 0);

    const FREQ_LABEL = { DAILY: "Daily", WEEKDAYS_ONLY: "Weekdays", WEEKENDS_ONLY: "Weekends", SPECIFIC_DATES: "Specific Dates" };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Portal"
                title="Transport Hub"
                description="Browse bus and van routes, book trips, and plan your weekly commute."
                backgroundImage={dashboardBanner}
            />

            {/* Budget Exceeded Popup */}
            {showBudgetPopup && budgetExceeded && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                                <AlertTriangle size={32} className="text-rose-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Weekly Budget Exceeded!</h3>
                            <p className="mt-2 text-sm text-slate-600">
                                Your planned trips total <span className="font-bold text-rose-600">Rs. {tripPlanTotal.toLocaleString()}</span> which
                                exceeds your weekly budget of <span className="font-bold">Rs. {tripPlanBudget.toLocaleString()}</span>.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Please increase your budget or go to Trip Planner to reschedule lower-cost routes.
                            </p>

                            <div className="mt-5 flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    className="input flex-1"
                                    placeholder="New budget (Rs.)"
                                />
                                <button
                                    onClick={handleUpdateBudget}
                                    disabled={budgetSaving}
                                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {budgetSaving ? "..." : "Update"}
                                </button>
                            </div>

                            <Link
                                to="/student/transport/trip-planner"
                                className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                Go to Trip Planner to reschedule →
                            </Link>

                            <div className="mt-2">
                                <button
                                    onClick={() => setShowBudgetPopup(false)}
                                    className="text-sm font-semibold text-slate-400 hover:text-slate-600"
                                >
                                    Dismiss for now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={Search}
                    title="Search Trips"
                    description="Find available transport by location and date."
                    to="/student/transport/search"
                />
                <QuickActionCard
                    icon={Ticket}
                    title="My Bookings"
                    description="View your confirmed trip bookings."
                    to="/student/transport/bookings"
                />
                <QuickActionCard
                    icon={CalendarDays}
                    title="Trip Planner"
                    description="Plan your weekly commute schedule."
                    to="/student/transport/trip-planner"
                />
                <QuickActionCard
                    icon={Star}
                    title="Favorite Locations"
                    description="Manage your saved pickup spots."
                    to="/student/transport/favorites"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={Bus}
                    title="Available Routes"
                    value={totalRoutes}
                    tone="indigo"
                />
                <StatCard
                    icon={Ticket}
                    title="Your Bookings"
                    value={confirmedBookings}
                    tone="emerald"
                />
                <StatCard
                    icon={Wallet}
                    title="Total Spent"
                    value={`Rs. ${totalSpent.toLocaleString()}`}
                    tone="amber"
                />
            </div>

            {/* Browse Routes */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Available Routes</h3>
                        <p className="text-sm text-slate-500">Browse transport listings published by agents.</p>
                    </div>
                    <Link
                        to="/student/transport/search"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                        <Search size={14} /> Search
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    </div>
                ) : listings.length === 0 ? (
                    <EmptyState
                        icon="🚌"
                        title="No routes available"
                        description="There are no approved transport routes yet. Check back later."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.slice(0, 6).map((listing) => (
                            <Link
                                key={listing._id}
                                to={`/student/transport/listing/${listing._id}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md transition"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${listing.vehicleType === "BUS" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                                        <Bus size={16} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{listing.vehicleType}</span>
                                    <span className="ml-auto text-xs font-semibold text-slate-400">{FREQ_LABEL[listing.frequency] || "Daily"}</span>
                                </div>

                                <div className="space-y-1.5 mb-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-slate-700 font-medium truncate">{listing.startLocation?.name}</span>
                                    </div>
                                    {listing.stops?.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 pl-1">
                                            <span>┈ {listing.stops.length} stop{listing.stops.length > 1 ? "s" : ""} ┈</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500"></div>
                                        <span className="text-slate-700 font-medium truncate">{listing.destination?.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Clock3 size={12} /> {listing.departureTime || "—"}</span>
                                    <span className="flex items-center gap-1"><MapPin size={12} /> {listing.totalDistanceKm?.toFixed(1)} km</span>
                                    <span className="font-bold text-emerald-700">Rs. {listing.priceRs}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {listings.length > 6 && (
                    <div className="mt-4 text-center">
                        <Link
                            to="/student/transport/search"
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            View all {listings.length} routes →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
