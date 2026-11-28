import { normalizeWhatsAppDigits } from '@/lib/bgos-business-sanitizers';
import type {
  BgosFulfillmentMode,
  BgosOrderItem,
  BgosOrderStatus,
  BgosProduct,
  BgosProductOrder,
} from '../../shared/bgos-contracts';

export const VALID_ORDER_STATUSES: readonly BgosOrderStatus[] = [
  'pending',
  'confirmed',
  'ready',
  'completed',
  'cancelled',
] as const;

export interface RawSubmittedOrderItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice?: number | null;
}

export interface LeadOrderRow {
  id: string;
  title: string | null;
  name: string;
  phone: string;
  status: string;
  value: number;
  description: string | null;
  address: string | null;
  serviceType: string | null;
  tagsJson: string;
  lineItemsJson: string;
  notesJson: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Format phone into country-aware canonical digits for WhatsApp wa.me links.
 */
export function normalizePhoneDigitsForWa(
  phone: string | null | undefined,
  countryCode?: string | null,
): string | null {
  return normalizeWhatsAppDigits(phone, countryCode);
}

export function buildWaMeUrl(
  phone: string | null | undefined,
  message?: string,
  countryCode?: string | null,
): string | null {
  const digits = normalizePhoneDigitsForWa(phone, countryCode);
  if (!digits) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/**
 * Format canonical order reference like `ORD-A1B2C3` from lead id.
 */
export function formatOrderNumber(leadId: string): string {
  const tail = String(leadId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
  return `ORD-${tail || 'ORDER1'}`;
}

export function isProductOrderLead(lead: Pick<LeadOrderRow, 'title' | 'serviceType' | 'tagsJson'>): boolean {
  const title = lead.title || '';
  const serviceType = lead.serviceType || '';
  const tags = safeParseJson<unknown[]>(lead.tagsJson, []);
  return (
    title.startsWith('[Product Order]') ||
    serviceType.startsWith('[Order') ||
    serviceType.startsWith('Product Order') ||
    (Array.isArray(tags) && tags.includes('product_order'))
  );
}

/**
 * Resolve submitted storefront order items against the catalog so prices stay authoritative.
 */
export function resolveOrderItemsForSubmission(
  submittedItems: RawSubmittedOrderItem[],
  catalogProducts: BgosProduct[],
): { items: BgosOrderItem[]; totalAmount: number } {
  const catalogById = new Map<string, BgosProduct>();
  for (const prod of catalogProducts) {
    catalogById.set(prod.id, prod);
  }

  const items: BgosOrderItem[] = [];
  let totalAmount = 0;

  for (const raw of submittedItems) {
    const qty = Math.max(1, Math.min(99, Math.round(Number(raw.quantity) || 1)));
    const matched = raw.productId ? catalogById.get(raw.productId) : undefined;
    const name = matched?.name || String(raw.name || '').trim() || 'Product';
    const rawUnit = matched ? matched.price : raw.unitPrice;
    const unitPrice =
      rawUnit !== null && rawUnit !== undefined && Number.isFinite(Number(rawUnit)) && Number(rawUnit) >= 0
        ? Number(rawUnit)
        : null;
    const lineTotal = unitPrice !== null ? Math.round(unitPrice * qty * 100) / 100 : null;
    if (lineTotal !== null) {
      totalAmount += lineTotal;
    }

    items.push({
      ...(matched?.id || raw.productId ? { productId: matched?.id || raw.productId } : {}),
      name,
      quantity: qty,
      unitPrice,
      lineTotal,
    });
  }

  return {
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export function mapOrderStatusToLeadStatus(status: BgosOrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'contacted';
    case 'ready':
      return 'qualified';
    case 'completed':
      return 'converted';
    case 'cancelled':
      return 'lost';
    case 'pending':
    default:
      return 'new';
  }
}

export function inferOrderStatusFromLead(lead: Pick<LeadOrderRow, 'status' | 'tagsJson' | 'notesJson'>): BgosOrderStatus {
  const tags = safeParseJson<unknown[]>(lead.tagsJson, []);
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.startsWith('order_status:')) {
        const candidate = tag.slice('order_status:'.length) as BgosOrderStatus;
        if ((VALID_ORDER_STATUSES as readonly string[]).includes(candidate)) {
          return candidate;
        }
      }
    }
  }

  const notes = safeParseJson<Array<Record<string, unknown>>>(lead.notesJson, []);
  if (Array.isArray(notes)) {
    for (let i = notes.length - 1; i >= 0; i -= 1) {
      const candidate = notes[i]?.orderStatus;
      if (
        typeof candidate === 'string' &&
        (VALID_ORDER_STATUSES as readonly string[]).includes(candidate)
      ) {
        return candidate as BgosOrderStatus;
      }
    }
  }

  switch ((lead.status || '').toLowerCase()) {
    case 'contacted':
      return 'confirmed';
    case 'qualified':
      return 'ready';
    case 'converted':
    case 'won':
      return 'completed';
    case 'lost':
    case 'archived':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function inferFulfillment(lead: Pick<LeadOrderRow, 'address' | 'description' | 'serviceType' | 'tagsJson'>): BgosFulfillmentMode {
  const tags = safeParseJson<unknown[]>(lead.tagsJson, []);
  if (Array.isArray(tags)) {
    if (tags.includes('delivery')) return 'delivery';
    if (tags.includes('food_order')) return 'food_order';
    if (tags.includes('in_store')) return 'in_store';
    if (tags.includes('pickup')) return 'pickup';
  }
  const combined = `${lead.serviceType || ''}\n${lead.description || ''}\n${lead.address || ''}`.toLowerCase();
  if (combined.includes('local delivery') || (lead.address && lead.address !== 'Store Pickup')) {
    return 'delivery';
  }
  return 'pickup';
}

function parseLegacySingleItem(lead: Pick<LeadOrderRow, 'serviceType' | 'description' | 'value'>): BgosOrderItem[] {
  const st = (lead.serviceType || '').trim();
  const match = st.match(/^\[Order\s*x(\d+)\]\s*(.+)$/i);
  if (match) {
    const qty = Math.max(1, Number(match[1]) || 1);
    const name = match[2].trim();
    const total = lead.value > 0 ? lead.value : null;
    const unitPrice = total !== null ? Math.round((total / qty) * 100) / 100 : null;
    return [{ name, quantity: qty, unitPrice, lineTotal: total }];
  }

  const descMatch = (lead.description || '').match(/Product Order:\s*(.+)/i);
  const qtyMatch = (lead.description || '').match(/Quantity:\s*(\d+)/i);
  const name = descMatch?.[1]?.trim() || st || 'Product Order';
  const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1]) || 1) : 1;
  const total = lead.value > 0 ? lead.value : null;
  const unitPrice = total !== null ? Math.round((total / qty) * 100) / 100 : null;
  return [{ name, quantity: qty, unitPrice, lineTotal: total }];
}

