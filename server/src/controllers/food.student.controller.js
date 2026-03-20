const FoodItem = require("../models/FoodItem.model");
const Cart = require("../models/Cart.model");
const Order = require("../models/Order.model");
const AllergyPreference = require("../models/AllergyPreference.model");
const { calculateTotals, getStartOfWeek } = require("../utils/food.helpers");
const { createNotification } = require("../services/notification.service");

// ---------- HELPERS ----------
// Refined helper to ensure tags are always handled as clean arrays
function parseTags(str) {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    return String(str)
        .split(",")
        .map((s) => s.trim().toLowerCase()) // Consistent casing for comparison
        .filter(Boolean);
}

// ---------- FOOD ITEMS ----------
exports.listFoodItems = async (req, res) => {
    try {
        const { category } = req.query;
        // Optimization: Filtering active items based on role-based availability
        const items = await FoodItem.listAllActive({ category });
        return res.status(200).json({
            success: true,
            count: items.length,
            items,
        });
    } catch (error) {
        console.error("listFoodItems error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching food menu",
        });
    }
};

// ---------- CHECKOUT & BUDGET INTEGRATION ----------
exports.checkoutAndPay = async (req, res) => {
    try {
        const studentId = req.user._id || req.user.id;
        const { deliveryAddress, deliveryPhone, note } = req.body;

        if (!deliveryAddress || !deliveryPhone) {
            return res.status(400).json({
                success: false,
                message: "Delivery details (Address & Phone) are mandatory",
            });
        }

        const cartRows = await Cart.getCartWithItems(studentId);
        if (!cartRows.length) {
            return res.status(400).json({
                success: false,
                message: "Checkout failed: Your cart is empty",
            });
        }

        const totals = calculateTotals(cartRows.map(r => ({ price: Number(r.price), quantity: r.quantity })));

        // Create the official order record
        const order = await Order.createOrder({
            student_id: studentId,
            total_amount: totals.total,
            delivery_address: deliveryAddress,
            delivery_phone: deliveryPhone,
            payment_status: "paid", // Assuming immediate payment for Uni Hub
            order_status: "pending",
            items: cartRows.map(row => ({
                food_item_id: row.id,
                quantity: row.quantity,
                price_at_time: Number(row.price),
            })),
            student_note: note || ""
        });

        await Cart.clearCart(studentId);

        // Async Notifications - Student & Vendor
        this.handleOrderNotifications(studentId, order, totals.total, cartRows);

        return res.status(201).json({
            success: true,
            message: "Order placed successfully! Vendor will be notified.",
            orderId: order._id,
            totalPaid: totals.total,
        });
    } catch (error) {
        console.error("checkoutAndPay error:", error);
        return res.status(500).json({ success: false, message: "Order processing failed" });
    }
};

// Internal notification handler to keep checkout logic clean
exports.handleOrderNotifications = async (studentId, order, total, cartRows) => {
    // 1. Notify Student
    createNotification({
        userId: studentId,
        type: "ORDER_CONFIRMED",
        title: "Order Placed!",
        message: `LKR ${total.toFixed(2)} order is now being processed.`,
        entityType: "ORDER",
        entityId: order._id,
    }).catch(() => {});

    // 2. Notify Relevant Vendors
    try {
        const vendorIds = [...new Set(cartRows.map(r => String(r.vendor_id)))];
        vendorIds.forEach(vId => {
            createNotification({
                userId: vId,
                type: "NEW_ORDER",
                title: "New Student Order",
                message: `You have a new order worth LKR ${total.toFixed(2)}`,
                entityType: "ORDER",
                entityId: order._id,
            }).catch(() => {});
        });
    } catch (e) { console.error("Vendor notification failed", e); }
};

// ---------- SMART RECOMMENDATIONS ----------
exports.getBudgetSummary = async (req, res) => {
    try {
        const studentId = req.user.id;
        const prefs = await AllergyPreference.getAllergyPrefs(studentId);
        
        const weekStart = getStartOfWeek();
        const spent = await Order.getWeeklySpend(studentId, weekStart);
        const weeklyBudget = prefs ? Number(prefs.weekly_budget || 0) : 0;

        let status = "normal";
        let suggestions = [];

        if (weeklyBudget > 0) {
            const usagePercent = (spent / weeklyBudget) * 100;
            if (usagePercent >= 90) status = "critical";
            else if (usagePercent >= 70) status = "warning";

            if (status !== "normal") {
                // Fetching cheaper alternatives if budget is tight
                suggestions = await FoodItem.listCheapestSafe({ limit: 3 });
            }
        }

        return res.status(200).json({
            success: true,
            summary: {
                limit: weeklyBudget,
                spent,
                remaining: Math.max(0, weeklyBudget - spent),
                status
            },
            suggestions
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching budget data" });
    }
};