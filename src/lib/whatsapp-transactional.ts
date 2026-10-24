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
import { WHATSAPP_API_VERSION } from '@/lib/whatsapp-config';

export interface OrderMessageTemplate {
  name: string;
  language: string;
  parameters?: string[];
  components?: Array<Record<string, unknown>>;
  buttonUrlParam?: string;
}

/**
 * Standard BOS Meta WhatsApp Templates (Utility Category)
 * Approved for 24/7 delivery outside conversation window.
 */
export const BOS_META_TEMPLATES = {
  ORDER_CONFIRMED: {
    name: 'bos_order_confirmed',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '🎉 *Order Confirmed!* #{{2}}\nHi {{1}}, your order at *{{3}}* has been confirmed.\n\n💰 Total Amount: {{4}}\n💳 Payment: {{5}}\n\nThank you for shopping with us!',
    buttonText: 'View Bill & Tracking',
  },
  ORDER_STATUS_UPDATE: {
    name: 'bos_order_status_update',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '📦 *Order Update* #{{2}}\nHi {{1}}, your order at *{{4}}* is now *{{3}}*.\n📍 Details: {{5}}\n\nTrack live progress using the link below:',
    buttonText: 'Track Live Order',
  },
  TAX_INVOICE: {
    name: 'bos_tax_invoice',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '🧾 *Tax Invoice* {{2}}\nDear {{1}}, thank you for your business with *{{3}}*.\n\n💰 Invoice Total: {{4}}\nStatus: {{5}}\n\nYour GST invoice PDF is ready to view & download.',
    buttonText: 'Download PDF Invoice',
  },
  PAYMENT_RECEIVED: {
    name: 'bos_payment_received',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '✅ *Payment Received*\nHi {{1}}, we received {{4}} for *{{3}}*.\nRef: #{{2}}\nPayment Mode: {{5}}\nRemaining Balance: {{6}}',
    buttonText: 'View Digital Receipt',
  },
  KHATA_REMINDER: {
    name: 'bos_khata_reminder',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '🔔 *Payment Reminder*\nDear {{1}}, this is a gentle reminder that an amount of {{3}} is pending with *{{2}}* (Due: {{4}}).\n\nKindly clear via UPI or click below to view bill.',
    buttonText: 'Pay Now / View Bill',
  },
} as const;

export interface TransactionalOrderPayload {
  currency?: string;
  trackingUrl?: string;
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
  const trackingUrl = order.trackingUrl || `${baseUrl}/store/${order.storeSlug || 'store'}/order/${order.orderId}`;

  const itemsList = order.items
    .map((it) => `• ${it.name} × ${it.qty} (${new Intl.NumberFormat('en-IN',{style:'currency',currency:order.currency||'INR'}).format(it.price*it.qty)})`)
    .join('\n');

  const payText =
    order.paymentStatus === 'PAID'
      ? `✅ Paid${order.paymentMethod ? ` (${order.paymentMethod})` : ''}`
      : order.paymentMethod === 'UPI'
      ? '⚡ UPI Payment Pending'
      : '💵 Pay on Delivery / Counter';

  const typeText =
    order.deliveryType?.toLowerCase() === 'dine_in'
      ? '🍽️ Dine-In'
      : ['takeout','pickup'].includes(order.deliveryType?.toLowerCase() || '')
      ? '🛍️ Pickup'
      : '🛵 Home Delivery';

  const messageText =
    `${order.status==='PENDING'?'📥 *Order Received!*':'🎉 *Order Confirmed!*'} #${order.orderNumber}\n\n` +
    `Hi *${order.customerName}*, your order at *${order.businessName}* has been received!\n\n` +
    `📋 *Order Summary:*\n${itemsList}\n\n` +
    `💰 *Total Amount:* ${new Intl.NumberFormat('en-IN',{style:'currency',currency:order.currency||'INR'}).format(order.total)}\n` +
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
  const posUrl = `${baseUrl}/?view=commerce`;

