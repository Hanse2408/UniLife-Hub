const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // The type of entity being reviewed
    entityType: {
      type: String,
      enum: ["ACCOMMODATION", "FOOD_ORDER", "TRANSPORT_BOOKING"],
      required: true,
    },

    // Reference to the specific entity (bookingId, orderId, or transportBookingId)
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Optional listing reference (accommodation or transport)
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Who wrote the review (always a student)
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who receives the review (landlord, vendor, or transport manager)
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Derived sentiment: NEGATIVE (1-2), NEUTRAL (3), POSITIVE (4-5)
    sentiment: {
      type: String,
      enum: ["NEGATIVE", "NEUTRAL", "POSITIVE"],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One review per entity per reviewer
reviewSchema.index({ entityId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ entityType: 1, reviewerId: 1 });

// Auto-compute sentiment before save
reviewSchema.pre("save", function () {
  if (this.rating <= 2) this.sentiment = "NEGATIVE";
  else if (this.rating === 3) this.sentiment = "NEUTRAL";
  else this.sentiment = "POSITIVE";
});

module.exports = mongoose.model("Review", reviewSchema);