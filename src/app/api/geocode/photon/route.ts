import { NextRequest, NextResponse } from 'next/server';
import { setDefaultResultOrder } from 'dns';

// Force IPv4-first DNS resolution. Photon's IPv6 endpoint may be unreachable
// from some sandboxes (no IPv6 route). Setting ipv4first makes the resolver
// return A records before AAAA, so fetch connects over IPv4 immediately.
// This is process-scoped and only affects server-side fetches.
setDefaultResultOrder('ipv4first');

export const dynamic = 'force-dynamic';

/**
 * GET /api/geocode/photon?q=<query>&lat=<opt>&lon=<opt>&lang=<opt>
 *
 * Server-side proxy for Photon (photon.komoot.io) — a free, no-API-key,
 * no-signup autocomplete service built on OpenStreetMap data by Komoot.
 *
 * Why Photon over Nominatim?
 *   - True autocomplete (works with partial input — "Emp" → "Empire State")
 *   - No strict rate limit (Nominatim is 1 req/sec; Photon has no documented limit)
 *   - Location biasing via lat/lon params (prioritize results near the user)
 *   - Returns structured fields: name, street, housenumber, city, state, postcode, country, lat/lng
 *   - Free forever, no signup, no API key
 *
 * Why a proxy? The component could call photon.komoot.io directly from the
 * browser, but a server-side proxy lets us:
 *   - Add a 60-second in-memory cache (reduces upstream load + speeds up repeat queries)
 *   - Normalize the GeoJSON response to a simpler array shape for the frontend
 *   - Add a User-Agent header (Photon doesn't require it, but it's good practice)
 *   - Fall back to Nominatim (/api/geocode/search) if Photon is down — the
 *     frontend calls both with the same normalized shape
 *
 * Response shape (normalized — same as Nominatim proxy so the frontend
 * AddressAutocomplete component can use either interchangeably):
 *   [
 *     {
 *       place_id: "photon_<osm_id>",
 *       display_name: "Empire State Building, 5th Avenue 350, New York, United States",
 *       type: "house",
 *       lat: "40.7484421",
 *       lon: "-73.9856589",
 *       address: {
 *         house_number: "350",
 *         road: "5th Avenue",
 *         city: "New York",
 *         state: "New York",
 *         postcode: "10118",
 *         country: "United States",
 *         country_code: "us",
 *         // Photon-specific: the place name (e.g. "Empire State Building")
 *         name: "Empire State Building",
 *       }
 *     },
 *     ...
 *   ]
 *
 * Query params:
 *   q    — the search query (min 3 chars)
 *   lat  — optional latitude for location biasing (e.g. 51.5 for London)
 *   lon  — optional longitude for location biasing (e.g. -0.15 for London)
 *   lang — optional language for results (e.g. "en", "de") — Photon supports a few
 *   limit — optional max results (default 5, max 50)
 */

const CACHE_TTL_MS = 60_000; // 60s — matches the Nominatim proxy

interface CacheEntry {
  data: unknown;
  ts: number;
}
const cache = new Map<string, CacheEntry>();

const PHOTON_USER_AGENT =
  process.env.PHOTON_USER_AGENT ||
  'Fieseros-Onboarding/1.0 (onboarding@fieseros.app)';

interface PhotonFeature {
  type: 'Feature';
  properties: {
    osm_type?: string;
    osm_id?: number;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat] — GeoJSON convention!
  };
  // Photon sometimes returns an extent (bounding box) — we don't use it.
}

interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

/**
 * Normalize a Photon feature into the same shape as a Nominatim result so the
 * AddressAutocomplete component can consume either source without changes.
 *
 * GeoJSON convention: coordinates are [lon, lat] (longitude first!).
 */
function normalizePhotonFeature(feature: PhotonFeature, index: number) {
  const p = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [];

  // Build display_name: prefer name + street + city + country.
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  const streetParts = [p.housenumber, p.street].filter(Boolean);
  if (streetParts.length) parts.push(streetParts.join(' '));
  if (p.district && p.district !== p.city) parts.push(p.district);
  if (p.city) parts.push(p.city);
  if (p.state && p.state !== p.city) parts.push(p.state);
  if (p.country) parts.push(p.country);
  const displayName = parts.join(', ') || p.name || '';

  return {
    // Photon doesn't have a stable place_id — synthesize one from osm_id + index.
    place_id: p.osm_id ? `photon_${p.osm_id}_${index}` : `photon_${index}`,
    display_name: displayName,
    type: p.type || p.osm_value || 'address',
    lat: typeof lat === 'number' ? String(lat) : '',
    lon: typeof lon === 'number' ? String(lon) : '',
    address: {
      house_number: p.housenumber || undefined,
      road: p.street || undefined,
      suburb: p.locality || undefined,
      neighbourhood: p.district || undefined,
      city: p.city || undefined,
      town: undefined,
      village: undefined,
      municipality: undefined,
      county: p.county || undefined,
      state: p.state || undefined,
      region: undefined,
      postcode: p.postcode || undefined,
      country: p.country || undefined,
      country_code: p.countrycode || undefined,
      // Photon-specific (not in Nominatim shape, but the component reads it
      // to show the place name when the street is empty):
      name: p.name || undefined,
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const lang = searchParams.get('lang') || 'en';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5));

  if (q.length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters' },
      { status: 400 },
    );
  }

  // Build cache key (include lat/lon/lang/limit so biased queries don't collide).
  const cacheKey = `${q}|${lat || ''}|${lon || ''}|${lang}|${limit}`;

  // Cache hit?
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'HIT',
        'Cache-Control': 'no-store',
        'X-Geocode-Source': 'photon',
      },
    });
  }

  // Build the upstream Photon URL.
  // Photon API docs: https://photon.komoot.io/
  const upstreamUrl = new URL('https://photon.komoot.io/api/');
  upstreamUrl.searchParams.set('q', q);
  upstreamUrl.searchParams.set('limit', String(limit));
  if (lang) upstreamUrl.searchParams.set('lang', lang);
  // Location bias: pass lat + lon to prioritize results near these coords.
  // Photon uses these to sort results by distance (closer = higher rank).
  const latNum = lat ? parseFloat(lat) : NaN;
  const lonNum = lon ? parseFloat(lon) : NaN;
  if (!isNaN(latNum) && !isNaN(lonNum)) {
    upstreamUrl.searchParams.set('lat', String(latNum));
    upstreamUrl.searchParams.set('lon', String(lonNum));
  }

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        // Photon doesn't require a User-Agent, but it's good practice.
        'User-Agent': PHOTON_USER_AGENT,
      },
    });

    if (!upstream.ok) {
      // Pass through 429 / 503 verbatim so the client can show a meaningful
      // "rate limited, try again later" message.
      return NextResponse.json(
        { error: `Upstream Photon returned ${upstream.status}` },
        {
          status: upstream.status === 429 ? 429 : 502,
          headers: { 'Access-Control-Allow-Origin': '*' },
        },
      );
    }

    const data = (await upstream.json()) as PhotonResponse;

    // Normalize Photon's GeoJSON into the same array shape as Nominatim.
    const features = Array.isArray(data.features) ? data.features : [];
    const normalized = features.map(normalizePhotonFeature);

    // Cache the normalized result.
    cache.set(cacheKey, { data: normalized, ts: Date.now() });

    return NextResponse.json(normalized, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'MISS',
        'Cache-Control': 'no-store',
        'X-Geocode-Source': 'photon',
      },
    });
  } catch (err) {
    console.error('[/api/geocode/photon] upstream fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to reach Photon geocoding service' },
      {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
    );
  }
}
