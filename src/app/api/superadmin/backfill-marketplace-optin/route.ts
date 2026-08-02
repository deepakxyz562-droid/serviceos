/**
 * POST /api/superadmin/backfill-marketplace-optin
 *
 * SuperAdmin-only endpoint to backfill `marketplaceOptIn = true` for
 * existing tenants who have a public Business Hub page but were never
 * opted into the marketplace browse grid.
 *
 * WHY THIS EXISTS
 * ---------------
 * The `marketplaceOptIn` flag (controls /marketplace browse-grid eligibility)
 * and the `publicProfileEnabled` flag (controls the public hub page at
 * /{industry}/{city}/{slug}) are independent columns. Older backfill/seed
 * tools (`applyHubDefaultsToTenant`, `seedPublicBusinessForTenant`) set
 * `publicProfileEnabled = true` but NEVER set `marketplaceOptIn`. So a large
 * cohort of tenants have working public pages but are invisible on the
 * marketplace grid — which is why the marketplace showed only ~12 providers
 * (the few who went through onboarding step 2's toggle) instead of every
 * provider with a public page.
 *
 * This endpoint fixes that cohort in one shot. It is IDEMPOTENT — running it
 * twice is safe (the second run finds zero candidates).
 *
 * SAFETY: respects explicit opt-outs. Only opts in tenants where
 * `marketplaceTermsAcceptedAt IS NULL` (never interacted with the marketplace
 * toggle). If a user completed onboarding step 2 and explicitly turned the
 * toggle OFF, `marketplaceTermsAcceptedAt` is set, so this backfill skips
 * them.
 *
 * Request body (all optional):
 *   {
 *     "slug": "acme-plumbing",   // optional — backfill only this tenant
 *     "dryRun": true             // optional — preview without DB writes
 *   }
 *
 * Response:
 *   {
 *     "total": 50,
 *     "optedIn": 38,
 *     "skipped": 12,          // already had marketplaceTermsAcceptedAt set
 *     "failed": 0,
 *     "failures": [],
 *     "dryRun": false
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // ── Auth: superadmin only ───────────────────────────────────────────
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden - SuperAdmin access required' },
        { status: 403 },
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const targetSlug: string | undefined = body.slug;
    const dryRun: boolean = body.dryRun === true;

    // ── Load candidate tenants ──────────────────────────────────────────
    // Candidates: have a public profile page (publicProfileEnabled=true) AND
    // have never interacted with the marketplace opt-in toggle
    // (marketplaceTermsAcceptedAt IS NULL). The second condition is what
    // makes this safe — it respects explicit opt-outs from onboarding.
    const where = {
      publicProfileEnabled: true,
      marketplaceTermsAcceptedAt: null,
      suspendedAt: null,
      ...(targetSlug ? { slug: targetSlug } : {}),
    };
    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        marketplaceTermsAcceptedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let optedIn = 0;
    let failed = 0;
    const failures: Array<{ slug: string; error: string }> = [];

    for (const t of tenants) {
      if (dryRun) {
        optedIn++;
        continue;
      }
      try {
        await db.tenant.update({
          where: { id: t.id },
          data: {
            marketplaceOptIn: true,
            marketplaceTermsAcceptedAt: new Date(),
          },
        });
        optedIn++;
      } catch (err) {
        failed++;
        failures.push({
          slug: t.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      total: tenants.length,
      optedIn,
      skipped: tenants.length - optedIn - failed,
      failed,
      failures,
      dryRun,
    });
  } catch (error) {
    console.error('Backfill marketplace opt-in error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill marketplace opt-in' },
      { status: 500 },
    );
  }
}
