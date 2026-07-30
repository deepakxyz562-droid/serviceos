import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedPlans } from '@/lib/billing-seed';

/**
 * GET /api/plans/public
 *
 * Public variant of /api/plans — does NOT require authentication.
 * Used by the public landing page (dual-audience-landing.tsx) so logged-out
 * visitors see the same live plan catalog + prices as authenticated users.
 *
 * Returns the same shape as /api/plans (an array of plan objects with their
 * featuresJson parsed into a `features` object). The landing page falls back
 * to its hardcoded FALLBACK_PRICING_PLANS if this endpoint fails — so a DB
 * outage degrades gracefully rather than breaking the marketing page.
 *
 * Calls seedPlans() idempotently first (same as /api/plans) so a fresh deploy
 * has the catalog populated without manual `/api/billing/seed` calls.
 *
 * Auth: NONE (public).
 */
export async function GET() {
  try {
    // Idempotent seed (no-op if plans already exist). Wrapped in its own
    // try/catch so a Supabase RLS write failure on the Plan table doesn't
    // 500 the entire request — we still want to return whatever plans
    // already exist in the DB.
    try {
      await seedPlans();
    } catch (seedErr) {
      console.warn('[api/plans/public] seedPlans failed (non-fatal):', seedErr);
    }

    const plans = await db.plan.findMany({
      where: { isActive: true, isAddon: false },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = plans.map((p) => ({
      id: p.code,
      code: p.code,
      name: p.name,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      originalMonthlyPrice: p.originalMonthlyPrice ?? 0,
      originalYearlyPrice: p.originalYearlyPrice ?? 0,
      currency: p.currency,
      maxUsers: p.maxUsers,
      features: JSON.parse(p.featuresJson),
      popular: p.popular,
      sortOrder: p.sortOrder,
    }));

    return NextResponse.json({ plans: formatted });
  } catch (error) {
    console.error('Get public plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 },
    );
  }
}
