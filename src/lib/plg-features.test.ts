import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FORMS_PLAN_QUOTAS,
  resolveFormsPlanTier,
  getFormsPlanQuotas,
} from '@/lib/plan-features';
import { checkLifetimeJobLimit } from '@/lib/plan-gate';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Product-Led Growth (PLG) Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PL1.1 & PL1.5: Lifetime Job Limit Enforcement', () => {
    it('allows job creation on free plan when under 100 jobs', async () => {
      vi.mocked(db.tenant.findUnique).mockResolvedValueOnce({
        plan: 'free',
        planStatus: 'active',
        lifetimeJobsCreated: 42,
      } as any);

      const result = await checkLifetimeJobLimit('tenant-free-1');
      expect(result.ok).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.count).toBe(42);
      expect(result.remaining).toBe(58);
      expect(result.plan).toBe('free');
    });

    it('blocks job creation on free plan when 100 jobs have been reached', async () => {
      vi.mocked(db.tenant.findUnique).mockResolvedValueOnce({
        plan: 'free',
        planStatus: 'active',
        lifetimeJobsCreated: 100,
      } as any);

      const result = await checkLifetimeJobLimit('tenant-free-2');
      expect(result.ok).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.count).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBe('LIFETIME_JOB_LIMIT_REACHED');
    });

    it('blocks job creation on free plan when over 100 jobs', async () => {
      vi.mocked(db.tenant.findUnique).mockResolvedValueOnce({
        plan: 'free',
        planStatus: 'active',
        lifetimeJobsCreated: 105,
      } as any);

      const result = await checkLifetimeJobLimit('tenant-free-3');
      expect(result.ok).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBe('LIFETIME_JOB_LIMIT_REACHED');
    });

    it('allows unlimited jobs for paid plans (starter, professional, business)', async () => {
      vi.mocked(db.tenant.findUnique).mockResolvedValueOnce({
        plan: 'starter',
        planStatus: 'active',
        lifetimeJobsCreated: 250,
      } as any);

      const result = await checkLifetimeJobLimit('tenant-starter-1');
      expect(result.ok).toBe(true);
      expect(result.limit).toBe(0); // 0 indicates unlimited
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('PL1.3: Forms Plan Quotas & Switching', () => {
    it('provides accurate quotas for Free forms tier', () => {
      const free = FORMS_PLAN_QUOTAS.free;
      expect(free.monthlyPrice).toBe(0);
      expect(free.maxForms).toBe(3);
      expect(free.maxMonthlySubmissions).toBe(100);
      expect(free.maxMonthlyPayments).toBe(10);
      expect(free.removeBranding).toBe(false);
    });

    it('provides accurate quotas for Bronze ($10/mo), Silver ($19/mo), and Gold ($24/mo)', () => {
      expect(FORMS_PLAN_QUOTAS.bronze.monthlyPrice).toBe(10);
      expect(FORMS_PLAN_QUOTAS.bronze.maxForms).toBe(10);
      expect(FORMS_PLAN_QUOTAS.bronze.maxMonthlySubmissions).toBe(1000);

      expect(FORMS_PLAN_QUOTAS.silver.monthlyPrice).toBe(19);
      expect(FORMS_PLAN_QUOTAS.silver.maxForms).toBe(30);
      expect(FORMS_PLAN_QUOTAS.silver.maxMonthlySubmissions).toBe(3000);

      expect(FORMS_PLAN_QUOTAS.gold.monthlyPrice).toBe(24);
      expect(FORMS_PLAN_QUOTAS.gold.maxForms).toBe(0); // unlimited
      expect(FORMS_PLAN_QUOTAS.gold.maxMonthlySubmissions).toBe(10000);
    });

    it('resolves forms plan tier with fallback to free', () => {
      expect(resolveFormsPlanTier('bronze')).toBe('bronze');
      expect(resolveFormsPlanTier('silver')).toBe('silver');
      expect(resolveFormsPlanTier('gold')).toBe('gold');
      expect(resolveFormsPlanTier('invalid_plan')).toBe('free');
      expect(resolveFormsPlanTier(null)).toBe('free');
      expect(resolveFormsPlanTier(undefined)).toBe('free');
    });

    it('gets forms plan quotas by plan name', () => {
      const quotas = getFormsPlanQuotas('silver');
      expect(quotas.tier).toBe('silver');
      expect(quotas.monthlyPrice).toBe(19);
    });
  });
});
