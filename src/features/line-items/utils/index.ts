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

export function lineItemsSubtotal(items: LineItem[]): number {
  return items.reduce((sum, it) => sum + lineItemTotal(it), 0);
}

/** Σ of all line-item costs. Used for the profit-margin sidebar. */
export function lineItemsTotalCost(items: LineItem[]): number {
  return items.reduce((sum, it) => sum + lineItemCost(it), 0);
}

export function parseLineItems(json: string | null | undefined): LineItem[] {
  try {
    const raw = JSON.parse(json || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((it: Record<string, unknown>) => ({
      id: (it.id as string) || newLineItemId(),
      serviceId: (it.serviceId as string) || null,
      name: (it.name as string) || '',
      quantity: String((it.quantity as number | string) ?? 1),
      unitPrice: String((it.unitPrice as number | string) ?? 0),
      unitCost: String((it.unitCost as number | string) ?? 0),
      description: (it.description as string) || '',
    }));
  } catch {
    return [];
  }
}
