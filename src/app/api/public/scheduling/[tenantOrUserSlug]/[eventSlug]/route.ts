import { NextRequest, NextResponse } from 'next/server';
import { findEventTypeBySlug } from '@/features/scheduling/services/event-type-service';
import { calculateAvailableSlots } from '@/lib/scheduling/slot-engine';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

/**
 * GET /api/public/scheduling/[tenantOrUserSlug]/[eventSlug]?date=YYYY-MM-DD&timezone=...
 * Public route to fetch event type details and available slots.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantOrUserSlug: string; eventSlug: string }> }
) {
  try {
    const { tenantOrUserSlug, eventSlug } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const timezone = searchParams.get('timezone') || 'America/New_York';

    const { eventType, tenant } = await findEventTypeBySlug(tenantOrUserSlug, eventSlug);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Host not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (!eventType || !eventType.isActive) {
      return NextResponse.json(
        { error: 'Event type not found or inactive' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Calculate live slots for the date taking into account Google Calendar busy times
    const slotResults = await calculateAvailableSlots({
      tenantId: tenant.id,
      date,
      timezone,
    });

    return NextResponse.json(
      {
        success: true,
        host: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          email: tenant.email,
          googleCalendarConnected: Boolean(tenant.googleCalendarSyncEnabled),
        },
        eventType,
        date,
        timezone: slotResults.timezone,
        workingDay: slotResults.workingDay,
        reason: slotResults.reason,
        slots: slotResults.slots,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load scheduling page' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
