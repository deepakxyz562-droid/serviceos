import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAppointmentBooking } from '@/lib/scheduling/booking-service';
import { getTenantEventTypes } from '@/features/scheduling/services/event-type-service';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

/**
 * POST /api/public/scheduling/book
 * Public endpoint to book an appointment for an Event Type.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      eventTypeId,
      date,
      time,
      timezone = 'America/New_York',
      customer,
      answers,
      notes,
    } = body;

    if (!tenantId || !date || !time || !customer?.name || !customer?.email) {
      return NextResponse.json(
        { error: 'tenantId, date, time, customer name, and customer email are required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const eventTypes = await getTenantEventTypes(tenantId);
    const eventType = eventTypes.find((e) => e.id === eventTypeId || e.slug === eventTypeId) || eventTypes[0];

    const displayTitle = eventType ? `${eventType.title} with ${customer.name}` : `Meeting with ${customer.name}`;
    const durationMinutes = eventType?.duration || 30;

    const combinedNotes = [
      notes || '',
      answers ? `Additional Details:\n${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await createAppointmentBooking({
      tenantId,
      title: displayTitle,
      serviceName: eventType?.title || 'Scheduled Meeting',
      date,
      time,
      durationMinutes,
      timezone,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || (eventType?.locationType === 'in_person' ? eventType.locationDetails : undefined),
      },
      notes: combinedNotes,
      source: 'scheduling_link',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete booking' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
        lead: result.lead,
        meetingUrl: result.meetingUrl,
        calendarUrls: result.calendarUrls,
        dateStr: result.dateStr,
        timeStr: result.timeStr,
        timezone: result.timezone,
        locationType: eventType?.locationType || 'google_meet',
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Booking execution failed' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
