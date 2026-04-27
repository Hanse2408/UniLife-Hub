const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    housingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HousingGroup",
      required: true,
      index: true,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },

    createdBy: {
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

    category: {
      type: String,
      enum: [
        "PLUMBING",
        "ELECTRICAL",
        "CLEANING",
        "INTERNET",
        "SECURITY",
        "FURNITURE",
        "WATER",
        "OTHER",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },

    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING",
    },

    slaDueAt: {
      type: Date,
      required: true,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolutionNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

ticketSchema.index({ landlordId: 1, status: 1, priority: 1 });
ticketSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Ticket", ticketSchema);