import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  findAuthUser: vi.fn(),
  findTenant: vi.fn(),
  findSocialAccount: vi.fn(),
  findManySocialAccount: vi.fn(),
  countSocialAccount: vi.fn(),
  findManySocialPost: vi.fn(),
  countSocialPost: vi.fn(),
  createSocialPost: vi.fn(),
  findManyReview: vi.fn(),
  countReview: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: m.findAuthUser,
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: { findUnique: m.findTenant },
    socialAccount: {
      findFirst: m.findSocialAccount,
      findMany: m.findManySocialAccount,
      count: m.countSocialAccount,
    },
    socialPost: {
      findMany: m.findManySocialPost,
      count: m.countSocialPost,
      create: m.createSocialPost,
    },
    review: {
      findMany: m.findManyReview,
      count: m.countReview,
    },
  },
}));

vi.mock('@/lib/activity-log', () => ({
  logActivity: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/brand-safety-gate', () => ({
  validateBrandSafety: () => ({ passed: true, violations: [] }),
}));

vi.mock('@/lib/social/crypto', () => ({
  decryptToken: (token: string) => token,
  encryptToken: (token: string) => token,
}));

import { googleReviewScope } from '@/lib/social/google-review-scope';
import { GET as getPosts, POST as createPost } from '@/app/api/social/posts/route';

