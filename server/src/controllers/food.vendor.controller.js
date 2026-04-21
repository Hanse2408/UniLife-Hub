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