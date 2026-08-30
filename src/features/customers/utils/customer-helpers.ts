/**
 * Customer 360° feature helpers.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure helpers, status-config maps, health-score math, and tag parsing for
 * the Customer 360° view, the 8 tab sections, the sub-components, and the
 * create-booking / create-invoice / edit-note / delete-note dialogs.
 *
 * Where a helper duplicates a shared util (`formatDate`, `formatDateTime`,
 * `timeAgo`, `getInitials`), we re-export from `@/lib/format-utils` so the
 * view code has a single import surface.
 */

import {
  Calendar, CheckCircle2, MessageSquare, Wrench, DollarSign, Send,
  StickyNote, Phone, FileText, ArrowUpRight, Receipt, Star, Sparkles,
  X, ShoppingCart, Package, Truck,
} from 'lucide-react';
import type {
  BookingStatusConfig,
  HealthScoreInputs,
  InvoiceStatusConfig,
  OrderStatusBadgeConfig,
  QuoteStatusConfig,
  StatusConfig,
  TimelineEventTypeConfig,
} from '../types';

// ─── Re-export shared date/initials helpers ──────────────────────────────────

export {
  formatDate,
  formatDateTime,
  timeAgo,
  getInitials,
} from '@/lib/format-utils';

// ─── Date group predicates (used by groupedTimeline in the parent) ───────────

export function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function isYesterday(date: Date | string): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

export function isThisWeek(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

// ─── Tag helpers ─────────────────────────────────────────────────────────────

/**
 * Get a left-border color class for a customer card based on its primary tag.
 */
export function getTagBorderColor(tags: string[]): string {
  if (tags.includes('VIP')) return 'border-l-amber-500';
  if (tags.includes('High-Value')) return 'border-l-teal-500';
  return 'border-l-emerald-500';
}

/**
 * Parse a `tags` field that may arrive as an array, a JSON string, or a
 * scalar string. Always returns a string array (empty if missing/invalid).
 */
export function parseTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : raw ? [raw] : [];
    } catch {
      return raw ? [raw] : [];
    }
  }
  return [];
}

// ─── Health score math ───────────────────────────────────────────────────────

/**
 * Compute a 0–100 health score from revenue, completed jobs, rating,
 * engagement, and outstanding balance.
 *
 *   • Revenue contribution        0–30
 *   • Completed jobs contribution 0–25
 *   • Rating contribution         0–25
 *   • Engagement (bookings)       0–20
 *   • Outstanding balance penalty up to −15
 */
export function computeHealthScore(stats: HealthScoreInputs): number {
  let score = 0;
  score += Math.min(30, (stats.totalRevenue / 5000) * 30);
  score += Math.min(25, stats.completedJobs * 5);
  score += stats.avgRating > 0 ? (stats.avgRating / 5) * 25 : 0;
  score += Math.min(20, stats.totalBookings * 4);
  if (stats.outstandingBalance > 0) {
    score -= Math.min(15, (stats.outstandingBalance / 3000) * 15);
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Tailwind text color class based on a health score. */
export function healthScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

/** Tailwind SVG stroke color class based on a health score. */
export function healthScoreStroke(score: number): string {
  if (score >= 70) return 'stroke-emerald-500';
  if (score >= 40) return 'stroke-amber-500';
  return 'stroke-red-500';
}

/** Human-readable label for a health score. */
export function healthScoreLabel(score: number): string {
  if (score >= 70) return 'Excellent';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

// ─── Status config maps (single source of truth for tab badges) ──────────────

export const jobStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  assigned: { label: 'Assigned', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

export const invoiceStatusConfig: Record<string, InvoiceStatusConfig> = {
  draft: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: FileText },
  sent: { label: 'Sent', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200', icon: Send },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: Send },
  pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: Send },
  paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-100 border-red-200', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: X },
};

export const quoteStatusConfig: Record<string, QuoteStatusConfig> = {
  draft: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  sent: { label: 'Sent', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  expired: { label: 'Expired', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export const bookingStatusConfig: Record<string, BookingStatusConfig> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  no_show: { label: 'No Show', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 border-amber-200',
  'Repeat Customer': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'High-Value': 'bg-teal-100 text-teal-700 border-teal-200',
  'At-Risk': 'bg-red-100 text-red-700 border-red-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
  repeat: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'New Lead': 'bg-sky-100 text-sky-700 border-sky-200',
  Commercial: 'bg-violet-100 text-violet-700 border-violet-200',
};

export const timelineEventTypeConfig: Record<string, TimelineEventTypeConfig> = {
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  booking: { icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_update: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  campaign: { icon: Send, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  note: { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  call: { icon: Phone, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  form_submission: { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  lead: { icon: ArrowUpRight, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_created: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  job_completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_paid: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_created: { icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  review: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  whatsapp_sent: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  lead_converted: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  order_created: { icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  order_delivered: { icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  order_shipped: { icon: Truck, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  order_cancelled: { icon: X, color: 'text-red-600', bg: 'bg-red-500/10' },
};

export const ORDER_STATUS_BADGE: Record<string, OrderStatusBadgeConfig> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  processing: { label: 'Processing', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  shipped: { label: 'Shipped', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200' },
  refunded: { label: 'Refunded', cls: 'bg-muted text-muted-foreground border-border' },
};

// ─── Timeline grouping (used by Overview tab) ────────────────────────────────

/**
 * Group timeline events into Today / Yesterday / This Week / Earlier buckets.
 *
 * Events without a `createdAt` are placed in "Earlier".
 */
export function groupTimelineEvents(events: any[]): { label: string; events: any[] }[] {
  const groups: { label: string; events: any[] }[] = [];
  const today: any[] = [];
  const yesterday: any[] = [];
  const thisWeek: any[] = [];
  const earlier: any[] = [];

  events.forEach(event => {
    if (!event.createdAt) {
      earlier.push(event);
      return;
    }
    if (isToday(event.createdAt)) today.push(event);
    else if (isYesterday(event.createdAt)) yesterday.push(event);
    else if (isThisWeek(event.createdAt)) thisWeek.push(event);
    else earlier.push(event);
  });

  if (today.length > 0) groups.push({ label: 'Today', events: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', events: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', events: thisWeek });
  if (earlier.length > 0) groups.push({ label: 'Earlier', events: earlier });

  return groups;
}
