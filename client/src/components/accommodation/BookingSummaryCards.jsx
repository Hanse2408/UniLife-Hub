import {
    CalendarCheck,
    CheckCircle2,
    ClipboardList,
    Clock,
    XCircle,
} from "lucide-react";

const toneMap = {
    indigo: {
        bar: "from-indigo-600 via-blue-600 to-cyan-500",
        surface: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    },
    amber: {
        bar: "from-amber-500 via-orange-500 to-rose-500",
        surface: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    },
    blue: {
        bar: "from-sky-500 via-cyan-500 to-blue-600",
        surface: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    },
    emerald: {
        bar: "from-emerald-500 via-teal-500 to-cyan-500",
        surface: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    },
    slate: {
        bar: "from-slate-700 via-slate-800 to-slate-950",
        surface: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    },
};

const cards = [
    {
        key: "total",
        label: "Total bookings",
        icon: ClipboardList,
        tone: "indigo",
    },
    {
        key: "requested",
        label: "Requested",
        icon: Clock,
        tone: "amber",
    },
    {
        key: "paymentPending",
        label: "Payment pending",
        icon: CalendarCheck,
        tone: "blue",
    },
    {
        key: "confirmed",
        label: "Confirmed",
        icon: CheckCircle2,
        tone: "emerald",
    },
    {
        key: "closed",
        label: "Closed",
        icon: XCircle,
        tone: "slate",
    },
];

export default function BookingSummaryCards({ stats }) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((c) => {
                const Icon = c.icon;
                const value = stats[c.key] ?? 0;
                const palette = toneMap[c.tone] || toneMap.indigo;

                return (
                    <div
                        key={c.key}
                        className="card overflow-hidden transition-shadow hover:shadow-md"
                    >
                        {/* Gradient accent bar — matches StatCard */}
                        <div className={`h-1.5 bg-gradient-to-r ${palette.bar}`} />

                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">
                                        {c.label}
                                    </p>
                                    <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-900">
                                        {value}
                                    </p>
                                </div>
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.surface}`}
                                >
                                    <Icon size={20} strokeWidth={2.2} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
