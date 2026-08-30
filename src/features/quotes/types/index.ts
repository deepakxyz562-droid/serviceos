/**
 * Quote types — shared between quotes-view.tsx, the quote feature
 * components, and other views that consume quote data (e.g. customer-360,
 * dashboard, AiQuoteGeneratorDialog).
 *
 * This file is the single source of truth for Quote-related TypeScript types.
 * Extracted from src/components/views/quotes-view.tsx in Phase 5B.
 *
 * USAGE:
 *   import type {
 *     QuoteStatus, ServiceCatalogItem, QuoteServiceItem, QuoteAddOn,
 *     Quote, QuoteFormData, Customer,
 *   } from '@/features/quotes/types';
 */

// ============================================================
// Quote domain
// ============================================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/**
 * Service-catalog row (the hard-coded mock catalog the New Quote form's
 * <Select> options draw from). Each entry maps to a `QuoteServiceItem`
 * template when chosen in the form.
 */
export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  description?: string;
}

/**
 * A single line item on a Quote — picked from the service catalog or
 * created as a "Custom item". Stored on the Quote row inside `itemsJson`
 * (JSON string) by the API.
 */
export interface QuoteServiceItem {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * An optional add-on attached to a Quote (flat fee, not qty-multiplied).
 * Stored on the Quote row inside `addOnsJson` (JSON string) by the API.
 */
export interface QuoteAddOn {
  id: string;
  name: string;
  price: number;
}

/**
 * A quote row as returned by /api/quotes, mapped through `normalizeQuote`
 * into the local shape. The raw API stores `itemsJson` / `addOnsJson` as
 * JSON strings (POST/PUT) OR as pre-parsed `services` / `addOns` arrays
 * (GET), and `discountValue` is computed by the normalizer when missing.
 */
export interface Quote {
  id: string;
  title: string;
  description?: string;
  customerName: string;
  customerId: string;
  customerPhone?: string;
  services: QuoteServiceItem[];
  addOns: QuoteAddOn[];
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  validUntil: string;
  whatsappSent: boolean;
  emailSent: boolean;
  createdAt: string;
  /** Transaction currency (defaults to the company base currency). */
  currency?: string;
  /** Exchange rate captured at creation time. */
  exchangeRate?: number;
  /** Base currency code at creation time. */
  baseCurrency?: string;
  /** Total amount converted into the base currency at creation time. */
  baseAmount?: number;
}

/**
 * Form state shape for the New/Edit Quote form (renderNewQuotePage).
 * Mirrors the Quote interface but without derived totals / send flags /
 * server-side metadata.
 */
export interface QuoteFormData {
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  services: QuoteServiceItem[];
  addOns: QuoteAddOn[];
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  taxRate: number;
  validUntil: string;
}

/**
 * Customer record used by the customer picker. Mirrors the shape returned
 * by /api/customers (subset relevant to the quotes view).
 */
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  workspaceId?: string;
  preferredCurrency?: string;
}
