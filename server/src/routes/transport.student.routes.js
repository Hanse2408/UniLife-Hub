const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    browseTransportListings,
    getTransportListingPublic,
    searchTrips,
    bookTrip,
    getMyTransportBookings,
    getTransportBooking,
    payTransportBooking,
    clearTransportHistory,
    getFavoriteLocations,
    addFavoriteLocation,
    removeFavoriteLocation,
    initTripPlan,
    getCurrentTripPlan,
    setTripSlot,
    clearTripSlot,
    getTripPricing,
} = require("../controllers/transport.student.controller");

router.use(authRequired, authorizeRoles("STUDENT"));

// Browse & search
router.get("/listings", browseTransportListings);
router.get("/listings/:id", getTransportListingPublic);
router.get("/search", searchTrips);

// Bookings
router.post("/book", bookTrip);
router.get("/bookings", getMyTransportBookings);
router.delete("/bookings/history", clearTransportHistory);
router.get("/bookings/:id", getTransportBooking);
router.post("/bookings/:id/pay", payTransportBooking);

// Favorites
router.get("/favorites", getFavoriteLocations);
router.post("/favorites", addFavoriteLocation);
router.delete("/favorites/:id", removeFavoriteLocation);

// Trip planner
router.post("/trip-planner/init", initTripPlan);
router.get("/trip-planner/current", getCurrentTripPlan);
router.get("/trip-planner/pricing", getTripPricing);
router.patch("/trip-planner/slot", setTripSlot);
router.delete("/trip-planner/slot", clearTripSlot);

module.exports = router;
