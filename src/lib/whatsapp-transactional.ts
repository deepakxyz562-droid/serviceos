/**
 * Transactional WhatsApp Notification Engine
 * Sends order confirmations, status pings & vendor alerts for every order.
 *
 * Honesty contract (FIX 4):
 *  - `success: true` is returned ONLY when the WABA Graph API responds ok.
 *  - Unset env vars → `{ success: false, method: 'env_not_configured', error }`.
 *  - WABA fetch throw / non-ok → `{ success: false, method: 'waba_api_error', error }`.
 *  - Invalid phone → `{ success: false, method: 'invalid_phone' }`.
 *  - Every dispatch attempt persists a `WhatsAppMessageAction` row so dispatches
 *    are observable in the DB even when callers fire-and-forget the promise.
 *    The DB write is wrapped in try/catch — it never fails the dispatch.
 */

import { db } from '@/lib/db';

export interface TransactionalOrderPayload {
  orderId: string;
  orderNumber: string;
  businessName: string;
  businessPhone?: string;
  customerName: string;
  customerPhone: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
  deliveryType?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  paymentStatus: string;
  status: string;
  storeSlug?: string;
}

export function formatCustomerOrderConfirmation(order: TransactionalOrderPayload): {
  messageText: string;
  whatsappUrl: string;
  trackingUrl: string;
} {
  const cleanCustomerPhone = order.customerPhone.replace(/\D/g, '');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com';
  const trackingUrl = `${baseUrl}/store/${order.storeSlug || 'store'}/order/${order.orderId}`;

  const itemsList = order.items
    .map((it) => `• ${it.name} × ${it.qty} (₹${(it.price * it.qty).toFixed(2)})`)
    .join('\n');

  const payText =
    order.paymentStatus === 'PAID'
      ? '✅ Paid via UPI'
      : order.paymentMethod === 'UPI'
      ? '⚡ UPI Payment Pending'
      : '💵 Pay on Delivery / Counter';

  const typeText =
    order.deliveryType === 'dine_in'
      ? '🍽️ Dine-In'
      : order.deliveryType === 'takeout'
      ? '🛍️ Pickup'
      : '🛵 Home Delivery';

  const messageText =
    `🎉 *Order Confirmed!* #${order.orderNumber}\n\n` +
    `Hi *${order.customerName}*, your order at *${order.businessName}* has been received!\n\n` +
    `📋 *Order Summary:*\n${itemsList}\n\n` +
    `💰 *Total Amount:* ₹${order.total.toFixed(2)}\n` +
    `💳 *Payment:* ${payText}\n` +
    `📍 *Type:* ${typeText}\n\n` +
    `👉 *Track Live Order & Kitchen Status:*\n${trackingUrl}\n\n` +
    `Thank you for ordering with us!`;

  const whatsappUrl = `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(messageText)}`;

  return { messageText, whatsappUrl, trackingUrl };
}

export function formatVendorNewOrderAlert(order: TransactionalOrderPayload): {
  messageText: string;
  whatsappUrl: string;
} {
  const cleanVendorPhone = (order.businessPhone || '').replace(/\D/g, '');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com';
  const posUrl = `${baseUrl}/pos`;

  const itemsList = order.items
    .map((it) => `• ${it.name} × ${it.qty}`)
    .join(', ');

  const messageText =
    `🔔 *NEW ORDER #${order.orderNumber} RECEIVED!*\n\n` +
    `👤 *Customer:* ${order.customerName} (+91 ${order.customerPhone})\n` +
    `💰 *Amount:* ₹${order.total.toFixed(2)} (${order.paymentStatus === 'PAID' ? 'PAID ✓' : 'UNPAID'})\n` +
    `📦 *Items:* ${itemsList}\n` +
    `📍 *Delivery:* ${order.deliveryAddress || order.deliveryType || 'Counter'}\n\n` +
    `👉 *Open in POS to Accept & Print:* ${posUrl}`;

  const whatsappUrl = cleanVendorPhone
    ? `https://wa.me/${cleanVendorPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  return { messageText, whatsappUrl };
}

export function formatCustomerStatusUpdate(
  order: TransactionalOrderPayload,
  newStatus: string
): { messageText: string; whatsappUrl: string } {
  const cleanCustomerPhone = order.customerPhone.replace(/\D/g, '');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com';
  const trackingUrl = `${baseUrl}/store/${order.storeSlug || 'store'}/order/${order.orderId}`;

  let statusBadge = '📦 Order Update';
  let statusMessage = `Your order #${order.orderNumber} status has been updated to: ${newStatus}`;

  switch (newStatus.toUpperCase()) {
    case 'PREPARING':
      statusBadge = '👨‍🍳 Preparing Your Order';
      statusMessage = `Your food / items are now being freshly prepared by ${order.businessName}.`;
      break;
    case 'READY':
      statusBadge = '✨ Order Ready!';
      statusMessage = `Your order #${order.orderNumber} is packed and ready for pickup / delivery!`;
      break;
    case 'OUT_FOR_DELIVERY':
      statusBadge = '🛵 Out for Delivery';
      statusMessage = `Your order #${order.orderNumber} is on its way to your delivery address!`;
      break;
    case 'DELIVERED':
      statusBadge = '✅ Delivered';
      statusMessage = `Your order #${order.orderNumber} has been delivered. Enjoy your meal / purchase!`;
      break;
    case 'CANCELLED':
      statusBadge = '❌ Order Cancelled';
      statusMessage = `Your order #${order.orderNumber} was cancelled.`;
      break;
  }

  const messageText =
    `${statusBadge}\n\n` +
    `Hi *${order.customerName}*,\n${statusMessage}\n\n` +
    `👉 *Live Tracker:* ${trackingUrl}`;

  const whatsappUrl = `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(messageText)}`;

  return { messageText, whatsappUrl };
}

