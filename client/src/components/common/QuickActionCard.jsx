import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const toneMap = {
  indigo: {
    bar: "from-indigo-600 via-blue-600 to-cyan-500",
    surface: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    accent: "text-indigo-700",
  },
  blue: {
    bar: "from-sky-500 via-cyan-500 to-blue-600",
    surface: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    accent: "text-sky-700",
  },
  emerald: {
    bar: "from-emerald-500 via-teal-500 to-cyan-500",
    surface: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    accent: "text-emerald-700",
  },
  amber: {
    bar: "from-amber-500 via-orange-500 to-rose-500",
    surface: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    accent: "text-amber-700",
  },
  rose: {
    bar: "from-rose-500 via-pink-500 to-fuchsia-500",
    surface: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    accent: "text-rose-700",
  },
  slate: {
    bar: "from-slate-700 via-slate-800 to-slate-950",
    surface: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    accent: "text-slate-700",
  },
};

function renderIcon(icon) {
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null && icon.$$typeof)) {
    const Icon = icon;
    return <Icon size={20} strokeWidth={2.2} />;
  }

  if (typeof icon === "string" || typeof icon === "number") {
    return <span className="text-2xl">{icon}</span>;
  }

  return icon;
}

export default function QuickActionCard({
  to,
  icon = "✨",
  title,
  description,
  tone = "indigo",
  eyebrow = null,
  ctaLabel = "Open",
}) {
  const palette = toneMap[tone] || toneMap.indigo;

  return (
    <Link
      to={to}
      className="card group overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_rgba(15,23,42,0.14)]"
    >
      <div className={`h-1.5 bg-gradient-to-r ${palette.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105 ${palette.surface}`}>
            {renderIcon(icon)}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
            {ctaLabel}
            <ArrowUpRight size={14} strokeWidth={2.2} />
          </div>
        </div>

        {eyebrow ? (
          <div className={`mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] ${palette.accent}`}>
            {eyebrow}
          </div>
        ) : null}

        <div className="mt-4">
          <h4 className="text-lg font-bold text-slate-900">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}