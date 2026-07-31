import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Pipeline AI Insights — `/api/pipeline/insights`.
 *
 * GET → returns an AI-generated natural-language summary of the pipeline
 *       plus four "last 24 hours" metric counts (New, At Risk, Won, Lost).
 *
 * Auth: owner / admin / manager only. (Pipeline-level analytics are
 * sensitive — employees shouldn't see aggregate win/loss numbers.)
 *
 * Pipeline summary built from the tenant's deals (last 30 days):
 *   - totalActiveDeals
 *   - totalPipelineValue
 *   - dealsByStage  { stageKey: count }
 *   - staleDeals    [{ title, stage, daysInStage, value }]  (created > 24h ago + active stage)
 *   - wonThisWeek
 *   - lostThisWeek
 *   - avgDealValue
 *
 * The LLM call uses z-ai-web-dev-sdk. If the SDK import fails or the call
 * throws, a graceful fallback summary is returned alongside the metrics so
 * the UI still renders useful numbers.
 *
 * Supabase-safe: only `findMany` is used. No raw SQL, no groupBy, no
 * compound-unique upsert. The closed-stage filter uses `NOT: { stage: { in: [...] } }`
 * instead of `notIn` (PostgREST adapter doesn't translate `notIn`).
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const MS_24H = 24 * 60 * 60 * 1000;
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

/** Stage keys considered "closed" — same as the deals list API. */
const CLOSED_STAGE_KEYS = ['won', 'lost'];

const FALLBACK_SUMMARY =
  'Unable to generate AI insights at this time. Please try again later.';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaleDealSummary {
  title: string;
  stage: string;
  daysInStage: number;
  value: number;
}

interface PipelineSummary {
  totalActiveDeals: number;
  totalPipelineValue: number;
  dealsByStage: Record<string, number>;
  staleDeals: StaleDealSummary[];
  wonThisWeek: number;
  lostThisWeek: number;
  avgDealValue: number;
}

interface Metrics {
  new: number;
  atRisk: number;
  won: number;
  lost: number;
}

// ─── Lazy ZAI loader ────────────────────────────────────────────────────────

/**
 * Lazily import + initialize the z-ai-web-dev-sdk. Returns null when the
 * SDK is unavailable so the caller can fall back to a deterministic
 * summary without raising.
 *
 * MUST be used server-side only.
 */
async function getZai(): Promise<unknown | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[pipeline/insights] ZAI SDK unavailable:', msg);
    return null;
  }
}

// ─── LLM call ───────────────────────────────────────────────────────────────

/**
 * Calls the LLM with a compact pipeline summary + a system prompt asking
 * for a 2-3 paragraph natural-language analysis. Returns the LLM's text
 * response, or null on any failure.
 *
 * NOTE: per the LLM Skill usage guide, the system prompt is sent using
 * the `'assistant'` role (NOT `'system'`) and `thinking: { type: 'disabled' }`
 * is always set.
 */
