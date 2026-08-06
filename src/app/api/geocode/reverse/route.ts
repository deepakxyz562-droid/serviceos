import { NextRequest, NextResponse } from 'next/server'
import { setDefaultResultOrder } from 'dns'

// Force IPv4-first DNS resolution. Nominatim's IPv6 endpoint is unreachable
// from this sandbox (no IPv6 route), so Node's fetch (undici) — which
// defaults to verbatim Happy Eyeballs — times out for ~10s before failing
// with ETIMEDOUT. Setting ipv4first makes the resolver return A records
// before AAAA, so fetch connects over IPv4 immediately. Mirrors the
// /api/geocode/search route's setup.
setDefaultResultOrder('ipv4first')

export const dynamic = 'force-dynamic'

/**
 * GET /api/geocode/reverse?lat=<lat>&lng=<lng>
 *
 * Server-side proxy for OpenStreetMap Nominatim /reverse.
 *
 * Why a proxy? Browsers strip the `User-Agent` header (it's a "forbidden"
 * header in fetch/XHR), so direct browser calls to Nominatim violate their
 * usage policy (which requires an identifying User-Agent) and get
 * aggressively rate-limited (429s). By moving the call to the server we can
 * set the required User-Agent header.
 *
 * Note: query param is `lng` (not `lon`) for consistency with the rest of
 * the Fieseros codebase (e.g. marketplace-ranking, use-user-location).
 *
 * Returns: { city, state, country, countryCode, lat, lng, displayName }
 *   where `city` is parsed from Nominatim's
 *   address.city || address.town || address.village ||
 *   address.municipality || address.county
 *
 * 60-second in-memory cache keyed by lat,lng rounded to 4 decimals (~11m
 * precision) to maximize cache hits while staying within Nominatim's
 * 1 req/sec rate limit.
 */

const CACHE_TTL_MS = 60_000 // 60s

interface CacheEntry {
  data: unknown
  ts: number
}
const cache = new Map<string, CacheEntry>()

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT ||
  'Fieseros-Onboarding/1.0 (onboarding@fieseros.app)'

interface NominatimReverseResponse {
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    borough?: string
    suburb?: string
    city_district?: string
    state?: string
    country?: string
    country_code?: string
  }
  display_name?: string
  lat?: string
  lon?: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const latStr = searchParams.get('lat') || ''
  const lngStr = searchParams.get('lng') || ''
  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: 'Invalid lat/lng coordinates' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }

  // Cache key: round to 4 decimals (~11m precision) to maximize cache hits
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'HIT',
        'Cache-Control': 'no-store',
      },
    })
  }

  // Forward to Nominatim /reverse with the identifying User-Agent header.
  const upstreamUrl =
    'https://nominatim.openstreetmap.org/reverse?format=json' +
    `&lat=${lat}&lon=${lng}&addressdetails=1&zoom=10`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
    })

    if (!upstream.ok) {
      // Pass through 429 verbatim so the client can show a meaningful
      // "rate limited, try again later" message; everything else becomes 502.
      return NextResponse.json(
        { error: `Upstream Nominatim returned ${upstream.status}` },
        {
          status: upstream.status === 429 ? 429 : 502,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    const data = (await upstream.json()) as NominatimReverseResponse
    const addr = data.address || {}

    // Pick the most specific city-level field available
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.borough ||
      addr.suburb ||
      addr.city_district ||
      addr.county ||
      null

    if (!city && !data.display_name) {
      return NextResponse.json(
        { error: 'No address found for these coordinates' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const result = {
      city,
      state: addr.state || null,
      country: addr.country || null,
      countryCode: addr.country_code?.toUpperCase() || null,
      lat,
      lng,
      displayName: data.display_name || null,
    }

    cache.set(cacheKey, { data: result, ts: Date.now() })

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'MISS',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/geocode/reverse] upstream fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to reach geocoding service' },
      { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}
