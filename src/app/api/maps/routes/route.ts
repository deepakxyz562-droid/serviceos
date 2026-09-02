import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { fetchGoogleRoute, decodePolyline } from '@/lib/maps/google-routes';

/**
 * POST /api/maps/routes
 * --------------------
 * Server-side proxy for Google Routes API v2.
 *
 * Body: { from: { lat, lng }, to: { lat, lng } }
 * Response: { points: [[lat,lng],...], distanceMeters, durationSeconds }
 *
 * WHY THIS EXISTS:
 *   The previous architecture called the public OSRM demo server
 *   (router.project-osrm.org) directly from the browser. That's a free demo
 *   with no SLA, rate-limiting, and occasional downtime. For a commercial
 *   SaaS dispatch system, routing must be reliable + traffic-aware.
 *
 *   This proxy:
 *     1. Keeps the Google server key server-side (never exposed to browser).
 *     2. Validates coordinates before calling Google (reject garbage input).
 *     3. Caches results in-memory so repeated dispatch-map route requests
 *        don't re-bill Google.
 *     4. Returns a provider-neutral [lat,lng][] polyline so the frontend
 *        renderer (Leaflet today, Google Maps tomorrow) doesn't care which
 *        routing provider produced the geometry.
 *
 * AUTH: Any authenticated user (employee/admin/super-admin). Tenant scoping is
 * NOT enforced here because routing is a pure function of two coordinates —
 * there's no tenant-scoped data involved. The coordinates themselves come
 * from the caller's own jobs/employees, which are already tenant-scoped by
 * the endpoints that supplied them.
 *
 * GRACEFUL DEGRADATION: On any Google API error / timeout / missing key,
 * returns a straight 2-point line between from→to so the caller's map never
 * breaks (same contract as the old OSRM helper).
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const from = body?.from;
    const to = body?.to;

    // ── Coordinate validation ───────────────────────────────────────────
    // Reject obviously invalid input before calling Google (saves a billed
    // API call + prevents garbage polylines on the map).
    if (
      !from ||
      typeof from.lat !== 'number' ||
      typeof from.lng !== 'number' ||
      !to ||
      typeof to.lat !== 'number' ||
      typeof to.lng !== 'number'
    ) {
      return NextResponse.json(
        { error: 'from and to must be { lat: number, lng: number }' },
        { status: 400 },
      );
    }

    const fromLat = from.lat as number;
    const fromLng = from.lng as number;
    const toLat = to.lat as number;
    const toLng = to.lng as number;

    if (
      !Number.isFinite(fromLat) ||
      fromLat < -90 ||
      fromLat > 90 ||
      !Number.isFinite(fromLng) ||
      fromLng < -180 ||
      fromLng > 180 ||
      !Number.isFinite(toLat) ||
      toLat < -90 ||
      toLat > 90 ||
      !Number.isFinite(toLng) ||
      toLng < -180 ||
      toLng > 180
    ) {
      return NextResponse.json(
        { error: 'Coordinates out of range (lat [-90,90], lng [-180,180])' },
        { status: 400 },
      );
    }

    // ── Fetch route (cached) ─────────────────────────────────────────────
    const route = await fetchGoogleRoute(fromLat, fromLng, toLat, toLng);

    return NextResponse.json({
      points: route.points,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      // Signal to the client whether this is a real route or a fallback
      // straight line (useful for rendering style / debugging).
      fallback: route.distanceMeters === 0 && route.points.length === 2,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch route';
    console.error('[maps/routes POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/maps/routes?from=lat,lng&to=lat,lng
 * --------------------------------------------------
 * Convenience GET form of the route proxy (same logic, query-param based).
 * Useful for cases where the caller prefers a simple GET (e.g. a fetch in a
 * useEffect without a POST body).
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Query params "from" and "to" are required (format: lat,lng)' },
        { status: 400 },
      );
    }

    const parseCoord = (s: string): { lat: number; lng: number } | null => {
      const parts = s.split(',').map((p) => Number(p.trim()));
      if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
        return null;
      }
      return { lat: parts[0], lng: parts[1] };
    };

    const from = parseCoord(fromParam);
    const to = parseCoord(toParam);
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Invalid coordinate format. Use: from=lat,lng&to=lat,lng' },
        { status: 400 },
      );
    }

    if (
      from.lat < -90 || from.lat > 90 ||
      from.lng < -180 || from.lng > 180 ||
      to.lat < -90 || to.lat > 90 ||
      to.lng < -180 || to.lng > 180
    ) {
      return NextResponse.json(
        { error: 'Coordinates out of range (lat [-90,90], lng [-180,180])' },
        { status: 400 },
      );
    }

    const route = await fetchGoogleRoute(from.lat, from.lng, to.lat, to.lng);

    return NextResponse.json({
      points: route.points,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      fallback: route.distanceMeters === 0 && route.points.length === 2,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch route';
    console.error('[maps/routes GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Re-export the polyline decoder for callers that need to decode pre-encoded
// polylines (e.g. if a future caller fetches Google's raw response directly).
export { decodePolyline };
