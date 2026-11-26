/**
 * Razorpay Subscriptions helper for recurring Monthly & Yearly Auto-Pay (INR).
 *
 * Uses Razorpay Plans (`POST /v1/plans`) + Subscriptions (`POST /v1/subscriptions`)
 * so Indian merchants can authorize UPI AutoPay, e-Mandates, or recurring Cards.
 */

export interface RazorpayPlanInput {
  keyId: string;
  keySecret: string;
  planCode: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  amountPaise: number;
}

export interface CreateRazorpaySubscriptionInput extends RazorpayPlanInput {
  tenantId?: string;
  customerEmail?: string;
  notes?: Record<string, string>;
}

export interface CreateRazorpaySubscriptionResult {
  subscriptionId: string;
  planId: string;
  shortUrl: string | null;
  status: string;
  amountPaise: number;
  currency: 'INR';
}

const cachedPlanIds = new Map<string, string>();

function buildAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

/**
 * Resolves an existing Razorpay Plan matching `(planCode, billingCycle, amountPaise)`
 * or creates a new one if absent. Cached per keyId + plan specification in memory.
 */
export async function getOrCreateRazorpayPlan(input: RazorpayPlanInput): Promise<string> {
  const { keyId, keySecret, planCode, planName, billingCycle, amountPaise } = input;
  const planKey = `${planCode}_${billingCycle}_${amountPaise}`;
  const cacheKey = `${keyId}:${planKey}`;

  const memCached = cachedPlanIds.get(cacheKey);
  if (memCached) return memCached;

  const auth = buildAuthHeader(keyId, keySecret);

  // Check existing Razorpay plans first to avoid duplicate plan definitions
  try {
    const listRes = await fetch('https://api.razorpay.com/v1/plans?count=100', {
      method: 'GET',
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(10_000),
    });
    if (listRes.ok) {
      const listData = await listRes.json().catch(() => ({}));
      const items = Array.isArray(listData?.items) ? listData.items : [];
      const match = items.find(
        (p: any) =>
          p?.notes?.bgosPlanKey === planKey ||
          (p?.period === billingCycle &&
            p?.interval === 1 &&
            Number(p?.item?.amount) === amountPaise &&
            p?.notes?.planCode === planCode),
      );
      if (match?.id) {
        cachedPlanIds.set(cacheKey, String(match.id));
        return String(match.id);
      }
    }
  } catch {
    // Non-fatal: proceed to plan creation
  }

  const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
  const createRes = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period: billingCycle,
      interval: 1,
      item: {
        name: `BGOS ${planName} (${cycleLabel})`,
        amount: amountPaise,
        currency: 'INR',
        description: `BGOS ${planName} recurring ${billingCycle} auto-pay plan`,
      },
      notes: {
        bgosPlanKey: planKey,
        planCode,
        billingCycle,
        platform: 'bgos',
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const planJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !planJson?.id) {
    const errMsg = planJson?.error?.description || 'Failed to create Razorpay recurring plan';
    throw new Error(errMsg);
  }

  const planId = String(planJson.id);
  cachedPlanIds.set(cacheKey, planId);
  return planId;
}

/**
 * Creates a Razorpay Subscription for recurring monthly/yearly billing
 * (supporting UPI AutoPay, e-Mandates, and recurring Cards).
 */
export async function createRazorpaySubscription(
  input: CreateRazorpaySubscriptionInput,
): Promise<CreateRazorpaySubscriptionResult> {
  const planId = await getOrCreateRazorpayPlan(input);
  const auth = buildAuthHeader(input.keyId, input.keySecret);

  const totalCount = input.billingCycle === 'yearly' ? 20 : 120;
  const notes: Record<string, string> = {
    ...(input.notes || {}),
    planCode: input.planCode,
    plan: input.planCode,
    billingCycle: input.billingCycle,
    platform: 'bgos',
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
  };

  const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const subJson = await subRes.json().catch(() => ({}));
  if (!subRes.ok || !subJson?.id) {
    const errMsg = subJson?.error?.description || 'Failed to create Razorpay subscription';
    throw new Error(errMsg);
  }

  return {
    subscriptionId: String(subJson.id),
    planId,
    shortUrl: typeof subJson.short_url === 'string' ? subJson.short_url : null,
    status: String(subJson.status || 'created'),
    amountPaise: input.amountPaise,
    currency: 'INR',
  };
}

/**
 * Fetches a Razorpay Subscription entity by ID.
 */
export async function fetchRazorpaySubscription(
  keyId: string,
  keySecret: string,
  subscriptionId: string,
): Promise<Record<string, any> | null> {
  const res = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'GET',
      headers: { Authorization: buildAuthHeader(keyId, keySecret) },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/**
 * Cancels an active Razorpay Subscription so auto-pay stops at period end
 * (or immediately if `cancelAtCycleEnd` is false).
 */
export async function cancelRazorpaySubscription(
  keyId: string,
  keySecret: string,
  subscriptionId: string,
  cancelAtCycleEnd = true,
): Promise<{ cancelled: boolean; status: string; raw?: Record<string, any> }> {
  const res = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(keyId, keySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.description || 'Failed to cancel Razorpay auto-pay subscription');
  }
  return {
    cancelled: true,
    status: String(data?.status || 'cancelled'),
    raw: data,
  };
}
