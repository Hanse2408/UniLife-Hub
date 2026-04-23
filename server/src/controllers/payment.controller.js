const Payment = require("../models/Payment.model");
const Order = require("../models/Order.model");
const { createNotification } = require("../services/notification.service");

// Helper for generating unique food order payment references
const generateFoodRefId = (prefix = "FOOD") => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${Date.now()}-${random}`;
};
const Payment = require("../models/Payment.model");
const Booking = require("../models/Booking.model");
const Listing = require("../models/Listing.model");
const HousingGroup = require("../models/HousingGroup.model");
const { createNotification } = require("../services/notification.service");

const generateReferenceId = (prefix = "PAY") => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${Date.now()}-${random}`;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const buildDueDateFromMonthKey = (monthKey, dueDay = 5) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, dueDay, 23, 59, 59);
};

const payBookingAmount = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("listingId")
      .populate("studentId", "fullName email")
      .populate("landlordId", "fullName email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    exports.payFoodOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("student_id", "fullName");
    
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const payment = await Payment.create({
      studentId: order.student_id,
      amount: order.total_amount,
      type: "FOOD_PURCHASE",
      status: "PAID",
      referenceId: generateFoodRefId("PAY"),
      paidAt: new Date()
    });

    order.payment_status = "paid";
    await order.save();

    return res.status(201).json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Payment failed" });
  }
};

    if (String(booking.studentId._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only pay for your own booking",
      });
    }

    if (!["APPROVED", "PAYMENT_PENDING"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Only approved or payment pending bookings can be paid",
      });
    }

    // Notification for real-time payment confirmation
    await createNotification({
      userId: order.student_id,
      type: "PAYMENT_SUCCESS",
      title: "Payment Successful",
      message: `LKR ${order.total_amount} paid for Order #${orderId.slice(-6)}.`,
    });

    const existingPaidBookingPayment = await Payment.findOne({
      bookingId: booking._id,
      studentId: req.user._id,
      status: "PAID",
    });

    if (existingPaidBookingPayment) {
      return res.status(409).json({
        success: false,
        message: "First payment for this booking has already been completed",
      });
    }

    const existingHousingGroup = await HousingGroup.findOne({
      bookingId: booking._id,
    });

    if (existingHousingGroup) {
      return res.status(409).json({
        success: false,
        message: "Housing group already exists for this booking",
      });
    }

    const listing = await Listing.findById(booking.listingId._id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Listing is not active",
      });
    }

    if (listing.currentOccupancy >= listing.maxOccupants) {
      return res.status(400).json({
        success: false,
        message: "Listing is already full",
      });
    }

    const isKeyMoney = booking.keyMoneyAmount > 0;
    const paymentType = isKeyMoney ? "KEY_MONEY" : "RENT";
    const paymentAmount = booking.totalBookingAmount;
    const moveInDate = new Date(booking.moveInDate);
    const nextBillingDate = new Date(moveInDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const monthKey = isKeyMoney ? null : moveInDate.toISOString().split("T")[0];

    const payment = await Payment.create({
      studentId: booking.studentId._id,
      landlordId: booking.landlordId._id,
      bookingId: booking._id,
      type: paymentType,
      amount: paymentAmount,
      currency: "LKR",
      monthKey,
      dueDate: booking.paymentDueAt || null,
      status: "PAID",
      paymentMethod: "SIMULATION",
      referenceId: generateReferenceId(isKeyMoney ? "KMY" : "FRM"),
      paidAt: new Date(),
    });

    booking.status = "CONFIRMED";
    booking.confirmedAt = new Date();
    await booking.save();

    const housingGroup = await HousingGroup.create({
      bookingId: booking._id,
      listingId: listing._id,
      landlordId: booking.landlordId._id,
      members: [
        {
          userId: booking.studentId._id,
          joinedAt: new Date(),
          isPrimaryTenant: true,
        },
      ],
      startDate: booking.moveInDate,
      rentDueDay: 5,
      nextBillingDate,
      status: "ACTIVE",
      moveInChecklist: {
        keyMoneyPaid: isKeyMoney,
        keyReceived: false,
        inventoryConfirmed: false,
        checkedAt: null,
      },
    });

    listing.currentOccupancy += 1;

    if (listing.currentOccupancy >= listing.maxOccupants) {
      listing.status = "UNAVAILABLE";
    }

    await listing.save();

    await createNotification({
      userId: booking.landlordId._id || booking.landlordId,
      type: "PAYMENT_SUCCESS",
      title: "First payment received",
      message: `Student completed ${isKeyMoney ? "key money" : "first month rent"} payment successfully.`,
      entityType: "PAYMENT",
      entityId: payment._id,
    });

    await createNotification({
      userId: booking.studentId._id || booking.studentId,
      type: "PAYMENT_SUCCESS",
      title: "Booking confirmed",
      message: `Your ${isKeyMoney ? "key money" : "first month rent"} payment was successful. Next rent due: ${nextBillingDate.toLocaleDateString("en-GB")}.`,
      entityType: "PAYMENT",
      entityId: payment._id,
    });


    return res.status(201).json({
      success: true,
      message: "Booking payment successful. Booking confirmed and housing group created.",
      payment,
      booking,
      housingGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process booking payment",
      error: error.message,
    });
  }
};