  const itemsList = order.items
    .map((it) => `• ${it.name} × ${it.qty}`)
    .join(', ');

  const messageText =
    `🔔 *NEW ORDER #${order.orderNumber} RECEIVED!*\n\n` +
    `👤 *Customer:* ${order.customerName} (${order.customerPhone})\n` +
    `💰 *Amount:* ${new Intl.NumberFormat('en-IN',{style:'currency',currency:order.currency||'INR'}).format(order.total)} (${order.paymentStatus === 'PAID' ? 'PAID ✓' : 'UNPAID'})\n` +
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
  const trackingUrl = order.trackingUrl || `${baseUrl}/store/${order.storeSlug || 'store'}/order/${order.orderId}`;

  let statusBadge = '📦 Order Update';
  let statusMessage = `Your order #${order.orderNumber} status has been updated to: ${newStatus}`;

  switch (newStatus.toUpperCase()) {
    case 'CONFIRMED':
      statusBadge = '✅ Order Confirmed';
      statusMessage = `${order.businessName} has accepted your order #${order.orderNumber}.`;
      break;
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
 * Builders for BOS Standard Meta Templates
 */
export function buildBosOrderConfirmedTemplate(order: TransactionalOrderPayload, language = 'en_US'): {
  template: OrderMessageTemplate;
  fallbackText: string;
} {
  const formatted = formatCustomerOrderConfirmation(order);
  const totalStr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: order.currency || 'INR',
  }).format(order.total);
  const payStr = order.paymentStatus === 'PAID'
    ? `PAID (${order.paymentMethod || 'Online'})`
    : order.paymentMethod === 'UPI' ? 'UPI Pending' : 'Pay on Delivery / Counter';

  const parameters = [
    order.customerName || 'Customer',
    order.orderNumber,
    order.businessName,
    totalStr,
    payStr,
    formatted.trackingUrl,
  ];

  return {
    template: {
      name: BOS_META_TEMPLATES.ORDER_CONFIRMED.name,
      language,
      parameters,
      buttonUrlParam: formatted.trackingUrl,
    },
    fallbackText: formatted.messageText,
  };
}

export function buildBosOrderStatusTemplate(order: TransactionalOrderPayload, newStatus: string, language = 'en_US'): {
  template: OrderMessageTemplate;
  fallbackText: string;
} {
  const formatted = formatCustomerStatusUpdate(order, newStatus);
  const statusDisplay = newStatus.replace(/_/g, ' ').toUpperCase();
  const locationOrEta = order.deliveryAddress || order.deliveryType || 'Counter Pickup';

  const parameters = [
    order.customerName || 'Customer',
    order.orderNumber,
    statusDisplay,
    order.businessName,
    locationOrEta,
    order.trackingUrl || formatted.trackingUrl,
  ];

  return {
    template: {
      name: BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.name,
      language,
      parameters,
      buttonUrlParam: order.trackingUrl || formatted.trackingUrl,
    },
    fallbackText: formatted.messageText,
  };
}

export function buildBosTaxInvoiceTemplate(payload: {
  customerName: string;
  invoiceNumber: string;
  businessName: string;
  total: number;
  currency?: string;
  paymentStatus: string;
  paymentMethod?: string;
  invoiceUrl: string;
}, language = 'en_US'): {
  template: OrderMessageTemplate;
  fallbackText: string;
} {
  const totalStr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: payload.currency || 'INR',
  }).format(payload.total);

  const statusStr = payload.paymentStatus === 'PAID'
    ? `PAID (${payload.paymentMethod || 'Online'})`
    : 'PENDING / DUE';

  const fallbackText =
    `🧾 *Tax Invoice* ${payload.invoiceNumber}\n` +
    `Dear ${payload.customerName || 'Customer'}, thank you for your business with *${payload.businessName}*.\n\n` +
    `💰 Invoice Total: ${totalStr}\n` +
    `Status: ${statusStr}\n\n` +
    `👉 View / Download PDF Invoice:\n${payload.invoiceUrl}`;

  const parameters = [
    payload.customerName || 'Customer',
    payload.invoiceNumber,
    payload.businessName,
    totalStr,
    statusStr,
    payload.invoiceUrl,
  ];

  return {
    template: {
      name: BOS_META_TEMPLATES.TAX_INVOICE.name,
      language,
      parameters,
      buttonUrlParam: payload.invoiceUrl,
    },
    fallbackText,
  };
}

