import { Moon, Sun, Sunset, Briefcase, Sparkles, Users, VolumeX, Volume2, BookOpen, Cigarette, PawPrint, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { updateRoommatePreferencesApi } from "../../api/client";

const FIELDS = [
    {
        key: "sleepSchedule",
        label: "Sleep schedule",
        icon: Moon,
        options: [
            { value: "EARLY_BIRD", label: "Early bird", desc: "Asleep by 10 PM" },
            { value: "NIGHT_OWL", label: "Night owl", desc: "Up past midnight" },
            { value: "FLEXIBLE", label: "Flexible", desc: "No fixed schedule" },
        ],
    },
    {
        key: "workSchedule",
        label: "Work / study schedule",
        icon: Briefcase,
        options: [
            { value: "WEEKDAYS", label: "Weekdays", desc: "Mon – Fri routine" },
            { value: "WEEKENDS", label: "Weekends", desc: "Works weekends" },
            { value: "REMOTE", label: "Remote / WFH", desc: "Works from home" },
            { value: "MIXED", label: "Mixed", desc: "Variable schedule" },
        ],
    },
    {
        key: "cleanlinessLevel",
        label: "Cleanliness",
        icon: Sparkles,
        options: [
            { value: "VERY_TIDY", label: "Very tidy", desc: "Always clean" },
            { value: "TIDY", label: "Tidy", desc: "Generally clean" },
            { value: "RELAXED", label: "Relaxed", desc: "Comfortable with clutter" },
        ],
    },
    {
        key: "guestPolicy",
        label: "Guest policy",
        icon: Users,
        options: [
            { value: "NO_GUESTS", label: "No guests", desc: "Prefer no visitors" },
            { value: "OCCASIONAL", label: "Occasional", desc: "Guests sometimes" },
            { value: "FREQUENT", label: "Frequent", desc: "Often has visitors" },
        ],
    },
    {
        key: "noiseTolerance",
        label: "Noise tolerance",
        icon: VolumeX,
        options: [
            { value: "QUIET", label: "Quiet", desc: "Silence preferred" },
            { value: "MODERATE", label: "Moderate", desc: "Some noise OK" },
            { value: "LIVELY", label: "Lively", desc: "Fine with noise" },
        ],
    },
    {
        key: "studyHabits",
        label: "Study habits",
        icon: BookOpen,
        options: [
            { value: "HOME_STUDIER", label: "Home studier", desc: "Studies at home" },
            { value: "LIBRARY", label: "Library goer", desc: "Studies outside" },
            { value: "MIXED", label: "Mixed", desc: "Both" },
        ],
    },
    {
        key: "smokingPolicy",
        label: "Smoking",
        icon: Cigarette,
        options: [
            { value: "NON_SMOKER", label: "Non-smoker", desc: "Doesn't smoke" },
            { value: "OUTSIDE_ONLY", label: "Outside only", desc: "Smokes outside" },
            { value: "SMOKER", label: "Smoker", desc: "Smokes indoors" },
        ],
    },
    {
        key: "petsPolicy",
        label: "Pets",
        icon: PawPrint,
        options: [
            { value: "NO_PETS", label: "No pets", desc: "Prefers no animals" },
            { value: "OKAY_WITH_PETS", label: "OK with pets", desc: "Fine with others' pets" },
            { value: "HAS_PETS", label: "Has pets", desc: "Brings a pet" },
        ],
    },
];

export default function RoommatePreferencesModal({ open, onClose, housingGroupId, initialPreferences = {}, onSaved }) {
    const [form, setForm] = useState({
        sleepSchedule: initialPreferences.sleepSchedule || "",
        workSchedule: initialPreferences.workSchedule || "",
        cleanlinessLevel: initialPreferences.cleanlinessLevel || "",
        guestPolicy: initialPreferences.guestPolicy || "",
        noiseTolerance: initialPreferences.noiseTolerance || "",
        studyHabits: initialPreferences.studyHabits || "",
        smokingPolicy: initialPreferences.smokingPolicy || "",
        petsPolicy: initialPreferences.petsPolicy || "",
        bio: initialPreferences.bio || "",
    });
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateRoommatePreferencesApi(housingGroupId, form);
            toast.success("Roommate preferences saved!");
            onSaved?.(form);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Roommate Preferences</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Help your housemates and prospective tenants know what you're like to live with.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={16} strokeWidth={2.2} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
                    {FIELDS.map(({ key, label, icon: Icon, options }) => (
                        <div key={key}>
                            <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Icon size={14} strokeWidth={2.2} className="text-indigo-500" />
                                {label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {options.map((opt) => {
                                    const selected = form[key] === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setForm((prev) => ({ ...prev, [key]: selected ? "" : opt.value }))}
                                            className={`flex flex-col items-start rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 ${selected
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-300"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <span className="text-xs font-bold">{opt.label}</span>
                                            <span className="mt-0.5 text-[11px] opacity-70">{opt.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Bio */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Short bio <span className="font-normal text-slate-400">(optional, max 300 chars)</span>
                        </label>
                        <textarea
                            rows={3}
                            maxLength={300}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="e.g. Final year CS student, tidy, quiet on weeknights, loves cooking on weekends."
                            value={form.bio}
                            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        />
                        <div className="mt-1 text-right text-[11px] text-slate-400">{form.bio.length}/300</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save preferences"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
