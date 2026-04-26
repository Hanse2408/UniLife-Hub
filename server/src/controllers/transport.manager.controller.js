const TransportListing = require("../models/TransportListing.model");
const TransportBooking = require("../models/TransportBooking.model");
const mongoose = require("mongoose");

// Pricing constants
const PRICING = {
    BUS: { base: 30, perKm: 10 },
    VAN: { base: 100, perKm: 70 },
};

const SPEED_KMH = { BUS: 40, VAN: 50 };

function calculatePrice(vehicleType, distanceKm) {
    const { base, perKm } = PRICING[vehicleType];
    if (distanceKm <= 1) return base;
    return base + Math.ceil(distanceKm - 1) * perKm;
}

function calculateJourneyMin(vehicleType, distanceKm) {
    return Math.round((distanceKm / SPEED_KMH[vehicleType]) * 60);
}

// ─── Create Listing ──────────────────────────────
exports.createTransportListing = async (req, res) => {
    try {
        const {
            vehicleType,
            startLocation,
            destination,
            stops,
            totalDistanceKm,
            availableSeats,
            facilities,
            departureTime,
            frequency,
            specificDates,
        } = req.body;

        if (!vehicleType || !["BUS", "VAN"].includes(vehicleType)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle type" });
        }
        if (!startLocation?.name || !startLocation?.lat || !startLocation?.lng) {
            return res.status(400).json({ success: false, message: "Start location is required" });
        }
        if (!destination?.name || !destination?.lat || !destination?.lng) {
            return res.status(400).json({ success: false, message: "Destination is required" });
        }
        if (!totalDistanceKm || totalDistanceKm <= 0) {
            return res.status(400).json({ success: false, message: "Total distance must be positive" });
        }
        if (!availableSeats || availableSeats < 1) {
            return res.status(400).json({ success: false, message: "Available seats must be at least 1" });
        }

        const priceRs = calculatePrice(vehicleType, totalDistanceKm);
        const estimatedJourneyMin = calculateJourneyMin(vehicleType, totalDistanceKm);

        // Calculate estimated arrival at each stop
        const processedStops = (stops || []).map((stop) => ({
            ...stop,
            estimatedArrivalMin: calculateJourneyMin(vehicleType, stop.distanceFromStart || 0),
        }));

        const listing = await TransportListing.create({
            managerId: req.user._id,
            vehicleType,
            startLocation,
            destination,
            stops: processedStops,
            totalDistanceKm,
            estimatedJourneyMin,
            availableSeats,
            priceRs,
            facilities: facilities || [],
            departureTime: departureTime || "",
            frequency: frequency || "DAILY",
            specificDates: frequency === "SPECIFIC_DATES" ? (specificDates || []) : [],
        });

        return res.status(201).json({
            success: true,
            message: "Transport listing created — pending admin approval",
            listing,
        });
    } catch (error) {
        console.error("createTransportListing error:", error);
        return res.status(500).json({ success: false, message: "Failed to create listing" });
    }
};

// ─── Get My Listings ─────────────────────────────
exports.getMyTransportListings = async (req, res) => {
    try {
        const listings = await TransportListing.find({ managerId: req.user._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, listings });
    } catch (error) {
        console.error("getMyTransportListings error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch listings" });
    }
};

// ─── Get Single Listing ─────────────────────────
exports.getTransportListingById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await TransportListing.findById(req.params.id).populate(
            "managerId",
            "fullName email phone"
        );

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        return res.status(200).json({ success: true, listing });
    } catch (error) {
        console.error("getTransportListingById error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch listing" });
    }
};

// ─── Update Listing ──────────────────────────────
exports.updateTransportListing = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await TransportListing.findOne({
            _id: req.params.id,
            managerId: req.user._id,
        });

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        const {
            vehicleType,
            startLocation,
            destination,
            stops,
            totalDistanceKm,
            availableSeats,
            facilities,
            departureTime,
            frequency,
            specificDates,
        } = req.body;

        if (vehicleType) listing.vehicleType = vehicleType;
        if (startLocation) listing.startLocation = startLocation;
        if (destination) listing.destination = destination;
        if (totalDistanceKm) listing.totalDistanceKm = totalDistanceKm;
        if (availableSeats) listing.availableSeats = availableSeats;
        if (facilities) listing.facilities = facilities;
        if (departureTime !== undefined) listing.departureTime = departureTime;
        if (frequency) listing.frequency = frequency;
        if (frequency === "SPECIFIC_DATES") listing.specificDates = specificDates || [];
        else if (frequency) listing.specificDates = [];

        // Recalculate price & journey time
        const vt = listing.vehicleType;
        listing.priceRs = calculatePrice(vt, listing.totalDistanceKm);
        listing.estimatedJourneyMin = calculateJourneyMin(vt, listing.totalDistanceKm);

        if (stops) {
            listing.stops = stops.map((stop) => ({
                ...stop,
                estimatedArrivalMin: calculateJourneyMin(vt, stop.distanceFromStart || 0),
            }));
        }

        // Reset to pending on edit
        listing.status = "PENDING_APPROVAL";
        listing.rejectionReason = "";

        await listing.save();

        return res.status(200).json({ success: true, message: "Listing updated", listing });
    } catch (error) {
        console.error("updateTransportListing error:", error);
        return res.status(500).json({ success: false, message: "Failed to update listing" });
    }
};

// ─── Delete Listing ──────────────────────────────
exports.deleteTransportListing = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await TransportListing.findOneAndDelete({
            _id: req.params.id,
            managerId: req.user._id,
        });

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        return res.status(200).json({ success: true, message: "Listing deleted" });
    } catch (error) {
        console.error("deleteTransportListing error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete listing" });
    }
};

// ─── Price Calculator (public-ish utility) ───────
exports.calculateTransportPrice = async (req, res) => {
    try {
        const { vehicleType, distanceKm } = req.body;
        if (!vehicleType || !["BUS", "VAN"].includes(vehicleType)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle type" });
        }
        if (!distanceKm || distanceKm <= 0) {
            return res.status(400).json({ success: false, message: "Distance must be positive" });
        }

        return res.status(200).json({
            success: true,
            priceRs: calculatePrice(vehicleType, distanceKm),
            estimatedJourneyMin: calculateJourneyMin(vehicleType, distanceKm),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Calculation failed" });
    }
};

exports.getManagerBookings = async (req, res) => {
    try {
        const bookings = await TransportBooking.find({ managerId: req.user._id })
            .populate("studentId", "fullName email phone")
            .populate("listingId", "vehicleType startLocation destination departureTime")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch bookings", error: error.message });
    }
};
