import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const endIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const stopIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Sri Lanka bounds
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const SRI_LANKA_ZOOM = 8;

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ClickHandler({ onClick }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
}

function FitBounds({ positions }) {
    const map = useMap();
    const prevLength = useRef(0);

    useEffect(() => {
        if (positions.length >= 2 && positions.length !== prevLength.current) {
            const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        prevLength.current = positions.length;
    }, [positions, map]);

    return null;
}

export default function TransportRouteMap({
    startLocation,
    destination,
    stops = [],
    selectMode,
    onMapClick,
    routeGeometry,
    routeLoading,
    className = "",
}) {
    const allPoints = [];
    if (startLocation?.lat) allPoints.push(startLocation);
    stops.forEach((s) => { if (s.lat) allPoints.push(s); });
    if (destination?.lat) allPoints.push(destination);

    // Fallback straight-line if no road route geometry available
    const fallbackPositions = allPoints.map((p) => [p.lat, p.lng]);

    const getCursorClass = () => {
        if (selectMode === "start") return "cursor-crosshair";
        if (selectMode === "destination") return "cursor-crosshair";
        if (selectMode === "stop") return "cursor-crosshair";
        return "";
    };

    return (
        <div className={`relative rounded-2xl overflow-hidden ring-1 ring-slate-200 ${className}`}>
            {selectMode && (
                <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                    Click on the map to set{" "}
                    {selectMode === "start" ? "start location" : selectMode === "destination" ? "destination" : "stop point"}
                </div>
            )}

            {routeLoading && (
                <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-lg ring-1 ring-indigo-100">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
                    Calculating road route…
                </div>
            )}

            <MapContainer
                center={SRI_LANKA_CENTER}
                zoom={SRI_LANKA_ZOOM}
                scrollWheelZoom
                className={`h-full w-full ${getCursorClass()}`}
                style={{ minHeight: "400px" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {selectMode && onMapClick && <ClickHandler onClick={onMapClick} />}

                {allPoints.length >= 2 && <FitBounds positions={allPoints} />}

                {startLocation?.lat && (
                    <Marker position={[startLocation.lat, startLocation.lng]} icon={startIcon}>
                        <Popup>
                            <strong>Start:</strong> {startLocation.name || "Start location"}
                        </Popup>
                    </Marker>
                )}

                {stops.map((stop, idx) =>
                    stop.lat ? (
                        <Marker key={idx} position={[stop.lat, stop.lng]} icon={stopIcon}>
                            <Popup>
                                <strong>Stop {idx + 1}:</strong> {stop.name || `Stop ${idx + 1}`}
                                {stop.distanceFromStart != null && (
                                    <><br />{stop.distanceFromStart.toFixed(1)} km from start</>
                                )}
                            </Popup>
                        </Marker>
                    ) : null
                )}

                {destination?.lat && (
                    <Marker position={[destination.lat, destination.lng]} icon={endIcon}>
                        <Popup>
                            <strong>Destination:</strong> {destination.name || "Destination"}
                        </Popup>
                    </Marker>
                )}

                {/* Real road route (solid blue line) */}
                {routeGeometry?.length >= 2 && (
                    <Polyline positions={routeGeometry} color="#4f46e5" weight={4} opacity={0.85} />
                )}

                {/* Fallback straight dashed line when no road route yet */}
                {!routeGeometry && fallbackPositions.length >= 2 && (
                    <Polyline positions={fallbackPositions} color="#94a3b8" weight={2} opacity={0.5} dashArray="8 4" />
                )}
            </MapContainer>
        </div>
    );
}

export { haversineDistance, SRI_LANKA_CENTER, SRI_LANKA_ZOOM };
