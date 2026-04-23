import {
    Bus,
    CalendarDays,
    Clock3,
    MapPin,
    Search,
    Users,
    Wallet,
    Star,
    StarOff,
    ArrowRight,
    Filter,
    Snowflake,
    Wifi,
    Sofa,
    BatteryCharging,
    Navigation,
    Luggage,
    CheckCircle2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import EmptyState from "../../components/common/EmptyState";
import TransportRouteMap from "../../components/transport/TransportRouteMap";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    searchTransportTripsApi,
    browseTransportListingsApi,
    bookTransportTripApi,
    getFavoriteLocationsApi,
    addFavoriteLocationApi,
    removeFavoriteLocationApi,
} from "../../api/client";
import { fetchRoute } from "../../utils/routingService";

const FACILITY_ICONS = {
    AC: Snowflake, WIFI: Wifi, CUSHIONED_SEATS: Sofa,
    USB_CHARGING: BatteryCharging, GPS_TRACKING: Navigation, LUGGAGE_SPACE: Luggage,
};
const FACILITY_LABELS = {
    AC: "AC", WIFI: "WiFi", CUSHIONED_SEATS: "Cushioned", USB_CHARGING: "USB", GPS_TRACKING: "GPS", LUGGAGE_SPACE: "Luggage",
};
const FREQ_LABEL = { DAILY: "Daily", WEEKDAYS_ONLY: "Weekdays", WEEKENDS_ONLY: "Weekends", SPECIFIC_DATES: "Specific Dates" };

