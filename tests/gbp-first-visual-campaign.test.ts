// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  prepareGoogleAccount: vi.fn(),
  listGoogleBusinessMedia: vi.fn(),
  getCategoryImagesFromS3: vi.fn(),
  imageLibraryFindMany: vi.fn(),
  imageLibraryCount: vi.fn(),
  imageLibraryCreate: vi.fn(),
  designJobFindMany: vi.fn(),
  designJobFindUnique: vi.fn(),
  designJobFindFirst: vi.fn(),
  designJobCreate: vi.fn(),
  designJobUpdate: vi.fn(),
  tenantFindUnique: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  productSubFindFirst: vi.fn(),
  brandProfileFindUnique: vi.fn(),
  socialAccountFindFirst: vi.fn(),
  serviceFindMany: vi.fn(),
  socialPostCreateMany: vi.fn(),
  callAI: vi.fn(),
  generateDesignImage: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user_test_1',
    email: 'owner@test.com',
    tenantId: 'tenant_gbp_first',
    role: 'owner',
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: { findUnique: mocks.tenantFindUnique },
    subscription: { findFirst: mocks.subscriptionFindFirst },
    productSubscription: { findFirst: mocks.productSubFindFirst },
    brandProfile: { findUnique: mocks.brandProfileFindUnique },
    socialAccount: { findFirst: mocks.socialAccountFindFirst },
    service: { findMany: mocks.serviceFindMany },
    imageLibrary: {
      findMany: mocks.imageLibraryFindMany,
      count: mocks.imageLibraryCount,
      create: mocks.imageLibraryCreate,
    },
    designGenerationJob: {
      findMany: mocks.designJobFindMany,
      findUnique: mocks.designJobFindUnique,
      findFirst: mocks.designJobFindFirst,
      create: mocks.designJobCreate,
      update: mocks.designJobUpdate,
    },
    socialPost: {
      createMany: mocks.socialPostCreateMany,
    },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mocks.prepareGoogleAccount,
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  listGoogleBusinessMedia: mocks.listGoogleBusinessMedia,
}));

vi.mock('@/lib/designs/category-image-engine', () => ({
  getCategoryImagesFromS3: mocks.getCategoryImagesFromS3,
  getCategoryStorageFolder: (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  ensureOnboardingCategoryPack: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: mocks.callAI,
}));

vi.mock('@/lib/designs/image-provider', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    generateDesignImage: mocks.generateDesignImage,
  };
});

import { resolveTenantVisuals, pickPostVisualUrl } from '@/lib/designs/ai-visual-engine';
import { POST as generateBusinessImagePost } from '@/app/api/social/designs/business-images/generate/route';
import { POST as batchCampaignPost } from '@/app/api/social/ai-batch-campaign/route';

