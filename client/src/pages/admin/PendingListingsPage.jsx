import {
    Bell,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleX,
    Clock3,
    House,
    Mail,
    MapPin,
    ReceiptText,
    ShieldCheck,
    Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getPendingListingsApi,
    approveListingApi,
    rejectListingApi,
} from "../../api/client";
import adminIllustration from "../../assets/illustrations/admin-verification.png";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import StatusBadge from "../../components/StatusBadge";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import listingPlaceholder from "../../assets/placeholders/listing-placeholder.png";

function formatCurrency(amount) {
    return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function getModerationMeta(listing) {
    if (listing.ownerId?.landlordVerificationStatus !== "VERIFIED") {
        return {
            title: "Owner verification required first",
            description: "This listing cannot be approved until the landlord account is verified.",
            tone: "amber",
        };
    }

    if (!listing.photos?.length) {
        return {
            title: "Review carefully for missing media",
            description: "The listing has no photos. Approval is still possible, but the presentation quality is lower for students.",
            tone: "slate",
        };
    }

    return {
        title: "Ready for moderation",
        description: "The landlord is verified and the core listing details look complete enough for admin review.",
        tone: "emerald",
    };
}

export default function PendingListingsPage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approveTarget, setApproveTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);

    const loadListings = async () => {
        try {
            setLoading(true);
            const { data } = await getPendingListingsApi();
            setListings(data.listings || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load listings");
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, []);

    const handleApprove = async () => {
        try {
            await approveListingApi(approveTarget._id);
            toast.success("Listing approved successfully");
            setApproveTarget(null);
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to approve listing");
        }
    };

    const handleReject = async (reason) => {
        try {
            await rejectListingApi(rejectTarget._id, { rejectionReason: reason });
            toast.success("Listing rejected");
            setRejectTarget(null);
            await loadListings();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reject listing");
        }
    };

    const stats = useMemo(() => {
        return {
            total: listings.length,
            missingPhotos: listings.filter((listing) => !listing.photos?.length).length,
            unverifiedOwners: listings.filter(
                (listing) => listing.ownerId?.landlordVerificationStatus !== "VERIFIED"
            ).length,
            totalBeds: listings.reduce((sum, listing) => sum + (listing.maxOccupants || 0), 0),
        };
    }, [listings]);

    return (
        <>
            <div className="space-y-6">
                <PageHero
                    eyebrow="Admin Console"
                    title="Pending Listings"
                    description="Review submitted properties and approve only safe, complete, and trustworthy accommodation listings."
                    backgroundImage={dashboardBanner}
                    sideImage={adminIllustration}
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Pending listings" value={stats.total} tone="amber" icon={Building2} />
                    <StatCard
                        title="Moderation status"
                        value={stats.total > 0 ? "Needs review" : "Clear"}
                        tone={stats.total > 0 ? "rose" : "emerald"}
                        icon={stats.total > 0 ? CircleX : CheckCircle2}
                    />
                    <StatCard title="Missing photos" value={stats.missingPhotos} tone="blue" icon={ReceiptText} />
                    <StatCard title="Owner blocked" value={stats.unverifiedOwners} tone="indigo" icon={ShieldCheck} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <QuickActionCard
                        to="/admin/landlords"
                        icon={ShieldCheck}
                        title="Landlord verification"
                        description="Resolve owner verification blockers before approving related listing submissions."
                        tone="indigo"
                        eyebrow="Verification"
                    />
                    <QuickActionCard
                        to="/admin/vendors"
                        icon={Users}
                        title="Vendor moderation"
                        description="Move between accommodation and vendor reviews while keeping admin throughput consistent."
                        tone="emerald"
                        eyebrow="Marketplace"
                    />
                    <QuickActionCard
                        to="/admin/notifications"
                        icon={Bell}
                        title="Admin notifications"
                        description="Track approval outcomes, rejected submissions, and moderation events in one place."
                        tone="amber"
                        eyebrow="Updates"
                    />
                </div>

                {loading ? (
                    <LoadingState
                        title="Loading pending listings"
                        description="Collecting submitted properties and moderation blockers for admin review."
                    />
                ) : listings.length === 0 ? (
                    <EmptyState
                        image={adminIllustration}
                        imageAlt="Admin moderation illustration"
                        title="No pending listings"
                        description="All accommodation listings have already been reviewed."
                        tone="emerald"
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-2">
                        {listings.map((listing) => {
                            const moderation = getModerationMeta(listing);
                            const canApprove = listing.ownerId?.landlordVerificationStatus === "VERIFIED";

                            return (
                                <div key={listing._id} className="card overflow-hidden">
                                    <div className="h-56 bg-slate-100">
                                        <img
                                            src={listing.photos?.[0] || listingPlaceholder}
                                            alt={listing.title}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = listingPlaceholder;
                                            }}
                                        />
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h4 className="text-xl font-bold text-slate-900">{listing.title}</h4>
                                                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                                    <MapPin size={15} strokeWidth={2.1} />
                                                    <span>
                                                        {listing.location?.city} / {listing.location?.area}
                                                    </span>
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {listing.location?.addressLine || "Address not provided"}
                                                </p>
                                            </div>

                                            <StatusBadge value={listing.status} />
                                        </div>

                                        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${moderation.tone === "emerald"
                                            ? "bg-emerald-50 text-emerald-800"
                                            : moderation.tone === "amber"
                                                ? "bg-amber-50 text-amber-800"
                                                : "bg-slate-50 text-slate-600"
                                            }`}>
                                            <div className="font-semibold">{moderation.title}</div>
                                            <div className="mt-1">{moderation.description}</div>
                                        </div>

                                        <p className="mt-4 text-sm leading-6 text-slate-600">
                                            {listing.description}
                                        </p>

                                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rent</div>
                                                <div className="mt-2 font-bold text-slate-900">
                                                    {formatCurrency(listing.rent)}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Key Money</div>
                                                <div className="mt-2 font-bold text-slate-900">
                                                    {listing.keyMoney > 0 ? formatCurrency(listing.keyMoney) : "None"}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Room type</div>
                                                <div className="mt-2 font-bold text-slate-900">{listing.roomType}</div>
                                            </div>

                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Capacity</div>
                                                <div className="mt-2 font-bold text-slate-900">
                                                    {listing.currentOccupancy || 0}/{listing.maxOccupants || 0}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    <House size={14} strokeWidth={2.1} />
                                                    Owner
                                                </div>
                                                <div className="mt-2 text-sm font-bold text-slate-900">
                                                    {listing.ownerId?.fullName || "Unknown landlord"}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                                    <Mail size={14} strokeWidth={2.1} />
                                                    <span>{listing.ownerId?.email || "No email"}</span>
                                                </div>
                                                <div className="mt-3">
                                                    <StatusBadge value={listing.ownerId?.landlordVerificationStatus || "PENDING"} />
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    <CalendarDays size={14} strokeWidth={2.1} />
                                                    Available From
                                                </div>
                                                <div className="mt-2 text-sm font-bold text-slate-900">
                                                    {formatDate(listing.availableFrom)}
                                                </div>
                                                <div className="mt-2 text-sm text-slate-500">
                                                    Bills: <span className="font-semibold text-slate-900">{listing.billsIncluded ? "Included" : "Separate"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {listing.facilities?.slice(0, 4).map((facility) => (
                                                <span
                                                    key={facility}
                                                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                                                >
                                                    {facility}
                                                </span>
                                            ))}
                                        </div>

                                        {!canApprove ? (
                                            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                                Verify this landlord first in the landlord moderation queue before approving the listing.
                                            </div>
                                        ) : null}

                                        <div className="mt-6 flex gap-3">
                                            <button
                                                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={() => setApproveTarget(listing)}
                                                disabled={!canApprove}
                                            >
                                                Approve
                                            </button>

                                            <button
                                                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                                onClick={() => setRejectTarget(listing)}
                                            >
                                                Reject
                                            </button>
                                        </div>

                                        <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                            <span className="inline-flex items-center gap-2">
                                                <ReceiptText size={14} strokeWidth={2.1} />
                                                Listing ID {String(listing._id).slice(-6).toUpperCase()}
                                            </span>
                                            <span>{listing.photos?.length || 0} photos linked</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!approveTarget}
                title="Approve listing?"
                description={
                    approveTarget
                        ? `Approve "${approveTarget.title}" and make it visible to students?`
                        : ""
                }
                confirmLabel="Approve listing"
                onConfirm={handleApprove}
                onClose={() => setApproveTarget(null)}
            />

            <ConfirmModal
                open={!!rejectTarget}
                title="Reject listing?"
                description="Please enter a clear rejection reason for this landlord."
                confirmLabel="Reject listing"
                confirmTone="danger"
                requireReason
                reasonLabel="Rejection reason"
                reasonPlaceholder="Explain why this listing is not approved..."
                onConfirm={handleReject}
                onClose={() => setRejectTarget(null)}
            />
        </>
    );
}
