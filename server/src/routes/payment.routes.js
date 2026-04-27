const express = require("express");
const router = express.Router();

const {
  payBookingAmount,
  payMonthlyRent,
  getRentStatus,
  getMyPaymentHistory,
  confirmPayment,
  getLandlordPaymentHistory,
} = require("../controllers/payment.controller");

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");

const {
  payBookingValidator,
  payRentValidator,
  confirmPaymentValidator,
} = require("../validators/payment.validators");

router.post(
  "/booking/:bookingId",
  authRequired,
  authorizeRoles("STUDENT"),
  payBookingValidator,
  validate,
  payBookingAmount
);

router.post(
  "/rent/:housingGroupId",
  authRequired,
  authorizeRoles("STUDENT"),
  payRentValidator,
  validate,
  payMonthlyRent
);

router.get(
  "/me",
  authRequired,
  authorizeRoles("STUDENT"),
  getMyPaymentHistory
);

router.get(
  "/me/rent-status",
  authRequired,
  authorizeRoles("STUDENT"),
  getRentStatus
);

router.patch(
  "/:id/confirm",
  authRequired,
  authorizeRoles("LANDLORD"),
  confirmPaymentValidator,
  validate,
  confirmPayment
);

router.get(
  "/landlord/history",
  authRequired,
  authorizeRoles("LANDLORD"),
  getLandlordPaymentHistory
);

module.exports = router;