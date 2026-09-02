/**
 * Unified GPS freshness contract — the SINGLE source of truth for live/stale/
 * offline thresholds across the entire codebase.
 *
 * Phase F-3: Previously there were THREE different freshness contracts:
 *   - PWA (use-gps-tracking.tsx): 5min stale / 30min offline
 *   - positions API (positions/route.ts): 30s live / 5min stale / 5min+ offline
 *   - dispatch map (live-dispatch-map.tsx): 30s fresh / 60s stale / 30min offline
 *
 * This caused inconsistent UI: the PWA could say "LIVE" while the dispatch map
 * said "STALE" for the same technician at the same moment. This module
 * centralizes the contract so every consumer derives freshness from the same
 * thresholds.
 *
 * Contract:
 *   <  LIVE_MS (30s)    → 'live'    (actively transmitting)
 *   30s–STALE_MS (5min) → 'stale'   (may have a watcher issue)
 *   >  STALE_MS (5min)  → 'offline' (not transmitting)
 *
 * Usage:
 *   import { deriveGpsStatus, LOCATION_FRESHNESS } from '@/lib/gps-freshness';
 *   const status = deriveGpsStatus(lastGpsAt); // 'live' | 'stale' | 'offline'
 */

/** The canonical freshness thresholds. Do NOT define these inline elsewhere. */
export const LOCATION_FRESHNESS = {
  /** < 30s since last GPS ping → 'live' */
  LIVE_MS: 30 * 1000,
  /** 30s–5min since last GPS ping → 'stale'; > 5min → 'offline' */
  STALE_MS: 5 * 60 * 1000,
} as const;

export type GpsStatus = 'live' | 'stale' | 'offline';

/**
 * Derive GPS status from the latest GPSLocation.capturedAt timestamp.
 *
 * @param lastGpsAt - ISO string (or null) of the latest GPS ping. Must be the
 *   GPS telemetry timestamp (GPSLocation.capturedAt), NOT Employee.lastSeenAt
 *   (which can be updated by non-GPS flows like clock-in / API calls).
 * @returns 'live' | 'stale' | 'offline'
 *   - null / unparseable / NaN → 'offline'
 *   - > STALE_MS ago → 'offline'
 *   - LIVE_MS–STALE_MS ago → 'stale'
 *   - < LIVE_MS ago → 'live'
 */
export function deriveGpsStatus(lastGpsAt: string | null | undefined): GpsStatus {
  if (!lastGpsAt) return 'offline';
  const ts = new Date(lastGpsAt).getTime();
  if (Number.isNaN(ts)) return 'offline';
  const ageMs = Date.now() - ts;
  if (ageMs > LOCATION_FRESHNESS.STALE_MS) return 'offline';
  if (ageMs > LOCATION_FRESHNESS.LIVE_MS) return 'stale';
  return 'live';
}

/**
 * Human-readable label for a GPS status, for UI badges + tooltips.
 */
export function gpsStatusLabel(status: GpsStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'stale':
      return 'Stale';
    case 'offline':
    default:
      return 'Offline';
  }
}
