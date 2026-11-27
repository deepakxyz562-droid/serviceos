import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const perfHoisted = vi.hoisted(() => ({
  rpcCalls: 0,
  googleMediaCalls: 0,
  placesFetchCalls: 0,
  tenant: {
    id: 't-scale-1',
    name: 'Scale Business',
    slug: 'scale-business',
    publicSlug: 'scale-business',
    country: 'IN',
    phone: '+919999999999',
    address: 'Delhi, India',
    city: 'Delhi',
    settingsJson: JSON.stringify({ activeGbpCategory: 'Plumber' }),
    brandProfile: { businessName: 'Scale Business', industry: 'Plumber', location: 'Delhi' },
  },
  competitors: [
    { id: 'c1', placeId: 'p1', name: 'Comp One', rating: 4.5, reviewCount: 20, distanceKm: 1.2, category: 'Plumber' },
  ],
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'u-scale-1',
    tenantId: 't-scale-1',
    workspaceId: 'w-scale-1',
    role: 'owner',
    email: 'scale@example.com',
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => perfHoisted.tenant),
      update: vi.fn(async () => perfHoisted.tenant),
    },
    socialAccount: {
      findMany: vi.fn(async () => [{ tenantId: 't-scale-1', accountId: 'acc1', accountName: 'Scale', metadata: '{}' }]),
    },
    socialPost: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    competitor: {
      findMany: vi.fn(async () => perfHoisted.competitors),
    },
    review: {
      count: vi.fn(async () => 2),
      findMany: vi.fn(async () => [{ rating: 5 }, { rating: 4 }]),
    },
    rankGridScan: {
      findFirst: vi.fn(async () => null),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock('@/lib/supabase-db', () => ({
  shouldUseSupabaseDB: vi.fn(() => true),
  getAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase-rpc', () => ({
  getBgosDashboardSummary: vi.fn(async () => {
    perfHoisted.rpcCalls++;
    return {
      todayBookings: [],
      reviews: [{ id: 'r1', rating: 5, createdAt: new Date().toISOString(), authorName: 'A', comment: 'Great', responseJson: '{}', source: 'google' }],
      totalReviewsCount: 1,
      avgRating: 5.0,
      socialAccounts: [{ accountId: 'acc1', accountName: 'Scale', metadata: '{}' }],
      totalLeadsCount: 4,
      totalSubmissionsCount: 2,
      publishedSocialPosts: 3,
      scheduledSocialPosts: 1,
      pendingInvites: 0,
      sentInvites: 5,
    };
  }),
  checkDbRateLimit: vi.fn(async () => null),
}));

vi.mock('@/app/api/bgos/workspace/route', () => ({
  resolveWorkspaceData: vi.fn(async () => ({
    name: 'Scale Business',
    mode: 'local',
    publicSlug: 'scale-business',
    links: { profile: 'https://bgos.site/scale-business' },
  })),
}));

vi.mock('@/lib/gbp/marketing-score', () => ({
  computeMarketingScore: vi.fn(async () => ({ overallScore: 80, reviewCount: 1 })),
  readHistory: vi.fn(async () => []),
}));

vi.mock('@/lib/gbp/audit', () => ({
  computeGbpAudit: vi.fn(async () => ({ score: 85, grade: 'A', checks: [] })),
}));

vi.mock('@/lib/gbp/competitor-intelligence', () => ({
  fetchPlacesCompetitors: vi.fn(async () => {
    perfHoisted.placesFetchCalls++;
    return { competitors: [], queryUsed: '', locationUsed: '', selfMapsRank: null };
  }),
  ensureFreshCompetitorIntelligence: vi.fn(async () => null),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => ({ accessToken: 'tok', accountId: 'acc1', locationId: 'loc1' })),
}));

vi.mock('@/lib/social/google-connection-state', () => ({
  resolveGoogleConnectionState: vi.fn(async () => ({ isConnected: true, connectionState: 'connected' })),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessPerformanceMetrics: vi.fn(async () => null),
  listGoogleBusinessMedia: vi.fn(async () => {
    perfHoisted.googleMediaCalls++;
    return { mediaItems: [] };
  }),
}));

vi.mock('@/lib/social/google-review-scope', () => ({
  googleReviewScope: vi.fn(async () => ({})),
}));

describe('BGOS 5,000+ User API Performance, Scaling & Security (No Redis)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    perfHoisted.rpcCalls = 0;
    perfHoisted.googleMediaCalls = 0;
    perfHoisted.placesFetchCalls = 0;
  });

  it('RateLimiter bounds store size via LRU eviction and enforces per-tenant limits', async () => {
    const { RateLimiter, apiLimiter, applyTenantRateLimit, tenantAiLimiter } = await import('@/lib/rate-limit');
    const tiny = new RateLimiter(60_000, 2, 3);
    tiny.check('k1');
    tiny.check('k2');
    tiny.check('k3');
    tiny.check('k4'); // evicts k1
    expect(tiny.check('k1').remaining).toBe(1); // evicted key starts fresh

    // CGNAT-safe global IP limit allows bursts cleanly
    expect(apiLimiter.check('carrier-ip-1').remaining).toBeGreaterThanOrEqual(1000);

    // Tenant AI rate limit rejects once exhausted
    const rl = new RateLimiter(60_000, 2, 100);
    expect((await applyTenantRateLimit(rl, 't-a', 'test-ai', 60_000, 2)).success).toBe(true);
    expect((await applyTenantRateLimit(rl, 't-a', 'test-ai', 60_000, 2)).success).toBe(true);
    expect((await applyTenantRateLimit(rl, 't-a', 'test-ai', 60_000, 2)).success).toBe(false);
    expect(tenantAiLimiter).toBeDefined();
  });

  it('GET /api/bgos/dashboard/bootstrap uses 1-RPC summary and honors ETag / 304 Not Modified', async () => {
    const { GET } = await import('@/app/api/bgos/dashboard/bootstrap/route');
    const { invalidateBootstrapCache } = await import('@/lib/bgos/bootstrap-cache');
    invalidateBootstrapCache('t-scale-1');

    const res1 = await GET(new NextRequest('http://localhost:3000/api/bgos/dashboard/bootstrap'));
    expect(res1.status).toBe(200);
    expect(perfHoisted.rpcCalls).toBe(1);
    const etag = res1.headers.get('etag');
    expect(etag).toBeTruthy();

    const res2 = await GET(
      new NextRequest('http://localhost:3000/api/bgos/dashboard/bootstrap', {
        headers: { 'if-none-match': etag! },
      }),
    );
    expect(res2.status).toBe(304);
  });

  it('GET /api/social/photos caches live Google Business media in bounded LRU and avoids repeat API hits', async () => {
    const { GET } = await import('@/app/api/social/photos/route');
    const res1 = await GET(new NextRequest('http://localhost:3000/api/social/photos'));
    expect(res1.status).toBe(200);
    expect(res1.headers.get('x-cache')).toBe('MISS');
    expect(perfHoisted.googleMediaCalls).toBe(1);

    const res2 = await GET(new NextRequest('http://localhost:3000/api/social/photos'));
    expect(res2.status).toBe(200);
    expect(res2.headers.get('x-cache')).toBe('HIT');
    expect(perfHoisted.googleMediaCalls).toBe(1);
  });

  it('GET /api/gbp/competitors serves clean DB rows immediately without blocking on Places search', async () => {
    const { GET } = await import('@/app/api/gbp/competitors/route');
    const res = await GET(new NextRequest('http://localhost:3000/api/gbp/competitors'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.competitors.some((c: any) => c.name === 'Comp One')).toBe(true);
    expect(perfHoisted.placesFetchCalls).toBe(0);
  });

  it('GET /api/cron/bgos-warmup validates cron secret and warms active tenants', async () => {
    process.env.CRON_SECRET = 'cron-test-secret';
    const { GET } = await import('@/app/api/cron/bgos-warmup/route');

    const unauth = await GET(new NextRequest('http://localhost:3000/api/cron/bgos-warmup'));
    expect(unauth.status).toBe(401);

    const ok = await GET(
      new NextRequest('http://localhost:3000/api/cron/bgos-warmup', {
        headers: { 'x-cron-secret': 'cron-test-secret' },
      }),
    );
    expect(ok.status).toBe(200);
    const json = await ok.json();
    expect(json.ok).toBe(true);
    expect(json.warmed).toBe(1);
  });
});
