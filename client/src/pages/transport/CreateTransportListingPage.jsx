import {
    Bus,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Plus,
    Route,
    Trash2,
    Wallet,
    Armchair,
    Zap,
    Search,
    Snowflake,
    Wifi,
    Sofa,
    BatteryCharging,
    Navigation,
    Luggage,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    createTransportListingApi,
    getTransportListingByIdApi,
    updateTransportListingApi,
    calculateTransportPriceApi,
} from "../../api/client";
import PageHero from "../../components/common/PageHero";
import TransportRouteMap from "../../components/transport/TransportRouteMap";
import { fetchRoute } from "../../utils/routingService";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const FACILITIES = [
    { value: "AC", label: "Air Conditioning", icon: Snowflake },
    { value: "WIFI", label: "WiFi", icon: Wifi },
    { value: "CUSHIONED_SEATS", label: "Cushioned Seats", icon: Sofa },
    { value: "USB_CHARGING", label: "USB Charging", icon: BatteryCharging },
    { value: "GPS_TRACKING", label: "GPS Tracking", icon: Navigation },
    { value: "LUGGAGE_SPACE", label: "Luggage Space", icon: Luggage },
];

const emptyLocation = { name: "", lat: null, lng: null };
const emptyStop = { name: "", lat: null, lng: null };

function LocationSearchBox({ label, value, onChange, onSelectMode, selectMode, activeMode }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounced auto-search as user types
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearching(true);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Sri Lanka")}&limit=5&countrycodes=lk`
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
    }, [searchQuery]);

    const handleSelect = (item) => {
        onChange({
            name: item.display_name.split(",")[0],
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
        });
        setResults([]);
        setSearchQuery("");
        setShowSuggestions(false);
    };

    return (
        <div className="space-y-2 relative">
            <label className="text-sm font-semibold text-slate-700">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => results.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="input w-full pr-10"
                    />
                    {searching && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onSelectMode}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${selectMode === activeMode
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    title="Click on map to select"
                >
                    <MapPin size={16} />
                </button>
            </div>

            {showSuggestions && results.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
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
                </div>
            )}

            {value?.name && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                    <MapPin size={14} />
                    <span className="font-semibold">{value.name}</span>
                    <span className="text-xs text-emerald-600">
                        ({value.lat?.toFixed(4)}, {value.lng?.toFixed(4)})
                    </span>
                </div>
            )}
        </div>
    );
}

