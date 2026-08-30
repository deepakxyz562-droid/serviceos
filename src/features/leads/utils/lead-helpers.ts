/**
 * lead-helpers.ts
 * ===============
 * Lead-specific constants + pure helper functions used by leads-view.tsx
 * and the extracted lead feature components.
 *
 * Functions that duplicate shared utilities (formatDate, parseStringArray,
 * etc.) were DELETED in favour of the shared util files:
 *   - @/lib/format-utils
 *   - @/lib/json-parsers
 *
 * What's kept here is lead-specific: the 7-stage pipeline STATUS_CONFIG,
 * the SOURCE_CONFIG palette (lead sources), PRIORITY_CONFIG, the legacy
 * status-alias resolver (mapToKanbanStatus), and the two date formatters
 * that intentionally use a specific format ("dd MMM yyyy" / "dd MMM yyyy,
 * hh:mm a") different from the shared format-utils defaults.
 *
 * USAGE:
 *   import {
 *     KANBAN_STATUSES,
 *     STATUS_CONFIG,
 *     SOURCE_CONFIG,
 *     PRIORITY_CONFIG,
 *     STATUS_BAR_COLORS,
 *     EMPTY_FORM,
 *     getStatusConfig,
 *     formatDateShort,
 *     formatDateMedium,
 *     mapToKanbanStatus,
 *     parseImages,
 *     parseNotes,
 *   } from '@/features/leads/utils/lead-helpers';
 */

import { format, parseISO } from 'date-fns';
import { safeParseJson, parseStringArray } from '@/lib/json-parsers';
import type { LeadFormData } from '@/features/leads/types';

// ============================================================
// Pipeline-stage constants
// ============================================================

// 7 pipeline stages — mirrors the Deal stages used by the Sales Pipeline
// (SalesPipelineView's STAGES array). These are the canonical status values
// stored on new Lead rows. Legacy Lead rows may still hold the older values
// `new` / `quoted` / `proposal`; those are mapped via the aliases below and
// `mapToKanbanStatus` so existing data renders correctly without a migration.
export const KANBAN_STATUSES = [
  'new_lead', 'contacted', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost',
] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export interface StatusConfigEntry {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  dotColor: string;
}

export const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  new_lead: {
    label: 'New Lead',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    dotColor: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    dotColor: 'bg-amber-500',
  },
  qualified: {
    label: 'Qualified',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    dotColor: 'bg-purple-500',
  },
  quote_sent: {
    label: 'Quote Sent',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    dotColor: 'bg-orange-500',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    headerBg: 'bg-pink-500',
    headerText: 'text-white',
    dotColor: 'bg-pink-500',
  },
  won: {
    label: 'Won',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    dotColor: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    dotColor: 'bg-red-500',
  },
};

// Backwards-compatibility aliases for legacy Lead.status values. Older rows
// may still carry `new` / `quoted` / `proposal`; map them onto the canonical
// Deal-stage configs so badges, dropdowns and chart colours line up.
(STATUS_CONFIG as Record<string, StatusConfigEntry>).new = STATUS_CONFIG.new_lead;
(STATUS_CONFIG as Record<string, StatusConfigEntry>).quoted = STATUS_CONFIG.quote_sent;
(STATUS_CONFIG as Record<string, StatusConfigEntry>).proposal = STATUS_CONFIG.quote_sent;

/**
 * Resolve a Lead.status (which may be a legacy value like `new` / `quoted` /
 * `proposal` or a canonical Deal stage like `new_lead` / `quote_sent`) to its
 * STATUS_CONFIG entry. Falls back to `new_lead` for unknown values so the UI
 * always renders a sensible badge.
 */
export function getStatusConfig(status: string): StatusConfigEntry {
  return STATUS_CONFIG[status] || STATUS_CONFIG.new_lead;
}

// All statuses available for filtering (canonical Deal stages).
export const ALL_STATUSES = [
  'new_lead', 'contacted', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost',
] as const;

// Bar chart colors used by the Analytics tab. Match the status dot palette
// so chart bars line up with the kanban / table badges. Legacy aliases are
// included so historical rows still get the right colour.
export const STATUS_BAR_COLORS: Record<string, string> = {
  new_lead: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#a855f7',
  quote_sent: '#f97316',
  negotiation: '#ec4899',
  won: '#10b981',
  lost: '#ef4444',
  // Legacy aliases
  new: '#3b82f6',
  quoted: '#f97316',
  proposal: '#f97316',
};

// ============================================================
// Source + priority config
// ============================================================

