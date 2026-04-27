const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/accommodation.controller");



const {
  createTicket,
  getMyTickets,
  getLandlordTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
} = require("../controllers/ticket.controller");

const {
  authRequired,
  optionalAuth,
} = require("../middleware/auth.middleware");

const authorizeRoles = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");

const {
  createListingValidator,
  updateListingValidator,
  verifyLandlordValidator,
  approveListingValidator,
  createBookingValidator,
  bookingIdValidator,
} = require("../validators/listing.validators");

const {
  createTicketValidator,
  ticketIdValidator,
  updateTicketStatusValidator,
  updateTicketPriorityValidator,
} = require("../validators/ticket.validators");

// Listings
router.post(
  "/listings",
  authRequired,
  authorizeRoles("LANDLORD"),
  createListingValidator,
  validate,
  createListing
);

router.get("/listings", optionalAuth, getAllListings);
router.get("/listings/:id", optionalAuth, getListingById);

router.patch(
  "/listings/:id",
  authRequired,
  authorizeRoles("LANDLORD"),
  updateListingValidator,
  validate,
  updateListing
);

router.patch(
  "/listings/:id/toggle-status",
  authRequired,
  authorizeRoles("LANDLORD"),
  toggleListingStatus
);

router.delete(
  "/listings/:id",
  authRequired,
  authorizeRoles("LANDLORD"),
  deleteListing
);

// Admin - landlord verification
router.get(
  "/admin/landlords/pending",
  authRequired,
  authorizeRoles("ADMIN"),
  getPendingLandlords
);

router.patch(
  "/admin/landlords/:id/verify",
  authRequired,
  authorizeRoles("ADMIN"),
  verifyLandlordValidator,
  validate,
  verifyLandlord
);

router.patch(
  "/admin/landlords/:id/reject",
  authRequired,
  authorizeRoles("ADMIN"),
  verifyLandlordValidator,
  validate,
  rejectLandlordVerification
);

// Admin - listing approval
router.patch(
  "/listings/:id/approve",
  authRequired,
  authorizeRoles("ADMIN"),
  approveListingValidator,
  validate,
  approveListing
);

router.patch(
  "/listings/:id/reject",
  authRequired,
  authorizeRoles("ADMIN"),
  approveListingValidator,
  validate,
  rejectListing
);

// Bookings
router.post(
  "/bookings",
  authRequired,
  authorizeRoles("STUDENT"),
  createBookingValidator,
  validate,
  createBookingRequest
);

router.get(
  "/bookings/me",
  authRequired,
  authorizeRoles("STUDENT"),
  getMyBookings
);

router.get(
  "/bookings/landlord",
  authRequired,
  authorizeRoles("LANDLORD"),
  getLandlordBookings
);

router.get(
  "/bookings/:id",
  authRequired,
  bookingIdValidator,
  validate,
  getBookingById
);

router.patch(
  "/bookings/:id/approve",
  authRequired,
  authorizeRoles("LANDLORD"),
  bookingIdValidator,
  validate,
  approveBooking
);

router.patch(
  "/bookings/:id/reject",
  authRequired,
  authorizeRoles("LANDLORD"),
  bookingIdValidator,
  validate,
  rejectBooking
);

router.patch(
  "/bookings/:id/cancel",
  authRequired,
  bookingIdValidator,
  validate,
  cancelBooking
);

router.get(
  "/housing-group/me/current",
  authRequired,
  authorizeRoles("STUDENT"),
  getMyCurrentHousingGroup
);

router.get(
  "/housing-group/:bookingId",
  authRequired,
  getHousingGroupByBooking
);

router.patch(
  "/housing-group/:id/checklist",
  authRequired,
  updateMoveInChecklist
);

router.patch(
  "/housing-group/:id/preferences",
  authRequired,
  authorizeRoles("STUDENT"),
  updateRoommatePreferences
);

router.get(
  "/housing-groups/landlord",
  authRequired,
  authorizeRoles("LANDLORD"),
  getLandlordHousingGroups
);

router.get(
  "/listings/:listingId/roommates",
  optionalAuth,
  getListingRoommates
);

// Tickets
router.post(
  "/tickets",
  authRequired,
  authorizeRoles("STUDENT"),
  createTicketValidator,
  validate,
  createTicket
);

router.get(
  "/tickets/me",
  authRequired,
  authorizeRoles("STUDENT"),
  getMyTickets
);

router.get(
  "/tickets/landlord",
  authRequired,
  authorizeRoles("LANDLORD"),
  getLandlordTickets
);

router.get(
  "/tickets/:id",
  authRequired,
  ticketIdValidator,
  validate,
  getTicketById
);

router.patch(
  "/tickets/:id/status",
  authRequired,
  updateTicketStatusValidator,
  validate,
  updateTicketStatus
);

router.patch(
  "/tickets/:id/priority",
  authRequired,
  updateTicketPriorityValidator,
  validate,
  updateTicketPriority
);



module.exports = router;