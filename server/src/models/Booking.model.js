const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },

    moveInDate: {
      type: Date,
      required: true,
    },
    visitDate: {
      type: Date,
      default: null,
    },

    requestMessage: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "APPROVED",
        "REJECTED",
        "PAYMENT_PENDING",
        "CONFIRMED",
        "ACTIVE_STAY",
        "CANCELLED",
        "COMPLETED",
      ],
      default: "REQUESTED",
    },

    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    keyMoneyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBookingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },

    paymentDueAt: {
      type: Date,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

bookingSchema.index({ studentId: 1, listingId: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);