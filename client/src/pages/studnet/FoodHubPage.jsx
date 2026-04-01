import {
    CalendarDays,
    Clock,
    ClipboardList,
    Search,
    ShoppingCart,
    Tag,
    UtensilsCrossed,
    Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getStudentFoodBudgetSummaryApi,
    getStudentCurrentMealPlanApi,
    getStudentFoodCartApi,
    getStudentFoodOrdersApi,
    getStudentFoodItemsApi,
    addStudentFoodCartItemApi,
} from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}


function countPlannedMeals(plan) {
    if (!plan?.mealSlots?.length) return 0;
    return plan.mealSlots.reduce((sum, day) => {
        return sum + ["breakfast", "lunch", "dinner"].filter((slot) => day.meals?.[slot]?.name).length;
    }, 0);
}

function countActiveOrders(orders) {
    return orders.filter(
        (order) => !["delivered", "cancelled"].includes(String(order.order_status || "").toLowerCase())
    ).length;
}

export default function FoodHubPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ cartLines: 0, activeOrders: 0, plannedMeals: 0, weeklyBudget: 0, spent: 0 });
    const [foodItems, setFoodItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedMeal, setSelectedMeal] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [loading, setLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [actingItemId, setActingItemId] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [cartRes, ordersRes, planRes, budgetRes] = await Promise.allSettled([
                    getStudentFoodCartApi(),
                    getStudentFoodOrdersApi(),
                    getStudentCurrentMealPlanApi(),
                    getStudentFoodBudgetSummaryApi(),
                ]);
                const cartItems = cartRes.status === "fulfilled" ? cartRes.value.data.items || [] : [];
                const orders = ordersRes.status === "fulfilled" ? ordersRes.value.data.orders || [] : [];
                const plan = planRes.status === "fulfilled" ? planRes.value.data.plan || null : null;
                const budget = budgetRes.status === "fulfilled" ? budgetRes.value.data || null : null;

                setSummary({
                    cartLines: cartItems.length,
                    activeOrders: countActiveOrders(orders),
                    plannedMeals: countPlannedMeals(plan),
                    weeklyBudget: Number(budget?.weeklyBudget || plan?.weekly_budget || 0),
                    spent: Number(budget?.spent || 0),
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setItemsLoading(true);
                const { data } = await getStudentFoodItemsApi();
                setFoodItems(data.items || []);
            } catch {
                setFoodItems([]);
            } finally {
                setItemsLoading(false);
            }
        })();
    }, []);

    const remainingBudget = summary.weeklyBudget - summary.spent;

    const categories = useMemo(
        () => [...new Set(foodItems.map((i) => i.category).filter(Boolean))].sort(),
        [foodItems],
    );

    const mealSlots = useMemo(
        () => [...new Set(foodItems.map((i) => i.meal).filter(Boolean))].sort(),
        [foodItems],
    );

    const filteredItems = foodItems.filter((item) => {
        if (selectedCategory && item.category !== selectedCategory) return false;
        if (selectedMeal && item.meal !== selectedMeal) return false;
        if (minPrice !== "" && Number(item.price) < Number(minPrice)) return false;
        if (maxPrice !== "" && Number(item.price) > Number(maxPrice)) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return [item.name, item.description, item.category, item.meal]
            .filter(Boolean).join(" ").toLowerCase().includes(q);
    });

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCategory("");
        setSelectedMeal("");
        setMinPrice("");
        setMaxPrice("");
    };

    const hasActiveFilters = searchTerm || selectedCategory || selectedMeal || minPrice || maxPrice;

    const handleAddToCart = async (foodItemId) => {
        try {
            setActingItemId(foodItemId);
            const item = foodItems.find((i) => i._id === foodItemId);
            // Check allergy conflict before adding
            const userAllergens = (user?.allergenNotes || []).map((a) => a.toLowerCase().trim());
            if (userAllergens.length > 0 && item) {
                const itemAllergens = (item.allergen_tags || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
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
                eyebrow="Student Portal"
                title="Food Hub"
                description="Browse meals, place orders, plan your week, and keep track of your spending."
                backgroundImage={dashboardBanner}
            />

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={ClipboardList}
                    title="My Food Orders"
                    description="Track order progress, payment, and delivery."
                    to="/student/food/orders"
                    tone="emerald"
                />
                <QuickActionCard
                    icon={ShoppingCart}
                    title="My Cart"
                    description="Review items and proceed to checkout."
                    to="/student/food/cart"
                    tone="indigo"
                />
                <QuickActionCard
                    icon={CalendarDays}
                    title="Meal Planner"
                    description="Plan your weekly meals and diet."
                    to="/student/food/meal-planner"
                    tone="blue"
                />
                <QuickActionCard
                    icon={Wallet}
                    title="Budget & Insights"
                    description="Track spending and get meal recommendations."
                    to="/student/food/budget"
                    tone="rose"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={ShoppingCart} title="Items in Cart" value={loading ? "—" : summary.cartLines} tone="indigo" />
                <StatCard icon={ClipboardList} title="Active Orders" value={loading ? "—" : summary.activeOrders} tone="amber" />
                <StatCard icon={CalendarDays} title="Planned Meals" value={loading ? "—" : summary.plannedMeals} tone="blue" />
                <StatCard
                    icon={Wallet}
                    title="Remaining Budget"
                    value={loading ? "—" : summary.weeklyBudget ? formatCurrency(remainingBudget) : "Not set"}
                    tone={remainingBudget < 0 ? "rose" : "emerald"}
                />
            </div>

            {/* Available Food Items */}
            <div className="card p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Available Food Items</h3>
                    <p className="text-sm text-slate-500">Browse meals from verified vendors.</p>
                </div>

                {/* ── Menu Filters ── */}
                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600">Menu Filters</p>
                        <span className="rounded-full bg-teal-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-600">
                            {filteredItems.length} {filteredItems.length === 1 ? "result" : "results"}
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        {/* Food Name */}
                        <label className="block xl:col-span-2">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Search size={16} className="text-slate-400" /> Food Name
                            </div>
                            <input
                                className="input"
                                placeholder="Search by name or description…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </label>

                        {/* Category */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Tag size={16} className="text-slate-400" /> Category
                            </div>
                            <select
                                className="select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>

                        {/* Meal Slot */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Clock size={16} className="text-slate-400" /> Meal Slot
                            </div>
                            <select
                                className="select"
                                value={selectedMeal}
                                onChange={(e) => setSelectedMeal(e.target.value)}
                            >
                                <option value="">All slots</option>
                                {mealSlots.map((slot) => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))}
                            </select>
                        </label>

                        {/* Min Price */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Wallet size={16} className="text-slate-400" /> Min Price
                            </div>
                            <input
                                type="number"
                                className="input"
                                placeholder="0"
                                min="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                            />
                        </label>

                        {/* Max Price */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Wallet size={16} className="text-slate-400" /> Max Price
                            </div>
                            <input
                                type="number"
                                className="input"
                                placeholder="5000"
                                min="0"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* Search & Reset */}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn-secondary text-sm"
                            onClick={handleResetFilters}
                        >
                            Reset Filters
                        </button>
                        <button
                            type="button"
                            className="btn-primary text-sm"
                            onClick={() => { }}
                        >
                            <Search size={14} /> Search
                        </button>
                    </div>
                </div>

                {/* ── Food Item Cards ── */}
                {itemsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <EmptyState
                        icon="🍛"
                        title="No food items found"
                        description={hasActiveFilters ? "Try adjusting your filters." : "No active food items from vendors right now. Check back later."}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredItems.slice(0, 6).map((item) => {
                            const dietTags = (item.diet_tags || "").split(",").map((t) => t.trim()).filter(Boolean);
                            const allergenTags = (item.allergen_tags || "").split(",").map((t) => t.trim()).filter(Boolean);
                            const hasAvailability = item.available_time_start && item.available_time_end;

                            return (
                                <div
                                    key={item._id}
                                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-amber-300 hover:shadow-md transition"
                                >
                                    <div className="h-40 overflow-hidden bg-slate-100">
                                        <img
                                            src={item.image_url || FALLBACK_IMAGE}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                        />
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* Badges */}
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                                {item.category || "Food"}
                                            </span>
                                            {item.is_active && (
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Name & description */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description || "No description"}</p>
                                        </div>

                                        {/* Availability & Price */}
                                        <div className="flex items-start gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                                            {hasAvailability && (
                                                <div>
                                                    <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">Availability</p>
                                                    <p className="font-medium text-slate-700">{item.available_time_start} – {item.available_time_end}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">Price</p>
                                                <p className="font-black text-slate-900">{formatCurrency(item.price)}</p>
                                            </div>
                                        </div>

                                        {/* Diet tags */}
                                        {dietTags.length > 0 && (
                                            <div>
                                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Diet tags</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {dietTags.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Allergen notes */}
                                        {allergenTags.length > 0 && (
                                            <div className="rounded-xl bg-rose-50 px-3 py-2">
                                                <p className="text-xs text-rose-600">
                                                    <span className="font-bold">Allergen notes: </span>
                                                    {allergenTags.join(", ")}
                                                </p>
                                            </div>
                                        )}

                                        {/* Add to cart footer */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Step</p>
                                                <p className="text-xs text-slate-500">Add to cart or keep browsing</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                                                disabled={actingItemId === item._id}
                                                onClick={() => handleAddToCart(item._id)}
                                            >
                                                {actingItemId === item._id ? "Adding…" : "Add to cart"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredItems.length > 6 && (
                    <div className="mt-4 text-center">
                        <Link
                            to="/student/food/browse"
                            className="text-sm font-semibold text-amber-600 hover:text-amber-700"
                        >
                            View all {filteredItems.length} items →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
