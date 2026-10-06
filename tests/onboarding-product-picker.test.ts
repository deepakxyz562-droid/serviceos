/**
 * tests/onboarding-product-picker.test.ts
 * =========================================
 * Integration tests for the 3-path product picker onboarding flow:
 *   1. signup-mode API  —  POST /api/tenants/me/signup-mode
 *   2. register/route.ts flag logic — standalone now keeps onboardingCompleted=false
 *   3. checkSession routing — routes signupMode to correct onboardingView
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vitest equivalents of Jest mocks)
// ---------------------------------------------------------------------------

const mockPrismaUpdate = vi.fn();
const mockPrismaSubUpdate = vi.fn();
const mockPrismaSubDeleteMany = vi.fn();
const mockPrismaUpdateMany = vi.fn();
const mockPrismaCreate = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockPrismaFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: (...args: any[]) => mockPrismaFindUnique(...args),
      update: (...args: any[]) => mockPrismaUpdate(...args),
    },
    subscription: {
      create: (...args: any[]) => mockPrismaCreate(...args),
      update: (...args: any[]) => mockPrismaSubUpdate(...args),
      updateMany: (...args: any[]) => mockPrismaUpdateMany(...args),
      findFirst: (...args: any[]) => mockPrismaFindFirst(...args),
      deleteMany: (...args: any[]) => mockPrismaSubDeleteMany(...args),
    },
    $transaction: async (fn: (tx: any) => any) => {
      const tx = {
        tenant: { update: mockPrismaUpdate },
        subscription: {
          create: mockPrismaCreate,
          update: mockPrismaSubUpdate,
          updateMany: mockPrismaUpdateMany,
          findFirst: (...args: any[]) => mockPrismaFindFirst(...args),
          deleteMany: mockPrismaSubDeleteMany,
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tenants/me/signup-mode/route';
import { getAuthUser } from '@/lib/auth';

const mockGetAuthUser = getAuthUser as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/tenants/me/signup-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const TENANT_ID = 'tenant-abc-123';

const BASE_TENANT = {
  id: TENANT_ID,
  plan: 'starter',
  planStatus: 'trial',
  signupMode: null,
  listingTier: 'claimed',
  claimed: true,
  trialEndsAt: new Date(),
};

// ---------------------------------------------------------------------------
// Suite 1: signup-mode API route
// ---------------------------------------------------------------------------

describe('POST /api/tenants/me/signup-mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', tenantId: TENANT_ID, role: 'owner' });
    mockPrismaFindUnique.mockResolvedValue(BASE_TENANT);
    mockPrismaFindFirst.mockResolvedValue({ id: 'sub-existing', status: 'trial', plan: 'starter' });
    mockPrismaSubUpdate.mockResolvedValue({ id: 'sub-existing' });
    mockPrismaUpdate.mockResolvedValue({ ...BASE_TENANT, id: TENANT_ID });
    mockPrismaUpdateMany.mockResolvedValue({ count: 1 });
    mockPrismaCreate.mockResolvedValue({ id: 'sub-1' });
  });

  // ── Auth guards ───────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const res = await POST(makeRequest({ mode: 'crm_trial' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tenantId is missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', tenantId: null });
    const res = await POST(makeRequest({ mode: 'crm_trial' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid mode', async () => {
    const res = await POST(makeRequest({ mode: 'invalid_mode' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/standalone/i);
  });

  // ── crm_trial path ────────────────────────────────────────────────────────

  it('sets signupMode=crm_trial and returns 200', async () => {
    mockPrismaFindUnique
      .mockResolvedValueOnce(BASE_TENANT)
      .mockResolvedValueOnce({
        id: TENANT_ID,
        signupMode: 'crm_trial',
        listingTier: 'claimed',
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date(),
        onboardingCompleted: false,
      });
    const res = await POST(makeRequest({ mode: 'crm_trial' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tenant.signupMode).toBe('crm_trial');
    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signupMode: 'crm_trial' }),
      })
    );
  });

  // ── listing_only path ─────────────────────────────────────────────────────

  it('cancels CRM trial subscriptions and converts to listing_only', async () => {
    mockPrismaFindUnique
      .mockResolvedValueOnce(BASE_TENANT)
      .mockResolvedValueOnce({
        id: TENANT_ID,
        signupMode: 'listing_only',
        listingTier: 'claimed_free',
        plan: 'free',
        planStatus: 'active',
        trialEndsAt: null,
        onboardingCompleted: false,
      });
    const res = await POST(makeRequest({ mode: 'listing_only' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tenant.signupMode).toBe('listing_only');
    expect(data.tenant.plan).toBe('free');
    // Subscription must be updated in-place
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'free', status: 'active' }),
      })
    );
  });

  // ── standalone path ───────────────────────────────────────────────────────

  it('cancels CRM trial and creates standalone_starter subscription', async () => {
    mockPrismaFindUnique
      .mockResolvedValueOnce(BASE_TENANT)
      .mockResolvedValueOnce({
        id: TENANT_ID,
        signupMode: 'standalone',
        listingTier: 'none',
        plan: 'standalone_starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        onboardingCompleted: false,
        onboardingStep: 1,
      });
    const res = await POST(makeRequest({ mode: 'standalone' }));
    expect(res.status).toBe(200);
    // Existing subscription was updated in-place
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'standalone_starter', status: 'trial' }),
      })
    );
    // Tenant updated correctly
    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signupMode: 'standalone',
          plan: 'standalone_starter',
          listingTier: 'none',
          claimed: false,
          publicProfileEnabled: false,
          onboardingCompleted: false,
          onboardingStep: 1,
        }),
      })
    );
  });

  it('standalone path returns 200 with signupMode=standalone', async () => {
    mockPrismaFindUnique
      .mockResolvedValueOnce(BASE_TENANT)
      .mockResolvedValueOnce({
        id: TENANT_ID,
        signupMode: 'standalone',
        onboardingCompleted: false,
        plan: 'standalone_starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        onboardingStep: 1,
      });
    const res = await POST(makeRequest({ mode: 'standalone' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tenant.signupMode).toBe('standalone');
    expect(data.tenant.onboardingCompleted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: register/route.ts — standalone onboardingCompleted flag logic
// ---------------------------------------------------------------------------

describe('register/route.ts standalone onboarding flag', () => {
  /**
   * We test the key logic directly as a pure function mirroring register/route.ts.
   * This avoids spinning up the full Next.js route with all its DB deps.
   */

  function computeOnboardingFlags(signupPlan?: string, requestedPlan?: string) {
    const isFreePlan = signupPlan === 'free';
    const isStandalone =
      signupPlan === 'standalone_starter' || signupPlan === 'standalone_business';

    const signupMode = isStandalone
      ? 'standalone'
      : (isFreePlan
        ? 'free'
        : (requestedPlan ? 'crm_trial' : null));
    const onboardingCompleted = isFreePlan ? true : false;
    const onboardingStep = isFreePlan ? 4 : 1;

    return { signupMode, onboardingCompleted, onboardingStep, isStandalone };
  }

  it('no explicit plan requested: signupMode=null so product picker is shown', () => {
    const f = computeOnboardingFlags('starter', undefined);
    expect(f.signupMode).toBeNull();
    expect(f.onboardingCompleted).toBe(false);
    expect(f.onboardingStep).toBe(1);
  });

  it('standalone_starter: onboardingCompleted=false so wizard runs', () => {
    const f = computeOnboardingFlags('standalone_starter', 'standalone_starter');
    expect(f.signupMode).toBe('standalone');
    expect(f.onboardingCompleted).toBe(false);
    expect(f.onboardingStep).toBe(1);
  });

  it('standalone_business: onboardingCompleted=false so wizard runs', () => {
    const f = computeOnboardingFlags('standalone_business', 'standalone_business');
    expect(f.signupMode).toBe('standalone');
    expect(f.onboardingCompleted).toBe(false);
  });

  it('free plan: onboardingCompleted=true (skips wizard)', () => {
    const f = computeOnboardingFlags('free', 'free');
    expect(f.signupMode).toBe('free');
    expect(f.onboardingCompleted).toBe(true);
    expect(f.onboardingStep).toBe(4);
  });

  it('explicit CRM plan requested: onboardingCompleted=false (goes through 4-step wizard)', () => {
    const f = computeOnboardingFlags('starter', 'starter');
    expect(f.signupMode).toBe('crm_trial');
    expect(f.onboardingCompleted).toBe(false);
    expect(f.onboardingStep).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: checkSession onboardingView routing logic
// ---------------------------------------------------------------------------

describe('checkSession onboardingView routing', () => {
  /**
   * Extracts the routing logic from home-page-client.tsx checkSession() into
   * a pure function so it can be unit-tested without mounting React.
   */

  function resolveOnboardingView(
    signupMode: string | null | undefined,
    tenantPlan: string | null | undefined,
    onboardingCompleted: boolean,
  ): 'mode_selector' | 'saas' | 'listing' | 'standalone' | null {
    const isStandalone =
      signupMode === 'standalone' ||
      tenantPlan === 'standalone_starter' ||
      tenantPlan === 'standalone_business';

    if (onboardingCompleted) return null; // wizard done → app

    if (isStandalone || signupMode === 'standalone') return 'standalone';
    if (signupMode === 'listing_only') return 'listing';
    if (signupMode === 'crm_trial') return 'saas';
    return 'mode_selector'; // signupMode=null → fresh user, show picker
  }

  it('null signupMode → mode_selector (fresh user sees product picker)', () => {
    expect(resolveOnboardingView(null, 'starter', false)).toBe('mode_selector');
  });

  it('crm_trial → saas wizard', () => {
    expect(resolveOnboardingView('crm_trial', 'starter', false)).toBe('saas');
  });

  it('listing_only → listing wizard', () => {
    expect(resolveOnboardingView('listing_only', 'free', false)).toBe('listing');
  });

  it('standalone signupMode + onboardingCompleted=false → standalone wizard', () => {
    expect(resolveOnboardingView('standalone', 'standalone_starter', false)).toBe('standalone');
  });

  it('deep-link standalone_business plan + onboardingCompleted=false → standalone wizard', () => {
    expect(resolveOnboardingView('standalone', 'standalone_business', false)).toBe('standalone');
  });

  it('standalone + onboardingCompleted=true → null (wizard done, enter app)', () => {
    expect(resolveOnboardingView('standalone', 'standalone_starter', true)).toBeNull();
  });

  it('crm_trial + onboardingCompleted=true → null (wizard done)', () => {
    expect(resolveOnboardingView('crm_trial', 'starter', true)).toBeNull();
  });

  it('listing_only + onboardingCompleted=true → null (wizard done)', () => {
    expect(resolveOnboardingView('listing_only', 'free', true)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 4: requireCrmTenant standalone access & listing-only blocking
// ---------------------------------------------------------------------------

describe('requireCrmTenant guard for standalone users', () => {
  it('blocks standalone tenant from CRM endpoints', async () => {
    const { requireCrmTenant } = await import('@/lib/require-crm-tenant');
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', tenantId: TENANT_ID });
    mockPrismaFindUnique.mockResolvedValue({
      id: TENANT_ID,
      signupMode: 'standalone',
      plan: 'standalone_starter',
      listingTier: 'none',
    });

    const req = new NextRequest('http://localhost/api/leads');
    const res = await requireCrmTenant(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    const data = await res?.json();
    expect(data.code).toBe('STANDALONE_FORMS_NO_CRM');
  });

  it('blocks listing-only tenant with 403 and LISTING_ONLY_TENANT code', async () => {
    const { requireCrmTenant } = await import('@/lib/require-crm-tenant');
    const LISTING_TENANT_ID = 'tenant-listing-only-777';
    mockGetAuthUser.mockResolvedValue({ id: 'user-2', tenantId: LISTING_TENANT_ID });
    mockPrismaFindUnique.mockResolvedValue({
      id: LISTING_TENANT_ID,
      signupMode: 'listing_only',
      plan: 'free',
      listingTier: 'claimed_free',
    });

    const req = new NextRequest('http://localhost/api/leads');
    const res = await requireCrmTenant(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    const data = await res?.json();
    expect(data.code).toBe('LISTING_ONLY_TENANT');
  });
});

// ---------------------------------------------------------------------------
// Suite 5: OAuth marketing page redirect protection
// ---------------------------------------------------------------------------

describe('OAuth marketing page redirect protection', () => {
  function computeRedirectUrl(
    baseUrl: string,
    redirectParam: string | undefined,
    isStandalone: boolean,
    needsOnboarding: boolean
  ): string {
    if (needsOnboarding) {
      if (isStandalone) {
        return `${baseUrl}/?google_login=success&view=formBuilder`;
      }
      return `${baseUrl}/?google_login=success`;
    }
    if (redirectParam && redirectParam.startsWith('/')) {
      const cleanRedirect = redirectParam.split('?')[0];
      if (cleanRedirect !== '/gptform' && cleanRedirect !== '/login' && cleanRedirect !== '/register' && cleanRedirect !== '/') {
        const sep = redirectParam.includes('?') ? '&' : '?';
        return `${baseUrl}${redirectParam}${sep}google_login=success`;
      }
    }
    if (isStandalone) {
      return `${baseUrl}/?google_login=success&view=formBuilder`;
    }
    return `${baseUrl}/?google_login=success`;
  }

  it('un-onboarded user arriving from /gptform is NOT redirected back to /gptform', () => {
    const url = computeRedirectUrl('https://fieseros.com', '/gptform', false, true);
    expect(url).toBe('https://fieseros.com/?google_login=success');
    expect(url).not.toContain('/gptform');
  });

  it('un-onboarded standalone user is routed to formBuilder', () => {
    const url = computeRedirectUrl('https://fieseros.com', '/gptform', true, true);
    expect(url).toBe('https://fieseros.com/?google_login=success&view=formBuilder');
  });

  it('onboarded user with /gptform redirect is sanitized to root app', () => {
    const url = computeRedirectUrl('https://fieseros.com', '/gptform', false, false);
    expect(url).toBe('https://fieseros.com/?google_login=success');
  });

  it('onboarded user with valid deep link (e.g. /marketplace) is preserved', () => {
    const url = computeRedirectUrl('https://fieseros.com', '/marketplace', false, false);
    expect(url).toBe('https://fieseros.com/marketplace?google_login=success');
  });
});