export function buildBosPaymentReceivedTemplate(payload: {
  customerName: string;
  receiptNumber: string;
  businessName: string;
  amountReceived: number;
  currency?: string;
  paymentMode: string;
  remainingBalance?: number;
  receiptUrl?: string;
}, language = 'en_US'): {
  template: OrderMessageTemplate;
  fallbackText: string;
} {
  const curr = payload.currency || 'INR';
  const amtStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr }).format(payload.amountReceived);
  const balStr = payload.remainingBalance !== undefined
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr }).format(payload.remainingBalance)
    : '₹0.00';

  const fallbackText =
    `✅ *Payment Received*\n` +
    `Hi ${payload.customerName || 'Customer'}, we received ${amtStr} for *${payload.businessName}*.\n` +
    `Ref: #${payload.receiptNumber}\n` +
    `Payment Mode: ${payload.paymentMode}\n` +
    `Remaining Balance: ${balStr}` +
    (payload.receiptUrl ? `\n\n👉 View Receipt: ${payload.receiptUrl}` : '');

  const parameters = [
    payload.customerName || 'Customer',
    payload.receiptNumber,
    payload.businessName,
    amtStr,
    payload.paymentMode,
    balStr,
  ];

  return {
    template: {
      name: BOS_META_TEMPLATES.PAYMENT_RECEIVED.name,
      language,
      parameters,
      ...(payload.receiptUrl ? { buttonUrlParam: payload.receiptUrl } : {}),
    },
    fallbackText,
  };
}

export function buildBosKhataReminderTemplate(payload: {
  customerName: string;
  businessName: string;
  dueAmount: number;
  currency?: string;
  dueDateOrDays?: string;
  paymentUrl: string;
}, language = 'en_US'): {
  template: OrderMessageTemplate;
  fallbackText: string;
} {
  const curr = payload.currency || 'INR';
  const amtStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr }).format(payload.dueAmount);
  const dueInfo = payload.dueDateOrDays || 'Due Today';

  const fallbackText =
    `🔔 *Payment Reminder*\n` +
    `Dear ${payload.customerName || 'Customer'}, this is a gentle reminder that an amount of ${amtStr} is pending with *${payload.businessName}* (Due: ${dueInfo}).\n\n` +
    `Kindly clear via UPI or click below to view bill:\n👉 ${payload.paymentUrl}`;

  const parameters = [
    payload.customerName || 'Customer',
    payload.businessName,
    amtStr,
    dueInfo,
    payload.paymentUrl,
  ];

  return {
    template: {
      name: BOS_META_TEMPLATES.KHATA_REMINDER.name,
      language,
      parameters,
      buttonUrlParam: payload.paymentUrl,
    },
    fallbackText,
  };
}

/**
 * Returns Meta Cloud API template registration definitions for BOS.
 * These can be uploaded or verified via Meta Graph API / Meta Business Suite.
 */
