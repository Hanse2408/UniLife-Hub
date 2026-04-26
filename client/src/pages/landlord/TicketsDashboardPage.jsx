import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleX,
  ClipboardList,
  Clock3,
  House,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getLandlordTicketsApi,
  updateTicketPriorityApi,
  updateTicketStatusApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyTickets from "../../assets/illustrations/empty-tickets.png";
import StatusBadge from "../../components/StatusBadge";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

const statusOptions = ["", "PENDING", "IN_PROGRESS", "RESOLVED"];
const priorityOptions = ["", "HIGH", "MEDIUM", "LOW"];

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCategory(value) {
  return String(value || "OTHER").replaceAll("_", " ");
}

function getTicketMeta(ticket) {
  if (ticket.status === "RESOLVED") {
    return {
      title: "Resolved and logged",
      description: ticket.resolutionNote
        ? "The ticket is complete and includes a landlord resolution note for the student."
        : "The ticket has been marked resolved.",
    };
  }
  if (ticket.isOverdue) {
    return {
      title: "Past SLA due time",
      description: "This ticket is overdue and needs immediate attention to recover the support timeline.",
    };
  }
  if (ticket.status === "IN_PROGRESS") {
    return {
      title: "Work is in progress",
      description: "The student can already see that this issue is being handled. Resolve it with a clear resolution note when finished.",
    };
  }
  return {
    title: "Waiting to be started",
    description: "Move this ticket into progress so the student knows the maintenance workflow has begun.",
  };
}

/* ── Sub-components ─────────────────────────────────────────── */

