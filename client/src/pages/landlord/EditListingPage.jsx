import {
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    Pencil,
    Shield,
    TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getListingByIdApi, updateListingApi } from "../../api/client";
import ListingForm from "../../components/accommodation/ListingForm";
import LoadingState from "../../components/common/LoadingState";

export default function EditListingPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const { data } = await getListingByIdApi(id);
                setListing(data.listing);
            } catch (error) {
                setLoadError(
                    error?.response?.data?.message || "Failed to load listing."
                );
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleSubmit = async (payload) => {
        try {
            setSubmitting(true);
            await updateListingApi(id, payload);
            toast.success("Listing updated successfully!");
            navigate("/landlord/listings");
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to update listing"
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <LoadingState
                title="Loading listing"
                description="Fetching your property details so you can make changes."
            />
        );
    }
// Show error if listing failed to load
    if (loadError) {
        return (
            <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                    <AlertCircle size={22} strokeWidth={1.8} />
                </div>
                <div>
                    <p className="text-base font-bold text-slate-900">
                        Could not load listing
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{loadError}</p>
                </div>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={() => navigate("/landlord/listings")}
                >
                    Back to listings
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Hero ── */}
            <section className="card overflow-hidden">
                <div className="relative px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-800" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.1),transparent_40%)]" />

                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur-sm">
                                <Pencil size={11} strokeWidth={2.3} />
                                Edit Listing
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/25 bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold text-indigo-300 backdrop-blur-sm">
                                <Shield size={11} strokeWidth={2.3} />
                                Your property
                            </span>
                        </div>

                        <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl line-clamp-1">
                            {listing?.title || "Edit listing"}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                            Update your property details. Changes are saved immediately and
                            reflected to students browsing your listing.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Main layout ── */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Form */}
                <ListingForm
                    initialValues={listing}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    submitLabel="Save changes"
                />

                {/* ── Sidebar ── */}
                <div className="space-y-5">
                    {/* What you can edit */}
                    <div className="card p-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                <CheckCircle2 size={16} strokeWidth={2.2} />
                            </div>
                            <h4 className="text-[14px] font-bold text-slate-900">
                                What you can edit
                            </h4>
                        </div>
                        <div className="mt-3 space-y-2">
                            {[
                                "Title and description",
                                "Location and address",
                                "Rent and key money",
                                "Room type and capacity",
                                "Facilities and photos",
                                "Availability date",
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2"
                                >
                                    <CheckCircle2
                                        size={13}
                                        strokeWidth={2.2}
                                        className="shrink-0 text-emerald-500"
                                    />
                                    <span className="text-[13px] text-slate-600">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Improvement tips */}
                    <div className="card p-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                                <TrendingUp size={16} strokeWidth={2.2} />
                            </div>
                            <h4 className="text-[14px] font-bold text-slate-900">
                                Boost your listing
                            </h4>
                        </div>
                        <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600">
                            <div className="rounded-2xl bg-slate-50 px-3.5 py-2">
                                Keep the description up to date with current conditions.
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3.5 py-2">
                                Add fresh photos to attract more students.
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3.5 py-2">
                                Update the availability date if the move-in window changes.
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="card p-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                                <Lightbulb size={16} strokeWidth={2.2} />
                            </div>
                            <h4 className="text-[14px] font-bold text-slate-900">
                                Good to know
                            </h4>
                        </div>
                        <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600">
                            <div className="rounded-2xl bg-sky-50/60 px-3.5 py-2">
                                <span className="font-semibold text-sky-700">
                                    Active bookings
                                </span>{" "}
                                — existing confirmed bookings are not affected by edits.
                            </div>
                            <div className="rounded-2xl bg-sky-50/60 px-3.5 py-2">
                                <span className="font-semibold text-sky-700">Status</span> —
                                use the Deactivate button on the listings page to pause new
                                bookings.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
