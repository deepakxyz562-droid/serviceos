import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { MAX_FEATURED, countActiveFeatured, isEligibleForFeatured } from '@/lib/marketplace-featured';

/**
 * POST /api/superadmin/marketplace/listings/[id]/featured
 *
 * Add the tenant to the FeaturedListing table so it appears as a "Featured"
 * provider on the public marketplace browse grid.
 *
 * Rules:
 *   - SuperAdmin only.
 *   - Tenant must be `claimed=true` with a valid paid subscription to be
 *     eligible. Seed/demo data (claimed=false) cannot be featured.
 *   - Enforces a global cap (MAX_FEATURED = 4) on simultaneously-active
 *     featured listings.
 *   - Idempotent: if an active FeaturedListing row already exists for this
 *     tenant, it's a no-op (returns 200).
 *
 * Body: { priority?: number }   (default 10)
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden — SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const priority = Math.max(0, Math.min(100, Number(body.priority ?? 10) || 10));

    // Fetch tenant and confirm eligibility
    const tenant = await db.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        claimed: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        suspendedAt: true,
        marketplaceOptIn: true,
        publicProfileEnabled: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Eligibility gate — must be a real registered user with a valid paid plan
    if (!isEligibleForFeatured(tenant)) {
      return NextResponse.json(
        {
          error:
            'This listing is not eligible to be featured. Only real registered businesses with an active paid subscription (growth / pro / business / enterprise) or a valid trial can be featured. Seed data and expired trials cannot be featured.',
        },
        { status: 400 },
      );
    }

    // Idempotency check — if an active FeaturedListing row already exists, no-op
    const existing = await db.featuredListing.findFirst({
      where: {
        tenantId: id,
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyFeatured: true });
    }

    // Enforce MAX_FEATURED cap
    const activeCount = await countActiveFeatured();
    if (activeCount >= MAX_FEATURED) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_FEATURED} featured providers allowed. Remove one before featuring another.`,
        },
        { status: 409 },
      );
    }

    await db.featuredListing.create({
      data: {
        tenantId: id,
        type: 'featured',
        priority,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        amountCharged: 0,
        currency: 'USD',
        // Explicit — matches the Prisma @default("{}"). The Supabase REST
        // adapter does NOT apply Prisma @default values (it only auto-gens
        // `id` and relies on DB-level DEFAULT clauses for the rest), and the
        // metadataJson column is NOT NULL in Postgres with no DB default.
        // Without this, the INSERT sends null → "null value in column
        // metadataJson violates not-null constraint" HTTP 500.
        metadataJson: '{}',
      },
    });

    // Revalidate the marketplace browse page so the new featured provider shows
    try {
      revalidatePath('/marketplace', 'page');
    } catch {
      // revalidatePath can throw in some edge runtimes — non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings/[id]/featured POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/superadmin/marketplace/listings/[id]/featured
 *
 * Remove the tenant from the FeaturedListing table (deactivate all active rows).
 * Idempotent — if no active FeaturedListing row exists, returns 200.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden — SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await ctx.params;

    // Soft-delete: set isActive=false on all active rows for this tenant
    const result = await db.featuredListing.updateMany({
      where: { tenantId: id, isActive: true },
      data: { isActive: false, endDate: new Date() },
    });

    try {
      revalidatePath('/marketplace', 'page');
    } catch {
      // non-fatal
    }

    return NextResponse.json({ success: true, deactivated: result.count });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings/[id]/featured DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
