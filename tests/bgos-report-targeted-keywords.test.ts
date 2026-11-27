import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockState = vi.hoisted(() => ({
  tenant: {
    id: 't-test-kw',
    name: 'Delhi Pool Farm',
    city: 'Delhi',
    industry: 'Farmhouse & Pool',
    googlePlaceId: 'ChIJ_self_farm_1',
    latitude: 28.6139,
    longitude: 77.209,
    settingsJson: JSON.stringify({
      googleDiscovery: {
        keywords: [
          { keyword: 'farmhouse with swimming pool in delhi', count: 180 },
          { keyword: 'private pool venue near me', count: 120 },
        ],
      },
    }),
    brandProfile: {
      businessName: 'Delhi Pool Farm',
      industry: 'Farmstay',
    },
  } as Record<string, any>,
  trackedKeywords: [] as Array<Record<string, any>>,
  rankGridScans: [] as Array<Record<string, any>>,
  reviews: [{ rating: 5 }, { rating: 5 }, { rating: 4 }],
  competitors: [] as Array<Record<string, any>>,
  entitlement: { ok: true, entitlement: { isTrial: false, plan: 'starter' } },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'usr-kw-test',
    tenantId: 't-test-kw',
    email: 'test@example.com',
  })),
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: vi.fn(async () => mockState.entitlement),
}));

vi.mock('@/lib/bgos-billing', () => ({
  normalizeBgosPlanCode: vi.fn((p: string) => String(p || 'starter').toLowerCase()),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => mockState.tenant),
      update: vi.fn(async ({ data }: any) => {
        mockState.tenant = { ...mockState.tenant, ...data };
        return mockState.tenant;
      }),
    },
    socialAccount: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => mockState.trackedKeywords),
      updateMany: vi.fn(async ({ where, data }: any) => {
        for (const k of mockState.trackedKeywords) {
          if (!where?.keyword || k.keyword === where.keyword) {
            Object.assign(k, data);
          }
        }
        return { count: 1 };
      }),
    },
    review: {
      findMany: vi.fn(async () => mockState.reviews),
    },
    lead: {
      findMany: vi.fn(async () => []),
    },
    socialPost: {
      findMany: vi.fn(async () => []),
    },
    invoice: {
      findMany: vi.fn(async () => []),
    },
    gbpScoreSnapshot: {
      findMany: vi.fn(async () => []),
    },
    competitor: {
      findMany: vi.fn(async () => []),
    },
    service: {
      findMany: vi.fn(async () => []),
    },
    rankGridScan: {
      findFirst: vi.fn(async () => mockState.rankGridScans[0] ?? null),
      findMany: vi.fn(async () => mockState.rankGridScans),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `gs-${Date.now()}`, ...data };
        mockState.rankGridScans.unshift(created);
        return created;
      }),
    },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => null),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessPerformanceMetrics: vi.fn(async () => null),
  listGoogleBusinessMedia: vi.fn(async () => []),
}));

