/**
 * AI Usage Tracker — quota enforcement + token-cost ledger for LLM calls.
 * ===========================================================================
 *
 * CRITICAL FIX: aiQuota/aiUsageCount live on Subscription (latest row per
 * tenant), NOT on Tenant — the previous code queried Tenant.aiQuota which
 * always threw PrismaClientValidationError and silently fail-opened.
 *
 * TWO DATA MODELS:
 *   1. Subscription.aiQuota / aiUsageCount — the tenant-facing soft quota
 *      ("100 AI calls / month"). Admission control + a fast counter.
 *   2. UsageLedger rows with usageType 'TEXT_LLM' — the money view: one row
 *      per successful LLM call with the feature, model, token counts and an
 *      estimated provider cost. Feeds the superadmin AI-spend dashboard.
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

export interface QuotaCheckResult {
  ok: boolean;
  response?: NextResponse;
}

/** Token/model metadata captured from a successful text-LLM call. */
export interface AiTextUsageMeta {
  feature: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// ─── Cost estimation ────────────────────────────────────────────────────────

const MODEL_PRICES_PER_1M: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-4o': { prompt: 2.5, completion: 10 },
  'gpt-4.1-mini': { prompt: 0.4, completion: 1.6 },
  'gpt-4.1': { prompt: 2, completion: 8 },
  'glm-4-plus': { prompt: 0.5, completion: 0.5 },
  'glm-4-flash': { prompt: 0.05, completion: 0.05 },
  'glm-4.5-flash': { prompt: 0.05, completion: 0.05 },
  'claude-3-5-sonnet': { prompt: 3, completion: 15 },
  'claude-3-5-haiku': { prompt: 0.8, completion: 4 },
  'gemini-2.0-flash': { prompt: 0.1, completion: 0.4 },
  'gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
  'text-embedding-3-small': { prompt: 0.02, completion: 0 },
};

const DEFAULT_PRICE = { prompt: 0.5, completion: 1.5 };

export function estimateTextLlmCostUsd(meta: AiTextUsageMeta): number | null {
  const prompt = meta.promptTokens ?? 0;
  const completion = meta.completionTokens ?? 0;
  if (prompt === 0 && completion === 0) return null;

  const key = Object.keys(MODEL_PRICES_PER_1M).find((k) => (meta.model ?? '').toLowerCase().includes(k));
  const price = key ? MODEL_PRICES_PER_1M[key] : DEFAULT_PRICE;

  return Number(
    ((prompt / 1_000_000) * price.prompt + (completion / 1_000_000) * price.completion).toFixed(6),
  );
}

// ─── Quota check ────────────────────────────────────────────────────────────

export async function checkAiQuota(tenantId: string): Promise<QuotaCheckResult> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { aiQuota: true, aiUsageCount: true },
    });
    if (!subscription) return { ok: true };

    const quota = subscription.aiQuota ?? 100;
    const used = subscription.aiUsageCount ?? 0;

    if (used >= quota) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'AI usage quota exceeded for this billing period.',
            used, quota,
            hint: 'Quota resets monthly. Upgrade your plan for more AI calls.',
          },
          { status: 429 },
        ),
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[ai-usage-tracker] checkAiQuota failed (allowing call):', err);
    return { ok: true };
  }
}

// ─── Usage tracking ─────────────────────────────────────────────────────────

function monthBounds(now = new Date()): { periodStart: Date; periodEnd: Date } {
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Record a successful text-LLM call.
 *   1. Increments Subscription.aiUsageCount (the tenant-facing counter).
 *   2. When `meta` is provided, writes a UsageLedger TEXT_LLM row with tokens
 *      + estimated cost (best-effort — a ledger failure never throws).
 */
export async function trackAiUsage(tenantId: string, meta?: AiTextUsageMeta): Promise<void> {
  // 1. Quota counter
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { aiUsageCount: { increment: 1 } },
      });
    }
  } catch (err) {
    console.warn('[ai-usage-tracker] counter increment failed (non-blocking):', err);
  }

  // 2. Ledger row with token attribution
  if (!meta?.feature) return;
  try {
    const cost = estimateTextLlmCostUsd(meta);
    const { periodStart, periodEnd } = monthBounds();
    await db.usageLedger.create({
      data: {
        tenantId,
        entitlementId: null,
        idempotencyKey: `text:${randomUUID()}:${meta.feature}`,
        usageType: 'TEXT_LLM',
        quantitySeconds: 0,
        aiFeature: meta.feature.slice(0, 100),
        aiModel: meta.model?.slice(0, 100) ?? null,
        promptTokens: meta.promptTokens ?? null,
        completionTokens: meta.completionTokens ?? null,
        totalTokens: meta.totalTokens ?? null,
        providerCostUsd: cost,
        periodStart,
        periodEnd,
        occurredAt: new Date(),
      },
    });
  } catch (err) {
    console.warn('[ai-usage-tracker] TEXT_LLM ledger write failed (non-blocking):', err);
  }
}