describe('GBP-Photos-First Visual Engine, Async 30-Day Campaign & Recraft V4.1 Flash V2 Priority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    mocks.productSubFindFirst.mockResolvedValue(null);
    mocks.socialAccountFindFirst.mockResolvedValue(null);
    mocks.serviceFindMany.mockResolvedValue([{ name: 'Armed Guard Security' }]);
    mocks.brandProfileFindUnique.mockResolvedValue({
      businessName: 'ShieldHire SOS',
      industry: 'Security guard service',
      location: 'Patna',
    });
  });

  it('prioritizes connected GBP photos ahead of uploaded, cached AI, and stock assets', async () => {
    mocks.prepareGoogleAccount.mockResolvedValue({ id: 'sa_gbp_1', accessToken: 'tok' });
    mocks.listGoogleBusinessMedia.mockResolvedValue({
      mediaItems: [
        { name: 'accounts/1/locations/2/media/1', googleUrl: 'https://lh3.googleusercontent.com/gbp-real-1.jpg', mediaFormat: 'PHOTO' },
        { name: 'accounts/1/locations/2/media/2', googleUrl: 'https://lh3.googleusercontent.com/gbp-video.mp4', mediaFormat: 'VIDEO' },
      ],
    });
    mocks.imageLibraryFindMany.mockResolvedValue([
      { name: 'AI photo', url: 'https://cdn.example.com/ai-1.webp', folder: 'bgos_ai_photos' },
      { name: 'Upload photo', url: 'https://cdn.example.com/upload-1.jpg', folder: 'uploaded' },
    ]);
    mocks.getCategoryImagesFromS3.mockResolvedValue(['https://s3.example.com/stock-1.webp']);

    const visuals = await resolveTenantVisuals({
      tenantId: 'tenant_gbp_first',
      industry: 'Security guard service',
      limit: 10,
    });

    expect(visuals.map((v) => v.source)).toEqual([
      'gbp_photo',
      'uploaded_photo',
      'ai_cached',
      'stock_library',
    ]);
    expect(visuals[0].url).toBe('https://lh3.googleusercontent.com/gbp-real-1.jpg');

    const picked = await pickPostVisualUrl({
      tenantId: 'tenant_gbp_first',
      industry: 'Security guard service',
      slotIndex: 0,
    });
    expect(picked?.source).toBe('gbp_photo');
  });

  it('skips autoStarter generation for non-paid trial users without burning AI quota', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: 'tenant_gbp_first',
      name: 'ShieldHire SOS',
      industry: 'Security guard service',
      city: 'Patna',
      planStatus: 'trial',
      plan: 'trial',
    });
    mocks.imageLibraryCount.mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoStarter: true,
        sceneTitle: 'Security Command',
        promptBlueprint: 'Commercial photography of security team',
      }),
    });

    const res = await generateBusinessImagePost(req);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('paid_subscription_required');
    expect(mocks.designJobCreate).not.toHaveBeenCalled();
  });

  it('prevents duplicate concurrent autoStarter runs for paid subscribers using atomic job lock', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: 'tenant_gbp_first',
      name: 'FieserOS',
      industry: 'Software company',
      city: 'Patna',
      planStatus: 'active',
      plan: 'growth',
    });
    mocks.imageLibraryCount.mockResolvedValue(0);
    mocks.designJobCreate.mockRejectedValue(new Error('Unique constraint failed on id'));

    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoStarter: true,
        sceneTitle: 'Software Workspace',
        promptBlueprint: 'Modern SaaS software office photography',
      }),
    });

    const res = await generateBusinessImagePost(req);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('starter_already_generated');
  });

  it('runs 30-day batch campaign with GBP photos first via createMany without it_software-001 fallback', async () => {
    mocks.designJobFindMany.mockResolvedValue([]);
    mocks.designJobCreate.mockResolvedValue({ id: 'campjob_1' });
    mocks.designJobUpdate.mockResolvedValue({});
    mocks.tenantFindUnique.mockResolvedValue({
      id: 'tenant_gbp_first',
      name: 'ShieldHire SOS',
      industry: 'Security guard service',
      city: 'Patna',
      phone: '+91 90000 00000',
      website: 'https://shieldhire.example',
      settingsJson: JSON.stringify({ activeGbpCategory: 'Security guard service', activeGbpCity: 'Patna' }),
      brandProfile: {
        businessName: 'ShieldHire SOS',
        industry: 'Security guard service',
        location: 'Patna',
      },
      socialAccounts: [{ id: 'sa_1', platform: 'googlebusiness', accountName: 'ShieldHire SOS', accountId: '123', isActive: true }],
      reviews: [],
      services: [{ name: 'Security Guard' }],
    });
    mocks.prepareGoogleAccount.mockResolvedValue({ id: 'sa_1', accessToken: 'tok' });
    mocks.listGoogleBusinessMedia.mockResolvedValue({
      mediaItems: [
        { name: 'm1', googleUrl: 'https://lh3.googleusercontent.com/shieldhire-gbp-1.jpg', mediaFormat: 'PHOTO' },
      ],
    });
    mocks.imageLibraryFindMany.mockResolvedValue([]);
    mocks.getCategoryImagesFromS3.mockResolvedValue([]);
    mocks.callAI.mockRejectedValue(new Error('Simulated timeout to verify dynamic fallback'));
    mocks.socialPostCreateMany.mockResolvedValue({ count: 30 });
    mocks.designJobFindUnique.mockImplementation(async () => ({
      id: mocks.designJobCreate.mock.calls[0]?.[0]?.data?.id || 'campjob_1',
      status: 'completed',
      resultJson: JSON.parse(JSON.stringify(mocks.designJobUpdate.mock.calls.at(-1)?.[0]?.data?.resultJson || '{}')),
    }));

    const req = new NextRequest('http://localhost:3000/api/social/ai-batch-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysCount: 30, sync: true }),
    });

    const res = await batchCampaignPost(req);
    const json = await res.json();

    expect(mocks.socialPostCreateMany).toHaveBeenCalledTimes(1);
    const insertedRows = mocks.socialPostCreateMany.mock.calls[0][0].data;
    expect(insertedRows).toHaveLength(30);
    expect(insertedRows[0].mediaUrls).toContain('shieldhire-gbp-1.jpg');
    expect(JSON.stringify(insertedRows)).not.toContain('it_software-001.webp');
    expect(mocks.generateDesignImage).not.toHaveBeenCalled();
    expect(json.status).toBe('completed');
  });
});
