const mongoose = require("mongoose");
const { FoodItemModel } = require("./FoodItem.model");

const orderItemSchema = new mongoose.Schema(
	{
		food_item_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "FoodItem",
			required: true,
		},

		quantity: {
			type: Number,
			required: true,
			min: 1,
		},

		price_at_time: {
			type: Number,
			required: true,
			min: 0,
		},
	},
	{ _id: false }
);

const orderSchema = new mongoose.Schema(
	{
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},

		total_amount: {
			type: Number,
			required: true,
			min: 0,
		},

		delivery_address: {
			type: String,
			required: true,
			trim: true,
			maxlength: 500,
		},

		delivery_phone: {
			type: String,
			required: true,
			trim: true,
			maxlength: 50,
		},

		payment_status: {
			type: String,
			enum: ["pending", "paid", "failed", "refunded"],
			default: "pending",
			index: true,
		},

		order_status: {
			type: String,
			enum: ["pending", "food_processing", "out_for_delivery", "delivered", "cancelled"],
			default: "pending",
			index: true,
		},

		order_date: {
			type: Date,
			default: Date.now,
			index: true,
		},

		items: {
			type: [orderItemSchema],
			default: [],
		},
	},
	{ timestamps: true }
);

orderSchema.index({ student_id: 1, order_date: -1 });

const OrderModel = mongoose.model("Order", orderSchema);

async function createOrder(payload) {
	return await OrderModel.create(payload);
}

async function getOrdersByStudent(studentId) {
	return await OrderModel.find({ student_id: studentId })
		.populate("items.food_item_id")
		.sort({ order_date: -1 })
		.lean();
}

async function getOrdersForVendor(vendorId) {
	const vendorItems = await FoodItemModel.find({ vendor_id: vendorId }).select("_id").lean();
	const vendorItemIds = vendorItems.map((item) => item._id);

	if (!vendorItemIds.length) return [];

	return await OrderModel.find({
		"items.food_item_id": { $in: vendorItemIds },
	})
		.populate("student_id", "fullName email phone")
		.populate("items.food_item_id")
		.sort({ order_date: -1 })
		.lean();
}

async function updateOrderStatus(orderId, status) {
	return await OrderModel.findByIdAndUpdate(
		orderId,
		{ $set: { order_status: status } },
		{ new: true }
	).lean();
}

async function getWeeklySpend(studentId, weekStart) {
	const result = await OrderModel.aggregate([
		{
			$match: {
				student_id: new mongoose.Types.ObjectId(studentId),
				payment_status: "paid",
				order_date: { $gte: new Date(weekStart) },
			},
		},
		{
			$group: {
				_id: null,
				total: { $sum: "$total_amount" },
			},
		},
	]);

	return result[0]?.total || 0;
}

async function getAllOrders() {
	return await OrderModel.find({})
		.populate("student_id", "fullName email phone")
		.populate("items.food_item_id", "name price")
		.sort({ order_date: -1 })
		.lean();
}

module.exports = {
	OrderModel,
	createOrder,
	getOrdersByStudent,
	getOrdersForVendor,
	updateOrderStatus,
	getWeeklySpend,
	getAllOrders,
};
