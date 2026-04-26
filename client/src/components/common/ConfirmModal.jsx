import { useState } from "react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "primary",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter a reason...",
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const confirmClasses =
    confirmTone === "danger"
      ? "rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
      : "rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700";

  const handleConfirm = async () => {
    try {
      if (requireReason && !reason.trim()) return;

      setSubmitting(true);
      await onConfirm?.(reason.trim());
      setReason("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-2xl font-bold text-slate-900">{title}</h3>

        {description ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}

        {requireReason ? (
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {reasonLabel}
            </label>
            <textarea
              rows="4"
              className="input"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button className="btn-secondary flex-1" onClick={handleClose} disabled={submitting}>
            {cancelLabel}
          </button>

          <button
            className={`${confirmClasses} flex-1 disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={handleConfirm}
            disabled={submitting || (requireReason && !reason.trim())}
          >
            {submitting ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}