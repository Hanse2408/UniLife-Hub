const FoodItem = require("../models/FoodItem.model");
const Cart = require("../models/Cart.model");
const Order = require("../models/Order.model");
const AllergyPreference = require("../models/AllergyPreference.model");
const { calculateTotals, getStartOfWeek } = require("../utils/food.helpers");
const { createNotification } = require("../services/notification.service");

// ---------- HELPERS ----------
function parseTags(str) {
	if (!str) return [];
	if (Array.isArray(str)) return str;
	return String(str)
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

// ---------- FOOD ITEMS ----------
exports.listFoodItems = async (req, res) => {
	try {
		const { category } = req.query;
		const items = await FoodItem.listAllActive({ category });
		return res.status(200).json({
			success: true,
			items,
		});
	} catch (error) {
		console.error("listFoodItems error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to list food items",
		});
	}
};

exports.getFoodItemById = async (req, res) => {
	try {
		const item = await FoodItem.getById(req.params.id);

		if (!item) {
			return res.status(404).json({
				success: false,
				message: "Food item not found",
			});
		}

		return res.status(200).json({
			success: true,
			item,
		});
	} catch (error) {
		console.error("getFoodItemById error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to get food item",
		});
	}
};

// ---------- CART ----------
exports.addToCart = async (req, res) => {
	try {
		const studentId = req.user._id || req.user.id;
		const { foodItemId, quantity } = req.body;

		if (!foodItemId || !quantity || Number(quantity) <= 0) {
			return res.status(400).json({
				success: false,
				message: "foodItemId and positive quantity are required",
			});
		}

		await Cart.upsertCartItem(studentId, foodItemId, Number(quantity));
		const cartRows = await Cart.getCartWithItems(studentId);

		return res.status(200).json({
			success: true,
			cart: cartRows,
		});
	} catch (error) {
		console.error("addToCart error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to add to cart",
		});
	}
};

exports.getCart = async (req, res) => {
	try {
		const cartRows = await Cart.getCartWithItems(req.user._id || req.user.id);

		const cartItems = cartRows.map((row) => ({
			cart_id: row.cart_id,
			food_item_id: row.id,
			name: row.name,
			price: Number(row.price),
			image_url: row.image_url,
			quantity: row.quantity,
			category: row.category,
		}));

		const totals = calculateTotals(cartItems);

		return res.status(200).json({
			success: true,
			items: cartItems,
			totals,
		});
	} catch (error) {
		console.error("getCart error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch cart",
		});
	}
};

exports.updateCartItem = async (req, res) => {
	try {
		const { quantity } = req.body;
		const cartId = req.params.cartItemId;

		if (quantity == null || Number(quantity) < 0) {
			return res.status(400).json({
				success: false,
				message: "Quantity must be >= 0",
			});
		}

		if (Number(quantity) === 0) {
			await Cart.deleteCartItem(cartId, req.user._id || req.user.id);
		} else {
			await Cart.updateCartItem(cartId, req.user._id || req.user.id, Number(quantity));
		}

		const cartRows = await Cart.getCartWithItems(req.user._id || req.user.id);

		const cartItems = cartRows.map((row) => ({
			cart_id: row.cart_id,
			food_item_id: row.id,
			name: row.name,
			price: Number(row.price),
			image_url: row.image_url,
			quantity: row.quantity,
			category: row.category,
		}));

		const totals = calculateTotals(cartItems);

		return res.status(200).json({
			success: true,
			items: cartItems,
			totals,
		});
	} catch (error) {
		console.error("updateCartItem error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update cart item",
		});
	}
};

exports.removeCartItem = async (req, res) => {
	try {
		await Cart.deleteCartItem(req.params.cartItemId, req.user._id || req.user.id);

		const cartRows = await Cart.getCartWithItems(req.user._id || req.user.id);

		const cartItems = cartRows.map((row) => ({
			cart_id: row.cart_id,
			food_item_id: row.id,
			name: row.name,
			price: Number(row.price),
			image_url: row.image_url,
			quantity: row.quantity,
			category: row.category,
		}));

		const totals = calculateTotals(cartItems);

		return res.status(200).json({
			success: true,
			items: cartItems,
			totals,
		});
	} catch (error) {
		console.error("removeCartItem error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to remove cart item",
		});
	}
};

