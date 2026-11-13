import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock Dependencies ──
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/social/publisher', () => ({
  publishPost: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/designs/image-provider', () => ({
  generateDesignImage: vi.fn().mockResolvedValue({
    bytes: Buffer.from('mock-image-bytes'),
    model: '@cf/black-forest-labs/flux-1-schnell',
    cost: 0,
  }),
}));

vi.mock('@/lib/designs/assets', () => ({
  saveDesignAsset: vi.fn().mockResolvedValue({
    assetId: 'asset-123',
    url: 'https://storage.fieseros.com/design-assets/test.png',
  }),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn().mockResolvedValue({
    id: 'sa-google',
    accountId: 'accounts/112233',
    accessToken: 'mock-token',
    metadata: { locationId: 'locations/445566' },
  }),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  replyToGoogleBusinessReview: vi.fn().mockResolvedValue({ success: true }),
  deleteGoogleBusinessReviewReply: vi.fn().mockResolvedValue({ success: true }),
  extractLocationRef: vi.fn((acc: any) => 'locations/445566'),
}));

// In-memory data store for tests
const mockTenant: any = {
  id: 'tenant-fieseros',
  name: 'FieserOS Heating & Plumbing',
  slug: 'fieseros-heating',
  city: 'Patna',
  phone: '+91 98765 43210',
  settingsJson: JSON.stringify({}),
  brandProfile: {
    businessName: 'FieserOS Heating & Plumbing',
    industry: 'Heating contractor',
    location: 'Patna',
  },
  socialAccounts: [
    { id: 'acc-gbp', platform: 'googlebusiness', isActive: true, accountName: 'FieserOS GBP' },
    { id: 'acc-ig', platform: 'instagram', isActive: true, accountName: '@fieseros' },
    { id: 'acc-fb', platform: 'facebook', isActive: true, accountName: 'FieserOS FB' },
  ],
  trackedKeywords: [
    { id: 'kw-1', keyword: 'boiler repair in Patna', position: 1, score: 500 },
    { id: 'kw-2', keyword: 'heating installation Patna', position: 2, score: 350 },
    { id: 'kw-3', keyword: 'emergency plumber near me', position: 3, score: 700 },
  ],
};

const mockReviews: Record<string, any> = {
  'rev-published': {
    id: 'rev-published',
    tenantId: 'tenant-fieseros',
    rating: 5,
    comment: 'Exceptional service and quick response!',
    status: 'published',
    responseJson: '{}',
  },
  'rev-pending': {
    id: 'rev-pending',
    tenantId: 'tenant-fieseros',
    rating: 4,
    comment: 'Great work, will hire again.',
    status: 'pending',
    responseJson: '{}',
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    review: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) => {
        return mockReviews[where.id] || null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        if (mockReviews[where.id]) {
          mockReviews[where.id] = { ...mockReviews[where.id], ...data };
          return mockReviews[where.id];
        }
        return null;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        delete mockReviews[where.id];
        return { success: true };
      }),
    },
    tenant: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'tenant-fieseros') return mockTenant;
        return null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        if (where.id === 'tenant-fieseros') {
          Object.assign(mockTenant, data);
          return mockTenant;
        }
        return null;
      }),
    },
    socialPost: {
      create: vi.fn(async ({ data }: { data: any }) => {
        return { id: 'post-' + Math.random().toString(36).substring(7), ...data, createdAt: new Date() };
      }),
      findMany: vi.fn(async () => []),
    },
    socialAccount: {
      findMany: vi.fn(async () => mockTenant.socialAccounts),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => mockTenant.trackedKeywords),
    },
    activityLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