export interface SourceConfigEntry {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Source labels + color palette. Covers every value the codebase writes
// (webform / jotform / typeform / google-forms / ai_receptionist /
// google_ads / meta_ads / lead_discovery / public_booking / public_quote /
// public_request / hosted_link / form / embed / api / webhook / email /
// sms / phone / justdial / marketplace) plus the original 8
// (website / whatsapp / wordpress / google / facebook / instagram /
// referral / manual). Unknown values fall through to a neutral badge in
// `renderSourceBadge` so the UI never breaks.
export const SOURCE_CONFIG: Record<string, SourceConfigEntry> = {
  // ─── Original 8 ────────────────────────────────────────────────────
  website: { label: 'Website', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  wordpress: { label: 'WordPress', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  google: { label: 'Google', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  facebook: { label: 'Facebook', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  instagram: { label: 'Instagram', color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  referral: { label: 'Referral', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  manual: { label: 'Manual', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },

  // ─── Web forms (blue) ──────────────────────────────────────────────
  webform: { label: 'Web Form', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  jotform: { label: 'JotForm', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  typeform: { label: 'Typeform', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'google-forms': { label: 'Google Forms', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  form: { label: 'Form', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  embed: { label: 'Embed', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  hosted_link: { label: 'Hosted Link', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },

  // ─── AI / automation (purple / emerald) ────────────────────────────
  ai_receptionist: { label: 'AI Receptionist', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  lead_discovery: { label: 'Lead Discovery', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },

  // ─── Public inbound pages (emerald) ────────────────────────────────
  public_booking: { label: 'Public Booking', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  public_quote: { label: 'Public Quote', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  public_request: { label: 'Public Request', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },

  // ─── Paid acquisition (red / blue) ─────────────────────────────────
  google_ads: { label: 'Google Ads', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  meta_ads: { label: 'Meta Ads', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },

  // ─── Marketplaces & directories (amber) ────────────────────────────
  justdial: { label: 'JustDial', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  marketplace: { label: 'Marketplace', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },

  // ─── System / programmatic (gray) ──────────────────────────────────
  api: { label: 'API', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  webhook: { label: 'Webhook', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  email: { label: 'Email', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  sms: { label: 'SMS', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  phone: { label: 'Phone', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

export interface PriorityConfigEntry {
  label: string;
  dotColor: string;
}

export const PRIORITY_CONFIG: Record<string, PriorityConfigEntry> = {
  low: { label: 'Low', dotColor: 'bg-gray-400' },
  medium: { label: 'Medium', dotColor: 'bg-blue-500' },
  high: { label: 'High', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgent', dotColor: 'bg-red-500' },
};

// ============================================================
// Empty form seed
// ============================================================

export const EMPTY_FORM: LeadFormData = {
  title: '',
  name: '',
  phone: '',
  email: '',
  source: 'manual',
  serviceType: '',
  serviceId: '',
  address: '',
  priority: 'medium',
  value: '',
  serviceDetails: '',
  notes: '',
  images: [],
  assessmentImages: [],
  customerId: '',
  lineItems: [],
};

// ============================================================
// Date formatters (lead-specific formats)
// ============================================================

/**
 * Format an ISO date string as "dd MMM yyyy" (e.g. "16 Aug 2025").
 * Used by the lead list table + detail dialog.
 * Returns '—' on parse failure.
 */
export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

/**
 * Format an ISO date string as "dd MMM yyyy, hh:mm a"
 * (e.g. "16 Aug 2025, 02:30 PM"). Used by the detail dialog and detail page.
 * Returns '—' on parse failure.
 */
export function formatDateMedium(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
}

// ============================================================
// Status mapping
// ============================================================

/**
 * Map an API Lead.status to one of our 7 canonical Kanban stages. Legacy
 * values (`new`, `quoted`, `proposal`) are folded onto their canonical
 * counterparts so older rows still group correctly under the new columns.
 */
export function mapToKanbanStatus(status: string): string {
  if (status === 'new') return 'new_lead';
  if (status === 'quoted' || status === 'proposal') return 'quote_sent';
  return status;
}

// ============================================================
// JSON parsers (lead-specific shapes)
// ============================================================

export interface LeadNote {
  text: string;
  createdAt: string;
  author?: string;
}

/**
 * Parse a Lead's imagesJson (a JSON-stringified string[]) into a string[].
 * Falls back to [] on any error.
 *
 * Equivalent to `parseStringArray` from @/lib/json-parsers — kept here as
 * a named re-export so legacy call sites keep working.
 */
export function parseImages(json: string | null | undefined): string[] {
  return parseStringArray(json);
}

/**
 * Parse a Lead's notesJson (a JSON-stringified LeadNote[]) into a typed
 * array. Falls back to [] on any error.
 */
export function parseNotes(json: string | null | undefined): LeadNote[] {
  return safeParseJson<LeadNote[]>(json, []);
}
