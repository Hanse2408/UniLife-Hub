const express = require("express");
const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const {
    createReview,
    getMyReviews,
    getReceivedReviews,
    getUserRating,
    checkReviewExists,
    adminGetAllReviews,
} = require("../controllers/review.controller");


const router = express.Router();

// Student creates a review
router.post("/", authRequired, authorizeRoles("STUDENT"), createReview);

// Student checks if they already reviewed an entity
router.get("/check/:entityId", authRequired, authorizeRoles("STUDENT"), checkReviewExists);

// Student gets their own reviews
router.get("/my", authRequired, authorizeRoles("STUDENT"), getMyReviews);

// Landlord/vendor/transport manager gets reviews received
router.get(
    "/received",
    authRequired,
    authorizeRoles("LANDLORD", "VENDOR", "TRANSPORT_MANAGER"),
    getReceivedReviews
);

// Get star rating for a specific user (any authenticated user)
router.get("/rating/:userId", authRequired, getUserRating);

// Admin gets all reviews
router.get("/admin/all", authRequired, authorizeRoles("ADMIN"), adminGetAllReviews);

module.exports = router;
