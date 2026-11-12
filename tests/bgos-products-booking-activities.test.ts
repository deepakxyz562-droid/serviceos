import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  brandProfile: {
    updateMany: vi.fn(),
  },
}));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockPrepareGoogleAccount = vi.hoisted(() => vi.fn());
const mockPersistStoreCatalogAndSync = vi.hoisted(() => vi.fn());
const mockGetBgosPublicBusinessProfileUncached = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mockPrepareGoogleAccount,
}));
vi.mock('@/lib/bgos-store-catalog', async () => {
  const actual = await vi.importActual<typeof import('@/lib/bgos-store-catalog')>(
    '@/lib/bgos-store-catalog',
  );
  return {
    ...actual,
    persistStoreCatalogAndSync: mockPersistStoreCatalogAndSync,
  };
});
vi.mock('@/lib/bgos-public-business', () => ({
  getBgosPublicBusinessProfileUncached: mockGetBgosPublicBusinessProfileUncached,
}));

import {
  buildGoogleEventSchedule,
  googleBusinessAdapter,
} from '@/lib/social/adapters/googlebusiness';
import { toPublishParams } from '@/lib/social/publisher';
import { buildGoogleMerchantXmlFeed } from '@/lib/gbp/merchant-feed';
import { syncGooglePlaceActionsForTenant } from '@/lib/gbp/place-actions-sync';
import { GET as getMerchantFeed } from '@/app/api/public/business/[slug]/products-feed/route';
import { POST as createProduct } from '@/app/api/bgos/products/route';
import { getBusinessCatalogSchemas } from '@/lib/seo/schemas';
import type { SocialAccountData } from '@/lib/social/types';

const SAMPLE_GOOGLE_ACCOUNT: SocialAccountData = {
  id: 'acc_gbp_1',
  platform: 'googlebusiness',
  accountId: '987654321',
  accountName: 'Abc Kirana',
  accessToken: 'tok_test_abc',
  metadata: {
    accountName: 'accounts/111222',
    locationId: '987654321',
  },
};

describe('GBP Activities (EVENT schedule & gbpActionType)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('buildGoogleEventSchedule parses YYYY-MM-DD cleanly without shifting days and enforces end >= start', () => {
    const sched = buildGoogleEventSchedule('2026-11-15', '2026-11-20');
    expect(sched).toEqual({
      startDate: { year: 2026, month: 11, day: 15 },
      endDate: { year: 2026, month: 11, day: 20 },
    });

    const clamped = buildGoogleEventSchedule('2026-11-20', '2026-11-10');
    expect(clamped.endDate).toEqual({ year: 2026, month: 11, day: 20 });
  });

  it('toPublishParams extracts gbpActionType and gbpOfferData cleanly from JSON', () => {
    const params = toPublishParams({
      content: 'Weekend Health Camp\nFree consultation for walk-in guests.',
      mediaUrls: JSON.stringify(['https://bgos.fieseros.com/uploads/event.jpg']),
      linkUrl: 'https://bgos.fieseros.com/book/clinic',
      gbpPostType: 'event',
      gbpOfferData: JSON.stringify({
        title: 'Weekend Health Camp',
        startDate: '2026-11-14',
        endDate: '2026-11-16',
        actionType: 'BOOK',
      }),
      pinterestBoard: null,
    });

    expect(params.gbpPostType).toBe('event');
    expect(params.gbpActionType).toBe('BOOK');
    expect(params.gbpOfferData?.title).toBe('Weekend Health Camp');
    expect(params.gbpOfferData?.startDate).toBe('2026-11-14');
    expect(params.gbpOfferData?.endDate).toBe('2026-11-16');
  });

  it('googleBusinessAdapter.publish formats EVENT schedule correctly and respects BOOK & CALL CTAs', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(
        JSON.stringify({
          name: 'accounts/111222/locations/987654321/localPosts/post_1',
          searchUrl: 'https://local.google.com/place?id=1',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const bookRes = await googleBusinessAdapter.publish(SAMPLE_GOOGLE_ACCOUNT, {
      content: 'Weekend Fest — 20% off in-store combos',
      mediaUrls: [],
      linkUrl: 'https://bgos.fieseros.com/book/abc-kirana',
      gbpPostType: 'event',
      gbpActionType: 'BOOK',
      gbpOfferData: {
        title: 'Weekend Fest',
        startDate: '2026-11-15',
        endDate: '2026-11-17',
      },
    });

    expect(bookRes.externalPostId).toBe('accounts/111222/locations/987654321/localPosts/post_1');
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstBody.topicType).toBe('EVENT');
    expect(firstBody.event).toEqual({
      title: 'Weekend Fest',
      schedule: {
        startDate: { year: 2026, month: 11, day: 15 },
        endDate: { year: 2026, month: 11, day: 17 },
      },
    });
    expect(firstBody.callToAction).toEqual({
      actionType: 'BOOK',
      url: 'https://bgos.fieseros.com/book/abc-kirana',
    });

    const callRes = await googleBusinessAdapter.publish(SAMPLE_GOOGLE_ACCOUNT, {
      content: 'Call now for instant home delivery!',
      mediaUrls: [],
      linkUrl: 'https://bgos.fieseros.com/b/abc-kirana',
      gbpPostType: 'whats_new',
      gbpActionType: 'CALL',
    });
    expect(callRes.externalPostId).toBe('accounts/111222/locations/987654321/localPosts/post_1');
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.callToAction).toEqual({ actionType: 'CALL' });
  });
});

