/**
 * LineItem types — shared between leads, jobs, quotes, and invoices.
 *
 * Extracted from leads-view.tsx (Phase 1) so that jobs-view (and other
 * views) can import line-item types without depending on a sibling view.
 */

export interface LineItem {
  id: string;
  serviceId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  /** Cost of goods/services per unit (used for profit-margin calc). Defaults to '0'. */
  unitCost?: string;
  /** Optional long-form description shown under the name. */
  description?: string;
}

export type CatalogService = {
  id: string;
  name: string;
  category: string;
  basePrice: number;
};
