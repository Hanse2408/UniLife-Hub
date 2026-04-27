const toneMap = {
  indigo: {
    bar: "from-indigo-600 via-blue-600 to-cyan-500",
    surface: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  },
  blue: {
    bar: "from-sky-500 via-cyan-500 to-blue-600",
    surface: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  },
  emerald: {
    bar: "from-emerald-500 via-teal-500 to-cyan-500",
    surface: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
  amber: {
    bar: "from-amber-500 via-orange-500 to-rose-500",
    surface: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
  rose: {
    bar: "from-rose-500 via-pink-500 to-fuchsia-500",
    surface: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  },
  slate: {
    bar: "from-slate-700 via-slate-800 to-slate-950",
    surface: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
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

export default function StatCard({
  title,
  value,
  subtitle = "",
  tone = "indigo",
  icon = "📊",
}) {
  const palette = toneMap[tone] || toneMap.indigo;

  return (
    <div className="card overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${palette.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
            {subtitle ? <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
          </div>

          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.surface}`}>
            {renderIcon(icon)}
          </div>
        </div>
      </div>
    </div>
  );
}