/**
 * calendar-helpers.ts
 * ===================
 * Calendar-specific helper functions and constants — shared between
 * calendar-view.tsx and the calendar feature components (booking-form-dialog,
 * day-detail-dialog).
 *
 * Date/time formatting that duplicates `@/lib/format-utils` was kept there;
 * this file owns only the calendar-specific pieces (status config, calendar
 * grid math, hour/minute label formats, initials).
 *
 * USAGE:
 *   import {
 *     DAYS_OF_WEEK, MONTHS, STATUS_CONFIG, getStatusConfig, EMPTY_FORM,
 *     getCalendarDays, getWeekDays, dateKey, dateKeyFromDate, startOfDay,
 *     isToday, formatTime, formatCompactTime, formatHourLabel,
 *     formatTimeRange, getInitials,
 *   } from '@/features/calendar/utils/calendar-helpers';
 *
 * Extracted from src/components/views/calendar-view.tsx in Phase 6D.
 */

import type { BookingFormData, CalendarStatusConfig } from '@/features/calendar/types';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAYS_OF_WEEK_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const STATUS_CONFIG: Record<string, CalendarStatusConfig> = {
  pending:     { label: 'Pending',     dot: 'bg-amber-500',    bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  confirmed:   { label: 'Confirmed',   dot: 'bg-sky-500',      bg: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200' },
  assigned:    { label: 'Assigned',    dot: 'bg-teal-500',     bg: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200' },
  in_progress: { label: 'In Progress', dot: 'bg-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  completed:   { label: 'Completed',   dot: 'bg-green-500',    bg: 'bg-green-50',    text: 'text-green-700',    border: 'border-green-200' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-500',      bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200' },
  no_show:     { label: 'No Show',     dot: 'bg-gray-500',     bg: 'bg-gray-50',     text: 'text-gray-700',     border: 'border-gray-200' },
};

export function getStatusConfig(status: string): CalendarStatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

export const EMPTY_FORM = (): BookingFormData => ({
  title: '', customerName: '', employee: '', scheduledAt: '', scheduledEndTime: '',
  duration: 60, address: '', source: 'manual', notes: '',
});

// ─── Date Helpers ───────────────────────────────────────────────────────────

export function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDay || i >= firstDay + daysInMonth) {
      days.push(null);
    } else {
      days.push(i - firstDay + 1);
    }
  }
  return days;
}

export function getWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateKeyFromDate(d: Date): string {
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

// ─── Time Formatting ────────────────────────────────────────────────────────

/**
 * Format a date string as "HH:MM AM/PM" (2-digit hour). Returns '' for null.
 * NOTE: differs from `@/lib/format-utils`'s `formatTime` (which uses
 * `hour: 'numeric'` and returns '--' for null) — calendar uses 2-digit hour
 * and empty string for null to keep event chips compact.
 */
export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Compact time label using "9 AM" / "2:30 PM" style (numeric hour). Returns
 * '' for null. Used in calendar chips where space is tight.
 */
export function formatCompactTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return '';
  }
}

export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return '';
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
