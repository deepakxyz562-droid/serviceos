import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Provider Profile — list (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET /api/marketplace/providers
 *
 * Public list of marketplace-eligible providers (tenants who have opted
 * in + passed all eligibility gates). Powers the marketplace browse page.
 *
 * Query params:
 *   industry: string   (industry id from INDUSTRY_CATALOG)
 *   city:     string   (case-insensitive substring match)
 *   service:  string   (service id — providers offering this service)
 *   search:   string   (name / description contains)
 *   limit:    number   (default 20, max 100)
 *   offset:   number   (default 0)
 *
 * Returns: { items, total }
 *   items: [{ id, name, slug, tagline, industry, city, state, country,
 *            rating, reviewCount, currency, description, coverImage,
 *            services: [{id, name, basePrice, duration}], featured: bool }]
 */

interface RouteContext {
  params: Promise<Record<string, string>>;
}

export async function GET(request: NextRequest, _ctx: RouteContext) {
  void _ctx;
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry')?.toLowerCase().trim() || null;
  const city = searchParams.get('city')?.trim() || null;
  const serviceId = searchParams.get('service')?.trim() || null;
  const search = searchParams.get('search')?.trim() || null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  // ── Base where: 2-gate eligibility (marketplaceOptIn dropped) ──────────
  // Any tenant with a public Business Hub page (publicProfileEnabled=true)
  // who is not suspended is listed. Verification status is returned as flags
  // on each item so the client can render badges. This matches the marketplace
  // browse page (src/app/marketplace/(browse)/page.tsx) so the API and the
  // SSR page show the same set of providers.
  const where: Record<string, unknown> = {
    publicProfileEnabled: true,
    suspendedAt: null,
  };

  if (city) {
    where.OR = [
      { city: { contains: city, mode: 'insensitive' } },
      { state: { contains: city, mode: 'insensitive' } },
    ];
  }

  if (search) {
    // Combine with existing OR clause if both city + search are set.
    const searchOR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tagline: { contains: search, mode: 'insensitive' } },
    ];
    if (where.OR) {
      // Prisma can't combine OR clauses directly — we'd need AND of two ORs.
      // Use AND[existing OR, searchOR] via explicit AND.
      where.AND = [{ OR: where.OR }, { OR: searchOR }];
      delete where.OR;
    } else {
      where.OR = searchOR;
    }
  }

  // Industry filter is applied in-app (primary OR businessCategoriesJson).
  // Service filter is applied in-app (we'd need a join to filter by services).

  try {
    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        tagline: true,
        industry: true,
        city: true,
        state: true,
        country: true,
        currency: true,
        rating: true,
        reviewCount: true,
        description: true,
        coverImage: true,
        pricingType: true,
        callOutFee: true,
        emergencyServiceAvailable: true,
        businessCategoriesJson: true,
        serviceAreasJson: true,
        // Verification flags for badge rendering on the client
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        stripeConnected: true,
        planStatus: true,
        services: {
          where: { isActive: true, isPublic: true },
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            duration: true,
            image: true,
          },
          take: 10,
        },
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: industry || serviceId ? 200 : limit, // fetch extra if we'll filter in-app
      skip: industry || serviceId ? 0 : offset,
    });

    // ── In-app industry filter ──
    let filtered = tenants;
    if (industry) {
      filtered = filtered.filter((t) => {
        if ((t.industry ?? '').toLowerCase().trim() === industry) return true;
        try {
          const cats = JSON.parse(t.businessCategoriesJson || '[]');
          return (
            Array.isArray(cats) &&
            cats.some((c) => typeof c === 'string' && c.toLowerCase() === industry)
          );
        } catch {
          return false;
        }
      });
    }

    // ── In-app service filter ──
    if (serviceId) {
      filtered = filtered.filter((t) =>
        t.services.some((s) => s.id === serviceId),
      );
    }

    // ── Fetch featured listing flags in a single query ──
    const tenantIds = filtered.map((t) => t.id);
    const featuredListings = tenantIds.length
      ? await db.featuredListing.findMany({
          where: {
            tenantId: { in: tenantIds },
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          select: { tenantId: true, type: true },
        })
      : [];
    const featuredMap = new Map<string, string>();
    for (const fl of featuredListings) {
      if (!featuredMap.has(fl.tenantId!)) {
        featuredMap.set(fl.tenantId!, fl.type);
      }
    }

    const items = filtered.slice(offset, offset + limit).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      publicSlug: t.publicSlug,
      tagline: t.tagline,
      industry: t.industry,
      city: t.city,
      state: t.state,
      country: t.country,
      currency: t.currency,
      rating: t.rating,
      reviewCount: t.reviewCount,
      description: t.description,
      coverImage: t.coverImage,
      pricingType: t.pricingType,
      callOutFee: t.callOutFee,
      emergencyServiceAvailable: t.emergencyServiceAvailable,
      serviceAreas: (() => {
        try {
          const arr = JSON.parse(t.serviceAreasJson || '[]');
          return Array.isArray(arr) ? arr.slice(0, 10) : [];
        } catch {
          return [];
        }
      })(),
      services: t.services,
      featured: featuredMap.get(t.id) ?? null,
      // Verification flags for client-side badge rendering
      identityVerified: t.identityVerified,
      businessVerified: t.businessVerified,
      insuranceVerified: t.insuranceVerified,
      stripeConnected: t.stripeConnected,
      planStatus: t.planStatus,
    }));

    log.info(
      { returned: items.length, total: filtered.length, industry, city, serviceId, search },
      'marketplace/providers: list',
    );

    return NextResponse.json({
      items,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (err) {
    log.error({ err }, 'marketplace/providers: list failed');
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 },
    );
  }
}