export function getBosMetaTemplateRegistrationSpecs() {
  return [
    {
      name: BOS_META_TEMPLATES.ORDER_CONFIRMED.name,
      category: BOS_META_TEMPLATES.ORDER_CONFIRMED.category,
      allow_category_change: true,
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: BOS_META_TEMPLATES.ORDER_CONFIRMED.bodyText,
          example: {
            body_text: [
              ['Rahul Sharma', 'ORD-10492', 'Apex Store', '₹1,450.00', 'PAID (UPI)', 'https://serviceos.com/store/apex/order/123'],
            ],
          },
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: BOS_META_TEMPLATES.ORDER_CONFIRMED.buttonText,
              url: 'https://serviceos.com/order/{{1}}',
              example: ['123'],
            },
          ],
        },
      ],
    },
    {
      name: BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.name,
      category: BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.category,
      allow_category_change: true,
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.bodyText,
          example: {
            body_text: [
              ['Rahul Sharma', 'ORD-10492', 'Ready for Pickup', 'Apex Store', 'Main Counter #1', 'https://serviceos.com/store/apex/order/123'],
            ],
          },
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.buttonText,
              url: 'https://serviceos.com/order/{{1}}',
              example: ['123'],
            },
          ],
        },
      ],
    },
    {
      name: BOS_META_TEMPLATES.TAX_INVOICE.name,
      category: BOS_META_TEMPLATES.TAX_INVOICE.category,
      allow_category_change: true,
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: BOS_META_TEMPLATES.TAX_INVOICE.bodyText,
          example: {
            body_text: [
              ['Apex Traders', 'INV-2026-0042', 'Sharma Wholesale', '₹8,490.00', 'PAID', 'https://serviceos.com/invoice/view/123'],
            ],
          },
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: BOS_META_TEMPLATES.TAX_INVOICE.buttonText,
              url: 'https://serviceos.com/invoice/{{1}}',
              example: ['view/123'],
            },
          ],
        },
      ],
    },
    {
      name: BOS_META_TEMPLATES.PAYMENT_RECEIVED.name,
      category: BOS_META_TEMPLATES.PAYMENT_RECEIVED.category,
      allow_category_change: true,
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: BOS_META_TEMPLATES.PAYMENT_RECEIVED.bodyText,
          example: {
            body_text: [
              ['Rahul', 'REC-789', 'Apex Store', '₹2,500.00', 'UPI', '₹0.00', 'https://serviceos.com/receipt/789'],
            ],
          },
        },
      ],
    },
    {
      name: BOS_META_TEMPLATES.KHATA_REMINDER.name,
      category: BOS_META_TEMPLATES.KHATA_REMINDER.category,
      allow_category_change: true,
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: BOS_META_TEMPLATES.KHATA_REMINDER.bodyText,
          example: {
            body_text: [
              ['Rahul', 'Apex Store', '₹3,400.00', 'Due in 3 days', 'https://serviceos.com/pay/khata/123'],
            ],
          },
        },
      ],
    },
  ];
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
  message: string,
  template?: OrderMessageTemplate,
  provider?: {accessToken: string; phoneNumberId: string}
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
  const wabaToken = provider ? provider.accessToken : process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = provider ? provider.phoneNumberId : process.env.WHATSAPP_PHONE_NUMBER_ID;

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
    let messagePayload: Record<string, unknown>;
    if (template) {
      const components: Array<Record<string, unknown>> = [];
      if (template.components && template.components.length > 0) {
        components.push(...template.components);
      } else if (template.parameters && template.parameters.length > 0) {
        components.push({
          type: 'body',
          parameters: template.parameters.map((text) => ({ type: 'text', text: String(text ?? '') })),
        });
        if (template.buttonUrlParam) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: template.buttonUrlParam }],
          });
        }
      }

      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language || 'en_US' },
          ...(components.length > 0 ? { components } : {}),
        },
      };
    } else {
      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone,
        type: 'text',
        text: { preview_url: true, body: message },
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wabaToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(messagePayload),
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

    // An HTTP response without a provider message ID is not an accepted send.
    const data = await res.json();
    const wabaMessageId = data?.messages?.[0]?.id;
    if (typeof wabaMessageId !== 'string' || !wabaMessageId) {
      throw new Error('WhatsApp did not acknowledge the message.');
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
