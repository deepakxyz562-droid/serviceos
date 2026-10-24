import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireBusiness: vi.fn(),
  resolveConfig: vi.fn(),
  actionCreate: vi.fn(),
}));

vi.mock('@/lib/quote-flow-session', () => ({
  requireQuoteFlowBusiness: mocks.requireBusiness,
}));

vi.mock('@/lib/commerce/order-messaging-config', () => ({
  resolveOrderMessagingConfig: mocks.resolveConfig,
}));

vi.mock('@/lib/db', () => ({
  db: {
    whatsAppMessageAction: {
      create: mocks.actionCreate,
    },
  },
}));

import {
  BOS_META_TEMPLATES,
  buildBosOrderConfirmedTemplate,
  buildBosOrderStatusTemplate,
  buildBosTaxInvoiceTemplate,
  buildBosPaymentReceivedTemplate,
  buildBosKhataReminderTemplate,
  getBosMetaTemplateRegistrationSpecs,
  dispatchTransactionalWhatsApp,
} from '@/lib/whatsapp-transactional';
import { POST as sendWhatsApp } from '@/app/api/commerce/whatsapp/send/route';

describe('BOS Operational WhatsApp Messaging & Meta Templates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Template Builders', () => {
    it('builds bos_order_confirmed template with correct parameters & fallback text', () => {
      const order = {
        orderId: 'ord_123',
        orderNumber: 'ORD-9821',
        businessName: 'Sharma Electronics',
        customerName: 'Rahul Sharma',
        customerPhone: '9876543210',
        total: 2499,
        items: [{ name: 'Wireless Mouse', qty: 1, price: 2499 }],
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
        status: 'CONFIRMED',
        trackingUrl: 'https://serviceos.com/store/sharma/order/ord_123',
      };

      const result = buildBosOrderConfirmedTemplate(order);
      expect(result.template.name).toBe(BOS_META_TEMPLATES.ORDER_CONFIRMED.name);
      expect(result.template.language).toBe('en_US');
      expect(result.template.parameters).toBeDefined();
      expect(result.template.parameters![0]).toBe('Rahul Sharma');
      expect(result.template.parameters![1]).toBe('ORD-9821');
      expect(result.template.parameters![2]).toBe('Sharma Electronics');
      expect(result.template.parameters![4]).toContain('PAID');
      expect(result.template.buttonUrlParam).toBe('https://serviceos.com/store/sharma/order/ord_123');

      expect(result.fallbackText).toContain('Order Confirmed!');
      expect(result.fallbackText).toContain('ORD-9821');
      expect(result.fallbackText).toContain('Sharma Electronics');
    });

    it('builds bos_order_status_update template for READY status', () => {
      const order = {
        orderId: 'ord_456',
        orderNumber: 'ORD-456',
        businessName: 'Apex Store',
        customerName: 'Priya Verma',
        customerPhone: '9811223344',
        total: 1200,
        items: [{ name: 'Cake', qty: 1, price: 1200 }],
        paymentStatus: 'PAID',
        status: 'READY',
        deliveryType: 'Counter Pickup',
        trackingUrl: 'https://serviceos.com/order/ord_456',
      };

      const result = buildBosOrderStatusTemplate(order, 'READY');
      expect(result.template.name).toBe(BOS_META_TEMPLATES.ORDER_STATUS_UPDATE.name);
      expect(result.template.parameters![1]).toBe('ORD-456');
      expect(result.template.parameters![2]).toBe('READY');
      expect(result.template.parameters![3]).toBe('Apex Store');
      expect(result.template.parameters![4]).toBe('Counter Pickup');
      expect(result.fallbackText).toContain('Order Ready!');
    });

    it('builds bos_tax_invoice template with Vyapar GST invoice parameters', () => {
      const invoiceData = {
        customerName: 'Apex Traders',
        invoiceNumber: 'INV-2026-0042',
        businessName: 'Sharma Wholesale',
        total: 8490,
        currency: 'INR',
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
        invoiceUrl: 'https://serviceos.com/invoice/INV-2026-0042',
      };

      const result = buildBosTaxInvoiceTemplate(invoiceData);
      expect(result.template.name).toBe(BOS_META_TEMPLATES.TAX_INVOICE.name);
      expect(result.template.parameters![0]).toBe('Apex Traders');
      expect(result.template.parameters![1]).toBe('INV-2026-0042');
      expect(result.template.parameters![2]).toBe('Sharma Wholesale');
      expect(result.template.parameters![4]).toContain('PAID');
      expect(result.template.buttonUrlParam).toBe('https://serviceos.com/invoice/INV-2026-0042');
      expect(result.fallbackText).toContain('INV-2026-0042');
    });

    it('builds bos_payment_received template with receipt details', () => {
      const receiptData = {
        customerName: 'Amit Patel',
        receiptNumber: 'REC-901',
        businessName: 'Patel Hardware',
        amountReceived: 5000,
        paymentMode: 'Cash',
        remainingBalance: 0,
        receiptUrl: 'https://serviceos.com/receipt/REC-901',
      };

      const result = buildBosPaymentReceivedTemplate(receiptData);
      expect(result.template.name).toBe(BOS_META_TEMPLATES.PAYMENT_RECEIVED.name);
      expect(result.template.parameters![0]).toBe('Amit Patel');
      expect(result.template.parameters![1]).toBe('REC-901');
      expect(result.template.parameters![3]).toContain('5,000');
      expect(result.template.parameters![4]).toBe('Cash');
      expect(result.fallbackText).toContain('Payment Received');
    });

    it('builds bos_khata_reminder template for customer credit balance', () => {
      const reminderData = {
        customerName: 'Kunal Singh',
        businessName: 'Patel Hardware',
        dueAmount: 3200,
        dueDateOrDays: 'Overdue by 5 days',
        paymentUrl: 'https://serviceos.com/pay/khata/123',
      };

      const result = buildBosKhataReminderTemplate(reminderData);
      expect(result.template.name).toBe(BOS_META_TEMPLATES.KHATA_REMINDER.name);
      expect(result.template.parameters![0]).toBe('Kunal Singh');
      expect(result.template.parameters![1]).toBe('Patel Hardware');
      expect(result.template.parameters![3]).toBe('Overdue by 5 days');
      expect(result.template.buttonUrlParam).toBe('https://serviceos.com/pay/khata/123');
      expect(result.fallbackText).toContain('Payment Reminder');
    });

    it('returns official Meta Cloud API registration specifications for all 5 templates', () => {
      const specs = getBosMetaTemplateRegistrationSpecs();
      expect(specs.length).toBe(5);
      const names = specs.map((s) => s.name);
      expect(names).toContain('bos_order_confirmed');
      expect(names).toContain('bos_order_status_update');
      expect(names).toContain('bos_tax_invoice');
      expect(names).toContain('bos_payment_received');
      expect(names).toContain('bos_khata_reminder');

      specs.forEach((s) => {
        expect(s.category).toBe('UTILITY');
        expect(s.language).toBe('en_US');
        expect(s.components.some((c) => c.type === 'BODY')).toBe(true);
      });
    });
  });

  describe('Transactional Dispatch & Route Integration', () => {
    it('returns env_not_configured honest error when no Meta provider credentials exist', async () => {
      const result = await dispatchTransactionalWhatsApp('9876543210', 'Test message');
      expect(result.success).toBe(false);
      expect(result.method).toBe('env_not_configured');
      expect(mocks.actionCreate).toHaveBeenCalled();
    });

    it('rejects invalid phone digits gracefully', async () => {
      const result = await dispatchTransactionalWhatsApp('abc---', 'Test');
      expect(result.success).toBe(false);
      expect(result.method).toBe('invalid_phone');
    });

    it('POST /api/commerce/whatsapp/send automatically builds template and dispatches', async () => {
      mocks.requireBusiness.mockResolvedValue({
        business: { id: 'biz-1', name: 'Apex Store', tenantId: 'tenant-1', currency: 'INR' },
      });

      // Mock provider
      mocks.resolveConfig.mockResolvedValue({
        accessToken: 'meta_test_token',
        phoneNumberId: '1234567890',
        source: 'tenant',
        language: 'en_US',
      });

      // Mock global fetch for Meta API
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.HBgLMTIzNDU2' }] }),
      } as any);

      try {
        const req = new NextRequest('http://localhost:3000/api/commerce/whatsapp/send', {
          method: 'POST',
          body: JSON.stringify({
            phone: '9876543210',
            templateType: 'bos_tax_invoice',
            templateData: {
              customerName: 'Sunil',
              invoiceNumber: 'INV-109',
              total: 1500,
            },
          }),
        });

        const res = await sendWhatsApp(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.templateUsed).toBe('bos_tax_invoice');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
