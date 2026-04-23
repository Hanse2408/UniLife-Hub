const User = require("../models/User.model");
const Listing = require("../models/Listing.model");
const Booking = require("../models/Booking.model");
const HousingGroup = require("../models/HousingGroup.model");
const { createNotification } = require("../services/notification.service");

const createListing = async (req, res) => {
  try {
    if (req.user.role !== "LANDLORD") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can create listings",
      });
    }

    if (req.user.landlordVerificationStatus !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Only verified landlords can create listings",
      });
    }

    const listing = await Listing.create({
      ownerId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      rent: req.body.rent,
      keyMoney: req.body.keyMoney || 0,
      billsIncluded: req.body.billsIncluded ?? false,
      roomType: req.body.roomType,
      genderPreference: req.body.genderPreference || "ANY",
      maxOccupants: req.body.maxOccupants,
      availableFrom: req.body.availableFrom,
      facilities: req.body.facilities,
      photos: req.body.photos,
      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    console.error("[createListing] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create listing",
      error: error.message,
    });
  }
};

const getAllListings = async (req, res) => {
  try {
    const {
      city,
      area,
      roomType,
      minRent,
      maxRent,
      status,
      mine,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (req.user && req.user.role === "LANDLORD" && mine === "true") {
      query.ownerId = req.user._id;
    } else if (req.user && req.user.role === "ADMIN" && status) {
      query.status = status;
    } else {
      query.status = "ACTIVE";
    }

    if (city) {
      query["location.city"] = new RegExp(city, "i");
    }

    if (area) {
      query["location.area"] = new RegExp(area, "i");
    }

    if (roomType) {
      query.roomType = roomType;
    }

    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const listings = await Listing.find(query)
      .populate("ownerId", "fullName email landlordVerificationStatus")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Listing.countDocuments(query);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      listings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: error.message,
    });
  }
};

const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "ownerId",
      "fullName email landlordVerificationStatus"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // public/student can only see ACTIVE
    if (listing.status !== "ACTIVE") {
      const canView =
        req.user &&
        (req.user.role === "ADMIN" ||
          String(listing.ownerId._id) === String(req.user._id));

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this listing",
        });
      }
    }

    return res.status(200).json({
      success: true,
      listing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
      error: error.message,
    });
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (String(listing.ownerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own listing",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "location",
      "rent",
      "keyMoney",
      "billsIncluded",
      "roomType",
      "genderPreference",
      "maxOccupants",
      "availableFrom",
      "facilities",
      "photos",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      listing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update listing",
      error: error.message,
    });
  }
};

const verifyLandlord = async (req, res) => {
  try {
    const landlord = await User.findById(req.params.id);

    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    if (landlord.role !== "LANDLORD") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a landlord",
      });
    }

    landlord.landlordVerificationStatus = "VERIFIED";
    landlord.verifiedAt = new Date();
    landlord.verifiedBy = req.user._id;

    await landlord.save();

    await createNotification({
      userId: landlord._id,
      type: "ADMIN_VERIFIED",
      title: "Landlord account verified",
      message: "Your landlord account has been verified by the admin.",
      entityType: "USER",
      entityId: landlord._id,
    });

    return res.status(200).json({
      success: true,
      message: "Landlord verified successfully",
      landlord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify landlord",
      error: error.message,
    });
  }
};

const rejectLandlordVerification = async (req, res) => {
  try {
    const landlord = await User.findById(req.params.id);

    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    if (landlord.role !== "LANDLORD") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a landlord",
      });
    }

    landlord.landlordVerificationStatus = "REJECTED";
    landlord.verifiedAt = null;
    landlord.verifiedBy = null;

    await landlord.save();

    return res.status(200).json({
      success: true,
      message: "Landlord verification rejected",
      landlord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject landlord verification",
      error: error.message,
    });
  }
};

const approveListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("ownerId");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (
      !listing.ownerId ||
      listing.ownerId.role !== "LANDLORD" ||
      listing.ownerId.landlordVerificationStatus !== "VERIFIED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Listing owner is not a verified landlord",
      });
    }

    listing.status = "ACTIVE";
    listing.approvedAt = new Date();
    listing.approvedBy = req.user._id;
    listing.rejectionReason = "";

    await listing.save();

    await createNotification({
      userId: listing.ownerId._id || listing.ownerId,
      type: "LISTING_APPROVED",
      title: "Listing approved",
      message: "Your accommodation listing is now active.",
      entityType: "LISTING",
      entityId: listing._id,
    });

    return res.status(200).json({
      success: true,
      message: "Listing approved successfully",
      listing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve listing",
      error: error.message,
    });
  }
};

const rejectListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.status = "REJECTED";
    listing.approvedAt = null;
    listing.approvedBy = null;
    listing.rejectionReason = req.body.rejectionReason || "Listing rejected by admin";

    await listing.save();

    await createNotification({
      userId: listing.ownerId,
      type: "LISTING_REJECTED",
      title: "Listing rejected",
      message: listing.rejectionReason || "Your listing was rejected by admin.",
      entityType: "LISTING",
      entityId: listing._id,
    });

    return res.status(200).json({
      success: true,
      message: "Listing rejected successfully",
      listing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject listing",
      error: error.message,
    });
  }
};

const createBookingRequest = async (req, res) => {
  try {
    const { listingId, moveInDate, visitDate, requestMessage } = req.body;

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Booking is allowed only for active listings",
      });
    }

    if (String(listing.ownerId) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own listing",
      });
    }

    if (listing.currentOccupancy >= listing.maxOccupants) {
      return res.status(400).json({
        success: false,
        message: "This listing is already full",
      });
    }

    const parsedMoveInDate = new Date(moveInDate);
    const now = new Date();

    if (parsedMoveInDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Move-in date must be in the future",
      });
    }

    const existingBooking = await Booking.findOne({
      studentId: req.user._id,
      listingId,
      status: {
        $in: [
          "REQUESTED",
          "APPROVED",
          "PAYMENT_PENDING",
          "CONFIRMED",
          "ACTIVE_STAY",
        ],
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking flow for this listing",
      });
    }

    const booking = await Booking.create({
      studentId: req.user._id,
      landlordId: listing.ownerId,
      listingId: listing._id,
      moveInDate: parsedMoveInDate,
      visitDate: visitDate ? new Date(visitDate) : null,
      requestMessage: requestMessage || "",
      status: "REQUESTED",
      rentAmount: listing.rent,
      keyMoneyAmount: listing.keyMoney || 0,
      totalBookingAmount: listing.keyMoney > 0 ? listing.keyMoney : listing.rent,
    });

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create booking request",
      error: error.message,
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ studentId: req.user._id })
      .populate("listingId", "title location rent keyMoney roomType status photos")
      .populate("landlordId", "fullName email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your bookings",
      error: error.message,
    });
  }
};

const getLandlordBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ landlordId: req.user._id })
      .populate("studentId", "fullName email phone")
      .populate("listingId", "title location rent keyMoney roomType status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landlord bookings",
      error: error.message,
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("studentId", "fullName email phone")
      .populate("landlordId", "fullName email phone")
      .populate("listingId", "title location rent keyMoney roomType status photos");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isStudent = String(booking.studentId._id) === String(req.user._id);
    const isLandlord = String(booking.landlordId._id) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";

    if (!isStudent && !isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this booking",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

const approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("listingId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (String(booking.landlordId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only approve bookings for your own listings",
      });
    }

    if (booking.status !== "REQUESTED") {
      return res.status(400).json({
        success: false,
        message: "Only requested bookings can be approved",
      });
    }

    if (!booking.listingId || booking.listingId.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be approved because the listing is not active",
      });
    }

    if (booking.listingId.currentOccupancy >= booking.listingId.maxOccupants) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve booking because the listing is already full",
      });
    }

    booking.status = "PAYMENT_PENDING";
    booking.approvedAt = new Date();
    booking.paymentDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await booking.save();

    await createNotification({
      userId: booking.studentId,
      type: "BOOKING_APPROVED",
      title: "Booking approved",
      message: "Your booking was approved. Please complete the payment.",
      entityType: "BOOKING",
      entityId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Booking approved. Waiting for student payment.",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve booking",
      error: error.message,
    });
  }
};

