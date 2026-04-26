const Message = require("../models/Message.model");
const Listing = require("../models/Listing.model");
const User = require("../models/User.model");
const { createNotification } = require("../services/notification.service");
const { getIo, emitToUser } = require("../sockets");

const buildConversationKey = ({ listingId, studentId, landlordId }) => {
  return `${listingId}_${studentId}_${landlordId}`;
};

const getConversationMessages = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { studentId: queryStudentId } = req.query;

    const listing = await Listing.findById(listingId).populate(
      "ownerId",
      "fullName email role isSuspended"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    let studentId;
    let landlordId = listing.ownerId._id;

    if (req.user.role === "STUDENT") {
      studentId = req.user._id;
    } else if (req.user.role === "LANDLORD") {
      if (String(listing.ownerId._id) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only access chats for your own listings",
        });
      }

      if (!queryStudentId) {
        return res.status(400).json({
          success: false,
          message: "studentId query parameter is required for landlord thread view",
        });
      }

      const student = await User.findById(queryStudentId).select("_id role isActive");
      if (!student || student.role !== "STUDENT" || !student.isActive) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      studentId = student._id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Only students and landlords can access chat",
      });
    }

    const conversationKey = buildConversationKey({
      listingId,
      studentId,
      landlordId,
    });

    const messages = await Message.find({ conversationKey })
      .populate("senderId", "fullName email role")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversationKey,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const io = getIo();
    io.to(`conversation:${conversationKey}`).emit("chat:read", {
      conversationKey,
      readByUserId: String(req.user._id),
    });

    return res.status(200).json({
      success: true,
      conversationKey,
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { listingId, studentId: requestStudentId, body } = req.body;

    const listing = await Listing.findById(listingId).populate(
      "ownerId",
      "fullName email role isSuspended"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (!listing.ownerId || listing.ownerId.role !== "LANDLORD") {
      return res.status(400).json({
        success: false,
        message: "Listing does not have a valid landlord",
      });
    }

    if (listing.ownerId.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Chat is unavailable because this landlord account is suspended",
      });
    }

    let studentId;
    let landlordId = listing.ownerId._id;
    let recipientUserId;

    if (req.user.role === "STUDENT") {
      if (String(listing.ownerId._id) === String(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot message your own listing",
        });
      }

      studentId = req.user._id;
      recipientUserId = landlordId;
    } else if (req.user.role === "LANDLORD") {
      if (String(listing.ownerId._id) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only message students about your own listings",
        });
      }

      if (!requestStudentId) {
        return res.status(400).json({
          success: false,
          message: "studentId is required when landlord sends a message",
        });
      }

      const student = await User.findById(requestStudentId).select(
        "_id fullName email role isActive isSuspended"
      );

      if (!student || student.role !== "STUDENT" || !student.isActive || student.isSuspended) {
        return res.status(404).json({
          success: false,
          message: "Valid student recipient not found",
        });
      }

      studentId = student._id;
      recipientUserId = studentId;
      landlordId = req.user._id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Only students and landlords can send chat messages",
      });
    }

    const conversationKey = buildConversationKey({
      listingId,
      studentId,
      landlordId,
    });

    const messageDoc = await Message.create({
      conversationKey,
      listingId,
      studentId,
      landlordId,
      senderId: req.user._id,
      body,
      readBy: [req.user._id],
    });

    const message = await Message.findById(messageDoc._id).populate(
      "senderId",
      "fullName email role"
    );

    const io = getIo();

    io.to(`conversation:${conversationKey}`).emit("chat:new-message", {
      conversationKey,
      message,
    });

    emitToUser(String(recipientUserId), "chat:new-message", {
      conversationKey,
      message,
    });

    await createNotification({
      userId: recipientUserId,
      type: "NEW_MESSAGE",
      title: "New accommodation message",
      message: `${req.user.fullName} sent you a message about "${listing.title}"`,
      entityType: "MESSAGE",
      entityId: message._id,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        conversationKey,
        chatMessage: message,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

const getMyInbox = async (req, res) => {
  try {
    const query =
      req.user.role === "STUDENT"
        ? { studentId: req.user._id }
        : req.user.role === "LANDLORD"
          ? { landlordId: req.user._id }
          : null;

    if (!query) {
      return res.status(403).json({
        success: false,
        message: "Only students and landlords can access inbox",
      });
    }

    query.deletedBy = { $ne: req.user._id };

    const showArchived = req.query.archived === "true";
    if (!showArchived) {
      query.archivedBy = { $ne: req.user._id };
    }

    const messages = await Message.find(query)
      .populate("senderId", "fullName email role")
      .populate("listingId", "title location")
      .sort({ createdAt: -1 });

    const seen = new Map();

    messages.forEach((msg) => {
      if (!seen.has(msg.conversationKey)) {
        seen.set(msg.conversationKey, {
          conversationKey: msg.conversationKey,
          latestMessage: msg,
          listing: msg.listingId,
          studentId: msg.studentId,
          landlordId: msg.landlordId,
          unreadCount: 0,
        });
      }

      const inboxItem = seen.get(msg.conversationKey);

      const isUnread =
        String(msg.senderId._id) !== String(req.user._id) &&
        !msg.readBy.some((userId) => String(userId) === String(req.user._id));

      if (isUnread) {
        inboxItem.unreadCount += 1;
      }
    });

    return res.status(200).json({
      success: true,
      inbox: Array.from(seen.values()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inbox",
      error: error.message,
    });
  }
};

const archiveConversation = async (req, res) => {
  try {
    const { conversationKey } = req.params;
    await Message.updateMany(
      { conversationKey },
      { $addToSet: { archivedBy: req.user._id } }
    );
    return res.status(200).json({ success: true, message: "Conversation archived" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to archive conversation", error: error.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { conversationKey } = req.params;
    await Message.updateMany(
      { conversationKey },
      { $addToSet: { deletedBy: req.user._id } }
    );
    return res.status(200).json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete conversation", error: error.message });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const { conversationKey } = req.params;
    await Message.updateMany(
      { conversationKey, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    return res.status(200).json({ success: true, message: "Conversation marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to mark as read", error: error.message });
  }
};

const markConversationUnread = async (req, res) => {
  try {
    const { conversationKey } = req.params;
    await Message.updateMany(
      { conversationKey, senderId: { $ne: req.user._id } },
      { $pull: { readBy: req.user._id } }
    );
    return res.status(200).json({ success: true, message: "Conversation marked as unread" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to mark as unread", error: error.message });
  }
};

module.exports = {
  getConversationMessages,
  sendMessage,
  getMyInbox,
  archiveConversation,
  deleteConversation,
  markConversationRead,
  markConversationUnread,
};