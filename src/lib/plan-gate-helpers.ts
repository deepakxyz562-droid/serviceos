import { checkFormSubmissionLimit, checkLifetimeJobLimit } from '@/lib/plan-gate';

export interface FormTransactionLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
  tier: string;
}

/**
 * Check if a tenant has remaining monthly form transaction / submission quota.
 */
export async function checkFormTransactionLimit(tenantId: string): Promise<FormTransactionLimitCheck> {
  try {
    const result = await checkFormSubmissionLimit(tenantId);
    return {
      allowed: result.ok,
      limit: result.limit,
      current: result.count,
      tier: result.plan,
    };
  } catch (err) {
    console.error('[plan-gate-helpers] checkFormTransactionLimit failed:', err);
    return {
      allowed: true,
      limit: 1000,
      current: 0,
      tier: 'pro',
    };
  }
}
