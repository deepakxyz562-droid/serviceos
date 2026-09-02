/**
 * Google Routes API v2 client — server-side only.
 *
 * Used by /api/maps/routes to fetch road-following polylines between two
 * coordinates. This replaces the public OSRM demo server with a
 * production-grade, traffic-aware routing provider.
 *
 * SECURITY: This module reads `GOOGLE_MAPS_SERVER_API_KEY` (server-only, IP-
 * restricted). It must NEVER be imported by a client component or exposed
 * via a NEXT_PUBLIC_ env var.
 *
 * API: POST https://routes.googleapis.com/directions/v2:computeRoutes
 *   - Authorization: Bearer <server-key>  (also accepts X-Goog-Api-Key header)
 *   - X-Goog-FieldMask: controls which fields are returned ( billed SKUs).
 *   - Body: { origin: { location: { latLng: { latitude, longitude } } },
 *             destination: { location: { latLng: { latitude, longitude } } },
 *             travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE',
 *             computeAlternativeRoutes: false, routeModifiers: {...} }
 *   - Response: { routes: [{ polyline: { encodedPolyline: "..." }, ... }] }
 *
 * The encoded polyline is Google's standard Encoded Polyline Algorithm Format
 * — the same format Leaflet/MapLibre/Google JS consume via L.Polyline or
 * google.maps.Polyline. We decode it to a [lat,lng][] array here so the
 * frontend renderer is provider-neutral (works with Leaflet today, Google
 * Maps tomorrow).
 *
 * Caching: results are cached in-memory keyed by rounded (4-decimal, ~11m)
 * coords. Capped at 200 entries with LRU eviction.
 */
import { logger } from '@/lib/logger';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ROUTES_TIMEOUT_MS = 8_000; // Google Routes can be slower than OSRM
const COORD_ROUND = 4; // 4 decimals ≈ 11m at the equator

// Field mask: request only the fields we actually use, to minimize billing.
// `routes.distanceMeters` + `routes.duration` + `routes.polyline.encodedPolyline`.
// See https://developers.google.com/maps/documentation/routes/migrate-routing#field_masks
const FIELD_MASK = [
  'routes.distanceMeters',
  'routes.duration',
  'routes.polyline.encodedPolyline',
  'routes.legs.steps.polyline.encodedPolyline',
].join(',');

// ── In-memory cache ─────────────────────────────────────────────────────────
const ROUTE_CACHE_MAX = 200;
const routeCache = new Map<
  string,
  { points: [number, number][]; distanceMeters: number; durationSeconds: number }
>();

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

// ── Encoded polyline decoder ──────────────────────────────────────────────────
/**
 * Decode a Google encoded polyline string into an array of [lat, lng] tuples.
 *
 * The algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * Each point is a delta from the previous point, encoded as a variable-length
 * sequence of 6-bit chunks, with the sign bit inverted.
 *
 * Returns Leaflet-order [lat, lng] coordinates (not GeoJSON [lng, lat]).
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude delta.
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63; // 63 = ASCII '?' + offset
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    // Decode longitude delta.
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    // Coordinates are stored as 1e-5 degrees.
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GoogleRoute {
  points: [number, number][]; // [lat, lng][] — Leaflet/Google JS compatible
  distanceMeters: number;
  durationSeconds: number;
}

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: string | number;
    duration?: string; // e.g. "1080s"
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      steps?: Array<{ polyline?: { encodedPolyline?: string } }>;
    }>;
  }>;
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Fetch a road-following route from Google Routes API v2.
 *
 * @param fromLat Origin latitude  (Leaflet order: lat first)
 * @param fromLng Origin longitude
 * @param toLat   Destination latitude
 * @param toLng   Destination longitude
 * @returns GoogleRoute with decoded [lat,lng][] points + distance + duration.
 *          On any error / timeout / empty result, returns a straight 2-point
 *          fallback line so the caller's map never breaks (same graceful
 *          degradation as the OSRM helper).
 */
export async function fetchGoogleRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<GoogleRoute> {
  const fallback: GoogleRoute = {
    points: [
      [fromLat, fromLng],
      [toLat, toLng],
    ],
    distanceMeters: 0,
    durationSeconds: 0,
  };

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    logger.warn('[google-routes] GOOGLE_MAPS_SERVER_API_KEY not set — using fallback straight line');
    return fallback;
  }

  // Cache hit — return immediately (no network call).
  const key = cacheKey(fromLat, fromLng, toLat, toLng);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const body = {
    origin: {
      location: { latLng: { latitude: fromLat, longitude: fromLng } },
    },
    destination: {
      location: { latLng: { latitude: toLat, longitude: toLng } },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    polylineEncoding: 'ENCODED_POLYLINE',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTES_TIMEOUT_MS);

  try {
    const res = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[google-routes] API returned ${res.status}: ${errText.slice(0, 200)}`);
      return fallback;
    }

    const data = (await res.json()) as GoogleRoutesResponse;
    const route = data.routes?.[0];
    if (!route) {
      logger.warn('[google-routes] no route in response');
      return fallback;
    }

    // Prefer the top-level polyline; fall back to stitching leg steps.
    const encoded =
      route.polyline?.encodedPolyline ??
      route.legs
        ?.flatMap((leg) => leg.steps ?? [])
        .map((step) => step.polyline?.encodedPolyline ?? '')
        .join('');
    if (!encoded) {
      logger.warn('[google-routes] route has no polyline');
      return fallback;
    }

    const points = decodePolyline(encoded);
    if (points.length < 2) {
      logger.warn('[google-routes] decoded polyline has < 2 points');
      return fallback;
    }

    // Parse distance (Google returns string e.g. "15230" or number).
    const distanceMeters =
      typeof route.distanceMeters === 'string'
        ? parseInt(route.distanceMeters, 10)
        : route.distanceMeters ?? 0;

    // Parse duration (Google returns e.g. "1080s" → 1080 seconds).
    let durationSeconds = 0;
    if (typeof route.duration === 'string') {
      const match = /^(\d+)s$/.exec(route.duration);
      if (match) durationSeconds = parseInt(match[1], 10);
    }

    const result: GoogleRoute = { points, distanceMeters, durationSeconds };

    // Cache + LRU eviction.
    routeCache.set(key, result);
    if (routeCache.size > ROUTE_CACHE_MAX) {
      const toDelete = routeCache.size - ROUTE_CACHE_MAX;
      let count = 0;
      for (const k of routeCache.keys()) {
        routeCache.delete(k);
        count++;
        if (count >= toDelete) break;
      }
    }

    return result;
  } catch (err) {
    // AbortError (timeout), network failure, JSON parse error, etc.
    // Swallow and fall back to the straight line — the map still works.
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[google-routes] fetch failed (${msg.slice(0, 100)}) — using fallback`);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
