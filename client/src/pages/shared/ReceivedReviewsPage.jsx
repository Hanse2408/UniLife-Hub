import { BookOpenText, Star, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getReceivedReviewsApi } from "../../api/client";
import PageHero from "../../components/common/PageHero";
import StarRating from "../../components/common/StarRating";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const sentimentBadge = (s) => {
    if (s === "NEGATIVE") return "bg-rose-50 text-rose-700 ring-rose-200";
    if (s === "NEUTRAL") return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
};

export default function ReceivedReviewsPage({ roleLabel = "Reviews" }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data: res } = await getReceivedReviewsApi();
                setData(res);
            } catch {
                toast.error("Failed to load reviews");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow={roleLabel}
                title="Reviews"
                description="See what your customers and tenants are saying."
                backgroundImage={dashboardBanner}
            />

            {loading ? (
                <LoadingState title="Loading reviews" description="Fetching your ratings and feedback." />
            ) : !data || data.reviewCount === 0 ? (
                <EmptyState
                    icon="⭐"
                    title="No reviews yet"
                    description="Reviews from students will appear here once they rate your service."
                    tone="amber"
                />
            ) : (
                <>
                    <div className="card p-6">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="text-center">
                                <div className="text-4xl font-black text-slate-900">{data.averageRating.toFixed(1)}</div>
                                <StarRating rating={data.averageRating} size={18} showValue={false} />
                                <div className="mt-1 text-sm text-slate-500">{data.reviewCount} review{data.reviewCount !== 1 ? "s" : ""}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {data.reviews.map((review) => (
                            <div key={review._id} className="card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{review.reviewerId?.fullName || "Student"}</div>
                                        <div className="text-xs text-slate-500">{review.reviewerId?.email}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${sentimentBadge(review.sentiment)}`}>
                                            {review.sentiment}
                                        </span>
                                        <StarRating rating={review.rating} size={14} />
                                    </div>
                                </div>
                                {review.comment && (
                                    <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        <MessageSquare size={14} className="inline mr-2 text-slate-400" />
                                        {review.comment}
                                    </div>
                                )}
                                <div className="mt-3 text-xs text-slate-400">
                                    {review.entityType} • {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
