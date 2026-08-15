/**
 * OSRM route helper — fetches a road-following polyline between two lat/lng
 * points from the public OSRM demo server.
 *
 * Public API (free, no API key):
 *   https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
 *
 * Returns the route as an array of [lat, lng] tuples (Leaflet polyline format).
 * Falls back to a straight 2-point line on any error, timeout, or empty result
 * so the map never breaks — the caller just sees the original "as the crow flies"
 * line instead of road-following directions.
 *
 * Be respectful of the public OSRM server:
 *   - Results are cached in-memory keyed by rounded coords (~11m precision).
 *   - Use a 5s AbortController timeout so a slow server doesn't block the UI.
 *
 * NOTE: This module is browser-only (uses `fetch` + `AbortController`). It is
 * imported by the Leaflet map Client Component, never by a Server Component.
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT_MS = 5_000;
const COORD_ROUND = 4; // 4 decimal places ≈ 11m at the equator

/** In-memory cache: "${fromLat},${fromLng},${toLat},${toLng}" → [lat,lng][]. */
const routeCache = new Map<string, [number, number][]>();

function cacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  return [
    fromLat.toFixed(COORD_ROUND),
    fromLng.toFixed(COORD_ROUND),
    toLat.toFixed(COORD_ROUND),
    toLng.toFixed(COORD_ROUND),
  ].join(',');
}

/**
 * Fetch a road-following polyline from OSRM.
 *
 * @param fromLat Origin latitude  (Leaflet order: lat first)
 * @param fromLng Origin longitude
 * @param toLat   Destination latitude
 * @param toLng   Destination longitude
 * @returns Array of [lat, lng] coordinates. On success this is the OSRM
 * route geometry (converted from GeoJSON `[lng, lat]` to Leaflet `[lat, lng]`).
 * On any error / timeout / empty result, returns a 2-point straight line
 * `[[fromLat, fromLng], [toLat, toLng]]` so callers can degrade gracefully.
 *
 * Caching: results are stored in an in-memory `Map` keyed by the rounded
 * (4-decimal) coords of both endpoints. Repeated calls for the same pair
 * return the cached result without hitting the network.
 */
export async function fetchOsmrRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<[number, number][]> {
  const fallback: [number, number][] = [
    [fromLat, fromLng],
    [toLat, toLng],
  ];

  // Cache hit — return immediately (no network call).
  const key = cacheKey(fromLat, fromLng, toLat, toLng);
  const cached = routeCache.get(key);
  if (cached) return cached;

  // OSRM expects coordinates as {lng},{lat};{lng},{lat} (note the order!).
  const url = `${OSRM_BASE_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  // 5s timeout — a slow OSRM server shouldn't block the UI. We abort the
  // fetch and fall back to the straight line.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return fallback;

    const data: unknown = await res.json();
    const coords: unknown = (data as { routes?: Array<{ geometry?: { coordinates?: unknown } }> })
      ?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return fallback;

    // GeoJSON LineString coordinates are [lng, lat] — convert to Leaflet [lat, lng].
    const latlngs: [number, number][] = [];
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) return fallback;
      const lng = Number(c[0]);
      const lat = Number(c[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fallback;
      latlngs.push([lat, lng]);
    }
    if (latlngs.length < 2) return fallback;

    routeCache.set(key, latlngs);
    return latlngs;
  } catch {
    // AbortError (timeout), network failure, JSON parse error, CORS block, etc.
    // Swallow and fall back to the straight line — the map still works.
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
