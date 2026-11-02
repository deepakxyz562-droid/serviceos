import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted Mocks ────────────────────────────────────────────────────────────

const {
  mockTenant,
  mockGoogleAccount,
  mockDb,
  mockGenerateDailyAutopilotPost,
  mockGetTenantAutopilotConfig,
  mockAutopilotDue,
  mockPerfMetrics,
  mockSearchKeywords,
} = vi.hoisted(() => {
  const tenant: any = {
    id: 'tenant-autopilot-1',
    name: 'Apollo Diagnostics',
    city: 'Hyderabad',
    settingsJson: JSON.stringify({}),
  };

  const googleAccount = {
    id: 'acc-google-1',
    platform: 'googlebusiness',
    accountId: 'accounts/9988',
    accessToken: 'test-token',
    isActive: true,
    metadata: { locationId: 'locations/1122' },
  };

  const dbObj: any = {
    tenant: {
      findMany: vi.fn(async () => [tenant]),
      findUnique: vi.fn(async () => tenant),
      findUniqueOrThrow: vi.fn(async () => tenant),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(tenant, data);
        return tenant;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    socialAccount: {
      findFirst: vi.fn(async () => googleAccount),
    },
  };

  const generateDailyPost = vi.fn(async () => ({ success: true, postId: 'post-123' }));
  const getConfig = vi.fn(async () => ({
    enabled: true,
    duration: '30_days',
    platforms: ['googlebusiness'],
    postingTime: '09:00',
    timeZone: 'UTC',
    startDate: '2026-11-01',
    endDate: '2026-12-01',
    totalPostsCreated: 0,
    status: 'active' as const,
  }));
  const isDue = vi.fn(() => true);

  const perf = vi.fn(async () => ({
    searchImpressions: 450,
    mapsImpressions: 1280,
    callClicks: 32,
    directionRequests: 68,
    websiteClicks: 110,
    bookings: 5,
    conversations: 12,
  }));

  const keywords = vi.fn(async () => [
    { keyword: 'blood test lab near me', count: 180 },
    { keyword: 'diagnostic center in hyderabad', count: 95 },
  ]);

  return {
    mockTenant: tenant,
    mockGoogleAccount: googleAccount,
    mockDb: dbObj,
    mockGenerateDailyAutopilotPost: generateDailyPost,
    mockGetTenantAutopilotConfig: getConfig,
    mockAutopilotDue: isDue,
    mockPerfMetrics: perf,
    mockSearchKeywords: keywords,
  };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'user-admin',
    email: 'admin@apollo.com',
    tenantId: 'tenant-autopilot-1',
  })),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => mockGoogleAccount),
}));

vi.mock('@/lib/social/autopilot', () => ({
  generateDailyAutopilotPost: mockGenerateDailyAutopilotPost,
  getTenantAutopilotConfig: mockGetTenantAutopilotConfig,
  saveTenantAutopilotConfig: vi.fn(),
}));

vi.mock('@/lib/social/autopilot-schedule', () => ({
  autopilotDue: mockAutopilotDue,
}));

vi.mock('@/lib/social/adapters/googlebusiness', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    fetchGoogleBusinessPerformanceMetrics: mockPerfMetrics,
    fetchGoogleBusinessSearchKeywords: mockSearchKeywords,
  };
});

vi.mock('@/lib/whatsapp/inactivity-followup', () => ({
  processQuietChatFollowups: vi.fn(async () => ({ nudgedCount: 1 })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('In-Process Autopilot Worker Daemon & Free Native GBP Rankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autopilot Worker Daemon (In-Process)', () => {
    it('runs scheduled autopilot tick directly in-process without external worker or PM2', async () => {
      const { runAutopilotTick } = await import('@/lib/social/autopilot-worker-daemon');

      const result = await runAutopilotTick(new Date());

      expect(result.tenantsChecked).toBe(1);
      expect(result.processedCount).toBe(1);
      expect(result.publishedCount).toBe(1);
      expect(result.whatsappNudges).toBe(1);
      expect(mockGenerateDailyAutopilotPost).toHaveBeenCalledWith('tenant-autopilot-1');
    });

    it('manages daemon lifecycle gracefully (start and stop)', async () => {
      const { startBgosAutopilotWorker, stopBgosAutopilotWorker } = await import(
        '@/lib/social/autopilot-worker-daemon'
      );

      // Should not throw
      startBgosAutopilotWorker();
      stopBgosAutopilotWorker();
    });
  });

  describe('Rankings & Google Maps Discovery Fallback ($0 Zero-Cost)', () => {
    it('GET /api/gbp/rankings reports Google Profile connection status and discovery metrics', async () => {
      const { GET } = await import('@/app/api/gbp/rankings/route');
      const req = new NextRequest('http://localhost/api/gbp/rankings');

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.hasGoogleConnection).toBe(true);
    });

    it('POST /api/gbp/rankings with provider: google_native refreshes Google Maps discovery & top keywords without DataForSEO credentials', async () => {
      const { POST } = await import('@/app/api/gbp/rankings/route');
      const req = new NextRequest('http://localhost/api/gbp/rankings', {
        method: 'POST',
        body: JSON.stringify({ provider: 'google_native' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.nativeDiscovery).toBeDefined();
      expect(json.nativeDiscovery.mapsImpressions).toBe(1280);
      expect(json.nativeDiscovery.searchImpressions).toBe(450);
      expect(json.nativeDiscovery.totalViews).toBe(1730);
      expect(json.nativeDiscovery.keywords).toEqual([
        { keyword: 'blood test lab near me', count: 180 },
        { keyword: 'diagnostic center in hyderabad', count: 95 },
      ]);
    });

    it('POST /api/gbp/rankings rejects paid DataForSEO scan with 503 when DataForSEO credentials are missing', async () => {
      delete process.env.DATAFORSEO_LOGIN;
      delete process.env.DATAFORSEO_PASSWORD;

      const { POST } = await import('@/app/api/gbp/rankings/route');
      const req = new NextRequest('http://localhost/api/gbp/rankings', {
        method: 'POST',
        body: JSON.stringify({
          search: {
            placeId: 'ChIJ112233',
            location: '17.3850,78.4867,15z',
            keywords: ['pathology lab'],
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain('DataForSEO credentials must be configured');
    });
  });
});
