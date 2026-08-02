import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import {
  PLAN_FEATURE_DEFS,
  PLAN_TIERS,
  DEFAULT_PLAN_MATRIX,
  seedPlanFeatureMatrix,
  getFeaturesForPlan,
  type PlanTier,
} from '@/lib/plan-features';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/plan-features
//
// Returns the full feature matrix:
//   {
//     tiers:      PlanTier[],                 // ['trial','starter','growth','business','enterprise']
//     features:   PlanFeatureDef[],           // 18 features with key/label/description/category
//     matrix:     { [planCode]: { [featureKey]: boolean } }
//   }
//
// Auto-seeds missing rows from DEFAULT_PLAN_MATRIX on first load (idempotent).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      );
    }

    // Ensure every (tier × feature) cell exists in the DB. Idempotent —
    // existing rows (including admin overrides) are preserved.
    try {
      await seedPlanFeatureMatrix();
    } catch (err) {
      // Non-fatal — the per-tier reads below fall back to DEFAULT_PLAN_MATRIX.
      console.warn('[/api/superadmin/plan-features] seed failed (non-fatal):', err);
    }

    // Build the matrix map. We read each tier's flags via getFeaturesForPlan,
    // which already merges DB rows over the defaults.
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const tier of PLAN_TIERS) {
      matrix[tier] = await getFeaturesForPlan(tier as PlanTier);
    }

    return NextResponse.json({
      tiers: PLAN_TIERS,
      features: PLAN_FEATURE_DEFS,
      matrix,
    });
  } catch (error) {
    console.error('[/api/superadmin/plan-features GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load plan feature matrix' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/superadmin/plan-features
//
// Body: { planCode: string, featureKey: string, enabled: boolean }
//
// Updates a single cell in the matrix. Superadmin only.
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { planCode, featureKey, enabled } = body as {
      planCode?: string;
      featureKey?: string;
      enabled?: boolean;
    };

    if (!planCode || !(PLAN_TIERS as readonly string[]).includes(planCode)) {
      return NextResponse.json(
        { error: `planCode must be one of: ${PLAN_TIERS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!featureKey || typeof featureKey !== 'string') {
      return NextResponse.json({ error: 'featureKey is required' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 },
      );
    }

    const row = await db.planFeatureMatrix.upsert({
      where: {
        planCode_featureKey: { planCode, featureKey },
      },
      update: { enabled },
      create: {
        planCode,
        featureKey,
        enabled,
      },
      select: {
        id: true,
        planCode: true,
        featureKey: true,
        enabled: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ cell: row });
  } catch (error) {
    console.error('[/api/superadmin/plan-features PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update plan feature cell' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/plan-features
//
// Body: { action: 'seed' }  — resets the entire matrix to DEFAULT_PLAN_MATRIX.
// Existing overrides are OVERWRITTEN with the canonical defaults. Superadmin
// only. (For idempotent seed-on-first-load, use seedPlanFeatureMatrix() from
// the lib directly — that variant preserves overrides.)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action !== 'seed') {
      return NextResponse.json(
        { error: 'Unknown action. Use { action: "seed" } to reset to defaults.' },
        { status: 400 },
      );
    }

    // For "reset to defaults", we want to OVERWRITE existing rows with the
    // canonical defaults (not just create-if-missing). So we do a per-cell
    // upsert with `update: { enabled }`.
    let reset = 0;
    for (const tier of PLAN_TIERS) {
      const defaults = DEFAULT_PLAN_MATRIX[tier];
      for (const [featureKey, enabled] of Object.entries(defaults)) {
        try {
          await db.planFeatureMatrix.upsert({
            where: {
              planCode_featureKey: { planCode: tier, featureKey },
            },
            update: { enabled },
            create: {
              planCode: tier,
              featureKey,
              enabled,
            },
          });
          reset++;
        } catch (err) {
          console.warn(
            `[/api/superadmin/plan-features POST] reset failed for (${tier}, ${featureKey}):`,
            err,
          );
        }
      }
    }

    return NextResponse.json({ reset });
  } catch (error) {
    console.error('[/api/superadmin/plan-features POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset plan feature matrix' },
      { status: 500 },
    );
  }
}
