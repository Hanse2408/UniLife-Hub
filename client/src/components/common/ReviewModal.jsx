import { Star, X } from "lucide-react";
import { useState } from "react";

const sentimentLabel = (rating) => {
    if (rating <= 2) return { text: "Negative", color: "text-rose-600" };
    if (rating === 3) return { text: "Neutral", color: "text-amber-600" };
    return { text: "Positive", color: "text-emerald-600" };
};

export default function ReviewModal({ open, onClose, onSubmit, title, submitting }) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");

    if (!open) return null;

    const sentiment = rating > 0 ? sentimentLabel(rating) : null;

    const handleSubmit = () => {
        if (rating < 1) return;
        onSubmit({ rating, comment });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-900">{title || "Write a Review"}</h3>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Star Rating */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Rating</label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className="p-0.5 transition"
                                >
                                    <Star
                                        size={32}
                                        className={`transition ${star <= (hover || rating)
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-slate-200"
                                            }`}
                                    />
                                </button>
                            ))}
                            {sentiment && (
                                <span className={`ml-3 text-sm font-semibold ${sentiment.color}`}>
                                    {sentiment.text}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Comment (optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience..."
                            rows={3}
                            maxLength={1000}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition resize-none"
                        />
                        <div className="text-right text-xs text-slate-400 mt-1">{comment.length}/1000</div>
                    </div>
                </div>

                <div className="border-t border-slate-100 px-6 py-4">
                    <button
                        onClick={handleSubmit}
                        disabled={rating < 1 || submitting}
                        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                </div>
            </div>
        </div>
    );
}
