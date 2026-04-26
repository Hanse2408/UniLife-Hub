import {
    Bell,
    Bus,
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
    getPendingTransportManagersApi,
    verifyTransportManagerApi,
    rejectTransportManagerApi,
} from "../../api/client";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

export default function PendingTransportManagersPage() {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifyTarget, setVerifyTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);

    const loadManagers = async () => {
        try {
            setLoading(true);
            const { data } = await getPendingTransportManagersApi();
            setManagers(data.managers || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load transport managers");
            setManagers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadManagers();
    }, []);

    const handleVerify = async () => {
        try {
            await verifyTransportManagerApi(verifyTarget._id);
            toast.success("Transport manager verified successfully");
            setVerifyTarget(null);
            await loadManagers();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to verify transport manager");
        }
    };

    const handleReject = async () => {
        try {
            await rejectTransportManagerApi(rejectTarget._id);
            toast.success("Transport manager rejected");
            setRejectTarget(null);
            await loadManagers();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reject transport manager");
        }
    };

    const stats = useMemo(() => {
        const now = Date.now();
        const recent = managers.filter(
            (m) => now - new Date(m.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
        ).length;

        return {
            total: managers.length,
            withPhone: managers.filter((m) => Boolean(m.phone)).length,
            recent,
        };
    }, [managers]);

    return (
        <>
            <div className="space-y-6">
                <PageHero
                    eyebrow="Admin Console"
                    title="Pending Transport Managers"
                    description="Review transport manager registration requests and approve trusted operators before they can create transport listings."
                    backgroundImage={dashboardBanner}
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Pending managers" value={stats.total} tone="amber" icon={Bus} />
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
                        to="/admin/transport-listings"
                        icon={Bus}
                        title="Transport listing moderation"
                        description="Review pending transport route listings submitted by verified managers."
                        tone="indigo"
                        eyebrow="Transport"
                    />
                    <QuickActionCard
                        to="/admin/vendors"
                        icon={ShieldCheck}
                        title="Vendor reviews"
                        description="Switch to food vendor verification queue."
                        tone="emerald"
                        eyebrow="Food"
                    />
                    <QuickActionCard
                        to="/admin/notifications"
                        icon={Bell}
                        title="Admin notifications"
                        description="Track verification outcomes and moderation events."
                        tone="amber"
                        eyebrow="Updates"
                    />
                </div>

                {loading ? (
                    <LoadingState
                        title="Loading transport manager reviews"
                        description="Collecting pending transport manager verification requests."
                    />
                ) : managers.length === 0 ? (
                    <EmptyState
                        icon="🚌"
                        title="No pending transport managers"
                        description="All transport manager verification requests have been processed."
                        tone="emerald"
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {managers.map((manager) => (
                            <div key={manager._id} className="card p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">{manager.fullName}</h4>
                                        <p className="mt-3 text-sm leading-6 text-slate-500">
                                            This transport manager needs verification before they can create bus and van route listings.
                                        </p>
                                    </div>
                                    <StatusBadge value={manager.transportManagerVerificationStatus} />
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <Mail size={14} strokeWidth={2.1} />
                                            Email
                                        </div>
                                        <div className="mt-2 break-all text-sm font-semibold text-slate-900">
                                            {manager.email}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <Phone size={14} strokeWidth={2.1} />
                                            Phone
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">
                                            {manager.phone || "No phone number"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            <CalendarDays size={14} strokeWidth={2.1} />
                                            Registered On
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-slate-900">
                                            {new Date(manager.createdAt).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                    Verification unlocks transport dashboard access for creating bus and van route listings.
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                        onClick={() => setVerifyTarget(manager)}
                                    >
                                        Verify
                                    </button>
                                    <button
                                        className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                        onClick={() => setRejectTarget(manager)}
                                    >
                                        Reject
                                    </button>
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <UserRound size={14} strokeWidth={2.1} />
                                        Manager ID {String(manager._id).slice(-6).toUpperCase()}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <ShieldCheck size={14} strokeWidth={2.1} />
                                        Transport verification queue
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!verifyTarget}
                title="Verify transport manager?"
                description={
                    verifyTarget
                        ? `Approve ${verifyTarget.fullName} as a verified transport manager?`
                        : ""
                }
                confirmLabel="Verify manager"
                onConfirm={handleVerify}
                onClose={() => setVerifyTarget(null)}
            />

            <ConfirmModal
                open={!!rejectTarget}
                title="Reject transport manager?"
                description={
                    rejectTarget
                        ? `Reject the transport manager registration request for ${rejectTarget.fullName}?`
                        : ""
                }
                confirmLabel="Reject manager"
                onConfirm={handleReject}
                onClose={() => setRejectTarget(null)}
            />
        </>
    );
}
