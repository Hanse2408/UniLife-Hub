const mongoose = require("mongoose");
const { getStartOfWeek } = require("../utils/food.helpers");

const mealItemSchema = new mongoose.Schema(
	{
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "FoodItem",
			default: null,
		},
		name: {
			type: String,
			default: "",
		},
		price: {
			type: Number,
			default: 0,
		},
		category: {
			type: String,
			default: "",
		},
		image_url: {
			type: String,
			default: "",
		},
	},
	{ _id: false }
);

const mealDaySchema = new mongoose.Schema(
	{
		day: {
			type: String,
			required: true,
		},
		meals: {
			breakfast: {
				type: mealItemSchema,
				default: null,
			},
			lunch: {
				type: mealItemSchema,
				default: null,
			},
			dinner: {
				type: mealItemSchema,
				default: null,
			},
		},
	},
	{ _id: false }
);

const mealPlanSchema = new mongoose.Schema(
	{
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		week_start: {
			type: Date,
			required: true,
			index: true,
		},
		mealSlots: {
			type: [mealDaySchema],
			default: [],
		},
		weekly_budget: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{ timestamps: true }
);

mealPlanSchema.index({ student_id: 1, week_start: 1 }, { unique: true });

const MealPlanModel = mongoose.model("MealPlan", mealPlanSchema);

const EMPTY_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function buildEmptySlots() {
	return EMPTY_DAYS.map((day) => ({
		day,
		meals: { breakfast: null, lunch: null, dinner: null },
	}));
}

async function initWeeklyPlan(studentId, weeklyBudget) {
	const weekStart = getStartOfWeek();

	const existing = await MealPlanModel.findOne({
		student_id: studentId,
		week_start: weekStart,
	}).lean();

	if (existing) {
		// Only update the budget, keep existing slots
		return await MealPlanModel.findOneAndUpdate(
			{ student_id: studentId, week_start: weekStart },
			{ $set: { weekly_budget: Number(weeklyBudget) } },
			{ new: true }
		).lean();
	}

	return await MealPlanModel.create({
		student_id: studentId,
		week_start: weekStart,
		weekly_budget: Number(weeklyBudget),
		mealSlots: buildEmptySlots(),
	});
}

async function setMealSlot(studentId, day, slot, mealItem) {
	const weekStart = getStartOfWeek();

	return await MealPlanModel.findOneAndUpdate(
		{ student_id: studentId, week_start: weekStart },
		{ $set: { [`mealSlots.$[dayEl].meals.${slot}`]: mealItem } },
		{
			arrayFilters: [{ "dayEl.day": day }],
			new: true,
		}
	).lean();
}

async function clearMealSlot(studentId, day, slot) {
	const weekStart = getStartOfWeek();

	return await MealPlanModel.findOneAndUpdate(
		{ student_id: studentId, week_start: weekStart },
		{ $set: { [`mealSlots.$[dayEl].meals.${slot}`]: null } },
		{
			arrayFilters: [{ "dayEl.day": day }],
			new: true,
		}
	).lean();
}

async function saveMealPlan(studentId, mealSlots) {
	const weekStart = getStartOfWeek();

	return await MealPlanModel.findOneAndUpdate(
		{
			student_id: studentId,
			week_start: weekStart,
		},
		{
			$set: {
				mealSlots,
			},
		},
		{
			new: true,
			upsert: true,
		}
	).lean();
}

async function getCurrentMealPlan(studentId) {
	const weekStart = getStartOfWeek();

	return await MealPlanModel.findOne({
		student_id: studentId,
		week_start: weekStart,
	}).lean();
}

module.exports = {
	MealPlanModel,
	saveMealPlan,
	getCurrentMealPlan,
	initWeeklyPlan,
	setMealSlot,
	clearMealSlot,
};
