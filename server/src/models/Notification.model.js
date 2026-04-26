const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "BOOKING_REQUEST",
        "BOOKING_APPROVED",
        "BOOKING_REJECTED",
        "PAYMENT_SUCCESS",
        "RENT_DUE",
        "TICKET_CREATED",
        "TICKET_UPDATED",
        "ADMIN_VERIFIED",
        "LISTING_APPROVED",
        "LISTING_REJECTED",
        "NEW_MESSAGE",
        "GENERAL",
        "ORDER_PLACED",
        "ORDER_STATUS_UPDATE",
        "TRANSPORT_BOOKING",
        "TRANSPORT_BOOKING_STATUS",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 120,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },

    entityType: {
      type: String,
      enum: ["BOOKING", "LISTING", "PAYMENT", "TICKET", "USER", "MESSAGE", "ORDER", "TRANSPORT", null],
      default: null,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);