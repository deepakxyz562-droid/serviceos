import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockState = vi.hoisted(() => ({
  tenant: {
    id: 't-test-kw',
    name: 'Delhi Pool Farm',
    city: 'Delhi',
    industry: 'Farmhouse & Pool',
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
  },
  trackedKeywords: [] as Array<Record<string, any>>,
  rankGridScans: [] as Array<Record<string, any>>,
  reviews: [{ rating: 5 }, { rating: 5 }, { rating: 4 }],
  competitors: [] as Array<Record<string, any>>,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'usr-kw-test',
    tenantId: 't-test-kw',
    email: 'test@example.com',
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => mockState.tenant),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => mockState.trackedKeywords),
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
});
