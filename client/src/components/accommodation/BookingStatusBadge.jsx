import {
    CheckCircle2,
    Clock,
    CreditCard,
    ShieldCheck,
    XCircle,
} from "lucide-react";

const config = {
    REQUESTED: {
        label: "Requested",
        icon: Clock,
        classes: "bg-amber-50 text-amber-700 ring-amber-200/60",
    },
    APPROVED: {
        label: "Approved",
        icon: ShieldCheck,
        classes: "bg-blue-50 text-blue-700 ring-blue-200/60",
    },
    PAYMENT_PENDING: {
        label: "Payment pending",
        icon: CreditCard,
        classes: "bg-yellow-50 text-yellow-700 ring-yellow-200/60",
    },
    CONFIRMED: {
        label: "Confirmed",
        icon: CheckCircle2,
        classes: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    },
    ACTIVE_STAY: {
        label: "Active stay",
        icon: CheckCircle2,
        classes: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    },
    REJECTED: {
        label: "Rejected",
        icon: XCircle,
        classes: "bg-rose-50 text-rose-600 ring-rose-200/60",
    },
    CANCELLED: {
        label: "Cancelled",
        icon: XCircle,
        classes: "bg-slate-100 text-slate-500 ring-slate-200/60",
    },
    COMPLETED: {
        label: "Completed",
        icon: CheckCircle2,
        classes: "bg-slate-100 text-slate-600 ring-slate-200/60",
    },
};

export default function BookingStatusBadge({ status }) {
    const c = config[status] || {
        label: status,
        icon: Clock,
        classes: "bg-slate-100 text-slate-600 ring-slate-200/60",
    };
    const Icon = c.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${c.classes}`}
        >
            <Icon size={12} strokeWidth={2.2} />
            {c.label}
        </span>
    );
}
