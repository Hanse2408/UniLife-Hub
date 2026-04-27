import {
    BookOpenText,
    Bus,
    CheckCircle2,
    ShieldCheck,
    Store,
    Truck,
    Users,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getPendingLandlordsApi,
    getPendingVendorsApi,
    getPendingTransportManagersApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

export default function AdminDashboardPage() {
    const [summary, setSummary] = useState({
        landlords: [],
        vendors: [],
        transportManagers: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);

                const [landlordsRes, vendorsRes, transportRes] = await Promise.allSettled([
                    getPendingLandlordsApi(),
                    getPendingVendorsApi(),
                    getPendingTransportManagersApi(),
                ]);

                if (
                    landlordsRes.status === "rejected" &&
                    vendorsRes.status === "rejected" &&
                    transportRes.status === "rejected"
                ) {
                    toast.error("Failed to load admin dashboard");
                }

                setSummary({
                    landlords: landlordsRes.status === "fulfilled" ? landlordsRes.value.data.landlords || [] : [],
                    vendors: vendorsRes.status === "fulfilled" ? vendorsRes.value.data.vendors || [] : [],
                    transportManagers: transportRes.status === "fulfilled" ? transportRes.value.data.managers || [] : [],
                });
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const stats = useMemo(() => {
        return {
            pendingLandlords: summary.landlords.length,
            pendingVendors: summary.vendors.length,
            pendingTransport: summary.transportManagers.length,
            totalQueue: summary.landlords.length + summary.vendors.length + summary.transportManagers.length,
        };
    }, [summary]);

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Admin Dashboard"
                title="Platform Overview"
                description="Review pending approvals and manage users across the platform."
                backgroundImage={dashboardBanner}
            />

            {loading ? (
                <LoadingState
                    title="Loading admin dashboard"
                    description="Collecting current approval queues."
                />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Pending landlords"
                            value={stats.pendingLandlords}
                            tone="indigo"
                            icon={ShieldCheck}
                        />
                        <StatCard
                            title="Pending vendors"
                            value={stats.pendingVendors}
                            tone="amber"
                            icon={Store}
                        />
                        <StatCard
                            title="Pending transport"
                            value={stats.pendingTransport}
                            tone="blue"
                            icon={Bus}
                        />
                        <StatCard
                            title="Total queue"
                            value={stats.totalQueue}
                            tone={stats.totalQueue > 0 ? "rose" : "emerald"}
                            icon={stats.totalQueue > 0 ? XCircle : CheckCircle2}
                        />
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Quick navigation</div>
                                <h3 className="mt-2 text-2xl font-bold text-slate-900">Manage the platform</h3>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Link to="/admin/landlords" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><ShieldCheck size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Landlord Verification</div>
                                    <div className="mt-0.5 text-xs text-slate-500">Approve accommodation providers.</div>
                                </div>
                            </Link>
                            <Link to="/admin/vendors" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-amber-200 hover:bg-amber-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Store size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700">Vendor Verification</div>
                                    <div className="mt-0.5 text-xs text-slate-500">Approve food vendors.</div>
                                </div>
                            </Link>
                            <Link to="/admin/transport-managers" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Bus size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700">Transport Managers</div>
                                    <div className="mt-0.5 text-xs text-slate-500">Verify transport manager accounts.</div>
                                </div>
                            </Link>
                            <Link to="/admin/users" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Users size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">User Management</div>
                                    <div className="mt-0.5 text-xs text-slate-500">View, edit, and manage all accounts.</div>
                                </div>
                            </Link>
                            <Link to="/admin/user-reviews" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-rose-200 hover:bg-rose-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><BookOpenText size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-rose-700">User Reviews</div>
                                    <div className="mt-0.5 text-xs text-slate-500">All reviews and ratings across the platform.</div>
                                </div>
                            </Link>
                            <Link to="/admin/food/delivery" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><Truck size={18} /></div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Food Delivery</div>
                                    <div className="mt-0.5 text-xs text-slate-500">Dispatch orders and confirm campus deliveries.</div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}