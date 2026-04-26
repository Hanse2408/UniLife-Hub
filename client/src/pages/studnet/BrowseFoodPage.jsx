import {
    CalendarDays,
    ClipboardList,
    Search,
    Building,
    CalendarCheck,
    Wallet,
    MapPin
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// Oyage API client eke tiyena facilities endpoints walata me names wenas karaganna
import {
    addStudentFacilityCartItemApi,
    getAvailableFacilitiesApi,
} from "../../api/client";

import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop";

function formatCurrency(amount) {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatTimeRange(start, end) {
    if (start && end) {
        return `${start} - ${end}`;
    }
    return start || end || "Schedule not listed";
}

function splitTags(value) {
    return String(value || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export default function BrowseFacilitiesPage() {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [actingFacilityId, setActingFacilityId] = useState("");

    useEffect(() => {
        const loadFacilities = async () => {
            try {
                setLoading(true);
                const { data } = await getAvailableFacilitiesApi();
                setFacilities(data.facilities || []);
            } catch (error) {
                toast.error(error?.response?.data?.message || "Failed to load facilities");
            } finally {
                setLoading(false);
            }
        };

        loadFacilities();
    }, []);

    const categories = useMemo(() => {
        const values = facilities.map((facility) => facility.category).filter(Boolean);
        return [...new Set(values)].sort((left, right) => left.localeCompare(right));
    }, [facilities]);

    const visibleFacilities = useMemo(() => {
        const normalizedQuery = searchTerm.trim().toLowerCase();

        return facilities.filter((facility) => {
            const searchValue = [facility.facilityName, facility.description, facility.category, facility.location]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesCategory = !category || facility.category === category;
            const matchesSearch = !normalizedQuery || searchValue.includes(normalizedQuery);

            return matchesCategory && matchesSearch;
        });
    }, [category, facilities, searchTerm]);

    const lowestHourlyRate = useMemo(() => {
        if (!facilities.length) {
            return 0;
        }
        return Math.min(...facilities.map((facility) => Number(facility.hourlyRate || 0)));
    }, [facilities]);

    const handleAddToBookingList = async (facilityId) => {
        try {
            setActingFacilityId(facilityId);
            const facility = facilities.find((f) => f._id === facilityId);
            
            // Show a quick warning if there are strict restrictions
            if (facility && facility.restriction_tags) {
                const restrictions = splitTags(facility.restriction_tags);
                if (restrictions.length > 0) {
                    toast(
                        `📌 Note: "${facility.facilityName}" has specific rules: ${restrictions.join(", ")}.`,
                        { duration: 5000, style: { background: "#eff6ff", color: "#1e40af", fontWeight: 600 } }
                    );
                }
            }

            // Default booking added as 1 hour, can be adjusted in the cart
            await addStudentFacilityCartItemApi({ facilityId, durationHours: 1 });
            toast.success("Added to your booking list");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to add space to booking list");
        } finally {
            setActingFacilityId("");
        }
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Facilities"
                title="Browse campus spaces with better context before you book"
                description="Search auditoriums, labs, and study rooms, filter by category, and see available equipment and hourly rates — all on one screen."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Available Spaces"
                    value={facilities.length}
                    subtitle="Active facilities currently open for reservations."
                    tone="amber"
                    icon={Building}
                />
                <StatCard
                    title="Facility Types"
                    value={categories.length}
                    subtitle="Distinct space categories available for browsing right now."
                    tone="blue"
                    icon="🏷️"
                />
                <StatCard
                    title="Matching Spaces"
                    value={visibleFacilities.length}
                    subtitle="Facilities matching your current search and filters."
                    tone="indigo"
                    icon={Search}
                />
                <StatCard
                    title="Lowest Rate"
                    value={facilities.length ? `${formatCurrency(lowestHourlyRate)}/hr` : "N/A"}
                    subtitle="The most budget-friendly space currently available."
                    tone="emerald"
                    icon={Wallet}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <QuickActionCard
                    to="/student/facilities/cart"
                    icon={CalendarCheck}
                    title="Review booking list"
                    description="Jump into the reservation queue and adjust hours for your selected spaces."
                    tone="indigo"
                    eyebrow="Reservations"
                    ctaLabel="Open"
                />
                <QuickActionCard
                    to="/student/facilities/bookings"
                    icon={ClipboardList}
                    title="Track current bookings"
                    description="See which reservations are pending, approved, or already completed."
                    tone="emerald"
                    eyebrow="Tracking"
                    ctaLabel="Review"
                />
                <QuickActionCard
                    to="/student/facilities/calendar"
                    icon={CalendarDays}
                    title="Campus Event Calendar"
                    description="Check upcoming events and avoid scheduling conflicts with major programs."
                    tone="blue"
                    eyebrow="Planning"
                    ctaLabel="View Calendar"
                />
            </div>

            <div className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Search Filters
                        </div>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                            Narrow down the spaces before you reserve
                        </h3>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {visibleFacilities.length} results
                    </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                    <label className="relative block">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            className="input pl-11"
                            placeholder="Search spaces by name, category, location, or description"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </label>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                            type="button"
                            className={category === "" ? "btn-primary" : "btn-secondary"}
                            onClick={() => setCategory("")}
                        >
                            All Categories
                        </button>

                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                className={category === cat ? "btn-primary" : "btn-secondary"}
                                onClick={() => setCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingState
                    title="Loading campus facilities"
                    description="Fetching the latest availability, hourly rates, and space details."
                />
            ) : facilities.length === 0 ? (
                <EmptyState
                    icon="🏢"
                    title="No facilities are available right now"
                    description="There are currently no active spaces published for booking. Check back later."
                    tone="amber"
                    action={
                        <Link to="/student/facilities" className="btn-primary">
                            Return to Dashboard
                        </Link>
                    }
                />
            ) : visibleFacilities.length === 0 ? (
                <EmptyState
                    compact
                    icon="🔎"
                    title="No spaces match your filters"
                    description="Clear the search or switch categories to see the full list of campus facilities."
                    tone="slate"
                    action={
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setSearchTerm("");
                                setCategory("");
                            }}
                        >
                            Clear filters
                        </button>
                    }
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {visibleFacilities.map((facility) => {
                        const equipmentTags = splitTags(facility.equipment_tags).slice(0, 3);
                        const restrictionTags = splitTags(facility.restriction_tags).slice(0, 2);

                        return (
                            <article key={facility._id} className="card overflow-hidden flex flex-col">
                                <div className="h-56 overflow-hidden bg-slate-100 relative">
                                    <img
                                        src={facility.imageUrl || FALLBACK_IMAGE}
                                        alt={facility.facilityName}
                                        className="h-full w-full object-cover"
                                        onError={(event) => {
                                            event.currentTarget.src = FALLBACK_IMAGE;
                                        }}
                                    />
                                    <div className="absolute top-3 right-3">
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm">
                                            Available
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col flex-grow">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                                                    {facility.category || "General Space"}
                                                </span>
                                                {facility.capacity ? (
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                                        Max {facility.capacity} pax
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h3 className="mt-3 text-xl font-bold text-slate-900">
                                                {facility.facilityName}
                                            </h3>
                                            {facility.location && (
                                                <div className="flex items-center text-xs text-slate-500 mt-1 gap-1 font-medium">
                                                    <MapPin size={12} /> {facility.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="mt-4 text-sm leading-6 text-slate-600 line-clamp-3">
                                        {facility.description || "No description available for this facility yet."}
                                    </p>

                                    <div className="mt-auto pt-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Operating Hours
                                                </div>
                                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                                    {formatTimeRange(
                                                        facility.available_time_start,
                                                        facility.available_time_end
                                                    )}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Hourly Rate
                                                </div>
                                                <div className="mt-1 text-lg font-black text-slate-900">
                                                    {formatCurrency(facility.hourlyRate)}
                                                </div>
                                            </div>
                                        </div>

                                        {equipmentTags.length > 0 ? (
                                            <div className="mt-4">
                                                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                                    Available Equipment
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {equipmentTags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}

                                        {restrictionTags.length > 0 ? (
                                            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
                                                <span className="font-bold">Rules:</span>{" "}
                                                {restrictionTags.join(", ")}
                                            </div>
                                        ) : null}

                                        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Next step
                                                </div>
                                                <div className="mt-1 text-xs font-semibold text-slate-900">
                                                    Add to booking list
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                                                disabled={actingFacilityId === facility._id}
                                                onClick={() => handleAddToBookingList(facility._id)}
                                            >
                                                {actingFacilityId === facility._id ? "Adding..." : "Reserve Space"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}