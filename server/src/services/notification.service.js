const Notification = require("../models/Notification.model");
const { emitToUser } = require("../sockets");

const createNotification = async ({
  userId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
}) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    entityType,
    entityId,
  });

  emitToUser(String(userId), "notification:new", notification);

  return notification;
};

const createManyNotifications = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const notifications = await Notification.insertMany(items);

  notifications.forEach((notification) => {
    emitToUser(String(notification.userId), "notification:new", notification);
  });

  return notifications;
};

module.exports = {
  createNotification,
  createManyNotifications,
};