const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 5,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    location: {
      addressLine: {
        type: String,
        required: [true, "Address line is required"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      area: {
        type: String,
        required: [true, "Area is required"],
        trim: true,
      },
    },

    rent: {
      type: Number,
      required: [true, "Rent is required"],
      min: 1,
    },
    keyMoney: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    billsIncluded: {
      type: Boolean,
      default: false,
    },

    roomType: {
      type: String,
      enum: ["SINGLE", "SHARED", "ANNEX", "APARTMENT", "HOUSE"],
      required: true,
    },
    genderPreference: {
      type: String,
      enum: ["ANY", "MALE_ONLY", "FEMALE_ONLY"],
      default: "ANY",
    },

    maxOccupants: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableFrom: {
      type: Date,
      required: true,
    },

    facilities: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length >= 3;
        },
        message: "At least 3 facilities are required",
      },
    },

    photos: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "PENDING_APPROVAL",
        "ACTIVE",
        "UNAVAILABLE",
        "REJECTED",
        "SUSPENDED",
      ],
      default: "PENDING_APPROVAL",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);


listingSchema.index({
  "location.city": 1,
  "location.area": 1,
  roomType: 1,
  rent: 1,
  status: 1,
});

listingSchema.pre("save", async function () {
  if (this.keyMoney > 0 && this.keyMoney <= this.rent) {
    throw new Error("Key money must be greater than monthly rent");
  }
});


module.exports = mongoose.model("Listing", listingSchema);