describe('Google Merchant Center Product XML Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buildGoogleMerchantXmlFeed produces valid RSS 2.0 XML with escaped characters & INR pricing', () => {
    const xml = buildGoogleMerchantXmlFeed({
      businessName: 'Abc & Son Kirana',
      description: 'Fresh staples & daily essentials',
      canonicalUrl: 'https://bgos.fieseros.com/b/abc-kirana',
      currency: 'INR',
      products: [
        {
          id: 'prod_1',
          name: 'Organic Basmati Rice <5kg>',
          description: 'Aged long-grain rice',
          price: 650,
          category: 'Groceries & Staples',
          imageUrl: 'https://bgos.fieseros.com/uploads/rice.jpg',
          inStock: true,
          fulfillmentModes: ['pickup', 'delivery'],
          updatedAt: '2026-11-12T00:00:00.000Z',
        },
      ],
    });

    expect(xml).toContain('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">');
    expect(xml).toContain('<g:id>prod_1</g:id>');
    expect(xml).toContain('<g:title>Organic Basmati Rice &lt;5kg&gt;</g:title>');
    expect(xml).toContain('<g:price>650.00 INR</g:price>');
    expect(xml).toContain('<g:availability>in stock</g:availability>');
    expect(xml).toContain('<g:brand>Abc &amp; Son Kirana</g:brand>');
    expect(xml).toContain('<g:link>https://bgos.fieseros.com/b/abc-kirana#products</g:link>');
  });

  it('GET /api/public/business/[slug]/products-feed returns application/xml or 404 when missing', async () => {
    mockGetBgosPublicBusinessProfileUncached.mockResolvedValueOnce(null);
    const notFoundRes = await getMerchantFeed(
      new NextRequest('http://localhost:3000/api/public/business/missing/products-feed'),
      { params: Promise.resolve({ slug: 'missing' }) },
    );
    expect(notFoundRes.status).toBe(404);

    mockGetBgosPublicBusinessProfileUncached.mockResolvedValueOnce({
      businessName: 'Abc Kirana',
      description: 'Local store',
      canonicalUrl: 'https://bgos.fieseros.com/b/abc-kirana',
      currency: 'INR',
      products: [
        {
          id: 'prod_2',
          name: 'Toor Dal 1kg',
          description: 'Fresh pulse',
          price: 165,
          category: 'Pulses',
          imageUrl: null,
          inStock: true,
          fulfillmentModes: ['pickup'],
          updatedAt: '2026-11-12T00:00:00.000Z',
        },
      ],
    });
    const okRes = await getMerchantFeed(
      new NextRequest('http://localhost:3000/api/public/business/abc-kirana/products-feed'),
      { params: Promise.resolve({ slug: 'abc-kirana' }) },
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get('content-type')).toContain('application/xml');
    const text = await okRes.text();
    expect(text).toContain('Toor Dal 1kg');
    expect(text).toContain('165.00 INR');
  });
});