describe('Targeted Keywords Auto-Seeding when Tracked Keywords are Empty', () => {
  beforeEach(() => {
    mockState.trackedKeywords = [];
    mockState.rankGridScans = [];
    mockState.tenant.settingsJson = JSON.stringify({
      googleDiscovery: {
        keywords: [
          { keyword: 'farmhouse with swimming pool in delhi', count: 180 },
          { keyword: 'private pool venue near me', count: 120 },
        ],
      },
    });
  });

  it('GET /api/bgos/reports/4-tier returns populated rankedKeywords with null rank when unmeasured', async () => {
    const { GET } = await import('@/app/api/bgos/reports/4-tier/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/reports/4-tier?period=this_month&refresh=1');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.rankedKeywords)).toBe(true);
    expect(json.rankedKeywords.length).toBeGreaterThanOrEqual(1);

    // Verify first keyword comes from discovery or category and does not fabricate a fake rank
    expect(json.rankedKeywords[0].keyword).toBeTruthy();
    expect(json.rankedKeywords[0].rank).toBeNull();
    expect(json.rankedKeywords[0].rankChange).toBeNull();
  });

  it('GET /api/bgos/reports/4-tier computes 1-decimal rank and rankChange from geo-grid scans for up to 10 keywords', async () => {
    mockState.rankGridScans = [
      { id: 'gs-new-1', keyword: 'private swimming pool near me', avgRank: 1.44 },
      { id: 'gs-new-2', keyword: 'swimming pool near me', avgRank: 1.62 },
      { id: 'gs-old-1', keyword: 'private swimming pool near me', avgRank: 2.11 },
      { id: 'gs-old-2', keyword: 'swimming pool near me', avgRank: 1.42 },
    ];
    mockState.trackedKeywords = [
      { keyword: 'private swimming pool near me', position: 2, mapsRank: 1.4 },
      { keyword: 'swimming pool near me', position: 2, mapsRank: 1.6 },
      ...Array.from({ length: 8 }, (_, idx) => ({
        keyword: `keyword-${idx + 3}`,
        position: idx + 3,
        mapsRank: idx + 3.2,
      })),
    ];

    const { GET } = await import('@/app/api/bgos/reports/4-tier/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/reports/4-tier?period=this_month&refresh=1');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.rankedKeywords.length).toBe(10);

    const improved = json.rankedKeywords.find((k: any) => k.keyword === 'private swimming pool near me');
    const dropped = json.rankedKeywords.find((k: any) => k.keyword === 'swimming pool near me');
    expect(improved).toEqual({ keyword: 'private swimming pool near me', rank: 1.4, rankChange: 0.7 });
    expect(dropped).toEqual({ keyword: 'swimming pool near me', rank: 1.6, rankChange: -0.2 });

    const actionMatch = json.actionReport.keywordsUsed.find(
      (k: any) => k.keyword === 'private swimming pool near me',
    );
    expect(actionMatch?.rank).toBe(1.4);
    expect(actionMatch?.rankChange).toBe(0.7);
  });

  it('GET /api/bgos/reports/4-tier?format=html renders targeted keywords table instead of empty message', async () => {
    const { GET } = await import('@/app/api/bgos/reports/4-tier/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/reports/4-tier?period=this_month&format=html');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('Rank for Targeted Keywords');
    // Should NOT contain the empty message
    expect(html).not.toContain('No keyword rank checks recorded yet.');
    // Should contain table rows with keywords
    expect(html).toContain('pool');
  });

  it('never leaks TrackedKeyword.position list index when mapsRank is unmeasured', async () => {
    mockState.trackedKeywords = [
      { keyword: 'swimming pool resort', position: 9, mapsRank: null },
    ];
    const { GET } = await import('@/app/api/bgos/reports/4-tier/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/reports/4-tier?period=this_month&refresh=1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    const row = json.rankedKeywords.find((k: any) => k.keyword === 'swimming pool resort');
    expect(row).toEqual({ keyword: 'swimming pool resort', rank: null, rankChange: null });
  });

  it('scanPlacesGridFallback returns avgRank 21.0 when business is outside top 20 at all points', async () => {
    const prevKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ places: [{ id: 'ChIJ_other_place' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as any;

    try {
      const { scanPlacesGridFallback } = await import('@/lib/gbp/keyword-planner-free');
      const result = await scanPlacesGridFallback({
        keyword: 'swimming pool resort near me',
        targetPlaceId: 'ChIJ_self_farm_1',
        centerLat: 28.6139,
        centerLng: 77.209,
        gridSize: 3,
        radiusKm: 3,
      });
      expect(result.avgRank).toBe(21);
      expect(result.top3Pct).toBe(0);
    } finally {
      globalThis.fetch = origFetch;
      if (prevKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
      else process.env.GOOGLE_PLACES_API_KEY = prevKey;
    }
  });

  it('scanTargetKeywordsBatch measures up to 10 keywords and GET /api/gbp/rankings computes ▲, ▼, and 0.0 deltas across scans', async () => {
    const prevKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
    const origFetch = globalThis.fetch;

    mockState.trackedKeywords = [
      { keyword: 'swimming pool near me', mapsRank: null, position: 1 },
      { keyword: 'private swimming pool near me', mapsRank: null, position: 2 },
      { keyword: 'swimming pool resort near me', mapsRank: null, position: 3 },
    ];

    // Seed an earlier scan baseline in settingsJson to verify multi-scan delta math
    mockState.tenant.settingsJson = JSON.stringify({
      googleDiscovery: {
        keywords: [{ keyword: 'swimming pool near me', count: 180 }],
      },
      measuredRankScans: [
        {
          id: 'scan-prev',
          date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          provider: 'dataforseo',
          placeId: 'ChIJ_self_farm_1',
          location: '28.6139,77.2090,14z',
          cost: 0,
          keywords: [
            { keyword: 'swimming pool near me', rank: 2.0 },
            { keyword: 'private swimming pool near me', rank: 3.0 },
            { keyword: 'swimming pool resort near me', rank: 21.0 },
          ],
        },
        {
          id: 'scan-intermediate',
          date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          provider: 'dataforseo',
          placeId: 'ChIJ_self_farm_1',
          location: '28.6139,77.2090,14z',
          cost: 0,
          keywords: [
            // Deliberately omit private swimming pool near me to test prior-scan per-keyword lookup
            { keyword: 'swimming pool near me', rank: 2.0 },
          ],
        },
      ],
    });

    globalThis.fetch = vi.fn(async (_url: any, init: any) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      const query = String(parsedBody.textQuery || '');
      if (query === 'swimming pool near me') {
        // Rank 2 across all 5 points => avg 2.0, delta = 2.0 - 2.0 = 0.0
        return new Response(
          JSON.stringify({ places: [{ id: 'other-1' }, { id: 'ChIJ_self_farm_1' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (query === 'private swimming pool near me') {
        // Rank 1 across all 5 points => avg 1.0, delta vs scan-prev = 3.0 - 1.0 = +2.0
        return new Response(
          JSON.stringify({ places: [{ id: 'ChIJ_self_farm_1' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Outside top 20 => avg 21.0
      return new Response(
        JSON.stringify({ places: [{ id: 'other-1' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as any;

    try {
      const { POST, GET } = await import('@/app/api/gbp/rankings/route');
      const postRes = await POST(
        new NextRequest('http://localhost:3000/api/gbp/rankings', {
          method: 'POST',
          body: JSON.stringify({ mode: 'batch_keywords', force: true }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      expect(postJson.skipped).toBe(false);

      const getRes = await GET();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();

      const sameRow = getJson.rankedKeywords.find((k: any) => k.keyword === 'swimming pool near me');
      const improvedRow = getJson.rankedKeywords.find((k: any) => k.keyword === 'private swimming pool near me');
      const outRow = getJson.rankedKeywords.find((k: any) => k.keyword === 'swimming pool resort near me');

      expect(sameRow).toEqual({ keyword: 'swimming pool near me', rank: 2, rankChange: 0 });
      expect(improvedRow).toEqual({ keyword: 'private swimming pool near me', rank: 1, rankChange: 2 });
      expect(outRow).toEqual({ keyword: 'swimming pool resort near me', rank: 21, rankChange: 0 });
    } finally {
      globalThis.fetch = origFetch;
      if (prevKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
      else process.env.GOOGLE_PLACES_API_KEY = prevKey;
    }
  });

  it('mobile PerformancePanel and GrowthReport distinguish unbaselined (~) from flat (▼ 0.0) and trigger batch_keywords', () => {
    const perfSrc = fs.readFileSync(
      path.join(process.cwd(), 'bgosmobile/src/components/gbp/performance-panel.tsx'),
      'utf8',
    );
    const reportSrc = fs.readFileSync(
      path.join(process.cwd(), 'bgosmobile/app/growth-report.tsx'),
      'utf8',
    );

    expect(perfSrc).toContain("mode: 'batch_keywords'");
    expect(perfSrc).toContain('Refresh Ranks');
    expect(perfSrc).toContain('isUnbaselined');
    expect(perfSrc).toContain('autoBatchScanTriggeredRef');

    expect(reportSrc).toContain("mode: 'batch_keywords'");
    expect(reportSrc).toContain('isDownOrFlat');
    expect(reportSrc).toContain('handleRefreshRanks');
  });
});
