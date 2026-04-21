// Validating vendor credentials before granting system access
exports.verifyVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await User.findByIdAndUpdate(id, { isVerified: true }, { new: true });
        
        if (!updated) return res.status(404).json({ success: false, message: "Vendor profile not found." });

        return res.status(200).json({
            success: true,
            message: `Vendor ${updated.name} has been successfully verified for UniLife Hub operations.`,
        });
    } catch (error) {
        console.error("[Admin Verify Error]:", error);
        return res.status(500).json({ success: false, message: "Verification process failed." });
    }
};

// Dispatching order: Transitioning from vendor preparation to campus delivery dispatch
exports.dispatchOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const updated = await Order.findByIdAndUpdate(orderId, { order_status: "dispatched" }, { new: true });

        return res.status(200).json({
            success: true,
            message: "Order has been dispatched and assigned to a delivery partner.",
            order: updated
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Dispatch operation failed." });
    }
};

router.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        module: "food-admin-v1.0",
        timestamp: new Date().toISOString(),
        message: "Administrative food services are active and integrated.",
    });
});