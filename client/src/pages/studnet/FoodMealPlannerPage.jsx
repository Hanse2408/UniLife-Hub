import {
    AlertTriangle,
    CalendarDays,
    Clock3,
    Search,
    AlertCircle,
    Sparkles,
    Building,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

// API endpoints backend eke facility planner ekata galapena widiyata wenas karanna
import {
    getStudentCurrentFacilityPlanApi,
    initStudentFacilityPlanApi,
    setFacilitySlotApi,
    clearFacilitySlotApi,
    getFacilityPlanPrefsApi,
    getAvailableFacilitiesApi,
} from "../../api/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["morning", "afternoon", "evening"];
const SLOT_ICONS = { morning: "🌅", afternoon: "☀️", evening: "🌙" };
const SLOT_LABELS = { morning: "Morning Session", afternoon: "Afternoon Session", evening: "Evening Session" };
const SLOT_MAP = { morning: "MORNING", afternoon: "AFTERNOON", evening: "EVENING" };

const CATEGORY_OPTIONS = [
    { value: "", label: "Any Space" },
    { value: "study_room", label: "Study Room" },
    { value: "lab", label: "Computer Lab" },
    { value: "auditorium", label: "Auditorium" },
    { value: "meeting_room", label: "Meeting Room" },
];

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatList(items) {
    if (!items.length) {
        return "None required";
    }
    return items.join(", ");
}

export default function FacilityPlannerPage() {
    const [plan, setPlan] = useState(null);
    const [prefs, setPrefs] = useState(null);
    const [allFacilities, setAllFacilities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Planner setup form fields
    const [budgetInput, setBudgetInput] = useState("");
    const [preferredCategory, setPreferredCategory] = useState("");
    const [equipmentInput, setEquipmentInput] = useState("");
    const [initSaving, setInitSaving] = useState(false);

    // Facility picker modal
    const [modal, setModal] = useState(null); // { day, slot }
    const [search, setSearch] = useState("");
    const [slotSaving, setSlotSaving] = useState(null); // "day-slot"

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [planRes, prefsRes, itemsRes] = await Promise.allSettled([
                getStudentCurrentFacilityPlanApi(),
                getFacilityPlanPrefsApi(),
                getAvailableFacilitiesApi(),
            ]);

            if (planRes.status === "fulfilled") setPlan(planRes.value.data.plan || null);

            if (prefsRes.status === "fulfilled") {
                const p = prefsRes.value.data.prefs;
                setPrefs(p || null);
                if (p) {
                    setPreferredCategory(p.preferredCategory || "");
                    setEquipmentInput((p.requiredEquipment || []).join(", "));
                    setBudgetInput(p.weekly_budget ? String(p.weekly_budget) : "");
                }
            }

            if (itemsRes.status === "fulfilled") setAllFacilities(itemsRes.value.data.facilities || []);
        } catch {
            toast.error("Failed to load weekly space planner");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // ── Computed totals ──────────────────────────────────────────
    const totalCost = useMemo(() => {
        if (!plan?.scheduleSlots?.length) return 0;
        return plan.scheduleSlots.reduce((sum, day) => {
            // Assume each session is a 2-hour block for cost calculation
            return sum + SLOTS.reduce((s, slot) => s + (Number(day.bookings?.[slot]?.hourlyRate || 0) * 2), 0);
        }, 0);
    }, [plan]);

    const filledSlots = useMemo(() => {
        if (!plan?.scheduleSlots?.length) return 0;
        return plan.scheduleSlots.reduce((sum, day) => {
            return sum + SLOTS.filter((slot) => day.bookings?.[slot]?.facilityName).length;
        }, 0);
    }, [plan]);

    const weeklyBudget = plan?.weekly_budget || 0;
    const budgetPercent = weeklyBudget > 0 ? Math.min(100, Math.round((totalCost / weeklyBudget) * 100)) : 0;
    const remaining = weeklyBudget - totalCost;
    const isOverBudget = weeklyBudget > 0 && totalCost > weeklyBudget;
    const coveragePercent = Math.round((filledSlots / (DAYS.length * SLOTS.length)) * 100);

    const requiredEquipmentList = useMemo(() => {
        if (!prefs?.requiredEquipment?.length) return [];
        return prefs.requiredEquipment.map((e) => e.toLowerCase().trim());
    }, [prefs]);

    // ── Handlers ─────────────────────────────────────────────────
    const handleInitPlan = async (e) => {
        e.preventDefault();
        if (!budgetInput || Number(budgetInput) <= 0) {
            toast.error("Enter a valid weekly budget limit");
            return;
        }
        try {
            setInitSaving(true);
            const { data } = await initStudentFacilityPlanApi({
                weeklyBudget: Number(budgetInput),
                preferredCategory,
                requiredEquipment: equipmentInput.split(",").map((e) => e.trim()).filter(Boolean),
            });
            setPlan(data.plan);
            setPrefs((prev) => ({
                ...(prev || {}),
                weekly_budget: Number(budgetInput),
                preferredCategory,
                requiredEquipment: equipmentInput.split(",").map((e) => e.trim()).filter(Boolean),
            }));
            toast.success("Weekly booking plan started!", {
                style: { background: '#1e3a8a', color: '#fff' }, // Navy Blue success
                iconTheme: { primary: '#f97316', secondary: '#fff' } // Orange icon
            });
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to set up space planner");
        } finally {
            setInitSaving(false);
        }
    };

    const handleUpdatePrefs = async () => {
        if (!budgetInput || Number(budgetInput) <= 0) {
            toast.error("Enter a valid budget amount");
            return;
        }
        try {
            setInitSaving(true);
            const { data } = await initStudentFacilityPlanApi({
                weeklyBudget: Number(budgetInput),
                preferredCategory,
                requiredEquipment: equipmentInput.split(",").map((e) => e.trim()).filter(Boolean),
            });
            setPlan(data.plan);
            setPrefs((prev) => ({
                ...(prev || {}),
                weekly_budget: Number(budgetInput),
                preferredCategory,
                requiredEquipment: equipmentInput.split(",").map((e) => e.trim()).filter(Boolean),
            }));
            toast.success("Preferences updated successfully");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update preferences");
        } finally {
            setInitSaving(false);
        }
    };

    const handlePickFacility = async (facility) => {
        if (!modal) return;
        const { day, slot } = modal;
        const key = `${day}-${slot}`;

        // Check equipment requirement conflicts before saving
        const facilityEq = String(facility.equipment_tags || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
        const missingEq = requiredEquipmentList.filter((req) => !facilityEq.includes(req));
        
        if (missingEq.length > 0) {
            toast(`⚠️ Notice: "${facility.facilityName}" is missing: ${missingEq.join(", ")}`, {
                duration: 5000,
                style: { background: "#fff7ed", color: "#c2410c", fontWeight: 600 },
            });
        }

        try {
            setSlotSaving(key);
            const { data } = await setFacilitySlotApi({ day, slot, facilityId: facility._id });
            setPlan(data.plan);

            if (data.budgetExceeded) {
                toast(
                    `💸 Over budget! Planned: LKR ${Number(data.totalPlanned).toFixed(2)} / Limit: LKR ${Number(weeklyBudget).toFixed(2)}`,
                    { duration: 6000, style: { background: "#fee2e2", color: "#991b1b", fontWeight: 600 } },
                );
            }

            setModal(null);
            setSearch("");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reserve slot");
        } finally {
            setSlotSaving(null);
        }
    };

    const handleClearSlot = async (day, slot) => {
        const key = `${day}-${slot}`;
        try {
            setSlotSaving(key);
            const { data } = await clearFacilitySlotApi({ day, slot });
            setPlan(data.plan);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to clear slot");
        } finally {
            setSlotSaving(null);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────
    const hasMissingEquipment = (facility) => {
        if (!requiredEquipmentList.length) return false;
        const tags = String(facility.equipment_tags || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
        return requiredEquipmentList.some((req) => !tags.includes(req));
    };

    // ── Modal filtered items ──────────────────────────────────────
    const modalFacilities = useMemo(() => {
        const q = search.toLowerCase();

        return [...allFacilities]
            .filter(
                (facility) =>
                    !q ||
                    facility.facilityName.toLowerCase().includes(q) ||
                    (facility.category || "").toLowerCase().includes(q) ||
                    (facility.location || "").toLowerCase().includes(q),
            )
            .sort((left, right) => {
                const leftMissing = hasMissingEquipment(left) ? 1 : 0;
                const rightMissing = hasMissingEquipment(right) ? 1 : 0;

                if (leftMissing !== rightMissing) {
                    return leftMissing - rightMissing; // Facilities WITH all equipment come first
                }

                return Number(left.hourlyRate || 0) - Number(right.hourlyRate || 0);
            });
    }, [allFacilities, search, requiredEquipmentList]);

    const daySummaries = useMemo(() => {
        return DAYS.map((day) => {
            const bookings = plan?.scheduleSlots?.find((entry) => entry.day === day)?.bookings || {};
            // Assuming 2 hours per session slot
            const total = SLOTS.reduce((sum, slot) => sum + (Number(bookings?.[slot]?.hourlyRate || 0) * 2), 0);
            const count = SLOTS.filter((slot) => bookings?.[slot]?.facilityName).length;

            return { day, bookings, total, count };
        });
    }, [plan]);

    // ── Render ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <PageHero eyebrow="Campus Facilities" title="Weekly Space Planner" description="Plan your study and event schedules." backgroundImage={dashboardBanner} />
                <LoadingState
                    title="Loading your planner"
                    description="Fetching your weekly reservations and available campus spaces."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Campus Facilities"
                title="Shape your week ahead and secure your spaces early"
                description="Plan your weekly study sessions and meetings within budget while ensuring you have all the equipment you need."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Weekly Limit"
                    value={weeklyBudget ? formatCurrency(weeklyBudget) : "Not set"}
                    subtitle="Maximum weekly budget for space reservations."
                    tone="blue"
                    icon={Wallet}
                />
                <StatCard
                    title="Reserved Cost"
                    value={formatCurrency(totalCost)}
                    subtitle="Sum of all 2-hour blocks assigned so far this week."
                    tone={isOverBudget ? "rose" : "emerald"}
                    icon={Sparkles}
                />
                <StatCard
                    title="Remaining Limit"
                    value={weeklyBudget ? formatCurrency(remaining) : "Budget needed"}
                    subtitle="How much allocation is left for additional bookings."
                    tone={remaining < 0 ? "rose" : "amber"}
                    icon={AlertTriangle}
                />
                <StatCard
                    title="Week Coverage"
                    value={`${coveragePercent}%`}
                    subtitle="How much of your 21 weekly slots are currently booked."
                    tone="blue"
                    icon={CalendarDays}
                />
            </div>

            {/* ── Planner setup (no plan this week) ── */}
            {!plan && (
                <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <EmptyState
                        icon="🗓️"
                        title="Your weekly schedule is empty"
                        description="Set a budget, space preference, and equipment needs first. Then you can assign facilities to morning, afternoon, and evening blocks."
                        tone="blue"
                        action={
                            <Link to="/student/facilities/browse" className="bg-blue-900 text-white hover:bg-blue-800 px-4 py-2 rounded-xl font-bold transition">
                                Browse Facilities First
                            </Link>
                        }
                    />

                    <div className="card p-6 border-blue-900 border-t-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                            Planner setup
                        </div>
                        <h3 className="mt-2 text-2xl font-bold text-blue-900">Start this week's reservations</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Your saved budget and equipment preferences guide the facility picker, warning you if a space lacks required tools like projectors.
                        </p>

                        <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleInitPlan}>
                            <div>
                                <label className="mb-2 block text-sm font-bold text-blue-900">
                                    Weekly Limit (LKR) <span className="text-orange-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="input focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="e.g. 5000"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-blue-900">Preferred Category</label>
                                <select className="select focus:ring-orange-500 focus:border-orange-500" value={preferredCategory} onChange={(e) => setPreferredCategory(e.target.value)}>
                                    {CATEGORY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-bold text-blue-900">
                                        Required Equipment <span className="text-xs font-normal text-slate-400">(comma separated)</span>
                                    </label>
                                </div>
                                <input
                                    className="input focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="e.g. Projector, Whiteboard, WiFi"
                                    value={equipmentInput}
                                    onChange={(e) => setEquipmentInput(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <button className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition disabled:opacity-50" disabled={initSaving}>
                                    {initSaving ? "Setting up..." : "Start Planning This Week"}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            )}

            {/* ── Settings (plan exists) ── */}
            {plan && (
                <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="card p-6 border-blue-900 border-t-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                                    Planner settings
                                </div>
                                <h3 className="mt-2 text-2xl font-bold text-blue-900">Budget and preference control</h3>
                            </div>
                            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-900">
                                {filledSlots} slots booked
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-blue-900">Weekly Limit (LKR)</label>
                                <input
                                    type="number"
                                    className="input focus:ring-orange-500"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-blue-900">Preferred Category</label>
                                <select className="select focus:ring-orange-500" value={preferredCategory} onChange={(e) => setPreferredCategory(e.target.value)}>
                                    {CATEGORY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-bold text-blue-900">Required Equipment</label>
                                <input
                                    className="input focus:ring-orange-500"
                                    placeholder="Projector, Whiteboard, WiFi"
                                    value={equipmentInput}
                                    onChange={(e) => setEquipmentInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-bold text-blue-900">Current Filters</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Category</div>
                                    <div className="mt-1 text-sm font-bold text-orange-600">
                                        {CATEGORY_OPTIONS.find(c => c.value === preferredCategory)?.label || "Any"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Equipment Needs</div>
                                    <div className="mt-1 text-sm font-bold text-blue-900">
                                        {formatList(requiredEquipmentList)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl transition disabled:opacity-50"
                                onClick={handleUpdatePrefs}
                                disabled={initSaving}
                            >
                                {initSaving ? "Saving..." : "Save Preferences"}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="card p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                        Budget Posture
                                    </div>
                                    <h3 className="mt-2 text-2xl font-bold text-blue-900">Keep the week within range</h3>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${isOverBudget ? "bg-rose-100 text-rose-700" : budgetPercent >= 80 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-900"}`}>
                                    {budgetPercent}% allocated
                                </div>
                            </div>

                            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : budgetPercent >= 80 ? "bg-orange-500" : "bg-blue-900"}`}
                                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                                    <div className="text-sm font-bold text-slate-500">Limit</div>
                                    <div className="mt-2 text-xl font-black text-blue-900">{formatCurrency(weeklyBudget)}</div>
                                </div>
                                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                                    <div className="text-sm font-bold text-slate-500">Booked Cost</div>
                                    <div className={`mt-2 text-xl font-black ${isOverBudget ? "text-red-600" : "text-blue-900"}`}>
                                        {formatCurrency(totalCost)}
                                    </div>
                                </div>
                                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                                    <div className="text-sm font-bold text-slate-500">Remaining</div>
                                    <div className={`mt-2 text-xl font-black ${remaining < 0 ? "text-red-600" : "text-orange-500"}`}>
                                        {formatCurrency(remaining)}
                                    </div>
                                </div>
                            </div>

                            {requiredEquipmentList.length > 0 ? (
                                <div className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                                    <div className="flex items-center gap-2 font-bold text-blue-900">
                                        <AlertCircle size={16} />
                                        Equipment Alerts Active
                                    </div>
                                    <div className="mt-1">Facilities missing {formatList(requiredEquipmentList)} are flagged inside the picker before you assign them to a slot.</div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Weekly grid ── */}
            {plan && (
                <div className="space-y-5">
                    {daySummaries.map((day) => (
                        <div key={day.day} className="card p-6 shadow-sm border-t-2 border-slate-100">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.26em] text-orange-500">{day.day}</div>
                                    <h3 className="mt-2 text-2xl font-bold text-blue-900">{day.count ? `${day.count} sessions booked` : "No sessions assigned yet"}</h3>
                                </div>
                                <div className="rounded-3xl bg-blue-50 px-5 py-4 text-right border border-blue-100">
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-900">Day total</div>
                                    <div className="mt-2 text-2xl font-black text-orange-600">{formatCurrency(day.total)}</div>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                {SLOTS.map((slot) => {
                                    const booking = day.bookings?.[slot] || null;
                                    const cellKey = `${day.day}-${slot}`;
                                    const isSaving = slotSaving === cellKey;

                                    return (
                                        <div
                                            key={cellKey}
                                            className={`rounded-3xl border p-4 transition-all ${booking ? "border-blue-200 bg-white shadow-sm" : "border-dashed border-slate-300 bg-slate-50"}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-lg">{SLOT_ICONS[slot]}</div>
                                                    <div className="mt-1 text-sm font-bold text-blue-900">{SLOT_LABELS[slot]}</div>
                                                </div>
                                                <div className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                                    {SLOT_MAP[slot]}
                                                </div>
                                            </div>

                                            {isSaving ? (
                                                <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-8 text-center text-sm font-bold text-slate-500">Updating this slot...</div>
                                            ) : booking ? (
                                                <>
                                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                                        {booking.image_url ? (
                                                            <img src={booking.image_url} alt={booking.facilityName} className="h-36 w-full object-cover opacity-90" />
                                                        ) : (
                                                            <div className="flex h-36 items-center justify-center bg-blue-50 text-blue-300">
                                                                <Building size={34} strokeWidth={1.9} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4">
                                                        <div className="text-lg font-bold text-blue-900">{booking.facilityName}</div>
                                                        <div className="mt-1 text-sm font-medium text-slate-500">{booking.category || "Facility"}</div>
                                                        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-orange-600">
                                                            <Clock3 size={16} />
                                                            {formatCurrency(booking.hourlyRate)} / hr
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            className="flex-1 bg-blue-100 text-blue-900 hover:bg-blue-200 font-bold py-2 px-4 rounded-xl transition text-sm"
                                                            onClick={() => {
                                                                setModal({ day: day.day, slot });
                                                                setSearch("");
                                                            }}
                                                        >
                                                            Change Space
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold py-2 px-4 rounded-xl transition text-sm" 
                                                            onClick={() => handleClearSlot(day.day, slot)}
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="mt-4 flex w-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl text-center text-slate-500 transition hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border-2 border-transparent"
                                                    onClick={() => {
                                                        setModal({ day: day.day, slot });
                                                        setSearch("");
                                                    }}
                                                >
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 text-blue-900">
                                                        <span className="text-2xl font-light">+</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-blue-900">Book {slot} block</div>
                                                        <div className="mt-1 text-sm font-medium text-slate-500 px-4">Open picker to search and assign a facility.</div>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Facility picker modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
                        <div className="bg-blue-900 p-5 text-white">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                                        Space Picker
                                    </div>
                                    <h3 className="mt-3 text-2xl font-bold text-white">
                                        {modal.day} · {SLOT_LABELS[modal.slot]}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                                    onClick={() => {
                                        setModal(null);
                                        setSearch("");
                                    }}
                                >
                                    Close
                                </button>
                            </div>

                            <label className="relative mt-5 block">
                                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                                <input
                                    autoFocus
                                    className="w-full rounded-2xl border-2 border-white/20 bg-white/10 py-3 pl-11 pr-4 text-sm font-bold text-white placeholder-white/50 outline-none transition focus:border-orange-500 focus:bg-white/20"
                                    placeholder="Search facilities by name or equipment"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
                            {modalFacilities.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm font-bold text-slate-400">
                                    No facilities match the current search.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {modalFacilities.map((facility) => {
                                        const missingEqWarn = hasMissingEquipment(facility);

                                        return (
                                            <button
                                                key={facility._id}
                                                type="button"
                                                className={`rounded-3xl border-2 p-4 text-left transition hover:-translate-y-1 bg-white ${missingEqWarn ? "border-orange-200" : "border-slate-100 hover:border-blue-200 shadow-sm"}`}
                                                onClick={() => handlePickFacility(facility)}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {facility.image_url ? (
                                                        <img src={facility.image_url} alt={facility.facilityName} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover border border-slate-100" />
                                                    ) : (
                                                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-300">
                                                            <Building size={28} />
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-900">
                                                                {facility.category || "Space"}
                                                            </span>
                                                            {missingEqWarn ? (
                                                                <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700">
                                                                    Missing Equipment
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="mt-3 text-lg font-bold text-blue-900 truncate">{facility.facilityName}</div>
                                                        <div className="mt-2 text-sm font-black text-orange-600">{formatCurrency(facility.hourlyRate)}/hr</div>
                                                        
                                                        {missingEqWarn ? (
                                                            <div className="mt-3 text-xs font-semibold leading-5 text-orange-700 bg-orange-50 p-2 rounded-xl">
                                                                Lacks some required equipment. You can still select it if needed.
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}