import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { ttlCacheWrap, buildCacheKey } from '@/lib/ttl-cache';

/**
 * Provider Profile — public (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET /api/marketplace/providers/[slug]
 *
 * Public provider profile page data. Powers the marketplace detail view
 * at /provider/[slug]. The slug matches either Tenant.slug OR
 * Tenant.publicSlug.
 *
 * Returns: {
 *   tenant: { id, name, slug, tagline, description, industry, city, state,
 *             country, currency, rating, reviewCount, coverImage, gallery,
 *             businessHours, serviceAreas, socialLinks, faqs,
 *             pricingType, callOutFee, emergencyServiceAvailable,
 *             languages, vatNumber, licenceNumber, insuranceProvider,
 *             employeesCount, businessCategories, seoTitle, seoDescription },
 *   services: [{ id, name, slug, description, basePrice, duration, image, category }],
 *   portfolio: { items, videos, awards, projects, team },
 *   certifications: [{ id, name, issuer, issueDate, expiryDate, isVerified, certificateNumber }],
 *   reviews: [{ id, rating, comment, authorName, createdAt, responseJson }],
 *   featured: bool
 * }
 *
 * CACHING: 120s in-memory TTL cache keyed on the slug. Provider profiles
 * change rarely (only when the owner edits their profile or a new review
 * is posted), so a 120s TTL is safe and eliminates the 5-query waterfall
 * on every detail-page visit.
 *
 * Public endpoint — rate-limited via apiLimiter.
 */

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { slug } = await ctx.params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    // PERFORMANCE: 120s TTL cache keyed on the slug. Provider profiles change
    // rarely (only when the owner edits or a new review is posted), so the
    // 5-query waterfall (tenant + services + portfolio + certifications +
    // reviews + featured) only runs once every 2 minutes per slug.
    const cacheKey = buildCacheKey('mp:profile', { slug });
    const data = await ttlCacheWrap(cacheKey, 120_000, async () => {
      const tenant = await db.tenant.findFirst({
        where: {
          OR: [{ slug }, { publicSlug: slug }],
          suspendedAt: null,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          publicSlug: true,
          tagline: true,
          description: true,
          industry: true,
          city: true,
          state: true,
          country: true,
          currency: true,
          rating: true,
          reviewCount: true,
          coverImage: true,
          galleryJson: true,
          businessHoursJson: true,
          serviceAreasJson: true,
          socialLinksJson: true,
          faqsJson: true,
          pricingType: true,
          callOutFee: true,
          emergencyServiceAvailable: true,
          languagesJson: true,
          vatNumber: true,
          licenceNumber: true,
          insuranceProvider: true,
          insurancePolicyNumber: true,
          employeesCount: true,
          businessCategoriesJson: true,
          seoTitle: true,
          seoDescription: true,
          email: true,
          phone: true,
          whatsappPhone: true,
          website: true,
          address: true,
          // Eligibility flags — surface to the public so the UI can show
          // verified badges.
          identityVerified: true,
          businessVerified: true,
          insuranceVerified: true,
          stripeConnected: true,
          marketplaceOptIn: true,
        },
      });

      if (!tenant) {
        return null; // 404
      }

      // ── Phone + website normalization ────────────────────────────────────
      // Strip any leading backslash (defensive — some seed data carried "\+1")
      // and ensure the website has a protocol so the rendered <a> is clickable.
      const normalizePhone = (raw: string | null): string | null => {
        if (!raw) return null;
        const cleaned = raw.replace(/^[\s\\]+/, '').trim();
        return cleaned || null;
      };
      const normalizeWebsite = (raw: string | null): string | null => {
        if (!raw) return null;
        const trimmed = raw.trim();
        if (!trimmed) return null;
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      };
      const tenantNormalized = {
        ...tenant,
        phone: normalizePhone(tenant.phone),
        whatsappPhone: normalizePhone(tenant.whatsappPhone),
        website: normalizeWebsite(tenant.website),
      };

      // ── Parallel: services, portfolio, certifications, reviews, featured ──
      const [services, portfolio, certifications, reviews, featured] = await Promise.all([
        db.service.findMany({
          where: { tenantId: tenant.id, isActive: true, isPublic: true },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            longDescription: true,
            basePrice: true,
            duration: true,
            image: true,
            category: true,
          },
          orderBy: { category: 'asc' },
        }),
        db.providerPortfolio.findUnique({
          where: { tenantId: tenant.id },
          select: {
            itemsJson: true,
            videosJson: true,
            awardsJson: true,
            projectsJson: true,
            teamJson: true,
          },
        }),
        db.providerCertification.findMany({
          where: { tenantId: tenant.id },
          select: {
            id: true,
            name: true,
            issuer: true,
            issueDate: true,
            expiryDate: true,
            isVerified: true,
            certificateNumber: true,
            documentUrl: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.review.findMany({
          where: { tenantId: tenant.id, status: 'published' },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorName: true,
            source: true,
            responseJson: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }),
        db.featuredListing.findFirst({
          where: {
            tenantId: tenant.id,
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          select: { id: true, type: true, priority: true },
        }),
      ]);

      // Helper to safely parse JSON fields on the tenant row.
      const safeParse = <T,>(json: string | null | undefined, fallback: T): T => {
        if (!json) return fallback;
        try {
          const parsed = JSON.parse(json);
          return parsed ?? fallback;
        } catch {
          return fallback;
        }
      };

      return {
        tenant: {
          ...tenantNormalized,
          gallery: safeParse(tenantNormalized.galleryJson, []),
          businessHours: safeParse(tenant.businessHoursJson, {}),
          serviceAreas: safeParse(tenant.serviceAreasJson, []),
          socialLinks: safeParse(tenant.socialLinksJson, {}),
          faqs: safeParse(tenant.faqsJson, []),
          languages: safeParse(tenant.languagesJson, []),
          businessCategories: safeParse(tenant.businessCategoriesJson, []),
          // Don't leak raw JSON columns
          galleryJson: undefined,
          businessHoursJson: undefined,
          serviceAreasJson: undefined,
          socialLinksJson: undefined,
          faqsJson: undefined,
          languagesJson: undefined,
          businessCategoriesJson: undefined,
        },
        services,
        portfolio: portfolio
          ? {
              items: safeParse(portfolio.itemsJson, []),
              videos: safeParse(portfolio.videosJson, []),
              awards: safeParse(portfolio.awardsJson, []),
              projects: safeParse(portfolio.projectsJson, []),
              team: safeParse(portfolio.teamJson, []),
            }
          : { items: [], videos: [], awards: [], projects: [], team: [] },
        certifications,
        reviews: reviews.map((r) => ({
          ...r,
          response: safeParse(r.responseJson, null),
          responseJson: undefined,
        })),
        featured: featured
          ? { type: featured.type, priority: featured.priority }
          : null,
      };
    });

    if (data === null) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 },
      );
    }

    log.info(
      { slug, services: data.services.length, reviews: data.reviews.length },
      'marketplace/providers/[slug]: served',
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    });
  } catch (err) {
    log.error({ err, slug }, 'marketplace/providers/[slug]: fetch failed');
    return NextResponse.json(
      { error: 'Failed to fetch provider profile' },
      { status: 500 },
    );
  }
}
