/**
 * Inventory feature helpers.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure helpers, constants, and badge-class maps for the Inventory view, the
 * 6 tab sections, and the 4 form dialogs. Where a helper duplicates a shared
 * util (formatDate, formatDateTime, todayISO), we re-export from
 * `@/lib/format-utils` so the view code has a single import surface.
 *
 * `safeParseItems` (parse transfer itemsJson) is a typed wrapper around
 * `parseJsonArray` from `@/lib/json-parsers`.
 */

import { parseJsonArray } from '@/lib/json-parsers';
import type { ParsedTransferItem } from '../types';

// ─── Domain constants ────────────────────────────────────────────────────────

export const UNITS = ['each', 'kg', 'litre', 'metre', 'box', 'hour', 'pack'] as const;

export const ITEM_CATEGORIES = [
  'general',
  'tools',
  'parts',
  'consumables',
  'equipment',
  'supplies',
  'raw_materials',
  'finished_goods',
  'other',
] as const;

export const TX_TYPES = [
  'purchase', 'sale', 'transfer', 'adjustment', 'consumption', 'return',
] as const;

export const ADJUST_TYPES = ['adjustment', 'consumption', 'return', 'transfer'] as const;

export const TRANSFER_STATUSES = ['pending', 'in_transit', 'received', 'cancelled'] as const;

export const ALERT_STATUSES = ['active', 'acknowledged', 'resolved'] as const;

// ─── Badge style maps ────────────────────────────────────────────────────────

export const TX_TYPE_STYLES: Record<string, string> = {
  purchase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  sale: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  transfer: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  adjustment: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  consumption: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  return: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
};

export const TRANSFER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

export const ALERT_STATUS_STYLES: Record<string, string> = {
  active: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

// ─── Default form values ─────────────────────────────────────────────────────

export const EMPTY_ITEM_FORM = {
  name: '',
  sku: '',
  category: 'general',
  unit: 'each',
  costPrice: '0',
  salePrice: '0',
  totalStock: '0',
  reorderLevel: '0',
  reorderQty: '0',
  supplierId: '',
  barcode: '',
  description: '',
  isActive: true,
  createTrackableAsset: true,
} as const;

export const EMPTY_SUPPLIER_FORM = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  paymentTerms: '',
  currency: 'USD',
  notes: '',
} as const;

// ─── Inventory-specific helpers (no shared equivalent) ───────────────────────

/**
 * Convert a category slug like "raw_materials" into a human-readable label
 * like "Raw Materials".
 */
export function formatCategoryLabel(cat: string): string {
  return cat
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parse a stock transfer's `itemsJson` column into a typed array of line items.
 *
 * Shape: `[{ inventoryItemId: string | null, name: string, quantity: number }]`.
 * Returns `[]` on any parse error or non-array payload.
 */
export function safeParseItems(json: string | null): ParsedTransferItem[] {
  return parseJsonArray<ParsedTransferItem>(json);
}
