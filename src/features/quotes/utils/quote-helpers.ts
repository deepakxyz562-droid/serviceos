/**
 * quote-helpers.ts
 * ================
 * Quote-specific constants + pure helper functions used by quotes-view.tsx
 * and the extracted quote feature components.
 *
 * What's kept here is quote-specific:
 *   - STATUS_CONFIG — 5 quote status colour/label entries (draft / sent /
 *     accepted / rejected / expired). The status-specific lucide icon
 *     (`<FileText />` / `<Send />` / …) lives in `quote-shared.tsx` so this
 *     file can stay pure `.ts` (no JSX) — mirrors the Phase 5A invoice
 *     helpers pattern.
 *   - MOCK_SERVICE_CATALOG — the 10-row hard-coded service catalog the
 *     New Quote form's <Select> draws from (mirrors the Service Catalog
 *     view's seed data).
 *   - EMPTY_SERVICE_ITEM / EMPTY_ADD_ON / EMPTY_FORM — factory functions
 *     for form-state seeds.
 *   - formatShortDate — "Mon DD, YYYY" formatter (matches shared format-utils
 *     `formatDate` exactly, but kept here because the quotes view uses the
 *     '—' fallback for empty strings, while shared `formatDate` returns '--').
 *   - calcDiscount / calcSummary — quote math (services + add-ons, percentage
 *     or fixed discount, percentage tax).
 *   - normalizeQuote — converts the raw /api/quotes response shape into the
 *     local Quote type (handles both GET pre-parsed and POST/PUT raw Prisma
 *     row shapes, and back-computes discountValue when missing).
 *
 * USAGE:
 *   import {
 *     STATUS_CONFIG,
 *     MOCK_SERVICE_CATALOG,
 *     EMPTY_SERVICE_ITEM,
 *     EMPTY_ADD_ON,
 *     EMPTY_FORM,
 *     formatShortDate,
 *     calcDiscount,
 *     calcSummary,
 *     normalizeQuote,
 *   } from '@/features/quotes/utils/quote-helpers';
 */

import type {
  Customer,
  Quote,
  QuoteAddOn,
  QuoteFormData,
  QuoteServiceItem,
  QuoteStatus,
  ServiceCatalogItem,
} from '@/features/quotes/types';

// ============================================================
// Status config — 5 quote statuses (label + Tailwind colour palette)
// ============================================================