function LocationInput({ label, value, onChange, favorites, onSaveFavorite }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounced auto-search as user types
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearching(true);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Sri Lanka")}&limit=5&countrycodes=lk`
                );
                const data = await res.json();
                setResults(data);
                setShowSuggestions(true);
            } catch {
                // silent
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item) => {
        onChange({
            name: item.display_name ? item.display_name.split(",")[0] : item.name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon || item.lng),
        });
        setResults([]);
        setShowSuggestions(false);
        setQuery("");
    };

    const favSuggestions = favorites.filter((f) =>
        !query || f.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="space-y-1.5 relative">
            <label className="text-sm font-semibold text-slate-700">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={`Search ${label.toLowerCase()}...`}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="input w-full pr-10"
                    />
                    {searching ? (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { if (query.trim()) setShowSuggestions(true); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                        >
                            <Search size={16} />
                        </button>
                    )}
                </div>
                {value?.name && onSaveFavorite && (
                    <button
                        type="button"
                        onClick={() => onSaveFavorite(value)}
                        className="rounded-xl bg-amber-50 px-3 py-2 text-amber-600 hover:bg-amber-100"
                        title="Save as favorite"
                    >
                        <Star size={16} />
                    </button>
                )}
            </div>

            {showSuggestions && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {/* Favorite suggestions */}
                    {favSuggestions.length > 0 && results.length === 0 && query && (
                        <>
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-amber-600 uppercase tracking-wider bg-amber-50">Favorites</div>
                            {favSuggestions.map((f) => (
                                <button
                                    key={f._id}
                                    type="button"
                                    onClick={() => handleSelect(f)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-amber-50 border-b border-slate-100 flex items-center gap-2"
                                >
                                    <Star size={12} className="text-amber-500 shrink-0" /> <span className="truncate">{f.name}</span>
                                </button>
                            ))}
                        </>
                    )}
                    {/* Nominatim results */}
                    {results.length > 0 && (
                        <>
                            {favSuggestions.length > 0 && query && (
                                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Locations</div>
                            )}
                            {results.map((item, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex items-center gap-2"
                                >
                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{item.display_name}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}

            {value?.name && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                    <MapPin size={14} />
                    <span className="font-semibold">{value.name}</span>
                </div>
            )}
        </div>
    );
}

export default function TransportSearchPage() {
    const navigate = useNavigate();
    const [pickup, setPickup] = useState({ name: "", lat: null, lng: null });
    const [dropoff, setDropoff] = useState({ name: "", lat: null, lng: null });
    const [journeyDate, setJourneyDate] = useState("");
    const [time, setTime] = useState("");
    const [passengers, setPassengers] = useState("1");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [selectedListing, setSelectedListing] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [bookingModal, setBookingModal] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [selectMode, setSelectMode] = useState(null); // "pickup" or "dropoff"

    // Load favorites
    useEffect(() => {
        getFavoriteLocationsApi()
            .then((res) => setFavorites(res.data.favorites || []))
            .catch(() => { });
    }, []);

    // Fetch real road route via OSRM when pickup/dropoff change
    useEffect(() => {
        // Skip if a listing is selected (listing route takes priority)
        if (selectedListing) return;

        if (!pickup?.lat || !dropoff?.lat) {
            setRouteData(null);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setRouteLoading(true);
                const rd = await fetchRoute([pickup, dropoff]);
                if (!cancelled) setRouteData(rd);
            } catch {
                if (!cancelled) setRouteData(null);
            } finally {
                if (!cancelled) setRouteLoading(false);
            }
        }, 400);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, selectedListing]);

    const handleSearch = async () => {
        try {
            setLoading(true);
            setSearched(true);
            const params = {};
            if (pickup.name) params.pickup = pickup.name;
            if (dropoff.name) params.dropoff = dropoff.name;
            if (journeyDate) params.journeyDate = journeyDate;
            if (time) params.time = time;
            if (passengers) params.passengers = passengers;

            const { data } = await searchTransportTripsApi(params);
            setResults(data.listings || []);
        } catch {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleBrowseAll = async () => {
        try {
            setLoading(true);
            setSearched(true);
            const { data } = await browseTransportListingsApi();
            setResults(data.listings || []);
        } catch {
            toast.error("Failed to load routes");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFavorite = async (loc) => {
        try {
            const { data } = await addFavoriteLocationApi({ name: loc.name, lat: loc.lat, lng: loc.lng });
            setFavorites((prev) => [data.favorite, ...prev]);
            toast.success(`"${loc.name}" added to favorites`);
        } catch (err) {
            if (err?.response?.status === 409) toast.error("Already in favorites");
            else toast.error("Failed to save favorite");
        }
    };

    const handleSelectListing = async (listing) => {
        setSelectedListing(listing);
        // Build route for map display via OSRM
        if (listing.startLocation?.lat && listing.destination?.lat) {
            const waypoints = [listing.startLocation];
            (listing.stops || []).forEach((s) => { if (s.lat) waypoints.push(s); });
            waypoints.push(listing.destination);
            try {
                setRouteLoading(true);
                const rd = await fetchRoute(waypoints);
                setRouteData(rd);
            } catch {
                setRouteData(null);
            } finally {
                setRouteLoading(false);
            }
        } else {
            setRouteData(null);
        }
    };

    const handleMapClick = (latlng) => {
        const locationData = {
            name: `Point (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`,
            lat: latlng.lat,
            lng: latlng.lng,
        };
        if (selectMode === "pickup") {
            setPickup(locationData);
            setSelectMode(null);
        } else if (selectMode === "dropoff") {
            setDropoff(locationData);
            setSelectMode(null);
        }
    };

    const openBooking = (listing) => {
        setBookingModal({
            listing,
            pickupStop: pickup.name ? pickup : { name: listing.startLocation.name, lat: listing.startLocation.lat, lng: listing.startLocation.lng },
            dropoffStop: dropoff.name ? dropoff : { name: listing.destination.name, lat: listing.destination.lat, lng: listing.destination.lng },
        });
    };

    const handleConfirmBooking = async () => {
        if (!bookingModal) return;
        const { listing, pickupStop, dropoffStop } = bookingModal;
        if (!journeyDate) { toast.error("Please select a journey date"); return; }

        try {
            setBookingLoading(true);
            const { data } = await bookTransportTripApi({
                listingId: listing._id,
                journeyDate,
                passengers: parseInt(passengers) || 1,
                pickupStop: { name: pickupStop.name, lat: pickupStop.lat, lng: pickupStop.lng },
                dropoffStop: { name: dropoffStop.name, lat: dropoffStop.lat, lng: dropoffStop.lng },
            });
            toast.success("Booking created! Redirecting to payment...");
            setBookingModal(null);
            navigate(`/student/transport/bookings/${data.booking._id}/pay`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Booking failed");
        } finally {
            setBookingLoading(false);
        }
    };

    // Get all route locations for displaying map suggestions
    const allStopNames = [...new Set(
        results.flatMap((l) => [
            l.startLocation?.name,
            ...(l.stops || []).map((s) => s.name),
            l.destination?.name,
        ]).filter(Boolean)
    )];

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport"
                title="Search & Book Trips"
                description="Find available transport routes, compare options, and book your journey."
                backgroundImage={dashboardBanner}
            />

            {/* Search Section */}
            <div className="card p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Find Your Trip</h3>
                    <p className="text-sm text-slate-500">Enter your travel details to find matching routes.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <LocationInput
                        label="Pickup Location"
                        value={pickup}
                        onChange={setPickup}
                        favorites={favorites}
                        onSaveFavorite={handleSaveFavorite}
                    />
                    <LocationInput
                        label="Drop-off Location"
                        value={dropoff}
                        onChange={setDropoff}
                        favorites={favorites}
                        onSaveFavorite={handleSaveFavorite}
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Journey Date</label>
                        <input
                            type="date"
                            value={journeyDate}
                            onChange={(e) => setJourneyDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="input w-full"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Preferred Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="input w-full"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Passengers</label>
                        <input
                            type="number"
                            min="1"
                            value={passengers}
                            onChange={(e) => setPassengers(e.target.value)}
                            className="input w-full"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="flex-1 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? "Searching..." : "Search Trips"}
                        </button>
                        <button
                            onClick={handleBrowseAll}
                            disabled={loading}
                            className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-slate-300"
                            title="Browse all routes"
                        >
                            <Filter size={16} />
                        </button>
                    </div>
                </div>

                {/* Map for selecting locations */}
                <div className="mt-4">
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setSelectMode(selectMode === "pickup" ? null : "pickup")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectMode === "pickup" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                            <MapPin size={12} className="inline mr-1" /> Select Pickup on Map
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectMode(selectMode === "dropoff" ? null : "dropoff")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectMode === "dropoff" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                            <MapPin size={12} className="inline mr-1" /> Select Drop-off on Map
                        </button>
                    </div>
                    <TransportRouteMap
                        startLocation={selectedListing?.startLocation || (pickup.lat ? pickup : undefined)}
                        destination={selectedListing?.destination || (dropoff.lat ? dropoff : undefined)}
                        stops={selectedListing?.stops || []}
                        selectMode={selectMode === "pickup" ? "start" : selectMode === "dropoff" ? "destination" : selectMode}
                        onMapClick={handleMapClick}
                        routeGeometry={routeData?.geometry}
                        routeLoading={routeLoading}
                        className="h-[350px]"
                    />
                </div>

                {/* Quick Favorites */}
                {favorites.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <Star size={14} className="text-amber-500" /> Your Favorite Locations
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {favorites.map((fav) => (
                                <div key={fav._id} className="group relative">
                                    <div className="flex items-center rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                                        <button
                                            onClick={() => setPickup({ name: fav.name, lat: fav.lat, lng: fav.lng })}
                                            className="px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition border-r border-amber-200"
                                            title={`Set "${fav.name}" as pickup`}
                                        >
                                            <MapPin size={10} className="inline mr-0.5 text-emerald-600" /> Pickup
                                        </button>
                                        <span className="px-3 py-2 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Star size={10} className="text-amber-500" /> {fav.name}
                                        </span>
                                        <button
                                            onClick={() => setDropoff({ name: fav.name, lat: fav.lat, lng: fav.lng })}
                                            className="px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition border-l border-amber-200"
                                            title={`Set "${fav.name}" as drop-off`}
                                        >
                                            Drop-off <MapPin size={10} className="inline ml-0.5 text-rose-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {searched && (
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        {results.length > 0 ? `${results.length} Route${results.length > 1 ? "s" : ""} Found` : "No Results"}
                    </h3>

                    {results.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            title="No matching routes"
                            description="Try adjusting your search criteria or browse all available routes."
                        />
                    ) : (
                        <div className="space-y-4">
                            {results.map((listing) => (
                                <div
                                    key={listing._id}
                                    className={`rounded-2xl border-2 p-5 transition cursor-pointer ${selectedListing?._id === listing._id ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 hover:border-indigo-300"}`}
                                    onClick={() => handleSelectListing(listing)}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Route header */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${listing.vehicleType === "BUS" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                                                    <Bus size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{listing.vehicleType}</div>
                                                    <div className="text-xs text-slate-500">{FREQ_LABEL[listing.frequency] || "Daily"}</div>
                                                </div>
                                                {listing.managerId?.fullName && (
                                                    <span className="ml-2 text-xs text-slate-400">by {listing.managerId.fullName}</span>
                                                )}
                                            </div>

                                            {/* Route stops */}
                                            <div className="flex items-center gap-2 text-sm mb-2">
                                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                                                <span className="font-medium text-slate-700 truncate">{listing.startLocation?.name}</span>
                                                <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                                {listing.stops?.length > 0 && (
                                                    <span className="text-xs text-slate-400">{listing.stops.length} stops</span>
                                                )}
                                                {listing.stops?.length > 0 && <ArrowRight size={14} className="text-slate-400 shrink-0" />}
                                                <div className="h-2.5 w-2.5 rounded-full bg-rose-500"></div>
                                                <span className="font-medium text-slate-700 truncate">{listing.destination?.name}</span>
                                            </div>

                                            {/* Details row */}
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Clock3 size={12} /> {listing.departureTime || "—"}</span>
                                                <span className="flex items-center gap-1"><MapPin size={12} /> {listing.totalDistanceKm?.toFixed(1)} km</span>
                                                <span className="flex items-center gap-1"><Clock3 size={12} /> ~{listing.estimatedJourneyMin} min</span>
                                                <span className="flex items-center gap-1"><Users size={12} /> {listing.remainingSeats ?? listing.availableSeats} seats left</span>
                                            </div>

                                            {/* Facilities */}
                                            {listing.facilities?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {listing.facilities.map((f) => {
                                                        const Icon = FACILITY_ICONS[f];
                                                        return (
                                                            <span key={f} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                                                {Icon && <Icon size={10} />} {FACILITY_LABELS[f] || f}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price + Book */}
                                        <div className="text-right shrink-0">
                                            <div className="text-2xl font-black text-emerald-700">Rs. {listing.priceRs}</div>
                                            <div className="text-xs text-slate-500">per seat</div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openBooking(listing); }}
                                                className="mt-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
                                            >
                                                Book Now
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded stops */}
                                    {selectedListing?._id === listing._id && listing.stops?.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Route Stops</div>
                                            <div className="flex flex-wrap gap-2">
                                                {listing.stops.map((s, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs text-blue-700 ring-1 ring-blue-100">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                        {s.name} <span className="text-blue-500">({s.distanceFromStart?.toFixed(1)} km)</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Booking Confirmation Modal */}
            {bookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Confirm Booking</h3>

                        <div className="space-y-3 mb-6">
                            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Route</span>
                                    <span className="font-semibold text-slate-900">
                                        {bookingModal.listing.startLocation?.name} → {bookingModal.listing.destination?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Vehicle</span>
                                    <span className="font-semibold">{bookingModal.listing.vehicleType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Departure</span>
                                    <span className="font-semibold">{bookingModal.listing.departureTime || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Journey Date</span>
                                    <span className="font-semibold">
                                        {journeyDate ? new Date(journeyDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not selected"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Passengers</span>
                                    <span className="font-semibold">{passengers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Pickup</span>
                                    <span className="font-semibold">{bookingModal.pickupStop.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Drop-off</span>
                                    <span className="font-semibold">{bookingModal.dropoffStop.name}</span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-emerald-50 p-4 text-center">
                                <div className="text-xs font-semibold uppercase text-emerald-600">Total Amount</div>
                                <div className="text-3xl font-black text-emerald-700">
                                    Rs. {(bookingModal.listing.priceRs * (parseInt(passengers) || 1)).toLocaleString()}
                                </div>
                                <div className="text-xs text-emerald-600 mt-1">
                                    Rs. {bookingModal.listing.priceRs} × {passengers} passenger{parseInt(passengers) > 1 ? "s" : ""}
                                </div>
                            </div>

                            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                                <strong>Payment:</strong> The amount will be charged via the demo payment gateway. Your booking is confirmed upon successful payment.
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setBookingModal(null)}
                                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBooking}
                                disabled={bookingLoading || !journeyDate}
                                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {bookingLoading ? "Processing..." : "Pay & Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
