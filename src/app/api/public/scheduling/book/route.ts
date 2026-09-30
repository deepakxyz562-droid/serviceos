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
      tenantId: rawTenantId,
      tenantSlug,
      eventTypeId,
      eventSlug,
      date: rawDate,
      time: rawTime,
      scheduledAt: rawScheduledAt,
      timezone = 'America/New_York',
      customer: rawCustomer,
      name: rawName,
      email: rawEmail,
      phone: rawPhone,
      answers,
      notes: rawNotes,
      serviceName: rawServiceName,
      price = 0,
      currency = 'USD',
    } = body;

    // 1. Resolve Tenant by ID or Slug
    let tenant: any = null;
    if (rawTenantId && rawTenantId !== 'preview') {
      tenant = await db.tenant.findFirst({
        where: {
          OR: [{ id: rawTenantId }, { slug: rawTenantId }],
        },
      });
    }
    if (!tenant && tenantSlug && tenantSlug !== 'preview') {
      tenant = await db.tenant.findFirst({
        where: {
          OR: [{ slug: tenantSlug }, { id: tenantSlug }],
        },
      });
    }
    // SECURITY: No silent tenant fallback.
    // Previously fell back to db.tenant.findFirst() — allowing anonymous
    // bookings to attach to a random tenant. Now return 400 if unresolved.
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unable to resolve tenant. Provide a valid tenantId or tenantSlug.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const tenantId = tenant?.id || null;

    // 2. Resolve Customer Information
    const customerName = rawCustomer?.name || rawName || 'Attendee';
    const customerEmail = rawCustomer?.email || rawEmail || '';
    const customerPhone = rawCustomer?.phone || rawPhone || '';
    const notes = rawNotes || rawCustomer?.notes || '';

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Email is required to confirm booking' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 3. Resolve Date and Time
    let date = rawDate;
    let time = rawTime;
    if ((!date || !time) && rawScheduledAt) {
      try {
        const d = new Date(rawScheduledAt);
        date = d.toISOString().split('T')[0];
        time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch {}
    }
    if (!date) {
      date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    }
    if (!time) {
      time = '14:00';
    }

    // 4. Resolve Event Type
    const targetSlug = eventTypeId || eventSlug || '30min';
    let eventTypes: any[] = [];
    if (tenantId) {
      eventTypes = await getTenantEventTypes(tenantId);
    }
    const eventType = eventTypes.find((e) => e.id === targetSlug || e.slug === targetSlug) || eventTypes[0];

    const serviceName = rawServiceName || eventType?.title || 'Scheduled Meeting';
    const displayTitle = eventType ? `${eventType.title} with ${customerName}` : `${serviceName} with ${customerName}`;
    const durationMinutes = eventType?.duration || 30;

    const combinedNotes = [
      notes || '',
      answers ? `Additional Details:\n${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : '',
      price > 0 ? `Price: ${currency} ${price}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // 5. Create Booking in database & sync with Google Calendar
    const result = await createAppointmentBooking({
      tenantId,
      title: displayTitle,
      serviceName,
      date,
      time,
      durationMinutes,
      timezone,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: rawCustomer?.address || (eventType?.locationType === 'in_person' ? eventType.locationDetails : undefined),
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

    // 6. Ensure Customer & TimelineEvent exist in CRM for cross-platform visibility
    if (tenantId && customerEmail) {
      try {
        let customer = await db.customer.findFirst({
          where: { tenantId, email: customerEmail },
        });

        if (!customer) {
          customer = await db.customer.create({
            data: {
              tenantId,
              name: customerName,
              email: customerEmail,
              phone: customerPhone || null,
              source: 'scheduling',
            },
          });
        }

        if (result.booking?.id) {
          await db.booking.update({
            where: { id: result.booking.id },
            data: { customerId: customer.id },
          });
        }

        await db.timelineEvent.create({
          data: {
            tenantId,
            customerId: customer.id,
            type: 'meeting_scheduled',
            title: `Appointment Booked: ${serviceName}`,
            description: `${customerName} scheduled ${serviceName} on ${result.dateStr || date} at ${result.timeStr || time}.`,
            metadata: JSON.stringify({
              bookingId: result.booking?.id,
              meetingUrl: result.meetingUrl,
              price,
              currency,
              dateStr: result.dateStr,
              timeStr: result.timeStr,
            }),
          },
        });
      } catch (crmErr) {
        console.warn('[public-scheduling] CRM sync notice:', crmErr);
      }
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
      { error: 'Booking execution failed. Please try again or contact support.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