// ---------- CHECKOUT ----------
exports.checkoutAndPay = async (req, res) => {
	try {
		const studentId = req.user._id || req.user.id;
		const { deliveryAddress, deliveryPhone } = req.body;

		if (!deliveryAddress || !deliveryPhone) {
			return res.status(400).json({
				success: false,
				message: "deliveryAddress and deliveryPhone are required",
			});
		}

		const cartRows = await Cart.getCartWithItems(studentId);

		if (!cartRows.length) {
			return res.status(400).json({
				success: false,
				message: "Cart is empty",
			});
		}

		const cartItemsForTotals = cartRows.map((row) => ({
			price: Number(row.price),
			quantity: row.quantity,
		}));

		const totals = calculateTotals(cartItemsForTotals);

		const orderItems = cartRows.map((row) => ({
			food_item_id: row.id,
			quantity: row.quantity,
			price_at_time: Number(row.price),
		}));

		const order = await Order.createOrder({
			student_id: studentId,
			total_amount: totals.total,
			delivery_address: deliveryAddress,
			delivery_phone: deliveryPhone,
			payment_status: "paid",
			order_status: "pending",
			items: orderItems,
		});

		await Cart.clearCart(studentId);

		// Notify student of successful order
		createNotification({
			userId: studentId,
			type: "ORDER_PLACED",
			title: "Order placed successfully",
			message: `Your food order of LKR ${totals.total.toFixed(2)} has been placed and is awaiting vendor confirmation.`,
			entityType: "ORDER",
			entityId: order._id,
		}).catch(() => { });

		// Notify vendors about new order (best-effort — must not block the 201 response)
		try {
			const foodItemIds = cartRows.map((r) => r.id);
			const foodItems = await FoodItem.FoodItemModel.find({ _id: { $in: foodItemIds } })
				.select("vendor_id")
				.lean();
			const vendorIds = [...new Set(foodItems.map((f) => String(f.vendor_id)))];
			for (const vendorId of vendorIds) {
				createNotification({
					userId: vendorId,
					type: "ORDER_PLACED",
					title: "New food order received",
					message: `A student placed an order worth LKR ${totals.total.toFixed(2)}.`,
					entityType: "ORDER",
					entityId: order._id,
				}).catch(() => { });
			}
		} catch (notifyErr) {
			console.error("Vendor notification error (non-fatal):", notifyErr);
		}

		return res.status(201).json({
			success: true,
			message: "Food order placed successfully",
			order,
			totals,
		});
	} catch (error) {
		console.error("checkoutAndPay error:", error);
		return res.status(500).json({
			success: false,
			message: "Checkout failed",
		});
	}
};

// ---------- ORDERS ----------
exports.getMyOrders = async (req, res) => {
	try {
		const orders = await Order.getOrdersByStudent(req.user._id || req.user.id);

		return res.status(200).json({
			success: true,
			orders,
		});
	} catch (error) {
		console.error("getMyOrders error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch orders",
		});
	}
};

// ---------- BUDGET SUMMARY ----------
exports.getBudgetSummary = async (req, res) => {
	try {
		const studentId = req.user.id;
		const prefs = await AllergyPreference.getAllergyPrefs(studentId);

		const weekStart = getStartOfWeek();
		const spent = await Order.getWeeklySpend(studentId, weekStart);
		const weeklyBudget = prefs ? Number(prefs.weekly_budget || 0) : 0;

		let percent = 0;
		if (weeklyBudget > 0) {
			percent = Math.round((spent / weeklyBudget) * 100);
		}

		let alert = null;
		let suggestions = [];

		if (weeklyBudget > 0 && percent >= 70) {
			alert = "You have exceeded 70% of your weekly food budget.";
			suggestions = await FoodItem.listCheapestSafe({ limit: 3 });
		}

		return res.status(200).json({
			success: true,
			weeklyBudget,
			spent,
			percent,
			alert,
			suggestions,
		});
	} catch (error) {
		console.error("getBudgetSummary error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch budget summary",
		});
	}
};

// ---------- PLACEHOLDERS FOR LATER ----------
exports.safetyCheck = async (req, res) => {
	return res.status(200).json({
		success: true,
		message: "Safety check will be added after AllergyPreference model integration",
		safe: true,
		conflicts: [],
		alternatives: [],
	});
};

exports.eatNowRecommendations = async (req, res) => {
	try {
		const studentId = req.user.id;
		const prefs = await AllergyPreference.getAllergyPrefs(studentId);

		const dietType = prefs ? prefs.diet_type : "";
		const allergens = prefs ? prefs.allergens || [] : [];

		const allItems = await FoodItem.listAllActive();

		const now = new Date();
		const currentMinutes = now.getHours() * 60 + now.getMinutes();

		const candidates = allItems.filter((item) => {
			const itemDietTags = parseTags(item.diet_tags);
			const itemAllergens = parseTags(item.allergen_tags);

			if (
				dietType &&
				itemDietTags.length > 0 &&
				!itemDietTags.includes(String(dietType).toLowerCase())
			) {
				return false;
			}

			if (itemAllergens.some((a) => allergens.includes(a))) {
				return false;
			}

			if (item.available_time_start && item.available_time_end) {
				const [sh, sm] = item.available_time_start.split(":").map(Number);
				const [eh, em] = item.available_time_end.split(":").map(Number);

				const startM = sh * 60 + sm;
				const endM = eh * 60 + em;

				return currentMinutes >= startM && currentMinutes <= endM;
			}

			return true;
		});

		candidates.sort((a, b) => Number(a.price) - Number(b.price));

		return res.status(200).json({
			success: true,
			items: candidates.slice(0, 3),
		});
	} catch (error) {
		console.error("eatNowRecommendations error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch recommendations",
		});
	}
};

exports.checkinCrowd = async (req, res) => {
	return res.status(200).json({
		success: true,
		message: "Crowd check-in will be added after CrowdCheckin model integration",
	});
};

exports.getCrowdSummary = async (req, res) => {
	return res.status(200).json({
		success: true,
		currentLevel: "Low",
		message: "Crowd summary placeholder until CrowdCheckin model is integrated",
	});
};

exports.getCrowdTrend = async (req, res) => {
	return res.status(200).json({
		success: true,
		trend: [],
		message: "Crowd trend placeholder until CrowdCheckin model is integrated",
	});
};
