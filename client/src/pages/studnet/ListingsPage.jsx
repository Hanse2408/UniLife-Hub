import {
    ClipboardList,
    MessageSquare,
    Wallet,
    Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getListingsApi } from "../../api/client";
import ListingCard from "../../components/accommodation/ListingCard";
import ListingFilters from "../../components/accommodation/ListingFilters";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const initialFilters = {
    city: "",
    area: "",
    roomType: "",
    minRent: "",
    maxRent: "",
};

export default function ListingsPage() {
    const [filters, setFilters] = useState(initialFilters);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    const activeFilterCount = useMemo(
        () => Object.values(filters).filter((value) => String(value).trim() !== "").length,
        [filters]
    );

    const loadListings = async (customFilters = filters) => {
        try {
            setLoading(true);

            const params = {};
            Object.entries(customFilters).forEach(([key, value]) => {
                if (value !== "") params[key] = value;
            });

            const { data } = await getListingsApi(params);
            setListings(data.listings || []);
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        loadListings(filters);
    };

    const handleReset = () => {
        setFilters(initialFilters);
        loadListings(initialFilters);
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Accommodation"
                title="Explore Listings"
                description="Browse verified properties, compare rent and facilities, and connect with landlords before requesting your booking."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <QuickActionCard
                    to="/student/bookings"
                    icon={ClipboardList}
                    title="My bookings"
                    description="Track all your requests and confirmed stays."
                    tone="indigo"
                    eyebrow="Accommodation"
                />
                <QuickActionCard
                    to="/student/payments"
                    icon={Wallet}
                    title="Payments"
                    description="Review booking and rent payment activity."
                    tone="emerald"
                    eyebrow="Accommodation"
                />
                <QuickActionCard
                    to="/student/tickets"
                    icon={Wrench}
                    title="Maintenance"
                    description="Raise and track accommodation issues."
                    tone="amber"
                    eyebrow="Support"
                />
                <QuickActionCard
                    to="/student/chat"
                    icon={MessageSquare}
                    title="Messages"
                    description="Talk with landlords about rooms and visits."
                    tone="rose"
                    eyebrow="Communication"
                />
            </div>

            <ListingFilters
                filters={filters}
                onChange={handleFilterChange}
                onSubmit={handleSubmit}
                onReset={handleReset}
                loading={loading}
                activeFilters={activeFilterCount}
                resultCount={loading ? undefined : listings.length}
            />

            <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Search Results
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                        {loading
                            ? "Refreshing accommodation options"
                            : `${listings.length} listing${listings.length === 1 ? "" : "s"} ready to explore`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Compare pricing, facilities, and availability before opening the full listing details page.
                    </p>
                </div>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Current View
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                        {activeFilterCount > 0 ? "Filtered search" : "All available listings"}
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingState
                    title="Loading listings"
                    description="Pulling in property cards, prices, and availability details."
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon="🏠"
                    tone="indigo"
                    title="No listings found"
                    description="Try changing your filters to discover available accommodation."
                    action={
                        <button type="button" className="btn-secondary" onClick={handleReset}>
                            Reset filters
                        </button>
                    }
                />
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((listing) => (
                        <ListingCard key={listing._id} listing={listing} />
                    ))}
                </div>
            )}
        </div>
    );
}
