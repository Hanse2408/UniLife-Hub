const User = require("../models/User.model");
const mongoose = require("mongoose");

exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            status,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

        const filter = {};

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { fullName: { $regex: escaped, $options: "i" } },
                { email: { $regex: escaped, $options: "i" } },
                { phone: { $regex: escaped, $options: "i" } },
            ];
        }

        if (role && ["STUDENT", "LANDLORD", "VENDOR", "ADMIN", "TRANSPORT_MANAGER"].includes(role)) {
            filter.role = role;
        }

        if (status === "active") {
            filter.isSuspended = false;
            filter.isActive = true;
        } else if (status === "suspended") {
            filter.isSuspended = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        const allowedSortFields = ["fullName", "email", "role", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortDir = sortOrder === "asc" ? 1 : -1;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password -savedListings")
                .sort({ [sortField]: sortDir })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            User.countDocuments(filter),
        ]);

        // Get role counts for stat cards
        const [totalAll, totalStudents, totalLandlords, totalVendors, totalSuspended] =
            await Promise.all([
                User.countDocuments({}),
                User.countDocuments({ role: "STUDENT" }),
                User.countDocuments({ role: "LANDLORD" }),
                User.countDocuments({ role: "VENDOR" }),
                User.countDocuments({ isSuspended: true }),
            ]);

        return res.status(200).json({
            success: true,
            users,
            stats: {
                totalAll,
                totalStudents,
                totalLandlords,
                totalVendors,
                totalSuspended,
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error("getAllUsers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await User.findById(req.params.id).select("-password -savedListings");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("getUserById error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
};

exports.updateUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const { fullName, email, phone, role } = req.body;
        const updates = {};

        if (fullName !== undefined) updates.fullName = fullName;
        if (phone !== undefined) updates.phone = phone;
        if (role !== undefined) {
            if (!["STUDENT", "LANDLORD", "VENDOR", "ADMIN", "TRANSPORT_MANAGER"].includes(role)) {
                return res.status(400).json({ success: false, message: "Invalid role" });
            }
            updates.role = role;
        }
        if (email !== undefined) {
            const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(409).json({ success: false, message: "Email already in use" });
            }
            updates.email = email.toLowerCase();
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        }).select("-password -savedListings");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User updated successfully", user });
    } catch (error) {
        console.error("updateUser error:", error);
        return res.status(500).json({ success: false, message: "Failed to update user" });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        if (req.params.id === req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Cannot delete your own account" });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("deleteUser error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete user" });
    }
};

exports.suspendUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        if (req.params.id === req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Cannot suspend your own account" });
        }

        const { reason } = req.body;
        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "Suspension reason is required (at least 10 characters)",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isSuspended: true, suspensionReason: reason.trim() },
            { new: true }
        ).select("-password -savedListings");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User suspended", user });
    } catch (error) {
        console.error("suspendUser error:", error);
        return res.status(500).json({ success: false, message: "Failed to suspend user" });
    }
};

exports.reactivateUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isSuspended: false, suspensionReason: "" },
            { new: true }
        ).select("-password -savedListings");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User reactivated", user });
    } catch (error) {
        console.error("reactivateUser error:", error);
        return res.status(500).json({ success: false, message: "Failed to reactivate user" });
    }
};