describe('Automatic Booking & Order Place Action Sync + Product Launch Post', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mockGetAuthUser.mockResolvedValue({
      id: 'usr_owner',
      tenantId: 'ten_1',
      role: 'owner',
    });
    mockPrepareGoogleAccount.mockResolvedValue(SAMPLE_GOOGLE_ACCOUNT);
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'ten_1',
      name: 'Abc Kirana',
      slug: 'abc-kirana',
      publicSlug: 'abc-kirana',
      currency: 'INR',
      country: 'IN',
      socialLinksJson: '{}',
      settingsJson: JSON.stringify({
        bgosStoreSettings: {
          pickupEnabled: true,
          deliveryEnabled: true,
          foodOrderingEnabled: false,
          inStoreShoppingEnabled: true,
        },
        bgosProducts: [],
      }),
    });
    mockDb.tenant.update.mockResolvedValue({ id: 'ten_1' });
    mockDb.brandProfile.updateMany.mockResolvedValue({ count: 1 });
    mockPersistStoreCatalogAndSync.mockResolvedValue(undefined);
  });

  it('syncGooglePlaceActionsForTenant pushes APPOINTMENT (/book/...) and ONLINE_ORDERING (/b/...#products) to Google', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!init?.method || init.method === 'GET') {
        return new Response(JSON.stringify({ placeActionLinks: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ name: `${url}/123` }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await syncGooglePlaceActionsForTenant({
      tenantId: 'ten_1',
      includeAppointment: true,
      includeOrdering: true,
    });

    expect(res.connected).toBe(true);
    expect(res.syncedActions).toEqual(['APPOINTMENT', 'ONLINE_ORDERING']);
    expect(res.appointmentUri).toBe('https://bgos.fieseros.com/book/abc-kirana');
    expect(res.orderUri).toBe('https://bgos.fieseros.com/b/abc-kirana#products');
    expect(mockDb.tenant.update).toHaveBeenCalledTimes(1);
    const savedSettings = JSON.parse(mockDb.tenant.update.mock.calls[0][0].data.settingsJson);
    expect(savedSettings.bookingLink).toBe('https://bgos.fieseros.com/book/abc-kirana');
    expect(savedSettings.googlePlaceActions.appointmentUri).toBe('https://bgos.fieseros.com/book/abc-kirana');
  });

  it('POST /api/bgos/products auto-syncs ONLINE_ORDERING Place Action and publishes showcase post when requested', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('placeActionLinks') && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify({ placeActionLinks: [] }), { status: 200 });
      }
      if (url.includes('placeActionLinks') && init?.method === 'POST') {
        return new Response(JSON.stringify({ name: 'locations/987654321/placeActionLinks/ord1' }), {
          status: 200,
        });
      }
      if (url.includes('/localPosts')) {
        return new Response(
          JSON.stringify({
            name: 'accounts/111222/locations/987654321/localPosts/prod_post_1',
            searchUrl: 'https://local.google.com/place?id=prod_post_1',
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/bgos/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mustard Oil 1L',
        price: 195,
        category: 'Oils',
        description: 'Cold pressed kachi ghani',
        publishToGooglePost: true,
      }),
    });

    const res = await createProduct(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.gbpSync?.syncedActions).toContain('ONLINE_ORDERING');
    expect(json.googlePost?.ok).toBe(true);

    const localPostCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/localPosts'));
    expect(localPostCall).toBeTruthy();
    const localPostBody = JSON.parse(localPostCall![1]!.body as string);
    expect(localPostBody.topicType).toBe('STANDARD');
    expect(localPostBody.callToAction).toEqual({
      actionType: 'ORDER',
      url: 'https://bgos.fieseros.com/b/abc-kirana#products',
    });
  });
});

describe('Public Page Schema.org Product & Service OfferCatalog JSON-LD', () => {
  it('emits Product JSON-LD blocks for products and OfferCatalog for services', () => {
    const schemas = getBusinessCatalogSchemas({
      businessName: 'Abc Kirana',
      canonicalUrl: 'https://bgos.fieseros.com/b/abc-kirana',
      currency: 'INR',
      fallbackImage: 'https://bgos.fieseros.com/uploads/logo.png',
      products: [
        {
          id: 'prod_oil',
          name: 'Mustard Oil 1L',
          description: 'Cold pressed kachi ghani oil',
          price: 195,
          category: 'Oils',
          imageUrl: '/uploads/oil.jpg',
          inStock: true,
        },
        {
          id: 'prod_rice',
          name: 'Aged Basmati Rice 5kg',
          price: null,
          inStock: false,
        },
      ],
      services: [
        {
          name: 'Home Grocery Delivery',
          description: 'Same-day local delivery within 5km.',
          price: 49,
          category: 'Delivery',
        },
      ],
    });

    expect(schemas).toHaveLength(3);
    const oilSchema = schemas[0] as any;
    expect(oilSchema['@type']).toBe('Product');
    expect(oilSchema.sku).toBe('prod_oil');
    expect(oilSchema.image).toBe('https://bgos.fieseros.com/uploads/oil.jpg');
    expect(oilSchema.offers).toMatchObject({
      '@type': 'Offer',
      url: 'https://bgos.fieseros.com/b/abc-kirana#products',
      priceCurrency: 'INR',
      price: '195.00',
      availability: 'https://schema.org/InStock',
    });

    const riceSchema = schemas[1] as any;
    expect(riceSchema.offers.availability).toBe('https://schema.org/OutOfStock');
    expect(riceSchema.offers.price).toBeUndefined();

    const catalogSchema = schemas[2] as any;
    expect(catalogSchema['@type']).toBe('OfferCatalog');
    expect(catalogSchema.itemListElement).toHaveLength(1);
    expect(catalogSchema.itemListElement[0].price).toBe('49.00');
    expect(catalogSchema.itemListElement[0].itemOffered['@type']).toBe('Service');
  });
});
