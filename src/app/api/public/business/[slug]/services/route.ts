import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // 1. Find tenant by slug or ID
    const tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        email: true,
        website: true,
        city: true,
        description: true,
        settingsJson: true,
        brandProfile: {
          select: {
            businessName: true,
            logoUrl: true,
            industry: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // 2. Fetch active services for this business
    let services = await db.service.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        basePrice: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // If tenant has no custom services yet, provide standard base service templates
    if (services.length === 0) {
      services = [
        {
          id: 'standard-consultation',
          name: 'Consultation & Assessment',
          description: 'Initial diagnostic check-up, inspection, and upfront quote.',
          duration: 30,
          basePrice: 0,
          category: 'Standard Service',
        },
        {
          id: 'standard-service-call',
          name: 'General Service Call',
          description: 'On-site professional service appointment and diagnosis.',
          duration: 60,
          basePrice: 50,
          category: 'Standard Service',
        },
      ];
    }

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
    } catch {}

    const bookingPageConfig = settings.bookingPageConfig || {};

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantName: bookingPageConfig.businessName || tenant.brandProfile?.businessName || tenant.name,
      slug: tenant.slug,
      phone: bookingPageConfig.phone || tenant.phone,
      whatsapp: bookingPageConfig.whatsapp,
      email: bookingPageConfig.email || tenant.email,
      website: bookingPageConfig.website || tenant.website,
      headline: bookingPageConfig.headline || tenant.brandProfile?.industry || 'Professional Services',
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
