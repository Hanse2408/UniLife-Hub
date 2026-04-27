const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  createFoodItem,
  listMyFoodItems,
  updateFoodItem,
  deleteFoodItem,
  listVendorOrders,
  updateOrderStatus,
  getVendorStats,
} = require("../controllers/food.vendor.controller");

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
