import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { atomicCommerce } from './atomic';
import { priceOrder } from './pricing';
import { counterCustomerPhone } from '../../../shared/walk-in-customer';

export async function createCommerceOrder(business: { id: string; tenantId: string | null }, body: Record<string, any>, key: string, publicOrder: boolean) {
  if (typeof key !== 'string' || key.length < 8 || key.length > 128) throw new Error('INVALID_REQUEST_KEY');
  const phone = counterCustomerPhone(body.customerPhone);
  if (publicOrder && !phone) throw new Error('CUSTOMER_REQUIRED');
  if (!['pickup','takeout','delivery','dine_in'].includes(body.deliveryType || 'pickup')) throw new Error('INVALID_ITEMS');
  const config = await db.gptformCommerceConfig.findFirst({ where: { businessId: business.id }, orderBy: { createdAt: 'asc' } })
    || (business.tenantId ? await db.gptformCommerceConfig.findFirst({ where: { businessId: business.tenantId }, orderBy: { createdAt: 'asc' } }) : null);
  if (!config || (publicOrder && !config.isActive)) throw new Error('PRODUCT_UNAVAILABLE');
  const code = typeof body.discountCode === 'string' ? body.discountCode.toUpperCase().trim() : '';
  const promotion = code ? await db.promotion.findFirst({ where: { code, tenantId: business.tenantId || business.id, isActive: true } }) : null;
  if (code && !promotion) throw new Error('PROMOTION_UNAVAILABLE');
  const quote = priceOrder(config, body.items, publicOrder, promotion || undefined);
  const clientHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const payload = {
    ...quote, clientHash, promotionQuote:promotion?{type:promotion.type,value:promotion.value,minSpend:promotion.minSpend,maxDiscount:promotion.maxDiscount}:undefined, configId: config.id, promotionId: promotion?.id,
    customerPhone: phone, customerName: typeof body.customerName === 'string' ? body.customerName.slice(0,200) : 'Guest',
    deliveryType: body.tableNumber ? 'dine_in' : body.deliveryType || 'pickup',
    deliveryAddress: body.tableNumber ? `Table #${String(body.tableNumber).slice(0,30)}` : typeof body.deliveryAddress === 'string' ? body.deliveryAddress.slice(0,1000) : undefined,
    notes: typeof body.notes === 'string' ? body.notes.slice(0,2000) : undefined,
    publicOrder, paymentMethod: publicOrder ? (body.paymentMethod === 'UPI' ? 'UPI' : 'CASH') : ['CASH','UPI','CARD','BANK_TRANSFER'].includes(body.paymentMethod) ? body.paymentMethod : 'CASH',
    whatsappConsent: body.whatsappConsent === true,
    paymentStatus: !publicOrder && (body.paymentStatus === 'PAID' || (!body.paymentStatus && (!body.paymentMethod || body.paymentMethod === 'CASH'))) ? 'PAID' : 'UNPAID',
  };
  return atomicCommerce<{ order: Record<string, any>; replayed: boolean }>('order', [business.id, key, payload]);
}
