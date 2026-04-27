const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    distanceFromStart: { type: Number, default: 0 },       // km
    estimatedArrivalMin: { type: Number, default: 0 },      // minutes from departure
});

const transportListingSchema = new mongoose.Schema(
    {
        managerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        vehicleType: {
            type: String,
            enum: ["BUS", "VAN"],
            required: true,
        },
        startLocation: {
            name: { type: String, required: true, trim: true },
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        destination: {
            name: { type: String, required: true, trim: true },
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        stops: [stopSchema],
        totalDistanceKm: { type: Number, required: true },
        estimatedJourneyMin: { type: Number, required: true },
        availableSeats: {
            type: Number,
            required: true,
            min: 1,
        },
        priceRs: { type: Number, required: true },
        facilities: [
            {
                type: String,
                enum: [
                    "AC",
                    "WIFI",
                    "CUSHIONED_SEATS",
                    "USB_CHARGING",
                    "GPS_TRACKING",
                    "LUGGAGE_SPACE",
                ],
            },
        ],
        departureTime: { type: String, default: "" },  // e.g. "06:30"
        frequency: {
            type: String,
            enum: ["DAILY", "WEEKDAYS_ONLY", "WEEKENDS_ONLY", "SPECIFIC_DATES"],
            default: "DAILY",
        },
        specificDates: [{ type: String }], // ISO date strings, used when frequency is SPECIFIC_DATES
        status: {
            type: String,
            enum: ["PENDING_APPROVAL", "APPROVED", "REJECTED"],
            default: "PENDING_APPROVAL",
        },
        rejectionReason: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("TransportListing", transportListingSchema);
