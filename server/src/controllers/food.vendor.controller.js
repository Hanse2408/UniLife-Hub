const FoodItem = require("../models/FoodItem.model");
const Order = require("../models/Order.model");
const User = require("../models/User.model");
const { createNotification } = require("../services/notification.service");

const hasNumberInName = (value = "") => /\d/.test(String(value));

// ---------- FOOD ITEMS ----------
exports.createFoodItem = async (req, res) => {
	try {
		const vendorId = req.user.id;

		const {
			name,
			description,
			price,
			category,
			available_time_start,
			available_time_end,
			diet_tags,
			allergen_tags,
			meal,
			image_url,
		} = req.body;

		if (!name || price == null || !category) {
			return res.status(400).json({
				success: false,
				message: "name, price, and category are required",
			});
		}

		if (hasNumberInName(name)) {
			return res.status(400).json({
				success: false,
				message: "Food item name cannot include numbers",
			});
		}

		const item = await FoodItem.createFoodItem({
			vendor_id: vendorId,
			name: String(name).trim(),
			description: description || "",
			price: Number(price),
			category: String(category).trim().toUpperCase(),
			diet_tags: diet_tags || "",
			allergen_tags: allergen_tags || "",
			meal: meal || null,
			image_url: image_url || "",
			available_time_start: available_time_start || null,
			available_time_end: available_time_end || null,
		});

		return res.status(201).json({
			success: true,
			message: "Food item created successfully",
			item,
		});
	} catch (error) {
		console.error("createFoodItem error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to create food item",
		});
	}
};

exports.listMyFoodItems = async (req, res) => {
	try {
		const items = await FoodItem.listByVendor(req.user.id);

		return res.status(200).json({
			success: true,
			items,
		});
	} catch (error) {
		console.error("listMyFoodItems error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to list food items",
		});
	}
};

exports.updateFoodItem = async (req, res) => {
	try {
		const vendorId = req.user.id;
		const id = req.params.id;

		const {
			name,
			description,
			price,
			category,
			available_time_start,
			available_time_end,
			diet_tags,
			allergen_tags,
			meal,
			is_active,
			image_url,
		} = req.body;

		const data = {
			name: name != null ? String(name).trim() : undefined,
			description,
			price: price != null ? Number(price) : undefined,
			category: category != null ? String(category).trim().toUpperCase() : undefined,
			available_time_start,
			available_time_end,
			image_url: image_url !== undefined ? image_url : undefined,
		};

		if (name != null && hasNumberInName(name)) {
			return res.status(400).json({
				success: false,
				message: "Food item name cannot include numbers",
			});
		}

		if (diet_tags !== undefined) data.diet_tags = diet_tags;
		if (allergen_tags !== undefined) data.allergen_tags = allergen_tags;
		if (meal !== undefined) data.meal = meal;
		if (is_active !== undefined) data.is_active = is_active;

		Object.keys(data).forEach((key) => {
			if (data[key] === undefined) delete data[key];
		});

		const updated = await FoodItem.updateFoodItem(id, vendorId, data);

		if (!updated) {
			return res.status(404).json({
				success: false,
				message: "Food item not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Food item updated successfully",
			item: updated,
		});
	} catch (error) {
		console.error("updateFoodItem error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update food item",
		});
	}
};

exports.deleteFoodItem = async (req, res) => {
	try {
		const deleted = await FoodItem.deleteFoodItem(req.params.id, req.user.id);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: "Food item not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Food item deleted successfully",
		});
	} catch (error) {
		console.error("deleteFoodItem error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to delete food item",
		});
	}
};

// ---------- ORDERS ----------
exports.listVendorOrders = async (req, res) => {
	try {
		const orders = await Order.getOrdersForVendor(req.user.id);

		return res.status(200).json({
			success: true,
			orders,
		});
	} catch (error) {
		console.error("listVendorOrders error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch vendor orders",
		});
	}
};

// Vendors can only accept (food_processing) orders — dispatch and delivery are admin-managed
const allowedStatuses = ["pending", "food_processing"];

exports.updateOrderStatus = async (req, res) => {
	try {
		const { status } = req.body;

		if (!allowedStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				message: "Invalid order status",
			});
		}

		const updated = await Order.updateOrderStatus(req.params.orderId, status);

		if (!updated) {
			return res.status(404).json({
				success: false,
				message: "Order not found",
			});
		}

		// Notify student that vendor has started preparing their order
		if (updated.student_id) {
			const statusLabels = { food_processing: "being prepared by the vendor" };
			const label = statusLabels[status] || status;
			createNotification({
				userId: updated.student_id,
				type: "ORDER_STATUS_UPDATE",
				title: "Your order is being prepared",
				message: `Your food order is now ${label}. Campus delivery will be notified shortly.`,
				entityType: "ORDER",
				entityId: updated._id,
			}).catch(() => { });
		}

		// When order is ready to cook, notify all admins so they can arrange delivery
		if (status === "food_processing") {
			try {
				const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
				for (const admin of admins) {
					createNotification({
						userId: admin._id,
						type: "ORDER_STATUS_UPDATE",
						title: "Order ready for campus delivery",
						message: `Food order #${String(updated._id).slice(-6).toUpperCase()} is being prepared and will soon need campus delivery.`,
						entityType: "ORDER",
						entityId: updated._id,
					}).catch(() => { });
				}
			} catch (adminNotifyErr) {
				console.error("Admin delivery notification error (non-fatal):", adminNotifyErr);
			}
		}

		return res.status(200).json({
			success: true,
			message: "Order status updated successfully",
			order: updated,
		});
	} catch (error) {
		console.error("updateOrderStatus error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update order status",
		});
	}
};

// ---------- SIMPLE DASHBOARD STATS ----------
exports.getVendorStats = async (req, res) => {
	try {
		const items = await FoodItem.listByVendor(req.user.id);
		const orders = await Order.getOrdersForVendor(req.user.id);

		let totalSales = 0;
		let pendingOrders = 0;
		let deliveredOrders = 0;

		orders.forEach((order) => {
			totalSales += Number(order.total_amount || 0);

			if (order.order_status === "pending" || order.order_status === "food_processing") {
				pendingOrders += 1;
			}

			if (order.order_status === "delivered") {
				deliveredOrders += 1;
			}
		});

		return res.status(200).json({
			success: true,
			stats: {
				totalFoodItems: items.length,
				totalOrders: orders.length,
				pendingOrders,
				deliveredOrders,
				totalSales,
			},
		});
	} catch (error) {
		console.error("getVendorStats error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch vendor stats",
		});
	}
};
