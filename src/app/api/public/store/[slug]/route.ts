import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeStoreAvailabilityFromConfig } from '@/lib/commerce/store-availability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const isDemoSlug = slug === 'my-store' || slug === 'sharma-kirana' || slug.startsWith('demo');

    let tenant: any = null;
    try {
      tenant = await db.tenant.findFirst({
        where: {
          OR: [
            { slug },
            { publicSlug: slug },
            { id: slug },
            { slug: decodeURIComponent(slug) },
            { publicSlug: decodeURIComponent(slug) },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          logo: true,
        },
      });
    } catch {}

    let businessId = tenant?.id || slug;
    let businessName = tenant?.name || (slug === 'sharma-kirana' ? 'Sharma Kirana Store' : (slug === 'my-store' ? 'My Store' : 'Local Store'));
    let businessPhone = tenant?.phone || (slug === 'sharma-kirana' ? '+91 98765 43210' : '');
    let businessAddress = [tenant?.address, tenant?.city].filter(Boolean).join(', ') || (slug === 'sharma-kirana' ? 'Station Road, Kankarbagh, Patna, Bihar' : 'Local Area');

    try {
      if (tenant?.id) {
        const ownerBusiness = await db.aiBusiness.findFirst({ where: { tenantId: tenant.id } });
        if (ownerBusiness) {
          businessId = ownerBusiness.id;
          if (ownerBusiness.name) businessName = ownerBusiness.name;
          if (ownerBusiness.phone) businessPhone = ownerBusiness.phone;
          if (ownerBusiness.address) businessAddress = ownerBusiness.address;
        }
      }
    } catch {}

    let config: any = null;
    try {
      config = await db.gptformCommerceConfig.findFirst({
        where: {
          OR: [
            { businessId },
            ...(tenant?.id ? [{ businessId: tenant.id }] : []),
            { businessId: slug },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {}

    const availability = computeStoreAvailabilityFromConfig(config, businessName);

    let parsedFields: any = {};
    try {
      if (config?.fieldsJson) parsedFields = JSON.parse(config.fieldsJson);
    } catch {}

    let catalog: any[] = [];
    try {
      if (config?.catalogJson) catalog = JSON.parse(config.catalogJson);
    } catch {}

    return NextResponse.json({
      business: {
        id: businessId,
        name: businessName,
        slug: tenant?.slug || slug,
        phone: businessPhone,
        address: businessAddress,
        coverImageUrl: tenant?.logo || '',
        tagline: config?.greetingMessage || `${businessName} • Direct Store Ordering`,
      },
      config: {
        isStoreOpen: availability.isOpen,
        lastActiveDate: parsedFields.lastActiveDate || '',
        manualCloseReason: parsedFields.manualCloseReason || '',
        autoCloseIfInactive: parsedFields.autoCloseIfInactive ?? true,
        estimatedDeliveryTime: parsedFields.deliverySettings?.estimatedDeliveryTime || '30 - 45 min',
        minOrderAmount: parsedFields.deliverySettings?.minOrderAmount || 100,
        freeDeliveryAbove: parsedFields.deliverySettings?.freeDeliveryAbove || 299,
        deliveryCharge: parsedFields.deliverySettings?.deliveryCharge || 30,
        upiId: config?.upiId || '',
        paymentQrUrl: parsedFields.paymentQrUrl || '',
      },
      isStoreOpen: availability.isOpen,
      storeCloseReason: availability.reason,
      todayHoursText: availability.todayHoursText,
      catalog,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch store details' },
      { status: 500 }
    );
  }
}
