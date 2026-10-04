/**
 * Transactional WhatsApp Notification Engine
 * Sends order confirmations, status pings & vendor alerts for every order
 */

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
 * Sends automated WhatsApp notification via configured gateway (Meta Graph API / Webhook)
 * or falls back to background logging with zero order blockage.
 */
export async function dispatchTransactionalWhatsApp(
  phone: string,
  message: string
): Promise<{ success: boolean; method: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return { success: false, method: 'invalid_phone' };

  // If Meta WhatsApp Business API token is present in environment
  const wabaToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (wabaToken && phoneNumberId) {
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
      if (res.ok) {
        return { success: true, method: 'waba_api' };
      }
    } catch (e) {
      console.warn('WABA automated send error, fallback to deep-link:', e);
    }
  }

  // Fallback: log notification dispatch
  console.log(`[WhatsApp Transactional Dispatch] -> +91 ${cleanPhone}:\n${message}`);
  return { success: true, method: 'simulated_dispatch' };
}
