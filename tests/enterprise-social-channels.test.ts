import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  postCreate: vi.fn(),
  postFindFirst: vi.fn(),
  postFindUnique: vi.fn(),
  accountsFindMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  credentialFindFirst: vi.fn(),
  publishPost: vi.fn(),
  prepareGoogleAccount: vi.fn(),
  getAuthUser: vi.fn(),
  verifyToken: vi.fn(),
  verifyHandoffTicket: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.getAuthUser,
  verifyToken: mocks.verifyToken,
  getAppUrl: () => 'https://fieseros.com',
}));

vi.mock('@/lib/bgos-mobile-auth', () => ({
  verifyHandoffTicket: mocks.verifyHandoffTicket,
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: async () => ({ ok: true }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    socialPost: {
      create: mocks.postCreate,
      findFirst: mocks.postFindFirst,
      findUnique: mocks.postFindUnique,
    },
    socialAccount: {
      findMany: mocks.accountsFindMany,
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
    integrationCredential: {
      findFirst: mocks.credentialFindFirst,
    },
    imageLibrary: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/social/publisher', () => ({
  publishPost: mocks.publishPost,
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mocks.prepareGoogleAccount,
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  listGoogleBusinessMedia: vi.fn().mockResolvedValue([]),
  uploadGoogleBusinessMedia: vi.fn(),
}));

import { POST as postPhotos } from '@/app/api/social/photos/route';
import { GET as linkedinOAuth } from '@/app/api/oauth/linkedin/route';
import { isProviderKeyRowQuotaExhausted, parseMultiEnvKeys } from '@/lib/designs/image-provider';
import { resolveDeduplicatedCampaignTargets } from '@/lib/social/batch-campaign-runner';
import {
  dedupePublishTargets,
  getPlatformMeta,
  optimizeThumbnailUrl,
  stripRawCtaLines,
} from '../bgosmobile/src/components/social/platform-meta';

describe('Enterprise Social Channels & Campaign Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUser.mockResolvedValue({ id: 'usr-1', tenantId: 'tenant-fieseros' });
    mocks.verifyToken.mockReturnValue(null);
    mocks.verifyHandoffTicket.mockReturnValue(null);
    mocks.credentialFindFirst.mockResolvedValue({
      clientId: 'li-client-123',
      clientSecret: 'li-secret',
      scopes: null,
      redirectUri: null,
    });
    mocks.postFindFirst.mockResolvedValue(null);
    mocks.tenantFindUnique.mockResolvedValue({
      name: 'FieserOS',
      country: 'IN',
      settingsJson: JSON.stringify({ timeZone: 'Asia/Kolkata' }),
      brandProfile: { businessName: 'FieserOS' },
    });
    mocks.prepareGoogleAccount.mockResolvedValue({ id: 'gbp-primary', platform: 'googlebusiness' });
    mocks.accountsFindMany.mockResolvedValue([
      { id: 'fb-1', platform: 'facebook' },
      { id: 'ig-1', platform: 'instagram' },
    ]);
    mocks.postCreate.mockResolvedValue({ id: 'post-multi-1', status: 'draft' });
    mocks.postFindUnique.mockResolvedValue({
      id: 'post-multi-1',
      status: 'published',
      publishTargets: JSON.stringify([
        { platform: 'googlebusiness', status: 'published', permalink: 'https://maps.google.com/p1' },
        { platform: 'facebook', status: 'published', permalink: 'https://facebook.com/p1' },
        { platform: 'instagram', status: 'published', permalink: 'https://instagram.com/p1' },
      ]),
    });
  });

  it('scopes campaign publish targets to active GBP location and deduplicates platforms', () => {
    const accounts = [
      { id: 'gbp-loc-1', platform: 'googlebusiness', accountId: '111', isActive: true },
      { id: 'gbp-loc-2', platform: 'googlebusiness', accountId: '10777612572223040949', isActive: true },
      { id: 'gbp-loc-3', platform: 'googlebusiness', accountId: '333', isActive: true },
      { id: 'gbp-loc-4', platform: 'googlebusiness', accountId: '444', isActive: true },
      { id: 'fb-acc', platform: 'facebook', accountId: 'fb1', isActive: true },
      { id: 'ig-acc', platform: 'instagram', accountId: 'ig1', isActive: true },
    ];

    const resolved = resolveDeduplicatedCampaignTargets(
      accounts,
      ['googlebusiness', 'instagram', 'facebook'],
      '10777612572223040949',
    );

    expect(resolved).toEqual([
      { platform: 'googlebusiness', socialAccountId: 'gbp-loc-2', status: 'pending' },
      { platform: 'instagram', socialAccountId: 'ig-acc', status: 'pending' },
      { platform: 'facebook', socialAccountId: 'fb-acc', status: 'pending' },
    ]);
  });

  it('dedupes legacy GOO/FAC/INS targets, optimizes Google CDN URLs, and strips raw CTA lines', () => {
    const legacyTargets = [
      { platform: 'googlebusiness', status: 'pending' },
      { platform: 'googlebusiness', status: 'published', permalink: 'https://maps.google.com/1' },
      { platform: 'facebook', status: 'pending' },
      { platform: 'instagram', status: 'pending' },
      { platform: 'googlebusiness', status: 'pending' },
    ];

    const deduped = dedupePublishTargets(legacyTargets);
    expect(deduped.map((t) => t.platform)).toEqual(['googlebusiness', 'facebook', 'instagram']);
    expect(deduped[0].status).toBe('published');
    expect(getPlatformMeta('googlebusiness').brandIcon).toBe('google');
    expect(getPlatformMeta('facebook').brandIcon).toBe('facebook');
    expect(getPlatformMeta('instagram').brandIcon).toBe('instagram');
    expect(getPlatformMeta('linkedin').brandIcon).toBe('linkedin');

    expect(
      optimizeThumbnailUrl('https://lh3.googleusercontent.com/grass-cs/abc123=s0', 360),
    ).toBe('https://lh3.googleusercontent.com/grass-cs/abc123=w360-h360-c');

    expect(
      stripRawCtaLines('Headline\n\nBody copy\n\nCTA: CALL\n\n#tag1'),
    ).toBe('Headline\n\nBody copy\n\n#tag1');
  });

  it('GET /api/oauth/linkedin authenticates both mobile handoff tickets and ?auth= tokens', async () => {
    mocks.getAuthUser.mockResolvedValue(null);
    mocks.verifyHandoffTicket.mockReturnValueOnce({
      id: 'usr-li-1',
      userId: 'usr-li-1',
      tenantId: 'tenant-fieseros',
      email: 'owner@fieseros.com',
      role: 'owner',
    });

    const ticketReq = new NextRequest(
      'https://fieseros.com/api/oauth/linkedin?ticket=ticket-abc&originHost=https%3A%2F%2Ffieseros.com&returnUrl=bgos%3A%2F%2Fgbp-callback',
    );
    const ticketRes = await linkedinOAuth(ticketReq);
    expect(ticketRes.status).toBeGreaterThanOrEqual(300);
    expect(ticketRes.status).toBeLessThan(400);
    expect(ticketRes.headers.get('location')).toContain('linkedin.com/oauth');

    mocks.verifyHandoffTicket.mockReturnValue(null);
    mocks.verifyToken.mockReturnValueOnce({
      id: 'usr-li-2',
      tenantId: 'tenant-fieseros',
      role: 'owner',
    });
    const authReq = new NextRequest(
      'https://fieseros.com/api/oauth/linkedin?auth=jwt-token-xyz&originHost=https%3A%2F%2Ffieseros.com',
    );
    const authRes = await linkedinOAuth(authReq);
    expect(authRes.status).toBeGreaterThanOrEqual(300);
    expect(authRes.status).toBeLessThan(400);
    expect(authRes.headers.get('location')).toContain('linkedin.com/oauth');
  });

  it('POST /api/social/photos includes checked social platforms alongside Google Business', async () => {
    const req = new NextRequest('https://serviceos.com/api/social/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://serviceos-uploads.s3.us-east-1.amazonaws.com/poster.png',
        title: 'Custom Web Apps',
        description: 'Delivering scalable software in Patna.',
        postType: 'whats_new',
        platforms: ['googlebusiness', 'facebook', 'instagram'],
        scheduleMode: 'instant',
      }),
    });

    const res = await postPhotos(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.platforms).toEqual(['googlebusiness', 'facebook', 'instagram']);
    const createdTargets = JSON.parse(mocks.postCreate.mock.calls[0][0].data.publishTargets);
    expect(createdTargets.map((t: any) => t.platform)).toEqual([
      'googlebusiness',
      'facebook',
      'instagram',
    ]);
    expect(createdTargets.find((t: any) => t.platform === 'facebook')?.socialAccountId).toBe('fb-1');
    expect(createdTargets.find((t: any) => t.platform === 'instagram')?.socialAccountId).toBe('ig-1');
  });

  it('detects recently quota-exhausted provider key rows so exhausted DB keys are skipped cleanly', () => {
    expect(
      isProviderKeyRowQuotaExhausted({
        lastError: 'openrouter HTTP 429: Rate limit exceeded: free-models-per-day',
        lastErrorAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }),
    ).toBe(true);

    expect(
      isProviderKeyRowQuotaExhausted({
        lastError: 'gemini HTTP 402: Your prepayment credits are depleted',
        lastErrorAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      }),
    ).toBe(true);

    expect(
      isProviderKeyRowQuotaExhausted({
        lastError: 'openrouter HTTP 429: Rate limit exceeded: free-models-per-day',
        lastErrorAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
    ).toBe(false);

    expect(isProviderKeyRowQuotaExhausted({ lastError: null, lastErrorAt: null })).toBe(false);
  });

  it('parses and deduplicates multi-key OpenRouter env configuration', () => {
    const keys = parseMultiEnvKeys([
      'sk-or-v1-keyA, sk-or-v1-keyB\nsk-or-v1-keyA',
      'sk-or-v1-keyC',
      undefined,
    ]);
    expect(keys).toEqual(['sk-or-v1-keyA', 'sk-or-v1-keyB', 'sk-or-v1-keyC']);
  });
});
