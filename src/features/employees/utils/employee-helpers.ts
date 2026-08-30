/**
 * Employee feature helpers.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 *
 * Pure helpers, constants, and badge-class functions for the Employees view
 * and its 11 detail tabs. Where a helper duplicates a Phase 0 shared util
 * (getInitials, formatDate, formatMinutes, timeAgo, formatNumber), we import
 * from @/lib/format-utils instead — these are NOT redefined here.
 *
 * NOTE: The local formatTime returns "HH:MM" 24-hour format (hour12: false),
 * which is intentionally different from the shared @/lib/format-utils formatTime
 * (12-hour "HH:MM AM/PM"). Both are used in different parts of the UI.
 */

import type { CalendarBucket, PayrollPeriod } from '../types';

// ─── API URL helper ──────────────────────────────────────────────────────────

/**
 * Append the XTransformPort=3000 query param used by the dev proxy.
 * Uses '&' when the path already has a '?', otherwise '?'.
 */
export function apiUrl(path: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}XTransformPort=3000`;
}

// ─── Status / availability colors ────────────────────────────────────────────
//
// NOTE: These map availability status (available / on_job / on_leave / offline)
// — NOT the same as the shared @/lib/status-utils getStatusColor/getStatusDot
// (which maps active/inactive/suspended/invited). Both coexist.

export function getStatusColor(status: string): string {
  const normalized = status === 'busy' ? 'on_job' : status;
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    on_job: 'bg-amber-100 text-amber-700 border-amber-200',
    on_leave: 'bg-purple-100 text-purple-700 border-purple-200',
    offline: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[normalized] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getStatusDot(status: string): string {
  const normalized = status === 'busy' ? 'on_job' : status;
  const map: Record<string, string> = {
    available: 'fill-emerald-500 text-emerald-500',
    on_job: 'fill-amber-500 text-amber-500',
    on_leave: 'fill-purple-500 text-purple-500',
    offline: 'fill-slate-400 text-slate-400',
  };
  return map[normalized] || 'fill-gray-400 text-gray-400';
}

// ─── 24-hour time format (different from shared 12-hour formatTime) ──────────

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ─── Role / Status dropdown options ──────────────────────────────────────────

export const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'technician', label: 'Technician' },
  { value: 'manager', label: 'Manager' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'installer', label: 'Installer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Other' },
];

export const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'on_job', label: 'On Job' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'offline', label: 'Offline' },
];

// ─── Geo / ETA helpers (LocationTab) ──────────────────────────────────────────

/**
 * Haversine straight-line distance between two lat/lng points, in km.
 * Used by LocationTab ETA computation (no routing API call — the spec
 * explicitly says geocoding/routing is NOT required; a rough urban
 * average speed of 40 km/h is used to estimate travel time).
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rough urban travel-time estimate. 40 km/h is a typical mixed-traffic
 * urban average (per Phase 2 spec for LocationTab ETA). Returns minutes.
 */
export function estimateTravelMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 40) * 60));
}

// ─── Calendar bucketing ──────────────────────────────────────────────────────

/**
 * Date-bucket a calendar item into "Today" / "Tomorrow" / "This Week" /
 * "Upcoming" / "Past" / "Unscheduled" based on its scheduledAt timestamp.
 */
export function dateBucketKey(iso: string | null | undefined): CalendarBucket {
  if (!iso) return 'Unscheduled';
  const now = new Date();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';

  // Calendar-day boundaries in local time.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const twoDaysFromToday = new Date(startOfTomorrow);
  twoDaysFromToday.setDate(twoDaysFromToday.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (date < startOfToday) return 'Past';
  if (date < startOfTomorrow) return 'Today';
  if (date < twoDaysFromToday) return 'Tomorrow';
  if (date < startOfNextWeek) return 'This Week';
  return 'Upcoming';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Format a YYYY-MM-DD date string for use in PayrollTab query params.
 * Returns local-timezone YYYY-MM-DD (no UTC drift).
 */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function trendPct(curr: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { pct: 0, dir: 'flat' };
  if (prev === 0) return { pct: 100, dir: 'up' };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: 'flat' };
  return { pct, dir: pct > 0 ? 'up' : 'down' };
}

// ─── Badge class helpers ─────────────────────────────────────────────────────

export function jobStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    assigned: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return map[status] || 'bg-muted text-muted-foreground border-border';
}

/** Color-coded badge classes for the asset's current operational status. */
export function assetStatusBadgeClass(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'assigned':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'in_maintenance':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';
    case 'retired':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400';
    case 'lost':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    case 'damaged':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Color-coded badge classes for the asset's physical condition. */
export function assetConditionBadgeClass(condition: string): string {
  switch (condition) {
    case 'new':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'good':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'fair':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';
    case 'poor':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    case 'broken':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Color-coded badge classes for an assignment's lifecycle status. */
export function assignmentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'assigned':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'returned':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'lost':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    case 'damaged':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// ─── Document types & access levels ──────────────────────────────────────────

import { IdCard, FileBadge, FileText, Award } from 'lucide-react';

export const DOCUMENT_TYPES = [
  { key: 'driving_license', label: 'Driving License', icon: IdCard },
  { key: 'pan', label: 'PAN Card', icon: FileBadge },
  { key: 'aadhaar', label: 'Aadhaar', icon: FileBadge },
  { key: 'employment_contract', label: 'Employment Contract', icon: FileText },
  { key: 'certificate', label: 'Certificates', icon: Award },
];

export const DOCUMENT_ACCESS_LEVELS = [
  { value: 'admin', label: 'Admin only' },
  { value: 'manager', label: 'Managers' },
  { value: 'employee', label: 'Employee' },
  { value: 'customer', label: 'Customer' },
];

// ─── Equipment role gate ─────────────────────────────────────────────────────

// Roles allowed to assign / return assets. Mirrors the ASSET_WRITE_ROLES list
// in src/app/api/inventory/assets/route.ts (and the assign/return routes).
export const EQUIPMENT_WRITE_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];

// ─── Payroll period ──────────────────────────────────────────────────────────

export const PAYROLL_PERIOD_OPTIONS: { value: PayrollPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: 'current_month', label: 'Current month' },
  { value: 'last_month', label: 'Last month' },
];

/**
 * Compute the { from, to } YYYY-MM-DD pair for a given payroll period preset.
 * - 7d / 14d: from = today - N days, to = today.
 * - current_month: from = 1st of current month, to = today.
 * - last_month: from = 1st of last month, to = last day of last month.
 */
export function payrollPeriodRange(period: PayrollPeriod): { from: string; to: string } {
  const now = new Date();
  const to = toYMD(now);
  if (period === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6); // 7 days inclusive of today
    return { from: toYMD(from), to };
  }
  if (period === '14d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 13);
    return { from: toYMD(from), to };
  }
  if (period === 'current_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYMD(from), to };
  }
  // last_month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toYMD(from), to: toYMD(lastDayOfLastMonth) };
}