describe('GBP Reviews, Autopilot 30d/1yr, Rankings, Page Creation & Website Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviews['rev-pending'] = {
      id: 'rev-pending',
      tenantId: 'tenant-fieseros',
      rating: 4,
      comment: 'Great work, will hire again.',
      status: 'pending',
      responseJson: '{}',
    };
    mockReviews['rev-published'] = {
      id: 'rev-published',
      tenantId: 'tenant-fieseros',
      rating: 5,
      comment: 'Exceptional service and quick response!',
      status: 'published',
      responseJson: '{}',
    };
  });

  // ── 1. Google Business Review Pending Lock ──
  describe('Review Status & Pending Lock', () => {
    it('stops reply updates with 409 when review status is pending', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { POST } = await import('@/app/api/reviews/[id]/reply/route');
      const req = new NextRequest('http://localhost/api/reviews/rev-pending/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: 'Thank you for your feedback!' }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: 'rev-pending' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('pending status');
    });

    it('allows reply updates when review status is published', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { POST } = await import('@/app/api/reviews/[id]/reply/route');
      const req = new NextRequest('http://localhost/api/reviews/rev-published/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: 'Glad we could help!' }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: 'rev-published' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('blocks PUT edits to pending reviews unless explicitly changing status', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { PUT } = await import('@/app/api/reviews/[id]/route');
      const req = new NextRequest('http://localhost/api/reviews/rev-pending', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Modified text while pending' }),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: 'rev-pending' }) });
      expect(res.status).toBe(409);
    });

    it('blocks DELETE on pending reviews', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { DELETE } = await import('@/app/api/reviews/[id]/route');
      const req = new NextRequest('http://localhost/api/reviews/rev-pending', { method: 'DELETE' });

      const res = await DELETE(req, { params: Promise.resolve({ id: 'rev-pending' }) });
      expect(res.status).toBe(409);
    });
  });

  // ── 2. Autopilot 30d / 1yr Daily Posting ──
  describe('Social Autopilot Daily Engine (30d / 1yr)', () => {
    it('saves autopilot configuration for 30 days and 1 year', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { POST, GET } = await import('@/app/api/social/autopilot/route');

      // 1. Enable for 1 Year
      const postReq = new NextRequest('http://localhost/api/social/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          duration: '1_year',
          platforms: ['googlebusiness', 'instagram', 'facebook'],
          postingTime: '09:00',
        }),
      });

      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.config.enabled).toBe(true);
      expect(postJson.config.duration).toBe('1_year');
      expect(postJson.daysRemaining).toBeGreaterThanOrEqual(364);

      // 2. Fetch GET
      const getReq = new NextRequest('http://localhost/api/social/autopilot');
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.connectedPlatforms).toContain('googlebusiness');
      expect(getJson.connectedPlatforms).toContain('instagram');
      expect(getJson.connectedPlatforms).toContain('facebook');
    });
  });

  // ── 3. Local Ranking Status with History ──
  describe('Local Ranking Status & History Tracker', () => {
    it('does not fabricate rankings when no measured scans exist', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { GET, POST } = await import('@/app/api/gbp/rankings/route');
      const req = new NextRequest('http://localhost/api/gbp/rankings');

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.currentAvgRank).toBeNull();
      expect(json.totalImprovement).toBeNull();
      expect(json.history).toEqual([]);
      expect(json.keywords).toEqual([]);

      // Rescan POST
      const rescanReq = new NextRequest('http://localhost/api/gbp/rankings', { method: 'POST' });
      const rescanRes = await POST(rescanReq);
      expect(rescanRes.status).toBe(503);
    });
  });

  // ── 4. Google Business Page Creation ──
  describe('Google Business Page Creation API', () => {
    it('rejects profile creation without a valid parent Google account', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { POST } = await import('@/app/api/gbp/locations/create/route');
      const req = new NextRequest('http://localhost/api/gbp/locations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'FieserOS Prime Plumbing',
          primaryCategory: 'Plumber',
          locality: 'Patna',
          administrativeArea: 'Bihar',
          postalCode: '800001',
          phone: '+91 99887 76655',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toContain('Reconnect Google');

    });
  });

  // ── 5. Google Business Website Builder ──
  describe('Google Business Website Generator API', () => {
    it('generates public website and syncs with Google Business Profile', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      const { POST } = await import('@/app/api/gbp/website/generate/route');
      const req = new NextRequest('http://localhost/api/gbp/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncToGoogle: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.websiteUrl).toContain('https://bgos.site/b/fieseros-heating');
    });

    it('preserves existing custom website on Google Business Profile and does not overwrite it with bgos.site', async () => {
      const { getAuthUser } = await import('@/lib/auth');
      vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', email: 'owner@fieseros.com', tenantId: 'tenant-fieseros' } as any);

      // Set existing custom website on tenant
      mockTenant.website = 'https://drsharmaclinic.com';

      const { POST } = await import('@/app/api/gbp/website/generate/route');
      const req = new NextRequest('http://localhost/api/gbp/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncToGoogle: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.preservedCustomWebsite).toBe('https://drsharmaclinic.com');
      expect(json.message).toContain('drsharmaclinic.com');
      expect(mockTenant.website).toBe('https://drsharmaclinic.com');

      // Reset
      mockTenant.website = undefined;
    });
  });
});
