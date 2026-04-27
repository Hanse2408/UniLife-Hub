import {
	CalendarDays,
	ClipboardList,
	Search,
	ShoppingCart,
	UtensilsCrossed,
	Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
	addStudentFoodCartItemApi,
	getStudentFoodItemsApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_IMAGE =
	"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop";

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatTimeRange(start, end) {
	if (start && end) {
		return `${start} - ${end}`;
	}

	return start || end || "Schedule not listed";
}

function splitTags(value) {
	return String(value || "")
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

export default function BrowseFoodPage() {
	const { user } = useAuth();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [category, setCategory] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [actingItemId, setActingItemId] = useState("");

	useEffect(() => {
		const loadItems = async () => {
			try {
				setLoading(true);
				const { data } = await getStudentFoodItemsApi();
				setItems(data.items || []);
			} catch (error) {
				toast.error(error?.response?.data?.message || "Failed to load food items");
			} finally {
				setLoading(false);
			}
		};

		loadItems();
	}, []);

	const categories = useMemo(() => {
		const values = items.map((item) => item.category).filter(Boolean);
		return [...new Set(values)].sort((left, right) => left.localeCompare(right));
	}, [items]);

	const visibleItems = useMemo(() => {
		const normalizedQuery = searchTerm.trim().toLowerCase();

		return items.filter((item) => {
			const searchValue = [item.name, item.description, item.category, item.meal]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			const matchesCategory = !category || item.category === category;
			const matchesSearch = !normalizedQuery || searchValue.includes(normalizedQuery);

			return matchesCategory && matchesSearch;
		});
	}, [category, items, searchTerm]);

	const cheapestItem = useMemo(() => {
		if (!items.length) {
			return 0;
		}

		return Math.min(...items.map((item) => Number(item.price || 0)));
	}, [items]);

	const handleAddToCart = async (foodItemId) => {
		try {
			setActingItemId(foodItemId);
			const item = items.find((i) => i._id === foodItemId);
			// Check allergy conflict before adding
			const userAllergens = (user?.allergenNotes || []).map((a) => a.toLowerCase().trim());
			if (userAllergens.length > 0 && item) {
				const itemAllergens = splitTags(item.allergen_tags).map((t) => t.toLowerCase());
				const conflicts = itemAllergens.filter((t) => userAllergens.includes(t));
				if (conflicts.length > 0) {
					toast(
						`⚠️ "${item.name}" contains ${conflicts.join(", ")} which match your allergy profile.`,
						{ duration: 6000, style: { background: "#fef3c7", color: "#92400e", fontWeight: 600 } }
					);
				}
			}
			await addStudentFoodCartItemApi({ foodItemId, quantity: 1 });
			toast.success("Added to cart");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to add to cart");
		} finally {
			setActingItemId("");
		}
	};

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Student Food"
				title="Browse verified meals with better context before you order"
				description="Search meals, filter by category, and see dietary info and prices — all on one screen."
				backgroundImage={dashboardBanner}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Menu items"
					value={items.length}
					subtitle="Active dishes currently available from verified vendors."
					tone="amber"
					icon={UtensilsCrossed}
				/>
				<StatCard
					title="Categories"
					value={categories.length}
					subtitle="Distinct menu groups available for browsing right now."
					tone="blue"
					icon="🏷️"
				/>
				<StatCard
					title="Filtered results"
					value={visibleItems.length}
					subtitle="Items matching the current search and category filters."
					tone="indigo"
					icon={Search}
				/>
				<StatCard
					title="Budget check"
					value={items.length ? formatCurrency(cheapestItem) : "Not available"}
					subtitle="The lowest current menu price if you need a cheaper next meal."
					tone="emerald"
					icon={Wallet}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<QuickActionCard
					to="/student/food/cart"
					icon={ShoppingCart}
					title="Review your cart"
					description="Jump into the checkout queue and confirm what is already waiting to be paid."
					tone="indigo"
					eyebrow="Checkout"
					ctaLabel="Open"
				/>
				<QuickActionCard
					to="/student/food/orders"
					icon={ClipboardList}
					title="Track current orders"
					description="See which meals are in processing, delivery, or already completed."
					tone="emerald"
					eyebrow="Tracking"
					ctaLabel="Review"
				/>
				<QuickActionCard
					to="/student/food/meal-planner"
					icon={CalendarDays}
					title="Plan around the menu"
					description="Use the weekly planner when you want more structure than one-off ordering."
					tone="blue"
					eyebrow="Planning"
					ctaLabel="Plan"
				/>
			</div>

			<div className="card p-5">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
					<div>
						<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
							Menu filters
						</div>
						<h3 className="mt-2 text-2xl font-bold text-slate-900">
							Narrow the menu before you add the next dish
						</h3>
					</div>
					<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
						{visibleItems.length} results
					</div>
				</div>

				<div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
					<label className="relative block">
						<Search
							size={18}
							className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
						/>
						<input
							className="input pl-11"
							placeholder="Search meals by name, category, meal slot, or description"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
						/>
					</label>

					<div className="flex flex-wrap gap-2 xl:justify-end">
						<button
							type="button"
							className={category === "" ? "btn-primary" : "btn-secondary"}
							onClick={() => setCategory("")}
						>
							All categories
						</button>

						{categories.map((cat) => (
							<button
								key={cat}
								type="button"
								className={category === cat ? "btn-primary" : "btn-secondary"}
								onClick={() => setCategory(cat)}
							>
								{cat}
							</button>
						))}
					</div>
				</div>
			</div>

			{loading ? (
				<LoadingState
					title="Loading available meals"
					description="Preparing the current student menu with prices, category data, and vendor availability."
				/>
			) : items.length === 0 ? (
				<EmptyState
					icon="🍛"
					title="No food items are available right now"
					description="There are currently no active food items published by vendors. Check back later or open the planner once more options appear."
					tone="amber"
					action={
						<Link to="/student/food" className="btn-primary">
							Return to food hub
						</Link>
					}
				/>
			) : visibleItems.length === 0 ? (
				<EmptyState
					compact
					icon="🔎"
					title="No meals match the current filters"
					description="Clear the search or switch categories to see the full student food menu again."
					tone="slate"
					action={
						<button
							type="button"
							className="btn-secondary"
							onClick={() => {
								setSearchTerm("");
								setCategory("");
							}}
						>
							Clear filters
						</button>
					}
				/>
			) : (
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					{visibleItems.map((item) => {
						const dietTags = splitTags(item.diet_tags).slice(0, 3);
						const allergenTags = splitTags(item.allergen_tags).slice(0, 2);

						return (
							<article key={item._id} className="card overflow-hidden">
								<div className="h-56 overflow-hidden bg-slate-100">
									<img
										src={item.image_url || FALLBACK_IMAGE}
										alt={item.name}
										className="h-full w-full object-cover"
										onError={(event) => {
											event.currentTarget.src = FALLBACK_IMAGE;
										}}
									/>
								</div>

								<div className="p-5">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="flex flex-wrap gap-2">
												<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
													{item.category || "Menu item"}
												</span>
												{item.meal ? (
													<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
														{item.meal}
													</span>
												) : null}
											</div>
											<h3 className="mt-3 text-xl font-bold text-slate-900">
												{item.name}
											</h3>
										</div>

										<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
											Active
										</span>
									</div>

									<p className="mt-4 text-sm leading-6 text-slate-600">
										{item.description || "No description available for this meal yet."}
									</p>

									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<div className="rounded-2xl bg-slate-50 p-3">
											<div className="text-xs uppercase tracking-[0.18em] text-slate-500">
												Availability
											</div>
											<div className="mt-2 text-sm font-semibold text-slate-900">
												{formatTimeRange(
													item.available_time_start,
													item.available_time_end
												)}
											</div>
										</div>
										<div className="rounded-2xl bg-slate-50 p-3">
											<div className="text-xs uppercase tracking-[0.18em] text-slate-500">
												Price
											</div>
											<div className="mt-2 text-lg font-black text-slate-900">
												{formatCurrency(item.price)}
											</div>
										</div>
									</div>

									{dietTags.length > 0 ? (
										<div className="mt-4">
											<div className="text-sm font-semibold text-slate-700">
												Diet tags
											</div>
											<div className="mt-2 flex flex-wrap gap-2">
												{dietTags.map((tag) => (
													<span
														key={tag}
														className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
													>
														{tag}
													</span>
												))}
											</div>
										</div>
									) : null}

									{allergenTags.length > 0 ? (
										<div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
											<span className="font-semibold">Allergen notes:</span>{" "}
											{allergenTags.join(", ")}
										</div>
									) : null}

									<div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
										<div>
											<div className="text-xs uppercase tracking-[0.18em] text-slate-500">
												Next step
											</div>
											<div className="mt-1 text-sm font-semibold text-slate-900">
												Add to cart or keep browsing
											</div>
										</div>

										<button
											type="button"
											className="btn-primary"
											disabled={actingItemId === item._id}
											onClick={() => handleAddToCart(item._id)}
										>
											{actingItemId === item._id ? "Adding..." : "Add to cart"}
										</button>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}
