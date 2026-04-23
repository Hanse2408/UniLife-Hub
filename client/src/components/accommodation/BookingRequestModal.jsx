import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  House,
  Info,
  MessageSquareText,
  Send,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createBookingRequestApi } from "../../api/client";

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export default function BookingRequestModal({ listing, open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    moveInDate: "",
    visitDate: "",
    requestMessage: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => toInputDate(new Date()), []);
  const availableFrom = useMemo(() => toInputDate(listing?.availableFrom), [listing?.availableFrom]);
  const moveInMin = availableFrom && availableFrom > today ? availableFrom : today;

  useEffect(() => {
    if (!open) return;

    setForm({
      moveInDate: "",
      visitDate: "",
      requestMessage: "",
    });
  }, [open, listing?._id]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      await createBookingRequestApi({
        listingId: listing._id,
        moveInDate: form.moveInDate,
        visitDate: form.visitDate || undefined,
        requestMessage: form.requestMessage,
      });

      toast.success("Booking request sent successfully");
      setForm({
        moveInDate: "",
        visitDate: "",
        requestMessage: "",
      });
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create booking request");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { icon: Send, label: "Request submitted", desc: "Your booking request goes to the landlord", color: "text-blue-600 bg-blue-50 ring-blue-100" },
    { icon: ClipboardCheck, label: "Landlord reviews", desc: "They'll approve or respond to your request", color: "text-amber-600 bg-amber-50 ring-amber-100" },
    { icon: CreditCard, label: "Complete payment", desc: "Confirm your stay through the payment step", color: "text-emerald-600 bg-emerald-50 ring-emerald-100" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">

          {/* ── LEFT: Form ── */}
          <div className="flex flex-col p-5 sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-indigo-100">
                  <House size={12} strokeWidth={2.5} /> Booking Request
                </div>
                <h3 className="mt-2.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  Request this room
                </h3>
                <p className="mt-0.5 text-sm font-medium text-slate-400 line-clamp-1">{listing.title}</p>
              </div>
              <button
                type="button"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                onClick={onClose}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Form */}
            <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="space-y-3.5">
                {/* Date inputs */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <CalendarDays size={14} strokeWidth={2.2} className="text-indigo-400" />
                      Preferred move-in date
                    </label>
                    <input
                      type="date"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm font-medium text-slate-800 transition-all duration-200 focus:border-indigo-300 focus:bg-white focus:shadow-sm focus:shadow-indigo-100/40 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      min={moveInMin}
                      value={form.moveInDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, moveInDate: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <CalendarRange size={14} strokeWidth={2.2} className="text-indigo-400" />
                      Visit date <span className="font-medium normal-case text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm font-medium text-slate-800 transition-all duration-200 focus:border-indigo-300 focus:bg-white focus:shadow-sm focus:shadow-indigo-100/40 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      min={today}
                      value={form.visitDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, visitDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <MessageSquareText size={14} strokeWidth={2.2} className="text-indigo-400" />
                    Message to landlord
                  </label>
                  <textarea
                    rows="3"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-inner shadow-slate-100/60 placeholder:text-slate-400 transition-all duration-200 focus:border-indigo-300 focus:shadow-sm focus:shadow-indigo-100/50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Introduce yourself, mention your preferred move-in period, and ask any important questions."
                    value={form.requestMessage}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, requestMessage: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-400">A brief intro helps landlords respond faster.</p>
                </div>
              </div>

              {/* Trust note + actions */}
              <div className="mt-auto pt-4">
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    <span className="font-semibold text-slate-600">No payment required at this step.</span> The landlord will review your request first. You'll only pay after approval.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/25 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-xl hover:shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-[0.97]"
                  >
                    <Send size={14} strokeWidth={2.2} />
                    {submitting ? "Sending request…" : "Send booking request"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ── RIGHT: Summary & Steps ── */}
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-100/50 p-5 sm:p-6 lg:border-l lg:border-t-0">

            {/* Property summary */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg shadow-slate-900/15">
              <div className="px-5 pb-4 pt-5">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
                  <House size={13} strokeWidth={2.5} />
                  Property summary
                </div>
                <h4 className="mt-2 text-base font-bold leading-snug text-white line-clamp-2">{listing.title}</h4>
              </div>

              <div className="space-y-px">
                <div className="flex items-center justify-between bg-white/[0.06] px-5 py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Wallet size={13} strokeWidth={2} className="text-slate-500" /> Monthly rent
                  </span>
                  <span className="text-base font-bold text-white">LKR {listing.rent?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.06] px-5 py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <CreditCard size={13} strokeWidth={2} className="text-slate-500" /> Key money
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {listing.keyMoney > 0
                      ? `LKR ${listing.keyMoney?.toLocaleString()}`
                      : "Not required"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.06] px-5 py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <CalendarDays size={13} strokeWidth={2} className="text-slate-500" /> Available from
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                <Info size={14} strokeWidth={2.2} className="text-indigo-400" />
                What happens next
              </div>

              <div className="mt-3.5 space-y-3">
                {steps.map(({ icon: StepIcon, label, desc, color }, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${color}`}>
                        <StepIcon size={15} strokeWidth={2.2} />
                      </div>
                      {idx < steps.length - 1 && (
                        <div className="my-0.5 h-3 w-px bg-slate-200" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div className="text-sm font-semibold text-slate-800">{label}</div>
                      <p className="text-[11px] leading-relaxed text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking tip */}
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/60 px-3.5 py-2.5 ring-1 ring-blue-100/60">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-blue-500" />
              <p className="text-[11px] leading-relaxed text-blue-700/70">
                <span className="font-semibold text-blue-700">Tip:</span> Including your expected stay duration and any special requirements in your message helps landlords make faster decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}