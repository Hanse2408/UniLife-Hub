const { body, param, query } = require("express-validator");

const getThreadValidator = [
  param("listingId").isMongoId().withMessage("Invalid listing id"),
  query("studentId").optional().isMongoId().withMessage("Invalid student id"),
];

const sendMessageValidator = [
  body("listingId").isMongoId().withMessage("Valid listing id is required"),

  body("studentId")
    .optional()
    .isMongoId()
    .withMessage("studentId must be a valid Mongo id"),

  body("body")
    .trim()
    .notEmpty()
    .withMessage("Message body is required")
    .isLength({ max: 500 })
    .withMessage("Message body cannot exceed 500 characters"),
];

module.exports = {
  getThreadValidator,
  sendMessageValidator,
};