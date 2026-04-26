const { body, param } = require("express-validator");

const createListingValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 120 })
    .withMessage("Title must be between 5 and 120 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),

  body("location.addressLine")
    .trim()
    .notEmpty()
    .withMessage("Address line is required"),

  body("location.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("location.area")
    .trim()
    .notEmpty()
    .withMessage("Area is required"),

  body("rent")
    .notEmpty()
    .withMessage("Rent is required")
    .isFloat({ gt: 0 })
    .withMessage("Rent must be greater than 0"),

  body("keyMoney")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Key money must be 0 or more"),

  body("roomType")
    .notEmpty()
    .withMessage("Room type is required")
    .isIn(["SINGLE", "SHARED", "ANNEX", "APARTMENT", "HOUSE"])
    .withMessage("Invalid room type"),

  body("genderPreference")
    .optional()
    .isIn(["ANY", "MALE_ONLY", "FEMALE_ONLY"])
    .withMessage("Invalid gender preference"),

  body("maxOccupants")
    .notEmpty()
    .withMessage("Max occupants is required")
    .isInt({ min: 1, max: 20 })
    .withMessage("Max occupants must be between 1 and 20"),

  body("availableFrom")
    .notEmpty()
    .withMessage("Available from date is required")
    .isISO8601()
    .withMessage("Available from must be a valid date"),

  body("facilities")
    .isArray({ min: 3 })
    .withMessage("At least 3 facilities are required"),

  body("photos")
    .optional()
    .isArray()
    .withMessage("Photos must be an array"),

  body("billsIncluded").optional().isBoolean(),
];

const updateListingValidator = [
  param("id").isMongoId().withMessage("Invalid listing id"),
];

const verifyLandlordValidator = [
  param("id").isMongoId().withMessage("Invalid landlord id"),
];

const approveListingValidator = [
  param("id").isMongoId().withMessage("Invalid listing id"),
];

const createBookingValidator = [
  body("listingId").isMongoId().withMessage("Valid listing id is required"),

  body("moveInDate")
    .notEmpty()
    .withMessage("Move-in date is required")
    .isISO8601()
    .withMessage("Move-in date must be a valid date"),

  body("visitDate")
    .optional()
    .isISO8601()
    .withMessage("Visit date must be a valid date"),

  body("requestMessage")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Request message cannot exceed 500 characters"),
];

const bookingIdValidator = [
  param("id").isMongoId().withMessage("Invalid booking id"),
];


module.exports = {
  createListingValidator,
  updateListingValidator,
  verifyLandlordValidator,
  approveListingValidator,
  createBookingValidator,
  bookingIdValidator,
};