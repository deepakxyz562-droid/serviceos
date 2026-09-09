/**
 * AI Usage Tracker — shared quota + usage-count helper for text-LLM calls.
 * =====================================================================
 *
 * PROBLEM: `Tenant.aiQuota` (default 100) + `Tenant.aiUsageCount` (default 0)
 * exist in the Prisma schema but were NEVER decremented or checked by any
 * text-LLM AI route (suggested-reply, smart-quote, field-assistant, etc.).
 * The quota fields were dead code — tenants could make unlimited LLM calls
 * with zero tracking.
 *
 * FIX: This module provides two helpers that every text-LLM AI route SHOULD
 * call:
 *
 *   1. `checkAiQuota(tenantId)` — call BEFORE the LLM call (admission control).
 *      Returns `{ ok: true }` or `{ ok: false, response }` (a 429 NextResponse).
 *
 *   2. `trackAiUsage(tenantId)` — call AFTER a successful LLM call (usage
 *      tracking). Increments `aiUsageCount` by 1. Best-effort: never throws.
 *
 * DESIGN DECISIONS:
 *   - Best-effort: a DB failure in the tracker never blocks the AI call.
 *     The LLM response is the user-facing value; usage tracking is ops-only.
 *   - Only count SUCCESSFUL calls: if the LLM call fails / throws / returns
 *     an error, the caller should NOT call `trackAiUsage` — so failed
 *     retries don't burn the tenant's quota.
 *   - The check is a simple `>=` comparison (not atomic increment-then-check).
 *     This means a race condition could let 2 concurrent calls through when
 *     only 1 slot remains. This is acceptable for a soft quota — the
 *     alternative (a Postgres atomic UPDATE...RETURNING) is overkill for a
 *     counter that resets monthly via cron.
 *
 * USAGE:
 *   ```ts
 *   import { checkAiQuota, trackAiUsage } from '@/lib/ai-usage-tracker';
 *
 *   export async function POST(request: NextRequest) {
 *     const user = await getAuthUser();
 *     const tenantId = user?.tenantId;
 *     if (!tenantId) return NextResponse.json({ error: '...' }, { status: 400 });
 *
 *     // 1. Check quota BEFORE the LLM call
 *     const quota = await checkAiQuota(tenantId);
 *     if (!quota.ok) return quota.response;
 *
 *     // 2. Make the LLM call...
 *     const result = await callLLM();
 *     if (!result.success) return NextResponse.json({ error: '...' }, { status: 503 });
 *
 *     // 3. Track usage AFTER success
 *     await trackAiUsage(tenantId);
 *
 *     return NextResponse.json({ data: result.data });
 *   }
 *   ```
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface QuotaCheckResult {
  ok: boolean;
  response?: NextResponse;
}

/**
 * Check whether the tenant has remaining AI quota.
 * Call BEFORE the LLM call (admission control).
 *
 * Returns `{ ok: true }` if the tenant can proceed, or
 * `{ ok: false, response }` with a 429 if over quota.
 *
 * Best-effort: if the DB lookup fails, we ALLOW the call (fail-open) so a
 * transient DB hiccup doesn't block the user. The quota is a soft limit,
 * not a hard security boundary.
 */
export async function checkAiQuota(tenantId: string): Promise<QuotaCheckResult> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { aiQuota: true, aiUsageCount: true },
    });

    // Tenant not found → let the caller's own auth check handle it.
    if (!tenant) return { ok: true };

    // Super-admins bypass the quota (they're testing / supporting).
    // We can't check role here without a DB join, so we rely on the caller
    // to skip the check for super-admins if desired.

    const quota = tenant.aiQuota ?? 100;
    const used = tenant.aiUsageCount ?? 0;

    if (used >= quota) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'AI usage quota exceeded for this billing period.',
            used,
            quota,
            hint: 'Quota resets monthly. Upgrade your plan for more AI calls.',
          },
          { status: 429 },
        ),
      };
    }

    return { ok: true };
  } catch (err) {
    // Fail-open: DB error shouldn't block the AI call.
    console.warn('[ai-usage-tracker] checkAiQuota failed (allowing call):', err);
    return { ok: true };
  }
}

/**
 * Increment the tenant's AI usage counter by 1.
 * Call AFTER a successful LLM call (usage tracking).
 *
 * Best-effort: never throws. If the DB update fails, the LLM response still
 * goes through to the user — usage tracking is ops-only.
 */
export async function trackAiUsage(tenantId: string): Promise<void> {
  try {
    await db.tenant.update({
      where: { id: tenantId },
      data: { aiUsageCount: { increment: 1 } },
    });
  } catch (err) {
    // Non-fatal — the AI response already succeeded. Log + move on.
    console.warn('[ai-usage-tracker] trackAiUsage failed (non-blocking):', err);
  }
}
