import { createHash } from 'crypto';
import { moneyMinor } from '../../../shared/money';

export interface PricedItem { productId: string; name: string; qty: number; price: number; amount: number }
export function priceOrder(config: { catalogJson: string; fieldsJson: string }, rawItems: unknown, publicOrder: boolean, promotion?: { id: string; type: string; value: number; minSpend: number; maxDiscount?: number | null }) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 200) throw new Error('INVALID_ITEMS');
  const catalog: Array<{ id: string; name: string; price: number; isActive?: boolean }> = JSON.parse(config.catalogJson || '[]');
  const fields = JSON.parse(config.fieldsJson || '{}');
  const items: PricedItem[] = rawItems.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('INVALID_ITEMS');
    const qty = Number(raw.qty);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 100000) throw new Error('INVALID_QUANTITY');
    const matches = catalog.filter((p) => raw.productId ? p.id === raw.productId : !publicOrder && p.name === raw.name);
    if (matches.length !== 1 || matches[0].isActive === false) throw new Error('PRODUCT_UNAVAILABLE');
    const product = matches[0];
    const price = moneyMinor(product.price, true) / 100;
    return { productId: product.id, name: product.name, qty, price, amount: Math.round(price * qty * 100) / 100 };
  });
  const subtotalMinor = items.reduce((s, i) => s + moneyMinor(i.price, true) * i.qty, 0);
  let discountMinor = 0;
  if (promotion) {
    if (subtotalMinor < moneyMinor(promotion.minSpend, true)) throw new Error('PROMOTION_UNAVAILABLE');
    discountMinor = promotion.type === 'percentage' ? Math.round(subtotalMinor * promotion.value / 100) : moneyMinor(promotion.value, true);
    if (promotion.maxDiscount != null) discountMinor = Math.min(discountMinor, moneyMinor(promotion.maxDiscount, true));
    discountMinor = Math.max(0, Math.min(subtotalMinor, discountMinor));
  }
  const billing = fields.billing || {};
  // Existing published stores default to a 5% exclusive tax; retain that rule.
  const taxRate = Number(billing.taxRate ?? 5);
  const serviceRate = Number(billing.serviceChargeRate ?? 0);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || !Number.isFinite(serviceRate) || serviceRate < 0 || serviceRate > 100) throw new Error('INVALID_BILLING');
  const taxable = subtotalMinor - discountMinor;
  const taxMinor = billing.taxType === 'inclusive' ? 0 : Math.round(taxable * taxRate / 100);
  const serviceMinor = Math.round(taxable * serviceRate / 100);
  const totalMinor = taxable + taxMinor + serviceMinor;
  if (!Number.isSafeInteger(totalMinor) || totalMinor > 9000000000000) throw new Error('INVALID_AMOUNT');
  return { items, subtotalMinor, discountMinor, taxMinor, serviceMinor, totalMinor, catalogHash: createHash('md5').update(config.catalogJson + config.fieldsJson).digest('hex') };
}
