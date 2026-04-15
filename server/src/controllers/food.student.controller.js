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

        return res.status(200).json({
            success: true,
            summary: { weeklyBudget, spent, percent, status },
            suggestions: percent >= 70 ? await FoodItem.listCheapestSafe({ limit: 3 }) : []
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Budget sync failed" });
	}