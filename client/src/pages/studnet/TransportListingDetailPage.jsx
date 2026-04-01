import {
    ArrowLeft,
    Bus,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Snowflake,
    Wifi,
    Sofa,
    BatteryCharging,
    Navigation,
    Luggage,
    Users,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import TransportRouteMap from "../../components/transport/TransportRouteMap";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import { getTransportListingPublicApi, bookTransportTripApi } from "../../api/client";
import { fetchRoute } from "../../utils/routingService";


const FACILITY_META = {
    AC: { icon: Snowflake, label: "Air Conditioning" },
    WIFI: { icon: Wifi, label: "WiFi" },
    CUSHIONED_SEATS: { icon: Sofa, label: "Cushioned Seats" },
    USB_CHARGING: { icon: BatteryCharging, label: "USB Charging" },
    GPS_TRACKING: { icon: Navigation, label: "GPS Tracking" },
    LUGGAGE_SPACE: { icon: Luggage, label: "Luggage Space" },
};
const FREQ_LABEL = { DAILY: "Daily", WEEKDAYS_ONLY: "Weekdays Only", WEEKENDS_ONLY: "Weekends Only", SPECIFIC_DATES: "Specific Dates" };

export default function TransportListingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [routeData, setRouteData] = useState(null);
    const [journeyDate, setJourneyDate] = useState("");
    const [passengers, setPassengers] = useState("1");
    const [bookingLoading, setBookingLoading] = useState(false);
    const [selectedPickup, setSelectedPickup] = useState(null);
    const [selectedDropoff, setSelectedDropoff] = useState(null);

    const loadListing = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await getTransportListingPublicApi(id);
            setListing(data.listing);

            // Build route
            const l = data.listing;
            if (l.startLocation?.lat && l.destination?.lat) {
                const wps = [l.startLocation, ...(l.stops || []).filter((s) => s.lat), l.destination];
                try {
                    const rd = await fetchRoute(wps);
                    setRouteData(rd);
                } catch { }
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load listing");
            navigate("/student/transport");
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadListing(); }, [loadListing]);

    // Build all route stops for pickup/dropoff selection
    const allRouteStops = listing ? [
        { name: listing.startLocation.name, lat: listing.startLocation.lat, lng: listing.startLocation.lng, distanceFromStart: 0, label: "Start" },
        ...(listing.stops || []).map((s, i) => ({ ...s, label: `Stop ${i + 1}` })),
        { name: listing.destination.name, lat: listing.destination.lat, lng: listing.destination.lng, distanceFromStart: listing.totalDistanceKm, label: "Destination" },
    ] : [];

    // Set default selections when listing loads
    useEffect(() => {
        if (listing && allRouteStops.length >= 2) {
            if (!selectedPickup) setSelectedPickup(allRouteStops[0]);
            if (!selectedDropoff) setSelectedDropoff(allRouteStops[allRouteStops.length - 1]);
        }
    }, [listing]);

    // Dropoff options must come after the selected pickup
    const pickupIdx = allRouteStops.findIndex((s) => s.name === selectedPickup?.name);
    const dropoffOptions = pickupIdx >= 0 ? allRouteStops.slice(pickupIdx + 1) : allRouteStops.slice(1);

    // Calculate partial price
    const calculatePartialPrice = () => {
        if (!listing || !selectedPickup || !selectedDropoff) return listing?.priceRs || 0;
        const pIdx = allRouteStops.findIndex((s) => s.name === selectedPickup.name);
        const dIdx = allRouteStops.findIndex((s) => s.name === selectedDropoff.name);
        if (pIdx < 0 || dIdx < 0 || pIdx >= dIdx) return listing.priceRs;
        const segmentDistance = allRouteStops[dIdx].distanceFromStart - allRouteStops[pIdx].distanceFromStart;
        const ratio = listing.totalDistanceKm > 0 ? segmentDistance / listing.totalDistanceKm : 1;
        return Math.round(listing.priceRs * ratio);
    };

    const pricePerSeat = calculatePartialPrice();

    const handleBook = async () => {
        if (!journeyDate) { toast.error("Please select a journey date"); return; }
        try {
            setBookingLoading(true);
            const { data } = await bookTransportTripApi({
                listingId: listing._id,
                journeyDate,
                passengers: parseInt(passengers) || 1,
                pickupStop: {
                    name: selectedPickup?.name || listing.startLocation.name,
                    lat: selectedPickup?.lat || listing.startLocation.lat,
                    lng: selectedPickup?.lng || listing.startLocation.lng,
                },
                dropoffStop: {
                    name: selectedDropoff?.name || listing.destination.name,
                    lat: selectedDropoff?.lat || listing.destination.lat,
                    lng: selectedDropoff?.lng || listing.destination.lng,
                },
            });
            toast.success("Booking created! Redirecting to payment...");
            navigate(`/student/transport/bookings/${data.booking._id}/pay`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Booking failed");
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
        );
    }

    if (!listing) return null;

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport"
                title={`${listing.startLocation?.name} → ${listing.destination?.name}`}
                description={`${listing.vehicleType} route operated ${FREQ_LABEL[listing.frequency] || "Daily"}`}
                backgroundImage={dashboardBanner}
            />

            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                {/* Left */}
                <div className="space-y-6">
                    {/* Map */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Route Map</h3>
                        <TransportRouteMap
                            startLocation={listing.startLocation}
                            destination={listing.destination}
                            stops={listing.stops || []}
                            routeGeometry={routeData?.geometry}
                            routeLoading={false}
                            className="h-[400px]"
                        />
                    </div>

                    {/* Route Details */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Route Details</h3>
                        <div className="space-y-3">
                            <div className="rounded-2xl bg-emerald-50 px-4 py-3 flex items-center gap-3">
                                <div className="h-3.5 w-3.5 rounded-full bg-emerald-500"></div>
                                <div>
                                    <div className="text-xs text-emerald-600 font-semibold">Start</div>
                                    <div className="text-sm font-bold text-slate-900">{listing.startLocation.name}</div>
                                </div>
                            </div>

                            {listing.stops?.map((stop, idx) => (
                                <div key={idx} className="rounded-2xl bg-blue-50 px-4 py-3 flex items-center gap-3">
                                    <div className="h-3.5 w-3.5 rounded-full bg-blue-500"></div>
                                    <div>
                                        <div className="text-xs text-blue-600 font-semibold">Stop {idx + 1}</div>
                                        <div className="text-sm font-bold text-slate-900">{stop.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {stop.distanceFromStart?.toFixed(1)} km from start · ~{stop.estimatedArrivalMin} min
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="rounded-2xl bg-rose-50 px-4 py-3 flex items-center gap-3">
                                <div className="h-3.5 w-3.5 rounded-full bg-rose-500"></div>
                                <div>
                                    <div className="text-xs text-rose-600 font-semibold">Destination</div>
                                    <div className="text-sm font-bold text-slate-900">{listing.destination.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Facilities */}
                    {listing.facilities?.length > 0 && (
                        <div className="card p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-3">Facilities</h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {listing.facilities.map((f) => {
                                    const meta = FACILITY_META[f];
                                    if (!meta) return null;
                                    const Icon = meta.icon;
                                    return (
                                        <div key={f} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-700">{meta.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="xl:sticky xl:top-6 xl:self-start space-y-6">
                    {/* Trip Info */}
                    <div className="card p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${listing.vehicleType === "BUS" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                                <Bus size={22} />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-900">{listing.vehicleType}</div>
                                <div className="text-sm text-slate-500">{FREQ_LABEL[listing.frequency] || "Daily"}</div>
                            </div>
                        </div>

                        <div className="grid gap-2 grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} /> Distance</div>
                                <div className="text-sm font-bold text-slate-900">{listing.totalDistanceKm?.toFixed(1)} km</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="text-xs text-slate-500 flex items-center gap-1"><Clock3 size={12} /> Duration</div>
                                <div className="text-sm font-bold text-slate-900">~{listing.estimatedJourneyMin} min</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="text-xs text-slate-500 flex items-center gap-1"><Clock3 size={12} /> Departure</div>
                                <div className="text-sm font-bold text-slate-900">{listing.departureTime || "—"}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="text-xs text-slate-500 flex items-center gap-1"><Users size={12} /> Seats</div>
                                <div className="text-sm font-bold text-slate-900">{listing.availableSeats}</div>
                            </div>
                        </div>

                        {listing.frequency === "SPECIFIC_DATES" && listing.specificDates?.length > 0 && (
                            <div className="rounded-xl bg-indigo-50 p-3">
                                <div className="text-xs font-semibold text-indigo-600 mb-1">Operating Dates</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {listing.specificDates.map((d) => (
                                        <span key={d} className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                                            {new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {listing.managerId && (
                            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                                <div className="text-xs text-slate-500">Operated by</div>
                                <div className="font-semibold text-slate-900">{listing.managerId.fullName}</div>
                            </div>
                        )}
                    </div>

                    {/* Pricing & Book */}
                    <div className="card p-6 space-y-4">
                        <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-center">
                            <div className="text-xs font-semibold uppercase text-emerald-600">
                                {selectedPickup?.name === listing.startLocation.name && selectedDropoff?.name === listing.destination.name
                                    ? "Full route price per seat"
                                    : "Segment price per seat"}
                            </div>
                            <div className="text-3xl font-black text-emerald-700 mt-1">Rs. {pricePerSeat.toLocaleString()}</div>
                            {pricePerSeat < listing.priceRs && (
                                <div className="text-xs text-slate-500 mt-1 line-through">Full route: Rs. {listing.priceRs.toLocaleString()}</div>
                            )}
                        </div>

                        {/* Pickup Stop */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <MapPin size={14} className="text-emerald-500" /> Pickup Stop
                            </label>
                            <select
                                value={selectedPickup?.name || ""}
                                onChange={(e) => {
                                    const stop = allRouteStops.find((s) => s.name === e.target.value);
                                    setSelectedPickup(stop || allRouteStops[0]);
                                    // Reset dropoff if it's before the new pickup
                                    const newPickupIdx = allRouteStops.findIndex((s) => s.name === e.target.value);
                                    const curDropoffIdx = allRouteStops.findIndex((s) => s.name === selectedDropoff?.name);
                                    if (curDropoffIdx <= newPickupIdx) {
                                        setSelectedDropoff(allRouteStops[allRouteStops.length - 1]);
                                    }
                                }}
                                className="input mt-1.5 w-full"
                            >
                                {allRouteStops.slice(0, -1).map((stop) => (
                                    <option key={`pickup-${stop.name}`} value={stop.name}>
                                        {stop.name} ({stop.label}{stop.distanceFromStart > 0 ? ` · ${stop.distanceFromStart.toFixed(1)} km` : ""})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dropoff Stop */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <MapPin size={14} className="text-rose-500" /> Drop-off Stop
                            </label>
                            <select
                                value={selectedDropoff?.name || ""}
                                onChange={(e) => {
                                    const stop = allRouteStops.find((s) => s.name === e.target.value);
                                    setSelectedDropoff(stop || allRouteStops[allRouteStops.length - 1]);
                                }}
                                className="input mt-1.5 w-full"
                            >
                                {dropoffOptions.map((stop) => (
                                    <option key={`dropoff-${stop.name}`} value={stop.name}>
                                        {stop.name} ({stop.label}{stop.distanceFromStart > 0 ? ` · ${stop.distanceFromStart.toFixed(1)} km` : ""})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Journey Date</label>
                            <input
                                type="date"
                                value={journeyDate}
                                onChange={(e) => setJourneyDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                className="input mt-1.5 w-full"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700">Passengers</label>
                            <input
                                type="number"
                                min="1"
                                value={passengers}
                                onChange={(e) => setPassengers(e.target.value)}
                                className="input mt-1.5 w-full"
                            />
                        </div>

                        {journeyDate && passengers && (
                            <div className="rounded-xl bg-amber-50 p-3 text-center text-sm">
                                <span className="text-amber-600">Total: </span>
                                <span className="font-bold text-amber-800">
                                    Rs. {(pricePerSeat * (parseInt(passengers) || 1)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleBook}
                            disabled={bookingLoading || !journeyDate}
                            className="w-full rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {bookingLoading ? "Booking..." : "Book & Pay Trip"}
                        </button>

                        <p className="text-xs text-slate-500 text-center">
                            You will be redirected to the demo payment gateway to complete your booking.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
