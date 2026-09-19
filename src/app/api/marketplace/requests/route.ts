import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redactRequestForPublicFeed } from '@/lib/marketplace/privacy-engine';
import { dispatchMatchingForRequest } from '@/lib/marketplace/matching-dispatch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/requests
 * Customer posts a new service request. Persists to MarketplaceRequest table.
 *
 * Body:
 *   title, description, categorySlug, serviceType,
 *   customerName, customerPhone, customerEmail,
 *   streetAddress, unit, city, state, postalCode, latitude, longitude,
 *   urgency, budgetMin, budgetMax, preferredDate, preferredTimeSlot,
 *   mediaUrls (string[]), marketplaceCustomerId (optional — set if logged in)
 *
 * Privacy:
 *   The full street address is stored but NOT returned to providers until
 *   a booking is confirmed (addressUnlocked = true on MarketplaceBooking).
 *   The public view uses redactRequestForPublicFeed() to mask the address.
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
      marketplaceCustomerId,
    } = body;

    if (!title || !categorySlug || !customerName || !customerPhone || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: title, categorySlug, customerName, customerPhone, city, state' },
        { status: 400 },
      );
    }

    // Persist to DB
    const request = await db.marketplaceRequest.create({
      data: {
        marketplaceCustomerId: marketplaceCustomerId || null,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        categorySlug,
        serviceType: serviceType || null,
        title,
        description: description || '',
        propertyType: body.propertyType || 'residential',
        urgency: urgency || 'flexible',
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        city,
        state,
        postalCode: postalCode || '',
        country: body.country || 'US',
        latitude: Number(latitude) || 0,
        longitude: Number(longitude) || 0,
        streetAddress: streetAddress || null,
        unit: unit || null,
        accessInstructions: body.accessInstructions || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeSlot: preferredTimeSlot || 'morning',
        status: 'POSTED',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        media: mediaUrls?.length
          ? {
              create: (mediaUrls as string[]).map((url, idx) => ({
                url,
                type: idx === 0 ? 'image' : 'image',
              })),
            }
          : undefined,
      },
      include: {
        media: true,
        proposals: true,
      },
    });

    // Return redacted view for privacy (address hidden from public feed)
    const publicView = redactRequestForPublicFeed(request);

    // Fire-and-forget: dispatch matching engine to find + notify top providers.
    // This runs asynchronously so the customer's response isn't blocked.
    dispatchMatchingForRequest(request.id).catch((err) => {
      console.error('[marketplace/requests POST] matching dispatch failed:', err);
    });

    return NextResponse.json({
      success: true,
      request: publicView,
      trackingUrl: `/requests/${request.publicSlug}`,
    });
  } catch (error: any) {
    console.error('[marketplace/requests POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/marketplace/requests
 * Returns public requests with fuzzy location (address redacted).
 *
 * Query params:
 *   category — filter by categorySlug
 *   city     — filter by city
 *   status   — default 'ACTIVE' (POSTED, MATCHING, ACTIVE, PROPOSALS_RECEIVED)
 *   limit    — default 50
 *   offset   — default 0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

    // Only show active requests (not DRAFT, COMPLETED, CANCELLED, EXPIRED)
    const activeStatuses = ['POSTED', 'MATCHING', 'ACTIVE', 'PROPOSALS_RECEIVED'];

    const where: Record<string, unknown> = {
      status: { in: activeStatuses },
    };
    if (category) where.categorySlug = category;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const requests = await db.marketplaceRequest.findMany({
      where,
      include: {
        media: true,
        proposals: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Redact all requests before returning
    const publicRequests = requests.map((r) => ({
      ...redactRequestForPublicFeed(r),
      proposalsCount: r.proposals.filter((p) => p.status !== 'WITHDRAWN').length,
    }));

    return NextResponse.json({
      success: true,
      requests: publicRequests,
      total: publicRequests.length,
    });
  } catch (error: any) {
    console.error('[marketplace/requests GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 },
    );
  }
}
