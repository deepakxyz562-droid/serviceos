/**
 * format-utils.ts
 * ===============
 * Shared formatting helpers — date, time, number, file size, duration.
 *
 * These functions were duplicated across 25+ view files before this
 * consolidation. Each view had its own formatDate, formatDateTime, timeAgo,
 * etc. with slightly different implementations. This file is the single
 * source of truth.
 *
 * USAGE:
 *   import { formatDate, timeAgo, formatMinutes } from '@/lib/format-utils';
 */

// ── Date formatting ─────────────────────────────────────────────────────────

/**
 * Format a date as "Mon DD, YYYY" (e.g., "Aug 16, 2025").
 * Returns '--' for null/undefined/invalid dates.
 */
export function formatDate(dateStr?: string | null | Date): string {
  if (!dateStr) return '--';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

/**
 * Format a date+time as "Mon DD, HH:MM" (e.g., "Aug 16, 2:30 PM").
 */
export function formatDateTime(dateStr?: string | null | Date): string {
  if (!dateStr) return '--';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

/**
 * Format a time only as "HH:MM AM/PM".
 */
export function formatTime(dateStr?: string | null | Date): string {
  if (!dateStr) return '--';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '--';
  }
}

/**
 * Format a date as a short label: "Today", "Yesterday", "Mon DD".
 */
export function formatRelativeDate(dateStr?: string | null | Date): string {
  if (!dateStr) return '--';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    const now = new Date();
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, now)) return 'Today';
    if (isSameDay(d, tomorrow)) return 'Tomorrow';
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '--';
  }
}

/**
 * Relative time: "just now", "5m ago", "3h ago", "2d ago", "Mon DD".
 */
export function timeAgo(dateStr?: string | null | Date): string {
  if (!dateStr) return '--';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '--';
  }
}

// ── Duration formatting ──────────────────────────────────────────────────────

/**
 * Format minutes as "Xh Ym" (e.g., 90 → "1h 30m", 45 → "45m").
 */
export function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes < 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format seconds as HH:MM:SS (e.g., 3661 → "01:01:01").
 */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/**
 * Format seconds as a human duration: "1h 2m 3s" or "2m 3s" or "3s".
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(' ');
}

// ── Number formatting ────────────────────────────────────────────────────────

/**
 * Format a number with thousands separators (1,234,567).
 */
export function formatNumber(n: number): string {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

/**
 * Format a number as currency (e.g., 1234.5 → "$1,234.50").
 */
export function formatCurrency(n: number, currency = 'USD'): string {
  if (n == null || isNaN(n)) return '$0.00';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

// ── File size formatting ─────────────────────────────────────────────────────

/**
 * Format bytes as "X B", "X.X KB", "X.X MB".
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Today's date as ISO string (YYYY-MM-DD).
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get initials from a name (e.g., "John Doe" → "JD").
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
