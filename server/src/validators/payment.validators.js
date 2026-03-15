const { body, param } = require("express-validator");

const payBookingValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking id"),
];

const payRentValidator = [
  param("housingGroupId").isMongoId().withMessage("Invalid housing group id"),

  
  body("monthKey")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("monthKey must be in YYYY-MM format"),
];

const confirmPaymentValidator = [
  param("id").isMongoId().withMessage("Invalid payment id"),
];

module.exports = {
  payBookingValidator,
  payRentValidator,
  confirmPaymentValidator,
};