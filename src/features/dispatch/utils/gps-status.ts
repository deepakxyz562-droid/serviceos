/**
 * Standardized GPS Freshness Policy & Utilities
 * ------------------------------------------------
 * Single canonical policy across the entire dispatch system:
 *   - LIVE:        < 60 seconds
 *   - RECENT:      1 - 5 minutes
 *   - STALE:       5 - 15 minutes
 *   - UNAVAILABLE: > 15 minutes or no GPS coordinate
 */

import type { Employee, GpsFreshnessLevel, GpsStatusInfo } from '../types';

export const GPS_THRESHOLDS = {
  LIVE_MS: 60 * 1000,          // 60s
  RECENT_MS: 5 * 60 * 1000,    // 5m
  STALE_MS: 15 * 60 * 1000,    // 15m
} as const;

/** Format a timestamp into human-readable relative duration */
export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return 'Never';
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

/** Check if an employee has valid numeric GPS coordinates */
export function hasValidGps(emp: Pick<Employee, 'latitude' | 'longitude'>): boolean {
  return (
    typeof emp.latitude === 'number' &&
    typeof emp.longitude === 'number' &&
    !Number.isNaN(emp.latitude) &&
    !Number.isNaN(emp.longitude) &&
    Math.abs(emp.latitude) <= 90 &&
    Math.abs(emp.longitude) <= 180 &&
    !(emp.latitude === 0 && emp.longitude === 0)
  );
}

/** Standardized evaluation of an employee's GPS status */
export function getGpsStatusInfo(emp: Employee): GpsStatusInfo {
  if (!hasValidGps(emp)) {
    return {
      level: 'unavailable',
      label: 'GPS unavailable',
      detail: 'No location signal',
      color: 'text-slate-400 dark:text-slate-500',
      dotColor: 'bg-slate-300 dark:bg-slate-600',
      lastSeenText: 'Never',
    };
  }

  // Use authoritative GPS telemetry timestamp first, fallback to lastSeenAt
  const pingTimestamp = emp.lastGpsAt || emp.lastSeenAt;
  if (!pingTimestamp) {
    return {
      level: 'unavailable',
      label: 'GPS unavailable',
      detail: 'No timestamp',
      color: 'text-slate-400 dark:text-slate-500',
      dotColor: 'bg-slate-300 dark:bg-slate-600',
      lastSeenText: 'Never',
    };
  }

  const pingTs = new Date(pingTimestamp).getTime();
  if (Number.isNaN(pingTs)) {
    return {
      level: 'unavailable',
      label: 'GPS unavailable',
      detail: 'Invalid timestamp',
      color: 'text-slate-400 dark:text-slate-500',
      dotColor: 'bg-slate-300 dark:bg-slate-600',
      lastSeenText: 'Never',
    };
  }

  const ageMs = Date.now() - pingTs;
  const timeText = formatTimeAgo(pingTimestamp);

  if (ageMs < GPS_THRESHOLDS.LIVE_MS) {
    return {
      level: 'live',
      label: 'GPS live',
      detail: `Live · ${timeText}`,
      color: 'text-emerald-600 dark:text-emerald-400',
      dotColor: 'bg-emerald-500',
      lastSeenText: timeText,
    };
  }

  if (ageMs < GPS_THRESHOLDS.RECENT_MS) {
    return {
      level: 'recent',
      label: 'GPS recent',
      detail: `Recent · ${timeText}`,
      color: 'text-teal-600 dark:text-teal-400',
      dotColor: 'bg-teal-500',
      lastSeenText: timeText,
    };
  }

  if (ageMs < GPS_THRESHOLDS.STALE_MS) {
    return {
      level: 'stale',
      label: 'GPS stale',
      detail: `Stale · ${timeText}`,
      color: 'text-amber-600 dark:text-amber-400',
      dotColor: 'bg-amber-500',
      lastSeenText: timeText,
    };
  }

  return {
    level: 'unavailable',
    label: 'GPS offline',
    detail: `Offline · ${timeText}`,
    color: 'text-rose-500 dark:text-rose-400',
    dotColor: 'bg-rose-400',
    lastSeenText: timeText,
  };
}
