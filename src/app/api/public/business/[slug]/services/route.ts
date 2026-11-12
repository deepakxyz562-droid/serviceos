import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currencyMap } from '@/lib/currency';
import {
  isSeededDummyService,
  resolveBusinessCurrency,
} from '@/lib/bgos-business-sanitizers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/business/[slug]/services
 *
 * Public unauthenticated endpoint used by the booking portal (/book/[slug])
 * to retrieve a business's public service menu, duration, and pricing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Business slug required' }, { status: 400 });
    }

    // 1. Find tenant by publicSlug, slug, or ID
    const tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { publicSlug: slug },
          { slug },
          { id: slug },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        city: true,
        country: true,
        currency: true,
        logo: true,
        description: true,
        settingsJson: true,
        brandProfile: {
          select: {
            businessName: true,
            industry: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
    } catch {}

    const bookingPageConfig = settings.bookingPageConfig || {};
    const effectivePhone = bookingPageConfig.phone || tenant.phone;
    const resolvedCurrency = resolveBusinessCurrency({
      currency: tenant.currency,
      country: tenant.country,
      address: tenant.address,
      phone: effectivePhone,
    });
    const currencySymbol = currencyMap[resolvedCurrency]?.symbol || '$';

    // 2. Fetch active real services for this business (strip legacy demo rows)
    const dbServices = await db.service.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        duration: true,
        basePrice: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let services = dbServices
      .filter((s) => !isSeededDummyService({ slug: s.slug, name: s.name, description: s.description }))
      .map(({ slug: _slug, ...rest }) => rest);

    // Fallback to synced GBP/SEO services before showing a neutral free consultation
    if (services.length === 0) {
      const seoOrGbpServices: Array<{
        id: string;
        name: string;
        description: string | null;
        duration: number;
        basePrice: number;
        category: string;
      }> = [];
      const rawList = Array.isArray(settings.seoServices)
        ? settings.seoServices
        : Array.isArray(settings.activeGbpServices)
          ? settings.activeGbpServices
          : [];
      for (let i = 0; i < rawList.length; i++) {
        const entry = rawList[i];
        const name = typeof entry === 'string' ? entry.trim() : String(entry?.name || '').trim();
        if (!name || isSeededDummyService({ name })) continue;
        seoOrGbpServices.push({
          id: `gbp-service-${i + 1}`,
          name,
          description: typeof entry === 'object' && entry?.description ? String(entry.description) : null,
          duration: typeof entry === 'object' && typeof entry?.duration === 'number' ? entry.duration : 45,
          basePrice: typeof entry === 'object' && typeof entry?.price === 'number' ? entry.price : 0,
          category: typeof entry === 'object' && entry?.category ? String(entry.category) : 'General',
        });
      }
      services = seoOrGbpServices.length > 0
        ? seoOrGbpServices
        : [
            {
              id: 'standard-consultation',
              name: 'Consultation & Inquiry',
              description: 'Schedule a free consultation, callback, or estimate.',
              duration: 30,
              basePrice: 0,
              category: 'Consultation',
            },
          ];
    }

    const logoUrl =
      bookingPageConfig.logoUrl ||
      settings?.brandBrain?.brandDetails?.logoUrl ||
      tenant.logo ||
      null;

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantName: bookingPageConfig.businessName || tenant.brandProfile?.businessName || tenant.name,
      slug: tenant.slug,
      publicSlug: tenant.publicSlug || tenant.slug,
      logoUrl,
      currency: resolvedCurrency,
      currencySymbol,
      phone: effectivePhone,
      whatsapp: bookingPageConfig.whatsapp,
      email: bookingPageConfig.email || tenant.email,
      website: bookingPageConfig.website || tenant.website,
      headline: bookingPageConfig.headline || tenant.brandProfile?.industry || 'Local Business Services',
      description: bookingPageConfig.seoDescription || tenant.description,
      onlineBookingEnabled: bookingPageConfig.onlineBookingEnabled ?? true,
      services,
    });
  } catch (error) {
    console.error('[public/business/services] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
