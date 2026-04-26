import {
    CalendarDays,
    Clock,
    ClipboardList,
    Search,
    Building,
    Bookmark,
    Users,
    MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

// Meka oyaage API calls walata wenas karaganna
import {
    getStudentFacilityStatsApi,
    getStudentBookingsApi,
    getStudentSavedFacilitiesApi,
    getAvailableFacilitiesApi,
    requestFacilityBookingApi,
} from "../../api/client";

import EmptyState from "../../components/common/EmptyState";
import PageHero from "../../components/common/PageHero";
import QuickActionCard from "../../components/common/QuickActionCard";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop";

function countActiveBookings(bookings) {
    return bookings.filter(
        (booking) => !["completed", "cancelled", "rejected"].includes(String(booking.status || "").toLowerCase())
    ).length;
}

export default function FacilitiesHubPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ activeBookings: 0, savedFacilities: 0, pendingRequests: 0, totalFacilities: 0 });
    const [facilities, setFacilities] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [minCapacity, setMinCapacity] = useState("");
    const [loading, setLoading] = useState(true);
    const [facilitiesLoading, setFacilitiesLoading] = useState(true);
    const [actingFacilityId, setActingFacilityId] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [bookingsRes, savedRes, statsRes] = await Promise.allSettled([
                    getStudentBookingsApi(),
                    getStudentSavedFacilitiesApi(),
                    getStudentFacilityStatsApi(),
                ]);
                
                const bookings = bookingsRes.status === "fulfilled" ? bookingsRes.value.data.bookings || [] : [];
                const saved = savedRes.status === "fulfilled" ? savedRes.value.data.saved || [] : [];
                const stats = statsRes.status === "fulfilled" ? statsRes.value.data || null : null;

                setSummary({
                    activeBookings: countActiveBookings(bookings),
                    pendingRequests: bookings.filter(b => b.status === "PENDING").length,
                    savedFacilities: saved.length,
                    totalFacilities: stats?.totalAvailable || 0,
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setFacilitiesLoading(true);
                const { data } = await getAvailableFacilitiesApi();
                setFacilities(data.facilities || []);
            } catch {
                setFacilities([]);
            } finally {
                setFacilitiesLoading(false);
            }
        })();
    }, []);

    const categories = useMemo(
        () => [...new Set(facilities.map((f) => f.category).filter(Boolean))].sort(),
        [facilities],
    );

    const filteredFacilities = facilities.filter((facility) => {
        if (selectedCategory && facility.category !== selectedCategory) return false;
        if (minCapacity !== "" && Number(facility.capacity) < Number(minCapacity)) return false;
        if (!searchTerm.trim()) return true;
        
        const q = searchTerm.toLowerCase();
        return [facility.facilityName, facility.description, facility.category, facility.location]
            .filter(Boolean).join(" ").toLowerCase().includes(q);
    });

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCategory("");
        setMinCapacity("");
    };

    const hasActiveFilters = searchTerm || selectedCategory || minCapacity;

    const handleBookingRequest = async (facilityId) => {
        try {
            setActingFacilityId(facilityId);
            await requestFacilityBookingApi({ facilityId });
            toast.success("Booking request submitted successfully!");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit booking request");
        } finally {
            setActingFacilityId("");
        }
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Portal"
                title="Facilities Hub"
                description="Browse campus facilities, check availability, and manage your bookings for events and study sessions."
                backgroundImage={dashboardBanner}
            />

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={ClipboardList}
                    title="My Bookings"
                    description="View and manage your facility reservations."
                    to="/student/facilities/bookings"
                    tone="emerald"
                />
                <QuickActionCard
                    icon={Building}
                    title="Browse Facilities"
                    description="Find auditoriums, labs, and study rooms."
                    to="/student/facilities/browse"
                    tone="indigo"
                />
                <QuickActionCard
                    icon={CalendarDays}
                    title="Event Calendar"
                    description="Check schedules and upcoming campus events."
                    to="/student/facilities/calendar"
                    tone="blue"
                />
                <QuickActionCard
                    icon={Bookmark}
                    title="Saved Locations"
                    description="Quick access to your frequently used spaces."
                    to="/student/facilities/saved"
                    tone="rose"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Building} title="Available Facilities" value={loading ? "—" : summary.totalFacilities} tone="indigo" />
                <StatCard icon={CalendarDays} title="Active Bookings" value={loading ? "—" : summary.activeBookings} tone="emerald" />
                <StatCard icon={Clock} title="Pending Requests" value={loading ? "—" : summary.pendingRequests} tone="amber" />
                <StatCard icon={Bookmark} title="Saved Locations" value={loading ? "—" : summary.savedFacilities} tone="rose" />
            </div>

            {/* Available Facilities */}
            <div className="card p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Explore Campus Facilities</h3>
                    <p className="text-sm text-slate-500">Find the perfect space for your next study session or event.</p>
                </div>

                {/* ── Filters ── */}
                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Search Filters</p>
                        <span className="rounded-full bg-indigo-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                            {filteredFacilities.length} {filteredFacilities.length === 1 ? "result" : "results"}
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {/* Facility Name/Search */}
                        <label className="block xl:col-span-2">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Search size={16} className="text-slate-400" /> Search
                            </div>
                            <input
                                className="input"
                                placeholder="Search by name, location, or equipment..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </label>

                        {/* Category */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Building size={16} className="text-slate-400" /> Category
                            </div>
                            <select
                                className="select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>

                        {/* Capacity */}
                        <label className="block">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Users size={16} className="text-slate-400" /> Min. Capacity
                            </div>
                            <input
                                type="number"
                                className="input"
                                placeholder="e.g. 50"
                                min="1"
                                value={minCapacity}
                                onChange={(e) => setMinCapacity(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* Reset Button */}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn-secondary text-sm"
                            onClick={handleResetFilters}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* ── Facility Cards ── */}
                {facilitiesLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    </div>
                ) : filteredFacilities.length === 0 ? (
                    <EmptyState
                        icon="🏢"
                        title="No facilities found"
                        description={hasActiveFilters ? "Try adjusting your search filters." : "No facilities are currently available. Check back later."}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredFacilities.slice(0, 6).map((facility) => {
                            const equipmentTags = (facility.equipment || "").split(",").map((t) => t.trim()).filter(Boolean);
                            const isAvailable = facility.status === "AVAILABLE";

                            return (
                                <div
                                    key={facility._id}
                                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-indigo-300 hover:shadow-md transition flex flex-col"
                                >
                                    <div className="h-40 overflow-hidden bg-slate-100 relative">
                                        <img
                                            src={facility.imageUrl || FALLBACK_IMAGE}
                                            alt={facility.facilityName}
                                            className="h-full w-full object-cover"
                                            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                        />
                                        <div className="absolute top-3 right-3">
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {isAvailable ? 'Available' : 'Occupied'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 flex flex-col flex-grow space-y-3">
                                        {/* Category Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                                                {facility.category || "General"}
                                            </span>
                                        </div>

                                        {/* Name & description */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">{facility.facilityName}</h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-1 gap-1">
                                                <MapPin size={12} /> {facility.location || "Main Campus"}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-600 line-clamp-2">{facility.description || "No description provided."}</p>
                                        </div>

                                        {/* Capacity Highlight */}
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs mt-auto">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="font-semibold text-slate-700">Capacity:</span>
                                            <span className="font-black text-slate-900">{facility.capacity || "N/A"} people</span>
                                        </div>

                                        {/* Equipment tags */}
                                        {equipmentTags.length > 0 && (
                                            <div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {equipmentTags.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {equipmentTags.length > 3 && (
                                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200">
                                                            +{equipmentTags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Booking Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                                            <Link 
                                                to={`/student/facilities/${facility._id}`}
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                            >
                                                View Details
                                            </Link>
                                            <button
                                                type="button"
                                                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                                disabled={!isAvailable || actingFacilityId === facility._id}
                                                onClick={() => handleBookingRequest(facility._id)}
                                            >
                                                {actingFacilityId === facility._id ? "Processing..." : "Book Space"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredFacilities.length > 6 && (
                    <div className="mt-6 text-center">
                        <Link
                            to="/student/facilities/browse"
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            View all {filteredFacilities.length} facilities →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}