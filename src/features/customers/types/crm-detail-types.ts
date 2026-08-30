/**
 * CRM detail-page types — shared between crm-view.tsx and the customer-detail-page
 * component extracted in Phase 6D.
 *
 * These types are CRM-specific (the Customer shape used by the CRM list +
 * detail views, plus the ref types for the customer's jobs/assets/quotes/
 * invoices/timeline). They are intentionally separate from the Customer 360°
 * types in `./index.ts` (which use a different, more dynamic Customer shape
 * sourced from a different Supabase RPC).
 *
 * USAGE:
 *   import type {
 *     CrmCustomer, TimelineEntry, JobRef, AssetRef, QuoteRef, InvoiceRef,
 *   } from '@/features/customers/types/crm-detail-types';
 *
 * Extracted from src/components/views/crm-view.tsx in Phase 6D.
 */

export interface CrmCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  whatsappId?: string;
  createdAt: string;
  updatedAt: string;
  portalEnabled?: boolean;
  invitationStatus?: string;
  activatedAt?: string | null;
}

export interface TimelineEntry {
  id: string;
  entryType: string;
  title: string;
  description?: string;
  eventDate: string;
  actorName?: string;
  metadataJson?: string;
}

export interface JobRef {
  id: string;
  title: string;
  status: string;
  scheduledDate?: string;
  totalAmount?: number;
}

export interface AssetRef {
  id: string;
  name: string;
  assetType: string;
  brand?: string;
  model?: string;
  status: string;
}

export interface QuoteRef {
  id: string;
  title: string;
  status: string;
  total: number;
  currency?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  itemsJson?: string;
  addOnsJson?: string;
  validUntil?: string;
  jobId?: string | null;
  customerId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceRef {
  id: string;
  number: string;
  status: string;
  amount: number;
  tax?: number;
  discount?: number;
  total: number;
  currency?: string;
  invoiceType?: string;
  dueDate?: string;
  sentAt?: string;
  paidAt?: string;
  jobId?: string | null;
  customerId?: string | null;
  createdAt: string;
}
