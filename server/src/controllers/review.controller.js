const Review = require("../models/Review.model");
const HousingGroup = require("../models/HousingGroup.model");
const { OrderModel } = require("../models/Order.model");
const TransportBooking = require("../models/TransportBooking.model");
const mongoose = require("mongoose");


// POST /reviews — student creates a review
const createReview = async (req, res) => {
    try {
        const { entityType, entityId, rating, comment } = req.body;
        const reviewerId = req.user._id;

        if (!entityType || !entityId || !rating) {
            return res.status(400).json({ success: false, message: "entityType, entityId, and rating are required." });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
        }

        // Check for duplicate
        const existing = await Review.findOne({ entityId, reviewerId });
        if (existing) {
            return res.status(400).json({ success: false, message: "You have already reviewed this." });
        }

        let revieweeId = null;
        let listingId = null;

        if (entityType === "ACCOMMODATION") {
            // entityId is housingGroup._id — student must be a member
            const group = await HousingGroup.findById(entityId);
            if (!group) return res.status(404).json({ success: false, message: "Housing group not found." });
            const isMember = group.members.some((m) => m.userId.toString() === reviewerId.toString());
            if (!isMember) return res.status(403).json({ success: false, message: "You are not a member of this housing group." });
            revieweeId = group.landlordId;
            listingId = group.listingId;
        } else if (entityType === "FOOD_ORDER") {
            // entityId is order._id — must be the student's order and delivered
            const order = await OrderModel.findById(entityId).populate("items.food_item_id");
            if (!order) return res.status(404).json({ success: false, message: "Order not found." });
            if (order.student_id.toString() !== reviewerId.toString()) {
                return res.status(403).json({ success: false, message: "This is not your order." });
            }
            if (order.order_status !== "delivered") {
                return res.status(400).json({ success: false, message: "You can only review delivered orders." });
            }
            // Get vendor from first food item
            const firstItem = order.items?.[0]?.food_item_id;
            if (!firstItem?.vendor_id) return res.status(400).json({ success: false, message: "Could not determine vendor." });
            revieweeId = firstItem.vendor_id;
        } else if (entityType === "TRANSPORT_BOOKING") {
            const booking = await TransportBooking.findById(entityId);
            if (!booking) return res.status(404).json({ success: false, message: "Transport booking not found." });
            if (booking.studentId.toString() !== reviewerId.toString()) {
                return res.status(403).json({ success: false, message: "This is not your booking." });
            }
            if (booking.status !== "CONFIRMED") {
                return res.status(400).json({ success: false, message: "You can only review confirmed bookings." });
            }
            revieweeId = booking.managerId;
            listingId = booking.listingId;
        } else {
            return res.status(400).json({ success: false, message: "Invalid entityType." });
        }

        const review = await Review.create({
            entityType,
            entityId,
            listingId,
            reviewerId,
            revieweeId,
            rating: Number(rating),
            comment: comment || "",
        });

        return res.status(201).json({ success: true, review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "You have already reviewed this." });
        }
        console.error("createReview error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// GET /reviews/my — get reviews written by current student
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ reviewerId: req.user._id })
            .populate("revieweeId", "fullName email role")
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, reviews });
    } catch (error) {
        console.error("getMyReviews error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// GET /reviews/received — get reviews received by current user (landlord/vendor/transport manager)
const getReceivedReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ revieweeId: req.user._id, isVisible: true })
            .populate("reviewerId", "fullName email")
            .sort({ createdAt: -1 })
            .lean();

        // Compute average rating
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "0.0";

        return res.json({ success: true, reviews, averageRating: parseFloat(averageRating), reviewCount: reviews.length });
    } catch (error) {
        console.error("getReceivedReviews error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// GET /reviews/rating/:userId — get star rating for any user (used by AppShell)
const getUserRating = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await Review.aggregate([
            { $match: { revieweeId: new mongoose.Types.ObjectId(userId), isVisible: true } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        const avg = result[0]?.avg ? parseFloat(result[0].avg.toFixed(1)) : 0;
        const count = result[0]?.count || 0;
        return res.json({ success: true, averageRating: avg, reviewCount: count });
    } catch (error) {
        console.error("getUserRating error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// GET /reviews/check/:entityId — check if current student already reviewed this entity
const checkReviewExists = async (req, res) => {
    try {
        const review = await Review.findOne({
            entityId: req.params.entityId,
            reviewerId: req.user._id,
        }).lean();
        return res.json({ success: true, hasReviewed: !!review, review: review || null });
    } catch (error) {
        console.error("checkReviewExists error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// GET /reviews/admin/all — admin gets all reviews grouped by reviewee role
const adminGetAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ isVisible: true })
            .populate("reviewerId", "fullName email")
            .populate("revieweeId", "fullName email role")
            .sort({ createdAt: -1 })
            .lean();

        // Compute per-user aggregates
        const userMap = {};
        for (const r of reviews) {
            const uid = r.revieweeId?._id?.toString();
            if (!uid) continue;
            if (!userMap[uid]) {
                userMap[uid] = {
                    user: r.revieweeId,
                    totalRating: 0,
                    count: 0,
                    reviews: [],
                };
            }
            userMap[uid].totalRating += r.rating;
            userMap[uid].count += 1;
            userMap[uid].reviews.push(r);
        }

        const users = Object.values(userMap).map((u) => ({
            ...u,
            averageRating: parseFloat((u.totalRating / u.count).toFixed(1)),
        }));

        // Sort by average rating descending
        users.sort((a, b) => b.averageRating - a.averageRating);

        return res.json({ success: true, users, totalReviews: reviews.length });
    } catch (error) {
        console.error("adminGetAllReviews error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

module.exports = {
    createReview,
    getMyReviews,
    getReceivedReviews,
    getUserRating,
    checkReviewExists,
    adminGetAllReviews,
};
