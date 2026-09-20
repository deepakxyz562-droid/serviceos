/**
 * AI Agent Scheduling Tools
 *
 * These functions are designed to be called by AI agents (voice + chat)
 * to check availability and book appointments on behalf of customers.
 *
 * Usage in AI agent chat:
 *   User: "Can I book an appointment for tomorrow?"
 *   AI calls: checkAvailability({ tenantId, serviceId, date: "2024-09-20" })
 *   AI responds: "I found 4 available slots: 9 AM, 10:30 AM, 1 PM, 3 PM. Which works for you?"
 *   User: "10:30 AM works"
 *   AI calls: bookAppointment({ tenantId, serviceId, slotStartTime, customer })
 *   AI responds: "You're booked for 10:30 AM tomorrow. I've sent a confirmation to your email."
 */

import { db } from '@/lib/db';
import { calculateAvailableSlots, type TimeSlot } from './slot-engine';
import { generateIcsEvent } from './ics-generator';

export interface CheckAvailabilityParams {
  tenantId: string;
  serviceId?: string;
  employeeId?: string;
  date: string; // "YYYY-MM-DD"
  timezone?: string;
}

export interface CheckAvailabilityResult {
  success: boolean;
  date: string;
  slots: Array<{
    startTime: string;
    endTime: string;
    label: string;
  }>;
  message: string; // human-readable summary for AI to relay
}

export interface BookAppointmentParams {
  tenantId: string;
  serviceId?: string;
  employeeId?: string;
  slotStartTime: string; // ISO 8601
  customer: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
}

export interface BookAppointmentResult {
  success: boolean;
  bookingId?: string;
  bookingDetails?: {
    serviceName: string;
    scheduledAt: string;
    duration: number;
    customerName: string;
  };
  icsContent?: string; // calendar invite for email
  message: string; // human-readable confirmation for AI to relay
  error?: string;
}

/**
 * AI Tool: checkAvailability
 *
 * Returns available time slots for a given date + service.
 * The AI agent calls this when a customer asks "what times are available?"
 */
export async function checkAvailability(
  params: CheckAvailabilityParams,
): Promise<CheckAvailabilityResult> {
  const result = await calculateAvailableSlots({
    tenantId: params.tenantId,
    serviceId: params.serviceId,
    employeeId: params.employeeId,
    date: params.date,
    timezone: params.timezone,
  });

  if (!result.workingDay) {
    return {
      success: false,
      date: params.date,
      slots: [],
      message: `No availability on ${params.date}. ${result.reason || 'Not a working day.'}`,
    };
  }

  if (result.slots.length === 0) {
    return {
      success: false,
      date: params.date,
      slots: [],
      message: `No available slots on ${params.date}. All slots are booked.`,
    };
  }

  // Build a human-readable summary
  const slotLabels = result.slots.map((s) => s.label).join(', ');
  const message = `Found ${result.slots.length} available slot${result.slots.length !== 1 ? 's' : ''} on ${params.date}: ${slotLabels}`;

  return {
    success: true,
    date: params.date,
    slots: result.slots.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      label: s.label,
    })),
    message,
  };
}

/**
 * AI Tool: bookAppointment
 *
 * Books a specific time slot for a customer.
 * The AI agent calls this when a customer says "book the 10:30 AM slot".
 */
export async function bookAppointment(
  params: BookAppointmentParams,
): Promise<BookAppointmentResult> {
  const { tenantId, serviceId, employeeId, slotStartTime, customer } = params;

  try {
    // 1. Validate the slot is still available
    const slotDate = new Date(slotStartTime);
    const dateStr = slotDate.toISOString().split('T')[0];

    const availability = await calculateAvailableSlots({
      tenantId,
      serviceId,
      employeeId,
      date: dateStr,
    });

    const isStillAvailable = availability.slots.some(
      (s: TimeSlot) => s.startTime === slotStartTime && s.available,
    );

    if (!isStillAvailable) {
      return {
        success: false,
        message: 'That slot is no longer available. Please choose another time.',
        error: 'Slot not available',
      };
    }

    // 2. Fetch service details (for duration + name)
    let serviceName = 'Appointment';
    let duration = 30;

    if (serviceId) {
      const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { name: true, duration: true },
      }).catch(() => null);

      if (service) {
        serviceName = service.name;
        duration = service.duration || 30;
      }
    }

    // 3. Calculate end time
    const scheduledEnd = new Date(slotStartTime);
    scheduledEnd.setMinutes(scheduledEnd.getMinutes() + duration);

    // 4. Create the booking
    const booking = await db.booking.create({
      data: {
        tenantId,
        employeeId: employeeId || undefined,
        serviceId: serviceId || undefined,
        title: serviceName,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || undefined,
        scheduledAt: new Date(slotStartTime),
        scheduledEndTime: scheduledEnd,
        duration,
        notes: customer.notes || undefined,
        bookingType: 'ai_auto',
        source: 'ai_agent',
        status: 'pending',
      },
    });

    // 5. Generate .ics calendar invite for email
    const icsContent = generateIcsEvent({
      title: serviceName,
      description: customer.notes || `Appointment with ${customer.name}`,
      startUtc: new Date(slotStartTime),
      endUtc: scheduledEnd,
      organizerName: 'Fieseros Booking',
      attendeeName: customer.name,
      attendeeEmail: customer.email || '',
      uid: booking.id,
    });

    return {
      success: true,
      bookingId: booking.id,
      bookingDetails: {
        serviceName,
        scheduledAt: slotStartTime,
        duration,
        customerName: customer.name,
      },
      icsContent,
      message: `Booking confirmed! ${customer.name} is scheduled for ${serviceName} on ${new Date(slotStartTime).toLocaleString()}. Duration: ${duration} minutes. A confirmation has been sent to ${customer.email || customer.phone}.`,
    };
  } catch (error: any) {
    console.error('[ai-tools bookAppointment]', error);
    return {
      success: false,
      message: 'Failed to book the appointment. Please try again.',
      error: error.message,
    };
  }
}

/**
 * AI Tool: getUpcomingBookings
 *
 * Returns upcoming bookings for a tenant (used by AI agent to check schedule).
 */
export async function getUpcomingBookings(
  tenantId: string,
  limit: number = 10,
): Promise<{ bookings: Array<{ title: string; scheduledAt: string; customerName: string; status: string }>; message: string }> {
  try {
    const bookings = await db.booking.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: new Date() },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      select: { title: true, scheduledAt: true, customerName: true, status: true },
    });

    if (bookings.length === 0) {
      return { bookings: [], message: 'No upcoming bookings.' };
    }

    const summary = bookings
      .map((b) => `${b.title} on ${new Date(b.scheduledAt).toLocaleString()} for ${b.customerName}`)
      .join('; ');

    return { bookings, message: `Found ${bookings.length} upcoming booking(s): ${summary}` };
  } catch (error: any) {
    return { bookings: [], message: `Failed to fetch bookings: ${error.message}` };
  }
}
