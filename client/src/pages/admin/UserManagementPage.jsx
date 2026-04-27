import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Mail,
    Pencil,
    Phone,
    Search,
    ShieldAlert,
    Trash2,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    getAllUsersApi,
    updateUserApi,
    deleteUserApi,
    suspendUserApi,
    reactivateUserApi,
} from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import adminIllustration from "../../assets/illustrations/admin-verification.png";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

const ROLE_OPTIONS = ["STUDENT", "LANDLORD", "VENDOR", "ADMIN"];
const STATUS_OPTIONS = ["all", "active", "suspended", "inactive"];
const PAGE_SIZES = [10, 25, 50];

const roleBadge = {
    STUDENT: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    LANDLORD: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    VENDOR: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    ADMIN: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

function statusOf(user) {
    if (user.isSuspended) return "suspended";
    if (!user.isActive) return "inactive";
    return "active";
}

const statusBadge = {
    active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    suspended: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    inactive: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function fmtDate(d) {
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ─── Edit Modal ────────────────────────────────────────
function EditUserModal({ user, open, onClose, onSaved }) {
    const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "STUDENT" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user) {
            setForm({
                fullName: user.fullName || "",
                email: user.email || "",
                phone: user.phone || "",
                role: user.role || "STUDENT",
            });
            setError("");
        }
    }, [user]);

    if (!open || !user) return null;

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim() || form.fullName.trim().length < 2) {
            setError("Full name must be at least 2 characters");
            return;
        }
        try {
            setSaving(true);
            await updateUserApi(user._id, form);
            toast.success("User updated successfully");
            onSaved();
            onClose();
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to update user";
            if (err?.response?.status === 409) {
                setError(msg);
            } else {
                toast.error(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="card w-full max-w-lg p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900">Edit User</h3>
                    <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            value={form.fullName}
                            onChange={handleChange}
                            className="input"
                            required
                            minLength={2}
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="input"
                            required
                        />
                        {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                        <select name="role" value={form.role} onChange={handleChange} className="input">
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={saving}
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Suspend Modal ─────────────────────────────────────
function SuspendModal({ user, open, onClose, onSuspended }) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    if (!open || !user) return null;

    const handleSuspend = async () => {
        if (reason.trim().length < 10) return;
        try {
            setSubmitting(true);
            await suspendUserApi(user._id, { reason: reason.trim() });
            toast.success(`${user.fullName} has been suspended`);
            onSuspended();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to suspend user");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="card w-full max-w-lg p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">Suspend {user.fullName}?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            This will immediately prevent the user from logging in or using the platform.
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Suspension Reason <span className="text-slate-400">(min 10 characters)</span>
                    </label>
                    <textarea
                        rows="4"
                        className="input"
                        placeholder="Explain why this account is being suspended…"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <div className="mt-6 flex gap-3">
                    <button className="btn-secondary flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button
                        className="flex-1 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSuspend}
                        disabled={submitting || reason.trim().length < 10}
                    >
                        {submitting ? "Suspending…" : "Suspend Account"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Modal ──────────────────────────────────────
function DeleteModal({ user, open, onClose, onDeleted }) {
    const [confirmEmail, setConfirmEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setConfirmEmail("");
    }, [open]);

    if (!open || !user) return null;

    const emailMatch = confirmEmail.toLowerCase() === user.email.toLowerCase();

    const handleDelete = async () => {
        if (!emailMatch) return;
        try {
            setSubmitting(true);
            await deleteUserApi(user._id);
            toast.success("User deleted");
            onDeleted();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete user");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="card w-full max-w-lg p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                        <Trash2 size={22} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">Delete {user.fullName}?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            This action is permanent and cannot be undone. All data associated with this user will be removed.
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Type <span className="font-mono text-rose-600">{user.email}</span> to confirm
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter user's email address"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                    />
                </div>

                <div className="mt-6 flex gap-3">
                    <button className="btn-secondary flex-1" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button
                        className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleDelete}
                        disabled={submitting || !emailMatch}
                    >
                        {submitting ? "Deleting…" : "Delete User"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════
export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ totalAll: 0, totalStudents: 0, totalLandlords: 0, totalVendors: 0, totalSuspended: 0 });
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    // Modals
    const [editUser, setEditUser] = useState(null);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const [reactivateTarget, setReactivateTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: pageSize,
                sortBy,
                sortOrder,
            };
            if (search.trim()) params.search = search.trim();
            if (roleFilter) params.role = roleFilter;
            if (statusFilter !== "all") params.status = statusFilter;

            const { data } = await getAllUsersApi(params);
            setUsers(data.users || []);
            setStats(data.stats || stats);
            setPagination(data.pagination || pagination);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, roleFilter, statusFilter, sortBy, sortOrder]);

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(id);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, roleFilter, statusFilter, pageSize]);

    useEffect(() => {
        fetchUsers();
    }, [page, pageSize, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handleReactivate = async () => {
        if (!reactivateTarget) return;
        try {
            await reactivateUserApi(reactivateTarget._id);
            toast.success(`${reactivateTarget.fullName} has been reactivated`);
            setReactivateTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to reactivate user");
        }
    };

    const sortIcon = (field) => {
        if (sortBy !== field) return null;
        return <ChevronDown size={14} className={`ml-1 inline transition ${sortOrder === "asc" ? "rotate-180" : ""}`} />;
    };

    const startIdx = (pagination.page - 1) * pagination.limit + 1;
    const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <>
            <div className="space-y-6">
                {/* Hero */}
                <PageHero
                    eyebrow="Admin Console"
                    title="User Management"
                    description="View, edit, suspend, and remove user accounts across the platform. Use filters to find specific users quickly."
                    backgroundImage={dashboardBanner}
                    sideImage={adminIllustration}
                />

                {/* Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard title="Total Users" value={stats.totalAll} icon={Users} tone="indigo" />
                    <StatCard title="Students" value={stats.totalStudents} icon="🎓" tone="emerald" />
                    <StatCard title="Landlords" value={stats.totalLandlords} icon="🏠" tone="blue" />
                    <StatCard title="Vendors" value={stats.totalVendors} icon="🍽️" tone="amber" />
                    <StatCard title="Suspended" value={stats.totalSuspended} icon={ShieldAlert} tone="rose" />
                </div>

                {/* Filters */}
                <div className="card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-10"
                            />
                        </div>

                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input w-auto min-w-[140px]"
                        >
                            <option value="">All Roles</option>
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input w-auto min-w-[140px]"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <LoadingState title="Loading Users" description="Fetching user records…" />
                ) : users.length === 0 ? (
                    <EmptyState
                        icon="👤"
                        title="No users found"
                        description={search || roleFilter || statusFilter !== "all"
                            ? "No users match your current filters. Try adjusting your search or filter criteria."
                            : "No users have registered yet."
                        }
                        action={
                            (search || roleFilter || statusFilter !== "all") && (
                                <button
                                    className="btn-secondary"
                                    onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter("all"); }}
                                >
                                    Clear Filters
                                </button>
                            )
                        }
                    />
                ) : (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        <th
                                            className="cursor-pointer px-5 py-4 font-semibold text-slate-600 select-none hover:text-slate-900"
                                            onClick={() => handleSort("fullName")}
                                        >
                                            Name {sortIcon("fullName")}
                                        </th>
                                        <th
                                            className="cursor-pointer px-5 py-4 font-semibold text-slate-600 select-none hover:text-slate-900"
                                            onClick={() => handleSort("email")}
                                        >
                                            Email {sortIcon("email")}
                                        </th>
                                        <th className="px-5 py-4 font-semibold text-slate-600">Phone</th>
                                        <th
                                            className="cursor-pointer px-5 py-4 font-semibold text-slate-600 select-none hover:text-slate-900"
                                            onClick={() => handleSort("role")}
                                        >
                                            Role {sortIcon("role")}
                                        </th>
                                        <th
                                            className="cursor-pointer px-5 py-4 font-semibold text-slate-600 select-none hover:text-slate-900"
                                            onClick={() => handleSort("createdAt")}
                                        >
                                            Created {sortIcon("createdAt")}
                                        </th>
                                        <th className="px-5 py-4 font-semibold text-slate-600">Status</th>
                                        <th className="px-5 py-4 text-right font-semibold text-slate-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((u) => {
                                        const st = statusOf(u);
                                        return (
                                            <tr key={u._id} className="transition hover:bg-slate-50/60">
                                                <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                                            <UserRound size={16} />
                                                        </div>
                                                        {u.fullName}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail size={14} className="text-slate-400" />
                                                        {u.email}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                                    {u.phone ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone size={14} className="text-slate-400" />
                                                            {u.phone}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadge[u.role]}`}>
                                                        {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{fmtDate(u.createdAt)}</td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge[st]}`}>
                                                        {st}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Edit */}
                                                        <button
                                                            title="Edit user"
                                                            onClick={() => setEditUser(u)}
                                                            className="rounded-xl p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>

                                                        {/* Suspend / Reactivate */}
                                                        {u.isSuspended ? (
                                                            <button
                                                                title="Reactivate user"
                                                                onClick={() => setReactivateTarget(u)}
                                                                className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                title="Suspend user"
                                                                onClick={() => setSuspendTarget(u)}
                                                                className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                        )}

                                                        {/* Delete */}
                                                        <button
                                                            title="Delete user"
                                                            onClick={() => setDeleteTarget(u)}
                                                            className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
                            <p className="text-sm text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{startIdx}–{endIdx}</span> of{" "}
                                <span className="font-semibold text-slate-700">{pagination.total}</span> users
                            </p>

                            <div className="flex items-center gap-3">
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className="input w-auto py-2 text-xs"
                                >
                                    {PAGE_SIZES.map((s) => (
                                        <option key={s} value={s}>{s} / page</option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="px-2 text-sm font-medium text-slate-700">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page >= pagination.totalPages}
                                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            <EditUserModal
                user={editUser}
                open={!!editUser}
                onClose={() => setEditUser(null)}
                onSaved={fetchUsers}
            />

            <SuspendModal
                user={suspendTarget}
                open={!!suspendTarget}
                onClose={() => setSuspendTarget(null)}
                onSuspended={fetchUsers}
            />

            <ConfirmModal
                open={!!reactivateTarget}
                title={`Reactivate ${reactivateTarget?.fullName}?`}
                description={
                    reactivateTarget?.suspensionReason
                        ? `This will restore the user's access to the platform.\n\nPrevious suspension reason: "${reactivateTarget.suspensionReason}"`
                        : "This will restore the user's access to the platform."
                }
                confirmLabel="Reactivate"
                confirmTone="primary"
                onConfirm={handleReactivate}
                onClose={() => setReactivateTarget(null)}
            />

            <DeleteModal
                user={deleteTarget}
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDeleted={fetchUsers}
            />
        </>
    );
}