async function callLLM(
  zai: unknown,
  pipelineSummary: PipelineSummary,
): Promise<string | null> {
  try {
    // Minimal duck-typed surface — `zai.chat.completions.create(...)`.
    const z = zai as {
      chat: {
        completions: {
          create: (args: {
            messages: Array<{ role: string; content: string }>;
            thinking: { type: 'disabled' };
          }) => Promise<{
            choices?: Array<{ message?: { content?: string } }>;
          }>;
        };
      };
    };

    const completion = await z.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You are a sales pipeline analyst. Analyze the pipeline data and provide a concise, actionable summary (2-3 paragraphs). Highlight stale deals that need follow-up, note the total pipeline value, and suggest 1-2 next actions. Be specific and practical. Do not use markdown headers.',
        },
        {
          role: 'user',
          content: `Here is the current sales pipeline data:\n\n${JSON.stringify(pipelineSummary, null, 2)}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const text = completion?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }
    return text.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[pipeline/insights] LLM call failed:', msg);
    return null;
  }
}

// ─── Main route handler ─────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── 1. Auth + role gate ──────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can view pipeline insights' },
        { status: 403 },
      );
    }
    const tenantId = user.tenantId;

    // ── 2. Fetch deals (last 30 days) — single findMany ─────────────────
    // We pull everything created OR closed in the last 30 days. The 24h
    // metric computation filters by createdAt / closedAt in JS so we can
    // derive all four metrics from a single DB round-trip.
    const cutoff30d = new Date(Date.now() - DAYS_30_MS);
    const deals = await db.deal.findMany({
      where: {
        tenantId,
        OR: [
          { createdAt: { gte: cutoff30d } },
          { closedAt: { gte: cutoff30d } },
        ],
      },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        currency: true,
        createdAt: true,
        closedAt: true,
      },
      take: 1000, // defensive cap
    });

    // ── 3. Compute metrics ──────────────────────────────────────────────
    const now = Date.now();
    const cutoff24h = new Date(now - MS_24H);

    let metricNew = 0;
    let metricWon = 0;
    let metricLost = 0;
    let metricAtRisk = 0;

    for (const d of deals) {
      const createdMs = d.createdAt ? new Date(d.createdAt).getTime() : NaN;
      const closedMs = d.closedAt ? new Date(d.closedAt).getTime() : NaN;
      const isActive = !CLOSED_STAGE_KEYS.includes(d.stage);

      // New: added to the pipeline in the last 24h (by createdAt).
      if (Number.isFinite(createdMs) && createdMs >= cutoff24h.getTime()) {
        metricNew++;
      }

      // Won: closed-won in the last 24h (by closedAt).
      if (
        d.stage === 'won' &&
        Number.isFinite(closedMs) &&
        closedMs >= cutoff24h.getTime()
      ) {
        metricWon++;
      }

      // Lost: closed-lost in the last 24h (by closedAt).
      if (
        d.stage === 'lost' &&
        Number.isFinite(closedMs) &&
        closedMs >= cutoff24h.getTime()
      ) {
        metricLost++;
      }

      // At Risk: active-stage deal created > 24h ago (going stale).
      if (
        isActive &&
        Number.isFinite(createdMs) &&
        createdMs < cutoff24h.getTime()
      ) {
        metricAtRisk++;
      }
    }

    const metrics: Metrics = {
      new: metricNew,
      atRisk: metricAtRisk,
      won: metricWon,
      lost: metricLost,
    };

    // ── 4. Build compact LLM summary ────────────────────────────────────
    const activeDeals = deals.filter(
      (d) => !CLOSED_STAGE_KEYS.includes(d.stage),
    );
    const totalPipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
    const avgDealValue =
      activeDeals.length > 0
        ? Math.round(totalPipelineValue / activeDeals.length)
        : 0;

    // dealsByStage: count by stage key, manual grouping (PostgREST adapter
    // doesn't support `groupBy`).
    const dealsByStage: Record<string, number> = {};
    for (const d of deals) {
      dealsByStage[d.stage] = (dealsByStage[d.stage] ?? 0) + 1;
    }

    // Stale deals: active stage + created > 24h ago. Sort oldest first.
    const staleDeals: StaleDealSummary[] = activeDeals
      .filter((d) => {
        const createdMs = d.createdAt ? new Date(d.createdAt).getTime() : NaN;
        return Number.isFinite(createdMs) && createdMs < cutoff24h.getTime();
      })
      .map((d) => ({
        title: d.title,
        stage: d.stage,
        daysInStage: Math.max(
          1,
          Math.floor((now - new Date(d.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
        ),
        value: d.value || 0,
      }))
      .sort((a, b) => b.daysInStage - a.daysInStage)
      .slice(0, 10); // cap at 10 to keep the LLM prompt compact

    // Won/Lost this week (last 7 days, by closedAt) — for the LLM summary.
    const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    let wonThisWeek = 0;
    let lostThisWeek = 0;
    for (const d of deals) {
      if (!d.closedAt) continue;
      const closedMs = new Date(d.closedAt).getTime();
      if (closedMs < cutoff7d.getTime()) continue;
      if (d.stage === 'won') wonThisWeek++;
      else if (d.stage === 'lost') lostThisWeek++;
    }

    const pipelineSummary: PipelineSummary = {
      totalActiveDeals: activeDeals.length,
      totalPipelineValue,
      dealsByStage,
      staleDeals,
      wonThisWeek,
      lostThisWeek,
      avgDealValue,
    };

    // ── 5. Call LLM (with fallback) ─────────────────────────────────────
    let summary: string;
    let aiModel: string;

    const zai = await getZai();
    if (zai) {
      const llmText = await callLLM(zai, pipelineSummary);
      if (llmText) {
        summary = llmText;
        aiModel = 'z-ai-web-dev-sdk';
      } else {
        summary = FALLBACK_SUMMARY;
        aiModel = 'fallback';
      }
    } else {
      summary = FALLBACK_SUMMARY;
      aiModel = 'fallback';
    }

    return NextResponse.json({
      summary,
      metrics,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline insights GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate pipeline insights' },
      { status: 500 },
    );
  }
}
