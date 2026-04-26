const mongoose = require("mongoose");
const { getStartOfWeek } = require("../utils/food.helpers");

const TRANSPORT_MODES = ["BUS", "VAN", "THREE_WHEELER", "TRAIN"];
const PRICE_PER_KM = {
    BUS: 10,        // Rs. per km
    VAN: 70,
    THREE_WHEELER: 60,
    TRAIN: 5,
};
const BASE_FARE = {
    BUS: 30,
    VAN: 100,
    THREE_WHEELER: 80,
    TRAIN: 20,
};

function calculateFee(mode, distanceKm) {
    const base = BASE_FARE[mode] || 30;
    const perKm = PRICE_PER_KM[mode] || 10;
    return Math.round(base + perKm * distanceKm);
}

const tripSlotSchema = new mongoose.Schema(
    {
        transportMode: { type: String, enum: TRANSPORT_MODES, default: "BUS" },
        pickupLocation: {
            name: { type: String, default: "" },
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        dropoffLocation: {
            name: { type: String, default: "" },
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        distanceKm: { type: Number, default: 0 },
        priceRs: { type: Number, default: 0 },
        isReturn: { type: Boolean, default: false },
    },
    { _id: false }
);

const tripDaySchema = new mongoose.Schema(
    {
        day: { type: String, required: true },
        trips: {
            morning: { type: tripSlotSchema, default: null },
            evening: { type: tripSlotSchema, default: null },
        },
    },
    { _id: false }
);

const tripPlanSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        weekStart: {
            type: Date,
            required: true,
            index: true,
        },
        weeklyBudget: {
            type: Number,
            default: 0,
            min: 0,
        },
        tripSlots: {
            type: [tripDaySchema],
            default: [],
        },
    },
    { timestamps: true }
);

tripPlanSchema.index({ studentId: 1, weekStart: 1 }, { unique: true });

const TripPlanModel = mongoose.model("TripPlan", tripPlanSchema);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["morning", "evening"];

function buildEmptySlots() {
    return DAYS.map((day) => ({
        day,
        trips: { morning: null, evening: null },
    }));
}

async function initWeeklyTripPlan(studentId, weeklyBudget) {
    const weekStart = getStartOfWeek();

    const existing = await TripPlanModel.findOne({
        studentId,
        weekStart,
    }).lean();

    if (existing) {
        return await TripPlanModel.findOneAndUpdate(
            { studentId, weekStart },
            { $set: { weeklyBudget: Number(weeklyBudget) } },
            { new: true }
        ).lean();
    }

    return await TripPlanModel.create({
        studentId,
        weekStart,
        weeklyBudget: Number(weeklyBudget),
        tripSlots: buildEmptySlots(),
    });
}

async function setTripSlot(studentId, day, slot, tripItem) {
    const weekStart = getStartOfWeek();

    return await TripPlanModel.findOneAndUpdate(
        { studentId, weekStart },
        { $set: { [`tripSlots.$[dayEl].trips.${slot}`]: tripItem } },
        {
            arrayFilters: [{ "dayEl.day": day }],
            new: true,
        }
    ).lean();
}

async function clearTripSlot(studentId, day, slot) {
    const weekStart = getStartOfWeek();

    return await TripPlanModel.findOneAndUpdate(
        { studentId, weekStart },
        { $set: { [`tripSlots.$[dayEl].trips.${slot}`]: null } },
        {
            arrayFilters: [{ "dayEl.day": day }],
            new: true,
        }
    ).lean();
}

async function getCurrentTripPlan(studentId) {
    const weekStart = getStartOfWeek();

    return await TripPlanModel.findOne({
        studentId,
        weekStart,
    }).lean();
}

function getTotalCost(plan) {
    if (!plan?.tripSlots?.length) return 0;
    return plan.tripSlots.reduce((sum, d) =>
        sum + SLOTS.reduce((s, sl) => s + Number(d.trips?.[sl]?.priceRs || 0), 0), 0);
}

module.exports = {
    TripPlanModel,
    TRANSPORT_MODES,
    PRICE_PER_KM,
    BASE_FARE,
    SLOTS,
    calculateFee,
    getTotalCost,
    initWeeklyTripPlan,
    setTripSlot,
    clearTripSlot,
    getCurrentTripPlan,
};
