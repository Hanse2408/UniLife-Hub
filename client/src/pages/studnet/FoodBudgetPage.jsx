import {
	BadgeAlert,
	CalendarDays,
	Clock3,
	Lightbulb,
	ReceiptText,
	Sparkles,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
	getStudentFoodBudgetSummaryApi,
	getStudentEatNowRecommendationsApi,
	getStudentCurrentMealPlanApi,
} from "../../api/client";

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatPercent(value) {
	return `${Math.round(Number(value || 0))}%`;
}

export default function FoodBudgetPage() {
	const [summary, setSummary] = useState(null);
	const [recommendations, setRecommendations] = useState([]);
	const [plan, setPlan] = useState(null);
	const [loading, setLoading] = useState(true);

	const loadBudget = async () => {
		try {
			setLoading(true);

			const [summaryRes, recommendationsRes, planRes] = await Promise.allSettled([
				getStudentFoodBudgetSummaryApi(),
				getStudentEatNowRecommendationsApi(),
				getStudentCurrentMealPlanApi(),
			]);

			if (summaryRes.status === "fulfilled") {
				setSummary(summaryRes.value.data || null);
			}

			if (recommendationsRes.status === "fulfilled") {
				setRecommendations(recommendationsRes.value.data.items || []);
			}

			if (planRes.status === "fulfilled") {
				setPlan(planRes.value.data.plan || null);
			}
		} catch {
			toast.error("Failed to load budget data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadBudget();
	}, []);

	// Planned cost from meal plan
	const plannedCost = useMemo(() => {
		if (!plan?.mealSlots?.length) return 0;
		return plan.mealSlots.reduce((sum, day) => {
			return (
				sum +
				["breakfast", "lunch", "dinner"].reduce(
					(s, slot) => s + Number(day.meals?.[slot]?.price || 0),
					0,
				)
			);
		}, 0);
	}, [plan]);

	const weeklyBudget = summary?.weeklyBudget || plan?.weekly_budget || 0;
	const spent = summary?.spent || 0;
	const spendPercent = weeklyBudget > 0 ? Math.min(100, Math.round((spent / weeklyBudget) * 100)) : 0;
	const planPercent = weeklyBudget > 0 ? Math.min(100, Math.round((plannedCost / weeklyBudget) * 100)) : 0;
	const remaining = weeklyBudget - spent;
	const isOverSpent = weeklyBudget > 0 && spent > weeklyBudget;
	const isPlanOverBudget = weeklyBudget > 0 && plannedCost > weeklyBudget;
	const plannedMeals = useMemo(() => {
		if (!plan?.mealSlots?.length) return 0;
		return plan.mealSlots.reduce((sum, day) => {
			return sum + ["breakfast", "lunch", "dinner"].filter((slot) => day.meals?.[slot]?.name).length;
		}, 0);
	}, [plan]);
	const averageSpendPerMeal = plannedMeals ? spent / plannedMeals : 0;
	const cushionAfterPlanned = weeklyBudget - plannedCost;

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHero eyebrow="Student Food" title="Budget Tracker" description="Track your weekly food spending." backgroundImage={dashboardBanner} />
				<LoadingState
					title="Loading budget tracker"
					description="Collecting your weekly spend, planned meal totals, and current recommendations."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Student Food"
				title="See weekly food spend before it quietly runs ahead of you"
				description="Compare actual spending, planned meal cost, and affordable next options from one clearer budget view."
				backgroundImage={dashboardBanner}
			/>

			{/* ── No budget set ── */}
			{!weeklyBudget && (
				<EmptyState
					icon="💰"
					title="No weekly budget has been set yet"
					description="Set the weekly budget in the meal planner first. After that, this page can track real spend, planned cost, and cheaper alternatives."
					tone="amber"
					action={
						<Link to="/student/food/meal-planner" className="btn-primary">
							Set budget in planner
						</Link>
					}
				/>
			)}

			{/* ── Main budget cards ── */}
			{weeklyBudget > 0 && (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard
							title="Weekly budget"
							value={formatCurrency(weeklyBudget)}
							subtitle="The target budget currently saved to the active weekly meal plan."
							tone="indigo"
							icon={Wallet}
						/>

						<StatCard
							title="Actual spent"
							value={formatCurrency(spent)}
							subtitle="Recorded weekly spend based on the order history summary endpoint."
							tone={isOverSpent ? "rose" : "emerald"}
							icon={ReceiptText}
						/>

						<StatCard
							title="Remaining"
							value={formatCurrency(remaining)}
							subtitle="Budget headroom left after the week's actual recorded spending."
							tone={remaining < 0 ? "rose" : "amber"}
							icon={BadgeAlert}
						/>

						<StatCard
							title="Planned cost"
							value={formatCurrency(plannedCost)}
							subtitle="Total cost of meals currently assigned in the meal planner."
							tone={isPlanOverBudget ? "amber" : "blue"}
							icon={CalendarDays}
						/>
					</div>

					{/* ── Progress bars ── */}
					<section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
						<div className="card p-6 space-y-6">
							<div>
								<div className="mb-2 flex items-center justify-between text-sm">
									<span className="font-semibold text-slate-700">Actual spending</span>
									<span className={`font-bold ${spendPercent >= 100 ? "text-rose-600" : spendPercent >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
										{formatPercent(summary?.percent || spendPercent)}
									</span>
								</div>
								<div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
									<div
										className={`h-full rounded-full transition-all ${spendPercent >= 100 ? "bg-rose-500" : spendPercent >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
										style={{ width: `${spendPercent}%` }}
									/>
								</div>
								<div className="mt-2 text-xs text-slate-400">
									{formatCurrency(spent)} of {formatCurrency(weeklyBudget)} spent this week
								</div>
							</div>

							<div>
								<div className="mb-2 flex items-center justify-between text-sm">
									<span className="font-semibold text-slate-700">Planned meal cost</span>
									<span className={`font-bold ${planPercent >= 100 ? "text-amber-600" : "text-indigo-600"}`}>
										{formatPercent(planPercent)}
									</span>
								</div>
								<div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
									<div
										className={`h-full rounded-full transition-all ${planPercent >= 100 ? "bg-amber-400" : "bg-indigo-400"}`}
										style={{ width: `${Math.min(planPercent, 100)}%` }}
									/>
								</div>
								<div className="mt-2 text-xs text-slate-400">
									{formatCurrency(plannedCost)} planned across {plannedMeals} meal slot{plannedMeals === 1 ? "" : "s"}
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-3">
								<div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
									<div className="text-sm text-slate-500">Cushion after planned</div>
									<div className={`mt-2 text-xl font-black ${cushionAfterPlanned < 0 ? "text-amber-700" : "text-slate-900"}`}>
										{formatCurrency(cushionAfterPlanned)}
									</div>
								</div>

								<div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
									<div className="text-sm text-slate-500">Average spend per planned meal</div>
									<div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(averageSpendPerMeal)}</div>
								</div>

								<div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
									<div className="text-sm text-slate-500">Planner coverage</div>
									<div className="mt-2 text-xl font-black text-slate-900">{plannedMeals}/21</div>
								</div>
							</div>
						</div>

						<div className="card overflow-hidden border border-indigo-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
							<div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
								Budget readout
							</div>
							<h3 className="mt-4 text-2xl font-bold">
								{isOverSpent
									? "The week has already moved beyond the budget target."
									: spendPercent >= 80
										? "The week is close to budget pressure."
										: "You still have room to steer the week deliberately."}
							</h3>
							<div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
								<p>
									{summary?.alert || "Use actual spend and planned cost together: one shows what has already happened, the other shows where the week is heading."}
								</p>
								<p>
									If planned cost is high but actual spend is still moderate, the planner is the right place to adjust before new orders land.
								</p>
							</div>
						</div>
					</section>

					{/* ── Budget alert ── */}
					{(isOverSpent || spendPercent >= 80) && (
						<div className={`card p-5 ${isOverSpent ? "border-l-4 border-rose-500 bg-rose-50" : "border-l-4 border-amber-400 bg-amber-50"}`}>
							<div className={`flex items-center gap-2 font-semibold ${isOverSpent ? "text-rose-700" : "text-amber-700"}`}>
								<BadgeAlert size={18} />
								{isOverSpent
									? `You are ${formatCurrency(spent - weeklyBudget)} above the weekly budget.`
									: `You have already used ${formatPercent(spendPercent)} of the weekly budget.`}
							</div>
							{summary?.suggestions?.length > 0 ? (
								<p className="mt-2 text-sm leading-6 text-amber-700">
									Budget-friendly suggestions are listed below to help the next order land more softly.
								</p>
							) : null}
						</div>
					)}

					{/* ── Meals grid from plan ── */}
					{plan?.mealSlots?.length > 0 && (
						<div className="card p-6">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Planner connection</div>
									<h3 className="mt-2 text-2xl font-bold text-slate-900">This week's planned meals</h3>
								</div>
								<Link to="/student/food/meal-planner" className="btn-secondary">
									Edit plan
								</Link>
							</div>
							<div className="mt-4 space-y-3">
								{plan.mealSlots.map((day) => {
									const dayTotal = ["breakfast", "lunch", "dinner"].reduce(
										(s, slot) => s + Number(day.meals?.[slot]?.price || 0),
										0,
									);
									const hasMeals = ["breakfast", "lunch", "dinner"].some((s) => day.meals?.[s]?.name);
									if (!hasMeals) return null;

									return (
										<div key={day.day} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-slate-800">{day.day}</span>
												<span className="text-sm font-bold text-slate-700">
													{formatCurrency(dayTotal)}
												</span>
											</div>
											<div className="mt-2 flex flex-wrap gap-2">
												{["breakfast", "lunch", "dinner"].map((slot) => {
													const meal = day.meals?.[slot];
													if (!meal?.name) return null;
													return (
														<div key={slot} className="rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm">
															<span className="capitalize text-slate-400">{slot}: </span>
															<span className="font-medium text-slate-700">{meal.name}</span>
															<span className="ml-1 text-slate-400">
																({formatCurrency(meal.price)})
															</span>
														</div>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ── Recommendations & suggestions ── */}
					<div className="grid gap-6 lg:grid-cols-2">
						{summary?.suggestions?.length > 0 && (
							<div className="card p-6">
								<div className="flex items-center gap-2 text-lg font-bold text-slate-900">
									<Lightbulb size={20} className="text-amber-500" />
									Budget-friendly options
								</div>
								<p className="mt-1 text-sm text-slate-500">
									Cheapest meals to help stay within budget.
								</p>
								<div className="mt-4 space-y-3">
									{summary.suggestions.map((item) => (
										<div key={item._id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
											{item.image_url ? (
												<img
													src={item.image_url}
													alt={item.name}
													className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
												/>
											) : (
												<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 text-lg">
													🍽️
												</div>
											)}
											<div className="flex-1">
												<div className="font-semibold text-slate-900">{item.name}</div>
												<div className="text-xs text-slate-500">{item.category}</div>
											</div>
											<div className="font-bold text-emerald-600">
												{formatCurrency(item.price || 0)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{recommendations.length > 0 && (
							<div className="card p-6">
								<div className="flex items-center gap-2 text-lg font-bold text-slate-900">
									<Clock3 size={20} className="text-indigo-500" />
									Available right now
								</div>
								<p className="mt-1 text-sm text-slate-500">
									Meals currently available based on your preferences.
								</p>
								<div className="mt-4 space-y-3">
									{recommendations.map((item) => (
										<div key={item._id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
											{item.image_url ? (
												<img
													src={item.image_url}
													alt={item.name}
													className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
												/>
											) : (
												<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 text-lg">
													🍽️
												</div>
											)}
											<div className="flex-1">
												<div className="font-semibold text-slate-900">{item.name}</div>
												<div className="text-xs text-slate-500">{item.category}</div>
											</div>
											<div className="font-bold text-slate-900">
												{formatCurrency(item.price || 0)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
