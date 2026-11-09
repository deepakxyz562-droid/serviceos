import { BGOS_PLANS, isBgosPlan, type BgosPlan } from '../../shared/bgos-plans';

export { BGOS_PLANS, isBgosPlan, type BgosPlan };

/** International USD pricing for BGOS plans (Creem · USD). */
export const BGOS_USD_PRICES: Record<BgosPlan, number> = {
  free: 0,
  starter: 9,
  growth: 29,
  business: 79,
};

/** Monthly AI image generation quota granted by each BGOS plan. */
export const BGOS_AI_QUOTAS: Record<string, number> = {
  free: 50,
  starter: 200,
  growth: 600,
  business: 2000,
  launch_special: 200,
  enterprise: 10000,
};

/** Normalize Creem product codes (`bgos_starter`) -> base plan (`starter`). */
export function normalizeBgosPlanCode(rawPlan: string | null | undefined): string {
  const clean = String(rawPlan || '').trim().toLowerCase();
  if (clean.startsWith('bgos_')) {
    const stripped = clean.slice('bgos_'.length);
    if (isBgosPlan(stripped)) return stripped;
  }
  return clean;
}

/** Determine default checkout region based on tenant country (India = Razorpay INR, else Creem USD). */
export function resolveBgosBillingRegion(country?: string | null): 'india' | 'international' {
  const norm = String(country || '').trim().toLowerCase();
  if (!norm || norm === 'in' || norm === 'india' || norm === 'ind') {
    return 'india';
  }
  return 'international';
}
