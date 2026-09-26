import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/addon-subscriptions/route';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    plan: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    addonSubscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    addonPlan: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/billing-seed', () => ({
  getPlanByCode: vi.fn(),
  seedPlans: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({
  cache: { get: vi.fn(() => null), set: vi.fn() },
}));

vi.mock('@/lib/cache-headers', () => ({
  cachedJson: vi.fn((data) => new Response(JSON.stringify(data))),
}));

import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanByCode } from '@/lib/billing-seed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/addon-subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_ADDON_PLAN = {
  id: 'plan-ai',
  code: 'ai_website_forms',
  name: 'AI Website Employee & Smart Forms',
  monthlyPrice: 7,
  yearlyPrice: 84,
  currency: 'USD',
  isAddon: true,
  isActive: true,
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('billing-plan-filtering: addon subscription payment guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'owner',
      email: 'test@example.com',
    } as any);
    vi.mocked(getPlanByCode).mockResolvedValue(MOCK_ADDON_PLAN as any);
    vi.mocked(db.addonSubscription.findFirst).mockResolvedValue(null);
  });

  // ── Test 1: No payment info → 402 ──────────────────────────────────────────
  it('returns 402 when no paymentProvider is supplied', async () => {
    const req = makeRequest({ addonCode: 'ai_website_forms', billingCycle: 'monthly' });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.requiresPayment).toBe(true);
    expect(body.error).toMatch(/Payment required/i);
    // Must NOT have created any DB row
    expect(db.addonSubscription.create).not.toHaveBeenCalled();
  });

  // ── Test 2: paymentProvider without providerSubscriptionId → 402 ───────────
  it('returns 402 when paymentProvider is present but providerSubscriptionId is missing', async () => {
    const req = makeRequest({
      addonCode: 'ai_website_forms',
      billingCycle: 'monthly',
      paymentProvider: 'paypal',
      // providerSubscriptionId intentionally omitted
    });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.requiresPayment).toBe(true);
    expect(db.addonSubscription.create).not.toHaveBeenCalled();
  });

  // ── Test 3: Valid payment info → 201 activated ─────────────────────────────
  it('creates an active addon subscription when valid payment info is provided', async () => {
    const mockAddon = {
      id: 'addon-1',
      tenantId: 'tenant-1',
      addonCode: 'ai_website_forms',
      displayName: 'AI Website Employee & Smart Forms',
      status: 'active',
      amount: 7,
      currency: 'USD',
      billingCycle: 'monthly',
      paymentProvider: 'paypal',
      providerSubscriptionId: 'paypal-sub-123',
      providerProductId: null,
      startDate: new Date(),
      endDate: null,
      nextBillingAt: new Date(),
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.addonSubscription.create).mockResolvedValue(mockAddon as any);

    const req = makeRequest({
      addonCode: 'ai_website_forms',
      billingCycle: 'monthly',
      paymentProvider: 'paypal',
      providerSubscriptionId: 'paypal-sub-123',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.addon.status).toBe('active');
    expect(body.addon.paymentProvider).toBe('paypal');
    expect(db.addonSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentProvider: 'paypal',
          providerSubscriptionId: 'paypal-sub-123',
          status: 'active',
        }),
      })
    );
  });

  // ── Test 4: Superadmin can activate without payment ─────────────────────────
  it('allows superadmin to activate an addon without payment info', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'admin-1',
      tenantId: 'tenant-admin',
      role: 'superadmin',
      email: 'admin@example.com',
    } as any);

    const mockAddon = {
      id: 'addon-2',
      tenantId: 'tenant-admin',
      addonCode: 'ai_website_forms',
      displayName: 'AI Website Employee & Smart Forms',
      status: 'active',
      amount: 7,
      currency: 'USD',
      billingCycle: 'monthly',
      paymentProvider: 'superadmin',
      providerSubscriptionId: null,
      providerProductId: null,
      startDate: new Date(),
      endDate: null,
      nextBillingAt: new Date(),
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.addonSubscription.create).mockResolvedValue(mockAddon as any);

    const req = makeRequest({
      addonCode: 'ai_website_forms',
      billingCycle: 'monthly',
      // No paymentProvider or providerSubscriptionId — superadmin bypass
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.addon.status).toBe('active');
    expect(body.addon.paymentProvider).toBe('superadmin');
  });
});

// ─── Plan segmentation logic tests (pure logic, no API calls) ─────────────────

describe('billing-plan-filtering: plan segmentation logic', () => {
  // Simulates the effectivePlans filter from billing-view.tsx
  function filterPlans(plans: Array<{ code: string; isAddon: boolean }>, isStandalone: boolean) {
    return plans.filter((cp) => {
      if (cp.isAddon) return false;
      const isStandalonePlan = cp.code.startsWith('standalone');
      return isStandalone ? isStandalonePlan : !isStandalonePlan;
    });
  }

  const ALL_PLANS = [
    { code: 'free', isAddon: false },
    { code: 'starter', isAddon: false },
    { code: 'growth', isAddon: false },
    { code: 'business', isAddon: false },
    { code: 'enterprise', isAddon: false },
    { code: 'standalone_starter', isAddon: false },
    { code: 'standalone_business', isAddon: false },
    { code: 'ai_website_forms', isAddon: true },
    { code: 'ai_pro_addon', isAddon: true },
  ];

  it('CRM tenant never sees standalone plans', () => {
    const result = filterPlans(ALL_PLANS, false);
    const codes = result.map((p) => p.code);
    expect(codes).not.toContain('standalone_starter');
    expect(codes).not.toContain('standalone_business');
    expect(codes).toContain('starter');
    expect(codes).toContain('growth');
    expect(codes).toContain('business');
  });

  it('CRM tenant never sees add-on plans in the main grid', () => {
    const result = filterPlans(ALL_PLANS, false);
    const codes = result.map((p) => p.code);
    expect(codes).not.toContain('ai_website_forms');
    expect(codes).not.toContain('ai_pro_addon');
  });

  it('standalone tenant only sees standalone plans', () => {
    const result = filterPlans(ALL_PLANS, true);
    const codes = result.map((p) => p.code);
    expect(codes).toContain('standalone_starter');
    expect(codes).toContain('standalone_business');
    expect(codes).not.toContain('starter');
    expect(codes).not.toContain('growth');
    expect(codes).not.toContain('enterprise');
  });

  it('PLAN_TIER_RANK correctly identifies upgrades and downgrades', () => {
    const PLAN_TIER_RANK: Record<string, number> = {
      free: 0, launch_special: 1, starter: 2, growth: 3,
      pro: 3, business: 4, enterprise: 5,
      standalone_starter: 1, standalone_business: 2,
    };

    function getDirection(current: string, target: string): 'upgrade' | 'downgrade' | 'current' {
      if (target === current) return 'current';
      const cr = PLAN_TIER_RANK[current] ?? 0;
      const tr = PLAN_TIER_RANK[target] ?? 0;
      return tr > cr ? 'upgrade' : 'downgrade';
    }

    expect(getDirection('growth', 'business')).toBe('upgrade');   // Pro → Business
    expect(getDirection('growth', 'starter')).toBe('downgrade'); // Pro → Starter
    expect(getDirection('growth', 'growth')).toBe('current');    // Same plan
    expect(getDirection('business', 'enterprise')).toBe('upgrade');
    expect(getDirection('enterprise', 'starter')).toBe('downgrade');
  });
});
