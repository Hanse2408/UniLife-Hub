const mongoose = require("mongoose");

const allergyPreferenceSchema = new mongoose.Schema(
	{
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
			index: true,
		},
		diet_type: {
			type: String,
			default: "",
			trim: true,
			lowercase: true,
		},
		allergens: {
			type: [String],
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

const AllergyPreferenceModel = mongoose.model(
	"AllergyPreference",
	allergyPreferenceSchema
);

async function upsertAllergyPrefs(studentId, dietType, allergyList, weeklyBudget) {
	return await AllergyPreferenceModel.findOneAndUpdate(
		{ student_id: studentId },
		{
			$set: {
				diet_type: dietType || "",
				allergens: Array.isArray(allergyList) ? allergyList : [],
				weekly_budget: Number(weeklyBudget || 0),
			},
		},
		{ new: true, upsert: true }
	).lean();
}

async function getAllergyPrefs(studentId) {
	return await AllergyPreferenceModel.findOne({ student_id: studentId }).lean();
}

module.exports = {
	AllergyPreferenceModel,
	upsertAllergyPrefs,
	getAllergyPrefs,
};
