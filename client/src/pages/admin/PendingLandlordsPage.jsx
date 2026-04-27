import {
    Bell,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Mail,
    Phone,
    ShieldCheck,
    UserRound,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getPendingLandlordsApi,
    verifyLandlordApi,
    rejectLandlordVerificationApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import adminIllustration from "../../assets/illustrations/admin-verification.png";

export default function PendingLandlordsPage() {
    const [landlords, setLandlords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifyTarget, setVerifyTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);

    const loadLandlords = async () => {
        try {
            setLoading(true);
            const { data } = await getPendingLandlordsApi();
            setLandlords(data.landlords || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load landlords");
            setLandlords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLandlords();
    }, []);

    const handleVerify = async () => {
        try {
            await verifyLandlordApi(verifyTarget._id);
            toast.success("Landlord verified successfully");
            setVerifyTarget(null);
            await loadLandlords();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to verify landlord");
        }
    };

    const handleReject = async () => {
        try {
            await rejectLandlordVerificationApi(rejectTarget._id);
            toast.success("Landlord verification rejected");
            setRejectTarget(null);
            await loadLandlords();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reject landlord");
        }
    };

    const stats = useMemo(() => {
        const now = Date.now();
        const recent = landlords.filter(
            (landlord) => now - new Date(landlord.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
        ).length;

        return {
            total: landlords.length,
            withPhone: landlords.filter((landlord) => Boolean(landlord.phone)).length,
            recent,
        };
    }, [landlords]);

    return (
        <>
            <div className="space-y-6">
                <PageHero
                    eyebrow="Admin Console"
                    title="Pending Landlords"
                    description="Review landlord verification requests and approve trusted accommodation providers before they publish listings."
                    backgroundImage={dashboardBanner}
                    sideImage={adminIllustration}
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Pending landlords" value={stats.total} tone="amber" icon={ShieldCheck} />
                    <StatCard
                        title="Review status"
                        value={stats.total > 0 ? "Action needed" : "Clear"}
                        tone={stats.total > 0 ? "rose" : "emerald"}
                        icon={stats.total > 0 ? XCircle : CheckCircle2}
                    />
                    <StatCard title="Profiles with phone" value={stats.withPhone} tone="blue" icon={Phone} />
                    <StatCard title="Recent signups" value={stats.recent} tone="indigo" icon={Clock3} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <QuickActionCard
                        to="/admin/listings"
                        icon={Building2}
                        title="Listing moderation"
                        description="Switch to submitted property reviews and keep landlord verification aligned with listing approvals."
                        tone="indigo"
                        eyebrow="Accommodation"
                    />
                    <QuickActionCard
                        to="/admin/vendors"
                        icon={UserRound}
                        title="Vendor reviews"
                        description="Move between accommodation and vendor moderation without losing admin workflow context."
                        tone="emerald"
                        eyebrow="Marketplace"
                    />
                    <QuickActionCard
                        to="/admin/notifications"
                        icon={Bell}
                        title="Admin notifications"
                        description="Track verification outcomes and moderation events across the platform."
                        tone="amber"
                        eyebrow="Updates"
                    />
                </div>

                {loading ? (
                    <LoadingState
                        title="Loading landlord reviews"
                        description="Collecting pending landlord verification requests for moderation."
                    />
                ) : landlords.length === 0 ? (
                    <EmptyState
                        image={adminIllustration}
                        imageAlt="Admin verification illustration"
                        title="No pending landlords"
                        description="All landlord verification requests have been processed."
                        tone="emerald"
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {landlords.map((landlord) => (
                            <div key={landlord._id} className="card p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">{landlord.fullName}</h4>
                                        <p className="mt-3 text-sm leading-6 text-slate-500">
                                            This landlord needs verification before any submitted listing can move into the live accommodation pipeline.
                                        </p>
                                    </div>

                                    <StatusBadge value={landlord.landlordVerificationStatus} />
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <Mail size={14} strokeWidth={2.1} />
                                            Email
                                        </div>
                                        <div className="mt-2 break-all text-sm font-semibold text-slate-900">
                                            {landlord.email}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <Phone size={14} strokeWidth={2.1} />
                                            Phone
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">
                                            {landlord.phone || "No phone number"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <CalendarDays size={14} strokeWidth={2.1} />
                                            Registered On
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">
                                            {new Date(landlord.createdAt).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                    Verification unlocks listing approval and student visibility for this landlord's accommodation portfolio.
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                        onClick={() => setVerifyTarget(landlord)}
                                    >
                                        Verify
                                    </button>

                                    <button
                                        className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                        onClick={() => setRejectTarget(landlord)}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!verifyTarget}
                title="Verify landlord account?"
                description={
                    verifyTarget
                        ? `Approve ${verifyTarget.fullName} as a verified landlord?`
                        : ""
                }
                confirmLabel="Verify landlord"
                onConfirm={handleVerify}
                onClose={() => setVerifyTarget(null)}
            />

            <ConfirmModal
                open={!!rejectTarget}
                title="Reject landlord verification?"
                description={
                    rejectTarget
                        ? `Reject the verification request for ${rejectTarget.fullName}?`
                        : ""
                }
                confirmLabel="Reject"
                confirmTone="danger"
                onConfirm={handleReject}
                onClose={() => setRejectTarget(null)}
            />
        </>
    );
}
