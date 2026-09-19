import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redactRequestForPublicFeed } from '@/lib/marketplace/privacy-engine';
import { dispatchMatchingForRequest } from '@/lib/marketplace/matching-dispatch';
import { sendSmsMessage } from '@/lib/sms-send';
import { sendEmail } from '@/lib/email-send';

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

    // Auto-link or resolve marketplace customer if not supplied
    let resolvedCustomerId = marketplaceCustomerId;
    if (!resolvedCustomerId) {
      const normalizedPhone = customerPhone.replace(/[^\d+]/g, '');
      const normalizedEmail = customerEmail ? customerEmail.toLowerCase().trim() : null;
      let existingCustomer = null;
      if (normalizedPhone) {
        existingCustomer = await db.marketplaceCustomer.findUnique({
          where: { phone: normalizedPhone },
        });
      }
      if (!existingCustomer && normalizedEmail) {
        existingCustomer = await db.marketplaceCustomer.findUnique({
          where: { email: normalizedEmail },
        });
      }
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      }
    }

    // Persist to DB
    const request = await db.marketplaceRequest.create({
      data: {
        marketplaceCustomerId: resolvedCustomerId || null,
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

    // Send customer dual-channel confirmation notifications (SMS + Email)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
    const trackingLink = `${baseUrl}/requests/${request.publicSlug}`;

    // 1. Send SMS confirmation
    if (customerPhone) {
      sendSmsMessage({
        to: customerPhone,
        message: `Fieseros: Your request for "${request.title}" is live! Track local contractor bids and quotes here: ${trackingLink}`,
      }).catch((smsErr) => {
        console.warn('[marketplace/requests POST] Customer SMS notification error:', smsErr);
      });
    }

    // 2. Send Email confirmation
    if (customerEmail) {
      sendEmail({
        to: customerEmail,
        subject: `Your Service Request is Live — ${request.title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #059669; margin: 0; font-size: 24px;">Fieseros Marketplace</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Service Request Confirmation</p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">${request.title}</h3>
              <p style="font-size: 14px; color: #475569; margin: 8px 0;"><strong>Location:</strong> ${request.city}, ${request.state} ${request.postalCode}</p>
              <p style="font-size: 14px; color: #475569; margin: 8px 0;"><strong>Urgency:</strong> ${request.urgency}</p>
              ${request.budgetMin || request.budgetMax ? `<p style="font-size: 14px; color: #475569; margin: 8px 0;"><strong>Estimated Budget:</strong> $${request.budgetMin || 0} - $${request.budgetMax || 'Flexible'}</p>` : ''}
              <p style="font-size: 14px; color: #475569; margin: 8px 0;"><strong>Status:</strong> Matching with verified local contractors</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${trackingLink}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 600; border-radius: 8px; display: inline-block; font-size: 15px;">
                Track Request & Compare Bids →
              </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              You received this email because you submitted a service request on Fieseros.
            </p>
          </div>
        `,
        text: `Your service request "${request.title}" is live on Fieseros! Track local contractor bids and quotes here: ${trackingLink}`,
      }).catch((emailErr) => {
        console.warn('[marketplace/requests POST] Customer Email notification error:', emailErr);
      });
    }

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
