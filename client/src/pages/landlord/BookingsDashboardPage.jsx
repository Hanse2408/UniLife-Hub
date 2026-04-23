import {
  ArrowLeft,
  Ban,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  Hash,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  PawPrint,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  UserX,
  VolumeX,
  Wallet,
  X,
  XCircle,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  approveBookingApi,
  getLandlordBookingsApi,
  getHousingGroupByBookingApi,
  rejectBookingApi,
  updateMoveInChecklistApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import listingPlaceholder from "../../assets/placeholders/listing-placeholder.png";
import ConfirmModal from "../../components/common/ConfirmModal";
import LoadingState from "../../components/common/LoadingState";

/* ─────────────────────────────────────────────────────────────── */
/*  Helpers                                                        */
/* ─────────────────────────────────────────────────────────────── */

function fmt(amount) {
  return `LKR ${Number(amount || 0).toLocaleString()}`;
}

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ─────────────────────────────────────────────────────────────── */
/*  Status config                                                  */
/* ─────────────────────────────────────────────────────────────── */

const SC = {
  REQUESTED: { label: "Requested", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", stripe: "from-amber-400 to-orange-400" },
  APPROVED: { label: "Approved", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", stripe: "from-blue-400 to-cyan-400" },
  PAYMENT_PENDING: { label: "Payment Pending", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", stripe: "from-violet-400 to-purple-400" },
  CONFIRMED: { label: "Confirmed", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", stripe: "from-emerald-400 to-teal-400" },
  ACTIVE_STAY: { label: "Active Stay", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", stripe: "from-emerald-400 to-teal-400" },
  REJECTED: { label: "Rejected", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", stripe: "from-rose-400 to-pink-400" },
  CANCELLED: { label: "Cancelled", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", stripe: "from-slate-300 to-slate-400" },
  COMPLETED: { label: "Completed", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", stripe: "from-slate-300 to-slate-400" },
};

function StatusPill({ status, size = "sm" }) {
  const cfg = SC[status] || SC.CANCELLED;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${size === "lg" ? "px-3 py-1.5 text-[12px]" : "px-2.5 py-1 text-[11px]"} ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Stepper                                                        */
/* ─────────────────────────────────────────────────────────────── */

const STEPS = [
  { key: "REQUESTED", label: "Requested" },
  { key: "APPROVED", label: "Reviewed" },
  { key: "PAYMENT_PENDING", label: "Payment" },
  { key: "CONFIRMED", label: "Confirmed" },
];

function stepIdx(status) {
  if (status === "REQUESTED") return 0;
  if (status === "APPROVED") return 1;
  if (status === "PAYMENT_PENDING") return 2;
  if (["CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(status)) return 3;
  return -1;
}

function ProgressStepper({ status }) {
  const active = stepIdx(status);
  const closed = active === -1;
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = !closed && i <= active;
        const cur = !closed && i === active;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all ${done ? cur
                  ? "bg-indigo-600 text-white shadow shadow-indigo-300 ring-[3px] ring-indigo-100"
                  : "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-400"
                }`}>{i + 1}</div>
              <span className={`mt-1 text-[9.5px] font-semibold tracking-wide ${done ? "text-indigo-700" : "text-slate-400"}`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-4 h-[2px] w-6 rounded-full transition-colors ${!closed && i < active ? "bg-indigo-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Lifestyle pref config                                          */
/* ─────────────────────────────────────────────────────────────── */

const PREF_LABELS = {
  sleepSchedule: { label: "Sleep", map: { EARLY_BIRD: "Early bird", NIGHT_OWL: "Night owl", FLEXIBLE: "Flexible" } },
  workSchedule: { label: "Schedule", map: { WEEKDAYS: "Weekdays", WEEKENDS: "Weekends", REMOTE: "Remote/WFH", MIXED: "Mixed" } },
  cleanlinessLevel: { label: "Cleanliness", map: { VERY_TIDY: "Very tidy", TIDY: "Tidy", RELAXED: "Relaxed" } },
  guestPolicy: { label: "Guests", map: { NO_GUESTS: "No guests", OCCASIONAL: "Occasional", FREQUENT: "Frequent" } },
  noiseTolerance: { label: "Noise", map: { QUIET: "Quiet", MODERATE: "Moderate", LIVELY: "Lively" } },
  studyHabits: { label: "Study", map: { HOME_STUDIER: "Home studier", LIBRARY: "Library", MIXED: "Mixed" } },
  smokingPolicy: { label: "Smoking", map: { NON_SMOKER: "Non-smoker", OUTSIDE_ONLY: "Outside only", SMOKER: "Smoker" } },
  petsPolicy: { label: "Pets", map: { NO_PETS: "No pets", OKAY_WITH_PETS: "OK with pets", HAS_PETS: "Has pets" } },
};

const PREF_ICONS = {
  sleepSchedule: Moon,
  workSchedule: Calendar,
  cleanlinessLevel: Sparkles,
  guestPolicy: UserX,
  noiseTolerance: VolumeX,
  studyHabits: BookOpen,
  smokingPolicy: Ban,
  petsPolicy: PawPrint,
};

/* ─────────────────────────────────────────────────────────────── */
/*  BookingCardRow                                                 */
/* ─────────────────────────────────────────────────────────────── */

function BookingCardRow({ booking, onClick }) {
  const cfg = SC[booking.status] || SC.CANCELLED;
  const listing = booking.listingId || {};
  const student = booking.studentId || {};

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(booking)}
      onKeyDown={(e) => e.key === "Enter" && onClick(booking)}
      className="group flex cursor-pointer items-stretch overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50 active:scale-[0.99]"
    >
      {/* Accent stripe */}
      <div className={`w-1 shrink-0 bg-gradient-to-b ${cfg.stripe}`} />

      {/* Property thumbnail */}
      <div className="relative h-auto w-[90px] shrink-0 overflow-hidden bg-slate-100 sm:w-[110px]">
        <img
          src={listing.photos?.[0] || listingPlaceholder}
          alt={listing.title || "Property"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { e.currentTarget.src = listingPlaceholder; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 sm:px-5">

        {/* Property info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-slate-900 transition-colors group-hover:text-indigo-700">
            {listing.title || "Untitled listing"}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} strokeWidth={2.2} className="shrink-0 text-slate-400" />
            <span className="truncate">{listing.location?.city || "—"}, {listing.location?.area || "—"}</span>
          </p>
          {listing.roomType && (
            <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {listing.roomType}
            </span>
          )}
        </div>

        {/* Student info (md+) */}
        <div className="hidden min-w-0 flex-1 md:block">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">
              {initials(student.fullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-800">{student.fullName || "—"}</p>
              <p className="truncate text-[11px] text-slate-400">{student.email || "—"}</p>
            </div>
          </div>
        </div>

        {/* Amount + move-in (lg+) */}
        <div className="hidden flex-col items-end lg:flex">
          <span className="text-[13.5px] font-black tabular-nums text-slate-900">
            {fmt(booking.totalBookingAmount)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar size={10} strokeWidth={2.2} />
            {fmtDate(booking.moveInDate)}
          </span>
        </div>

        {/* Status + chevron */}
        <div className="flex shrink-0 items-center gap-2.5">
          <StatusPill status={booking.status} />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all group-hover:bg-indigo-600 group-hover:text-white">
            <ChevronRight size={13} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Slide-over panel                                               */
/* ─────────────────────────────────────────────────────────────── */

function BookingSlideOver({ booking, onClose, onApprove, onReject, navigate }) {
  const [housingGroup, setHousingGroup] = useState(null);
  const [hgLoading, setHgLoading] = useState(false);
  const [saving, setSaving] = useState(null);

  const listing = booking.listingId || {};
  const student = booking.studentId || {};
  const showChecklist = ["CONFIRMED", "ACTIVE_STAY"].includes(booking.status);

  const loadHG = useCallback(async () => {
    if (!showChecklist || housingGroup) return;
    try {
      setHgLoading(true);
      const { data } = await getHousingGroupByBookingApi(booking._id);
      setHousingGroup(data.housingGroup || null);
    } catch (_) { /* non-critical */ }
    finally { setHgLoading(false); }
  }, [booking._id, showChecklist, housingGroup]);

  useEffect(() => { loadHG(); }, [loadHG]);

  const handleToggle = async (key) => {
    if (!housingGroup || saving) return;
    const current = housingGroup.moveInChecklist?.[key];
    try {
      setSaving(key);
      const { data } = await updateMoveInChecklistApi(housingGroup._id, { [key]: !current });
      setHousingGroup(data.housingGroup);
      toast.success("Checklist updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    } finally { setSaving(null); }
  };

  const timelineItems = [
    { label: "Submitted", date: booking.createdAt, done: true },
    { label: "Visit", date: booking.visitDate, done: ["APPROVED", "PAYMENT_PENDING", "CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(booking.status) },
    { label: "Move-in", date: booking.moveInDate, done: ["CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(booking.status) },
    { label: "Payment due", date: booking.paymentDueAt, done: ["CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(booking.status) },
  ].filter((t) => t.date);

  const handleChat = () => {
    onClose();
    navigate("/landlord/chat", {
      state: {
        listingId: listing._id,
        listingTitle: listing.title,
        studentId: student._id,
        studentName: student.fullName,
      },
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl shadow-slate-900/20 sm:max-w-2xl">

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between gap-4 overflow-hidden bg-slate-950 px-6 py-5">
          <img src={dashboardBanner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 to-indigo-950/80" />
          <div className="relative z-10 flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white">
              <ArrowLeft size={16} strokeWidth={2.3} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Booking Detail</p>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-tight text-white">#{booking._id?.slice(-8).toUpperCase()}</h2>
                <StatusPill status={booking.status} size="lg" />
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white">
            <X size={16} strokeWidth={2.3} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-6 sm:grid-cols-2">

            {/* Left column */}
            <div className="space-y-4">
              {/* Property card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-40 overflow-hidden bg-slate-100">
                  <img src={listing.photos?.[0] || listingPlaceholder} alt={listing.title} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = listingPlaceholder; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-sm font-bold text-white line-clamp-1">{listing.title || "—"}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/75"><MapPin size={10} strokeWidth={2.2} />{listing.location?.city}, {listing.location?.area}</p>
                  </div>
                  {listing.roomType && <span className="absolute right-3 top-3 rounded-lg bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">{listing.roomType}</span>}
                </div>
                {listing.location?.addressLine && <div className="px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={11} strokeWidth={2.2} className="text-slate-400" />{listing.location.addressLine}</p></div>}
              </div>

              {/* Student card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Student</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">{initials(student.fullName)}</div>
                  <div><p className="text-sm font-bold text-slate-900">{student.fullName || "—"}</p><p className="text-xs text-slate-400">{student.email || "—"}</p></div>
                </div>
                <div className="mt-3 space-y-2">
                  {student.phone && <div className="flex items-center gap-2 text-xs text-slate-600"><Phone size={12} strokeWidth={2} className="text-slate-400" />{student.phone}</div>}
                  {booking.requestMessage && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">&ldquo;{booking.requestMessage}&rdquo;</p>}
                  {booking.rejectionReason && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600 ring-1 ring-rose-100">Rejected: {booking.rejectionReason}</p>}
                </div>
              </div>

              {/* Key dates timeline */}
              {timelineItems.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Key Dates</p>
                  <div className="space-y-0">
                    {timelineItems.map((item, idx) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${item.done ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"}`}>
                            {item.done ? <CheckCircle2 size={12} strokeWidth={2.5} className="text-white" /> : <Circle size={10} strokeWidth={2} className="text-slate-400" />}
                          </div>
                          {idx < timelineItems.length - 1 && <div className={`mt-1 mb-1 h-6 w-[2px] rounded-full ${item.done ? "bg-indigo-300" : "bg-slate-200"}`} />}
                        </div>
                        <div className="pb-3"><p className={`text-[11px] font-bold ${item.done ? "text-slate-900" : "text-slate-400"}`}>{item.label}</p><p className="text-[11px] text-slate-500">{fmtDate(item.date)}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Payment breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><DollarSign size={14} strokeWidth={2.2} /></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Payment Breakdown</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Monthly Rent</span><span className="text-sm font-semibold text-slate-800">{fmt(booking.rentAmount)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Key Money</span><span className="text-sm font-semibold text-slate-800">{booking.keyMoneyAmount ? fmt(booking.keyMoneyAmount) : "None"}</span></div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5"><span className="text-sm font-bold text-slate-900">Total</span><span className="text-base font-black text-emerald-700">{fmt(booking.totalBookingAmount)}</span></div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment status</span><span className="text-[10px] font-bold text-slate-600">{["CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(booking.status) ? "Paid" : "Pending"}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700" style={{ width: ["CONFIRMED", "ACTIVE_STAY", "COMPLETED"].includes(booking.status) ? "100%" : "0%" }} /></div>
                </div>
              </div>

              {/* Move-in checklist */}
              {showChecklist && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><ClipboardList size={14} strokeWidth={2.2} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Move-in Checklist</p>
                  </div>
                  {hgLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" />Loading…</div>
                  ) : !housingGroup ? (
                    <p className="text-xs text-slate-400">Housing group not set up yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {[{ key: "keyMoneyPaid", label: "Key money paid" }, { key: "keyReceived", label: "Key received" }, { key: "inventoryConfirmed", label: "Inventory confirmed" }].map(({ key, label }) => {
                        const done = housingGroup.moveInChecklist?.[key];
                        const isSaving = saving === key;
                        return (
                          <button key={key} type="button" disabled={!!saving} onClick={() => handleToggle(key)} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all disabled:opacity-60 ${done ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                            {isSaving ? <Loader2 size={16} className="shrink-0 animate-spin text-slate-400" /> : done ? <CheckCircle2 size={16} strokeWidth={2.2} className="shrink-0 text-emerald-500" /> : <Circle size={16} strokeWidth={2} className="shrink-0 text-slate-300" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Lifestyle preferences */}
              {showChecklist && housingGroup?.members?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Users size={14} strokeWidth={2.2} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Tenant Preferences</p>
                  </div>
                  <div className="space-y-3">
                    {housingGroup.members.map((m, idx) => {
                      const prefs = m.roommatePreferences || {};
                      const chips = Object.entries(PREF_LABELS).map(([k, cfg]) => { const val = prefs[k]; if (!val) return null; const Icon = PREF_ICONS[k]; return { key: k, label: `${cfg.label}: ${cfg.map[val] || val}`, Icon }; }).filter(Boolean);
                      return (
                        <div key={idx} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">{(m.userId?.fullName || "T")[0].toUpperCase()}</div>
                            <span className="text-xs font-semibold text-slate-700">{m.userId?.fullName || "Tenant"}</span>
                          </div>
                          {prefs.bio && <p className="mb-2 text-[11px] italic text-slate-500">&ldquo;{prefs.bio}&rdquo;</p>}
                          {chips.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {chips.map(({ key, label, Icon }) => (
                                <span key={key} className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-indigo-700"><Icon size={9} strokeWidth={2.2} />{label}</span>
                              ))}
                            </div>
                          ) : !prefs.bio && <p className="text-[11px] text-slate-400">No preferences set.</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Booking metadata */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Booking Info</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600"><Hash size={12} strokeWidth={2} className="text-slate-400" /><span className="font-mono font-semibold text-slate-700">{booking._id?.slice(-8).toUpperCase()}</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-600"><Calendar size={12} strokeWidth={2} className="text-slate-400" />Submitted {fmtDate(booking.createdAt)}</div>
                  {booking.moveInDate && <div className="flex items-center gap-2 text-xs text-slate-600"><CalendarCheck size={12} strokeWidth={2} className="text-slate-400" />Move-in {fmtDate(booking.moveInDate)}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="mb-4 flex justify-center"><ProgressStepper status={booking.status} /></div>
          <div className="flex flex-wrap items-center gap-2.5">
            {booking.status === "REQUESTED" && (
              <>
                <button type="button" onClick={() => { onClose(); onApprove(booking); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.97]"><ShieldCheck size={14} strokeWidth={2.3} />Approve</button>
                <button type="button" onClick={() => { onClose(); onReject(booking); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-700 transition-all hover:bg-rose-100 active:scale-[0.97]"><XCircle size={14} strokeWidth={2.3} />Reject</button>
              </>
            )}
            <button type="button" onClick={handleChat} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97]"><MessageSquare size={14} strokeWidth={2.3} />Chat</button>
            <Link to="/landlord/payments" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"><Wallet size={14} strokeWidth={2.2} />Payments</Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page                                                      */
/* ─────────────────────────────────────────────────────────────── */

export default function LandlordBookingsDashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await getLandlordBookingsApi();
      setBookings(data.bookings || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleApprove = async () => {
    try {
      await approveBookingApi(approveTarget._id);
      toast.success("Booking approved");
      setApproveTarget(null);
      await loadBookings();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to approve"); }
  };

  const handleReject = async (reason) => {
    try {
      await rejectBookingApi(rejectTarget._id, { rejectionReason: reason });
      toast.success("Booking rejected");
      setRejectTarget(null);
      await loadBookings();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to reject"); }
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    requested: bookings.filter((b) => b.status === "REQUESTED").length,
    paymentPending: bookings.filter((b) => ["APPROVED", "PAYMENT_PENDING"].includes(b.status)).length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    closed: bookings.filter((b) => ["REJECTED", "CANCELLED"].includes(b.status)).length,
  }), [bookings]);

  const filtered = useMemo(() => {
    let r = [...bookings];
    if (status === "REQUESTED") r = r.filter((b) => b.status === "REQUESTED");
    else if (status === "PAYMENT_PENDING") r = r.filter((b) => ["APPROVED", "PAYMENT_PENDING"].includes(b.status));
    else if (status === "CONFIRMED") r = r.filter((b) => b.status === "CONFIRMED");
    else if (status === "CLOSED") r = r.filter((b) => ["REJECTED", "CANCELLED"].includes(b.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((b) =>
        (b.studentId?.fullName || "").toLowerCase().includes(q) ||
        (b.studentId?.email || "").toLowerCase().includes(q) ||
        (b.listingId?.title || "").toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => { const da = new Date(a.createdAt).getTime(); const db = new Date(b.createdAt).getTime(); return sort === "newest" ? db - da : da - db; });
    return r;
  }, [bookings, status, search, sort]);

  const metricCards = [
    { label: "Total bookings", value: stats.total, icon: ClipboardList, bar: "from-indigo-600 via-blue-600 to-cyan-500", iconBg: "bg-indigo-50 text-indigo-600" },
    { label: "Requested", value: stats.requested, icon: Clock, bar: "from-amber-500 via-orange-500 to-rose-400", iconBg: "bg-amber-50 text-amber-600" },
    { label: "Payment pending", value: stats.paymentPending, icon: CreditCard, bar: "from-violet-500 via-purple-500 to-indigo-400", iconBg: "bg-violet-50 text-violet-600" },
    { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, bar: "from-emerald-500 via-teal-500 to-cyan-400", iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Closed", value: stats.closed, icon: XCircle, bar: "from-slate-600 via-slate-700 to-slate-800", iconBg: "bg-slate-100 text-slate-600" },
  ];

  return (
    <>
      <div className="space-y-6">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] shadow-lg shadow-slate-900/10">
          <img src={dashboardBanner} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-900/82 to-indigo-900/60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.15),transparent_55%)]" />
          <div className="relative z-10 px-6 py-7 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.3em] text-white/70 backdrop-blur-sm"><ClipboardList size={11} strokeWidth={2.5} />Landlord Console</div>
                <h1 className="mt-3.5 text-3xl font-black leading-tight tracking-tight text-white lg:text-[2rem]">Bookings</h1>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-white/65">Manage requests, approvals, and tenant stays all in one place.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/landlord/listings/create" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-slate-900 shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.97]"><Plus size={14} strokeWidth={2.5} />New Listing</Link>
                <Link to="/landlord/payments" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-[13px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.97]"><Wallet size={14} strokeWidth={2.2} />Payments</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metricCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                <div className={`h-1.5 bg-gradient-to-r ${c.bar}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p><p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-900">{c.value}</p></div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-110 ${c.iconBg}`}><Icon size={17} strokeWidth={2.2} /></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} strokeWidth={2.1} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-[13.5px] text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Search by student, email, or property…" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <div className="relative">
            <Filter size={13} strokeWidth={2.1} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select className="h-11 cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-[13px] font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="PAYMENT_PENDING">Payment pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown size={13} strokeWidth={2.1} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select className="h-11 cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-[13px] font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState title="Loading bookings" description="Fetching student requests and payment progress." />
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"><ClipboardList size={28} strokeWidth={1.5} /></div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">No booking requests yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">When students request one of your listings, the full approval workflow will appear here.</p>
            <Link to="/landlord/listings" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-slate-800 hover:to-slate-700 active:scale-[0.97]"><Building2 size={14} strokeWidth={2.3} />View listings</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <Search size={24} strokeWidth={1.5} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No matching bookings</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or status filter.</p>
            <button type="button" className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50" onClick={() => { setSearch(""); setStatus("ALL"); }}>Clear filters</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 pb-1">
              <div><p className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">Booking log</p><h4 className="mt-0.5 text-base font-bold text-slate-900">Booking activity</h4></div>
              <span className="shrink-0 rounded-2xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600">{filtered.length} {filtered.length === 1 ? "booking" : "bookings"}</span>
            </div>
            {filtered.map((booking) => (
              <BookingCardRow key={booking._id} booking={booking} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <BookingSlideOver booking={selected} onClose={() => setSelected(null)} onApprove={setApproveTarget} onReject={setRejectTarget} navigate={navigate} />
      )}

      <ConfirmModal open={!!approveTarget} title="Approve booking request?" description={approveTarget ? `Approve the booking request for ${approveTarget.studentId?.fullName || "this student"}?` : ""} confirmLabel="Approve booking" onConfirm={handleApprove} onClose={() => setApproveTarget(null)} />
      <ConfirmModal open={!!rejectTarget} title="Reject booking request?" description="Please provide a reason before rejecting this booking request." confirmLabel="Reject booking" confirmTone="danger" requireReason reasonLabel="Rejection reason" reasonPlaceholder="Explain why this booking request is being rejected..." onConfirm={handleReject} onClose={() => setRejectTarget(null)} />
    </>
  );
}
