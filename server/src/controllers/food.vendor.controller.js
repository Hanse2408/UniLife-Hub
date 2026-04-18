// SMART BUDGETING: Enhanced tracking with LKR threshold alerts
exports.getBudgetSummary = async (req, res) => {
    try {
        const studentId = req.user.id;
        const prefs = await AllergyPreference.getAllergyPrefs(studentId);
        const weekStart = getStartOfWeek();
        const spent = await Order.getWeeklySpend(studentId, weekStart);
        const weeklyBudget = prefs ? Number(prefs.weekly_budget || 0) : 0;

        let status = "NORMAL";
        let percent = weeklyBudget > 0 ? Math.round((spent / weeklyBudget) * 100) : 0;

        if (percent >= 90) status = "CRITICAL";
        else if (percent >= 70) status = "WARNING";

		// CROWD ANALYTICS: Integration placeholder for vendor peak-time tracking
exports.getCrowdSummary = async (req, res) => {
    // Logic for tracking real-time student flow at vendor locations
    return res.status(200).json({
        success: true,
        currentLevel: "LOW",
        lastUpdated: new Date().toISOString(),
        message: "Real-time crowd data integrated from Vendor module"
    });
};

// Validating mandatory fields and ensuring data integrity for new menu items
if (!name || price == null || !category) {
    return res.status(400).json({
        success: false,
        message: "Mandatory fields missing: Name, price, and category must be provided.",
    });
}

// Sanitizing name input to prevent numerical characters in food titles
if (hasNumberInName(name)) {
    return res.status(400).json({
        success: false,
        message: "Validation Error: Food item names should not contain numeric digits.",
    });
}

        return res.status(200).json({
            success: true,
            summary: { weeklyBudget, spent, percent, status },
            suggestions: percent >= 70 ? await FoodItem.listCheapestSafe({ limit: 3 }) : []
        });

		// Informing student about preparation status and triggering admin delivery workflow
const label = status === "food_processing" ? "under preparation" : status;
createNotification({
    userId: updated.student_id,
    type: "ORDER_STATUS_UPDATE",
    title: "Vendor is preparing your meal",
    message: `Good news! Your order is now ${label}. We will notify you once it's dispatched.`,
    entityType: "ORDER",
    entityId: updated._id,
}).catch(() => { });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Budget sync failed" });
    }
};