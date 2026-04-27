const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  listFoodItems,
  getFoodItemById,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  checkoutAndPay,
  getMyOrders,
  getBudgetSummary,
  safetyCheck,
  eatNowRecommendations,
  checkinCrowd,
  getCrowdSummary,
  getCrowdTrend,
} = require("../controllers/food.student.controller");

const {
  generatePlan,
  getCurrentPlan,
  initPlan,
  setSlot,
  clearSlot,
  getPlanPrefs,
} = require("../controllers/food.mealplanner.controller");

// STUDENT ONLY
router.use(authRequired, authorizeRoles("STUDENT"));

router.get("/health", (req, res) => {
	return res.status(200).json({
		success: true,
		module: "food-student",
		message: "Food student routes are working",
	});
});

// FOOD ITEMS
router.get("/items", listFoodItems);
router.get("/items/:id", getFoodItemById);

// CART
router.post("/cart", addToCart);
router.get("/cart", getCart);
router.patch("/cart/:cartItemId", updateCartItem);
router.delete("/cart/:cartItemId", removeCartItem);

// CHECKOUT / ORDERS
router.post("/checkout", checkoutAndPay);
router.get("/orders", getMyOrders);

// EXTRA STUDENT FOOD TOOLS
router.get("/budget-summary", getBudgetSummary);
router.get("/recommendations/eat-now", eatNowRecommendations);
router.get("/safety-check/:foodId", safetyCheck);
router.post("/crowd-checkin", checkinCrowd);
router.get("/crowd-summary/:vendorId", getCrowdSummary);
router.get("/crowd-trend/:vendorId", getCrowdTrend);

router.post("/meal-planner/generate", generatePlan);
router.get("/meal-planner/current", getCurrentPlan);
router.post("/meal-planner/init", initPlan);
router.get("/meal-planner/prefs", getPlanPrefs);
router.patch("/meal-planner/slot", setSlot);
router.delete("/meal-planner/slot", clearSlot);

module.exports = router;
