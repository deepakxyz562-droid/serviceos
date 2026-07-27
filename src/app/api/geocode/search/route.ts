import { NextRequest, NextResponse } from 'next/server'
import { setDefaultResultOrder } from 'dns'

// Force IPv4-first DNS resolution. Nominatim's IPv6 endpoint is unreachable
// from this sandbox (no IPv6 route), so Node's fetch (undici) — which
// defaults to verbatim Happy Eyeballs — times out for ~10s before failing
// with ETIMEDOUT. Setting ipv4first makes the resolver return A records
// before AAAA, so fetch connects over IPv4 immediately. This is process-
// scoped and only affects server-side fetches (it does NOT affect the
// browser, which has its own DNS resolver).
setDefaultResultOrder('ipv4first')

export const dynamic = 'force-dynamic'

/**
 * GET /api/geocode/search?q=<query>
 *
 * Server-side proxy for OpenStreetMap Nominatim /search.
 *
 * Why a proxy? Browsers strip the `User-Agent` header (it's a "forbidden"
 * header in fetch/XHR), so direct browser calls to Nominatim violate their
 * usage policy (which requires an identifying User-Agent) and get
 * aggressively rate-limited (429s) or empty results. By moving the call
 * to the server we can set the required User-Agent header.
 *
 * Adds a 60-second in-memory cache to respect Nominatim's rate limit
 * (1 req/sec). No auth required — the data is public OSM data.
 */

const CACHE_TTL_MS = 60_000 // 60s

interface CacheEntry {
  data: unknown
  ts: number
}
const cache = new Map<string, CacheEntry>()

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT ||
  'ServiceOS-Onboarding/1.0 (onboarding@serviceos.app)'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters' },
      { status: 400 }
    )
  }

  // Cache hit?
  const cached = cache.get(q)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'HIT',
        'Cache-Control': 'no-store',
      },
    })
  }

  // Forward to Nominatim with the identifying User-Agent header.
  const upstreamUrl =
    'https://nominatim.openstreetmap.org/search?format=json' +
    `&q=${encodeURIComponent(q)}` +
    '&addressdetails=1&limit=5'

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      // Nominatim never 302s for /search, but if it did we'd want to follow
      // rather than surface a 502 to the user.
    })

    if (!upstream.ok) {
      // Pass through 429 / 503 verbatim so the client can show a
      // meaningful "rate limited, try again later" message.
      return NextResponse.json(
        { error: `Upstream Nominatim returned ${upstream.status}` },
        {
          status: upstream.status === 429 ? 429 : 502,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    const data = (await upstream.json()) as unknown

    // Cache the result.
    cache.set(q, { data, ts: Date.now() })

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Geocode-Cache': 'MISS',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/geocode/search] upstream fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to reach geocoding service' },
      {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}
