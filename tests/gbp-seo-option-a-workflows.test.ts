import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockTenantRecord = vi.hoisted(() => ({
  value: {
    id: 'tenant-opt-a',
    name: 'SmileCare Dental Studio',
    slug: 'smilecare-dental',
    publicSlug: 'smilecare-dental',
    city: 'Austin',
    country: 'US',
    industry: 'Dentist',
    phone: '+1 512 555 0199',
    address: '100 Congress Ave, Austin, TX',
    latitude: 30.2672,
    longitude: -97.7431,
    googlePlaceId: 'places/ChIJ123',
    website: null as string | null,
    publicProfileEnabled: false,
    claimed: false,
    rating: 4.9,
    reviewCount: 42,
    seoTitle: null as string | null,
    seoDescription: null as string | null,
    faqsJson: '[]',
    businessHoursJson: '{"monday":"09:00-18:00"}',
    serviceAreasJson: '["Austin","Round Rock"]',
    description: '',
    settingsJson: JSON.stringify({
      googleDiscovery: {
        updatedAt: '2026-11-01T00:00:00Z',
        keywords: [
          { keyword: 'emergency dentist austin', count: 140 },
          { keyword: 'root canal specialist austin', count: 85 },
          { keyword: 'teeth whitening austin', count: 50, isThreshold: true },
        ],
      },
      additionalCategories: ['Cosmetic Dentist'],
      seoServices: [
        { name: 'Emergency Dental Care', description: 'Fast relief.' },
        { name: 'Root Canal Treatment', description: '' },
      ],
      competitorSpyCache: {
        queryUsed: 'Dentist',
        locationUsed: 'Austin',
        competitors: [
          {
            id: 'comp-1',
            name: 'Capital Dental Group',
            rating: 4.8,
            reviewCount: 110,
            distanceKm: 1.4,
            primaryCategoryLabel: 'Dentist',
            secondaryCategories: ['Emergency Dental Service', 'Dental Implants Periodontist'],
            attributesList: ['Wheelchair accessible entrance', 'Accepts credit cards'],
            photoCount: 14,
            recentReviews: [
              { text: 'Best same day emergency dentist and painless crown work!', rating: 5 },
              { text: 'Emergency appointments and clear pricing.', rating: 5 },
            ],
            websiteUrl: 'https://capitaldental.example.com',
            mapsUrl: 'https://maps.google.com/?cid=1',
            source: 'places',
          },
        ],
      },
    }),
    brandProfile: {
      id: 'brand-1',
      businessName: 'SmileCare Dental Studio',
      industry: 'Dentist',
      location: 'Austin',
      serviceArea: 'Austin, Round Rock, Cedar Park',
      aiGeneratedSummary: '',
      services: '["Emergency Dental Care","Root Canal Treatment"]',
    },
  },
}));

const mockServices = vi.hoisted(() => ({
  rows: [
    {
      id: 'svc-1',
      tenantId: 'tenant-opt-a',
      name: 'Emergency Dental Care',
      description: 'Fast relief.',
      longDescription: null as string | null,
      category: 'Dentist',
      isActive: true,
      isPublic: true,
    },
    {
      id: 'svc-2',
      tenantId: 'tenant-opt-a',
      name: 'Root Canal Treatment',
      description: '',
      longDescription: null as string | null,
      category: 'Dentist',
      isActive: true,
      isPublic: true,
    },
  ],
}));

const mockTrackedKeywords = vi.hoisted(() => ({
  rows: [
    {
      id: 'kw-1',
      keyword: 'emergency dentist austin',
      city: 'Austin',
      country: 'United States',
      score: 65,
      position: 1,
      mapsRank: 5,
      organicRank: null,
      aiOverviewCited: null,
      source: 'gbp_search',
    },
  ],
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user-opt-a',
    email: 'owner@smilecare.test',
    tenantId: 'tenant-opt-a',
    role: 'owner',
  }),
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn().mockRejectedValue(new Error('Offline test fallback mode')),
  loadAiKeyChain: vi.fn().mockResolvedValue({ geminiKey: null }),
}));

vi.mock('@/lib/public-business', () => ({
  revalidatePublicBusiness: vi.fn(),
}));