const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (String(booking.landlordId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only reject bookings for your own listings",
      });
    }

    if (booking.status !== "REQUESTED") {
      return res.status(400).json({
        success: false,
        message: "Only requested bookings can be rejected",
      });
    }

    booking.status = "REJECTED";
    booking.rejectedAt = new Date();
    booking.rejectionReason =
      req.body.rejectionReason || "Booking rejected by landlord";

    await booking.save();

    await createNotification({
      userId: booking.studentId,
      type: "BOOKING_REJECTED",
      title: "Booking rejected",
      message: booking.rejectionReason || "Your booking request was rejected.",
      entityType: "BOOKING",
      entityId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Booking rejected successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject booking",
      error: error.message,
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isStudent = String(booking.studentId) === String(req.user._id);
    const isLandlord = String(booking.landlordId) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";

    if (!isStudent && !isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this booking",
      });
    }

    if (!["REQUESTED", "APPROVED", "PAYMENT_PENDING"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Only requested, approved, or payment pending bookings can be cancelled",
      });
    }

    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
    booking.cancellationReason =
      req.body.cancellationReason || "Booking cancelled";

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

const getHousingGroupByBooking = async (req, res) => {
  try {
    const housingGroup = await HousingGroup.findOne({
      bookingId: req.params.bookingId,
    })
      .populate("listingId", "title location rent roomType photos")
      .populate("landlordId", "fullName email phone")
      .populate("members.userId", "fullName email phone role")
      .lean();

    if (!housingGroup) {
      return res.status(404).json({
        success: false,
        message: "Housing group not found",
      });
    }

    const isMember = housingGroup.members.some(
      (member) => String(member.userId?._id) === String(req.user._id)
    );

    const isLandlord =
      String(housingGroup.landlordId?._id) === String(req.user._id);

    const isAdmin = req.user.role === "ADMIN";

    if (!isMember && !isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this housing group",
      });
    }

    // Ensure roommatePreferences is always present on each member
    housingGroup.members = housingGroup.members.map((m) => ({
      ...m,
      roommatePreferences: m.roommatePreferences || {},
    }));

    return res.status(200).json({
      success: true,
      housingGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch housing group",
      error: error.message,
    });
  }
};

const getMyCurrentHousingGroup = async (req, res) => {
  try {
    const housingGroup = await HousingGroup.findOne({
      "members.userId": req.user._id,
      status: "ACTIVE",
    })
      .populate("listingId", "title location rent roomType photos")
      .populate("landlordId", "fullName email phone")
      .populate("members.userId", "fullName email phone role")
      .sort({ createdAt: -1 });

    if (!housingGroup) {
      return res.status(404).json({
        success: false,
        message: "No active housing group found",
      });
    }

    return res.status(200).json({
      success: true,
      housingGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch current housing group",
      error: error.message,
    });
  }
};

const updateMoveInChecklist = async (req, res) => {
  try {
    const housingGroup = await HousingGroup.findById(req.params.id);

    if (!housingGroup) {
      return res.status(404).json({
        success: false,
        message: "Housing group not found",
      });
    }

    const isMember = housingGroup.members.some(
      (member) => String(member.userId) === String(req.user._id)
    );

    const isLandlord = String(housingGroup.landlordId) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";

    if (!isMember && !isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this checklist",
      });
    }

    const { keyMoneyPaid, keyReceived, inventoryConfirmed } = req.body;

    if (keyMoneyPaid !== undefined) {
      housingGroup.moveInChecklist.keyMoneyPaid = keyMoneyPaid;
    }

    if (keyReceived !== undefined) {
      housingGroup.moveInChecklist.keyReceived = keyReceived;
    }

    if (inventoryConfirmed !== undefined) {
      housingGroup.moveInChecklist.inventoryConfirmed = inventoryConfirmed;
    }

    housingGroup.moveInChecklist.checkedAt = new Date();

    await housingGroup.save();

    return res.status(200).json({
      success: true,
      message: "Move-in checklist updated successfully",
      housingGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update move-in checklist",
      error: error.message,
    });
  }
};

