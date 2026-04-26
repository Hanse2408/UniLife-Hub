const { body, param } = require("express-validator");

const createTicketValidator = [
  body("housingGroupId")
    .notEmpty()
    .withMessage("housingGroupId is required")
    .isMongoId()
    .withMessage("Invalid housing group id"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "PLUMBING",
      "ELECTRICAL",
      "CLEANING",
      "INTERNET",
      "SECURITY",
      "FURNITURE",
      "WATER",
      "OTHER",
    ])
    .withMessage("Invalid category"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("priority")
    .optional()
    .isIn(["HIGH", "MEDIUM", "LOW"])
    .withMessage("Priority must be HIGH, MEDIUM, or LOW"),
];

const ticketIdValidator = [
  param("id").isMongoId().withMessage("Invalid ticket id"),
];

const updateTicketStatusValidator = [
  param("id").isMongoId().withMessage("Invalid ticket id"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["PENDING", "IN_PROGRESS", "RESOLVED"])
    .withMessage("Invalid ticket status"),

  body("resolutionNote")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Resolution note cannot exceed 1000 characters"),
];

const updateTicketPriorityValidator = [
  param("id").isMongoId().withMessage("Invalid ticket id"),

  body("priority")
    .notEmpty()
    .withMessage("Priority is required")
    .isIn(["HIGH", "MEDIUM", "LOW"])
    .withMessage("Priority must be HIGH, MEDIUM, or LOW"),
];

module.exports = {
  createTicketValidator,
  ticketIdValidator,
  updateTicketStatusValidator,
  updateTicketPriorityValidator,
};