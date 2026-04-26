const User = require("../models/User.model");
const TransportListing = require("../models/TransportListing.model");

// ─── Get Pending Transport Managers ──────────────
exports.getPendingTransportManagers = async (req, res) => {
    try {
        const managers = await User.find({
            role: "TRANSPORT_MANAGER",
            transportManagerVerificationStatus: "PENDING",
        })
            .select("fullName email phone transportManagerVerificationStatus createdAt")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, managers });
    } catch (error) {
        console.error("getPendingTransportManagers error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch pending transport managers" });
    }
};

// ─── Verify Transport Manager ────────────────────
exports.verifyTransportManager = async (req, res) => {
    try {
        const manager = await User.findOne({
            _id: req.params.id,
            role: "TRANSPORT_MANAGER",
        });

        if (!manager) {
            return res.status(404).json({ success: false, message: "Transport manager not found" });
        }

        manager.transportManagerVerificationStatus = "VERIFIED";
        manager.verifiedAt = new Date();
        manager.verifiedBy = req.user._id;
        await manager.save();

        return res.status(200).json({
            success: true,
            message: "Transport manager verified successfully",
            manager,
        });
    } catch (error) {
        console.error("verifyTransportManager error:", error);
        return res.status(500).json({ success: false, message: "Failed to verify transport manager" });
    }
};

// ─── Reject Transport Manager ────────────────────
exports.rejectTransportManager = async (req, res) => {
    try {
        const manager = await User.findOne({
            _id: req.params.id,
            role: "TRANSPORT_MANAGER",
        });

        if (!manager) {
            return res.status(404).json({ success: false, message: "Transport manager not found" });
        }

        manager.transportManagerVerificationStatus = "REJECTED";
        await manager.save();

        return res.status(200).json({
            success: true,
            message: "Transport manager rejected",
            manager,
        });
    } catch (error) {
        console.error("rejectTransportManager error:", error);
        return res.status(500).json({ success: false, message: "Failed to reject transport manager" });
    }
};

// ─── Get Pending Transport Listings ──────────────
exports.getPendingTransportListings = async (req, res) => {
    try {
        const listings = await TransportListing.find({ status: "PENDING_APPROVAL" })
            .populate("managerId", "fullName email phone transportManagerVerificationStatus")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, listings });
    } catch (error) {
        console.error("getPendingTransportListings error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch pending listings" });
    }
};

// ─── Approve Transport Listing ───────────────────
exports.approveTransportListing = async (req, res) => {
    try {
        const listing = await TransportListing.findById(req.params.id).populate(
            "managerId",
            "transportManagerVerificationStatus"
        );

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        if (listing.managerId.transportManagerVerificationStatus !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Cannot approve listing — transport manager is not verified",
            });
        }

        listing.status = "APPROVED";
        listing.rejectionReason = "";
        await listing.save();

        return res.status(200).json({ success: true, message: "Listing approved", listing });
    } catch (error) {
        console.error("approveTransportListing error:", error);
        return res.status(500).json({ success: false, message: "Failed to approve listing" });
    }
};

// ─── Reject Transport Listing ────────────────────
exports.rejectTransportListing = async (req, res) => {
    try {
        const listing = await TransportListing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        listing.status = "REJECTED";
        listing.rejectionReason = req.body.reason || "";
        await listing.save();

        return res.status(200).json({ success: true, message: "Listing rejected", listing });
    } catch (error) {
        console.error("rejectTransportListing error:", error);
        return res.status(500).json({ success: false, message: "Failed to reject listing" });
    }
};
