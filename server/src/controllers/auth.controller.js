const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { upsertAllergyPrefs, getAllergyPrefs } = require("../models/AllergyPreference.model");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const safeUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  bio: user.bio,
  university: user.university,
  studentId: user.studentId,
  dateOfBirth: user.dateOfBirth,
  address: user.address,
  emergencyContact: user.emergencyContact,
  allergenNotes: user.allergenNotes,
  landlordVerificationStatus: user.landlordVerificationStatus,
  vendorVerificationStatus: user.vendorVerificationStatus,
  transportManagerVerificationStatus: user.transportManagerVerificationStatus,
  verifiedAt: user.verifiedAt,
  verifiedBy: user.verifiedBy,
  isSuspended: user.isSuspended,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const userPayload = {
      fullName,
      email,
      password,
      phone,
      role,
    };

    if (role === "LANDLORD") {
      userPayload.landlordVerificationStatus = "PENDING";
    }

    if (role === "VENDOR") {
      userPayload.vendorVerificationStatus = "PENDING";
    }

    if (role === "TRANSPORT_MANAGER") {
      userPayload.transportManagerVerificationStatus = "PENDING";
    }

    const user = await User.create(userPayload);

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: safeUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Account is suspended",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({
      success: true,
      user: safeUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ["fullName", "phone", "bio", "university", "studentId", "dateOfBirth", "address", "emergencyContact", "allergenNotes"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    // Keep AllergyPreference in sync whenever allergenNotes changes
    if (req.body.allergenNotes !== undefined) {
      const allergenList = Array.isArray(req.body.allergenNotes)
        ? req.body.allergenNotes.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
        : [];
      const existing = await getAllergyPrefs(req.user._id);
      await upsertAllergyPrefs(
        req.user._id,
        existing?.diet_type || "",
        allergenList,
        existing?.weekly_budget || 0
      );
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: safeUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
};