describe('Multi-profile Reviews & Posts Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.findAuthUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      role: 'owner',
    });
  });

  it('strictly scopes reviews to locationId without leaking all google reviews when multiple accounts exist', async () => {
    // Tenant has 2 Google accounts
    m.countSocialAccount.mockResolvedValue(2);
    m.findTenant.mockResolvedValue({
      id: 'tenant-1',
      settingsJson: JSON.stringify({ activeGbpLocationId: 'loc-branch-2' }),
    });

    m.findSocialAccount.mockResolvedValue({
      id: 'sa-2',
      accountId: 'loc-branch-2',
      accountName: 'Branch 2 Business',
      accessToken: 'encrypted-token',
      metadata: JSON.stringify({ accountName: 'accounts/123456', locationId: 'loc-branch-2' }),
    });

    const scope = await googleReviewScope('tenant-1', 'loc-branch-2');
    expect(scope.OR).toBeDefined();

    // Verify it contains location-specific checks
    expect(scope.OR).toContainEqual({
      googleReviewId: { startsWith: 'locations/loc-branch-2/reviews/' },
    });
    expect(scope.OR).toContainEqual({
      googleReviewId: { contains: 'loc-branch-2' },
    });
    expect(scope.OR).toContainEqual({
      responseJson: { contains: 'loc-branch-2' },
    });

    // CRITICAL: Ensure leaky { source: 'google' } is NOT present when multiple accounts exist!
    expect(scope.OR).not.toContainEqual({ source: 'google' });
  });

  it('permits unscoped source=google fallback only when single account exists and no locationId is specified', async () => {
    // Tenant has only 1 Google account
    m.countSocialAccount.mockResolvedValue(1);
    m.findTenant.mockResolvedValue({
      id: 'tenant-1',
      settingsJson: null,
    });

    m.findManySocialAccount.mockResolvedValue([
      {
        id: 'sa-1',
        accountId: 'loc-single',
        accountName: 'Single Business',
        accessToken: 'encrypted-token',
        metadata: JSON.stringify({ accountName: 'accounts/123456', locationId: 'loc-single' }),
      },
    ]);

    const scope = await googleReviewScope('tenant-1');
    expect(scope.OR).toContainEqual({ source: 'google' });
  });

  it('GET /api/social/posts scopes to active Google Business socialAccountId when profileId is provided', async () => {
    m.countSocialAccount.mockResolvedValue(2);
    m.findTenant.mockResolvedValue({
      id: 'tenant-1',
      settingsJson: JSON.stringify({ activeGbpLocationId: 'loc-branch-2' }),
    });

    m.findSocialAccount.mockResolvedValue({
      id: 'sa-branch-2',
      accountId: 'loc-branch-2',
      accountName: 'Branch 2',
      accessToken: 'encrypted-token',
      metadata: JSON.stringify({ accountName: 'accounts/123456', locationId: 'loc-branch-2' }),
    });

    m.findManySocialPost.mockResolvedValue([]);
    m.countSocialPost.mockResolvedValue(0);

    const req = new NextRequest(
      'https://fieseros.com/api/social/posts?platform=googlebusiness&profileId=loc-branch-2',
    );
    const res = await getPosts(req);
    expect(res.status).toBe(200);

    expect(m.findManySocialPost).toHaveBeenCalled();
    const query = m.findManySocialPost.mock.calls[0][0];

    // Verify query OR condition matches the specific active account id
    expect(query.where.OR).toContainEqual({
      publishTargets: { contains: '"socialAccountId":"sa-branch-2"' },
    });
    // Ensure generic 'platform':'googlebusiness' is NOT matched for multi-location profile query
    expect(query.where.OR).not.toContainEqual({
      publishTargets: { contains: '"platform":"googlebusiness"' },
    });
  });

  it('POST /api/social/posts automatically resolves targets to active Google Business location', async () => {
    m.findTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test Tenant',
      settingsJson: JSON.stringify({ activeGbpLocationId: 'loc-branch-2' }),
    });

    // Two accounts exist in DB
    m.findManySocialAccount.mockImplementation(async ({ where }) => {
      if (where.platform?.in) {
        return [
          { id: 'sa-1', platform: 'googlebusiness', accountId: 'loc-branch-1' },
          { id: 'sa-2', platform: 'googlebusiness', accountId: 'loc-branch-2' },
        ];
      }
      if (where.id?.in) {
        return [{ id: 'sa-2', platform: 'googlebusiness', accountId: 'loc-branch-2' }];
      }
      return [];
    });

    m.findSocialAccount.mockResolvedValue({
      id: 'sa-2',
      accountId: 'loc-branch-2',
      accountName: 'Branch 2',
      accessToken: 'encrypted-token',
      metadata: JSON.stringify({ accountName: 'accounts/123456', locationId: 'loc-branch-2' }),
    });

    m.createSocialPost.mockResolvedValue({
      id: 'post-new',
      content: 'Hello from Branch 2',
      status: 'draft',
      publishTargets: JSON.stringify([{ platform: 'googlebusiness', socialAccountId: 'sa-2', status: 'pending' }]),
    });

    const req = new NextRequest('https://fieseros.com/api/social/posts', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Exciting news from our second branch!',
        platforms: ['googlebusiness'],
        status: 'draft',
      }),
    });

    const res = await createPost(req);
    expect(res.status).toBe(201);

    expect(m.createSocialPost).toHaveBeenCalled();
    const createdPayload = m.createSocialPost.mock.calls[0][0].data;
    const parsedTargets = JSON.parse(createdPayload.publishTargets);

    // Verify it targeted sa-2 (Branch 2) instead of defaulting to sa-1 (Branch 1)
    expect(parsedTargets[0].socialAccountId).toBe('sa-2');
  });

  it('falls back safely without 500 error when extractLocationRef fails on pending-approval account', async () => {
    m.countSocialAccount.mockResolvedValue(1);
    m.findTenant.mockResolvedValue({
      id: 'tenant-1',
      settingsJson: null,
    });
    m.findManySocialAccount.mockResolvedValue([
      {
        id: 'sa-pending',
        accountId: '5008',
        accountName: 'Google Business Profile (Pending Approval)',
        accessToken: 'encrypted-token',
        metadata: JSON.stringify({
          accountName: 'accounts/primary',
          locationId: '5008',
          pendingApiApproval: true,
        }),
      },
    ]);

    const scope = await googleReviewScope('tenant-1');
    expect(scope).toEqual({ source: 'google' });
  });

  it('quotes and escapes PostgREST OR/NOT filter values containing quotes or reserved chars', async () => {
    const {
      formatPostgrestOrValue,
      buildOrConditionPart,
      applyWhereFilters,
    } = await import('@/lib/supabase-db');

    expect(formatPostgrestOrValue('%"text":"%')).toBe('"%\\"text\\":\\"%"');
    expect(formatPostgrestOrValue('2026-11-09T10:00:00.000Z')).toBe('2026-11-09T10:00:00.000Z');

    const orCalls: string[] = [];
    const mockQuery = {
      or: (f: string) => { orCalls.push(f); return mockQuery; },
      not: () => mockQuery,
      eq: () => mockQuery,
      neq: () => mockQuery,
      in: () => mockQuery,
      is: () => mockQuery,
      ilike: () => mockQuery,
      gt: () => mockQuery,
      gte: () => mockQuery,
      lt: () => mockQuery,
      lte: () => mockQuery,
      order: () => mockQuery,
    } as any;

    applyWhereFilters(mockQuery, {
      AND: [
        { NOT: { responseJson: { contains: '"text":"' } } },
        { NOT: { responseJson: { contains: '"replyText":"' } } },
      ],
    });

    expect(orCalls).toEqual([
      'responseJson.is.null,responseJson.not.ilike."%\\"text\\":\\"%"',
      'responseJson.is.null,responseJson.not.ilike."%\\"replyText\\":\\"%"',
    ]);

    expect(
      buildOrConditionPart({ publishTargets: { contains: '"socialAccountId":"sa-1"' } }),
    ).toBe('publishTargets.ilike."%\\"socialAccountId\\":\\"sa-1\\"%"');
  });
});
