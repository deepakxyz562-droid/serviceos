/**
 * Invoice types — shared between invoices-view.tsx, the invoice feature
 * components, and other views that consume invoice data (e.g. customer-360,
 * dashboard).
 *
 * This file is the single source of truth for Invoice-related TypeScript types.
 * Extracted from src/components/views/invoices-view.tsx in Phase 5A.
 *
 * USAGE:
 *   import type {
 *     Invoice, InvoiceFormData, Customer, InvoiceAutomationSettings,
 *     RecurringSchedule, RecurringScheduleForm, RecurringFrequency,
 *   } from '@/features/invoices/types';
 */

// ============================================================
// Invoice domain
// ============================================================

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'pending_approval';

export type InvoiceType =
  | 'standard'
  | 'job_completion'
  | 'deposit'
  | 'recurring';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoiceCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface InvoiceJob {
  id: string;
  title?: string;
}

export interface InvoiceEmployee {
  id: string;
  name?: string;
}

/**
 * An invoice row as returned by /api/invoices, mapped through
 * `parseApiInvoice` into the local shape. The raw API stores `amount`
 * (subtotal), `tax` (absolute tax amount, not percent), `discount`,
 * `total`, `itemsJson` (JSON string of [{ description, quantity, rate }]),
 * and nested `customer` / `job` / `employee` relations.
 */
export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  paidAt?: string | null;
  notes: string;
  jobId?: string;
  jobTitle?: string;
  employeeId?: string;
  employeeName?: string;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseAmount?: number;
  itemsJson?: string;
  sentAt?: string | null;
  invoiceType?: InvoiceType;
  milestoneIndex?: number | null;
  parentInvoiceId?: string | null;
  recurrenceId?: string | null;
  bookingId?: string | null;
}

/**
 * Customer record used by the customer picker. Mirrors the shape returned
 * by /api/customers (subset relevant to the invoices view).
 */
export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

/**
 * Form state shape for the New/Edit Invoice form (renderNewInvoicePage).
 * Mirrors the Invoice interface but with strings for inputs.
 */
export interface InvoiceFormData {
  customer: string;
  lineItems: LineItem[];
  taxPercent: number;
  discount: number;
  dueDate: string;
  notes: string;
}

export type InvoiceAction =
  | 'send'
  | 'send_email'
  | 'send_whatsapp'
  | 'mark_paid'
  | 'reminder'
  | 'approve';

// ============================================================
// Invoice automation settings
// ============================================================

export interface InvoiceAutomationSettings {
  autoCreateOnJobComplete: boolean;
  autoSendEmail: boolean;
  autoSendWhatsApp: boolean;
  createDepositOnBooking: boolean;
  depositPercentage: number;
  enableRecurring: boolean;
  defaultTaxPercent: number;
  creationMethod: 'manual' | 'automatic' | 'approval_required' | 'recurring';
  defaultDueDays: number;
}

// ============================================================
// Recurring invoice schedules
// ============================================================

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringScheduleCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface RecurringScheduleJob {
  id: string;
  title?: string;
  jobNumber?: string;
}

export interface RecurringSchedule {
  id: string;
  name: string;
  tenantId?: string;
  customerId?: string;
  jobId?: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  amount: number;
  taxPercent?: number | null;
  currency?: string;
  itemsJson?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  lastInvoiceId?: string;
  // Phase F: IANA tz key (e.g. "Asia/Kolkata"). null = legacy server-local behavior.
  timezone?: string | null;
  // Phase D3: timestamp when the schedule was paused (null when active or fully deactivated).
  pausedAt?: string | null;
  active: boolean;
  executionCount: number;
  createdAt: string;
  customer?: RecurringScheduleCustomer | null;
  job?: RecurringScheduleJob | null;
}

export interface RecurringScheduleForm {
  name: string;
  customerId: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  amount: number;
  taxPercent: number;
  currency: string;
  notes: string;
  // Phase F: optional IANA timezone; '' = server-local (backward compat).
  timezone: string;
}
