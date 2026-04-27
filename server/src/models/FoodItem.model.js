const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema(
	{
		vendor_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},

		name: {
			type: String,
			required: [true, "Food name is required"],
			trim: true,
			minlength: 2,
			maxlength: 120,
			validate: {
				validator(value) {
					return !/\d/.test(value);
				},
				message: "Food name cannot include numbers",
			},
		},

		description: {
			type: String,
			trim: true,
			default: "",
			maxlength: 1000,
		},

		// Store in minor units to stay compatible with the shared food code
		// Example: Rs 250.00 => 25000 if you treat as cents
		// or Rs 250 => 250 if you keep integer rupees consistently.
		price: {
			type: Number,
			required: [true, "Price is required"],
			min: 0,
		},

		category: {
			type: String,
			required: [true, "Category is required"],
			trim: true,
			uppercase: true,
		},

		diet_tags: {
			type: String,
			default: "",
		},

		allergen_tags: {
			type: String,
			default: "",
		},

		meal: {
			type: String,
			default: null,
		},

		image_url: {
			type: String,
			default: "",
		},

		available_time_start: {
			type: String,
			default: null,
		},

		available_time_end: {
			type: String,
			default: null,
		},

		is_active: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

foodItemSchema.index({ vendor_id: 1, category: 1, is_active: 1 });
foodItemSchema.index({ name: "text", description: "text", category: "text" });

const FoodItemModel = mongoose.model("FoodItem", foodItemSchema);

// ---------- STATIC-LIKE SERVICE METHODS ----------

async function createFoodItem(payload) {
	return await FoodItemModel.create(payload);
}

async function listAllActive(filters = {}) {
	const query = { is_active: true };

	if (filters.category) {
		query.category = String(filters.category).trim().toUpperCase();
	}

	// Use aggregation to filter by verified vendors at database level
	const items = await FoodItemModel.aggregate([
		{ $match: query },
		{
			$lookup: {
				from: "users", // The collection name for User model
				localField: "vendor_id",
				foreignField: "_id",
				as: "vendor_id"
			}
		},
		{ $unwind: "$vendor_id" },
		{
			$match: {
				"vendor_id.vendorVerificationStatus": "VERIFIED"
			}
		},
		{
			$project: {
				_id: 1,
				name: 1,
				description: 1,
				price: 1,
				category: 1,
				diet_tags: 1,
				allergen_tags: 1,
				image_url: 1,
				available_time_start: 1,
				available_time_end: 1,
				is_active: 1,
				createdAt: 1,
				updatedAt: 1,
				"vendor_id._id": 1,
				"vendor_id.fullName": 1,
				"vendor_id.email": 1,
				"vendor_id.phone": 1,
				"vendor_id.role": 1,
				"vendor_id.vendorVerificationStatus": 1
			}
		},
		{ $sort: { createdAt: -1 } }
	]);

	return items;
}

async function getById(id) {
	return await FoodItemModel.findById(id)
		.populate("vendor_id", "fullName email phone role vendorVerificationStatus")
		.lean();
}

async function listByCategory(category) {
	const categoryUpper = String(category).trim().toUpperCase();

	const items = await FoodItemModel.aggregate([
		{
			$match: {
				category: categoryUpper,
				is_active: true
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "vendor_id",
				foreignField: "_id",
				as: "vendor_id"
			}
		},
		{ $unwind: "$vendor_id" },
		{
			$match: {
				"vendor_id.vendorVerificationStatus": "VERIFIED"
			}
		},
		{
			$project: {
				_id: 1,
				name: 1,
				description: 1,
				price: 1,
				category: 1,
				diet_tags: 1,
				allergen_tags: 1,
				image_url: 1,
				available_time_start: 1,
				available_time_end: 1,
				is_active: 1,
				createdAt: 1,
				updatedAt: 1,
				"vendor_id._id": 1,
				"vendor_id.fullName": 1,
				"vendor_id.email": 1,
				"vendor_id.phone": 1,
				"vendor_id.role": 1,
				"vendor_id.vendorVerificationStatus": 1
			}
		},
		{ $sort: { createdAt: -1 } }
	]);

	return items;
}

async function listByVendor(vendorId) {
	return await FoodItemModel.find({ vendor_id: vendorId })
		.sort({ createdAt: -1 })
		.lean();
}

async function updateFoodItem(id, vendorId, data) {
	return await FoodItemModel.findOneAndUpdate(
		{ _id: id, vendor_id: vendorId },
		{ $set: data },
		{ new: true }
	).lean();
}

async function deleteFoodItem(id, vendorId) {
	return await FoodItemModel.findOneAndDelete({
		_id: id,
		vendor_id: vendorId,
	});
}

async function listCheapestSafe({ limit = 3 } = {}) {
	return await FoodItemModel.find({ is_active: true })
		.sort({ price: 1, createdAt: -1 })
		.limit(limit)
		.lean();
}

module.exports = {
	FoodItemModel,
	createFoodItem,
	listAllActive,
	getById,
	listByCategory,
	listByVendor,
	updateFoodItem,
	deleteFoodItem,
	listCheapestSafe,
};
