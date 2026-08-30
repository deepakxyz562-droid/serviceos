/**
 * Shared geocoding helpers (OpenStreetMap Nominatim).
 * ---------------------------------------------
 * Single source of truth for forward + reverse geocoding used by:
 *
 *   - POST /api/jobs            (fire-and-forget geocode on create)
 *   - PUT  /api/jobs/[id]       (fire-and-forget re-geocode on address edit)
 *   - scripts/backfill-job-coordinates.ts (resumable backfill)
 *   - /api/geocode/search + /api/geocode/reverse (public proxy routes)
 *
 * Why centralised:
 *   1. Nominatim's usage policy requires an identifying User-Agent. Centralising
 *      it means we set the right UA in one place.
 *   2. IPv6 is unreachable from this sandbox. `setDefaultResultOrder('ipv4first')`
 *      is process-scoped, so we call it as a module side-effect — every importer
 *      gets IPv4-first DNS for free.
 *   3. A shared 60-second in-memory cache dedupes the backfill (many jobs share
 *      the same city/address) and prevents hot-looping on rapid address edits.
 *   4. The tagged-union return type distinguishes "no result" from "rate limited"
 *      from "network error" — the backfill script uses this to apply exponential
 *      backoff on 429 without skipping the row.
 */

import { setDefaultResultOrder } from 'dns'

// Process-scoped side effect: force IPv4-first DNS so Nominatim's unreachable
// IPv6 endpoint doesn't trigger a 10s Happy Eyeballs timeout.
setDefaultResultOrder('ipv4first')

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT ||
  'Fieseros-Dispatch/1.0 (dispatch@fieseros.app)'

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

const CACHE_TTL_MS = 60_000 // 60s — same as the public geocode proxy
const TIMEOUT_MS = 8_000

interface CacheEntry {
  result: GeocodeResult
  ts: number
}
const cache = new Map<string, CacheEntry>()

// Cap the in-memory cache to prevent unbounded growth (memory leak guard).
// When the cap is exceeded we first drop expired entries, then evict the
// oldest (front of the Map — JS Maps preserve insertion order, so the
// front is the oldest entry, which is a reasonable LRU approximation).
const CACHE_MAX_ENTRIES = 200

/**
 * Prune the geocode cache to keep it bounded.
 *  1. Drop every entry whose TTL has expired.
 *  2. If still over the cap, evict the oldest entries (front of the Map).
 *
 * Called after every `cache.set(...)` so the cap is enforced at write
 * time, without changing the read path.
 */
function pruneCache(): void {
  const now = Date.now()
  // Step 1: drop expired entries.
  for (const [key, entry] of Array.from(cache)) {
    if (now - entry.ts > CACHE_TTL_MS) {
      cache.delete(key)
    }
  }
  // Step 2: if still over the cap, evict the oldest (front of the Map).
  if (cache.size > CACHE_MAX_ENTRIES) {
    const overflow = cache.size - CACHE_MAX_ENTRIES
    const iter = cache.keys()
    for (let i = 0; i < overflow; i++) {
      const key = iter.next().value
      if (key) cache.delete(key)
    }
  }
}

export interface GeocodeCoords {
  latitude: number
  longitude: number
  /** Human-readable label returned by Nominatim, useful for backfill logs. */
  displayName?: string
}

export type GeocodeResult =
  | ({ ok: true } & GeocodeCoords)
  | { ok: false; reason: 'no_result' | 'rate_limited' | 'network' | 'invalid_input' }