export interface QuoteStatusConfigEntry {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export const STATUS_CONFIG: Record<QuoteStatus, QuoteStatusConfigEntry> = {
  draft: {
    label: 'Draft',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  accepted: {
    label: 'Accepted',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

// ============================================================
// Mock service catalog (10 rows)
// ============================================================

export const MOCK_SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 's1', name: 'Window Cleaning', category: 'Cleaning', basePrice: 120, description: 'Interior & exterior window cleaning' },
  { id: 's2', name: 'Gutter Cleaning', category: 'Cleaning', basePrice: 80, description: 'Full gutter clearing and flush' },
  { id: 's3', name: 'Deep House Cleaning', category: 'Cleaning', basePrice: 250, description: 'Full deep clean of property' },
  { id: 's4', name: 'Carpet Cleaning', category: 'Cleaning', basePrice: 150, description: 'Professional carpet steam clean' },
  { id: 's5', name: 'Plumbing Repair', category: 'Maintenance', basePrice: 95, description: 'General plumbing repair service' },
  { id: 's6', name: 'Electrical Work', category: 'Maintenance', basePrice: 120, description: 'Electrical repair and installation' },
  { id: 's7', name: 'Solar Panel Cleaning', category: 'Specialist', basePrice: 50, description: 'Per panel cleaning' },
  { id: 's8', name: 'Pest Control Treatment', category: 'Specialist', basePrice: 180, description: 'Full property pest treatment' },
  { id: 's9', name: 'Painting (per room)', category: 'Decorating', basePrice: 350, description: 'Full room painting service' },
  { id: 's10', name: 'Garden Maintenance', category: 'Outdoor', basePrice: 75, description: 'Lawn mowing, weeding, tidying' },
];

// ============================================================
// Form-state seed factories
// ============================================================

export function EMPTY_SERVICE_ITEM(): QuoteServiceItem {
  return {
    id: `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    serviceId: '',
    name: '',
    price: 0,
    quantity: 1,
  };
}

export function EMPTY_ADD_ON(): QuoteAddOn {
  return {
    id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    price: 0,
  };
}

export function EMPTY_FORM(): QuoteFormData {
  return {
    title: '',
    description: '',
    customerId: '',
    customerName: '',
    services: [EMPTY_SERVICE_ITEM()],
    addOns: [],
    discountType: 'fixed',
    discountValue: 0,
    taxRate: 20,
    validUntil: '',
  };
}

// ============================================================
// Date formatting (quote-specific '—' fallback)
// ============================================================

/**
 * Format an ISO date string as "Mon DD, YYYY" (e.g. "16 Aug 2025"). Returns
 * '—' for null/undefined/empty/invalid input. Used by the quote list table
 * + detail page.
 *
 * Equivalent to `formatDate` from @/lib/format-utils except for the fallback
 * character ('—' here vs '--' there) and the locale ('en-GB' here vs 'en-US'
 * there — produces "16 Aug" vs "Aug 16"). Kept local so the quotes view's
 * existing display format + '—' character are preserved verbatim.
 *
 * Accepts a `YYYY-MM-DD` string and treats it as local-time (uses
 * `+ 'T00:00:00'`) to avoid off-by-one timezone drift on date-only fields
 * like validUntil / createdAt.
 */
export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ============================================================
// Quote math
// ============================================================

export function calcDiscount(
  subtotal: number,
  type: 'fixed' | 'percentage',
  value: number
): number {
  if (type === 'percentage') return subtotal * (value / 100);
  return value;
}

export interface QuoteSummary {
  servicesTotal: number;
  addOnsTotal: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function calcSummary(
  services: QuoteServiceItem[],
  addOns: QuoteAddOn[],
  discountType: 'fixed' | 'percentage',
  discountValue: number,
  taxRate: number
): QuoteSummary {
  const servicesTotal = services.reduce((s, item) => s + item.price * item.quantity, 0);
  const addOnsTotal = addOns.reduce((s, a) => s + a.price, 0);
  const subtotal = servicesTotal + addOnsTotal;
  const discount = calcDiscount(subtotal, discountType, discountValue);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;
  return { servicesTotal, addOnsTotal, subtotal, discount, tax, total };
}

// ============================================================
// API → Quote mapper
// ============================================================

/**
 * Normalize a quote coming back from the API into the component's Quote type.
 *
 * The GET /api/quotes endpoint returns a pre-formatted object where
 * `services` / `addOns` are already arrays and `discountValue` is computed.
 * The POST /api/quotes and PUT /api/quotes/[id] endpoints return the raw
 * Prisma row where those arrays live inside `itemsJson` / `addOnsJson` as
 * JSON strings and `discountValue` is not present. This helper handles both
 * shapes so the rest of the UI always works against a consistent Quote.
 *
 * Customer name / phone are back-filled from the in-memory `customers` list
 * (passed by the caller) when the API response is missing them.
 */
export function normalizeQuote(raw: any, customers: Customer[]): Quote {
  let services: QuoteServiceItem[] = [];
  if (Array.isArray(raw.services)) {
    services = raw.services as QuoteServiceItem[];
  } else if (raw.itemsJson) {
    try { services = JSON.parse(raw.itemsJson) as QuoteServiceItem[]; } catch { services = []; }
  }

  let addOns: QuoteAddOn[] = [];
  if (Array.isArray(raw.addOns)) {
    addOns = raw.addOns as QuoteAddOn[];
  } else if (raw.addOnsJson) {
    try { addOns = JSON.parse(raw.addOnsJson) as QuoteAddOn[]; } catch { addOns = []; }
  }

  const customer = raw.customerId ? customers.find((c) => c.id === raw.customerId) : undefined;
  const customerName = raw.customerName || customer?.name || 'Unknown';
  const customerPhone = raw.customerPhone || customer?.phone;

  const toDateStr = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.split('T')[0];
    try { return new Date(v as any).toISOString().split('T')[0]; } catch { return ''; }
  };

  let discountValue: number;
  if (raw.discountValue !== undefined && raw.discountValue !== null) {
    discountValue = Number(raw.discountValue);
  } else if (raw.discountType === 'percentage' && Number(raw.subtotal) > 0) {
    discountValue = Math.round((Number(raw.discount) / Number(raw.subtotal)) * 100);
  } else {
    discountValue = Number(raw.discount) || 0;
  }

  return {
    id: raw.id,
    title: raw.title || '',
    description: raw.description || undefined,
    customerName,
    customerId: raw.customerId || '',
    customerPhone,
    services,
    addOns,
    subtotal: Number(raw.subtotal) || 0,
    discountType: raw.discountType === 'percentage' ? 'percentage' : 'fixed',
    discountValue,
    discount: Number(raw.discount) || 0,
    taxRate: Number(raw.taxRate) || 0,
    tax: Number(raw.tax) || 0,
    total: Number(raw.total) || 0,
    status: (raw.status as QuoteStatus) || 'draft',
    validUntil: toDateStr(raw.validUntil),
    whatsappSent: !!raw.whatsappSent,
    emailSent: !!raw.emailSent,
    createdAt: toDateStr(raw.createdAt),
    currency: raw.currency,
    exchangeRate: raw.exchangeRate !== undefined ? Number(raw.exchangeRate) : undefined,
    baseCurrency: raw.baseCurrency,
    baseAmount: raw.baseAmount !== undefined ? Number(raw.baseAmount) : undefined,
  };
}
