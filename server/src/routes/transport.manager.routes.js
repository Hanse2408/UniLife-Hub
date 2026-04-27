const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    createTransportListing,
    getMyTransportListings,
    getTransportListingById,
    updateTransportListing,
    deleteTransportListing,
    calculateTransportPrice,
    getManagerBookings,
} = require("../controllers/transport.manager.controller");

router.use(authRequired, authorizeRoles("TRANSPORT_MANAGER"));

router.post("/listings", createTransportListing);
router.get("/listings", getMyTransportListings);
router.get("/listings/:id", getTransportListingById);
router.patch("/listings/:id", updateTransportListing);
router.delete("/listings/:id", deleteTransportListing);
router.post("/calculate-price", calculateTransportPrice);
router.get("/bookings", getManagerBookings);

module.exports = router;