const getPendingLandlords = async (req, res) => {
  try {
    const landlords = await User.find({
      role: "LANDLORD",
      landlordVerificationStatus: "PENDING",
    })
      .select("fullName email phone landlordVerificationStatus createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      landlords,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending landlords",
      error: error.message,
    });
  }
};

const toggleListingStatus = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    if (String(listing.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only toggle your own listing" });
    }
    listing.status = listing.status === "ACTIVE" ? "UNAVAILABLE" : "ACTIVE";
    await listing.save();
    return res.status(200).json({
      success: true,
      message: `Listing marked as ${listing.status === "ACTIVE" ? "active" : "inactive"}`,
      listing,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to toggle listing status", error: error.message });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    if (String(listing.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only delete your own listing" });
    }
    const activeBookings = await Booking.countDocuments({
      listingId: listing._id,
      status: { $in: ["PENDING", "APPROVED"] },
    });
    if (activeBookings > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete a listing with active bookings" });
    }
    await Listing.findByIdAndDelete(listing._id);
    return res.status(200).json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete listing", error: error.message });
  }
};

/* ── Roommate Preferences ── */
const updateRoommatePreferences = async (req, res) => {
  try {
    // Verify the user is a member before updating
    const existing = await HousingGroup.findOne({
      _id: req.params.id,
      "members.userId": req.user._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Housing group not found or you are not a member" });
    }

    const member = existing.members.find(
      (m) => String(m.userId) === String(req.user._id)
    );

    const allowed = [
      "sleepSchedule", "workSchedule", "cleanlinessLevel",
      "guestPolicy", "noiseTolerance", "studyHabits",
      "smokingPolicy", "petsPolicy", "bio",
    ];

    // Merge existing prefs with incoming updates
    const mergedPrefs = { ...(member.roommatePreferences || {}) };
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        mergedPrefs[key] = req.body[key];
      }
    });

    // Use positional $ operator for a reliable atomic update
    const updated = await HousingGroup.findOneAndUpdate(
      { _id: req.params.id, "members.userId": req.user._id },
      { $set: { "members.$.roommatePreferences": mergedPrefs } },
      { new: true, runValidators: false }
    ).lean();

    const updatedMember = updated.members.find(
      (m) => String(m.userId) === String(req.user._id)
    );

    return res.status(200).json({
      success: true,
      message: "Roommate preferences updated",
      preferences: updatedMember?.roommatePreferences || mergedPrefs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update preferences", error: error.message });
  }
};

/* ── Listing roommates (public-ish for listing details) ── */
const getListingRoommates = async (req, res) => {
  try {
    const housingGroups = await HousingGroup.find({
      listingId: req.params.listingId,
      status: "ACTIVE",
    }).populate("members.userId", "fullName");

    // Collect all members with their preferences
    const roommates = [];
    housingGroups.forEach((hg) => {
      hg.members.forEach((m) => {
        roommates.push({
          name: m.userId?.fullName || "Resident",
          preferences: m.roommatePreferences || {},
        });
      });
    });

    return res.status(200).json({ success: true, roommates });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch roommates", error: error.message });
  }
};

/* ── Landlord housing groups (for checklist management) ── */
const getLandlordHousingGroups = async (req, res) => {
  try {
    const housingGroups = await HousingGroup.find({
      landlordId: req.user._id,
    })
      .populate("listingId", "title location roomType")
      .populate("members.userId", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, housingGroups });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch housing groups", error: error.message });
  }
};

module.exports = {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  toggleListingStatus,
  deleteListing,
  verifyLandlord,
  rejectLandlordVerification,
  approveListing,
  rejectListing,
  createBookingRequest,
  getMyBookings,
  getLandlordBookings,
  getBookingById,
  approveBooking,
  rejectBooking,
  cancelBooking,
  getHousingGroupByBooking,
  getMyCurrentHousingGroup,
  updateMoveInChecklist,
  getPendingLandlords,
  updateRoommatePreferences,
  getListingRoommates,
  getLandlordHousingGroups,
};