const mongoose = require("mongoose");

const roommateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    budgetMin: {
      type: Number,
      default: 0,
      min: 0,
    },
    budgetMax: {
      type: Number,
      default: 0,
      min: 0,
    },

    cleanlinessLevel: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    studyHabit: {
      type: String,
      enum: ["QUIET", "MODERATE", "FLEXIBLE"],
      required: true,
    },
    sleepSchedule: {
      type: String,
      enum: ["EARLY", "LATE", "FLEXIBLE"],
      required: true,
    },
    smokingPreference: {
      type: String,
      enum: ["NON_SMOKER_ONLY", "SMOKER_OK", "FLEXIBLE"],
      required: true,
    },
    genderPreference: {
      type: String,
      enum: ["ANY", "MALE_ONLY", "FEMALE_ONLY"],
      default: "ANY",
    },

    interests: [{ type: String }],
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoommateProfile", roommateProfileSchema);