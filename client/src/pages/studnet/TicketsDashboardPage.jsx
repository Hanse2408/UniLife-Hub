import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Send,
  Tag,
  Wrench,
} from "lucide-react";
import {
  createTicketApi,
  getMyCurrentHousingGroupApi,
  getMyTicketsApi,
} from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyTickets from "../../assets/illustrations/empty-tickets.png";

const initialForm = {
  category: "PLUMBING",
  priority: "MEDIUM",
  description: "",
};

const CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "CLEANING",
  "INTERNET",
  "SECURITY",
  "FURNITURE",
  "WATER",
  "OTHER",
];

function formatCategory(cat) {
  if (!cat) return "Other";
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

function formatDateShort(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

function getPriorityColor(priority) {
  if (priority === "HIGH") return "text-rose-600 bg-rose-50";
  if (priority === "MEDIUM") return "text-amber-600 bg-amber-50";
  return "text-blue-600 bg-blue-50";
}

function getStatusColor(status) {
  if (status === "RESOLVED") return "text-emerald-600 bg-emerald-50";
  if (status === "IN_PROGRESS") return "text-blue-600 bg-blue-50";
  return "text-amber-600 bg-amber-50";
}

function getCategoryIcon(category) {
  return Wrench;
}

export default function TicketsDashboardPage() {
  const [housingGroup, setHousingGroup] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [groupRes, ticketsRes] = await Promise.allSettled([
        getMyCurrentHousingGroupApi(),
        getMyTicketsApi(),
      ]);

      if (groupRes.status === "fulfilled") {
        setHousingGroup(groupRes.value.data.housingGroup || null);
      }

      if (ticketsRes.status === "fulfilled") {
        setTickets(ticketsRes.value.data.tickets || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!housingGroup?._id) {
      toast.error("You need an active housing group to create a ticket");
      return;
    }

    try {
      setSubmitting(true);

      await createTicketApi({
        housingGroupId: housingGroup._id,
        category: form.category,
        priority: form.priority,
        description: form.description,
      });

      toast.success("Ticket created successfully");
      setForm(initialForm);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "OPEN" || t.status === "PENDING").length;
    const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
    const resolved = tickets.filter((t) => t.status === "RESOLVED").length;
    const highPriority = tickets.filter((t) => t.priority === "HIGH").length;
    return { open, inProgress, resolved, highPriority };
  }, [tickets]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [tickets]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Student Support"
        title="Maintenance Tickets"
        description="Report maintenance issues and track when your landlord will fix them."
        backgroundImage={dashboardBanner}
        compact
      />

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open tickets" value={stats.open} tone="amber" icon={Clock} />
        <StatCard title="In progress" value={stats.inProgress} tone="blue" icon={Loader2} />
        <StatCard title="Resolved" value={stats.resolved} tone="emerald" icon={CheckCircle2} />
        <StatCard title="High priority" value={stats.highPriority} tone="rose" icon={AlertTriangle} />
      </div>

      {loading ? (
        <LoadingState
          title="Loading tickets"
          description="Fetching your maintenance tickets and housing group information."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
          {/* ── Create ticket form ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Send size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Create a new ticket</h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Describe the issue so your landlord can act quickly.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {!housingGroup ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  <AlertTriangle size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>You do not have an active housing group yet. Tickets can be created after booking confirmation.</span>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Category
                      </label>
                      <select
                        className="select"
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      >
                        {CATEGORIES.map((option) => (
                          <option key={option} value={option}>
                            {formatCategory(option)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Priority
                      </label>
                      <select
                        className="select"
                        value={form.priority}
                        onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                      >
                        {["HIGH", "MEDIUM", "LOW"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Description
                    </label>
                    <textarea
                      rows="5"
                      className="input resize-none"
                      placeholder="Describe the issue clearly. Mention the location, what happened, and how urgent it is."
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* SLA info box */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <Info size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-blue-400" />
                    <div className="text-[11px] leading-[1.6] text-blue-700">
                      <span className="font-bold">SLA targets:</span> High — 24 hrs · Medium — 3 days · Low — 7 days
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-sm font-bold text-white shadow-md shadow-slate-900/15 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send size={14} strokeWidth={2.4} />
                        Raise ticket
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── My tickets ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900">My tickets</h4>
              </div>
              {tickets.length > 0 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {tickets.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  image={emptyTickets}
                  imageAlt="No maintenance tickets illustration"
                  title="No maintenance tickets"
                  description="Create a ticket when you need help with plumbing, electricity, internet, cleaning, or other issues."
                  compact
                />
              </div>
            ) : (
              <div className="space-y-3 p-4 sm:p-5">
                {sortedTickets.map((ticket) => {
                  const CatIcon = getCategoryIcon(ticket.category);
                  const isOverdue = ticket.isOverdue;
                  const isResolved = ticket.status === "RESOLVED";

                  return (
                    <div
                      key={ticket._id}
                      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Thin status accent bar */}
                      <div className={`h-1 ${isOverdue
                          ? "bg-gradient-to-r from-rose-400 to-rose-500"
                          : isResolved
                            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                            : ticket.status === "IN_PROGRESS"
                              ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                              : "bg-gradient-to-r from-amber-300 to-amber-400"
                        }`} />

                      {/* Main content */}
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getStatusColor(ticket.status).split(" ")[1]}`}>
                              <CatIcon size={18} strokeWidth={2.2} className={getStatusColor(ticket.status).split(" ")[0]} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-sm font-bold text-slate-900">
                                {formatCategory(ticket.category)} Issue
                              </h5>
                              <p className="mt-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                                {ticket.description}
                              </p>
                            </div>
                          </div>

                          {/* SLA chip */}
                          <div className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${isOverdue
                              ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                              : isResolved
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                            }`}>
                            {ticket.slaState || (isOverdue ? "Overdue" : "On track")}
                          </div>
                        </div>

                        {/* Chips row */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${getPriorityColor(ticket.priority)}`}>
                            <AlertTriangle size={10} strokeWidth={2.4} />
                            {ticket.priority}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${getStatusColor(ticket.status)}`}>
                            {ticket.status === "RESOLVED" ? <CheckCircle2 size={10} strokeWidth={2.4} /> : <Clock size={10} strokeWidth={2.4} />}
                            {ticket.status?.replace("_", " ")}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            <Tag size={10} strokeWidth={2.4} />
                            {formatCategory(ticket.category)}
                          </span>
                        </div>
                      </div>

                      {/* Footer meta + action */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-100 bg-slate-50/40 px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={11} strokeWidth={2.2} className="text-slate-400" />
                            {formatDateShort(ticket.createdAt)}
                          </span>
                          <span className="h-3 w-px bg-slate-200" />
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} strokeWidth={2.2} className="text-slate-400" />
                            Due {formatDateShort(ticket.slaDueAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-500"
                        >
                          Track status
                          <ArrowRight size={12} strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* Resolution note */}
                      {ticket.resolutionNote ? (
                        <div className="flex items-start gap-2.5 border-t border-emerald-100 bg-emerald-50/50 px-4 py-3 sm:px-5">
                          <CheckCircle2 size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-emerald-500" />
                          <span className="text-sm leading-relaxed text-emerald-800">
                            <span className="font-semibold">Resolution:</span> {ticket.resolutionNote}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}