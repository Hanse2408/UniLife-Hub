import { Star } from "lucide-react";

export default function StarRating({ rating, size = 14, showValue = true }) {
    const r = Number(rating) || 0;
    return (
        <span className="inline-flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    size={size}
                    className={s <= Math.round(r) ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                />
            ))}
            {showValue && <span className="ml-1 text-sm font-bold text-slate-700">{r.toFixed(1)}</span>}
        </span>
    );
}
