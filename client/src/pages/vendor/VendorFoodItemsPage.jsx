import {
	Bell,
	ClipboardList,
	Clock3,
	ImagePlus,
	PencilLine,
	Search,
	Sparkles,
	Trash2,
	UtensilsCrossed,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
	createVendorFoodItemApi,
	deleteVendorFoodItemApi,
	getVendorFoodItemsApi,
	updateVendorFoodItemApi,
} from "../../api/client";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const CATEGORY_OPTIONS = [
	"RICE DISHES",
	"NOODLES",
	"KOTTU",
	"CURRIES",
	"STIR FRY",
	"GRILLS & BBQ",
	"SEAFOOD",
	"PASTA",
	"PIZZA",
	"ROLLS",
	"SANDWICHES & BURGERS",
	"SALAD",
	"SOUPS",
	"SNACKS & SIDES",
	"CAKE & PASTRIES",
	"BEVERAGES",
	"PURE VEG",
];

const MEAL_OPTIONS = ["BREAKFAST", "LUNCH", "DINNER", "DESSERT", "TEA TIME"];

const DIET_TAG_OPTIONS = [
	"Vegan",
	"Vegetarian",
	"Non-Vegetarian",
	"Halal",
	"Gluten-Free",
	"Dairy-Free",
	"Keto",
	"Low-Carb",
	"High-Protein",
	"Sugar-Free",
];

const ALLERGEN_OPTIONS = [
	"Milk",
	"Eggs",
	"Peanuts",
	"Tree Nuts",
	"Wheat",
	"Soy",
	"Fish",
	"Shellfish",
	"Sesame",
	"Sulfites",
];

const initialForm = {
	name: "",
	description: "",
	price: "",
	category: CATEGORY_OPTIONS[0],
	meal: MEAL_OPTIONS[0],
	diet_tags: "",
	allergen_tags: "",
	available_time_start: "08:00",
	available_time_end: "22:00",
	image_url: "",
};

