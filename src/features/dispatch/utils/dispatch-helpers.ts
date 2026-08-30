/**
 * dispatch-helpers.ts
 * ===================
 * Dispatch-specific constants and helper functions used by dispatch-view.tsx
 * and the extracted dispatch feature components. Pure (no React, no side
 * effects).
 *
 * USAGE:
 *   import {
 *     STALE_GPS_MS, IDLE_TECH_MS, ARRIVAL_M, ASSUMED_SPEED_KMH, OFFLINE_MS,
 *     MOVE_THRESHOLD_M,
 *     getPriorityColor, getPriorityDot, getStatusColor,
 *     getEmployeeStatusDot, getEmployeeStatusBg,
 *     formatTime, formatDate, timeAgo,
 *     parseSkills, getServiceTypeIcon,
 *     haversineMeters, haversineKm, etaMinutes,
 *     hasGps, isStaleGps, isOfflineEmp, gpsTimestamp,
 *     isIdleTech, isLateJob,
 *   } from '@/features/dispatch/utils/dispatch-helpers';
 */

import type { Employee, Job } from '@/features/dispatch/types';

// ─── Constants ──────────────────────────────────────────────────────────────

export const STALE_GPS_MS = 5 * 60 * 1000; // no ping in 5 min → stale
export const IDLE_TECH_MS = 25 * 60 * 1000; // available + no active job for 25 min → idle
export const ARRIVAL_M = 150; // within 150m of job → "arrived" hint
export const ASSUMED_SPEED_KMH = 35; // for ETA when no live speed
export const OFFLINE_MS = 30 * 60 * 1000;
/** Movement threshold (meters). Below this = GPS noise, no glide triggered. */
export const MOVE_THRESHOLD_M = 5;

// ─── Color / icon helpers ───────────────────────────────────────────────────

export function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getPriorityDot(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-400',
    medium: 'bg-amber-400',
    high: 'bg-orange-500',
    urgent: 'bg-red-500 animate-pulse',
  };
  return map[priority] || 'bg-gray-400';
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getEmployeeStatusDot(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
    leave: 'bg-amber-500',
    traveling: 'bg-sky-500',
    en_route: 'bg-sky-500',
    on_job: 'bg-amber-500',
    in_progress: 'bg-amber-500',
  };
  return map[status] || 'bg-gray-400';
}

export function getEmployeeStatusBg(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    busy: 'bg-red-100 text-red-700 border-red-200',
    offline: 'bg-gray-100 text-gray-600 border-gray-200',
    leave: 'bg-amber-100 text-amber-700 border-amber-200',
    traveling: 'bg-sky-100 text-sky-700 border-sky-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
    on_job: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getServiceTypeIcon(type: string) {
  const map: Record<string, string> = {
    delivery: '🚚', cleaning: '🧹', plumbing: '🔧', electrical: '⚡',
    hvac: '❄️', painting: '🎨', landscaping: '🌿', moving: '📦',
    installation: '🏗️', repair: '🛠️', maintenance: '⚙️', inspection: '🔍',
  };
  return map[type?.toLowerCase()] || '📋';
}

// ─── Date / time helpers ────────────────────────────────────────────────────

export function formatTime(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--'; }
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── JSON parsing ───────────────────────────────────────────────────────────

export function parseSkills(skillsStr: string): string[] {
  try { return JSON.parse(skillsStr || '[]'); } catch { return []; }
}

// ─── Geo helpers ────────────────────────────────────────────────────────────

/** Haversine distance in meters. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Haversine distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** ETA in minutes given a distance (km) and assumed speed (km/h). */
export function etaMinutes(distanceKm: number, speedKmh = ASSUMED_SPEED_KMH): number {
  if (speedKmh <= 0) return Infinity;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

// ─── GPS / employee state helpers ───────────────────────────────────────────

export function hasGps(e: { latitude?: number | null; longitude?: number | null }): boolean {
  return typeof e.latitude === 'number' && typeof e.longitude === 'number' &&
    !Number.isNaN(e.latitude) && !Number.isNaN(e.longitude);
}

/**
 * GPS freshness helpers.
 *
 * These prefer `gpsStatus` (derived from GPSLocation.capturedAt by the
 * server) when available, falling back to the legacy lastSeenAt-based
 * computation for employees that haven't been enriched yet.
 */
export function isStaleGps(e: Employee): boolean {
  if (e.gpsStatus) return e.gpsStatus !== 'live';
  if (!e.lastSeenAt) return true;
  const ts = new Date(e.lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > STALE_GPS_MS;
}

export function isOfflineEmp(e: Employee): boolean {
  if (e.gpsStatus) return e.gpsStatus === 'offline';
  if (!e.lastSeenAt) return true;
  const ts = new Date(e.lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > OFFLINE_MS;
}

/**
 * Return the most authoritative GPS timestamp for display.
 * Prefers lastGpsAt (from GPSLocation.capturedAt) over lastSeenAt.
 */
export function gpsTimestamp(e: Employee): string | null {
  return e.lastGpsAt ?? e.lastSeenAt ?? null;
}

export function isIdleTech(e: Employee, activeJobCount: number): boolean {
  return e.status === 'available' && activeJobCount === 0;
}

export function isLateJob(j: Job): boolean {
  if (!j.scheduledAt) return false;
  if (j.status === 'completed' || j.status === 'cancelled' || j.status === 'in_progress') return false;
  return new Date(j.scheduledAt).getTime() < Date.now();
}
