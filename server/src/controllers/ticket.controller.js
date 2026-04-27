const Ticket = require("../models/Ticket.model");
const { createNotification } = require("../services/notification.service");
const HousingGroup = require("../models/HousingGroup.model");
const {
  calculateSlaDueAt,
  addSlaMeta,
} = require("../services/ticketSla.service");

const createTicket = async (req, res) => {
  try {
    const { housingGroupId, category, description, priority = "MEDIUM" } = req.body;

    const housingGroup = await HousingGroup.findById(housingGroupId);

    if (!housingGroup) {
      return res.status(404).json({
        success: false,
        message: "Housing group not found",
      });
    }

    if (housingGroup.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Tickets can only be created for active housing groups",
      });
    }

    const isMember = housingGroup.members.some(
      (member) => String(member.userId) === String(req.user._id)
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only housing group members can create tickets",
      });
    }

    const ticket = await Ticket.create({
      housingGroupId: housingGroup._id,
      listingId: housingGroup.listingId,
      createdBy: req.user._id,
      landlordId: housingGroup.landlordId,
      category,
      description,
      priority,
      status: "PENDING",
      slaDueAt: calculateSlaDueAt(priority),
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "fullName email")
      .populate("landlordId", "fullName email")
      .populate("listingId", "title location")
      .populate("housingGroupId", "status startDate");

      await createNotification({
  userId: ticket.landlordId,
  type: "TICKET_CREATED",
  title: "New maintenance ticket",
  message: `A new ${ticket.priority.toLowerCase()} priority ticket was created.`,
  entityType: "TICKET",
  entityId: ticket._id,
});

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket: addSlaMeta(populatedTicket),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: error.message,
    });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;

    const query = { createdBy: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await Ticket.find(query)
      .populate("listingId", "title location")
      .populate("landlordId", "fullName email phone")
      .populate("housingGroupId", "status startDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tickets: tickets.map(addSlaMeta),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your tickets",
      error: error.message,
    });
  }
};

const getLandlordTickets = async (req, res) => {
  try {
    const { status, priority, overdue } = req.query;

    const query = { landlordId: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (overdue === "true") {
      query.status = { $ne: "RESOLVED" };
      query.slaDueAt = { $lt: new Date() };
    }

    const tickets = await Ticket.find(query)
      .populate("createdBy", "fullName email phone")
      .populate("listingId", "title location")
      .populate("housingGroupId", "status startDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tickets: tickets.map(addSlaMeta),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landlord tickets",
      error: error.message,
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "fullName email phone")
      .populate("landlordId", "fullName email phone")
      .populate("listingId", "title location rent roomType")
      .populate({
        path: "housingGroupId",
        select: "status startDate members landlordId",
        populate: {
          path: "members.userId",
          select: "fullName email role",
        },
      });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isCreator = String(ticket.createdBy._id) === String(req.user._id);
    const isLandlord = String(ticket.landlordId._id) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";
    const isHousingMember =
      ticket.housingGroupId &&
      ticket.housingGroupId.members.some(
        (member) => String(member.userId._id) === String(req.user._id)
      );

    if (!isCreator && !isLandlord && !isAdmin && !isHousingMember) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this ticket",
      });
    }

    return res.status(200).json({
      success: true,
      ticket: addSlaMeta(ticket),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isLandlord = String(ticket.landlordId) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";

    if (!isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the landlord or admin can update ticket status",
      });
    }

    if (ticket.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Resolved tickets cannot be changed",
      });
    }

    const validTransitions = {
      PENDING: ["IN_PROGRESS"],
      IN_PROGRESS: ["RESOLVED"],
    };

    const allowedNext = validTransitions[ticket.status] || [];

    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${ticket.status} to ${status}`,
      });
    }

    if (status === "RESOLVED" && (!resolutionNote || !resolutionNote.trim())) {
      return res.status(400).json({
        success: false,
        message: "Resolution note is required when resolving a ticket",
      });
    }

    ticket.status = status;

    if (status === "RESOLVED") {
      ticket.resolutionNote = resolutionNote.trim();
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "fullName email")
      .populate("landlordId", "fullName email")
      .populate("listingId", "title location")
      .populate("housingGroupId", "status startDate");

    await createNotification({
  userId: ticket.createdBy,
  type: "TICKET_UPDATED",
  title: "Ticket status updated",
  message: `Your maintenance ticket is now ${ticket.status}.`,
  entityType: "TICKET",
  entityId: ticket._id,
});

      return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      ticket: addSlaMeta(populatedTicket),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket status",
      error: error.message,
    });
  }
};

const updateTicketPriority = async (req, res) => {
  try {
    const { priority } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isLandlord = String(ticket.landlordId) === String(req.user._id);
    const isAdmin = req.user.role === "ADMIN";

    if (!isLandlord && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the landlord or admin can update ticket priority",
      });
    }

    if (ticket.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Resolved tickets cannot change priority",
      });
    }

    ticket.priority = priority;
    ticket.slaDueAt = calculateSlaDueAt(priority);

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "fullName email")
      .populate("landlordId", "fullName email")
      .populate("listingId", "title location")
      .populate("housingGroupId", "status startDate");

    return res.status(200).json({
      success: true,
      message: "Ticket priority updated successfully",
      ticket: addSlaMeta(populatedTicket),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket priority",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getLandlordTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
};