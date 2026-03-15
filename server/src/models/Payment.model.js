const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    housingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HousingGroup",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["BOOKING", "RENT", "KEY_MONEY"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    
    currency: {
      type: String,
      default: "LKR",
    },

    monthKey: {
      type: String,
      default: null, // e.g. 2026-03 for rent payments
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PAID",
    },

    paymentMethod: {
      type: String,
      enum: ["SIMULATION"],
      default: "SIMULATION",
    },

    referenceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    confirmedByLandlord: {
      type: Boolean,
      default: false,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1, type: 1, monthKey: 1 });
paymentSchema.index({ housingGroupId: 1, monthKey: 1, studentId: 1, type: 1 });

module.exports = mongoose.model("Payment", paymentSchema);