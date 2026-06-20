import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { seedTrialEmailTemplates, seedPlans } from '@/lib/billing-seed';

/**
 * POST /api/billing/seed
 *
 * Idempotently seeds:
 *   - 4 trial-lifecycle EmailTemplate rows (trial-started, trial-ending-3-day,
 *     trial-ending-1-day, trial-expired) as global platform templates.
 *   - 4 Plan catalog rows (starter, growth, pro, enterprise) with pricing +
 *     limits + features.
 *
 * Safe to call repeatedly — uses upsert-on-unique semantics. Returns counts of
 * newly-seeded vs already-existing rows.
 *
 * Auth: any authenticated user (owner or super-admin). Typically called once
 * on first deploy, or after a schema migration adds new templates/plans.
 */
export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [templatesResult, plansResult] = await Promise.all([
      seedTrialEmailTemplates(),
      seedPlans(),
    ]);

    return NextResponse.json({
      success: true,
      templates: templatesResult,
      plans: plansResult,
    });
  } catch (error) {
    console.error('Billing seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed billing data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/seed
 * Returns the current seed status (which templates + plans exist).
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Re-run seed (idempotent) to ensure everything is present, then report.
    const [templatesResult, plansResult] = await Promise.all([
      seedTrialEmailTemplates(),
      seedPlans(),
    ]);

    return NextResponse.json({
      success: true,
      templates: templatesResult,
      plans: plansResult,
      message: 'Seed complete (idempotent — safe to call anytime).',
    });
  } catch (error) {
    console.error('Billing seed GET error:', error);
    return NextResponse.json(
      { error: 'Failed to seed billing data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