function formatCurrency(amount) {
	return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function splitTags(value) {
	return String(value || "")
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function formatTimeRange(start, end) {
	if (!start && !end) {
		return "Available all day";
	}

	if (start && end) {
		return `${start} - ${end}`;
	}

	return start || end || "Schedule not set";
}

function scrollToEditor() {
	document.getElementById("vendor-item-editor")?.scrollIntoView({
		behavior: "smooth",
		block: "start",
	});
}

export default function VendorFoodItemsPage() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState(initialForm);
	const [editingId, setEditingId] = useState(null);
	const [saving, setSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [imagePreview, setImagePreview] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [activityFilter, setActivityFilter] = useState("all");
	const [actingItemId, setActingItemId] = useState("");

	const loadItems = async () => {
		try {
			setLoading(true);
			const { data } = await getVendorFoodItemsApi();
			setItems(data.items || []);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to load food items");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadItems();
	}, []);

	const handleImageChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onloadend = () => {
			const dataUrl = String(reader.result || "");
			setForm((previous) => ({ ...previous, image_url: dataUrl }));
			setImagePreview(dataUrl);
		};
		reader.readAsDataURL(file);
	};

	const resetForm = () => {
		setForm(initialForm);
		setEditingId(null);
		setImagePreview("");
	};

	const handleTagToggle = (field, value) => {
		setForm((previous) => {
			const current = splitTags(previous[field]);
			const updated = current.includes(value)
				? current.filter((tag) => tag !== value)
				: [...current, value];

			return { ...previous, [field]: updated.join(", ") };
		});
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!form.name || !form.price || !form.category) {
			toast.error("Name, price, and category are required");
			return;
		}

		if (/\d/.test(form.name)) {
			toast.error("Food item name cannot include numbers");
			return;
		}

		try {
			setSaving(true);

			const payload = {
				...form,
				price: Number(form.price),
			};

			if (editingId) {
				await updateVendorFoodItemApi(editingId, payload);
				toast.success("Food item updated successfully");
			} else {
				await createVendorFoodItemApi(payload);
				toast.success("Food item created successfully");
			}

			await loadItems();
			resetForm();
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to save food item");
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (item) => {
		setEditingId(item._id);
		setForm({
			name: item.name || "",
			description: item.description || "",
			price: item.price != null ? String(item.price) : "",
			category: item.category || CATEGORY_OPTIONS[0],
			meal: item.meal || MEAL_OPTIONS[0],
			diet_tags: item.diet_tags || "",
			allergen_tags: item.allergen_tags || "",
			available_time_start: item.available_time_start || "08:00",
			available_time_end: item.available_time_end || "22:00",
			image_url: item.image_url || "",
		});
		setImagePreview(item.image_url || "");
		scrollToEditor();
	};

	const handleDelete = async () => {
		if (!deleteTarget) {
			return;
		}

		try {
			setActingItemId(deleteTarget._id);
			await deleteVendorFoodItemApi(deleteTarget._id);
			toast.success("Food item deleted successfully");
			setDeleteTarget(null);
			await loadItems();
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to delete food item");
		} finally {
			setActingItemId("");
		}
	};

	const handleToggleActive = async (item) => {
		try {
			setActingItemId(item._id);
			await updateVendorFoodItemApi(item._id, {
				is_active: !item.is_active,
			});
			toast.success("Food item status updated");
			await loadItems();
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to update status");
		} finally {
			setActingItemId("");
		}
	};

	const selectedDietTags = splitTags(form.diet_tags);
	const selectedAllergenTags = splitTags(form.allergen_tags);
	const activeItems = items.filter((item) => item.is_active).length;
	const inactiveItems = items.length - activeItems;
	const averagePrice = items.length
		? items.reduce((sum, item) => sum + Number(item.price || 0), 0) / items.length
		: 0;

	const visibleItems = items.filter((item) => {
		const searchValue = [item.name, item.category, item.meal, item.description]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		const normalizedQuery = searchTerm.trim().toLowerCase();
		const matchesSearch = !normalizedQuery || searchValue.includes(normalizedQuery);
		const matchesActivity =
			activityFilter === "all"
				? true
				: activityFilter === "active"
					? item.is_active
					: !item.is_active;

		return matchesSearch && matchesActivity;
	});

	const actionCards = [
		{
			to: "/vendor/orders",
			icon: ClipboardList,
			title: "Jump into orders",
			description: "Move directly from catalog work into the active fulfilment queue.",
			tone: "indigo",
			eyebrow: "Queue",
			ctaLabel: "Open",
		},
		{
			to: "/vendor/sales",
			icon: Wallet,
			title: "Review sales impact",
			description: "Check whether menu size and pricing are translating into better order totals.",
			tone: "emerald",
			eyebrow: "Revenue",
			ctaLabel: "Review",
		},
		{
			to: "/vendor/notifications",
			icon: Bell,
			title: "Watch admin updates",
			description: "Keep platform messages visible while you refine your menu presentation.",
			tone: "blue",
			eyebrow: "Alerts",
			ctaLabel: "Check",
		},
	];

	return (
		<>
			<div className="space-y-6">
				<PageHero
					eyebrow="Vendor Menu"
					title="Build a menu that is easy to manage and easy to order from"
					description="Add, edit, and manage your menu items from one place."
					backgroundImage={dashboardBanner}
				/>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="Total items"
						value={items.length}
						subtitle="All food items currently attached to your vendor catalog."
						tone="amber"
						icon={UtensilsCrossed}
					/>
					<StatCard
						title="Active menu"
						value={activeItems}
						subtitle="Items students can currently see when the menu is live."
						tone="emerald"
						icon="🟢"
					/>
					<StatCard
						title="Inactive items"
						value={inactiveItems}
						subtitle="Draft, paused, or retired dishes still saved to your vendor account."
						tone="slate"
						icon="⏸️"
					/>
					<StatCard
						title="Average price"
						value={formatCurrency(averagePrice)}
						subtitle="A quick pricing sense check using your current stored menu values."
						tone="indigo"
						icon={Sparkles}
					/>
				</div>

				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{actionCards.map((action) => (
						<QuickActionCard key={action.title} {...action} />
					))}
				</section>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:items-start">
					<div className="space-y-6">
						<div className="card p-5">
							<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
										Catalog browser
									</div>
									<h3 className="mt-2 text-2xl font-bold text-slate-900">Keep menu management under control</h3>
								</div>
								<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
									{visibleItems.length} of {items.length} items shown
								</div>
							</div>

							<div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
								<label className="relative block">
									<Search
										size={18}
										className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
									/>
									<input
										className="input pl-11"
										placeholder="Search by dish name, category, meal, or description"
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
									/>
								</label>

								<select
									className="select"
									value={activityFilter}
									onChange={(event) => setActivityFilter(event.target.value)}
								>
									<option value="all">All items</option>
									<option value="active">Active only</option>
									<option value="inactive">Inactive only</option>
								</select>
							</div>
						</div>

						{loading ? (
							<LoadingState
								title="Loading menu items"
								description="Fetching your current food catalog, availability windows, and item status flags."
							/>
						) : items.length === 0 ? (
							<EmptyState
								icon="🍜"
								title="No food items have been created yet"
								description="Create your first dish to start building a vendor menu students can browse and order from."
								tone="amber"
								action={
									<button
										type="button"
										className="btn-primary"
										onClick={() => {
											resetForm();
											scrollToEditor();
										}}
									>
										Create first dish
									</button>
								}
							/>
						) : visibleItems.length === 0 ? (
							<EmptyState
								compact
								icon="🔎"
								title="No menu items match the current filters"
								description="Try a broader search or switch back to all items to see the full catalog."
								tone="slate"
								action={
									<button
										type="button"
										className="btn-secondary"
										onClick={() => {
											setSearchTerm("");
											setActivityFilter("all");
										}}
									>
										Clear filters
									</button>
								}
							/>
						) : (
							<div className="space-y-5">
								{visibleItems.map((item) => {
									const dietTags = splitTags(item.diet_tags);
									const allergenTags = splitTags(item.allergen_tags);
									const busy = actingItemId === item._id;

									return (
										<article key={item._id} className="card overflow-hidden">
											<div className="grid gap-0 lg:grid-cols-[240px_1fr]">
												<div className="relative min-h-[220px] bg-slate-100">
													{item.image_url ? (
														<img
															src={item.image_url}
															alt={item.name}
															className="absolute inset-0 h-full w-full object-cover"
														/>
													) : (
														<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-white text-amber-600">
															<ImagePlus size={40} strokeWidth={1.8} />
														</div>
													)}

													<div
														className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${item.is_active
															? "bg-emerald-100 text-emerald-700"
															: "bg-slate-900/85 text-white"
															}`}
													>
														{item.is_active ? "Active" : "Inactive"}
													</div>
												</div>

												<div className="p-5 sm:p-6">
													<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
														<div>
															<div className="flex flex-wrap gap-2">
																<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
																	{item.category}
																</span>
																{item.meal ? (
																	<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
																		{item.meal}
																	</span>
																) : null}
															</div>
															<h3 className="mt-3 text-2xl font-bold text-slate-900">{item.name}</h3>
															<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
																{item.description || "No description has been added for this dish yet."}
															</p>
														</div>

														<div className="rounded-3xl bg-indigo-50 px-5 py-4 text-right">
															<div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
																Price
															</div>
															<div className="mt-2 text-2xl font-black text-indigo-700">
																{formatCurrency(item.price)}
															</div>
														</div>
													</div>

													<div className="mt-5 grid gap-3 md:grid-cols-3">
														<div className="rounded-2xl bg-slate-50 p-4">
															<div className="text-sm text-slate-500">Availability</div>
															<div className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
																<Clock3 size={16} className="text-slate-400" />
																{formatTimeRange(item.available_time_start, item.available_time_end)}
															</div>
														</div>
														<div className="rounded-2xl bg-slate-50 p-4">
															<div className="text-sm text-slate-500">Diet tags</div>
															<div className="mt-2 font-semibold text-slate-900">
																{dietTags.length ? `${dietTags.length} selected` : "None added"}
															</div>
														</div>
														<div className="rounded-2xl bg-slate-50 p-4">
															<div className="text-sm text-slate-500">Allergen notes</div>
															<div className="mt-2 font-semibold text-slate-900">
																{allergenTags.length ? `${allergenTags.length} listed` : "None added"}
															</div>
														</div>
													</div>

													{dietTags.length > 0 ? (
														<div className="mt-5">
															<div className="text-sm font-semibold text-slate-700">Diet profile</div>
															<div className="mt-3 flex flex-wrap gap-2">
																{dietTags.map((tag) => (
																	<span
																		key={tag}
																		className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
																	>
																		{tag}
																	</span>
																))}
															</div>
														</div>
													) : null}

													{allergenTags.length > 0 ? (
														<div className="mt-4">
															<div className="text-sm font-semibold text-slate-700">Allergen notes</div>
															<div className="mt-3 flex flex-wrap gap-2">
																{allergenTags.map((tag) => (
																	<span
																		key={tag}
																		className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
																	>
																		{tag}
																	</span>
																))}
															</div>
														</div>
													) : null}

													<div className="mt-6 flex flex-wrap gap-3">
														<button
															type="button"
															className="btn-secondary"
															onClick={() => handleEdit(item)}
															disabled={saving || busy}
														>
															<span className="inline-flex items-center gap-2">
																<PencilLine size={16} />
																Edit
															</span>
														</button>

														<button
															type="button"
															className="btn-secondary"
															onClick={() => handleToggleActive(item)}
															disabled={saving || busy}
														>
															{busy
																? "Updating..."
																: item.is_active
																	? "Deactivate"
																	: "Activate"}
														</button>

														<button
															type="button"
															className="btn-danger"
															onClick={() => setDeleteTarget(item)}
															disabled={saving || busy}
														>
															<span className="inline-flex items-center gap-2">
																<Trash2 size={16} />
																Delete
															</span>
														</button>
													</div>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</div>

					<div className="space-y-6 xl:sticky xl:top-6">
						<div id="vendor-item-editor" className="card p-6">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
										{editingId ? "Editing dish" : "New dish draft"}
									</div>
									<h3 className="mt-2 text-2xl font-bold text-slate-900">
										{editingId ? "Update menu item" : "Create a menu item"}
									</h3>
									<p className="mt-2 text-sm leading-6 text-slate-600">
										Keep names clear, avoid numbers in dish names, and use tags to help students choose faster.
									</p>
								</div>

								{editingId ? (
									<button type="button" className="btn-secondary" onClick={resetForm}>
										Cancel edit
									</button>
								) : null}
							</div>

							<div className="mt-5 overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50">
								{imagePreview ? (
									<img
										src={imagePreview}
										alt="Preview"
										className="h-48 w-full object-cover"
									/>
								) : (
									<div className="flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 via-white to-amber-50 text-slate-400">
										<div className="text-center">
											<ImagePlus className="mx-auto" size={36} strokeWidth={1.8} />
											<div className="mt-3 text-sm font-medium">Image preview appears here</div>
										</div>
									</div>
								)}
							</div>

							<form className="mt-6 space-y-5" onSubmit={handleSubmit}>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="md:col-span-2">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											Food name <span className="text-rose-500">*</span>
										</label>
										<input
											className="input"
											placeholder="e.g. Chicken Fried Rice"
											value={form.name}
											onChange={(event) =>
												setForm((previous) => ({
													...previous,
													name: event.target.value.replace(/\d/g, ""),
												}))
											}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											Price (LKR) <span className="text-rose-500">*</span>
										</label>
										<input
											type="number"
											className="input"
											placeholder="e.g. 350"
											value={form.price}
											onChange={(event) =>
												setForm((previous) => ({ ...previous, price: event.target.value }))
											}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											Category <span className="text-rose-500">*</span>
										</label>
										<select
											className="select"
											value={form.category}
											onChange={(event) =>
												setForm((previous) => ({ ...previous, category: event.target.value }))
											}
										>
											{CATEGORY_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">Meal slot</label>
										<select
											className="select"
											value={form.meal}
											onChange={(event) =>
												setForm((previous) => ({ ...previous, meal: event.target.value }))
											}
										>
											{MEAL_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</div>

									<div className="md:col-span-2">
										<label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
										<textarea
											rows="4"
											className="input min-h-[120px] resize-none"
											placeholder="Describe the dish, ingredients, or serving style..."
											value={form.description}
											onChange={(event) =>
												setForm((previous) => ({ ...previous, description: event.target.value }))
											}
										/>
									</div>
								</div>

								<div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
									<div className="text-sm font-semibold text-slate-900">Diet tags</div>
									<p className="mt-1 text-sm text-slate-500">
										Mark dietary suitability so students can filter confidently.
									</p>
									<div className="mt-4 flex flex-wrap gap-2">
										{DIET_TAG_OPTIONS.map((tag) => {
											const selected = selectedDietTags.includes(tag);

											return (
												<button
													key={tag}
													type="button"
													aria-pressed={selected}
													onClick={() => handleTagToggle("diet_tags", tag)}
													className={`rounded-full px-3 py-2 text-sm font-medium transition ${selected
														? "bg-emerald-600 text-white shadow-sm"
														: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
														}`}
												>
													{tag}
												</button>
											);
										})}
									</div>
								</div>

								<div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
									<div className="text-sm font-semibold text-slate-900">Allergen notes</div>
									<p className="mt-1 text-sm text-slate-500">
										List common allergens so students can review risk before ordering.
									</p>
									<div className="mt-4 flex flex-wrap gap-2">
										{ALLERGEN_OPTIONS.map((tag) => {
											const selected = selectedAllergenTags.includes(tag);

											return (
												<button
													key={tag}
													type="button"
													aria-pressed={selected}
													onClick={() => handleTagToggle("allergen_tags", tag)}
													className={`rounded-full px-3 py-2 text-sm font-medium transition ${selected
														? "bg-rose-600 text-white shadow-sm"
														: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
														}`}
												>
													{tag}
												</button>
											);
										})}
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">Available from</label>
										<input
											type="time"
											className="input"
											value={form.available_time_start}
											onChange={(event) =>
												setForm((previous) => ({
													...previous,
													available_time_start: event.target.value,
												}))
											}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">Available until</label>
										<input
											type="time"
											className="input"
											value={form.available_time_end}
											onChange={(event) =>
												setForm((previous) => ({
													...previous,
													available_time_end: event.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">Item image</label>
									<input
										type="file"
										accept="image/*"
										className="input text-sm"
										onChange={handleImageChange}
									/>
								</div>

								<div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
									<div className="text-sm font-semibold text-amber-900">Publishing checklist</div>
									<ul className="mt-3 space-y-2 text-sm leading-6 text-amber-800">
										<li>Dish names must not include numbers.</li>
										<li>Use availability windows to match when the kitchen can really fulfil the item.</li>
										<li>Tags and allergen notes improve trust before checkout starts.</li>
									</ul>
								</div>

								<div className="flex gap-3">
									{editingId ? (
										<button type="button" className="btn-secondary flex-1" onClick={resetForm}>
											Cancel edit
										</button>
									) : null}

									<button className="btn-primary flex-1" disabled={saving}>
										{saving
											? "Saving..."
											: editingId
												? "Update food item"
												: "Create food item"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>

			<ConfirmModal
				open={!!deleteTarget}
				title="Delete food item?"
				description={deleteTarget ? `Delete "${deleteTarget.name}" from your menu?` : ""}
				confirmLabel="Delete"
				confirmTone="danger"
				onConfirm={handleDelete}
				onClose={() => setDeleteTarget(null)}
			/>
		</>
	);
}
