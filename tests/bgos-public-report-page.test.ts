import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockState = vi.hoisted(() => ({
  tenant: {
    id: 't-report-public',
    name: 'ShieldHire SOS',
    slug: 'shieldhire-sos',
    publicSlug: 'shieldhire-sos',
    city: 'Mumbai',
    country: 'India',
    industry: 'Security Guard Service',
    phone: '+91 98200 12345',
    email: 'contact@shieldhire.test',
    address: 'Andheri East, Mumbai, Maharashtra',
    latitude: 19.11,
    longitude: 72.86,
    googlePlaceId: 'places/ChIJshieldhire',
    website: 'https://shieldhire.test',
    rating: 4.8,
    reviewCount: 32,
    settingsJson: JSON.stringify({}),
    createdAt: new Date('2026-05-15T00:00:00Z'),
    brandProfile: {
      id: 'bp-sh',
      businessName: 'ShieldHire SOS',
      industry: 'Security Guard Service',
      location: 'Mumbai, Maharashtra',
    },
    users: [{ id: 'u-sh', name: 'Security Admin', email: 'contact@shieldhire.test', phone: '+91 98200 12345' }],
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: vi.fn(async () => mockState.tenant),
      findUnique: vi.fn(async () => mockState.tenant),
    },
    socialPost: {
      findMany: vi.fn(async () => [
        {
          id: 'post-1',
          tenantId: 't-report-public',
          content: 'Professional Security Guards in Mumbai',
          status: 'published',
          mediaUrls: '["https://example.com/guard.jpg"]',
          createdAt: new Date('2026-11-01T00:00:00Z'),
        },
      ]),
      count: vi.fn(async () => 1),
    },
    review: {
      count: vi.fn(async () => 12),
      findMany: vi.fn(async () => []),
    },
    service: {
      count: vi.fn(async () => 4),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => null), // Public visitor has no auth cookie
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => ({
    locations: [{ title: 'ShieldHire SOS', address: 'Andheri East, Mumbai' }],
    metadata: { locationTitle: 'ShieldHire SOS', category: 'Security Guard Service' },
  })),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessPerformanceMetrics: vi.fn(async () => ({
    searchViews: 450,
    mapsViews: 320,
    callClicks: 42,
    directionRequests: 28,
    monthlyTrends: {
      months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
      views: [100, 250, 400, 520, 680, 770],
      calls: [5, 12, 20, 28, 35, 42],
      directions: [4, 8, 14, 18, 22, 28],
    },
  })),
  listGoogleBusinessMedia: vi.fn(async () => ({ media: [] })),
  fetchGoogleBusinessPlaceDetails: vi.fn(async () => null),
  extractLocationRef: vi.fn(() => ({ accountId: 'acc', locationId: 'loc' })),
}));

vi.mock('@/lib/gbp/ai-business-profiler', () => ({
  getOrGenerateAiBusinessProfile: vi.fn(async () => ({
    highIntentKeywords: [
      { keyword: 'security guards in mumbai', volume: 500, defaultUsed: 2 },
      { keyword: 'armed bouncer service mumbai', volume: 350, defaultUsed: 1 },
    ],
  })),
}));

vi.mock('@/lib/gbp/audit', () => ({
  computeGbpAudit: vi.fn(async () => ({
    score: 88,
    grade: 'Excellent',
    isFullyOptimized: true,
    checks: [
      { id: '1', category: 'Identity', label: 'Address verified', passed: true, scoreWeight: 10, recommendation: '', actionRequired: '' },
    ],
    missingCount: 0,
    recommendations: [],
    connectedToGoogle: true,
    reviewsCount: 32,
  })),
}));

describe('Public Marketing Report & PDF Optimization', () => {
  it('allows unauthenticated visitors to download the monthly report PDF via ?slug=', async () => {
    const { GET } = await import('@/app/api/bgos/reports/monthly-pdf/route');
    const req = new NextRequest('https://bgos.site/api/bgos/reports/monthly-pdf?slug=shieldhire-sos');

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');

    const buffer = await res.arrayBuffer();
    const pdfHeader = Buffer.from(buffer.slice(0, 5)).toString('utf-8');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('renders a 4-page Executive PDF instead of 9 pages', async () => {
    const { generateMonthlyMarketingReportPdfBuffer } = await import('@/lib/reports/monthly-marketing-pdf');

    const pdfBuffer = await generateMonthlyMarketingReportPdfBuffer({
      businessName: 'ShieldHire SOS',
      monthName: 'November 2026',
      ownerName: 'Security Admin',
      category: 'Security Guard Service',
      address: 'Andheri East, Mumbai',
      marketingScore: 88,
      agentTasks: { ranking: 5, reviewReply: 12, media: 4, creative: 6, video: 2 },
      reviewReplyAgent: {
        reviewsChecked: 12,
        reviewsReplied: 12,
        keywordsUsedCount: 2,
        lifetimeReplies: 12,
        repliesThisMonth: [],
        keywordsUsed: [{ keyword: 'security guards in mumbai', volume: 500, usedCount: 2 }],
      },
      creativeAgent: {
        creativesPosted: 6,
        scheduled: 2,
        keywordsUsedCount: 2,
        lifetimeGenerated: 8,
        creatives: [],
        keywordsUsed: [{ keyword: 'security guards in mumbai', volume: 500, usedCount: 2 }],
      },
      mediaAgent: {
        mediaUploaded: 4,
        lifetimeMedia: 8,
        recommendedNextUploads: ['Team uniforms & security gear'],
      },
      growthNumbers: {
        months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        profileViews: [100, 250, 400, 520, 680, 770],
        profileViewsAnalysis: 'Profile views grew +13% MoM.',
        calls: [5, 12, 20, 28, 35, 42],
        callsAnalysis: '42 customer calls connected.',
        directionRequests: [4, 8, 14, 18, 22, 28],
        directionRequestsAnalysis: '28 directions navigated.',
        joinedMonthIndex: 0,
        joinedMonthLabel: 'May 2026',
      },
      recap: {
        googleUpdatesPosted: 6,
        reviewReplied: 12,
        mediaUploaded: 4,
        creativeGenerated: 8,
        creativePosted: 6,
        videoGenerated: 2,
        videoPosted: 1,
        summaryResult: 'Result: 770 Google Views · 42 Direct Calls · 28 Directions · 88/100 Score',
        growthActions: [
          { num: '1', title: 'Maintain Review Responses', desc: 'Instant 30s replies active.' },
        ],
      },
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Buffer contains standard PDF structure
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    // Verifies exactly 4 pages were generated in the PDF catalog
    const pdfString = pdfBuffer.toString('latin1');
    expect(pdfString).toContain('/Count 4');
    expect(pdfString).not.toContain('/Count 9');
  });
});
