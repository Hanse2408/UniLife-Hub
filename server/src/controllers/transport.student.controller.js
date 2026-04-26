const TransportListing = require("../models/TransportListing.model");
const TransportBooking = require("../models/TransportBooking.model");
const FavoriteLocation = require("../models/FavoriteLocation.model");
const { initWeeklyTripPlan, setTripSlot, clearTripSlot, getCurrentTripPlan, calculateFee, getTotalCost, TRANSPORT_MODES, PRICE_PER_KM, BASE_FARE } = require("../models/TripPlan.model");
const { createNotification } = require("../services/notification.service");
const mongoose = require("mongoose");

// ─── Helpers ─────────────────────────────────────
function isRouteAvailableOnDate(listing, dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun ... 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    switch (listing.frequency) {
        case "DAILY":
            return true;
        case "WEEKDAYS_ONLY":
            return !isWeekend;
        case "WEEKENDS_ONLY":
            return isWeekend;
        case "SPECIFIC_DATES":
            return (listing.specificDates || []).includes(dateStr);
        default:
            return true;
    }
}

const generateRef = (prefix = "TRN") => {
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${Date.now()}-${random}`;
};

// ─── Browse Approved Listings ────────────────────
exports.browseTransportListings = async (req, res) => {
    try {
        const listings = await TransportListing.find({
            status: "APPROVED",
            isActive: true,
        })
            .populate("managerId", "fullName email phone")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, listings });
    } catch (error) {
        console.error("browseTransportListings error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch listings" });
    }
};

// ─── Get Single Listing (public) ─────────────────
exports.getTransportListingPublic = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await TransportListing.findOne({
            _id: req.params.id,
            status: "APPROVED",
            isActive: true,
        }).populate("managerId", "fullName email phone");

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        return res.status(200).json({ success: true, listing });
    } catch (error) {
        console.error("getTransportListingPublic error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch listing" });
    }
};

// ─── Search Trips ────────────────────────────────
exports.searchTrips = async (req, res) => {
    try {
        const { pickup, dropoff, journeyDate, time, passengers } = req.query;
        const numPassengers = parseInt(passengers) || 1;

        // Get all approved active listings
        const allListings = await TransportListing.find({
            status: "APPROVED",
            isActive: true,
        }).populate("managerId", "fullName email phone");

        // Filter by date availability (frequency rules)
        let available = allListings;
        if (journeyDate) {
            available = available.filter((l) => isRouteAvailableOnDate(l, journeyDate));
        }

        // For each listing, count existing bookings on journey date to compute remaining seats
        const listingsWithSeats = await Promise.all(
            available.map(async (listing) => {
                let bookedSeats = 0;
                if (journeyDate) {
                    const bookings = await TransportBooking.aggregate([
                        {
                            $match: {
                                listingId: listing._id,
                                journeyDate,
                                status: "CONFIRMED",
                            },
                        },
                        { $group: { _id: null, total: { $sum: "$passengers" } } },
                    ]);
                    bookedSeats = bookings[0]?.total || 0;
                }
                const remainingSeats = listing.availableSeats - bookedSeats;
                return { listing, remainingSeats };
            })
        );

        // Filter out listings with insufficient seats
        const withSeats = listingsWithSeats.filter((l) => l.remainingSeats >= numPassengers);

        // Build all location names (start + stops + destination) for each listing for matching
        const buildLocationNames = (listing) => {
            const names = [];
            names.push(listing.startLocation.name.toLowerCase());
            (listing.stops || []).forEach((s) => names.push(s.name.toLowerCase()));
            names.push(listing.destination.name.toLowerCase());
            return names;
        };

        const pickupLower = (pickup || "").toLowerCase().trim();
        const dropoffLower = (dropoff || "").toLowerCase().trim();

        // Score each listing: exact match on both pickup/dropoff is highest
        const scored = withSeats.map(({ listing, remainingSeats }) => {
            const locNames = buildLocationNames(listing);
            let score = 0;

            if (pickupLower) {
                const pickupIdx = locNames.findIndex((n) => n.includes(pickupLower));
                if (pickupIdx >= 0) score += 10;
            }
            if (dropoffLower) {
                const dropoffIdx = locNames.findIndex((n) => n.includes(dropoffLower));
                if (dropoffIdx >= 0) score += 10;
            }
            // Check order: pickup should come before dropoff in route
            if (pickupLower && dropoffLower) {
                const pickupIdx = locNames.findIndex((n) => n.includes(pickupLower));
                const dropoffIdx = locNames.findIndex((n) => n.includes(dropoffLower));
                if (pickupIdx >= 0 && dropoffIdx >= 0 && pickupIdx < dropoffIdx) {
                    score += 5; // Correct direction bonus
                }
            }
            // Time match bonus
            if (time && listing.departureTime) {
                if (listing.departureTime === time) score += 3;
                else {
                    // Within 1 hour bonus
                    const [reqH] = time.split(":").map(Number);
                    const [depH] = listing.departureTime.split(":").map(Number);
                    if (Math.abs(reqH - depH) <= 1) score += 1;
                }
            }

            return {
                listing: {
                    ...listing.toObject(),
                    remainingSeats,
                },
                score,
            };
        });

        // Sort: highest score first, then earliest departure time
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.listing.departureTime || "99:99").localeCompare(b.listing.departureTime || "99:99");
        });

        const results = scored.map((s) => s.listing);

        return res.status(200).json({ success: true, listings: results });
    } catch (error) {
        console.error("searchTrips error:", error);
        return res.status(500).json({ success: false, message: "Search failed" });
    }
};

// ─── Book a Trip ─────────────────────────────────
exports.bookTrip = async (req, res) => {
    try {
        const { listingId, journeyDate, passengers, pickupStop, dropoffStop } = req.body;

        if (!listingId || !journeyDate || !passengers || !pickupStop || !dropoffStop) {
            return res.status(400).json({ success: false, message: "All booking fields are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await TransportListing.findOne({
            _id: listingId,
            status: "APPROVED",
            isActive: true,
        });

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found or not active" });
        }

        // Check frequency availability
        if (!isRouteAvailableOnDate(listing, journeyDate)) {
            return res.status(400).json({ success: false, message: "This route does not operate on the selected date" });
        }

        // Check available seats
        const bookedAgg = await TransportBooking.aggregate([
            {
                $match: {
                    listingId: listing._id,
                    journeyDate,
                    status: "CONFIRMED",
                },
            },
            { $group: { _id: null, total: { $sum: "$passengers" } } },
        ]);
        const bookedSeats = bookedAgg[0]?.total || 0;
        const remaining = listing.availableSeats - bookedSeats;

        if (remaining < passengers) {
            return res.status(400).json({
                success: false,
                message: `Only ${remaining} seat(s) available for this date`,
            });
        }

        // ─── Calculate partial price based on pickup/dropoff stops ───
        const allRouteStops = [
            { name: listing.startLocation.name, lat: listing.startLocation.lat, lng: listing.startLocation.lng, distanceFromStart: 0 },
            ...(listing.stops || []),
            { name: listing.destination.name, lat: listing.destination.lat, lng: listing.destination.lng, distanceFromStart: listing.totalDistanceKm },
        ];

        const pickupIdx = allRouteStops.findIndex((s) => s.name === pickupStop.name);
        const dropoffIdx = allRouteStops.findIndex((s) => s.name === dropoffStop.name);

        let totalPrice;
        if (pickupIdx >= 0 && dropoffIdx >= 0 && pickupIdx < dropoffIdx) {
            const segmentDistance = allRouteStops[dropoffIdx].distanceFromStart - allRouteStops[pickupIdx].distanceFromStart;
            const ratio = listing.totalDistanceKm > 0 ? segmentDistance / listing.totalDistanceKm : 1;
            totalPrice = Math.round(listing.priceRs * ratio) * passengers;
        } else {
            // Fallback to full price if stops don't match route
            totalPrice = listing.priceRs * passengers;
        }

        const booking = await TransportBooking.create({
            studentId: req.user._id,
            listingId: listing._id,
            managerId: listing.managerId,
            journeyDate,
            passengers,
            pickupStop,
            dropoffStop,
            totalPrice,
            status: "PENDING",
            paymentRef: "",
            paidAt: null,
        });

        // Notify transport manager
        createNotification({
            userId: listing.managerId,
            type: "TRANSPORT_BOOKING",
            title: "New transport booking",
            message: `A student booked ${passengers} seat(s) on your ${listing.startLocation?.name} → ${listing.destination?.name} route for ${journeyDate}.`,
            entityType: "TRANSPORT",
            entityId: booking._id,
        }).catch(() => { });

        return res.status(201).json({
            success: true,
            message: "Booking created. Proceed to payment.",
            booking,
        });
    } catch (error) {
        console.error("bookTrip error:", error);
        return res.status(500).json({ success: false, message: "Failed to book trip" });
    }
};

// ─── My Bookings ─────────────────────────────────
exports.getMyTransportBookings = async (req, res) => {
    try {
        const bookings = await TransportBooking.find({ studentId: req.user._id })
            .populate("listingId")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error("getMyTransportBookings error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
};

// ─── Get Single Transport Booking ────────────────
exports.getTransportBooking = async (req, res) => {
    try {
        const booking = await TransportBooking.findOne({
            _id: req.params.id,
            studentId: req.user._id,
        }).populate("listingId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        return res.status(200).json({ success: true, booking });
    } catch (error) {
        console.error("getTransportBooking error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch booking" });
    }
};

// ─── Pay Transport Booking (Demo Gateway) ────────
exports.payTransportBooking = async (req, res) => {
    try {
        const booking = await TransportBooking.findOne({
            _id: req.params.id,
            studentId: req.user._id,
        }).populate("listingId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.status !== "PENDING") {
            return res.status(400).json({ success: false, message: "Booking is already paid or cancelled" });
        }

        // Confirm payment
        booking.status = "CONFIRMED";
        booking.paymentRef = generateRef("TRN");
        booking.paidAt = new Date();
        await booking.save();

        // Notify transport manager
        const listing = booking.listingId;
        if (listing?.managerId) {
            await createNotification({
                userId: listing.managerId,
                type: "PAYMENT_SUCCESS",
                title: "New transport booking",
                message: `A student booked ${booking.passengers} seat(s) on your ${listing.startLocation?.name || "—"} → ${listing.destination?.name || "—"} route for ${booking.journeyDate}.`,
                entityType: "BOOKING",
                entityId: booking._id,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment successful. Booking confirmed!",
            booking,
            paymentRef: booking.paymentRef,
        });
    } catch (error) {
        console.error("payTransportBooking error:", error);
        return res.status(500).json({ success: false, message: "Payment failed" });
    }
};

// ─── Clear Transport Booking History ─────────────
exports.clearTransportHistory = async (req, res) => {
    try {
        const result = await TransportBooking.deleteMany({
            studentId: req.user._id,
            status: { $in: ["CONFIRMED", "CANCELLED"] },
        });

        return res.status(200).json({
            success: true,
            message: `Cleared ${result.deletedCount} booking(s) from history.`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("clearTransportHistory error:", error);
        return res.status(500).json({ success: false, message: "Failed to clear history" });
    }
};

// ─── Favorite Locations ──────────────────────────
exports.getFavoriteLocations = async (req, res) => {
    try {
        const favorites = await FavoriteLocation.find({ studentId: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, favorites });
    } catch (error) {
        console.error("getFavoriteLocations error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch favorites" });
    }
};

exports.addFavoriteLocation = async (req, res) => {
    try {
        const { name, lat, lng } = req.body;
        if (!name || lat == null || lng == null) {
            return res.status(400).json({ success: false, message: "name, lat, lng are required" });
        }

        const existing = await FavoriteLocation.findOne({
            studentId: req.user._id,
            name: name.trim(),
        });
        if (existing) {
            return res.status(409).json({ success: false, message: "Location already in favorites" });
        }

        const fav = await FavoriteLocation.create({
            studentId: req.user._id,
            name: name.trim(),
            lat,
            lng,
        });

        return res.status(201).json({ success: true, favorite: fav });
    } catch (error) {
        console.error("addFavoriteLocation error:", error);
        return res.status(500).json({ success: false, message: "Failed to add favorite" });
    }
};

exports.removeFavoriteLocation = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const fav = await FavoriteLocation.findOneAndDelete({
            _id: req.params.id,
            studentId: req.user._id,
        });

        if (!fav) {
            return res.status(404).json({ success: false, message: "Favorite not found" });
        }

        return res.status(200).json({ success: true, message: "Favorite removed" });
    } catch (error) {
        console.error("removeFavoriteLocation error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove favorite" });
    }
};

// ─── Trip Planner ────────────────────────────────
exports.initTripPlan = async (req, res) => {
    try {
        const { weeklyBudget } = req.body;
        if (!weeklyBudget || Number(weeklyBudget) <= 0) {
            return res.status(400).json({ success: false, message: "weeklyBudget must be greater than 0" });
        }

        const plan = await initWeeklyTripPlan(req.user._id, Number(weeklyBudget));
        return res.status(200).json({ success: true, plan });
    } catch (error) {
        console.error("initTripPlan error:", error);
        return res.status(500).json({ success: false, message: "Failed to initialise trip plan" });
    }
};

exports.getCurrentTripPlan = async (req, res) => {
    try {
        const plan = await getCurrentTripPlan(req.user._id);
        if (!plan) {
            return res.status(200).json({ success: true, plan: null, budgetExceeded: false });
        }
        const total = getTotalCost(plan);
        const budgetExceeded = plan.weeklyBudget > 0 && total > plan.weeklyBudget;
        return res.status(200).json({ success: true, plan, budgetExceeded, totalPlanned: total });
    } catch (error) {
        console.error("getCurrentTripPlan error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch trip plan" });
    }
};

exports.setTripSlot = async (req, res) => {
    try {
        const { day, slot, transportMode, pickupLocation, dropoffLocation, distanceKm, addReturn } = req.body;

        const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const validSlots = ["morning", "evening"];

        if (!validDays.includes(day) || !validSlots.includes(slot)) {
            return res.status(400).json({ success: false, message: "Valid day and slot (morning/evening) are required" });
        }
        if (!TRANSPORT_MODES.includes(transportMode)) {
            return res.status(400).json({ success: false, message: "Invalid transport mode" });
        }
        if (!pickupLocation?.name || !dropoffLocation?.name || !distanceKm || distanceKm <= 0) {
            return res.status(400).json({ success: false, message: "Pickup, dropoff, and valid distance are required" });
        }

        const priceRs = calculateFee(transportMode, Number(distanceKm));

        const tripItem = {
            transportMode,
            pickupLocation: {
                name: pickupLocation.name,
                lat: pickupLocation.lat || 0,
                lng: pickupLocation.lng || 0,
            },
            dropoffLocation: {
                name: dropoffLocation.name,
                lat: dropoffLocation.lat || 0,
                lng: dropoffLocation.lng || 0,
            },
            distanceKm: Number(distanceKm),
            priceRs,
            isReturn: false,
        };

        let plan = await setTripSlot(req.user._id, day, slot, tripItem);

        if (!plan) {
            return res.status(400).json({ success: false, message: "No trip plan found. Please initialise first." });
        }

        // If addReturn is checked and slot is morning, auto-add evening with reversed pickup/dropoff
        if (addReturn && slot === "morning") {
            const returnItem = {
                transportMode,
                pickupLocation: {
                    name: dropoffLocation.name,
                    lat: dropoffLocation.lat || 0,
                    lng: dropoffLocation.lng || 0,
                },
                dropoffLocation: {
                    name: pickupLocation.name,
                    lat: pickupLocation.lat || 0,
                    lng: pickupLocation.lng || 0,
                },
                distanceKm: Number(distanceKm),
                priceRs,
                isReturn: true,
            };
            plan = await setTripSlot(req.user._id, day, "evening", returnItem);
        }

        const total = getTotalCost(plan);
        const budgetExceeded = plan.weeklyBudget > 0 && total > plan.weeklyBudget;

        return res.status(200).json({
            success: true,
            plan,
            budgetExceeded,
            totalPlanned: total,
        });
    } catch (error) {
        console.error("setTripSlot error:", error);
        return res.status(500).json({ success: false, message: "Failed to set trip slot" });
    }
};

exports.clearTripSlot = async (req, res) => {
    try {
        const { day, slot } = req.body;

        let plan = await clearTripSlot(req.user._id, day, slot);

        if (!plan) {
            return res.status(400).json({ success: false, message: "No trip plan found for this week" });
        }

        // If clearing morning and there is a return trip in evening, clear that too
        if (slot === "morning") {
            const dayData = plan.tripSlots?.find((d) => d.day === day);
            if (dayData?.trips?.evening?.isReturn) {
                plan = await clearTripSlot(req.user._id, day, "evening");
            }
        }

        const total = getTotalCost(plan);
        const budgetExceeded = plan.weeklyBudget > 0 && total > plan.weeklyBudget;

        return res.status(200).json({ success: true, plan, budgetExceeded, totalPlanned: total });
    } catch (error) {
        console.error("clearTripSlot error:", error);
        return res.status(500).json({ success: false, message: "Failed to clear trip slot" });
    }
};

exports.getTripPricing = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            modes: TRANSPORT_MODES,
            baseFare: BASE_FARE,
            pricePerKm: PRICE_PER_KM,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to get pricing" });
    }
};
