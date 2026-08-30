/**
 * booking-helpers.ts
 * ==================
 * Booking-specific constants and helper functions used by booking-view.tsx
 * and the extracted booking feature components. Pure (no React, no side
 * effects).
 *
 * USAGE:
 *   import {
 *     STATUS_CONFIG, STATUS_OPTIONS, SOURCE_OPTIONS,
 *     formatScheduleDate, formatScheduleTime, formatDuration, isToday,
 *     getTransitionOptions,
 *   } from '@/features/booking/utils/booking-helpers';
 */

// ─── Status configuration ───────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'yellow',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
  no_show: {
    label: 'No Show',
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-400',
  },
};

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

export const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'form', label: 'Form' },
  { value: 'api', label: 'API' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

// ─── Date / time / duration helpers ──────────────────────────────────────────

export function formatScheduleDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatScheduleTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Status transitions ─────────────────────────────────────────────────────

export interface TransitionOption {
  to: string;
  label: string;
}

/**
 * Allowed status transitions for a given booking status. Closed statuses
 * (completed / cancelled / no_show) have no transitions.
 */
export function getTransitionOptions(status: string): TransitionOption[] {
  const transitions: Record<string, TransitionOption[]> = {
    pending: [
      { to: 'confirmed', label: 'Confirm' },
      { to: 'cancelled', label: 'Cancel' },
    ],
    confirmed: [
      { to: 'in_progress', label: 'Start' },
      { to: 'cancelled', label: 'Cancel' },
    ],
    in_progress: [
      { to: 'completed', label: 'Complete' },
      { to: 'cancelled', label: 'Cancel' },
    ],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  return transitions[status] || [];
}
