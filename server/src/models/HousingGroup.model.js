const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isPrimaryTenant: {
      type: Boolean,
      default: false,
    },
    roommatePreferences: {
      sleepSchedule: { type: String, enum: ["EARLY_BIRD", "NIGHT_OWL", "FLEXIBLE", ""], default: "" },
      workSchedule: { type: String, enum: ["WEEKDAYS", "WEEKENDS", "REMOTE", "MIXED", ""], default: "" },
      cleanlinessLevel: { type: String, enum: ["VERY_TIDY", "TIDY", "RELAXED", ""], default: "" },
      guestPolicy: { type: String, enum: ["NO_GUESTS", "OCCASIONAL", "FREQUENT", ""], default: "" },
      noiseTolerance: { type: String, enum: ["QUIET", "MODERATE", "LIVELY", ""], default: "" },
      studyHabits: { type: String, enum: ["HOME_STUDIER", "LIBRARY", "MIXED", ""], default: "" },
      smokingPolicy: { type: String, enum: ["NON_SMOKER", "OUTSIDE_ONLY", "SMOKER", ""], default: "" },
      petsPolicy: { type: String, enum: ["NO_PETS", "OKAY_WITH_PETS", "HAS_PETS", ""], default: "" },
      bio: { type: String, default: "", maxlength: 300 },
    },
  },
  { _id: false }
);

const moveInChecklistSchema = new mongoose.Schema(
  {
    keyMoneyPaid: {
      type: Boolean,
      default: false,
    },
    keyReceived: {
      type: Boolean,
      default: false,
    },
    inventoryConfirmed: {
      type: Boolean,
      default: false,
    },
    checkedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const housingGroupSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },

    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    rentDueDay: {
      type: Number,
      default: 5,
      min: 1,
      max: 28,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE",
    },

    nextBillingDate: {
      type: Date,
      default: null,
    },

    lastRentReminderSentFor: {
      type: Date,
      default: null,
    },

    moveInChecklist: {
      type: moveInChecklistSchema,
      default: () => ({
        keyMoneyPaid: false,
        keyReceived: false,
        inventoryConfirmed: false,
        checkedAt: null,
      }),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HousingGroup", housingGroupSchema);