const payMonthlyRent = async (req, res) => {
  try {
    const { housingGroupId } = req.params;

    const housingGroup = await HousingGroup.findById(housingGroupId)
      .populate("listingId", "rent")
      .populate("landlordId", "fullName email");

    if (!housingGroup) {
      return res.status(404).json({
        success: false,
        message: "Housing group not found",
      });
    }

    if (housingGroup.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Rent can only be paid for an active housing group",
      });
    }

    const isMember = housingGroup.members.some(
      (member) => String(member.userId) === String(req.user._id)
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only housing group members can pay rent",
      });
    }

    const dueDate = housingGroup.nextBillingDate;

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "No billing date is set for this housing group",
      });
    }

    const now = new Date();
    const windowStart = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (now < windowStart) {
      return res.status(400).json({
        success: false,
        message: `Too early to pay. Payment window opens on ${windowStart.toLocaleDateString("en-GB")}.`,
      });
    }

    if (now > windowEnd) {
      return res.status(400).json({
        success: false,
        message: `Payment window has closed. Due date was ${dueDate.toLocaleDateString("en-GB")}. Please contact your landlord.`,
      });
    }

    const monthKey = dueDate.toISOString().split("T")[0];

    const existingRentPayment = await Payment.findOne({
      studentId: req.user._id,
      housingGroupId: housingGroup._id,
      type: "RENT",
      monthKey,
      status: "PAID",
    });

    if (existingRentPayment) {
      return res.status(409).json({
        success: false,
        message: "Rent for this billing cycle has already been paid",
      });
    }

    const payment = await Payment.create({
      studentId: req.user._id,
      landlordId: housingGroup.landlordId._id,
      housingGroupId: housingGroup._id,
      type: "RENT",
      amount: housingGroup.listingId.rent,
      currency: "LKR",
      monthKey,
      dueDate,
      status: "PAID",
      paymentMethod: "SIMULATION",
      referenceId: generateReferenceId("RNT"),
      paidAt: new Date(),
    });

    // Advance the billing date by 30 days
    const newNextBillingDate = new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    housingGroup.nextBillingDate = newNextBillingDate;
    housingGroup.lastRentReminderSentFor = null;
    await housingGroup.save();

    await createNotification({
      userId: housingGroup.landlordId._id,
      type: "PAYMENT_SUCCESS",
      title: "Rent payment received",
      message: `Rent payment received for billing cycle ${monthKey}.`,
      entityType: "PAYMENT",
      entityId: payment._id,
    });

    await createNotification({
      userId: req.user._id,
      type: "PAYMENT_SUCCESS",
      title: "Rent paid successfully",
      message: `Rent paid for ${monthKey}. Next payment due: ${newNextBillingDate.toLocaleDateString("en-GB")}.`,
      entityType: "PAYMENT",
      entityId: payment._id,
    });

    return res.status(201).json({
      success: true,
      message: `Rent payment successful for billing cycle ${monthKey}`,
      payment,
      nextBillingDate: newNextBillingDate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process monthly rent payment",
      error: error.message,
    });
  }
};

const getRentStatus = async (req, res) => {
  try {
    const housingGroup = await HousingGroup.findOne({
      "members.userId": req.user._id,
      status: "ACTIVE",
    }).populate("listingId", "rent title");

    if (!housingGroup) {
      return res.status(200).json({
        success: true,
        hasHousingGroup: false,
      });
    }

    const dueDate = housingGroup.nextBillingDate;

    if (!dueDate) {
      return res.status(200).json({
        success: true,
        hasHousingGroup: true,
        housingGroupId: housingGroup._id,
        nextBillingDate: null,
        canPayNow: false,
        rentAmount: housingGroup.listingId?.rent || 0,
      });
    }

    const now = new Date();
    const windowStart = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inWindow = now >= windowStart && now <= windowEnd;

    // Send RENT_DUE notification once per billing cycle when window opens
    const reminderAlreadySent =
      housingGroup.lastRentReminderSentFor &&
      housingGroup.lastRentReminderSentFor.toISOString() === dueDate.toISOString();

    if (inWindow && !reminderAlreadySent) {
      await createNotification({
        userId: req.user._id,
        type: "RENT_DUE",
        title: "Rent payment due soon",
        message: `Your rent of LKR ${housingGroup.listingId.rent.toLocaleString()} is due on ${dueDate.toLocaleDateString("en-GB")}. You can pay up to 7 days after the due date.`,
        entityType: "PAYMENT",
        entityId: housingGroup._id,
      });
      housingGroup.lastRentReminderSentFor = dueDate;
      await housingGroup.save();
    }

    const monthKey = dueDate.toISOString().split("T")[0];
    const alreadyPaid = await Payment.findOne({
      studentId: req.user._id,
      housingGroupId: housingGroup._id,
      type: "RENT",
      monthKey,
      status: "PAID",
    });

    return res.status(200).json({
      success: true,
      hasHousingGroup: true,
      housingGroupId: housingGroup._id,
      nextBillingDate: dueDate,
      windowStart,
      windowEnd,
      canPayNow: inWindow && !alreadyPaid,
      alreadyPaid: !!alreadyPaid,
      rentAmount: housingGroup.listingId?.rent || 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rent status",
      error: error.message,
    });
  }
};

const getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ studentId: req.user._id })
      .populate("bookingId", "status moveInDate")
      .populate("housingGroupId", "status startDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (String(payment.landlordId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only confirm payments for your own property",
      });
    }

    if (payment.status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Only paid payments can be confirmed",
      });
    }

    payment.confirmedByLandlord = true;
    payment.confirmedAt = new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment confirmed by landlord",
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
      error: error.message,
    });
  }
};

const getLandlordPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ landlordId: req.user._id })
      .populate("studentId", "fullName email phone")
      .populate({ path: "bookingId", select: "status moveInDate listingId" })
      .populate("housingGroupId", "status startDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landlord payment history",
      error: error.message,
    });
  }
};

module.exports = {
  payBookingAmount,
  payMonthlyRent,
  getRentStatus,
  getMyPaymentHistory,
  confirmPayment,
  getLandlordPaymentHistory,
};