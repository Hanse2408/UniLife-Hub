const mongoose = require("mongoose");

const transportBookingSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        listingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TransportListing",
            required: true,
            index: true,
        },
        managerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        journeyDate: {
            type: String,        // ISO date string e.g. "2026-04-20"
            required: true,
        },
        passengers: {
            type: Number,
            required: true,
            min: 1,
        },
        pickupStop: {
            name: { type: String, required: true },
            lat: { type: Number },
            lng: { type: Number },
        },
        dropoffStop: {
            name: { type: String, required: true },
            lat: { type: Number },
            lng: { type: Number },
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "CANCELLED"],
            default: "PENDING",
        },
        paymentRef: {
            type: String,
            default: "",
        },
        paidAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

transportBookingSchema.index({ listingId: 1, journeyDate: 1 });

module.exports = mongoose.model("TransportBooking", transportBookingSchema);
