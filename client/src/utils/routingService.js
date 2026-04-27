/**
 * OSRM-based routing service for real road distance and route geometry.
 *
 * Uses the free OSRM demo server (no API key required).
 * Returns actual road distance, duration, and route geometry
 * instead of straight-line haversine calculations.
 */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Fetch the real road route between an ordered list of waypoints.
 *
 * @param {Array<{lat: number, lng: number}>} waypoints
 *   At least 2 points: [start, ...stops, destination]
 * @returns {Promise<{
 *   distanceKm: number,
 *   durationMin: number,
 *   geometry: Array<[number, number]>,       // [lat, lng] pairs for Leaflet
 *   legDistances: number[],                  // km per leg
 *   legDurations: number[],                  // min per leg
 *   waypointDistancesFromStart: number[],    // cumulative km at each waypoint
 * }>}
 */
export async function fetchRoute(waypoints) {
    if (!waypoints || waypoints.length < 2) {
        throw new Error("At least 2 waypoints are required");
    }

    // OSRM expects coords as lng,lat pairs separated by ;
    const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");

    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Routing service unavailable");

    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error(data.message || "No route found");
    }

    const route = data.routes[0];

    // Convert GeoJSON [lng, lat] → Leaflet [lat, lng]
    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    const totalDistanceKm = route.distance / 1000;
    const totalDurationMin = Math.round(route.duration / 60);

    // Per-leg breakdown
    const legDistances = route.legs.map((leg) => leg.distance / 1000);
    const legDurations = route.legs.map((leg) => Math.round(leg.duration / 60));

    // Cumulative distance at each waypoint (index 0 = start = 0 km)
    const waypointDistancesFromStart = [0];
    let cumulative = 0;
    for (const d of legDistances) {
        cumulative += d;
        waypointDistancesFromStart.push(cumulative);
    }

    return {
        distanceKm: totalDistanceKm,
        durationMin: totalDurationMin,
        geometry,
        legDistances,
        legDurations,
        waypointDistancesFromStart,
    };
}

/**
 * Reverse-geocode a lat/lng to a place name using Nominatim.
 */
export async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.display_name) return null;

    // Return short name (first part before comma)
    const shortName =
        data.address?.road ||
        data.address?.suburb ||
        data.address?.town ||
        data.address?.city ||
        data.display_name.split(",")[0];

    return {
        name: shortName,
        displayName: data.display_name,
    };
}
