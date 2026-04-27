const express = require("express");
const router = express.Router();

const {
  getConversationMessages,
  sendMessage,
  getMyInbox,
  archiveConversation,
  deleteConversation,
  markConversationRead,
  markConversationUnread,
} = require("../controllers/chat.controller");

const { authRequired } = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");

const {
  getThreadValidator,
  sendMessageValidator,
} = require("../validators/chat.validators");

router.get(
  "/inbox",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  getMyInbox
);

router.get(
  "/threads/:listingId",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  getThreadValidator,
  validate,
  getConversationMessages
);

router.post(
  "/messages",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  sendMessageValidator,
  validate,
  sendMessage
);

router.patch(
  "/conversations/:conversationKey/archive",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  archiveConversation
);

router.patch(
  "/conversations/:conversationKey/delete",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  deleteConversation
);

router.patch(
  "/conversations/:conversationKey/read",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  markConversationRead
);

router.patch(
  "/conversations/:conversationKey/unread",
  authRequired,
  authorizeRoles("STUDENT", "LANDLORD"),
  markConversationUnread
);

module.exports = router;