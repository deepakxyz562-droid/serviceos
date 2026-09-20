import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookAppointment } from '@/lib/scheduling/ai-tools';
import { generateIcsEvent } from '@/lib/scheduling/ics-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/availability/book
 *
 * Public booking endpoint — creates a booking from a selected slot.
 * Used by:
 *   1. The /book/[slug] public booking page
 *   2. AI agents (via bookAppointment() tool)
 *
 * Body:
 *   tenantId, serviceId, employeeId?, slotStartTime,
 *   customer: { name, phone, email?, notes? }
 *
 * Returns: { success, bookingId, bookingDetails, icsContent?, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, serviceId, employeeId, slotStartTime, customer } = body;

    if (!tenantId || !slotStartTime || !customer?.name || !customer?.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, slotStartTime, customer.name, customer.phone' },
        { status: 400 },
      );
    }

    // Use the AI tools booking function (same logic AI agents use)
    const result = await bookAppointment({
      tenantId,
      serviceId,
      employeeId,
      slotStartTime,
      customer,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, details: result.error },
        { status: 409 },
      );
    }

    // Also create the booking directly if the AI tool didn't (DB unavailable)
    // The AI tool handles this — but as a fallback, we try direct creation
    if (!result.bookingId) {
      try {
        const booking = await db.booking.create({
          data: {
            tenantId,
            serviceId: serviceId || undefined,
            employeeId: employeeId || undefined,
            title: result.bookingDetails?.serviceName || 'Appointment',
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email || undefined,
            scheduledAt: new Date(slotStartTime),
            scheduledEndTime: new Date(new Date(slotStartTime).getTime() + (result.bookingDetails?.duration || 30) * 60000),
            duration: result.bookingDetails?.duration || 30,
            notes: customer.notes || undefined,
            bookingType: 'instant',
            source: 'website',
            status: 'pending',
          },
        });

        // Generate .ics for this booking
        const ics = generateIcsEvent({
          title: booking.title,
          description: customer.notes || '',
          startUtc: booking.scheduledAt!,
          endUtc: booking.scheduledEndTime || new Date(booking.scheduledAt!.getTime() + 30 * 60000),
          attendeeName: customer.name,
          attendeeEmail: customer.email || '',
          uid: booking.id,
        });

        return NextResponse.json({
          success: true,
          bookingId: booking.id,
          bookingDetails: {
            serviceName: booking.title,
            scheduledAt: booking.scheduledAt!.toISOString(),
            duration: booking.duration,
            customerName: customer.name,
          },
          icsContent: ics,
          message: 'Booking confirmed successfully.',
        });
      } catch (dbError) {
        return NextResponse.json(
          { success: false, error: 'Failed to create booking', details: dbError instanceof Error ? dbError.message : 'Unknown' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[availability/book POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 },
    );
  }
}
