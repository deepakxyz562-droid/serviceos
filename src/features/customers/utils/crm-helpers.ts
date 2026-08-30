/**
 * CRM helpers — shared between crm-view.tsx and the customer-detail-page
 * component extracted in Phase 6D.
 *
 * These helpers are CRM-specific (date formatters that include the year,
 * the crm-style initials helper, the simple `formatMoney` currency formatter,
 * and the invoice status ordering constant). They are intentionally separate
 * from `./customer-helpers.ts` (which is for the Customer 360° view and uses
 * the shared `@/lib/format-utils` versions).
 *
 * USAGE:
 *   import {
 *     formatDate, formatDateTime, initials, formatMoney,
 *     INVOICE_STATUS_ORDER, invoiceStatusConfig, quoteStatusConfig,
 *   } from '@/features/customers/utils/crm-helpers';
 *
 * Extracted from src/components/views/crm-view.tsx in Phase 6D.
 */

// ─── Status configs (single source of truth for tab badges + grouping) ──────
// Mirrors customer-360-view.tsx so both views render identically. NO fake
// statuses — only the 5 real Invoice statuses (draft/sent/paid/pending_approval/
// cancelled) plus legacy pending/overdue for data safety.

export interface CrmStatusConfig {
  label: string;
  color: string;
  bg: string;
}

export const invoiceStatusConfig: Record<string, CrmStatusConfig> = {
  draft:             { label: 'Draft',             color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  sent:              { label: 'Sent',              color: 'text-sky-700',          bg: 'bg-sky-100 border-sky-200' },
  pending:           { label: 'Pending',           color: 'text-amber-700',        bg: 'bg-amber-100 border-amber-200' },
  pending_approval:  { label: 'Pending Approval',  color: 'text-amber-700',        bg: 'bg-amber-100 border-amber-200' },
  paid:              { label: 'Paid',              color: 'text-emerald-700',      bg: 'bg-emerald-100 border-emerald-200' },
  overdue:           { label: 'Overdue',           color: 'text-red-700',          bg: 'bg-red-100 border-red-200' },
  cancelled:         { label: 'Cancelled',         color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

/**
 * Canonical display order for invoice status groups. Invoices are bucketed
 * by status, then rendered in this order. Unknown statuses fall through to
 * a trailing "Other" group so no invoice is silently dropped.
 */
export const INVOICE_STATUS_ORDER = [
  'paid', 'sent', 'pending_approval', 'pending', 'overdue', 'draft', 'cancelled',
];

export const quoteStatusConfig: Record<string, CrmStatusConfig> = {
  draft:    { label: 'Draft',    color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  sent:     { label: 'Sent',     color: 'text-sky-700',          bg: 'bg-sky-100 border-sky-200' },
  accepted: { label: 'Accepted', color: 'text-emerald-700',      bg: 'bg-emerald-100 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'text-red-700',          bg: 'bg-red-100 border-red-200' },
  expired:  { label: 'Expired',  color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

// ─── Money + date formatters ────────────────────────────────────────────────

/**
 * Compact currency formatter. Returns e.g. "$1,234.50" / "₹1,234" / "€1,234".
 * Falls back to the raw number on error.
 */
export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
    return `${sym}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  } catch {
    return `${amount}`;
  }
}

/**
 * Format a date as "Mon DD, YYYY" (e.g., "Aug 16, 2025"). Returns '--' on error.
 */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

/**
 * Format a date+time as "Mon DD, YYYY, HH:MM AM/PM" (e.g., "Aug 16, 2025, 2:30 PM").
 * Returns '--' on error. NOTE: includes the year, unlike the shared
 * `@/lib/format-utils`'s `formatDateTime` (which omits the year).
 */
export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

/**
 * Build initials from a name: first letter of each whitespace-separated word,
 * concatenated and sliced to 2 chars. e.g. "Jane Marie Doe" → "JM".
 */
export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
