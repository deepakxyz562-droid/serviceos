import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockDb,
  mockGetAuthUser,
  mockPrepareGoogleAccount,
  mockUpsertPlaceAction,
  mockEnsureChatbot,
} = vi.hoisted(() => ({
  mockDb: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brandProfile: {
      updateMany: vi.fn(),
    },
  },
  mockGetAuthUser: vi.fn(),
  mockPrepareGoogleAccount: vi.fn(),
  mockUpsertPlaceAction: vi.fn(),
  mockEnsureChatbot: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mockPrepareGoogleAccount,
}));
vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  upsertGooglePlaceActionLink: mockUpsertPlaceAction,
}));
vi.mock('@/lib/bgos-business-chatbot', () => ({
  ensureAndSyncBusinessChatbot: mockEnsureChatbot,
}));

import {
  normalizeBgosProductInput,
  normalizeSocialUrl,
  parseBgosProducts,
  parseBgosStoreSettings,
} from '@/lib/bgos-store-catalog';
import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/bgos/products/route';

describe('BGOS Store Catalog & Google Place Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'owner',
    });
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'tenant_1',
      name: 'Abc Kirana',
      slug: 'abc-kirana',
      publicSlug: 'abc-kirana',
      currency: 'INR',
      country: 'IN',
      settingsJson: JSON.stringify({
        bgosProducts: [
          {
            id: 'prod_1',
            name: 'Basmati Rice 5kg',
            description: 'Premium aged rice',
            price: 499,
            category: 'Groceries',
            inStock: true,
            fulfillmentModes: ['pickup', 'delivery'],
          },
        ],
        bgosStoreSettings: {
          pickupEnabled: true,
          deliveryEnabled: true,
          foodOrderingEnabled: false,
        },
      }),
      socialLinksJson: JSON.stringify({ instagram: 'https://instagram.com/abckirana' }),
    });
    mockDb.tenant.update.mockResolvedValue({});
    mockDb.brandProfile.updateMany.mockResolvedValue({ count: 1 });
    mockPrepareGoogleAccount.mockResolvedValue({ id: 'acc_1', accessToken: 'tok_1' });
    mockUpsertPlaceAction.mockResolvedValue({ ok: true, linkName: 'locations/1/placeActionLinks/1' });
  });

  it('normalizes product inputs & social URLs cleanly', () => {
    expect(normalizeSocialUrl('instagram.com/abckirana')).toBe('https://instagram.com/abckirana');
    expect(normalizeSocialUrl('   ')).toBe('');

    const item = normalizeBgosProductInput({
      name: 'Fresh Milk 1L',
      price: '65',
      category: 'Dairy',
      fulfillmentModes: ['pickup', 'invalid_mode'],
    });
    expect(item?.name).toBe('Fresh Milk 1L');
    expect(item?.price).toBe(65);
    expect(item?.fulfillmentModes).toEqual(['pickup']);
  });

  it('parses stored products and fulfillment settings with defaults', () => {
    const prods = parseBgosProducts({ bgosProducts: [{ id: 'p1', name: 'Tea Pack', price: 120 }] });
    expect(prods).toHaveLength(1);
    expect(prods[0].inStock).toBe(true);

    const store = parseBgosStoreSettings({});
    expect(store.pickupEnabled).toBe(true);
    expect(store.deliveryEnabled).toBe(false);
  });

  it('supports POST, PUT, DELETE product lifecycle and syncs BrandProfile + Chatbot', async () => {
    const postReq = new NextRequest('http://localhost/api/bgos/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Masala Chai', price: 180, category: 'Beverages' }),
    });
    const postRes = await POST(postReq);
    const postData = await postRes.json();
    expect(postRes.status).toBe(201);
    expect(postData.products).toHaveLength(2);
    expect(mockDb.brandProfile.updateMany).toHaveBeenCalledTimes(1);
    expect(mockEnsureChatbot).toHaveBeenCalledWith('tenant_1', {
      triggerSource: 'store_catalog_update',
    });

    const putReq = new NextRequest('http://localhost/api/bgos/products', {
      method: 'PUT',
      body: JSON.stringify({ id: 'prod_1', price: 540, inStock: false }),
    });
    const putRes = await PUT(putReq);
    const putData = await putRes.json();
    expect(putRes.status).toBe(200);
    expect(putData.product.price).toBe(540);
    expect(putData.product.inStock).toBe(false);

    const delReq = new NextRequest('http://localhost/api/bgos/products?id=prod_1', {
      method: 'DELETE',
    });
    const delRes = await DELETE(delReq);
    const delData = await delRes.json();
    expect(delRes.status).toBe(200);
    expect(delData.products).toHaveLength(0);
  });

  it('PATCH saves storeSettings + socialProfiles and syncs APPOINTMENT & ONLINE_ORDERING links to Google', async () => {
    const patchReq = new NextRequest('https://bgos.fieseros.com/api/bgos/products', {
      method: 'PATCH',
      body: JSON.stringify({
        storeSettings: {
          pickupEnabled: true,
          deliveryEnabled: true,
          foodOrderingEnabled: false,
        },
        socialProfiles: {
          facebook: 'facebook.com/abckirana',
        },
        syncToGoogle: true,
      }),
    });
    const res = await PATCH(patchReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gbpSync.syncedActions).toEqual(['APPOINTMENT', 'ONLINE_ORDERING']);
    expect(mockUpsertPlaceAction).toHaveBeenCalledTimes(2);
    expect(data.socialProfiles.facebook).toBe('https://facebook.com/abckirana');
  });

  it('GET returns existing catalog, settings, social links and canonicalUrl', async () => {
    const req = new NextRequest('https://bgos.fieseros.com/api/bgos/products');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.currency).toBe('INR');
    expect(data.socialProfiles.instagram).toBe('https://instagram.com/abckirana');
  });
});
