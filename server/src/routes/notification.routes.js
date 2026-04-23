const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notification.controller");

const { authRequired } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  notificationIdValidator,
} = require("../validators/notification.validators");

router.get("/me", authRequired, getMyNotifications);

router.patch("/read-all", authRequired, markAllNotificationsAsRead);

router.patch(
  "/:id/read",
  authRequired,
  notificationIdValidator,
  validate,
  markNotificationAsRead
);

module.exports = router;