/**
 * Build a collision-resistant synthetic WhatsApp message id for cases where
 * WABA didn't return one (failure paths) or the response body wasn't JSON.
 *
 * `WhatsAppMessageAction.whatsappMessageId` is `@unique`, so two parallel
 * dispatches (e.g. customer + vendor alerts fired in the same ms) must
 * not collide. We include the recipient phone + high-resolution timestamp
 * + a short random suffix.
 */
function synthesizeMessageId(prefix: 'pending' | 'ok', cleanPhone: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${cleanPhone || 'nophone'}_${Date.now()}_${rand}`;
}

/**
 * Persist a WhatsAppMessageAction row for observability.
 *
 * Model (prisma/schema.prisma L2349):
 *   id              @id @default(cuid())
 *   whatsappMessageId String @unique
 *   workflowId      String
 *   nodeId          String
 *   onSelectWebhookUrl String?
 *   onSelectWorkflowId String?
 *   nodeConfigJson   String @default("{}")
 *   phoneRecipient   String
 *   createdAt        DateTime @default(now())
 *
 * `whatsappMessageId` is unique — for failures we synthesize a collision-
 * resistant id (`pending_<phone>_<ts>_<rand>`) so every dispatch attempt gets
 * its own observable row even when the customer + vendor alerts fire in the
 * same millisecond.
 *
 * Non-blocking: never throws out of the caller. Returns void on error.
 */
async function persistDispatchAudit(args: {
  cleanPhone: string;
  whatsappMessageId: string;
  method: string;
  success: boolean;
  error?: string;
  messagePreview: string;
}): Promise<void> {
  try {
    await db.whatsAppMessageAction.create({
      data: {
        phoneRecipient: args.cleanPhone,
        whatsappMessageId: args.whatsappMessageId,
        workflowId: 'transactional_order',
        nodeId: 'dispatch',
        nodeConfigJson: JSON.stringify({
          method: args.method,
          success: args.success,
          ...(args.error ? { error: args.error } : {}),
          messagePreview: args.messagePreview,
        }),
      },
    });
  } catch (dbErr) {
    // Non-blocking — the dispatch result is the source of truth for the caller.
    // We still log so a misconfigured schema / unique collision is visible.
    console.warn('[whatsapp dispatch] failed to persist WhatsAppMessageAction:', dbErr);
  }
}

/**
 * Sends automated WhatsApp notification via configured gateway (Meta Graph API).
 *
 * Return value is honest:
 *  - `success: true` ONLY when the WABA API responds ok.
 *  - `success: false` with a descriptive `method` + `error` for every other path.
 *
 * A `WhatsAppMessageAction` row is persisted for every attempt (success or
 * failure) so fire-and-forget callers can still observe dispatches in the DB.
 */
export async function dispatchTransactionalWhatsApp(
  phone: string,
  message: string
): Promise<{ success: boolean; method: string; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  const messagePreview = (message || '').slice(0, 200);

  if (!cleanPhone) {
    const result = { success: false, method: 'invalid_phone', error: 'No valid phone digits after sanitisation.' };
    await persistDispatchAudit({
      cleanPhone: '',
      whatsappMessageId: synthesizeMessageId('pending', ''),
      method: result.method,
      success: result.success,
      error: result.error,
      messagePreview,
    });
    return result;
  }

  // If Meta WhatsApp Business API token is present in environment
  const wabaToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wabaToken || !phoneNumberId) {
    const result = {
      success: false,
      method: 'env_not_configured',
      error:
        'WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID env vars are not set. Configure WhatsApp Business API credentials to enable automated dispatch.',
    };
    await persistDispatchAudit({
      cleanPhone,
      whatsappMessageId: synthesizeMessageId('pending', cleanPhone),
      method: result.method,
      success: result.success,
      error: result.error,
      messagePreview,
    });
    return result;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wabaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`,
          type: 'text',
          text: { preview_url: true, body: message },
        }),
      }
    );

    if (!res.ok) {
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {}
      const errorMessage = `WABA API HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 500)}` : ''}`;
      const result = { success: false, method: 'waba_api_error', error: errorMessage };
      await persistDispatchAudit({
        cleanPhone,
        whatsappMessageId: synthesizeMessageId('pending', cleanPhone),
        method: result.method,
        success: result.success,
        error: result.error,
        messagePreview,
      });
      return result;
    }

    // Success — extract the WABA message id for the audit row.
    let wabaMessageId = synthesizeMessageId('ok', cleanPhone);
    try {
      const data = await res.json();
      if (data?.messages?.[0]?.id) {
        wabaMessageId = String(data.messages[0].id);
      }
    } catch {
      // Response body wasn't JSON — keep the synthesized id.
    }

    const result = { success: true, method: 'waba_api' };
    await persistDispatchAudit({
      cleanPhone,
      whatsappMessageId: wabaMessageId,
      method: result.method,
      success: true,
      messagePreview,
    });
    return result;
  } catch (e: any) {
    const errorMessage =
      (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message) ||
      'WABA fetch threw an unexpected error.';
    const result = { success: false, method: 'waba_api_error', error: errorMessage };
    await persistDispatchAudit({
      cleanPhone,
      whatsappMessageId: synthesizeMessageId('pending', cleanPhone),
      method: result.method,
      success: result.success,
      error: result.error,
      messagePreview,
    });
    return result;
  }
}
