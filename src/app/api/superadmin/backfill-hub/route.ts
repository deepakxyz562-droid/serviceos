/**
 * POST /api/superadmin/backfill-hub
 *
 * SuperAdmin-only endpoint to backfill public Business Hub defaults for
 * existing tenants. Equivalent to running:
 *   bun run scripts/backfill-hub-defaults.ts
 *
 * For each tenant that is missing Hub fields (publicProfileEnabled=false OR
 * any of tagline/description/coverImage/etc. is empty) OR has zero Service
 * rows, this endpoint:
 *   1. Calls applyHubDefaultsToTenant() — fills empty tenant.* fields
 *   2. Calls seedDefaultServicesForTenant() — seeds industry-kit services
 *      if the tenant's catalog is empty
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
 *     "hubPopulated": 12,
 *     "servicesSeeded": 8,
 *     "skipped": 30,
 *     "failed": 0,
 *     "failures": [],
 *     "dryRun": false
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  applyHubDefaultsToTenant,
  seedDefaultServicesForTenant,
} from '@/lib/public-business';

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
        { status: 403 }
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const targetSlug: string | undefined = body.slug;
    const dryRun: boolean = body.dryRun === true;

    // ── Load tenants ────────────────────────────────────────────────────
    const where = targetSlug ? { slug: targetSlug } : {};
    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        publicProfileEnabled: true,
        tagline: true,
        description: true,
        coverImage: true,
        onboardingCompleted: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        country: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let hubPopulated = 0;
    let servicesSeeded = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ slug: string; error: string }> = [];

    for (const t of tenants) {
      const needsHubBackfill =
        !t.publicProfileEnabled ||
        !t.tagline ||
        !t.description ||
        !t.coverImage;

      let serviceCount = 0;
      try {
        serviceCount = await db.service.count({ where: { tenantId: t.id } });
      } catch {
        // Service table may not exist or isPublic column missing — treat as 0
        // (the caller should run supabase-migration-service-ispublic.sql first)
      }
      const needsServiceSeed = serviceCount === 0;

      if (!needsHubBackfill && !needsServiceSeed) {
        skipped++;
        continue;
      }

      if (dryRun) {
        if (needsHubBackfill) hubPopulated++;
        if (needsServiceSeed) servicesSeeded++;
        continue;
      }

      try {
        if (needsHubBackfill) {
          await applyHubDefaultsToTenant(t.id);
          hubPopulated++;
        }
        if (needsServiceSeed) {
          const n = await seedDefaultServicesForTenant(t.id);
          if (n > 0) servicesSeeded++;
        }
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
      hubPopulated,
      servicesSeeded,
      skipped,
      failed,
      failures,
      dryRun,
    });
  } catch (error) {
    console.error('[superadmin/backfill-hub] error:', error);
    return NextResponse.json(
      { error: 'Failed to run backfill' },
      { status: 500 }
    );
  }
}
