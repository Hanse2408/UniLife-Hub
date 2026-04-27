import {
    ArrowRight,
    Bike,
    Bus,
    CalendarDays,
    Car,
    CircleDollarSign,
    Clock,
    MapPin,
    Navigation,
    PiggyBank,
    Plus,
    Receipt,
    Route,
    Sunrise,
    Sunset,
    Train,
    TrendingUp,
    Wallet,
    X,
    AlertTriangle,
    RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    getCurrentTripPlanApi,
    initTripPlanApi,
    setTripSlotApi,
    clearTripSlotApi,
    getTripPricingApi,
} from "../../api/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["morning", "evening"];
const SLOT_ICONS = { morning: <Sunrise size={14} />, evening: <Sunset size={14} /> };
const SLOT_LABELS = { morning: "Morning", evening: "Evening" };

const MODE_ICONS = {
    BUS: <Bus size={16} />,
    VAN: <Car size={16} />,
    THREE_WHEELER: <Bike size={16} />,
    TRAIN: <Train size={16} />,
};
const MODE_ICONS_LG = {
    BUS: <Bus size={22} />,
    VAN: <Car size={22} />,
    THREE_WHEELER: <Bike size={22} />,
    TRAIN: <Train size={22} />,
};
const MODE_LABELS = {
    BUS: "Bus",
    VAN: "Van",
    THREE_WHEELER: "Three Wheeler",
    TRAIN: "Train",
};
const MODE_COLORS = {
    BUS: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-400", ring: "ring-blue-200", accent: "bg-blue-100" },
    VAN: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-400", ring: "ring-violet-200", accent: "bg-violet-100" },
    THREE_WHEELER: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400", ring: "ring-amber-200", accent: "bg-amber-100" },
    TRAIN: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-400", ring: "ring-teal-200", accent: "bg-teal-100" },
};

