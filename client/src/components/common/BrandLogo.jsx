import { Link } from "react-router-dom";
import fullLogo from "../../assets/branding/logo-full.png";
import iconLogo from "../../assets/branding/logo-icon.png";

export default function BrandLogo({
  to = "/",
  compact = false,
  variant = "default", // default | sidebar
}) {
  if (variant === "sidebar") {
    return (
      <Link to={to} className="inline-flex items-center gap-3 rounded-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
          <img
            src={iconLogo}
            alt="UniLife Hub"
            className="h-13 w-13 object-contain"
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">
            UniLife Hub
          </div>
          <div className="mt-1 text-[15px] font-semibold text-slate-100">
            Smart Student Living
          </div>
          <div className="text-xs text-slate-400">
            Campus housing, food, and operations
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={to} className="inline-flex items-center gap-3">
      <img
        src={compact ? iconLogo : fullLogo}
        alt="UniLife Hub"
        className={compact ? "h-11 w-11 object-contain" : "h-20 object-contain md:h-24"}
      />
    </Link>
  );
}