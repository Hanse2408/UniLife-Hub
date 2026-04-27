const { param } = require("express-validator");

const notificationIdValidator = [
  param("id").isMongoId().withMessage("Invalid notification id"),
];

module.exports = {
  notificationIdValidator,
};