const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const accommodationRoutes = require("./src/routes/accommodation.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const chatRoutes = require("./src/routes/chat.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const foodStudentRoutes = require("./src/routes/food.student.routes");
const foodVendorRoutes = require("./src/routes/food.vendor.routes");
const foodAdminRoutes = require("./src/routes/food.admin.routes");
const adminUserRoutes = require("./src/routes/admin.user.routes");
const transportManagerRoutes = require("./src/routes/transport.manager.routes");
const transportAdminRoutes = require("./src/routes/transport.admin.routes");
const transportStudentRoutes = require("./src/routes/transport.student.routes");
const reviewRoutes = require("./src/routes/review.routes");

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/accommodation", accommodationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/food/student", foodStudentRoutes);
app.use("/api/food/vendor", foodVendorRoutes);
app.use("/api/food/admin", foodAdminRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/transport/manager", transportManagerRoutes);
app.use("/api/transport/admin", transportAdminRoutes);
app.use("/api/transport/student", transportStudentRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;