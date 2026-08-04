/**
 * ip-geolocation.ts — Server-side IP-based geolocation fallback.
 *
 * Primary: Vercel's auto-injected headers (x-vercel-ip-city, -latitude,
 * -longitude, -country). Free, no API call, available on all Vercel deploys.
 *
 * Fallback: ipapi.co (for non-Vercel deploys / localhost dev). 30,000
 * requests/month free tier. Cached 24h in memory to avoid re-querying.
 *
 * Accuracy: IP geolocation is often off by 50-200km. Callers should mark
 * the result as `lowAccuracy: true` so the ranking penalizes the distance
 * weight (see marketplace-ranking.ts).
 */

import { NextRequest } from 'next/server'

export interface IpLocation {
  city: string | null
  state: string | null
  country: string | null
  countryCode: string | null
  lat: number | null
  lng: number | null
  /** Always 'ip' — signals low accuracy to the ranking function. */
  source: 'ip'
  accuracy: 'ip'
}

const EMPTY: IpLocation = {
  city: null,
  state: null,
  country: null,
  countryCode: null,
  lat: null,
  lng: null,
  source: 'ip',
  accuracy: 'ip',
}

// 24-hour in-memory cache for ipapi.co results (keyed by IP)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { data: IpLocation; ts: number }>()

/**
 * Resolve the client's approximate location from their IP address.
 * Call this from server components / API routes where you have a NextRequest.
 */
export async function getIpLocation(
  req: NextRequest
): Promise<IpLocation> {
  // ── Primary: Vercel headers ────────────────────────────────────────────
  const vercelCity = req.headers.get('x-vercel-ip-city')
  const vercelLat = req.headers.get('x-vercel-ip-latitude')
  const vercelLng = req.headers.get('x-vercel-ip-longitude')
  const vercelCountry = req.headers.get('x-vercel-ip-country')
  const vercelRegion = req.headers.get('x-vercel-ip-country-region')

  if (vercelCity || (vercelLat && vercelLng)) {
    return {
      city: vercelCity || null,
      state: vercelRegion || null,
      country: null,
      countryCode: vercelCountry || null,
      lat: vercelLat ? parseFloat(vercelLat) : null,
      lng: vercelLng ? parseFloat(vercelLng) : null,
      source: 'ip',
      accuracy: 'ip',
    }
  }

  // ── Fallback: ipapi.co (non-Vercel / localhost) ───────────────────────
  const ip = getClientIp(req)
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return EMPTY // localhost / private network — can't geolocate
  }

  // Cache hit?
  const cached = cache.get(ip)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000), // 3s timeout — don't block SSR
    })
    if (!res.ok) return EMPTY
    const data = (await res.json()) as {
      city?: string
      region?: string
      country_name?: string
      country_code?: string
      latitude?: number
      longitude?: number
      error?: boolean
    }
    if (data.error) return EMPTY

    const result: IpLocation = {
      city: data.city || null,
      state: data.region || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
      lat: data.latitude ?? null,
      lng: data.longitude ?? null,
      source: 'ip',
      accuracy: 'ip',
    }
    cache.set(ip, { data: result, ts: Date.now() })
    return result
  } catch {
    return EMPTY
  }
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  )
}
