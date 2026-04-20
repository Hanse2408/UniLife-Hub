const express = require("express");
const router = express.Router();

// Aggregating real-time vendor performance metrics for dashboard display
const stats = orders.reduce((acc, order) => {
    acc.totalSales += Number(order.total_amount || 0);
    if (["pending", "food_processing"].includes(order.order_status)) acc.pendingOrders++;
    if (order.order_status === "delivered") acc.deliveredOrders++;
    return acc;
}, { totalSales: 0, pendingOrders: 0, deliveredOrders: 0 });

return res.status(200).json({
    success: true,
    stats: { totalFoodItems: items.length, totalOrders: orders.length, ...stats },
});

// VENDOR ONLY
router.use(authRequired, authorizeRoles("VENDOR"));

router.get("/health", (req, res) => {
	return res.status(200).json({
		success: true,
		module: "food-vendor",
		message: "Food vendor routes are working",
	});
});

// DASHBOARD
router.get("/stats", getVendorStats);

// FOOD ITEMS
router.post("/items", createFoodItem);
router.get("/items", listMyFoodItems);
router.patch("/items/:id", updateFoodItem);
router.delete("/items/:id", deleteFoodItem);

// ORDERS
router.get("/orders", listVendorOrders);
router.patch("/orders/:orderId/status", updateOrderStatus);

module.exports = router;
