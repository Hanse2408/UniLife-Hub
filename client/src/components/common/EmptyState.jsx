export default function EmptyState({
  icon = null,
  image = null,
  imageAlt = "Empty state illustration",
  title = "No data found",
  description = "Nothing to show here yet.",
  action = null,
  compact = false,
  tone = "slate",
}) {
  const toneClasses =
    tone === "indigo"
      ? "bg-indigo-50 text-indigo-700"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : tone === "rose"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-700";

  return (
    <div className={`card p-8 text-center ${compact ? "" : "sm:p-10"}`}>
      {image ? (
        <div className="mb-6 rounded-[28px] border border-slate-100 bg-slate-50/80 p-4">
          <img
            src={image}
            alt={imageAlt}
            className={`mx-auto object-contain ${compact ? "max-h-[140px]" : "max-h-[180px] sm:max-h-[220px]"}`}
          />
        </div>
      ) : icon ? (
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl ${toneClasses}`}>
          {icon}
        </div>
      ) : null}

      <h4 className="text-2xl font-bold text-slate-900">{title}</h4>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
        {description}
      </p>

      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}