const FoodItem = require("../models/FoodItem.model");
const MealPlan = require("../models/MealPlan.model");
const AllergyPreference = require("../models/AllergyPreference.model");

function parseTags(str) {
	if (!str) return [];
	if (Array.isArray(str)) return str;

	return String(str)
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

const days = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

const slots = ["breakfast", "lunch", "dinner"];

exports.generatePlan = async (req, res) => {
	try {
		const studentId = req.user.id;
		const { weeklyBudget, dietType, allergens } = req.body;

		if (!weeklyBudget || Number(weeklyBudget) <= 0) {
			return res.status(400).json({
				success: false,
				message: "weeklyBudget is required and must be greater than 0",
			});
		}

		const allergyList = Array.isArray(allergens)
			? allergens.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
			: String(allergens || "")
					.split(",")
					.map((s) => s.trim().toLowerCase())
					.filter(Boolean);

		await AllergyPreference.upsertAllergyPrefs(
			studentId,
			dietType || "",
			allergyList,
			Number(weeklyBudget)
		);

		const allItems = await FoodItem.listAllActive();

		const safeItems = allItems.filter((item) => {
			const itemDietTags = parseTags(item.diet_tags);
			const itemAllergens = parseTags(item.allergen_tags);

			if (
				dietType &&
				itemDietTags.length > 0 &&
				!itemDietTags.includes(String(dietType).toLowerCase())
			) {
				return false;
			}

			if (itemAllergens.some((a) => allergyList.includes(a))) {
				return false;
			}

			return true;
		});

		if (!safeItems.length) {
			return res.status(400).json({
				success: false,
				message: "No safe items available for the selected preferences",
			});
		}

		safeItems.sort((a, b) => Number(a.price) - Number(b.price));

		const dailyBudget = Number(weeklyBudget) / 7;
		const mealSlots = [];
		let rollingIndex = 0;

		for (const day of days) {
			const dayEntry = {
				day,
				meals: {
					breakfast: null,
					lunch: null,
					dinner: null,
				},
			};

			for (const slot of slots) {
				const maxForMeal = (dailyBudget / 3) * 1.4;

				let candidate =
					safeItems.find((item) => Number(item.price) <= maxForMeal) ||
					safeItems[rollingIndex % safeItems.length];

				dayEntry.meals[slot] = {
					id: candidate._id,
					name: candidate.name,
					price: Number(candidate.price),
					category: candidate.category,
					image_url: candidate.image_url || "",
				};

				rollingIndex += 1;
			}

			mealSlots.push(dayEntry);
		}

		const saved = await MealPlan.saveMealPlan(studentId, mealSlots);

		return res.status(200).json({
			success: true,
			message: "Meal plan generated successfully",
			plan: saved,
		});
	} catch (error) {
		console.error("generatePlan error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to generate meal plan",
		});
	}
};
// Validating mandatory fields and ensuring data integrity for new menu items
if (!name || price == null || !category) {
    return res.status(400).json({
        success: false,
        message: "Mandatory fields missing: Name, price, and category must be provided.",
    });
}

// Sanitizing name input to prevent numerical characters in food titles
if (hasNumberInName(name)) {
    return res.status(400).json({
        success: false,
        message: "Validation Error: Food item names should not contain numeric digits.",
    });
}

exports.getCurrentPlan = async (req, res) => {
	try {
		const plan = await MealPlan.getCurrentMealPlan(req.user.id);

		return res.status(200).json({
			success: true,
			plan: plan || null,
		});
	} catch (error) {
		console.error("getCurrentPlan error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch meal plan",
		});
	}
};

// Informing student about preparation status and triggering admin delivery workflow
const label = status === "food_processing" ? "under preparation" : status;
createNotification({
    userId: updated.student_id,
    type: "ORDER_STATUS_UPDATE",
    title: "Vendor is preparing your meal",
    message: `Good news! Your order is now ${label}. We will notify you once it's dispatched.`,
    entityType: "ORDER",
    entityId: updated._id,
}).catch(() => { });

// ---- Manual meal planner ----

exports.initPlan = async (req, res) => {
	try {
		const studentId = req.user.id;
		const { weeklyBudget, dietType, allergens } = req.body;

		if (!weeklyBudget || Number(weeklyBudget) <= 0) {
			return res.status(400).json({ success: false, message: "weeklyBudget must be greater than 0" });
		}

		const allergyList = Array.isArray(allergens)
			? allergens.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
			: String(allergens || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

		await AllergyPreference.upsertAllergyPrefs(studentId, dietType || "", allergyList, Number(weeklyBudget));

		const plan = await MealPlan.initWeeklyPlan(studentId, Number(weeklyBudget));

		return res.status(200).json({ success: true, plan });
	} catch (error) {
		console.error("initPlan error:", error);
		return res.status(500).json({ success: false, message: "Failed to initialise meal plan" });
	}
};

exports.setSlot = async (req, res) => {
	try {
		const studentId = req.user.id;
		const { day, slot, foodItemId } = req.body;

		const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
		const validSlots = ["breakfast", "lunch", "dinner"];

		if (!validDays.includes(day) || !validSlots.includes(slot) || !foodItemId) {
			return res.status(400).json({ success: false, message: "day, slot, and foodItemId are required" });
		}

		const item = await FoodItem.getById(foodItemId);
		if (!item) return res.status(404).json({ success: false, message: "Food item not found" });

		// Load student allergens for warning
		const prefs = await AllergyPreference.getAllergyPrefs(studentId);
		const allergens = prefs ? prefs.allergens || [] : [];
		const itemAllergens = parseTags(item.allergen_tags);
		const allergenConflicts = itemAllergens.filter((a) => allergens.includes(a));

		const plan = await MealPlan.setMealSlot(studentId, day, slot, {
			id: item._id,
			name: item.name,
			price: Number(item.price),
			category: item.category,
			image_url: item.image_url || "",
		});

		if (!plan) {
			return res.status(400).json({ success: false, message: "No meal plan found for this week. Please initialise first." });
		}

		// Calculate new total
		const total = plan.mealSlots.reduce((sum, d) => {
			return sum + ["breakfast", "lunch", "dinner"].reduce((s, sl) => s + Number(d.meals?.[sl]?.price || 0), 0);
		}, 0);

		const budgetExceeded = plan.weekly_budget > 0 && total > plan.weekly_budget;

		return res.status(200).json({
			success: true,
			plan,
			allergenConflicts,
			budgetExceeded,
			totalPlanned: total,
		});
	} catch (error) {
		console.error("setSlot error:", error);
		return res.status(500).json({ success: false, message: "Failed to set meal slot" });
	}
};

exports.clearSlot = async (req, res) => {
	try {
		const studentId = req.user.id;
		const { day, slot } = req.body;

		const plan = await MealPlan.clearMealSlot(studentId, day, slot);

		if (!plan) {
			return res.status(400).json({ success: false, message: "No meal plan found for this week" });
		}

		return res.status(200).json({ success: true, plan });
	} catch (error) {
		console.error("clearSlot error:", error);
		return res.status(500).json({ success: false, message: "Failed to clear meal slot" });
	}
};

exports.getPlanPrefs = async (req, res) => {
	try {
		const prefs = await AllergyPreference.getAllergyPrefs(req.user.id);
		return res.status(200).json({ success: true, prefs: prefs || null });
	} catch (error) {
		console.error("getPlanPrefs error:", error);
		return res.status(500).json({ success: false, message: "Failed to fetch preferences" });
	}
};
