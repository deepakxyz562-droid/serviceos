/**
 * Fieseros Dynamic SaaS-Tiered Marketplace Fee Engine
 * ----------------------------------------------------
 * Calculates marketplace take-rates and provider payouts based on the provider's
 * active Fieseros Operating System subscription plan.
 */

import type { MarketplaceFeeStructure } from './types';

export const MARKETPLACE_FEE_RATES: Record<string, number> = {
  free: 0.08,             // 8% for Marketplace Free
  marketplace_free: 0.08, // 8%
  starter: 0.06,          // 6% for Fieseros Starter ($17/mo)
  standalone_starter: 0.06,
  growth: 0.04,           // 4% for Fieseros Growth ($42/mo)
  pro: 0.025,             // 2.5% for Fieseros Pro ($83/mo)
  business: 0.025,        // 2.5%
  launch_special: 0.04,   // 4% promotional
  enterprise: 0.015,      // 1.5% custom/negotiated
};

/**
 * Returns the take-rate decimal (e.g. 0.04 for 4%) for a given tenant plan.
 */
export function getTakeRateForPlan(plan?: string | null): number {
  if (!plan) return MARKETPLACE_FEE_RATES.free;
  const normalized = plan.toLowerCase().trim();
  return MARKETPLACE_FEE_RATES[normalized] ?? MARKETPLACE_FEE_RATES.free;
}

/**
 * Computes full fee breakdown including provider payout and upgrade savings.
 */
export function calculateMarketplaceFee(
  plan: string | null | undefined,
  grossAmount: number
): MarketplaceFeeStructure {
  const safeGross = Math.max(grossAmount || 0, 0);
  const rate = getTakeRateForPlan(plan);
  const freeRate = MARKETPLACE_FEE_RATES.free; // 8%

  const marketplaceFee = Number((safeGross * rate).toFixed(2));
  const providerPayout = Number((safeGross - marketplaceFee).toFixed(2));

  const freeFee = Number((safeGross * freeRate).toFixed(2));
  const savingsVsFreePlan = Number(Math.max(freeFee - marketplaceFee, 0).toFixed(2));

  return {
    plan: plan || 'free',
    takeRatePct: Number((rate * 100).toFixed(1)),
    grossAmount: safeGross,
    marketplaceFee,
    providerPayout,
    savingsVsFreePlan,
  };
}
