require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ email: "admin@unilifehub.com" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const admin = await User.create({
      fullName: "System Admin",
      email: "admin@unilifehub.com",
      password: "Admin@123",
      phone: "0000000000",
      role: "ADMIN",
      landlordVerificationStatus: "VERIFIED",
      vendorVerificationStatus: "VERIFIED",
      isActive: true,
    });

    console.log("Admin created successfully:");
    console.log({
      email: admin.email,
      password: "Admin@123",
    });

    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();