vi.mock('@/lib/indexnow', () => ({
  submitToIndexNow: vi.fn().mockResolvedValue({ ok: true, submitted: 1, status: 200 }),
  submitTenantUrlToIndexNow: vi.fn().mockResolvedValue({ ok: true, submitted: 1, status: 200 }),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  updateGoogleBusinessProfile: vi.fn().mockResolvedValue({
    descriptionApplied: true,
    appliedMasks: ['profile.description'],
    warnings: [],
  }),
  fetchGoogleBusinessPlaceDetails: vi.fn().mockResolvedValue(null),
  fetchGoogleBusinessPerformanceMetrics: vi.fn().mockResolvedValue(null),
  fetchGoogleBusinessSearchKeywords: vi.fn().mockResolvedValue([]),
  extractLocationRef: vi.fn((x) => x),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => ({ ...mockTenantRecord.value })),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(mockTenantRecord.value, data);
        return { ...mockTenantRecord.value };
      }),
    },
    brandProfile: {
      update: vi.fn(async ({ data }: any) => {
        Object.assign(mockTenantRecord.value.brandProfile, data);
        return mockTenantRecord.value.brandProfile;
      }),
      updateMany: vi.fn(async ({ data }: any) => {
        Object.assign(mockTenantRecord.value.brandProfile, data);
        return { count: 1 };
      }),
    },
    service: {
      findMany: vi.fn(async () => [...mockServices.rows]),
      count: vi.fn(async () => mockServices.rows.length),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `svc-${mockServices.rows.length + 1}`, ...data };
        mockServices.rows.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = mockServices.rows.findIndex((r) => r.id === where.id);
        if (idx >= 0) Object.assign(mockServices.rows[idx], data);
        return mockServices.rows[idx];
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => [...mockTrackedKeywords.rows]),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    socialPost: { count: vi.fn(async () => 4) },
    review: { count: vi.fn(async () => 42) },
    websiteAuditSnapshot: { findFirst: vi.fn(async () => null) },
    gbpCompetitor: { findMany: vi.fn(async () => []) },
    seoRankScan: { findMany: vi.fn(async () => []), create: vi.fn(async () => ({})) },
    socialAccount: { findFirst: vi.fn(async () => null) },
  },
}));

