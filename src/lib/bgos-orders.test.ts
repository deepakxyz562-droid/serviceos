import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockDb,
  mockGetAuthUser,
  mockNotifyOwner,
  mockSendWhatsAppMessage,
} = vi.hoisted(() => ({
  mockDb: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    service: {
      findFirst: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    lead: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    communicationProvider: {
      findFirst: vi.fn(),
    },
  },
  mockGetAuthUser: vi.fn(),
  mockNotifyOwner: vi.fn().mockResolvedValue(undefined),
  mockSendWhatsAppMessage: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/owner-notifications', () => ({ notifyOwner: mockNotifyOwner }));
vi.mock('@/lib/whatsapp-send', () => ({ sendWhatsAppMessage: mockSendWhatsAppMessage }));

import { resolveTenantPublicUrls } from '@/lib/gbp/place-actions-sync';
import {
  buildWaMeUrl,
  extractOrderFromLead,
  isProductOrderLead,
  resolveOrderItemsForSubmission,
} from '@/lib/bgos-orders';
import { POST as submitInquiry } from '@/app/api/public/business/[slug]/inquiry/route';
import { GET as listOrders, PATCH as updateOrder } from '@/app/api/bgos/orders/route';

describe('BGOS Product Ordering, Storefront Bag & Domain Consistency', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.BGOS_PUBLIC_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://fieseros.com';

    mockGetAuthUser.mockResolvedValue({
      id: 'owner_1',
      tenantId: 'tenant_1',
      role: 'owner',
    });

    mockDb.tenant.findFirst.mockResolvedValue({
      id: 'tenant_1',
      name: 'Fieseros Bags',
      slug: 'fieseros',
      publicSlug: 'fieseros',
      publicProfileEnabled: true,
      currency: 'INR',
      country: 'IN',
      settingsJson: JSON.stringify({
        bgosProducts: [
          { id: 'p_bag', name: 'bag', price: 399, category: 'General', inStock: true },
          { id: 'p_ladies', name: 'Ladies bag', price: 500, category: 'General', inStock: true },
        ],
      }),
    });

    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'tenant_1',
      name: 'Fieseros Bags',
      currency: 'INR',
      country: 'IN',
    });

    mockDb.customer.findFirst.mockResolvedValue({
      id: 'cust_1',
      name: 'Aarav',
      phone: '+919876543210',
      email: null,
    });

    mockDb.communicationProvider.findFirst.mockResolvedValue(null);
  });

  it('keeps productsFeedUrl on bgos.site even when NEXT_PUBLIC_APP_URL is fieseros.com', () => {
    const urls = resolveTenantPublicUrls({ name: 'Fieseros', slug: 'fieseros', publicSlug: 'fieseros' });
    expect(urls.origin).toBe('https://bgos.site');
    expect(urls.profileUrl).toBe('https://bgos.site/fieseros');
    expect(urls.productsFeedUrl).toBe('https://bgos.site/api/public/business/fieseros/products-feed');
  });

  it('uses authoritative catalog prices on multi-item order resolution', () => {
    const { items, totalAmount } = resolveOrderItemsForSubmission(
      [
        { productId: 'p_bag', name: 'bag', quantity: 2, unitPrice: 1 }, // client spoof attempt ignored
        { productId: 'p_ladies', name: 'Ladies bag', quantity: 1, unitPrice: 500 },
      ],
      [
        { id: 'p_bag', name: 'bag', description: '', price: 399, category: 'General', inStock: true },
        { id: 'p_ladies', name: 'Ladies bag', description: '', price: 500, category: 'General', inStock: true },
      ],
    );

    expect(items).toHaveLength(2);
    expect(items[0].unitPrice).toBe(399);
    expect(items[0].lineTotal).toBe(798);
    expect(totalAmount).toBe(1298);
  });

  it('creates a structured multi-item product order from public storefront inquiry', async () => {
    mockDb.lead.create.mockResolvedValue({
      id: 'lead_abc123',
      title: '[Product Order] Aarav — 2x bag, 1x Ladies bag',
    });

    const req = new NextRequest('https://bgos.site/api/public/business/fieseros/inquiry', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aarav',
        phone: '+91 98765 43210',
        address: 'Sector 18, Noida',
        order: {
          fulfillment: 'delivery',
          notes: 'Call at gate',
          items: [
            { productId: 'p_bag', name: 'bag', quantity: 2, unitPrice: 399 },
            { productId: 'p_ladies', name: 'Ladies bag', quantity: 1, unitPrice: 500 },
          ],
        },
      }),
    });

    const res = await submitInquiry(req, { params: Promise.resolve({ slug: 'fieseros' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orderNumber).toBe('ORD-ABC123');
    expect(data.totalAmount).toBe(1298);
    expect(mockDb.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 1298,
          priority: 'high',
          tagsJson: JSON.stringify(['product_order', 'delivery', 'order_status:pending']),
        }),
      }),
    );
    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
  });

  it('parses both legacy single-item leads and structured multi-item orders in GET /api/bgos/orders', async () => {
    mockDb.lead.findMany.mockResolvedValue([
      {
        id: 'lead_multi99',
        title: '[Product Order] Priya — 2x bag',
        name: 'Priya',
        phone: '+919999988888',
        status: 'new',
        value: 798,
        description: 'Items: 2x bag (₹798)\nFulfillment: Store Pickup',
        address: 'Store Pickup',
        serviceType: '[Order 2x] bag',
        tagsJson: JSON.stringify(['product_order', 'pickup', 'order_status:pending']),
        lineItemsJson: JSON.stringify([{ productId: 'p_bag', name: 'bag', quantity: 2, unitPrice: 399, lineTotal: 798 }]),
        notesJson: '[]',
        createdAt: new Date('2026-11-28T06:00:00Z'),
        updatedAt: new Date('2026-11-28T06:00:00Z'),
      },
      {
        id: 'lead_legacy01',
        title: '[Product Order] Rohan — [Order x2] Ladies bag',
        name: 'Rohan',
        phone: '+918888877777',
        status: 'new',
        value: 0,
        description: 'Product Order: Ladies bag\nQuantity: 2\nFulfillment: Local Delivery\nLocation: MG Road',
        address: 'MG Road',
        serviceType: '[Order x2] Ladies bag',
        tagsJson: '[]',
        lineItemsJson: '[]',
        notesJson: '[]',
        createdAt: new Date('2026-11-27T10:00:00Z'),
        updatedAt: new Date('2026-11-27T10:00:00Z'),
      },
    ]);

    expect(isProductOrderLead({ title: '[Product Order] X', serviceType: null, tagsJson: '[]' })).toBe(true);

    const legacyParsed = extractOrderFromLead(
      {
        id: 'lead_legacy01',
        title: '[Product Order] Rohan — [Order x2] Ladies bag',
        name: 'Rohan',
        phone: '+918888877777',
        status: 'new',
        value: 0,
        description: 'Product Order: Ladies bag\nQuantity: 2\nFulfillment: Local Delivery',
        address: 'MG Road',
        serviceType: '[Order x2] Ladies bag',
        tagsJson: '[]',
        lineItemsJson: '[]',
        notesJson: '[]',
        createdAt: '2026-11-27T10:00:00Z',
        updatedAt: '2026-11-27T10:00:00Z',
      },
      'INR',
    );
    expect(legacyParsed.items).toEqual([
      { name: 'Ladies bag', quantity: 2, unitPrice: null, lineTotal: null },
    ]);
    expect(legacyParsed.fulfillment).toBe('delivery');

    const res = await listOrders(new NextRequest('https://bgos.site/api/bgos/orders'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.orders).toHaveLength(2);
    expect(data.pendingCount).toBe(2);
    expect(data.orders[0].orderNumber).toBe('ORD-ULTI99');
  });

  it('updates order status in PATCH /api/bgos/orders and provides wa.me fallback if WhatsApp API is disconnected', async () => {
    const existing = {
      id: 'lead_multi99',
      title: '[Product Order] Priya — 2x bag',
      name: 'Priya',
      phone: '+919999988888',
      status: 'new',
      value: 798,
      description: 'Items: 2x bag (₹798)',
      address: 'Store Pickup',
      serviceType: '[Order 2x] bag',
      tagsJson: JSON.stringify(['product_order', 'pickup', 'order_status:pending']),
      lineItemsJson: JSON.stringify([{ productId: 'p_bag', name: 'bag', quantity: 2, unitPrice: 399, lineTotal: 798 }]),
      notesJson: '[]',
      createdAt: new Date('2026-11-28T06:00:00Z'),
      updatedAt: new Date('2026-11-28T06:00:00Z'),
    };
    mockDb.lead.findFirst.mockResolvedValue(existing);
    mockDb.lead.update.mockResolvedValue({
      ...existing,
      status: 'contacted',
      tagsJson: JSON.stringify(['product_order', 'pickup', 'order_status:confirmed']),
    });
    mockSendWhatsAppMessage.mockResolvedValue({
      success: false,
      simulated: true,
      error: 'No WhatsApp connected',
    });

    const patchReq = new NextRequest('https://bgos.site/api/bgos/orders', {
      method: 'PATCH',
      body: JSON.stringify({
        orderId: 'lead_multi99',
        status: 'confirmed',
        notifyCustomerWhatsapp: true,
      }),
    });

    const res = await updateOrder(patchReq);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.order.status).toBe('confirmed');
    expect(data.whatsappSent).toBe(false);
    expect(data.whatsappFallbackUrl).toContain('https://wa.me/919999988888?text=');
  });

  it('adds business country calling code when customer phone omits country code', () => {
    expect(buildWaMeUrl('9876543210', 'Order ready', 'IN')).toBe(
      'https://wa.me/919876543210?text=Order%20ready',
    );
    expect(buildWaMeUrl('8445783056', 'Order ready', 'US')).toBe(
      'https://wa.me/18445783056?text=Order%20ready',
    );
    expect(buildWaMeUrl('0501234567', 'Order ready', 'AE')).toBe(
      'https://wa.me/971501234567?text=Order%20ready',
    );
  });
});
