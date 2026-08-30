/**
 * invoice-helpers.ts
 * ==================
 * Invoice-specific constants + pure helper functions used by invoices-view.tsx
 * and the extracted invoice feature components.
 *
 * Functions that duplicate shared utilities (formatDate, parseStringArray,
 * etc.) were DELETED in favour of the shared util files:
 *   - @/lib/format-utils
 *   - @/lib/json-parsers
 *
 * What's kept here is invoice-specific:
 *   - STATUS_CONFIG — 6 invoice status colour/label entries (draft / sent /
 *     paid / overdue / cancelled / pending_approval).
 *   - getStatusConfig — resolves an Invoice.status to its STATUS_CONFIG entry
 *     with a `draft` fallback.
 *   - formatShortDate — "Mon DD, YYYY" formatter (matches shared format-utils
 *     `formatDate` exactly, but kept here because the invoices view uses the
 *     '—' fallback for empty strings, while shared `formatDate` returns '--').
 *   - calcSubtotal / calcTotal — invoice math (line items × tax − discount).
 *   - parseApiInvoice — converts the raw /api/invoices response shape into the
 *     local Invoice type.
 *   - EMPTY_LINE_ITEM / EMPTY_FORM / EMPTY_RECURRING_FORM / DEFAULT_INVOICE_SETTINGS
 *     — factory functions/constants for form-state seeds.
 *
 * USAGE:
 *   import {
 *     STATUS_CONFIG,
 *     DEFAULT_INVOICE_SETTINGS,
 *     EMPTY_LINE_ITEM,
 *     EMPTY_FORM,
 *     EMPTY_RECURRING_FORM,
 *     getStatusConfig,
 *     formatShortDate,
 *     calcSubtotal,
 *     calcTotal,
 *     parseApiInvoice,
 *   } from '@/features/invoices/utils/invoice-helpers';
 */

import type {
  Invoice,
  InvoiceAutomationSettings,
  InvoiceCustomer,
  InvoiceEmployee,
  InvoiceFormData,
  InvoiceJob,
  InvoiceStatus,
  LineItem,
  RecurringScheduleForm,
} from '@/features/invoices/types';

// ============================================================
// Status config — 6 invoice statuses (label + Tailwind colour palette)
// ============================================================

