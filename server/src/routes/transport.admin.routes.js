const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    getPendingTransportManagers,
    verifyTransportManager,
    rejectTransportManager,
    getPendingTransportListings,
    approveTransportListing,
    rejectTransportListing,
} = require("../controllers/transport.admin.controller");

router.use(authRequired, authorizeRoles("ADMIN"));

router.get("/managers/pending", getPendingTransportManagers);
router.patch("/managers/:id/verify", verifyTransportManager);
router.patch("/managers/:id/reject", rejectTransportManager);
router.get("/listings/pending", getPendingTransportListings);
router.patch("/listings/:id/approve", approveTransportListing);
router.patch("/listings/:id/reject", rejectTransportListing);

module.exports = router;
