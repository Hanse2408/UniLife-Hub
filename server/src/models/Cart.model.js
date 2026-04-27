const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
	{
		student_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},

		food_item_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "FoodItem",
			required: true,
			index: true,
		},

		quantity: {
			type: Number,
			required: true,
			min: 1,
			default: 1,
		},
	},
	{ timestamps: true }
);

cartSchema.index({ student_id: 1, food_item_id: 1 }, { unique: true });

const CartModel = mongoose.model("Cart", cartSchema);

async function upsertCartItem(studentId, foodItemId, quantity) {
	const existing = await CartModel.findOne({
		student_id: studentId,
		food_item_id: foodItemId,
	});

	if (existing) {
		existing.quantity += Number(quantity);
		await existing.save();
		return existing;
	}

	return await CartModel.create({
		student_id: studentId,
		food_item_id: foodItemId,
		quantity: Number(quantity),
	});
}

async function getCartWithItems(studentId) {
	const rows = await CartModel.aggregate([
		{
			$match: {
				student_id: new mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$lookup: {
				from: "fooditems",
				localField: "food_item_id",
				foreignField: "_id",
				as: "food",
			},
		},
		{
			$unwind: "$food",
		},
		{
			$project: {
				cart_id: "$_id",
				id: "$food._id",
				name: "$food.name",
				price: "$food.price",
				image_url: "$food.image_url",
				quantity: "$quantity",
				category: "$food.category",
			},
		},
		{
			$sort: { cart_id: -1 },
		},
	]);

	return rows;
}

async function updateCartItem(cartId, studentId, quantity) {
	return await CartModel.findOneAndUpdate(
		{ _id: cartId, student_id: studentId },
		{ $set: { quantity: Number(quantity) } },
		{ new: true }
	);
}

async function deleteCartItem(cartId, studentId) {
	return await CartModel.findOneAndDelete({
		_id: cartId,
		student_id: studentId,
	});
}

async function clearCart(studentId) {
	return await CartModel.deleteMany({ student_id: studentId });
}

module.exports = {
	CartModel,
	upsertCartItem,
	getCartWithItems,
	updateCartItem,
	deleteCartItem,
	clearCart,
};
