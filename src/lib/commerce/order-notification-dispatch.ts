import { db } from '@/lib/db';
import { resolveOrderMessagingConfig } from './order-messaging-config';
import { orderAccessToken } from './order-access';
import { sendWebPushToUser } from '@/lib/web-push-send';
import {
  dispatchTransactionalWhatsApp,
  formatCustomerOrderConfirmation,
  formatCustomerStatusUpdate,
  formatVendorNewOrderAlert,
  type TransactionalOrderPayload,
} from '@/lib/whatsapp-transactional';

/**
 * Dispatches immediate order notifications (In-app, Web Push, and Meta WhatsApp)
 * so customers and merchants don't wait for a background cron job.
 */
export async function triggerImmediateOrderNotifications(
  orderId: string,
  event: 'CREATED' | 'STATUS_CHANGE',
  newStatus?: string
): Promise<void> {
  try {
    const order = await db.gptformCommerceOrder.findUnique({ where: { id: orderId } });
    if (!order) return;
    const business = await db.aiBusiness.findUnique({ where: { id: order.businessId } });
    if (!business) return;

    // 1. In-app & Web Push notification for store owner
    const alertId = `order-alert:${order.id}:${event}`;
    const title =
      event === 'CREATED'
        ? `New order #${order.id.slice(-6).toUpperCase()}`
        : `Order #${order.id.slice(-6).toUpperCase()} is ${newStatus}`;
    const message =
      event === 'CREATED'
        ? `${order.customerName || 'Customer'} placed an order at ${business.name}.`
        : `Status updated to ${newStatus}.`;

    try {
      await db.appNotification.upsert({
        where: { id: alertId },
        update: {},
        create: {
          id: alertId,
          tenantId: business.tenantId || business.id,
          recipientId: business.ownerId,
          type: 'commerce_order',
          category: 'commerce',
          title,
          message,
          actionUrl: '/?view=orders',
          priority: 'high',
          metadataJson: JSON.stringify({ orderId: order.id, route: '/(tabs)/orders' }),
        },
      });

      // Web Push
      await sendWebPushToUser(business.ownerId, business.tenantId, {
        title,
        body: message,
        url: '/?view=orders',
        tag: alertId,
        requireInteraction: true,
        data: { orderId: order.id, route: '/(tabs)/orders' },
      }).catch(() => null);
    } catch (pushErr) {
      console.warn('[order-notification] push alert error:', pushErr);
    }

    // 2. Meta WhatsApp dispatch
    try {
      const provider = await resolveOrderMessagingConfig(business.tenantId);
      const tenant = business.tenantId
        ? await db.tenant.findUnique({
            where: { id: business.tenantId },
            select: { slug: true, phone: true },
          })
        : null;
      const slug = tenant?.slug || business.id;
      const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com').replace(/\/$/, '');

      const payload: TransactionalOrderPayload = {
        orderId: order.id,
        orderNumber: order.id.slice(-6).toUpperCase(),
        businessName: business.name,
        businessPhone: tenant?.phone || business.phone || '',
        customerName: order.customerName || 'Guest',
        customerPhone: order.customerPhone,
        total: order.total,
        items: JSON.parse(order.itemsJson || '[]'),
        paymentStatus: order.paymentStatus,
        status: newStatus || order.status,
        deliveryType: order.deliveryType || undefined,
        deliveryAddress: order.deliveryAddress || undefined,
        paymentMethod: order.paymentMethod || undefined,
        storeSlug: slug,
        currency: business.currency,
        trackingUrl: `${base}/store/${slug}/order/${order.id}?token=${orderAccessToken(order.id, business.id)}`,
      };

      if (event === 'CREATED') {
        // Customer confirmation
        const custFormatted = formatCustomerOrderConfirmation(payload);
        const custTemplate = provider.customerTemplate
          ? {
              name: provider.customerTemplate,
              language: provider.language,
              parameters: [
                payload.customerName,
                payload.businessName,
                payload.orderNumber,
                payload.status,
                payload.trackingUrl!,
              ],
            }
          : undefined;
        void dispatchTransactionalWhatsApp(
          order.customerPhone,
          custFormatted.messageText,
          custTemplate,
          provider
        ).catch(() => null);

        // Vendor alert
        if (payload.businessPhone) {
          const vendorFormatted = formatVendorNewOrderAlert(payload);
          const vendorTemplate = provider.vendorTemplate
            ? {
                name: provider.vendorTemplate,
                language: provider.language,
                parameters: [
                  payload.businessName,
                  payload.orderNumber,
                  payload.customerName,
                  String(payload.total),
                  payload.currency || 'INR',
                  `${base}/?view=commerce`,
                ],
              }
            : undefined;
          void dispatchTransactionalWhatsApp(
            payload.businessPhone,
            vendorFormatted.messageText,
            vendorTemplate,
            provider
          ).catch(() => null);
        }
      } else if (event === 'STATUS_CHANGE') {
        const statusFormatted = formatCustomerStatusUpdate(payload, newStatus || order.status);
        const statusTemplate = provider.customerTemplate
          ? {
              name: provider.customerTemplate,
              language: provider.language,
              parameters: [
                payload.customerName,
                payload.businessName,
                payload.orderNumber,
                payload.status,
                payload.trackingUrl!,
              ],
            }
          : undefined;
        void dispatchTransactionalWhatsApp(
          order.customerPhone,
          statusFormatted.messageText,
          statusTemplate,
          provider
        ).catch(() => null);
      }
    } catch (waErr) {
      console.warn('[order-notification] WhatsApp dispatch error:', waErr);
    }
  } catch (err) {
    console.warn('[order-notification] trigger error:', err);
  }
}
