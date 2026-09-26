import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLAN_DEFS, seedPlans } from '@/lib/billing-seed';
import { POST } from '@/app/api/subscriptions/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    plan: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    workflowAutomation: {
      count: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
  },
}));

import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

describe('Free Plan Catalog & Onboarding Activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PLAN_DEFS Catalog Configuration', () => {
    it('defines a Free Forever plan as sortOrder 0 with $0 price', () => {
      const freePlan = PLAN_DEFS.find((p) => p.code === 'free');
      expect(freePlan).toBeDefined();
      expect(freePlan?.name).toBe('Free Forever');
      expect(freePlan?.monthlyPrice).toBe(0);
      expect(freePlan?.yearlyPrice).toBe(0);
      expect(freePlan?.sortOrder).toBe(0);
      expect(freePlan?.maxUsers).toBe(1);
      expect(freePlan?.maxJobs).toBe(100);
      expect(freePlan?.maxWorkflows).toBe(2);
      expect(freePlan?.features.customerPortal).toBe(true);
      expect(freePlan?.features.estimates).toBe(true);
      expect(freePlan?.features.invoicing).toBe(true);
      expect(freePlan?.features.scheduling).toBe(true);
      expect(freePlan?.features.formBuilder).toBe(true);
    });

    it('positions free plan before launch special and paid tiers', () => {
      const codesInOrder = [...PLAN_DEFS]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => p.code);
      
      expect(codesInOrder[0]).toBe('free');
      expect(codesInOrder[1]).toBe('launch_special');
      expect(codesInOrder[2]).toBe('starter');
    });

    it('seeds the free plan into the database via seedPlans()', async () => {
      vi.mocked(db.plan.upsert).mockResolvedValue({} as any);

      const result = await seedPlans();
      expect(result.seeded).toBeGreaterThan(0);
      expect(db.plan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'free' },
          create: expect.objectContaining({
            code: 'free',
            name: 'Free Forever',
            monthlyPrice: 0,
            sortOrder: 0,
          }),
        }),
      );
    });
  });

  describe('Subscription API Route - Free Plan Activation', () => {
    it('activates the Free Forever plan with active status and no trial gate', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({
        id: 'usr_123',
        tenantId: 'tenant_test_free',
        role: 'owner',
        email: 'test@example.com',
      } as any);

      vi.mocked(db.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(db.subscription.create).mockImplementation(async ({ data }: any) => ({
        id: 'sub_free_1',
        ...data,
        createdAt: new Date(),
      }));
      vi.mocked(db.tenant.update).mockResolvedValue({} as any);

      const req = new NextRequest('http://localhost:3000/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'free',
          billingCycle: 'monthly',
          startMode: 'free',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.subscription).toBeDefined();
      expect(json.subscription.plan).toBe('free');
      expect(json.subscription.status).toBe('active');
      expect(json.subscription.amount).toBe(0);
      expect(json.subscription.trialEndsAt).toBeNull();
      expect(json.subscription.maxUsers).toBe(1);
      expect(json.subscription.maxJobs).toBe(100);

      // Verify tenant record is updated to 'active' status with null trialEndsAt
      expect(db.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant_test_free' },
        data: expect.objectContaining({
          plan: 'free',
          planStatus: 'active',
          trialEndsAt: null,
        }),
      });
    });

    it('rejects invalid plan names with 400 error but allows free', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({
        id: 'usr_123',
        tenantId: 'tenant_test_free',
        role: 'owner',
        email: 'test@example.com',
      } as any);

      const invalidReq = new NextRequest('http://localhost:3000/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'unknown_plan_xyz',
        }),
      });

      const invalidRes = await POST(invalidReq);
      expect(invalidRes.status).toBe(400);
      const invalidJson = await invalidRes.json();
      expect(invalidJson.error).toContain('Invalid plan');
      expect(invalidJson.error).toContain('free');
    });
  });
});
