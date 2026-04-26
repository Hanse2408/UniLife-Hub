import { BookOpenText, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminGetAllReviewsApi } from "../../api/client";
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

export default function AdminUserReviewsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const { data: res } = await adminGetAllReviewsApi();
                setData(res);
            } catch {
                toast.error("Failed to load reviews");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Administration"
                title="User Reviews"
                description="All reviews across the platform grouped by reviewee."
                backgroundImage={dashboardBanner}
            />

            {loading ? (
                <LoadingState title="Loading reviews" description="Aggregating platform-wide review data." />
            ) : !data || data.totalReviews === 0 ? (
                <EmptyState
                    icon="⭐"
                    title="No reviews yet"
                    description="Reviews will appear here once students start rating services."
                    tone="amber"
                />
            ) : (
                <div className="space-y-4">
                    <div className="card p-4 text-sm text-slate-600">
                        <strong>{data.totalReviews}</strong> total reviews across <strong>{data.users.length}</strong> users
                    </div>

                    {data.users.map((u) => {
                        const uid = u.user?._id;
                        const isOpen = expanded[uid];
                        return (
                            <div key={uid} className="card overflow-hidden">
                                <button
                                    onClick={() => toggle(uid)}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 transition"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-900">{u.user?.fullName || "Unknown"}</div>
                                        <div className="text-xs text-slate-500">{u.user?.email} • {u.user?.role}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StarRating rating={u.averageRating} size={14} />
                                        <span className="text-xs text-slate-400">({u.count})</span>
                                        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="border-t border-slate-100 px-6 py-4 space-y-3">
                                        {u.reviews.map((r) => (
                                            <div key={r._id} className="rounded-xl bg-slate-50 p-4 text-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{r.reviewerId?.fullName || "Student"}</span>
                                                        <span className="ml-2 text-xs text-slate-400">{r.reviewerId?.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${sentimentBadge(r.sentiment)}`}>
                                                            {r.sentiment}
                                                        </span>
                                                        <StarRating rating={r.rating} size={12} />
                                                    </div>
                                                </div>
                                                {r.comment && (
                                                    <div className="mt-2 text-slate-600">
                                                        <MessageSquare size={12} className="inline mr-1.5 text-slate-400" />
                                                        {r.comment}
                                                    </div>
                                                )}
                                                <div className="mt-2 text-xs text-slate-400">
                                                    {r.entityType} • {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