/**
 * Forward-geocode a free-form address string to lat/lng.
 *
 * Returns a tagged union so callers can distinguish "genuinely unresolvable"
 * from "rate limited, try again later". Best-effort: never throws.
 *
 * @example
 *   const r = await geocodeAddress('221B Baker Street, London')
 *   if (r.ok) {
 *     await db.job.update({ where: { id }, data: { latitude: r.latitude, longitude: r.longitude } })
 *   } else if (r.reason === 'rate_limited') {
 *     await sleep(60_000) // back off
 *   }
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    if (!address || address.trim().length < 3) {
      return { ok: false, reason: 'invalid_input' }
    }

    const trimmed = address.trim()
    const cached = cache.get(trimmed)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.result
    }

    const upstreamUrl =
      `${NOMINATIM_SEARCH_URL}?format=json` +
      `&q=${encodeURIComponent(trimmed)}` +
      '&limit=1&addressdetails=1'

    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (res.status === 429 || res.status === 503) {
      const result: GeocodeResult = { ok: false, reason: 'rate_limited' }
      cache.set(trimmed, { result, ts: Date.now() })
      pruneCache()
      return result
    }
    if (!res.ok) {
      const result: GeocodeResult = { ok: false, reason: 'network' }
      cache.set(trimmed, { result, ts: Date.now() })
      pruneCache()
      return result
    }

    const data = (await res.json()) as unknown
    if (!Array.isArray(data) || data.length === 0) {
      const result: GeocodeResult = { ok: false, reason: 'no_result' }
      cache.set(trimmed, { result, ts: Date.now() })
      pruneCache()
      return result
    }
    const first = data[0] as { lat?: string; lon?: string; display_name?: string }
    if (!first.lat || !first.lon) {
      const result: GeocodeResult = { ok: false, reason: 'no_result' }
      cache.set(trimmed, { result, ts: Date.now() })
      pruneCache()
      return result
    }

    const latitude = parseFloat(first.lat)
    const longitude = parseFloat(first.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const result: GeocodeResult = { ok: false, reason: 'no_result' }
      cache.set(trimmed, { result, ts: Date.now() })
      pruneCache()
      return result
    }

    const result: GeocodeResult = {
      ok: true,
      latitude,
      longitude,
      displayName: first.display_name,
    }
    cache.set(trimmed, { result, ts: Date.now() })
    pruneCache()
    return result
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/**
 * Reverse-geocode lat/lng to a human-readable address. Best-effort.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ ok: true; address: string } | { ok: false; reason: 'no_result' | 'rate_limited' | 'network' }> {
  try {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, reason: 'no_result' }
    }
    const upstreamUrl =
      `${NOMINATIM_REVERSE_URL}?format=json` +
      `&lat=${latitude.toFixed(6)}` +
      `&lon=${longitude.toFixed(6)}` +
      '&addressdetails=1'

    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.status === 429 || res.status === 503) {
      return { ok: false, reason: 'rate_limited' }
    }
    if (!res.ok) return { ok: false, reason: 'network' }
    const data = (await res.json()) as { display_name?: string; error?: string }
    if (!data.display_name) return { ok: false, reason: 'no_result' }
    return { ok: true, address: data.display_name }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/**
 * Convenience helper for fire-and-forget callers (POST/PUT job routes) that
 * don't need to distinguish rate-limiting from no-result — they just want
 * coords-or-null. Mirrors the original inline `geocodeAddress` signature
 * from `src/app/api/jobs/route.ts` so the refactor is a 1:1 swap.
 *
 * PROGRESSIVE FALLBACK: If the full address doesn't geocode, tries
 * progressively shorter / cleaned-up versions so imperfect user-entered
 * addresses (typos, missing city, "X in Y" phrasing, etc.) still resolve
 * to a usable lat/lng. This is critical for the Live Dispatch map — a job
 * with no coordinates can't show a destination marker, which breaks the
 * Uber-style start→end polyline.
 */
export async function geocodeAddressOrNull(
  address: string,
): Promise<{ latitude: number; longitude: number; displayName?: string } | null> {
  if (!address || address.trim().length < 3) return null;

  const trimmed = address.trim();

  // Strategy 1: try the full address as-is.
  let r = await geocodeAddress(trimmed);
  if (r.ok) return { latitude: r.latitude, longitude: r.longitude, displayName: r.displayName };

  // Strategy 2: strip "X in Y" → "Y" (common in Indian addresses like
  // "Ashiana-Digha Road in Jagat Vihar Colony, Rukanpura, Patna, 800025").
  const inMatch = trimmed.match(/^[^,]+?\s+in\s+(.+)$/i);
  if (inMatch) {
    r = await geocodeAddress(inMatch[1].trim());
    if (r.ok) return { latitude: r.latitude, longitude: r.longitude, displayName: r.displayName };
  }

  // Strategy 3: try progressively shorter comma-separated versions.
  // "A6 Shashi Garden, Mayur Vihar, Delhi, India" → try "Mayur Vihar, Delhi, India" → "Delhi, India"
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const shorter = parts.slice(i).join(', ');
    r = await geocodeAddress(shorter);
    if (r.ok) return { latitude: r.latitude, longitude: r.longitude, displayName: r.displayName };
    // Respect Nominatim's 1 req/sec policy on fallbacks.
    await new Promise((res) => setTimeout(res, 1100));
  }

  // Strategy 4: append ", India" if not already present (helps Indian
  // addresses missing country context — Nominatim sometimes needs it).
  if (!/india/i.test(trimmed)) {
    r = await geocodeAddress(`${trimmed}, India`);
    if (r.ok) return { latitude: r.latitude, longitude: r.longitude, displayName: r.displayName };
  }

  return null;
}
