import {
    Calendar,
    ChevronDown,
    CreditCard,
    Hash,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    ShieldCheck,
    User,
    Users,
    XCircle,
    ClipboardList,
    CheckCircle2,
    Circle,
    Loader2,
} from "lucide-react";

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
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getHousingGroupByBookingApi, updateMoveInChecklistApi } from "../../api/client";
import BookingStatusBadge from "./BookingStatusBadge";

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString()}`;
}

/* ── Progress stepper ── */
const stepperConfig = [
    { key: "REQUESTED", label: "Requested" },
    { key: "APPROVED", label: "Reviewed" },
    { key: "PAYMENT", label: "Payment" },
    { key: "CONFIRMED", label: "Confirmed" },
];

function getActiveStepIndex(status) {
    if (status === "REQUESTED") return 0;
    if (status === "APPROVED" || status === "PAYMENT_PENDING") return 2;
    if (status === "CONFIRMED" || status === "ACTIVE_STAY" || status === "COMPLETED") return 3;
    return -1; // rejected / cancelled
}

function ProgressStepper({ status }) {
    const activeIdx = getActiveStepIndex(status);
    const isClosed = activeIdx === -1;

    return (
        <div className="flex items-center gap-0.5">
            {stepperConfig.map((step, i) => {
                const done = !isClosed && i <= activeIdx;
                const isCurrent = !isClosed && i === activeIdx;

                return (
                    <div key={step.key} className="flex items-center gap-0.5">
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all ${done
                                    ? isCurrent
                                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200 ring-[3px] ring-emerald-100"
                                        : "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-400"
                                    }`}
                            >
                                {i + 1}
                            </div>
                            <span
                                className={`mt-1.5 text-[10px] font-semibold tracking-wide ${done ? "text-emerald-700" : "text-slate-400"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < stepperConfig.length - 1 && (
                            <div
                                className={`mb-5 h-[2px] w-7 rounded-full sm:w-10 ${!isClosed && i < activeIdx ? "bg-emerald-300" : "bg-slate-200"
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Action helpers ── */
const variantClass = {
    success:
        "rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 active:scale-[0.97]",
    danger:
        "rounded-xl bg-white px-4 py-2 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 active:scale-[0.97]",
    primary:
        "rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.97]",
    secondary:
        "rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.97]",
    chat:
        "rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.97]",
};

function getAccentStripe(status) {
    if (status === "REQUESTED") return "from-amber-400 to-orange-400";
    if (status === "APPROVED" || status === "PAYMENT_PENDING") return "from-sky-500 to-cyan-400";
    if (status === "CONFIRMED" || status === "ACTIVE_STAY") return "from-emerald-400 to-teal-400";
    return "from-slate-300 to-slate-400";
}

function getActions(booking, { onApprove, onReject, onChat }) {
    const s = booking.status;
    const chatAction = { label: "Chat", icon: MessageSquare, variant: "chat", onClick: onChat };

    if (s === "REQUESTED") {
        return [
            { label: "Approve", icon: ShieldCheck, variant: "success", onClick: () => onApprove?.(booking) },
            { label: "Reject", icon: XCircle, variant: "danger", onClick: () => onReject?.(booking) },
            chatAction,
        ];
    }

    if (s === "APPROVED" || s === "PAYMENT_PENDING") {
        return [
            { label: "View payments", icon: CreditCard, variant: "primary", link: "/landlord/payments" },
            chatAction,
        ];
    }

    if (s === "CONFIRMED" || s === "ACTIVE_STAY") {
        return [
            { ...chatAction },
            { label: "View payments", icon: CreditCard, variant: "secondary", link: "/landlord/payments" },
        ];
    }

    // REJECTED, CANCELLED, COMPLETED
    return [
        { label: "View payments", icon: CreditCard, variant: "secondary", link: "/landlord/payments" },
        chatAction,
    ];
}

/* ── Detail block ── */
function DetailBlock({ label, children }) {
    return (
        <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
            </div>
            {children}
        </div>
    );
}

function DetailRow({ icon: Icon, children }) {
    return (
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
            <Icon size={13} strokeWidth={2} className="shrink-0 text-slate-400" />
            <span className="truncate">{children}</span>
        </div>
    );
}

/* ── Main card ── */
export default function BookingCard({ booking, onApprove, onReject, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const navigate = useNavigate();

    const listing = booking.listingId || {};
    const student = booking.studentId || {};

    // ── Move-in checklist (for CONFIRMED / ACTIVE_STAY) ──
    const showChecklist = ["CONFIRMED", "ACTIVE_STAY"].includes(booking.status);
    const [housingGroup, setHousingGroup] = useState(null);
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [checklistSaving, setChecklistSaving] = useState(null); // key being saved

    const loadHousingGroup = useCallback(async () => {
        if (!showChecklist || housingGroup) return;
        try {
            setChecklistLoading(true);
            const { data } = await getHousingGroupByBookingApi(booking._id);
            setHousingGroup(data.housingGroup || null);
        } catch (_) {
            // not found or error — non-critical
        } finally {
            setChecklistLoading(false);
        }
    }, [booking._id, showChecklist, housingGroup]);

    useEffect(() => {
        if (expanded && showChecklist) {
            loadHousingGroup();
        }
    }, [expanded, showChecklist, loadHousingGroup]);

    const handleChecklistToggle = async (key) => {
        if (!housingGroup || checklistSaving) return;
        const current = housingGroup.moveInChecklist?.[key];
        try {
            setChecklistSaving(key);
            const { data } = await updateMoveInChecklistApi(housingGroup._id, { [key]: !current });
            setHousingGroup(data.housingGroup);
            toast.success("Checklist updated");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update checklist");
        } finally {
            setChecklistSaving(null);
        }
    };

    const handleChat = () => {
        navigate("/landlord/chat", {
            state: {
                listingId: listing._id,
                listingTitle: listing.title,
                studentId: student._id,
                studentName: student.fullName,
            },
        });
    };

    const actions = getActions(booking, { onApprove, onReject, onChat: handleChat });

    const roomLabel = listing.roomType
        ? listing.roomType.charAt(0) + listing.roomType.slice(1).toLowerCase()
        : null;

    return (
        <div className={`card overflow-hidden transition-shadow hover:shadow-md`}>
            {/* top accent stripe */}
            <div className={`h-1 w-full bg-gradient-to-r ${getAccentStripe(booking.status)}`} />
            {/* ── Compact row ── */}
            <button
                type="button"
                className="flex w-full items-start gap-4 px-5 py-4 text-left sm:items-center sm:gap-5"
                onClick={() => setExpanded((prev) => !prev)}
            >
                {/* Left — property */}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-bold text-slate-900">
                            {listing.title || "Untitled listing"}
                        </h4>
                        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {roomLabel || "—"}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={11} strokeWidth={2.2} />
                        <span className="truncate">
                            {listing.location?.city || "—"} / {listing.location?.area || "—"}
                        </span>
                    </div>
                </div>

                {/* Center — student (visible md+) */}
                <div className="hidden min-w-0 flex-1 md:block">
                    <div className="text-sm font-semibold text-slate-700">
                        {student.fullName || "Student"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                        {student.email || "—"}
                    </div>
                </div>

                {/* Amount + move-in (visible lg+) */}
                <div className="hidden flex-col items-end lg:flex">
                    <span className="text-sm font-black tabular-nums text-slate-900">
                        {formatCurrency(booking.totalBookingAmount)}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        Move-in {formatDate(booking.moveInDate)}
                    </span>
                </div>

                {/* Right — status + chevron */}
                <div className="flex shrink-0 items-center gap-3">
                    <BookingStatusBadge status={booking.status} />
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 transition-colors hover:bg-slate-200">
                        <ChevronDown
                            size={14}
                            strokeWidth={2.2}
                            className={`text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        />
                    </div>
                </div>
            </button>

            {/* ── Expanded details ── */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                    {/* Info grid */}
                    <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Student */}
                        <DetailBlock label="Student">
                            <DetailRow icon={User}>
                                <span className="font-semibold text-slate-800">
                                    {student.fullName || "—"}
                                </span>
                            </DetailRow>
                            <DetailRow icon={Mail}>{student.email || "—"}</DetailRow>
                            {student.phone && (
                                <DetailRow icon={Phone}>{student.phone}</DetailRow>
                            )}
                        </DetailBlock>

                        {/* Payment */}
                        <DetailBlock label="Payment breakdown">
                            <div className="space-y-1.5 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>Rent</span>
                                    <span className="font-semibold text-slate-800">
                                        {formatCurrency(booking.rentAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Key money</span>
                                    <span className="font-semibold text-slate-800">
                                        {booking.keyMoneyAmount
                                            ? formatCurrency(booking.keyMoneyAmount)
                                            : "None"}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                                    <span className="font-bold text-slate-900">Total</span>
                                    <span className="font-black text-slate-900">
                                        {formatCurrency(booking.totalBookingAmount)}
                                    </span>
                                </div>
                            </div>
                        </DetailBlock>

                        {/* Dates */}
                        <DetailBlock label="Key dates">
                            <DetailRow icon={Calendar}>
                                Submitted: {formatDate(booking.createdAt)}
                            </DetailRow>
                            <DetailRow icon={Calendar}>
                                Move-in: {formatDate(booking.moveInDate)}
                            </DetailRow>
                            {booking.visitDate && (
                                <DetailRow icon={Calendar}>
                                    Visit: {formatDate(booking.visitDate)}
                                </DetailRow>
                            )}
                            {booking.paymentDueAt && (
                                <DetailRow icon={CreditCard}>
                                    Due: {formatDate(booking.paymentDueAt)}
                                </DetailRow>
                            )}
                        </DetailBlock>

                        {/* Booking metadata */}
                        <DetailBlock label="Booking">
                            <DetailRow icon={Hash}>
                                <span className="font-mono text-xs text-slate-500">
                                    {booking._id?.slice(-8).toUpperCase()}
                                </span>
                            </DetailRow>
                            {booking.requestMessage && (
                                <p className="rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                    &ldquo;{booking.requestMessage}&rdquo;
                                </p>
                            )}
                            {booking.rejectionReason && (
                                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600 ring-1 ring-rose-100">
                                    Rejected: {booking.rejectionReason}
                                </p>
                            )}
                        </DetailBlock>
                    </div>

                    {/* ── Move-in checklist (CONFIRMED / ACTIVE_STAY) ── */}
                    {showChecklist && (
                        <div className="border-t border-slate-100 px-5 py-4">
                            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                <ClipboardList size={13} strokeWidth={2.2} />
                                Move-in Checklist
                            </div>
                            {checklistLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
                                    Loading checklist…
                                </div>
                            ) : !housingGroup ? (
                                <p className="text-xs text-slate-400">Housing group not found yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { key: "keyMoneyPaid", label: "Key money paid" },
                                        { key: "keyReceived", label: "Key received" },
                                        { key: "inventoryConfirmed", label: "Inventory confirmed" },
                                    ].map(({ key, label }) => {
                                        const done = housingGroup.moveInChecklist?.[key];
                                        const saving = checklistSaving === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                disabled={!!checklistSaving}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChecklistToggle(key);
                                                }}
                                                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${done
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                                    } disabled:opacity-60`}
                                            >
                                                {saving ? (
                                                    <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
                                                ) : done ? (
                                                    <CheckCircle2 size={13} strokeWidth={2.2} className="text-emerald-500" />
                                                ) : (
                                                    <Circle size={13} strokeWidth={2.2} className="text-slate-300" />
                                                )}
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tenant roommate preferences (CONFIRMED / ACTIVE_STAY) ── */}
                    {showChecklist && housingGroup && housingGroup.members?.length > 0 && (
                        <div className="border-t border-slate-100 px-5 py-4">
                            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                <Users size={13} strokeWidth={2.2} />
                                Tenant Lifestyle Preferences
                            </div>
                            <div className="space-y-3">
                                {housingGroup.members.map((m, i) => {
                                    const prefs = m.roommatePreferences || {};
                                    const chips = Object.entries(PREF_LABELS)
                                        .map(([k, cfg]) => prefs[k] ? `${cfg.label}: ${cfg.map[prefs[k]] || prefs[k]}` : null)
                                        .filter(Boolean);
                                    return (
                                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-xs font-bold text-white">
                                                    {(m.userId?.fullName || "T")[0].toUpperCase()}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{m.userId?.fullName || "Tenant"}</span>
                                            </div>
                                            {prefs.bio && (
                                                <p className="mt-1.5 text-xs italic text-slate-500">&ldquo;{prefs.bio}&rdquo;</p>
                                            )}
                                            {chips.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {chips.map((c) => (
                                                        <span key={c} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : !prefs.bio ? (
                                                <p className="mt-1 text-xs text-slate-400">No preferences set yet.</p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Stepper + actions */}
                    <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <ProgressStepper status={booking.status} />

                        <div className="flex flex-wrap items-center gap-2">
                            {actions.map((action) => {
                                const cls = `inline-flex items-center gap-1.5 ${variantClass[action.variant] || variantClass.secondary
                                    }`;
                                if (action.link) {
                                    return (
                                        <Link
                                            key={action.label}
                                            to={action.link}
                                            className={cls}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <action.icon size={13} strokeWidth={2.2} />
                                            {action.label}
                                        </Link>
                                    );
                                }
                                return (
                                    <button
                                        key={action.label}
                                        type="button"
                                        className={cls}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            action.onClick?.();
                                        }}
                                    >
                                        <action.icon size={13} strokeWidth={2.2} />
                                        {action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