export interface InvoiceStatusConfigEntry {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const STATUS_CONFIG: Record<string, InvoiceStatusConfigEntry> = {
  draft: {
    label: 'Draft',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  pending_approval: {
    label: 'Pending Approval',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
};

/**
 * Resolve an Invoice.status to its STATUS_CONFIG entry. Falls back to `draft`
 * for unknown values so the UI always renders a sensible badge.
 */
export function getStatusConfig(status: string): InvoiceStatusConfigEntry {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

// ============================================================
// Default settings + form seeds
// ============================================================

export const DEFAULT_INVOICE_SETTINGS: InvoiceAutomationSettings = {
  autoCreateOnJobComplete: false,
  autoSendEmail: false,
  autoSendWhatsApp: false,
  createDepositOnBooking: false,
  depositPercentage: 30,
  enableRecurring: false,
  defaultTaxPercent: 0,
  creationMethod: 'manual',
  defaultDueDays: 15,
};

export function EMPTY_LINE_ITEM(): LineItem {
  return {
    id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    quantity: 1,
    rate: 0,
  };
}

export function EMPTY_FORM(): InvoiceFormData {
  return {
    customer: '',
    lineItems: [EMPTY_LINE_ITEM()],
    taxPercent: 18,
    discount: 0,
    dueDate: '',
    notes: '',
  };
}

export function EMPTY_RECURRING_FORM(): RecurringScheduleForm {
  return {
    name: '',
    customerId: '',
    frequency: 'monthly',
    dayOfMonth: 1,
    amount: 0,
    taxPercent: 0,
    currency: 'USD',
    notes: '',
    timezone: '',
  };
}

// ============================================================
// Date formatting (invoice-specific '—' fallback)
// ============================================================

/**
 * Format an ISO date string as "Mon DD, YYYY" (e.g. "Aug 16, 2025"). Returns
 * '—' for null/undefined/empty/invalid input. Used by the invoice list table
 * + detail page + recurring schedules list.
 *
 * Equivalent to `formatDate` from @/lib/format-utils except for the fallback
 * character ('—' here vs '--' there). Kept local so the invoices view's
 * existing '—' character is preserved verbatim.
 */
export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ============================================================
// Invoice math
// ============================================================

export function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function calcTotal(
  subtotal: number,
  taxPercent: number,
  discount: number
): number {
  const tax = subtotal * (taxPercent / 100);
  return subtotal + tax - discount;
}

// ============================================================
// API → Invoice mapper
// ============================================================

/**
 * Parse a raw invoice object returned by the API into the local Invoice shape.
 *
 * The API stores:
 *   - `number` (not invoiceNumber)
 *   - `amount` = subtotal
 *   - `tax` = absolute tax amount (not a percent)
 *   - `discount` = absolute discount amount
 *   - `total` = final total
 *   - `itemsJson` = JSON string of [{ description, quantity, rate }]
 *   - `customer`, `job`, `employee` as nested relation objects
 */
export function parseApiInvoice(raw: Record<string, unknown>): Invoice {
  let lineItems: LineItem[] = [];
  const rawItems = raw.itemsJson;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        lineItems = parsed.map(
          (it: Record<string, unknown>, idx: number) => ({
            id:
              (it.id as string) ||
              `li_${idx}_${Math.random().toString(36).slice(2, 7)}`,
            description: (it.description as string) || '',
            quantity: Number(it.quantity) || 0,
            rate: Number(it.rate) || 0,
          })
        );
      }
    } catch {
      /* ignore parse errors */
    }
  } else if (Array.isArray(rawItems)) {
    lineItems = rawItems.map((it: Record<string, unknown>, idx: number) => ({
      id:
        (it.id as string) ||
        `li_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      description: (it.description as string) || '',
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
    }));
  }

  const subtotal = Number(raw.amount) || 0;
  const taxAmount = Number(raw.tax) || 0;
  const discount = Number(raw.discount) || 0;
  const total = Number(raw.total) || 0;
  const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

  const customer = (raw.customer as InvoiceCustomer | null) || undefined;
  const job = (raw.job as InvoiceJob | null) || undefined;
  const employee = (raw.employee as InvoiceEmployee | null) || undefined;

  const dueDateRaw = raw.dueDate as string | null | undefined;
  const createdAtRaw = raw.createdAt as string | null | undefined;

  return {
    id: (raw.id as string) || '',
    number: (raw.number as string) || '',
    customerId: (raw.customerId as string) || (customer?.id as string) || '',
    customer: customer?.name || 'Unknown Customer',
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || undefined,
    lineItems,
    subtotal,
    taxPercent,
    taxAmount,
    discount,
    total,
    status: (raw.status as InvoiceStatus) || 'draft',
    dueDate: dueDateRaw ? String(dueDateRaw).split('T')[0] : '',
    createdAt: createdAtRaw ? String(createdAtRaw).split('T')[0] : '',
    paidAt: (raw.paidAt as string | null) || null,
    notes: (raw.notes as string) || '',
    jobId: (raw.jobId as string) || undefined,
    jobTitle: job?.title || undefined,
    employeeId: (raw.employeeId as string) || undefined,
    employeeName: employee?.name || undefined,
    currency: raw.currency as string | undefined,
    exchangeRate: raw.exchangeRate as number | undefined,
    baseCurrency: raw.baseCurrency as string | undefined,
    baseAmount: raw.baseAmount as number | undefined,
    itemsJson:
      typeof raw.itemsJson === 'string' ? raw.itemsJson : undefined,
    sentAt: (raw.sentAt as string | null) || null,
    invoiceType: (raw.invoiceType as Invoice['invoiceType']) || 'standard',
    milestoneIndex: (raw.milestoneIndex as number | null) ?? null,
    parentInvoiceId: (raw.parentInvoiceId as string | null) || null,
    recurrenceId: (raw.recurrenceId as string | null) || null,
    bookingId: (raw.bookingId as string | null) || null,
  };
}
