import {
	AlertTriangle,
	CalendarDays,
	Clock3,
	Search,
	ShieldAlert,
	Sparkles,
	UtensilsCrossed,
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
import { useAuth } from "../../contexts/AuthContext";
import {
	getStudentCurrentMealPlanApi,
	initStudentMealPlanApi,
	setMealSlotApi,
	clearMealSlotApi,
	getMealPlanPrefsApi,
	getStudentFoodItemsApi,
} from "../../api/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["breakfast", "lunch", "dinner"];
const SLOT_ICONS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const SLOT_MEAL_MAP = { breakfast: "BREAKFAST", lunch: "LUNCH", dinner: "DINNER" };

const DIET_OPTIONS = [
	{ value: "", label: "Any" },
	{ value: "vegetarian", label: "Vegetarian" },
	{ value: "vegan", label: "Vegan" },
	{ value: "non-vegetarian", label: "Non-Vegetarian" },
	{ value: "halal", label: "Halal" },
];

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatList(items) {
	if (!items.length) {
		return "None set";
	}

	return items.join(", ");
}

export default function FoodMealPlannerPage() {
	const { user } = useAuth();
	const [plan, setPlan] = useState(null);
	const [prefs, setPrefs] = useState(null);
	const [allItems, setAllItems] = useState([]);
	const [loading, setLoading] = useState(true);

	// Budget setup form fields
	const [budgetInput, setBudgetInput] = useState("");
	const [dietType, setDietType] = useState("");
	const [allergenInput, setAllergenInput] = useState("");
	const [initSaving, setInitSaving] = useState(false);

	// Meal picker modal
	const [modal, setModal] = useState(null); // { day, slot }
	const [search, setSearch] = useState("");
	const [slotSaving, setSlotSaving] = useState(null); // "day-slot"

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [planRes, prefsRes, itemsRes] = await Promise.allSettled([
				getStudentCurrentMealPlanApi(),
				getMealPlanPrefsApi(),
				getStudentFoodItemsApi(),
			]);

			if (planRes.status === "fulfilled") setPlan(planRes.value.data.plan || null);

			if (prefsRes.status === "fulfilled") {
				const p = prefsRes.value.data.prefs;
				setPrefs(p || null);
				if (p) {
					setDietType(p.diet_type || "");
					// If AllergyPreference has allergens, use them; otherwise fall back to profile
					const resolvedAllergens =
						p.allergens?.length > 0
							? p.allergens
							: (user?.allergenNotes || []);
					setAllergenInput(resolvedAllergens.join(", "));
					setBudgetInput(p.weekly_budget ? String(p.weekly_budget) : "");
				} else {
					// No prefs at all — pre-populate from profile
					if (user?.allergenNotes?.length > 0) {
						setAllergenInput(user.allergenNotes.join(", "));
					}
				}
			}

			if (itemsRes.status === "fulfilled") setAllItems(itemsRes.value.data.items || []);
		} catch {
			toast.error("Failed to load meal planner");
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	// ── Computed totals ──────────────────────────────────────────
	const totalCost = useMemo(() => {
		if (!plan?.mealSlots?.length) return 0;
		return plan.mealSlots.reduce((sum, day) => {
			return sum + SLOTS.reduce((s, slot) => s + Number(day.meals?.[slot]?.price || 0), 0);
		}, 0);
	}, [plan]);

	const filledSlots = useMemo(() => {
		if (!plan?.mealSlots?.length) return 0;
		return plan.mealSlots.reduce((sum, day) => {
			return sum + SLOTS.filter((slot) => day.meals?.[slot]?.name).length;
		}, 0);
	}, [plan]);

	const weeklyBudget = plan?.weekly_budget || 0;
	const budgetPercent = weeklyBudget > 0 ? Math.min(100, Math.round((totalCost / weeklyBudget) * 100)) : 0;
	const remaining = weeklyBudget - totalCost;
	const isOverBudget = weeklyBudget > 0 && totalCost > weeklyBudget;
	const coveragePercent = Math.round((filledSlots / (DAYS.length * SLOTS.length)) * 100);

	const studentAllergens = useMemo(() => {
		if (!prefs?.allergens?.length) return [];
		return prefs.allergens.map((a) => a.toLowerCase().trim());
	}, [prefs]);

	// ── Handlers ─────────────────────────────────────────────────
	const handleInitPlan = async (e) => {
		e.preventDefault();
		if (!budgetInput || Number(budgetInput) <= 0) {
			toast.error("Enter a valid weekly budget");
			return;
		}
		try {
			setInitSaving(true);
			const { data } = await initStudentMealPlanApi({
				weeklyBudget: Number(budgetInput),
				dietType,
				allergens: allergenInput.split(",").map((a) => a.trim()).filter(Boolean),
			});
			setPlan(data.plan);
			setPrefs((prev) => ({
				...(prev || {}),
				weekly_budget: Number(budgetInput),
				diet_type: dietType,
				allergens: allergenInput.split(",").map((a) => a.trim()).filter(Boolean),
			}));
			toast.success("Weekly meal plan started!");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to set up meal plan");
		} finally {
			setInitSaving(false);
		}
	};

	const handleUpdateBudget = async () => {
		if (!budgetInput || Number(budgetInput) <= 0) {
			toast.error("Enter a valid budget amount");
			return;
		}
		try {
			setInitSaving(true);
			const { data } = await initStudentMealPlanApi({
				weeklyBudget: Number(budgetInput),
				dietType,
				allergens: allergenInput.split(",").map((a) => a.trim()).filter(Boolean),
			});
			setPlan(data.plan);
			setPrefs((prev) => ({
				...(prev || {}),
				weekly_budget: Number(budgetInput),
				diet_type: dietType,
				allergens: allergenInput.split(",").map((a) => a.trim()).filter(Boolean),
			}));
			toast.success("Preferences updated");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to update preferences");
		} finally {
			setInitSaving(false);
		}
	};

	const handlePickMeal = async (item) => {
		if (!modal) return;
		const { day, slot } = modal;
		const key = `${day}-${slot}`;

		// Check allergy conflicts before saving
		const itemAllergens = String(item.allergen_tags || "")
			.split(",")
			.map((a) => a.trim().toLowerCase())
			.filter(Boolean);
		const conflicts = itemAllergens.filter((a) => studentAllergens.includes(a));
		if (conflicts.length > 0) {
			toast(`⚠️ Allergy alert: "${item.name}" contains ${conflicts.join(", ")} which matches your allergy profile.`, {
				duration: 5000,
				style: { background: "#fef3c7", color: "#92400e", fontWeight: 600 },
			});
		}

		try {
			setSlotSaving(key);
			const { data } = await setMealSlotApi({ day, slot, foodItemId: item._id });
			setPlan(data.plan);

			if (data.budgetExceeded) {
				toast(
					`💸 Over budget! Planned: LKR ${Number(data.totalPlanned).toFixed(2)} / Budget: LKR ${Number(weeklyBudget).toFixed(2)}`,
					{ duration: 6000, style: { background: "#fee2e2", color: "#991b1b", fontWeight: 600 } },
				);
			}

			setModal(null);
			setSearch("");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to set meal");
		} finally {
			setSlotSaving(null);
		}
	};

	const handleClearSlot = async (day, slot) => {
		const key = `${day}-${slot}`;
		try {
			setSlotSaving(key);
			const { data } = await clearMealSlotApi({ day, slot });
			setPlan(data.plan);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to clear slot");
		} finally {
			setSlotSaving(null);
		}
	};

	// ── Helpers ───────────────────────────────────────────────────
	const getMeal = (day, slot) =>
		plan?.mealSlots?.find((d) => d.day === day)?.meals?.[slot] || null;

	const hasAllergyConflict = (item) => {
		if (!studentAllergens.length) return false;
		const tags = String(item.allergen_tags || "")
			.split(",")
			.map((a) => a.trim().toLowerCase())
			.filter(Boolean);
		return tags.some((t) => studentAllergens.includes(t));
	};

	// ── Modal filtered items ──────────────────────────────────────
	const modalItems = useMemo(() => {
		const q = search.toLowerCase();
		const targetMeal = modal ? SLOT_MEAL_MAP[modal.slot] : "";

		return [...allItems]
			.filter(
				(item) =>
					!q ||
					item.name.toLowerCase().includes(q) ||
					(item.category || "").toLowerCase().includes(q) ||
					(item.meal || "").toLowerCase().includes(q),
			)
			.sort((left, right) => {
				const leftMatch = left.meal === targetMeal ? 1 : 0;
				const rightMatch = right.meal === targetMeal ? 1 : 0;

				if (leftMatch !== rightMatch) {
					return rightMatch - leftMatch;
				}

				const leftConflict = hasAllergyConflict(left) ? 1 : 0;
				const rightConflict = hasAllergyConflict(right) ? 1 : 0;

				if (leftConflict !== rightConflict) {
					return leftConflict - rightConflict;
				}

				return Number(left.price || 0) - Number(right.price || 0);
			});
	}, [allItems, modal, search, studentAllergens]);

	const daySummaries = useMemo(() => {
		return DAYS.map((day) => {
			const meals = plan?.mealSlots?.find((entry) => entry.day === day)?.meals || {};
			const total = SLOTS.reduce((sum, slot) => sum + Number(meals?.[slot]?.price || 0), 0);
			const count = SLOTS.filter((slot) => meals?.[slot]?.name).length;

			return {
				day,
				meals,
				total,
				count,
			};
		});
	}, [plan]);

	// ── Render ────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className="space-y-6">
				<PageHero eyebrow="Student Food" title="Meal Planner" description="Plan your week with smart meals." backgroundImage={dashboardBanner} />
				<LoadingState
					title="Loading meal planner"
					description="Collecting your weekly plan, saved preferences, and available food items."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Student Food"
				title="Shape the week before hunger or budget drift takes over"
				description="Plan your week's meals within budget while keeping allergies in check."
				backgroundImage={dashboardBanner}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Weekly budget"
					value={weeklyBudget ? formatCurrency(weeklyBudget) : "Not set"}
					subtitle="The current weekly budget saved to your active meal plan."
					tone="indigo"
					icon={Wallet}
				/>
				<StatCard
					title="Planned cost"
					value={formatCurrency(totalCost)}
					subtitle="Sum of all meals currently assigned to this week's breakfast, lunch, and dinner slots."
					tone={isOverBudget ? "rose" : "emerald"}
					icon={Sparkles}
				/>
				<StatCard
					title="Remaining"
					value={weeklyBudget ? formatCurrency(remaining) : "Budget needed"}
					subtitle="How much budget room is left after the meals already planned this week."
					tone={remaining < 0 ? "rose" : "amber"}
					icon={AlertTriangle}
				/>
				<StatCard
					title="Plan coverage"
					value={`${coveragePercent}%`}
					subtitle="How much of the 21 weekly meal slots already has a dish assigned."
					tone="blue"
					icon={CalendarDays}
				/>
			</div>

			{/* ── Budget setup (no plan this week) ── */}
			{!plan && (
				<section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
					<EmptyState
						icon="🗓️"
						title="Your weekly planner has not been started yet"
						description="Set a budget, diet preference, and allergy notes first. Once the plan exists, you can fill breakfast, lunch, and dinner across all seven days."
						tone="blue"
						action={
							<Link to="/student/food/browse" className="btn-secondary">
								Browse meals first
							</Link>
						}
					/>

					<div className="card p-6">
						<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
							Planner setup
						</div>
						<h3 className="mt-2 text-2xl font-bold text-slate-900">Start this week's meal plan</h3>
						<p className="mt-2 text-sm leading-6 text-slate-600">
							Your saved budget and preferences guide every later planner choice, including allergy warnings inside the meal picker.
						</p>

						<form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleInitPlan}>
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Weekly budget (LKR) <span className="text-rose-500">*</span>
								</label>
								<input
									type="number"
									className="input"
									placeholder="e.g. 5000"
									value={budgetInput}
									onChange={(e) => setBudgetInput(e.target.value)}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">Diet type</label>
								<select className="select" value={dietType} onChange={(e) => setDietType(e.target.value)}>
									{DIET_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div className="md:col-span-2">
								<div className="mb-2 flex items-center justify-between">
									<label className="text-sm font-medium text-slate-700">
										Allergies <span className="text-xs text-slate-400">(comma separated)</span>
									</label>
									{(user?.allergenNotes || []).length > 0 && (
										<button
											type="button"
											className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
											onClick={() => setAllergenInput((user.allergenNotes || []).join(", "))}
										>
											Load from profile
										</button>
									)}
								</div>
								<input
									placeholder="e.g. nuts, dairy, shellfish"
									value={allergenInput}
									onChange={(e) => setAllergenInput(e.target.value)}
								/>
							</div>

							<div className="md:col-span-2 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
								<div className="font-semibold text-amber-900">What happens after setup</div>
								<div className="mt-1">
									A weekly plan is created for the current week, and each meal slot can then be filled manually while budget and allergy feedback stays visible.
								</div>
							</div>

							<div className="md:col-span-2">
								<button className="btn-primary" disabled={initSaving}>
									{initSaving ? "Setting up..." : "Start planning this week"}
								</button>
							</div>
						</form>
					</div>
				</section>
			)}

			{/* ── Budget bar + update prefs (plan exists) ── */}
			{plan && (
				<section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
					<div className="card p-6">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
									Planner settings
								</div>
								<h3 className="mt-2 text-2xl font-bold text-slate-900">Budget and preference control</h3>
							</div>
							<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
								{filledSlots} slots filled
							</div>
						</div>

						<div className="mt-5 grid gap-4 md:grid-cols-2">
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">Weekly budget (LKR)</label>
								<input
									type="number"
									className="input"
									value={budgetInput}
									onChange={(e) => setBudgetInput(e.target.value)}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">Diet type</label>
								<select className="select" value={dietType} onChange={(e) => setDietType(e.target.value)}>
									{DIET_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div className="md:col-span-2">
								<div className="mb-2 flex items-center justify-between">
									<label className="text-sm font-medium text-slate-700">Allergies</label>
									{(user?.allergenNotes || []).length > 0 && (
										<button
											type="button"
											className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
											onClick={() => setAllergenInput((user.allergenNotes || []).join(", "))}
										>
											Load from profile
										</button>
									)}
								</div>
								<input
									className="input"
									placeholder="nuts, dairy, shellfish"
									value={allergenInput}
									onChange={(e) => setAllergenInput(e.target.value)}
								/>
							</div>
						</div>

						<div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
							<div className="text-sm font-semibold text-slate-900">Saved profile</div>
							<div className="mt-3 grid gap-3 sm:grid-cols-3">
								<div>
									<div className="text-xs uppercase tracking-[0.18em] text-slate-400">Diet</div>
									<div className="mt-1 text-sm font-semibold text-slate-800">
										{dietType || "Any"}
									</div>
								</div>
								<div>
									<div className="text-xs uppercase tracking-[0.18em] text-slate-400">Allergies</div>
									<div className="mt-1 text-sm font-semibold text-slate-800">
										{formatList(studentAllergens)}
									</div>
								</div>
								<div>
									<div className="text-xs uppercase tracking-[0.18em] text-slate-400">Coverage</div>
									<div className="mt-1 text-sm font-semibold text-slate-800">
										{coveragePercent}% of week planned
									</div>
								</div>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							<button
								type="button"
								className="btn-primary"
								onClick={handleUpdateBudget}
								disabled={initSaving}
							>
								{initSaving ? "Saving..." : "Save preferences"}
							</button>
							<Link to="/student/food/browse" className="btn-secondary">
								Browse more meals
							</Link>
						</div>
					</div>

					<div className="space-y-6">
						<div className="card p-6">
							<div className="flex items-start justify-between gap-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
										Budget posture
									</div>
									<h3 className="mt-2 text-2xl font-bold text-slate-900">Keep the week within range</h3>
								</div>
								<div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${isOverBudget ? "bg-rose-100 text-rose-700" : budgetPercent >= 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
									{budgetPercent}% planned
								</div>
							</div>

							<div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
								<div
									className={`h-full rounded-full transition-all ${isOverBudget ? "bg-rose-500" : budgetPercent >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
									style={{ width: `${Math.min(budgetPercent, 100)}%` }}
								/>
							</div>

							<div className="mt-4 grid gap-4 md:grid-cols-3">
								<div className="rounded-3xl bg-slate-50 p-4">
									<div className="text-sm text-slate-500">Budget</div>
									<div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(weeklyBudget)}</div>
								</div>
								<div className="rounded-3xl bg-slate-50 p-4">
									<div className="text-sm text-slate-500">Planned</div>
									<div className={`mt-2 text-xl font-black ${isOverBudget ? "text-rose-700" : "text-slate-900"}`}>
										{formatCurrency(totalCost)}
									</div>
								</div>
								<div className="rounded-3xl bg-slate-50 p-4">
									<div className="text-sm text-slate-500">Remaining</div>
									<div className={`mt-2 text-xl font-black ${remaining < 0 ? "text-rose-700" : "text-emerald-700"}`}>
										{formatCurrency(remaining)}
									</div>
								</div>
							</div>

							{isOverBudget ? (
								<div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
									You are planning {formatCurrency(totalCost - weeklyBudget)} above budget. Remove or swap a few slots if you want the week back inside target.
								</div>
							) : null}

							{studentAllergens.length > 0 ? (
								<div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
									<div className="flex items-center gap-2 font-semibold text-amber-900">
										<ShieldAlert size={16} />
										Allergy alerts are active
									</div>
									<div className="mt-1">Meals matching {formatList(studentAllergens)} are flagged inside the picker before you assign them to a slot.</div>
								</div>
							) : null}
						</div>

						<div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
							<div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
								Planning note
							</div>
							<h3 className="mt-4 text-2xl font-bold leading-snug">Use the planner to make browsing intentional, not reactive.</h3>
							<p className="mt-4 text-sm leading-6 text-slate-300">
								This screen now shows coverage, allergy risk, and budget headroom together so you can decide whether to fill the week out completely or leave room for spontaneous orders.
							</p>
						</div>
					</div>
				</section>
			)}

			{/* ── Weekly grid ── */}
			{plan && (
				<div className="space-y-5">
					{daySummaries.map((day) => (
						<div key={day.day} className="card p-6">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{day.day}</div>
									<h3 className="mt-2 text-2xl font-bold text-slate-900">{day.count ? `${day.count} meals planned` : "No meals assigned yet"}</h3>
								</div>
								<div className="rounded-3xl bg-slate-50 px-5 py-4 text-right">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Day total</div>
									<div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(day.total)}</div>
								</div>
							</div>

							<div className="mt-5 grid gap-4 lg:grid-cols-3">
								{SLOTS.map((slot) => {
									const meal = day.meals?.[slot] || null;
									const cellKey = `${day.day}-${slot}`;
									const isSaving = slotSaving === cellKey;

									return (
										<div
											key={cellKey}
											className={`rounded-3xl border p-4 ${meal ? "border-indigo-100 bg-white" : "border-dashed border-slate-200 bg-slate-50/80"}`}
										>
											<div className="flex items-center justify-between gap-3">
												<div>
													<div className="text-lg">{SLOT_ICONS[slot]}</div>
													<div className="mt-1 text-sm font-semibold text-slate-900">{SLOT_LABELS[slot]}</div>
												</div>
												<div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
													{SLOT_MEAL_MAP[slot]}
												</div>
											</div>

											{isSaving ? (
												<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Updating this slot...</div>
											) : meal ? (
												<>
													<div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
														{meal.image_url ? (
															<img src={meal.image_url} alt={meal.name} className="h-36 w-full object-cover" />
														) : (
															<div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 text-slate-400">
																<UtensilsCrossed size={34} strokeWidth={1.9} />
															</div>
														)}
													</div>

													<div className="mt-4">
														<div className="text-lg font-bold text-slate-900">{meal.name}</div>
														<div className="mt-1 text-sm text-slate-500">{meal.category || "Food item"}</div>
														<div className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-700">
															<Clock3 size={16} />
															{formatCurrency(meal.price)}
														</div>
													</div>

													<div className="mt-4 flex flex-wrap gap-3">
														<button
															type="button"
															className="btn-secondary"
															onClick={() => {
																setModal({ day: day.day, slot });
																setSearch("");
															}}
														>
															Swap meal
														</button>
														<button type="button" className="btn-secondary" onClick={() => handleClearSlot(day.day, slot)}>
															Remove
														</button>
													</div>
												</>
											) : (
												<button
													type="button"
													className="mt-4 flex w-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl text-center text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
													onClick={() => {
														setModal({ day: day.day, slot });
														setSearch("");
													}}
												>
													<div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
														<span className="text-2xl">+</span>
													</div>
													<div>
														<div className="font-semibold text-slate-900">Add a {slot} meal</div>
														<div className="mt-1 text-sm text-slate-500">Open the picker, search meals, and assign one to this slot.</div>
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

			{/* ── Food picker modal ── */}
			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
					<div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
						<div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-700 p-5 text-white">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
										Meal picker
									</div>
									<h3 className="mt-3 text-2xl font-bold">
										{modal.day} · {SLOT_LABELS[modal.slot]}
									</h3>
									<p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
										Meals matching {SLOT_MEAL_MAP[modal.slot]} are prioritised first. Allergy conflicts stay highlighted so you can decide carefully.
									</p>
								</div>
								<button
									type="button"
									className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
									onClick={() => {
										setModal(null);
										setSearch("");
									}}
								>
									Close
								</button>
							</div>

							<label className="relative mt-4 block">
								<Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
								<input
									autoFocus
									className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder-white/55 outline-none transition focus:border-white/20 focus:bg-white/15"
									placeholder="Search meals by name, category, or meal tag"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</label>
						</div>

						<div className="flex-1 overflow-y-auto p-5">
							{modalItems.length === 0 ? (
								<div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
									No meals match the current search.
								</div>
							) : (
								<div className="grid gap-4 md:grid-cols-2">
									{modalItems.map((item) => {
										const allergyWarn = hasAllergyConflict(item);
										const mealMatch = item.meal === SLOT_MEAL_MAP[modal.slot];

										return (
											<button
												key={item._id}
												type="button"
												className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${allergyWarn ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white"}`}
												onClick={() => handlePickMeal(item)}
											>
												<div className="flex items-start gap-4">
													{item.image_url ? (
														<img src={item.image_url} alt={item.name} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" />
													) : (
														<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
															🍽️
														</div>
													)}

													<div className="min-w-0 flex-1">
														<div className="flex flex-wrap gap-2">
															<span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${mealMatch ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
																{item.meal || "FLEXIBLE"}
															</span>
															{allergyWarn ? (
																<span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
																	Allergy alert
																</span>
															) : null}
														</div>

														<div className="mt-3 text-lg font-bold text-slate-900">{item.name}</div>
														<div className="mt-1 text-sm text-slate-500">{item.category || "Food item"}</div>
														<div className="mt-3 text-sm font-semibold text-slate-900">{formatCurrency(item.price)}</div>
														{allergyWarn ? (
															<div className="mt-3 text-sm leading-6 text-amber-800">
																Matches one of your saved allergens. You can still choose it, but the conflict is intentional and visible.
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