function extractCustomerNotes(description: string | null): string | null {
  if (!description) return null;
  const notesMatch = description.match(/Notes:\s*([^\n]+)/i);
  if (notesMatch?.[1]?.trim()) return notesMatch[1].trim();
  const cleaned = description
    .split('\n')
    .filter((line) => !/^(Product Order:|Quantity:|Fulfillment:|Location:|Order Total:|Items:)/i.test(line.trim()))
    .join('\n')
    .trim();
  return cleaned || null;
}

export function extractOrderFromLead(
  lead: LeadOrderRow,
  currency = 'INR',
  countryCode?: string | null,
): BgosProductOrder {
  const rawItems = safeParseJson<unknown[]>(lead.lineItemsJson, []);
  const parsedItems: BgosOrderItem[] = Array.isArray(rawItems)
    ? rawItems
        .map((entry): BgosOrderItem | null => {
          if (!entry || typeof entry !== 'object') return null;
          const obj = entry as Record<string, unknown>;
          const name = typeof obj.name === 'string' ? obj.name.trim() : '';
          if (!name) return null;
          const quantity = Math.max(1, Math.round(Number(obj.quantity) || 1));
          const unitPrice =
            obj.unitPrice !== null && obj.unitPrice !== undefined && Number.isFinite(Number(obj.unitPrice))
              ? Number(obj.unitPrice)
              : null;
          const lineTotal =
            obj.lineTotal !== null && obj.lineTotal !== undefined && Number.isFinite(Number(obj.lineTotal))
              ? Number(obj.lineTotal)
              : unitPrice !== null
                ? Math.round(unitPrice * quantity * 100) / 100
                : null;
          return {
            ...(typeof obj.productId === 'string' && obj.productId ? { productId: obj.productId } : {}),
            name,
            quantity,
            unitPrice,
            lineTotal,
          };
        })
        .filter((x): x is BgosOrderItem => Boolean(x))
    : [];

  const items = parsedItems.length > 0 ? parsedItems : parseLegacySingleItem(lead);
  const fulfillment = inferFulfillment(lead);
  const status = inferOrderStatusFromLead(lead);
  const orderNumber = formatOrderNumber(lead.id);
  const computedSum = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const totalAmount = lead.value > 0 ? lead.value : Math.round(computedSum * 100) / 100;
  const msg = buildOrderCustomerWhatsappMessage({
    orderNumber,
    customerName: lead.name,
    items,
    fulfillment,
    status,
    totalAmount,
    currency,
  });

  const effectiveCountry = countryCode || (currency === 'INR' ? 'IN' : 'US');

  return {
    id: lead.id,
    orderNumber,
    customerName: lead.name,
    customerPhone: lead.phone,
    fulfillment,
    address: lead.address && lead.address !== 'Store Pickup' ? lead.address : null,
    notes: extractCustomerNotes(lead.description),
    items,
    totalAmount,
    currency,
    status,
    leadStatus: lead.status,
    whatsappUrl: buildWaMeUrl(lead.phone, msg, effectiveCountry),
    createdAt: new Date(lead.createdAt).toISOString(),
    updatedAt: new Date(lead.updatedAt).toISOString(),
  };
}

