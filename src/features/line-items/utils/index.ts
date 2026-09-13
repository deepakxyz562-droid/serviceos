/**
 * Line-item helper functions — shared between leads, jobs, quotes, invoices.
 *
 * Extracted from leads-view.tsx (Phase 1).
 */

import type { LineItem } from '../types';

export function newLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyLineItem(): LineItem {
  return {
    id: newLineItemId(),
    serviceId: null,
    name: '',
    quantity: '1',
    unitPrice: '0',
    unitCost: '0',
    description: '',
  };
}

export function lineItemTotal(item: LineItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

/** Total cost = Σ (unitCost × quantity). Used for profit margin. */
export function lineItemCost(item: LineItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost || '0') || 0);
}

export function lineItemsSubtotal(items?: LineItem[] | null): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => sum + lineItemTotal(it), 0);
}

/** Σ of all line-item costs. Used for the profit-margin sidebar. */
export function lineItemsTotalCost(items?: LineItem[] | null): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => sum + lineItemCost(it), 0);
}

export function parseLineItems(json: string | null | undefined): LineItem[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((it: Record<string, unknown>) => {
      const priceVal =
        it.unitPrice !== undefined && it.unitPrice !== null && it.unitPrice !== ''
          ? it.unitPrice
          : it.price !== undefined && it.price !== null && it.price !== ''
          ? it.price
          : it.rate !== undefined && it.rate !== null && it.rate !== ''
          ? it.rate
          : it.unit_price !== undefined && it.unit_price !== null && it.unit_price !== ''
          ? it.unit_price
          : it.amount !== undefined && it.amount !== null && it.amount !== ''
          ? it.amount
          : 0;

      const costVal =
        it.unitCost !== undefined && it.unitCost !== null && it.unitCost !== ''
          ? it.unitCost
          : it.cost !== undefined && it.cost !== null && it.cost !== ''
          ? it.cost
          : it.unit_cost !== undefined && it.unit_cost !== null && it.unit_cost !== ''
          ? it.unit_cost
          : 0;

      const qtyVal =
        it.quantity !== undefined && it.quantity !== null && it.quantity !== ''
          ? it.quantity
          : it.qty !== undefined && it.qty !== null && it.qty !== ''
          ? it.qty
          : 1;

      return {
        id: (it.id as string) || newLineItemId(),
        serviceId: (it.serviceId as string) || null,
        name: (it.name as string) || (it.serviceName as string) || '',
        quantity: String(qtyVal),
        unitPrice: String(priceVal),
        unitCost: String(costVal),
        description: (it.description as string) || '',
      };
    });
  } catch {
    return [];
  }
}
