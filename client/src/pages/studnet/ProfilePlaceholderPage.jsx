import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    GraduationCap,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Save,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../contexts/AuthContext";
import { updateProfileApi } from "../../api/client";

const ALLERGEN_OPTIONS = [
    "Milk", "Eggs", "Peanuts", "Tree Nuts", "Wheat",
    "Soy", "Fish", "Shellfish", "Sesame", "Sulfites",
];

function formatDate(value) {
    if (!value) return "Not available";
    return new Date(value).toLocaleDateString("en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatDateInput(value) {
    if (!value) return "";
    return new Date(value).toISOString().split("T")[0];
}

function getAccountState(user) {
    if (!user) return { label: "Unknown", tone: "slate", summary: "Profile data is not available right now." };
    if (user.isSuspended) return { label: "Suspended", tone: "rose", summary: "This account is currently suspended." };
    if (!user.isActive) return { label: "Inactive", tone: "amber", summary: "This account exists but is not currently active." };
    return { label: "Active", tone: "emerald", summary: "Your student account is active and ready." };
}

export default function StudentProfilePage() {
    const { user, refreshUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        bio: "",
        university: "",
        studentId: "",
        dateOfBirth: "",
        address: "",
        emergencyContact: "",
        allergenNotes: [],
    });

    useEffect(() => {
        if (user) {
            setForm({
                fullName: user.fullName || "",
                phone: user.phone || "",
                bio: user.bio || "",
                university: user.university || "",
                studentId: user.studentId || "",
                dateOfBirth: formatDateInput(user.dateOfBirth),
                address: user.address || "",
                emergencyContact: user.emergencyContact || "",
                allergenNotes: user.allergenNotes || [],
            });
        }
    }, [user]);

    const accountState = getAccountState(user);

    const profileCompleteness = useMemo(() => {
        const fields = [form.fullName, form.phone, form.bio, form.university, form.studentId, form.dateOfBirth, form.address, form.emergencyContact];
        return fields.filter(Boolean).length;
    }, [form]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSave = async () => {
        if (!form.fullName.trim()) {
            toast.error("Full name is required");
            return;
        }
        try {
            setSaving(true);
            const payload = {
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                bio: form.bio.trim(),
                university: form.university.trim(),
                studentId: form.studentId.trim(),
                dateOfBirth: form.dateOfBirth || null,
                address: form.address.trim(),
                emergencyContact: form.emergencyContact.trim(),
                allergenNotes: form.allergenNotes,
            };
            await updateProfileApi(payload);
            await refreshUser();
            toast.success("Profile updated successfully");
            setEditing(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        if (user) {
            setForm({
                fullName: user.fullName || "",
                phone: user.phone || "",
                bio: user.bio || "",
                university: user.university || "",
                studentId: user.studentId || "",
                dateOfBirth: formatDateInput(user.dateOfBirth),
                address: user.address || "",
                emergencyContact: user.emergencyContact || "",
                allergenNotes: user.allergenNotes || [],
            });
        }
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Profile"
                title={user?.fullName ? `${user.fullName}, here is your account` : "Your student account"}
                description="Update your personal details, add allergen notes, and keep your profile complete."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Account state"
                    value={accountState.label}
                    subtitle={accountState.summary}
                    tone={accountState.tone}
                    icon={ShieldCheck}
                />
                <StatCard
                    title="Profile completeness"
                    value={`${profileCompleteness}/8`}
                    subtitle="Fill in more fields to complete your profile."
                    tone="blue"
                    icon={UserRound}
                />
                <StatCard
                    title="Role access"
                    value={user?.role || "STUDENT"}
                    subtitle="Your role determines available features."
                    tone="indigo"
                    icon={GraduationCap}
                />
                <StatCard
                    title="Member since"
                    value={formatDate(user?.createdAt)}
                    subtitle="Account creation date."
                    tone="emerald"
                    icon={CalendarDays}
                />
            </div>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Personal information
                                </div>
                                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                    {editing ? "Edit your details" : "Your profile details"}
                                </h3>
                            </div>
                            {!editing ? (
                                <button className="btn-primary flex items-center gap-2" onClick={() => setEditing(true)}>
                                    <Pencil size={15} />
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
                                        <Save size={15} />
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                    <button className="btn-secondary flex items-center gap-2" onClick={handleCancel}>
                                        <X size={15} />
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <UserRound size={14} className="mr-1 inline" />
                                    Full Name
                                </label>
                                {editing ? (
                                    <input className="input" value={form.fullName} onChange={handleChange("fullName")} />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.fullName || "Not set"}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <Mail size={14} className="mr-1 inline" />
                                    Email <span className="text-xs text-slate-400">(cannot be changed)</span>
                                </label>
                                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                                    {user?.email || "Not set"}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <Phone size={14} className="mr-1 inline" />
                                    Phone
                                </label>
                                {editing ? (
                                    <input className="input" value={form.phone} onChange={handleChange("phone")} placeholder="e.g. +94 77 123 4567" />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.phone || "No phone saved"}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <GraduationCap size={14} className="mr-1 inline" />
                                    University
                                </label>
                                {editing ? (
                                    <input className="input" value={form.university} onChange={handleChange("university")} placeholder="e.g. University of Colombo" />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.university || "Not set"}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <CheckCircle2 size={14} className="mr-1 inline" />
                                    Student ID
                                </label>
                                {editing ? (
                                    <input className="input" value={form.studentId} onChange={handleChange("studentId")} placeholder="e.g. STU-2024-001" />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.studentId || "Not set"}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <CalendarDays size={14} className="mr-1 inline" />
                                    Date of Birth
                                </label>
                                {editing ? (
                                    <input type="date" className="input" value={form.dateOfBirth} onChange={handleChange("dateOfBirth")} />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.dateOfBirth ? formatDate(user.dateOfBirth) : "Not set"}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <MapPin size={14} className="mr-1 inline" />
                                    Address
                                </label>
                                {editing ? (
                                    <input className="input" value={form.address} onChange={handleChange("address")} placeholder="Your current or home address" />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.address || "Not set"}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    <Phone size={14} className="mr-1 inline" />
                                    Emergency Contact
                                </label>
                                {editing ? (
                                    <input className="input" value={form.emergencyContact} onChange={handleChange("emergencyContact")} placeholder="Name and phone number" />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                                        {user?.emergencyContact || "Not set"}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Bio</label>
                                {editing ? (
                                    <textarea
                                        className="input min-h-[80px]"
                                        value={form.bio}
                                        onChange={handleChange("bio")}
                                        placeholder="Tell us a bit about yourself..."
                                        rows={3}
                                    />
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                                        {user?.bio || "No bio added yet"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            <AlertTriangle size={14} />
                            Allergen Notes
                        </div>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">Food allergy profile</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Select your allergens. These are <strong>automatically synced</strong> to the meal planner and food ordering system — you'll be warned before adding conflicting items.
                        </p>

                        {editing ? (
                            <div className="mt-4">
                                <label className="mb-3 block text-sm font-medium text-slate-700">
                                    Select all that apply
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ALLERGEN_OPTIONS.map((allergen) => {
                                        const selected = form.allergenNotes.includes(allergen);
                                        return (
                                            <button
                                                key={allergen}
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        allergenNotes: selected
                                                            ? prev.allergenNotes.filter((a) => a !== allergen)
                                                            : [...prev.allergenNotes, allergen],
                                                    }))
                                                }
                                                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${selected
                                                        ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    }`}
                                            >
                                                {selected ? "✓ " : ""}{allergen}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.allergenNotes.length === 0 && (
                                    <p className="mt-2 text-xs text-slate-400">No allergens selected — tap to add.</p>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4">
                                {(user?.allergenNotes || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {user.allergenNotes.map((allergen, idx) => (
                                            <span
                                                key={idx}
                                                className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700"
                                            >
                                                {allergen}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                        No allergens added yet. Click Edit Profile to select your food allergies.
                                    </div>
                                )}
                            </div>
                        )}

                        {(user?.allergenNotes || []).length > 0 && !editing && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                                <strong>Active protection:</strong> The meal planner and food browsing will warn you before ordering items containing{" "}
                                {user.allergenNotes.join(", ")}.
                            </div>
                        )}
                    </div>

                    <div className="card p-6">
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Session details
                        </div>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">Account snapshot</h3>

                        <div className="mt-5 space-y-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Active role:</span> {user?.role || "STUDENT"}
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Account state:</span> {accountState.label}
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Created:</span> {formatDate(user?.createdAt)}
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Last updated:</span> {formatDate(user?.updatedAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