export function buildOrderCustomerWhatsappMessage(params: {
  businessName?: string;
  orderNumber: string;
  customerName: string;
  items: BgosOrderItem[];
  fulfillment: BgosFulfillmentMode;
  status: BgosOrderStatus;
  totalAmount: number;
  currency: string;
  customMessage?: string;
}): string {
  if (params.customMessage?.trim()) return params.customMessage.trim();

  const symbol = params.currency === 'INR' ? '₹' : '$';
  const itemText = params.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
  const totalText = params.totalAmount > 0 ? ` (${symbol}${params.totalAmount.toLocaleString()})` : '';
  const shop = params.businessName?.trim() ? ` from ${params.businessName.trim()}` : '';

  switch (params.status) {
    case 'confirmed':
      return `Hi ${params.customerName}, your order ${params.orderNumber}${shop} for ${itemText}${totalText} is CONFIRMED! We will notify you once it is ready.`;
    case 'ready':
      return params.fulfillment === 'delivery'
        ? `Hi ${params.customerName}, your order ${params.orderNumber} (${itemText}${totalText}) is packed and out for delivery!`
        : `Hi ${params.customerName}, your order ${params.orderNumber} (${itemText}${totalText}) is ready for pickup!`;
    case 'completed':
      return `Hi ${params.customerName}, thank you for your order ${params.orderNumber}${shop}! Hope you enjoy your ${itemText}.`;
    case 'cancelled':
      return `Hi ${params.customerName}, your order ${params.orderNumber}${shop} has been cancelled. Reply here if you'd like to reorder or need help.`;
    case 'pending':
    default:
      return `Hi ${params.customerName}, thank you for placing order ${params.orderNumber}${shop} (${itemText}${totalText}). We're reviewing it now!`;
  }
}
