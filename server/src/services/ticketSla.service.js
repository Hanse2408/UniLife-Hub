const calculateSlaDueAt = (priority = "MEDIUM") => {
  const now = new Date();

  if (priority === "HIGH") {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
  }

  if (priority === "LOW") {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
};

const isTicketOverdue = (ticket) => {
  if (!ticket || ticket.status === "RESOLVED") return false;
  return new Date(ticket.slaDueAt).getTime() < Date.now();
};

const addSlaMeta = (ticketDoc) => {
  const ticket = ticketDoc.toObject ? ticketDoc.toObject() : ticketDoc;

  return {
    ...ticket,
    isOverdue: isTicketOverdue(ticket),
    slaState: ticket.status === "RESOLVED"
      ? "MET_OR_CLOSED"
      : isTicketOverdue(ticket)
      ? "OVERDUE"
      : "WITHIN_SLA",
  };
};

module.exports = {
  calculateSlaDueAt,
  isTicketOverdue,
  addSlaMeta,
};