const User = require("../models/User.model");
const Order = require("../models/Order.model");
const { createNotification } = require("../services/notification.service");

exports.getPendingVendors = async (req, res) => {
  try {
    const vendors = await User.find({
      role: "VENDOR",
      vendorVerificationStatus: "PENDING",
    })
      .select("fullName email phone vendorVerificationStatus createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      vendors,
    });
  } catch (error) {
    console.error("getPendingVendors error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending vendors",
    });
  }
};

exports.verifyVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({
      _id: req.params.id,
      role: "VENDOR",
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.vendorVerificationStatus = "VERIFIED";
    vendor.verifiedAt = new Date();
    vendor.verifiedBy = req.user.id;

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor verified successfully",
      vendor,
    });
  } catch (error) {
    console.error("verifyVendor error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify vendor",
    });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({
      _id: req.params.id,
      role: "VENDOR",
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.vendorVerificationStatus = "REJECTED";
    vendor.verifiedAt = null;
    vendor.verifiedBy = null;

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      vendor,
    });
  } catch (error) {
    console.error("rejectVendor error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject vendor",
    });
  }
};

// ---------- DELIVERY MANAGEMENT ----------

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.getAllOrders();
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("getAllOrders error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

exports.dispatchOrder = async (req, res) => {
  try {
    const order = await Order.OrderModel.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.order_status !== "food_processing") {
      return res.status(400).json({
        success: false,
        message: "Order must be in food_processing state before dispatching",
      });
    }

    const updated = await Order.updateOrderStatus(req.params.orderId, "out_for_delivery");

    if (updated?.student_id) {
      createNotification({
        userId: updated.student_id,
        type: "ORDER_STATUS_UPDATE",
        title: "Your order is on its way",
        message: "Your food order has been picked up and is heading to your delivery address.",
        entityType: "ORDER",
        entityId: updated._id,
      }).catch(() => { });
    }

    return res.status(200).json({ success: true, message: "Order dispatched for delivery", order: updated });
  } catch (error) {
    console.error("dispatchOrder error:", error);
    return res.status(500).json({ success: false, message: "Failed to dispatch order" });
  }
};

exports.deliverOrder = async (req, res) => {
  try {
    const order = await Order.OrderModel.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.order_status !== "out_for_delivery") {
      return res.status(400).json({
        success: false,
        message: "Order must be out_for_delivery before marking as delivered",
      });
    }

    const updated = await Order.updateOrderStatus(req.params.orderId, "delivered");

    if (updated?.student_id) {
      createNotification({
        userId: updated.student_id,
        type: "ORDER_STATUS_UPDATE",
        title: "Order delivered",
        message: "Your food order has been delivered. Enjoy your meal!",
        entityType: "ORDER",
        entityId: updated._id,
      }).catch(() => { });
    }

    return res.status(200).json({ success: true, message: "Order marked as delivered", order: updated });
  } catch (error) {
    console.error("deliverOrder error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark order as delivered" });
  }
};
