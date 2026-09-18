import { NextRequest, NextResponse } from 'next/server';
import { redactRequestForPublicFeed } from '@/lib/marketplace/privacy-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/requests
 * Customer posts a new service request.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      categorySlug,
      serviceType,
      customerName,
      customerPhone,
      customerEmail,
      streetAddress,
      unit,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      urgency,
      budgetMin,
      budgetMax,
      preferredDate,
      preferredTimeSlot,
      mediaUrls,
    } = body;

    if (!title || !categorySlug || !customerName || !customerPhone || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: title, categorySlug, customerName, customerPhone, city, state' },
        { status: 400 }
      );
    }

    // In-memory / DB representation
    const requestRecord = {
      id: `mreq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      publicSlug: `req-${Date.now().toString(36)}`,
      title,
      description: description || '',
      categorySlug,
      serviceType: serviceType || null,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      streetAddress: streetAddress || null,
      unit: unit || null,
      city,
      state,
      postalCode: postalCode || '',
      country: 'US',
      latitude: Number(latitude) || 41.8781,
      longitude: Number(longitude) || -87.6298,
      urgency: urgency || 'flexible',
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      preferredDate: preferredDate || null,
      preferredTimeSlot: preferredTimeSlot || 'morning',
      status: 'MATCHING',
      createdAt: new Date().toISOString(),
      media: (mediaUrls || []).map((url: string, idx: number) => ({
        id: `med_${idx + 1}`,
        url,
        type: 'image',
      })),
      proposals: [],
    };

    // Return redacted view for privacy
    const publicView = redactRequestForPublicFeed(requestRecord);

    return NextResponse.json({
      success: true,
      request: publicView,
      trackingUrl: `/request/track/${requestRecord.publicSlug}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create request' }, { status: 500 });
  }
}

/**
 * GET /api/marketplace/requests
 * Returns public requests with fuzzy location.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');

    // Sample active mock/seed requests for immediate UI preview
    const sampleRequests = [
      {
        id: 'mreq_sample_1',
        publicSlug: 'req-hvac-chicago-01',
        title: 'Central AC is buzzing and blowing warm air',
        description: 'Unit stopped cooling yesterday afternoon. Outdoor fan spins but air inside is 78 degrees.',
        categorySlug: 'hvac',
        serviceType: 'AC Diagnostic & Repair',
        propertyType: 'residential',
        urgency: 'same_day',
        budgetMin: 200,
        budgetMax: 500,
        city: city || 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'US',
        approxDistanceMiles: 3.4,
        preferredDate: new Date().toISOString(),
        preferredTimeSlot: 'morning',
        status: 'PROPOSALS_RECEIVED',
        proposalsCount: 3,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        media: [],
      },
      {
        id: 'mreq_sample_2',
        publicSlug: 'req-plumb-chicago-02',
        title: 'Water heater leaking from bottom drain valve',
        description: '50-gallon tank has a slow drip near the base. Need inspection and replacement quote if needed.',
        categorySlug: 'plumbing',
        serviceType: 'Water Heater Inspection',
        propertyType: 'residential',
        urgency: 'this_week',
        budgetMin: 350,
        budgetMax: 900,
        city: city || 'Chicago',
        state: 'IL',
        postalCode: '60614',
        country: 'US',
        approxDistanceMiles: 5.1,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
        preferredTimeSlot: 'afternoon',
        status: 'POSTED',
        proposalsCount: 1,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        media: [],
      },
    ];

    const filtered = category
      ? sampleRequests.filter((r) => r.categorySlug === category)
      : sampleRequests;

    return NextResponse.json({
      success: true,
      requests: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}