function TicketStatusBadge({ status }) {
  const map = {
    PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
    IN_PROGRESS: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70",
    RESOLVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  };
  const labels = { PENDING: "Pending", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70"}`}>
      {labels[status] || String(status).replaceAll("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    HIGH: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
    MEDIUM: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
    LOW: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
    URGENT: "bg-red-100 text-red-700 ring-1 ring-red-200/70",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[priority] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70"}`}>
      {String(priority || "UNKNOWN")}
    </span>
  );
}

function InfoBlock({ label, icon: Icon, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100">
      <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {Icon ? <Icon size={12} strokeWidth={2.5} /> : null}
        {label}
      </div>
      {children}
    </div>
  );
}

function TicketCard({ ticket, onMarkInProgress, onResolve, onPriorityChange, isBusy }) {
  const meta = getTicketMeta(ticket);
  const canMoveToInProgress = ticket.status === "PENDING";
  const canResolve = ticket.status === "IN_PROGRESS";
  const canChangePriority = ticket.status !== "RESOLVED";
  const isOverdueActive = ticket.isOverdue && ticket.status !== "RESOLVED";

  return (
    <div className={`card overflow-hidden transition-shadow hover:shadow-md ${isOverdueActive ? "ring-1 ring-rose-200/60" : ""}`}>
      {/* top accent stripe */}
      <div className={`h-1 w-full ${ticket.status === "RESOLVED"
        ? "bg-gradient-to-r from-emerald-400 to-teal-400"
        : isOverdueActive
          ? "bg-gradient-to-r from-rose-500 to-pink-400"
          : ticket.status === "IN_PROGRESS"
            ? "bg-gradient-to-r from-sky-500 to-cyan-400"
            : "bg-gradient-to-r from-amber-400 to-orange-400"
        }`} />

      <div className="p-5 sm:p-6">
        {/* ── Row 1: Title + Badges + Action ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[1.05rem] font-bold leading-snug text-slate-900">
                {formatCategory(ticket.category)}
              </h4>
              <TicketStatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {isOverdueActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  <AlertTriangle size={10} strokeWidth={2.5} />
                  Overdue
                </span>
              ) : null}
            </div>

            {/* ── Row 2: Location ── */}
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin size={13} strokeWidth={2.1} className="shrink-0" />
              <span className="truncate">
                {ticket.listingId?.title || "Listing unavailable"}&nbsp;·&nbsp;
                {ticket.listingId?.location?.city || "Unknown city"}&nbsp;/&nbsp;
                {ticket.listingId?.location?.area || "Unknown area"}
              </span>
            </p>
          </div>

          {/* ── Right: Primary Action ── */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {canMoveToInProgress ? (
              <button
                className="btn-secondary text-sm"
                onClick={() => onMarkInProgress(ticket._id)}
                disabled={isBusy}
                type="button"
              >
                {isBusy ? "Please wait…" : "Mark in progress"}
              </button>
            ) : canResolve ? (
              <button
                className="btn-primary text-sm"
                onClick={() => onResolve(ticket)}
                disabled={isBusy}
                type="button"
              >
                {isBusy ? "Please wait…" : "Resolve ticket"}
              </button>
            ) : ticket.status === "RESOLVED" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                Closed
              </span>
            ) : null}
          </div>
        </div>

        {/* ── SLA / status context panel ── */}
        <div className={`mt-3.5 rounded-xl px-3.5 py-2.5 text-sm ${isOverdueActive
          ? "bg-rose-50 ring-1 ring-rose-100"
          : ticket.status === "RESOLVED"
            ? "bg-emerald-50 ring-1 ring-emerald-100"
            : "bg-slate-50 ring-1 ring-slate-100"
          }`}>
          <span className={`font-semibold ${isOverdueActive ? "text-rose-800" : ticket.status === "RESOLVED" ? "text-emerald-800" : "text-slate-800"
            }`}>
            {meta.title}
          </span>
          <span className={`ml-2 ${isOverdueActive ? "text-rose-700" : ticket.status === "RESOLVED" ? "text-emerald-700" : "text-slate-500"
            }`}>
            {meta.description}
          </span>
        </div>

        {/* ── Description ── */}
        <p className="mt-3 text-sm leading-6 text-slate-600">{ticket.description}</p>

        {/* ── Detail grid ── */}
        <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {/* Student */}
          <InfoBlock label="Student">
            <p className="text-sm font-bold text-slate-900">{ticket.createdBy?.fullName || "Unknown student"}</p>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail size={11} strokeWidth={2.2} />
                <span className="truncate">{ticket.createdBy?.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone size={11} strokeWidth={2.2} />
                <span>{ticket.createdBy?.phone || "No phone"}</span>
              </div>
            </div>
          </InfoBlock>

          {/* SLA Due */}
          <InfoBlock label="SLA Due" icon={CalendarDays}>
            <p className="text-sm font-bold text-slate-900">{formatDateTime(ticket.slaDueAt)}</p>
            <p className={`mt-1 text-xs font-semibold ${isOverdueActive ? "text-rose-600" : "text-emerald-600"}`}>
              {ticket.slaState || (isOverdueActive ? "Overdue" : "On track")}
            </p>
          </InfoBlock>

          {/* Housing Group */}
          <InfoBlock label="Housing Group">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge value={ticket.housingGroupId?.status || "ACTIVE"} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Start:{" "}
              <span className="font-semibold text-slate-700">
                {formatDateTime(ticket.housingGroupId?.startDate)}
              </span>
            </p>
          </InfoBlock>

          {/* Timeline */}
          <InfoBlock label="Timeline">
            <p className="text-xs text-slate-500">
              Created:{" "}
              <span className="font-semibold text-slate-700">{formatDateTime(ticket.createdAt)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Resolved:{" "}
              <span className="font-semibold text-slate-700">{formatDateTime(ticket.resolvedAt)}</span>
            </p>
          </InfoBlock>
        </div>

        {/* ── Resolution note ── */}
        {ticket.resolutionNote ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <span className="font-semibold">Resolution note:</span> {ticket.resolutionNote}
          </div>
        ) : null}

        {/* ── Footer: metadata + priority control ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ReceiptText size={12} strokeWidth={2.2} />
              {String(ticket._id).slice(-6).toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <House size={12} strokeWidth={2.2} />
              Property support
            </span>
          </div>

          {canChangePriority ? (
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                Priority
              </label>
              <select
                className="select h-8 py-0 text-xs"
                value={ticket.priority}
                onChange={(event) => onPriorityChange(ticket._id, event.target.value)}
                disabled={isBusy}
              >
                {priorityOptions.slice(1).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function LandlordTicketsDashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    overdueOnly: false,
  });
  const [actingTicketId, setActingTicketId] = useState("");
  const [resolveTarget, setResolveTarget] = useState(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data } = await getLandlordTicketsApi();
      setTickets(data.tickets || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleStatusChange = async (ticketId, status, resolutionNote = "") => {
    try {
      setActingTicketId(ticketId);
      const payload = status === "RESOLVED" ? { status, resolutionNote } : { status };
      await updateTicketStatusApi(ticketId, payload);
      toast.success(status === "RESOLVED" ? "Ticket resolved" : "Ticket status updated");
      setResolveTarget(null);
      await loadTickets();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setActingTicketId("");
    }
  };

  const handlePriorityChange = async (ticketId, priority) => {
    try {
      setActingTicketId(ticketId);
      await updateTicketPriorityApi(ticketId, { priority });
      toast.success("Ticket priority updated");
      await loadTickets();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update priority");
    } finally {
      setActingTicketId("");
    }
  };

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "PENDING").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter((t) => t.status === "RESOLVED").length,
    overdue: tickets.filter((t) => t.isOverdue && t.status !== "RESOLVED").length,
  }), [tickets]);

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.priority && ticket.priority !== filters.priority) return false;
      if (filters.overdueOnly && !ticket.isOverdue) return false;
      return true;
    });
  }, [tickets, filters]);

  const hasActiveFilters = Boolean(filters.status || filters.priority || filters.overdueOnly);

  return (
    <>
      <div className="space-y-6">
        {/* ── Hero ── */}
        <PageHero
          eyebrow="LANDLORD WORKSPACE"
          title="Ticket Management"
          description="Manage maintenance requests from students with clear deadlines and progress tracking."
          backgroundImage={dashboardBanner}
          compact
        />

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total tickets" value={stats.total} tone="indigo" icon={ClipboardList} />
          <StatCard title="Pending" value={stats.pending} tone="amber" icon={Clock3} />
          <StatCard title="In progress" value={stats.inProgress} tone="blue" icon={Wrench} />
          <StatCard title="Overdue" value={stats.overdue} tone="rose" icon={CircleX} />
          <StatCard title="Resolved" value={stats.resolved} tone="emerald" icon={CheckCircle2} />
        </div>

        {/* ── Filters ── */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Ticket Filters
              </div>
              <h4 className="mt-1 text-base font-bold text-slate-900">Focus the queue</h4>
              <p className="mt-0.5 text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">{visibleTickets.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{tickets.length}</span> tickets
              </p>
            </div>

            {hasActiveFilters ? (
              <button
                className="btn-secondary text-sm"
                onClick={() => setFilters({ status: "", priority: "", overdueOnly: false })}
                type="button"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            {/* Status select */}
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Status
              </label>
              <select
                className="select"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                {statusOptions.map((option) => (
                  <option key={option || "ALL_STATUS"} value={option}>
                    {option ? option.replaceAll("_", " ") : "All statuses"}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority select */}
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Priority
              </label>
              <select
                className="select"
                value={filters.priority}
                onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {priorityOptions.map((option) => (
                  <option key={option || "ALL_PRIORITY"} value={option}>
                    {option || "All priorities"}
                  </option>
                ))}
              </select>
            </div>

            {/* Overdue pill toggle */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, overdueOnly: !prev.overdueOnly }))}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all ${filters.overdueOnly
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-200 hover:bg-rose-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <AlertTriangle size={14} strokeWidth={2.3} />
                Overdue only
              </button>
            </div>
          </div>
        </div>

        {/* ── Ticket list ── */}
        {loading ? (
          <LoadingState
            title="Loading maintenance tickets"
            description="Pulling in student issues, SLA states, and resolution progress for your listings."
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            image={emptyTickets}
            imageAlt="No landlord tickets illustration"
            title="No maintenance tickets yet"
            description="Student maintenance issues will appear here once confirmed stays begin raising tickets for your listings."
            action={
              <Link to="/landlord/bookings" className="btn-primary">
                Review bookings
              </Link>
            }
          />
        ) : visibleTickets.length === 0 ? (
          <EmptyState
            icon="🧰"
            tone="amber"
            title="No tickets match these filters"
            description="Try a broader status or priority view to see more of the landlord maintenance queue."
            action={
              <button
                className="btn-secondary"
                onClick={() => setFilters({ status: "", priority: "", overdueOnly: false })}
                type="button"
              >
                Reset filters
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {/* section header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Maintenance queue
                </div>
                <h4 className="mt-1 text-base font-bold text-slate-900">Active tickets</h4>
              </div>
              <span className="shrink-0 rounded-2xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                {visibleTickets.length} {visibleTickets.length === 1 ? "ticket" : "tickets"}
              </span>
            </div>

            {visibleTickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onMarkInProgress={(id) => handleStatusChange(id, "IN_PROGRESS")}
                onResolve={setResolveTarget}
                onPriorityChange={handlePriorityChange}
                isBusy={actingTicketId === ticket._id}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!resolveTarget}
        title="Resolve maintenance ticket?"
        description={
          resolveTarget
            ? `Add a resolution note for ${resolveTarget.createdBy?.fullName || "this student"} before closing the ${formatCategory(resolveTarget.category).toLowerCase()} ticket.`
            : ""
        }
        confirmLabel="Mark resolved"
        requireReason
        reasonLabel="Resolution note"
        reasonPlaceholder="Explain what was fixed, any parts replaced, and any follow-up the student should know."
        onConfirm={(reason) => handleStatusChange(resolveTarget._id, "RESOLVED", reason)}
        onClose={() => setResolveTarget(null)}
      />
    </>
  );
}