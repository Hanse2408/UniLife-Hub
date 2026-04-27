const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  getPendingVendors,
  verifyVendor,
  rejectVendor,
  getAllOrders,
  dispatchOrder,
  deliverOrder,
} = require("../controllers/food.admin.controller");

router.use(authRequired, authorizeRoles("ADMIN"));

router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    module: "food-admin",
    message: "Food admin routes are working",
  });
});

router.get("/vendors/pending", getPendingVendors);
router.patch("/vendors/:id/verify", verifyVendor);
router.patch("/vendors/:id/reject", rejectVendor);

// Delivery management — admin dispatches and confirms delivery
router.get("/orders", getAllOrders);
router.patch("/orders/:orderId/dispatch", dispatchOrder);
router.patch("/orders/:orderId/deliver", deliverOrder);

module.exports = router;