describe('Option A GBP SEO Engine (DataForSEO-free)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATAFORSEO_LOGIN;
    delete process.env.DATAFORSEO_PASSWORD;
    process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('builds Search-Term-prioritized SEO context across GBP discovery and services', async () => {
    const { getTenantSeoContext, formatSeoKeywordsPromptSection } = await import('@/lib/gbp/seo-context');
    const ctx = await getTenantSeoContext('tenant-opt-a');

    expect(ctx).not.toBeNull();
    expect(ctx!.priorityKeywords[0]).toBe('emergency dentist austin');
    expect(ctx!.city).toBe('Austin');

    const promptBlock = formatSeoKeywordsPromptSection(ctx);
    expect(promptBlock).toContain('emergency dentist austin');
    expect(promptBlock).toContain('Austin');
  });

  it('writes strictly 300-500 char localized service descriptions matching keyword + city', async () => {
    const { finalizeLocalizedServiceDescription, generateLocalizedServiceDescriptions } = await import(
      '@/lib/gbp/service-optimizer'
    );

    const finalized = finalizeLocalizedServiceDescription('Short dental note.', {
      serviceName: 'Emergency Dental Care',
      targetKeyword: 'emergency dentist austin',
      city: 'Austin',
      businessName: 'SmileCare Dental Studio',
      serviceAreas: ['Austin', 'Round Rock'],
    });
    expect(finalized.length).toBeGreaterThanOrEqual(300);
    expect(finalized.length).toBeLessThanOrEqual(500);
    expect(finalized.toLowerCase()).toContain('emergency dentist austin');
    expect(finalized.toLowerCase()).toContain('austin');

    const batch = await generateLocalizedServiceDescriptions({
      tenantId: 'tenant-opt-a',
      services: [{ id: 'svc-1', name: 'Emergency Dental Care' }],
      save: true,
      pushToGoogle: false,
    });
    expect(batch.saved).toBe(true);
    expect(batch.services[0].description.length).toBeGreaterThanOrEqual(300);
    expect(batch.services[0].description.length).toBeLessThanOrEqual(500);
  });

  it('identifies missing competitor secondary categories, review gaps & review themes via Competitor Spy', async () => {
    const { buildCompetitorGapSummary } = await import('@/lib/gbp/competitor-spy');

    const summary = buildCompetitorGapSummary({
      queryUsed: 'Dentist',
      locationUsed: 'Austin',
      self: {
        name: 'SmileCare Dental Studio',
        primaryCategory: 'Dentist',
        rating: 4.9,
        reviewCount: 42,
        mapsRank: 5,
        additionalCategories: ['Cosmetic Dentist'],
        attributes: {},
        hasWebsite: false,
      },
      competitors: [
        {
          id: 'c1',
          placeId: 'c1',
          name: 'Capital Dental Group',
          rating: 4.8,
          reviewCount: 110,
          distanceKm: 1.4,
          address: '200 Congress Ave, Austin',
          category: 'Dentist',
          primaryCategoryLabel: 'Dentist',
          secondaryCategories: ['Emergency Dental Service', 'Dental Implants Periodontist'],
          attributesList: ['Wheelchair accessible entrance'],
          recentReviews: [
            { text: 'Quick emergency appointments and clear pricing!', rating: 5 },
            { text: 'Same day emergency crown care!', rating: 5 },
          ],
          mapsUrl: 'https://maps.google.com/?cid=1',
          websiteUrl: 'https://capitaldental.example.com',
          source: 'places',
        },
      ],
    });

    expect(summary.missingCategories.map((c) => c.category)).toContain('Emergency Dental Service');
    expect(summary.reviewsNeededForTop3).toBe(68);
    expect(summary.suggestedKeywordsFromReviews).toContain('emergency');
    expect(summary.whyTopRank.length).toBeGreaterThan(0);
  });

  it('analyzes local winnability and runs 3x3 Places Area Grid fallback cleanly with ZERO DataForSEO keys', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('suggestqueries.google.com')) {
        return new Response(JSON.stringify(['emergency dentist austin', ['emergency dentist austin', 'emergency tooth extraction austin']]), {
          status: 200,
        });
      }
      if (url.includes('places.googleapis.com/v1/places:searchText')) {
        return new Response(
          JSON.stringify({
            places: [
              { id: 'other-1', displayName: { text: 'Other Dental' }, rating: 4.5, userRatingCount: 18 },
              { id: 'ChIJ123', displayName: { text: 'SmileCare Dental Studio' }, rating: 4.9, userRatingCount: 42 },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 404 });
    });

    const { analyzeKeywordWinnability, scanPlacesGridFallback } = await import('@/lib/gbp/keyword-planner-free');

    const winnability = await analyzeKeywordWinnability({
      tenantId: 'tenant-opt-a',
      keywords: ['emergency dentist austin'],
    });
    expect(winnability).toHaveLength(1);
    expect(winnability[0].nativeImpressions).toBe(140);
    expect(winnability[0].inAutocomplete).toBe(true);
    expect(winnability[0].competitionLevel).toBe('LOW');
    expect(winnability[0].winnabilityTier).toBe('Quick Win');
    expect(winnability[0].yourPlacesRank).toBe(2);

    const grid = await scanPlacesGridFallback({
      keyword: 'emergency dentist austin',
      placeId: 'places/ChIJ123',
      businessName: 'SmileCare Dental Studio',
      centerLat: 30.2672,
      centerLng: -97.7431,
      gridSize: 3,
      radiusKm: 3,
      regionCode: 'US',
    });
    expect(grid.points).toHaveLength(9);
    expect(grid.top3Pct).toBe(100);
    expect(grid.avgRank).toBe(2);
  });

  it('executes 1-click Auto-Optimizer preview, apply, and rollback cleanly', async () => {
    const { GET, POST } = await import('@/app/api/gbp/auto-optimize/route');

    const getRes = await GET(new NextRequest('http://localhost:3000/api/gbp/auto-optimize'));
    expect(getRes.status).toBe(200);
    const previewJson = await getRes.json();
    expect(previewJson.pendingCount).toBeGreaterThanOrEqual(2);
    expect(previewJson.searchTermsUsed).toContain('emergency dentist austin');

    const applyRes = await POST(
      new NextRequest('http://localhost:3000/api/gbp/auto-optimize', {
        method: 'POST',
        body: JSON.stringify({ mode: 'apply', pushToGoogle: false }),
      }),
    );
    expect(applyRes.status).toBe(200);
    const applyJson = await applyRes.json();
    expect(applyJson.success).toBe(true);
    expect(applyJson.appliedSteps).toContain('description');
    expect(applyJson.appliedSteps).toContain('categories');
    expect(applyJson.appliedSteps).toContain('landing_page');
    expect(applyJson.scoreAfter).toBeGreaterThanOrEqual(applyJson.scoreBefore);
    expect(mockTenantRecord.value.publicProfileEnabled).toBe(true);
    expect(mockTenantRecord.value.claimed).toBe(true);

    const rollbackRes = await POST(
      new NextRequest('http://localhost:3000/api/gbp/auto-optimize', {
        method: 'POST',
        body: JSON.stringify({ mode: 'rollback' }),
      }),
    );
    expect(rollbackRes.status).toBe(200);
    const rollbackJson = await rollbackRes.json();
    expect(rollbackJson.rolledBack).toBe(true);
    expect(mockTenantRecord.value.publicProfileEnabled).toBe(false);
    expect(mockTenantRecord.value.claimed).toBe(false);
  });
});
