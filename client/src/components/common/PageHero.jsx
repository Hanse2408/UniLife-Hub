export default function PageHero({
  eyebrow,
  title,
  description,
  backgroundImage = null,
  sideImage = null,
  compact = false,
}) {
  return (
    <section className="card overflow-hidden">
      <div className={`relative text-white ${compact ? "px-6 py-3 sm:px-8 sm:py-4" : "px-6 py-5 sm:px-8 sm:py-6"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_22%)]" />

        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/84 via-slate-900/72 to-cyan-700/54" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700" />
        )}

        <div className={`relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between ${compact ? "gap-4" : "gap-6"}`}>
          <div className="max-w-3xl">
            {eyebrow ? (
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/78 backdrop-blur-sm">
                {eyebrow}
              </div>
            ) : null}

            <h2 className={`font-black tracking-tight ${compact ? "mt-2 text-xl sm:text-2xl xl:text-[1.75rem]" : "mt-3 text-2xl sm:text-3xl xl:text-[2.25rem]"}`}>
              {title}
            </h2>

            {description ? (
              <p className={`max-w-2xl text-white/84 ${compact ? "mt-2 text-sm leading-6" : "mt-3 text-sm leading-7 sm:text-base"}`}>
                {description}
              </p>
            ) : null}
          </div>

          {sideImage ? (
            <div className="shrink-0 rounded-[28px] border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm">
              <img
                src={sideImage}
                alt=""
                className="mx-auto max-h-[180px] object-contain sm:max-h-[220px]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}