function formatCurrency(amount) {
    return `Rs. ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Distance between two lat/lng (Haversine formula)
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Debounced Nominatim search
async function searchNominatim(query) {
    if (!query || query.length < 3) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&limit=5&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
    }));
}

export default function TransportTripPlannerPage() {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [budgetExceeded, setBudgetExceeded] = useState(false);

    // Budget setup
    const [budgetInput, setBudgetInput] = useState("");
    const [initSaving, setInitSaving] = useState(false);

    // Pricing info from backend
    const [pricingInfo, setPricingInfo] = useState(null);

    // Trip slot modal
    const [modal, setModal] = useState(null); // { day, slot }
    const [slotSaving, setSlotSaving] = useState(null);

    // Modal form state
    const [modalMode, setModalMode] = useState("BUS");
    const [pickupQuery, setPickupQuery] = useState("");
    const [dropoffQuery, setDropoffQuery] = useState("");
    const [pickupResults, setPickupResults] = useState([]);
    const [dropoffResults, setDropoffResults] = useState([]);
    const [selectedPickup, setSelectedPickup] = useState(null);
    const [selectedDropoff, setSelectedDropoff] = useState(null);
    const [addReturn, setAddReturn] = useState(false);

    // Debounce refs
    const pickupTimer = useRef(null);
    const dropoffTimer = useRef(null);

    // Budget exceeded popup
    const [showBudgetPopup, setShowBudgetPopup] = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [planRes, pricingRes] = await Promise.allSettled([
                getCurrentTripPlanApi(),
                getTripPricingApi(),
            ]);

            if (planRes.status === "fulfilled") {
                const p = planRes.value.data.plan;
                setPlan(p || null);
                if (p?.weeklyBudget) setBudgetInput(String(p.weeklyBudget));
                const exceeded = planRes.value.data.budgetExceeded;
                setBudgetExceeded(!!exceeded);
                if (exceeded) setShowBudgetPopup(true);
            }
            if (pricingRes.status === "fulfilled") {
                setPricingInfo(pricingRes.value.data);
            }
        } catch {
            toast.error("Failed to load trip planner");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Computed totals
    const totalCost = useMemo(() => {
        if (!plan?.tripSlots?.length) return 0;
        return plan.tripSlots.reduce((sum, day) =>
            sum + SLOTS.reduce((s, slot) => s + Number(day.trips?.[slot]?.priceRs || 0), 0), 0);
    }, [plan]);

    const filledSlots = useMemo(() => {
        if (!plan?.tripSlots?.length) return 0;
        return plan.tripSlots.reduce((sum, day) =>
            sum + SLOTS.filter((slot) => day.trips?.[slot]?.pickupLocation?.name).length, 0);
    }, [plan]);

    const weeklyBudget = plan?.weeklyBudget || 0;
    const budgetPercent = weeklyBudget > 0 ? Math.min(100, Math.round((totalCost / weeklyBudget) * 100)) : 0;
    const remaining = weeklyBudget - totalCost;
    const isOverBudget = weeklyBudget > 0 && totalCost > weeklyBudget;
    const coveragePercent = Math.round((filledSlots / (DAYS.length * SLOTS.length)) * 100);

    // Fee calculation (local preview)
    const calculatedDistance = useMemo(() => {
        if (!selectedPickup || !selectedDropoff) return 0;
        return haversineKm(selectedPickup.lat, selectedPickup.lng, selectedDropoff.lat, selectedDropoff.lng);
    }, [selectedPickup, selectedDropoff]);

    const calculatedFee = useMemo(() => {
        if (!pricingInfo || calculatedDistance <= 0) return 0;
        const base = pricingInfo.baseFare?.[modalMode] || 30;
        const perKm = pricingInfo.pricePerKm?.[modalMode] || 10;
        return Math.round(base + perKm * calculatedDistance);
    }, [pricingInfo, modalMode, calculatedDistance]);

    // Pickup search with debounce
    useEffect(() => {
        if (pickupTimer.current) clearTimeout(pickupTimer.current);
        if (!pickupQuery || pickupQuery.length < 3) { setPickupResults([]); return; }
        pickupTimer.current = setTimeout(async () => {
            const results = await searchNominatim(pickupQuery);
            setPickupResults(results);
        }, 400);
        return () => { if (pickupTimer.current) clearTimeout(pickupTimer.current); };
    }, [pickupQuery]);

    // Dropoff search with debounce
    useEffect(() => {
        if (dropoffTimer.current) clearTimeout(dropoffTimer.current);
        if (!dropoffQuery || dropoffQuery.length < 3) { setDropoffResults([]); return; }
        dropoffTimer.current = setTimeout(async () => {
            const results = await searchNominatim(dropoffQuery);
            setDropoffResults(results);
        }, 400);
        return () => { if (dropoffTimer.current) clearTimeout(dropoffTimer.current); };
    }, [dropoffQuery]);

    // Handlers
    const handleInitPlan = async (e) => {
        e.preventDefault();
        if (!budgetInput || Number(budgetInput) <= 0) { toast.error("Enter a valid weekly budget"); return; }
        try {
            setInitSaving(true);
            const { data } = await initTripPlanApi({ weeklyBudget: Number(budgetInput) });
            setPlan(data.plan);
            toast.success("Weekly trip plan started!");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to set up trip plan");
        } finally {
            setInitSaving(false);
        }
    };

    const handleUpdateBudget = async () => {
        if (!budgetInput || Number(budgetInput) <= 0) { toast.error("Enter a valid budget"); return; }
        try {
            setInitSaving(true);
            const { data } = await initTripPlanApi({ weeklyBudget: Number(budgetInput) });
            setPlan(data.plan);
            const exceeded = data.budgetExceeded;
            setBudgetExceeded(!!exceeded);
            if (!exceeded) setShowBudgetPopup(false);
            toast.success("Budget updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update budget");
        } finally {
            setInitSaving(false);
        }
    };

    const openModal = (day, slot) => {
        setModal({ day, slot });
        setModalMode("BUS");
        setPickupQuery("");
        setDropoffQuery("");
        setPickupResults([]);
        setDropoffResults([]);
        setSelectedPickup(null);
        setSelectedDropoff(null);
        setAddReturn(slot === "morning");
    };

    const handleAddTrip = async () => {
        if (!modal || !selectedPickup || !selectedDropoff) {
            toast.error("Please select both pickup and dropoff locations");
            return;
        }
        const { day, slot } = modal;
        const key = `${day}-${slot}`;

        try {
            setSlotSaving(key);
            const { data } = await setTripSlotApi({
                day,
                slot,
                transportMode: modalMode,
                pickupLocation: selectedPickup,
                dropoffLocation: selectedDropoff,
                distanceKm: calculatedDistance,
                addReturn: addReturn && slot === "morning",
            });
            setPlan(data.plan);
            setBudgetExceeded(!!data.budgetExceeded);

            if (data.budgetExceeded) {
                setShowBudgetPopup(true);
            } else {
                toast.success(`Trip added to ${day} ${SLOT_LABELS[slot]}`);
                if (addReturn && slot === "morning") {
                    toast.success(`Return trip auto-added to ${day} Evening`);
                }
            }
            setModal(null);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to set trip");
        } finally {
            setSlotSaving(null);
        }
    };

    const handleClearSlot = async (day, slot) => {
        try {
            setSlotSaving(`${day}-${slot}`);
            const { data } = await clearTripSlotApi({ day, slot });
            setPlan(data.plan);
            setBudgetExceeded(!!data.budgetExceeded);
            if (!data.budgetExceeded) setShowBudgetPopup(false);
            toast.success("Trip removed");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to clear");
        } finally {
            setSlotSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
        );
    }

    // No plan yet — setup screen
    if (!plan) {
        return (
            <div className="space-y-6">
                <PageHero
                    eyebrow="Transport"
                    title="Trip Planner"
                    description="Plan your weekly commute by scheduling morning and evening trips."
                    backgroundImage={dashboardBanner}
                />

                <div className="card mx-auto max-w-lg p-8">
                    <div className="text-center mb-6">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
                            🗓️
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Set Up Weekly Trip Plan</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Enter your weekly transport budget to start planning trips.
                        </p>
                    </div>

                    <form onSubmit={handleInitPlan} className="space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Weekly Transport Budget (Rs.)</label>
                            <input
                                type="number"
                                min="1"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                placeholder="e.g. 5000"
                                className="input mt-1.5 w-full"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={initSaving}
                            className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {initSaving ? "Setting up..." : "Start Trip Plan"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport"
                title="Trip Planner"
                description="Plan your weekly commute by scheduling morning and evening trips."
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
                                Your planned trips total <span className="font-bold text-rose-600">{formatCurrency(totalCost)}</span> which
                                exceeds your weekly budget of <span className="font-bold">{formatCurrency(weeklyBudget)}</span>.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Please increase your budget or reschedule to a lower-cost route to dismiss this warning.
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
                                    disabled={initSaving}
                                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {initSaving ? "..." : "Update"}
                                </button>
                            </div>

                            <button
                                onClick={() => setShowBudgetPopup(false)}
                                className="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-700"
                            >
                                I'll reschedule my trips
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard icon={Wallet} title="Weekly Budget" value={formatCurrency(weeklyBudget)} tone="indigo" />
                <StatCard icon={Receipt} title="Planned Cost" value={formatCurrency(totalCost)} tone={isOverBudget ? "rose" : "emerald"} />
                <StatCard icon={PiggyBank} title="Remaining" value={formatCurrency(remaining)} tone={remaining < 0 ? "rose" : "sky"} />
                <StatCard icon={CalendarDays} title="Coverage" value={`${filledSlots}/${DAYS.length * SLOTS.length} (${coveragePercent}%)`} tone="amber" />
            </div>

            {/* Budget Usage Card */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <TrendingUp size={16} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">Budget Usage</h4>
                    </div>
                    <span className={`text-lg font-extrabold ${isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>
                        {budgetPercent}%
                    </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isOverBudget
                            ? "bg-gradient-to-r from-rose-400 to-rose-600"
                            : budgetPercent > 75
                                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            }`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
                    <span>Rs. 0</span>
                    <span>{formatCurrency(weeklyBudget)}</span>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <CircleDollarSign size={16} className="text-slate-400 shrink-0" />
                    <input
                        type="number"
                        min="1"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="input flex-1 text-sm"
                        placeholder="Weekly budget (Rs.)"
                    />
                    <button
                        onClick={handleUpdateBudget}
                        disabled={initSaving}
                        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap"
                    >
                        {initSaving ? "..." : "Update Budget"}
                    </button>
                </div>
            </div>

            {/* Transport Modes & Pricing Card */}
            {pricingInfo && (
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Route size={16} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">Transport Modes & Pricing</h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                        {pricingInfo.modes?.map((mode) => {
                            const c = MODE_COLORS[mode];
                            return (
                                <div key={mode} className={`rounded-xl border ${c.border} ${c.bg} p-4 text-center transition hover:shadow-md`}>
                                    <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${c.accent} ${c.text}`}>
                                        {MODE_ICONS_LG[mode]}
                                    </div>
                                    <div className={`text-sm font-bold ${c.text}`}>{MODE_LABELS[mode]}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Rs.{pricingInfo.baseFare[mode]} base + Rs.{pricingInfo.pricePerKm[mode]}/km
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Weekly Schedule Card */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <CalendarDays size={16} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">Weekly Schedule</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[520px]">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3 px-3 w-28 rounded-l-lg">Day</th>
                                {SLOTS.map((slot, i) => (
                                    <th key={slot} className={`text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3 px-2 ${i === SLOTS.length - 1 ? "rounded-r-lg" : ""}`}>
                                        <span className="inline-flex items-center gap-1.5">{SLOT_ICONS[slot]} {SLOT_LABELS[slot]}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {plan.tripSlots?.map((dayData, dayIdx) => (
                                <tr key={dayData.day} className={`border-t border-slate-100 ${dayIdx % 2 === 1 ? "bg-slate-50/30" : ""}`}>
                                    <td className="py-3 px-3 text-sm font-bold text-slate-700">{dayData.day}</td>
                                    {SLOTS.map((slot) => {
                                        const trip = dayData.trips?.[slot];
                                        const key = `${dayData.day}-${slot}`;
                                        const isSaving = slotSaving === key;
                                        const mc = trip?.transportMode ? MODE_COLORS[trip.transportMode] : null;

                                        return (
                                            <td key={slot} className="py-2 px-2">
                                                {isSaving ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
                                                    </div>
                                                ) : trip?.pickupLocation?.name ? (
                                                    <div className={`rounded-xl ${mc?.bg || "bg-indigo-50"} p-3 relative group border ${mc?.border || "border-transparent"} border-opacity-30 hover:shadow-md transition`}>
                                                        <button
                                                            onClick={() => handleClearSlot(dayData.day, slot)}
                                                            className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition shadow-sm"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <span className={`${mc?.text || "text-indigo-600"}`}>{MODE_ICONS[trip.transportMode]}</span>
                                                            <span className={`text-xs font-bold ${mc?.text || "text-indigo-700"}`}>{MODE_LABELS[trip.transportMode]}</span>
                                                            {trip.isReturn && (
                                                                <span className="ml-auto flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                                    <RotateCcw size={9} /> Return
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                                                            <MapPin size={10} className="text-emerald-500 shrink-0" />
                                                            {trip.pickupLocation.name.split(",")[0]}
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                                                            <MapPin size={10} className="text-rose-500 shrink-0" />
                                                            {trip.dropoffLocation.name.split(",")[0]}
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-[11px]">
                                                            <span className="text-slate-400">{trip.distanceKm?.toFixed(1)} km</span>
                                                            <span className={`font-bold ${mc?.text || "text-emerald-700"}`}>Rs. {trip.priceRs}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => openModal(dayData.day, slot)}
                                                        className="w-full rounded-xl border-2 border-dashed border-slate-200 py-5 text-slate-300 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition group/add"
                                                    >
                                                        <Plus size={18} className="mx-auto transition group-hover/add:scale-110" />
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Trip Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Add Trip — {modal.day} {SLOT_LABELS[modal.slot]}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Select mode, pickup & dropoff locations.</p>
                            </div>
                            <button
                                onClick={() => setModal(null)}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Transport Mode Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">Transport Mode</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(pricingInfo?.modes || ["BUS", "VAN", "THREE_WHEELER", "TRAIN"]).map((mode) => {
                                        const active = modalMode === mode;
                                        const mc = MODE_COLORS[mode];
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => setModalMode(mode)}
                                                className={`rounded-xl border-2 p-3 text-center transition-all ${active
                                                    ? `${mc.border} ${mc.bg} ${mc.text} shadow-sm ring-2 ${mc.ring}`
                                                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div className="mx-auto mb-1">{MODE_ICONS_LG[mode]}</div>
                                                <div className="text-xs font-bold">{MODE_LABELS[mode]}</div>
                                                {pricingInfo && (
                                                    <div className={`text-[9px] mt-0.5 ${active ? "opacity-70" : "text-slate-400"}`}>
                                                        Rs.{pricingInfo.baseFare[mode]}+{pricingInfo.pricePerKm[mode]}/km
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Location Inputs */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                {/* Pickup */}
                                <div className="relative">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 pt-3 block">Pickup</label>
                                    <div className="relative px-4 pb-3">
                                        <div className="relative">
                                            <Navigation size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                                            <input
                                                type="text"
                                                value={pickupQuery}
                                                onChange={(e) => { setPickupQuery(e.target.value); setSelectedPickup(null); }}
                                                placeholder="Search pickup location..."
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition"
                                            />
                                        </div>
                                        {selectedPickup && (
                                            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                                {selectedPickup.name.split(",").slice(0, 2).join(",")}
                                            </div>
                                        )}
                                        {pickupResults.length > 0 && !selectedPickup && (
                                            <div className="absolute left-4 right-4 z-10 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                                                {pickupResults.map((r, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSelectedPickup(r);
                                                            setPickupQuery(r.name.split(",").slice(0, 2).join(","));
                                                            setPickupResults([]);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 border-b last:border-b-0 border-slate-100 transition"
                                                    >
                                                        <MapPin size={12} className="inline mr-1.5 text-slate-400" />
                                                        {r.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow divider */}
                                <div className="flex items-center justify-center py-0">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-400 border border-slate-200 -my-3 relative z-[5]">
                                        <ArrowRight size={12} className="rotate-90" />
                                    </div>
                                </div>

                                {/* Dropoff */}
                                <div className="relative border-t border-slate-100">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 pt-3 block">Dropoff</label>
                                    <div className="relative px-4 pb-3">
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                                            <input
                                                type="text"
                                                value={dropoffQuery}
                                                onChange={(e) => { setDropoffQuery(e.target.value); setSelectedDropoff(null); }}
                                                placeholder="Search dropoff location..."
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition"
                                            />
                                        </div>
                                        {selectedDropoff && (
                                            <div className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 font-medium">
                                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500"></div>
                                                {selectedDropoff.name.split(",").slice(0, 2).join(",")}
                                            </div>
                                        )}
                                        {dropoffResults.length > 0 && !selectedDropoff && (
                                            <div className="absolute left-4 right-4 z-10 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                                                {dropoffResults.map((r, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSelectedDropoff(r);
                                                            setDropoffQuery(r.name.split(",").slice(0, 2).join(","));
                                                            setDropoffResults([]);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 border-b last:border-b-0 border-slate-100 transition"
                                                    >
                                                        <MapPin size={12} className="inline mr-1.5 text-slate-400" />
                                                        {r.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Distance & Fee Preview */}
                            {selectedPickup && selectedDropoff && calculatedDistance > 0 && (() => {
                                const mc = MODE_COLORS[modalMode];
                                return (
                                    <div className={`rounded-xl ${mc.bg} border ${mc.border} border-opacity-30 p-4`}>
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <Receipt size={14} className={mc.text} />
                                            <h5 className={`text-xs font-bold ${mc.text}`}>Trip Cost Estimate</h5>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="rounded-lg bg-white/70 p-2.5">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Distance</div>
                                                <div className="text-base font-extrabold text-slate-800 mt-0.5">{calculatedDistance.toFixed(1)} km</div>
                                            </div>
                                            <div className="rounded-lg bg-white/70 p-2.5">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mode</div>
                                                <div className={`text-base font-extrabold ${mc.text} mt-0.5`}>{MODE_LABELS[modalMode]}</div>
                                            </div>
                                            <div className="rounded-lg bg-white/70 p-2.5">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Fee</div>
                                                <div className="text-base font-extrabold text-emerald-700 mt-0.5">Rs. {calculatedFee}</div>
                                            </div>
                                        </div>
                                        {addReturn && modal.slot === "morning" && (
                                            <div className="mt-3 text-center text-xs text-amber-700 font-semibold bg-amber-50 rounded-lg py-1.5">
                                                <RotateCcw size={10} className="inline mr-1" />
                                                + Return trip: Rs. {calculatedFee} (evening)
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Return trip checkbox (only for morning) */}
                            {modal.slot === "morning" && (
                                <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={addReturn}
                                        onChange={(e) => setAddReturn(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                            <RotateCcw size={12} className="text-indigo-500" />
                                            Add return trip (evening) automatically
                                        </span>
                                        <span className="text-xs text-slate-400 block mt-0.5">Reverses pickup & dropoff for the evening slot</span>
                                    </div>
                                </label>
                            )}
                        </div>

                        {/* Add Trip Button - sticky bottom */}
                        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 rounded-b-2xl">
                            <button
                                onClick={handleAddTrip}
                                disabled={!selectedPickup || !selectedDropoff || slotSaving}
                                className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200"
                            >
                                {slotSaving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                        Adding...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Plus size={16} />
                                        Add Trip
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