export default function CreateTransportListingPage() {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const isEdit = Boolean(editId);

    const [vehicleType, setVehicleType] = useState("BUS");
    const [startLocation, setStartLocation] = useState({ ...emptyLocation });
    const [destination, setDestination] = useState({ ...emptyLocation });
    const [stops, setStops] = useState([]);
    const [availableSeats, setAvailableSeats] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [facilities, setFacilities] = useState([]);
    const [frequency, setFrequency] = useState("DAILY");
    const [specificDates, setSpecificDates] = useState([]);
    const [newSpecificDate, setNewSpecificDate] = useState("");
    const [selectMode, setSelectMode] = useState(null); // "start" | "destination" | "stop-0" etc.
    const [addingStopIndex, setAddingStopIndex] = useState(null);

    const [pricing, setPricing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Road routing state
    const [routeData, setRouteData] = useState(null);     // { distanceKm, durationMin, geometry, waypointDistancesFromStart }
    const [routeLoading, setRouteLoading] = useState(false);

    // Load existing listing for edit
    useEffect(() => {
        if (!editId) return;
        const loadListing = async () => {
            try {
                setLoadingEdit(true);
                const { data } = await getTransportListingByIdApi(editId);
                const l = data.listing;
                setVehicleType(l.vehicleType);
                setStartLocation(l.startLocation || { ...emptyLocation });
                setDestination(l.destination || { ...emptyLocation });
                setStops(l.stops || []);
                setAvailableSeats(l.availableSeats?.toString() || "");
                setDepartureTime(l.departureTime || "");
                setFacilities(l.facilities || []);
                setFrequency(l.frequency || "DAILY");
                setSpecificDates(l.specificDates || []);
            } catch (error) {
                toast.error(error?.response?.data?.message || "Failed to load listing");
                navigate("/transport-manager/dashboard");
            } finally {
                setLoadingEdit(false);
            }
        };
        loadListing();
    }, [editId, navigate]);

    // ─── Fetch real road route via OSRM when waypoints change ───
    useEffect(() => {
        if (!startLocation?.lat || !destination?.lat) {
            setRouteData(null);
            return;
        }

        const waypoints = [startLocation];
        stops.forEach((s) => { if (s.lat) waypoints.push(s); });
        waypoints.push(destination);

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setRouteLoading(true);
                const data = await fetchRoute(waypoints);
                if (!cancelled) setRouteData(data);
            } catch {
                if (!cancelled) setRouteData(null);
            } finally {
                if (!cancelled) setRouteLoading(false);
            }
        }, 400);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [
        startLocation?.lat, startLocation?.lng,
        destination?.lat, destination?.lng,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ...stops.map((s) => `${s.lat},${s.lng}`),
    ]);

    // Auto-calculate pricing when key fields change
    const calculatePricing = useCallback(async () => {
        if (!routeData?.distanceKm) {
            setPricing(null);
            return;
        }
        try {
            const { data } = await calculateTransportPriceApi({
                vehicleType,
                distanceKm: routeData.distanceKm,
            });
            // Merge route data into pricing for display
            setPricing({
                ...data,
                totalDistanceKm: routeData.distanceKm,
                estimatedJourneyMin: routeData.durationMin,
            });
        } catch {
            // Silent fail for auto-calc
        }
    }, [vehicleType, routeData]);

    useEffect(() => {
        const timer = setTimeout(calculatePricing, 300);
        return () => clearTimeout(timer);
    }, [calculatePricing]);

    const handleMapClick = (latlng) => {
        const locationData = {
            name: `Point (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`,
            lat: latlng.lat,
            lng: latlng.lng,
        };

        if (selectMode === "start") {
            setStartLocation(locationData);
            setSelectMode(null);
        } else if (selectMode === "destination") {
            setDestination(locationData);
            setSelectMode(null);
        } else if (selectMode?.startsWith("stop-")) {
            const idx = parseInt(selectMode.split("-")[1], 10);
            setStops((prev) => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...locationData };
                return updated;
            });
            setSelectMode(null);
        }
    };

    const toggleSelectMode = (mode) => {
        setSelectMode((prev) => (prev === mode ? null : mode));
    };

    const addStop = () => {
        setStops((prev) => [...prev, { ...emptyStop }]);
    };

    const removeStop = (idx) => {
        setStops((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateStopName = (idx, name) => {
        setStops((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], name };
            return updated;
        });
    };

    const toggleFacility = (val) => {
        setFacilities((prev) =>
            prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!startLocation?.lat || !startLocation?.name) {
            return toast.error("Please select a start location");
        }
        if (!destination?.lat || !destination?.name) {
            return toast.error("Please select a destination");
        }
        if (!availableSeats || parseInt(availableSeats, 10) < 1) {
            return toast.error("Please enter available seats (at least 1)");
        }
        if (!routeData?.distanceKm) {
            return toast.error("Waiting for route calculation — please try again shortly");
        }

        // Attach road-based distanceFromStart to each stop
        const validStops = stops.filter((s) => s.lat && s.name);
        const processedStops = validStops.map((s, idx) => ({
            ...s,
            distanceFromStart: routeData.waypointDistancesFromStart?.[idx + 1] ?? 0,
        }));

        const payload = {
            vehicleType,
            startLocation,
            destination,
            stops: processedStops,
            totalDistanceKm: routeData.distanceKm,
            availableSeats: parseInt(availableSeats, 10),
            departureTime: departureTime || undefined,
            facilities,
            frequency,
            specificDates: frequency === "SPECIFIC_DATES" ? specificDates : [],
        };

        try {
            setSubmitting(true);
            if (isEdit) {
                await updateTransportListingApi(editId, payload);
                toast.success("Transport listing updated and sent for re-approval");
            } else {
                await createTransportListingApi(payload);
                toast.success("Transport listing created and sent for approval");
            }
            navigate("/transport-manager/dashboard");
        } catch (error) {
            toast.error(
                error?.response?.data?.error || error?.response?.data?.message || "Failed to save listing"
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Use road distance from OSRM, fallback to 0
    const totalDistance = routeData?.distanceKm ?? 0;

    if (loadingEdit) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                    <p className="mt-3 text-sm text-slate-500">Loading listing...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport Workspace"
                title={isEdit ? "Edit Transport Route" : "Create Transport Route"}
                description={
                    isEdit
                        ? "Update your transport route details. Changes will reset the listing to pending approval."
                        : "Plan a new bus or van route using the interactive map, add stops, and set pricing."
                }
                backgroundImage={dashboardBanner}
            />

            {/* Info cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                            <MapPin size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">Interactive map</div>
                            <div className="text-sm text-slate-500">Click on the map or search to set locations.</div>
                        </div>
                    </div>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            <Wallet size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">Auto pricing</div>
                            <div className="text-sm text-slate-500">Price is calculated based on distance and vehicle type.</div>
                        </div>
                    </div>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <CheckCircle2 size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">Admin approval</div>
                            <div className="text-sm text-slate-500">Listings go live after admin verification.</div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
                    {/* Left: Form */}
                    <div className="space-y-6">
                        {/* Map */}
                        <div className="card p-6">
                            <div className="mb-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Route planner
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">
                                    Interactive Sri Lanka Map
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Search or click on the map to set start, destination, and stops. Green = start, Red = destination, Blue = stops.
                                </p>
                            </div>

                            <TransportRouteMap
                                startLocation={startLocation}
                                destination={destination}
                                stops={stops}
                                selectMode={selectMode}
                                onMapClick={handleMapClick}
                                routeGeometry={routeData?.geometry}
                                routeLoading={routeLoading}
                                className="h-[450px]"
                            />
                        </div>

                        {/* Locations */}
                        <div className="card p-6 space-y-5">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Locations
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">Start & Destination</h3>
                            </div>

                            <LocationSearchBox
                                label="Start Location"
                                value={startLocation}
                                onChange={setStartLocation}
                                onSelectMode={() => toggleSelectMode("start")}
                                selectMode={selectMode}
                                activeMode="start"
                            />

                            <LocationSearchBox
                                label="Destination"
                                value={destination}
                                onChange={setDestination}
                                onSelectMode={() => toggleSelectMode("destination")}
                                selectMode={selectMode}
                                activeMode="destination"
                            />
                        </div>

                        {/* Stops */}
                        <div className="card p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                        Route stops
                                    </div>
                                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                                        Intermediate Stops ({stops.length})
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addStop}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                    <Plus size={14} /> Add stop
                                </button>
                            </div>

                            {stops.length === 0 && (
                                <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                                    No intermediate stops added. Click "Add stop" to add pickup/dropoff points along the route.
                                </div>
                            )}

                            {stops.map((stop, idx) => (
                                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Stop {idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeStop(idx)}
                                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <LocationSearchBox
                                        label=""
                                        value={stop}
                                        onChange={(loc) => {
                                            setStops((prev) => {
                                                const updated = [...prev];
                                                updated[idx] = { ...updated[idx], ...loc };
                                                return updated;
                                            });
                                        }}
                                        onSelectMode={() => toggleSelectMode(`stop-${idx}`)}
                                        selectMode={selectMode}
                                        activeMode={`stop-${idx}`}
                                    />

                                    {stop.lat && routeData?.waypointDistancesFromStart?.[idx + 1] != null && (
                                        <div className="text-xs text-slate-500 flex items-center gap-1 pl-1">
                                            <Route size={12} />
                                            ~{routeData.waypointDistancesFromStart[idx + 1].toFixed(1)} km from start (road)
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Vehicle & details */}
                        <div className="card p-6 space-y-5">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Vehicle details
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">Type, Seats & Schedule</h3>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">Vehicle Type</label>
                                <div className="mt-2 flex gap-3">
                                    {["BUS", "VAN"].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setVehicleType(type)}
                                            className={`flex-1 rounded-2xl border-2 p-4 text-center transition ${vehicleType === type
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            <Bus size={24} className="mx-auto mb-2" />
                                            <div className="text-sm font-bold">{type}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {type === "BUS" ? "Rs.30 base + Rs.10/km" : "Rs.100 base + Rs.70/km"}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Available Seats</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={availableSeats}
                                        onChange={(e) => setAvailableSeats(e.target.value)}
                                        placeholder="e.g. 40"
                                        className="input mt-2 w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Departure Time</label>
                                    <input
                                        type="time"
                                        value={departureTime}
                                        onChange={(e) => setDepartureTime(e.target.value)}
                                        className="input mt-2 w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Route Frequency */}
                        <div className="card p-6 space-y-5">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Schedule
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">Route Frequency</h3>
                                <p className="mt-1 text-sm text-slate-500">How often does this route operate?</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                    { value: "DAILY", label: "Daily", desc: "Every day of the week" },
                                    { value: "WEEKDAYS_ONLY", label: "Weekdays Only", desc: "Monday to Friday" },
                                    { value: "WEEKENDS_ONLY", label: "Weekends Only", desc: "Saturday & Sunday" },
                                    { value: "SPECIFIC_DATES", label: "Specific Dates", desc: "Choose particular dates" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFrequency(opt.value)}
                                        className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${frequency === opt.value
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${frequency === opt.value ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                                            }`}>
                                            <CalendarDays size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{opt.label}</span>
                                            <span className="text-[11px] text-slate-500">{opt.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {frequency === "SPECIFIC_DATES" && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={newSpecificDate}
                                            onChange={(e) => setNewSpecificDate(e.target.value)}
                                            className="input flex-1"
                                            min={new Date().toISOString().split("T")[0]}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (newSpecificDate && !specificDates.includes(newSpecificDate)) {
                                                    setSpecificDates((prev) => [...prev, newSpecificDate].sort());
                                                    setNewSpecificDate("");
                                                }
                                            }}
                                            className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    {specificDates.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {specificDates.map((d) => (
                                                <span
                                                    key={d}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
                                                >
                                                    {new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSpecificDates((prev) => prev.filter((x) => x !== d))}
                                                        className="text-indigo-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {specificDates.length === 0 && (
                                        <p className="text-xs text-slate-500">Add at least one date when this route will operate.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Facilities */}
                        <div className="card p-6 space-y-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Amenities
                                </div>
                                <h3 className="mt-1 text-xl font-bold text-slate-900">Facilities</h3>
                                <p className="mt-1 text-sm text-slate-500">Select all amenities available on this vehicle.</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {FACILITIES.map((fac) => {
                                    const FacIcon = fac.icon;
                                    const isActive = facilities.includes(fac.value);
                                    return (
                                        <button
                                            key={fac.value}
                                            type="button"
                                            onClick={() => toggleFacility(fac.value)}
                                            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${isActive
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                                }`}>
                                                <FacIcon size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{fac.label}</span>
                                                {isActive && (
                                                    <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                                        <CheckCircle2 size={10} /> Included
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit button — below Facilities */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {submitting
                                ? "Saving..."
                                : isEdit
                                    ? "Update & resubmit for approval"
                                    : "Create transport listing"}
                        </button>
                    </div>

                    {/* Right: Sidebar — sticky with independent scroll */}
                    <div className="xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1 space-y-6 scrollbar-thin">
                        {/* Pricing card */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                    <Wallet size={20} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Auto Pricing</h4>
                                    <p className="text-sm text-slate-500">Calculated from distance & type</p>
                                </div>
                            </div>

                            {pricing ? (
                                <div className="mt-5 space-y-3">
                                    <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-center">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                                            Estimated fare
                                        </div>
                                        <div className="mt-1 text-3xl font-black text-emerald-700">
                                            Rs. {pricing.priceRs?.toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="grid gap-2 grid-cols-2">
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="text-xs text-slate-500">Distance</div>
                                            <div className="text-sm font-bold text-slate-900">
                                                {pricing.totalDistanceKm?.toFixed(1)} km
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="text-xs text-slate-500">Duration</div>
                                            <div className="text-sm font-bold text-slate-900">
                                                {pricing.estimatedJourneyMin} min
                                            </div>
                                        </div>
                                    </div>

                                    {pricing.stops && pricing.stops.length > 0 && (
                                        <div className="rounded-xl bg-blue-50 px-3 py-2">
                                            <div className="text-xs font-semibold text-blue-600 mb-1">
                                                Stop arrival times
                                            </div>
                                            {pricing.stops.map((s, i) => (
                                                <div key={i} className="flex justify-between text-xs text-blue-800 py-0.5">
                                                    <span>{s.name}</span>
                                                    <span>~{s.estimatedArrivalMin} min</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                        <strong>{vehicleType}:</strong>{" "}
                                        {vehicleType === "BUS"
                                            ? "Rs.30 base + Rs.10/km (40 km/h)"
                                            : "Rs.100 base + Rs.70/km (50 km/h)"}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                                    Set start and destination to see auto-calculated pricing.
                                </div>
                            )}
                        </div>

                        {/* Route summary */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                                    <Route size={20} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Route Summary</h4>
                                    <p className="text-sm text-slate-500">Overview of your planned route.</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 text-sm">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                                    <span className="font-semibold text-slate-700">Start:</span>
                                    <span className="text-slate-600">{startLocation?.name || "Not set"}</span>
                                </div>

                                {stops.filter((s) => s.name).map((stop, idx) => (
                                    <div key={idx} className="rounded-2xl bg-blue-50 px-4 py-3 flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                        <span className="font-semibold text-blue-700">Stop {idx + 1}:</span>
                                        <span className="text-blue-600">{stop.name}</span>
                                    </div>
                                ))}

                                <div className="rounded-2xl bg-rose-50 px-4 py-3 flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                                    <span className="font-semibold text-slate-700">End:</span>
                                    <span className="text-slate-600">{destination?.name || "Not set"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Approval flow */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                                    <Clock3 size={20} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Approval flow</h4>
                                    <p className="text-sm text-slate-500">What happens after submission.</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 text-sm text-slate-600">
                                <div className="rounded-2xl bg-amber-50 px-4 py-3">
                                    <span className="font-semibold text-amber-700">1. Pending approval</span>
                                    <div className="mt-1">Admin reviews the route before students can see it.</div>
                                </div>
                                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                                    <span className="font-semibold text-emerald-700">2. Approved</span>
                                    <div className="mt-1">Route goes live and students can view schedules and pricing.</div>
                                </div>
                                <div className="rounded-2xl bg-rose-50 px-4 py-3">
                                    <span className="font-semibold text-rose-700">3. Rejected</span>
                                    <div className="mt-1">Fix issues and resubmit for another review cycle.</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </form>
        </div>
    );
}
