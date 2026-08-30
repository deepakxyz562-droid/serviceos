/**
 * Portal helpers — Employee Portal constants + portal-specific formatters.
 *
 * Extracted from src/components/views/employee-portal-view.tsx (Phase 6A1).
 *
 * The shared `@/lib/format-utils` provides formatDate / formatTime / timeAgo /
 * formatMinutes (which supersede the inline versions that used to live in the
 * view). This file keeps portal-specific helpers that don't belong in the
 * shared lib:
 *
 *   - STATUS_LABELS / PRIORITY_COLORS / PRIORITY_DOTS / LIFECYCLE_LABELS /
 *     LIFECYCLE_COLORS — display maps used by every job card
 *   - formatDistance(meters) — meters → "X.X km" / "X m"
 *   - formatTimer(startIso) — elapsed shift timer as HH:MM:SS
 *
 * USAGE:
 *   import {
 *     STATUS_LABELS, PRIORITY_COLORS, PRIORITY_DOTS,
 *     LIFECYCLE_LABELS, LIFECYCLE_COLORS,
 *     formatDistance, formatTimer,
 *   } from '@/features/employee-portal/utils/portal-helpers';
 */

// ─── Display maps ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline',
  leave: 'On Leave',
  traveling: 'Traveling',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

export const PRIORITY_DOTS: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

/** Lifecycle state colors and labels. */
export const LIFECYCLE_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  travelling: 'Travelling',
  arrived: 'Arrived',
  working: 'Working',
  paused: 'Paused',
  completed: 'Completed',
};

export const LIFECYCLE_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  travelling: 'bg-purple-100 text-purple-700 border-purple-200',
  arrived: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  working: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ─── Portal-specific formatters ─────────────────────────────────────────────

/**
 * Format meters as "X.X km" or "X m".
 *
 * Used by the travel-distance summary card on the portal dashboard.
 */
export function formatDistance(meters: number): string {
  if (!meters || meters < 1) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format an elapsed timer as HH:MM:SS from a start ISO string.
 *
 * Used by the live shift/break timer that ticks every second. Returns
 * '00:00:00' for missing/negative durations so the UI always has a stable
 * width placeholder.
 */
export function formatTimer(startIso: string | null | undefined): string {
  if (!startIso) return '00:00:00';
  try {
    const diffMs = Date.now() - new Date(startIso).getTime();
    if (diffMs < 0) return '00:00:00';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } catch {
    return '00:00:00';
  }
}
