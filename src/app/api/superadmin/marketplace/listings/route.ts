import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';

// GET /api/superadmin/marketplace/listings
//
// Query params:
//   ?page=1&limit=20&search=cat&category=plumbing&tier=free&city=Sydney
//
// Only returns tenants where listingTier != 'none' OR marketplaceOptIn = true.
// Ordered by createdAt DESC, paginated.
//
// Response includes featured-listing + trial-status metadata so the SuperAdmin
// Directory Listings table can show the featured star toggle and the trial badge.

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') ?? 20) || 20));
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const tier = (searchParams.get('tier') || '').trim();
    const city = (searchParams.get('city') || '').trim();

    // ── Build where clause ───────────────────────────────────────────────
    // Include tenants where listingTier is NULL (treat as 'none' = hidden) OR
    // listingTier != 'none' OR marketplaceOptIn = true. The previous
    // `{ listingTier: { not: 'none' } }` clause silently excluded NULL rows in
    // SQL — this version explicitly includes them so the directory total is
    // consistent with what's shown.
    const where: Record<string, unknown> = {
      OR: [
        { listingTier: { not: 'none' } },
        { listingTier: null },
        { marketplaceOptIn: true },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        },
      ];
    }
    if (category) {
      where.AND = [
        ...((where.AND as unknown[]) || []),
        { industry: category },
      ];
    }
    if (tier && tier !== 'all') {
      where.AND = [
        ...((where.AND as unknown[]) || []),
        { listingTier: tier },
      ];
    }
    if (city && city !== 'all') {
      where.AND = [
        ...((where.AND as unknown[]) || []),
        { city },
      ];
    }

    // ── Pull a page of listings ──────────────────────────────────────────
    const [rows, total] = await Promise.all([
      db.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          industry: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          rating: true,
          reviewCount: true,
          listingTier: true,
          claimed: true,
          publicProfileEnabled: true,
          description: true,
          plan: true,
          planStatus: true,
          trialEndsAt: true,
          suspendedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tenant.count({ where }),
    ]);

    // ── Fetch featured-listing flags in a single query ───────────────────
    const tenantIds = rows.map((r) => r.id);
    const featuredRows = tenantIds.length
      ? await db.featuredListing.findMany({
          where: {
            tenantId: { in: tenantIds },
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          select: { tenantId: true, priority: true, endDate: true },
          orderBy: { priority: 'desc' },
        })
      : [];
    const featuredMap = new Map<string, { priority: number; endDate: Date | null }>();
    for (const fl of featuredRows) {
      if (fl.tenantId && !featuredMap.has(fl.tenantId)) {
        featuredMap.set(fl.tenantId, { priority: fl.priority, endDate: fl.endDate });
      }
    }

    const now = new Date();
    const items = rows.map((r) => {
      const featuredInfo = featuredMap.get(r.id);
      const isFeatured = Boolean(featuredInfo);
      const trialEndsAt = r.trialEndsAt;
      const isTrialExpired =
        r.planStatus === 'trial' &&
        trialEndsAt !== null &&
        trialEndsAt <= now;
      const isEligibleForFeatured =
        r.claimed === true &&
        ['growth', 'pro', 'business', 'enterprise'].includes(r.plan ?? '') &&
        (r.planStatus === 'active' ||
          (r.planStatus === 'trial' &&
            (trialEndsAt === null || trialEndsAt > now)));

      return {
        id: r.id,
        name: r.name,
        industry: r.industry || '',
        city: r.city || '',
        state: r.state || '',
        phone: r.phone || '',
        email: r.email || '',
        rating: typeof r.rating === 'number' ? r.rating : Number(r.rating ?? 0),
        reviewCount:
          typeof r.reviewCount === 'number'
            ? r.reviewCount
            : Number(r.reviewCount ?? 0),
        listingTier: r.listingTier || 'none',
        claimed: Boolean(r.claimed),
        publicProfileEnabled: Boolean(r.publicProfileEnabled),
        description: r.description || '',
        plan: r.plan || 'starter',
        planStatus: r.planStatus || 'trial',
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        isTrialExpired,
        isFeatured,
        featuredPriority: featuredInfo?.priority ?? null,
        isEligibleForFeatured,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      };
    });

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings] Error:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, limit: 20 });
  }
}
