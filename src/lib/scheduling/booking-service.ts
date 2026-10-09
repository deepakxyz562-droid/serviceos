import { syncOutlookBooking } from '@/lib/scheduling/outlook-calendar-sync';
/**
 * Unified Appointment Booking Service (Calendly Alternative Engine)
 *
 * Centralized booking pipeline used by:
 * - Form Submission Engine (/api/public/forms/[id]/submit)
 * - AI Chatbot Studio & Simulator
 * - Public AI Widget (/api/public/ai/agent-chat)
 * - Operations Calendar & Dispatch Console
 */

import { db } from '@/lib/db';
import { calculateAvailableSlots } from '@/lib/scheduling/slot-engine';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsCalendar,
} from '@/lib/scheduling/calendar-helper';
import { pushBookingToGoogleCalendar } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';

export interface CustomerInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface CreateBookingRequest {
  tenantId?: string | null;
  workspaceId?: string | null;
  formId?: string | null;
  agentId?: string | null;
  serviceId?: string | null;
  employeeId?: string | null;
  title?: string | null;
  serviceName?: string | null;
  date: string; // "YYYY-MM-DD" or ISO string
  time?: string | null; // e.g. "14:00" or "02:30 PM"
  durationMinutes?: number;
  timezone?: string;
  customer?: CustomerInput;
  notes?: string | null;
  source?: 'form' | 'website' | 'ai_chat_widget' | 'manual' | 'api' | 'scheduling_link';
  bypassAvailabilityCheck?: boolean;
}

export interface BookingResult {
  success: boolean;
  booking: any;
  lead?: any;
  availableSlotMatched?: boolean;
  meetingUrl?: string | null;
  calendarUrls: {
    google: string;
    outlook: string;
  };
  icsContent: string;
  scheduledAt: Date;
  scheduledEndTime: Date;
  dateStr: string;
  timeStr: string;
  timezone: string;
  error?: string;
}

/**
 * Normalizes date and time strings into valid JavaScript Date objects.
 */
export function resolveScheduledDateTimes(
  dateInput: string,
  timeInput?: string | null,
  durationMinutes = 30
): { scheduledAt: Date; scheduledEndTime: Date; dateStr: string; timeStr: string } {
  let scheduledAt: Date;

  if (dateInput.includes('T')) {
    // ISO string provided
    scheduledAt = new Date(dateInput);
  } else {
    // Separate date and time
    let hours = 10;
    let minutes = 0;

    if (timeInput) {
      const cleanTime = timeInput.trim().toUpperCase();
      const isPm = cleanTime.includes('PM');
      const isAm = cleanTime.includes('AM');
      const numMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);

      if (numMatch) {
        let h = parseInt(numMatch[1], 10);
        const m = parseInt(numMatch[2], 10);
        if (isPm && h < 12) h += 12;
        if (isAm && h === 12) h = 0;
        hours = h;
        minutes = m;
      } else {
        const singleHourMatch = cleanTime.match(/(\d{1,2})/);
        if (singleHourMatch) {
          let h = parseInt(singleHourMatch[1], 10);
          if (isPm && h < 12) h += 12;
          if (isAm && h === 12) h = 0;
          hours = h;
        }
      }
    }

    const [year, month, day] = dateInput.split('-').map(Number);
    if (year && month && day) {
      scheduledAt = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    } else {
      scheduledAt = new Date(dateInput);
      if (isNaN(scheduledAt.getTime())) {
        scheduledAt = new Date();
      }
    }
  }

  if (isNaN(scheduledAt.getTime())) {
    scheduledAt = new Date();
  }

  const scheduledEndTime = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
  const dateStr = scheduledAt.toISOString().split('T')[0];
  const timeStr = scheduledAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return { scheduledAt, scheduledEndTime, dateStr, timeStr };
}

/**
 * Creates an appointment booking across forms, chatbot, and operations.
 */
export async function createAppointmentBooking(
  params: CreateBookingRequest
): Promise<BookingResult> {
  const {
    tenantId: rawTenantId,
    workspaceId,
    formId,
    agentId,
    serviceId,
    employeeId,
    title,
    serviceName = 'Consultation',
    date,
    time,
    durationMinutes = 30,
    timezone = 'UTC',
    customer = {},
    notes = '',
    source = 'form',
    bypassAvailabilityCheck = false,
  } = params;

  // Resolve tenantId if missing or in preview
  let tenantId = rawTenantId && rawTenantId !== 'preview' ? rawTenantId : null;
  if (!tenantId) {
    try {
      const auth = await getAuthUser().catch(() => null);
      if (auth?.tenantId) {
        tenantId = auth.tenantId;
      }
    } catch {}
  }
  if (!tenantId) {
    throw new Error('A valid business workspace is required to book an appointment');
  }

  const { scheduledAt, scheduledEndTime, dateStr, timeStr } = resolveScheduledDateTimes(
    date,
    time,
    durationMinutes
  );

  let availableSlotMatched = true;

  // Optional Slot Engine validation
  if (tenantId && !bypassAvailabilityCheck) {
    try {
      const availability = await calculateAvailableSlots({
        tenantId,
        serviceId: serviceId || undefined,
        employeeId: employeeId || undefined,
        date: dateStr,
        timezone,
      });

      // If working day rules exist and no slots match, record flag but proceed with grace
      if (availability.slots.length > 0) {
        const slotMatches = availability.slots.some(
          (s) => new Date(s.startTime).getTime() === scheduledAt.getTime() && s.available
        );
        availableSlotMatched = slotMatches;
      }
    } catch (slotErr) {
      console.warn('[booking-service] Slot engine verification notice:', slotErr);
    }
  }

  const displayTitle = title || `${serviceName} - ${customer.name || customer.email || 'Scheduled Client'}`;

  // 1. Generate 1-Click Calendar Links
  const googleCalendarUrl = generateGoogleCalendarUrl({
    title: displayTitle,
    description: `Appointment scheduled via ${source.toUpperCase()}.\n\nClient: ${customer.name || 'Visitor'}\nEmail: ${customer.email || 'Not provided'}\nPhone: ${customer.phone || 'Not provided'}\nNotes: ${notes || 'None'}`,
    location: customer.address || 'Online Video Meeting',
    scheduledAt,
    scheduledEndTime,
  });

  const outlookCalendarUrl = generateOutlookCalendarUrl({
    title: displayTitle,
    description: `Appointment scheduled via ${source.toUpperCase()}.\n\nClient: ${customer.name || 'Visitor'}\nEmail: ${customer.email || 'Not provided'}\nPhone: ${customer.phone || 'Not provided'}\nNotes: ${notes || 'None'}`,
    location: customer.address || 'Online Video Meeting',
    scheduledAt,
    scheduledEndTime,
  });

  const icsContent = generateIcsCalendar({
    title: displayTitle,
    description: `Appointment scheduled via ${source.toUpperCase()}.\n\nNotes: ${notes || ''}`,
    location: customer.address || 'Online Video Meeting',
    scheduledAt,
    scheduledEndTime,
    attendeeName: customer.name || 'Client',
    attendeeEmail: customer.email || undefined,
  });

  // 2. Create or Update CRM Lead (Strict Deduplication on phone/email)
  let createdLead: any = null;
  if (customer.name || customer.email || customer.phone) {
    try {
      const existingLead = tenantId
        ? await db.lead.findFirst({
            where: {
              tenantId,
              OR: [
                ...(customer.phone ? [{ phone: customer.phone }] : []),
                ...(customer.email ? [{ email: customer.email }] : []),
              ],
            },
          })
        : null;

      if (existingLead) {
        createdLead = await db.lead.update({
          where: { id: existingLead.id },
          data: {
            name: customer.name && customer.name !== 'Valued Visitor' ? customer.name : existingLead.name,
            phone: customer.phone || existingLead.phone,
            email: customer.email || existingLead.email,
            address: customer.address || existingLead.address,
            description: `${existingLead.description || ''}\n[Appointment Scheduled: ${dateStr} at ${timeStr}]\nSource: ${source}\nNotes: ${notes || 'None'}`.trim(),
          },
        });
      } else {
        createdLead = await db.lead.create({
          data: {
            tenantId: tenantId || null,
            name: customer.name || 'Appointment Client',
            email: customer.email || '',
            phone: customer.phone || '',
            serviceType: serviceName,
            status: 'new',
            source: source === 'form' ? 'form_submission' : 'ai_chat_widget',
            description: `[Appointment Scheduled: ${dateStr} at ${timeStr}]\nSource: ${source}\nNotes: ${notes || 'None'}`.trim(),
          },
        });
      }
    } catch (leadErr) {
      console.warn('[booking-service] Lead record creation/update warning:', leadErr);
    }
  }

  // 3. Create Booking Record in Database (Prevent Double-Booking)
  if (tenantId || workspaceId) {
    const existingBooking = await db.booking.findFirst({
      where: {
        ...(tenantId ? { tenantId } : { workspaceId }),
        scheduledAt,
        OR: [
          ...(customer.email ? [{ customerEmail: customer.email }] : []),
          ...(customer.phone ? [{ customerPhone: customer.phone }] : []),
        ],
      },
    });

    if (existingBooking) {
      return {
        success: true,
        booking: existingBooking,
        lead: createdLead,
        availableSlotMatched: true,
        meetingUrl: JSON.parse(existingBooking.metadataJson || '{}').meetingUrl || null,
        calendarUrls: {
          google: googleCalendarUrl,
          outlook: outlookCalendarUrl,
        },
        icsContent,
        scheduledAt,
        scheduledEndTime,
        dateStr,
        timeStr,
        timezone,
      };
    }
  }

  const booking = await db.booking.create({
    data: {
      title: displayTitle,
      bookingType: source === 'form' ? 'instant' : 'ai_auto',
      status: 'confirmed',
      source,
      customerId: createdLead?.id || null,
      customerName: customer.name || null,
      customerEmail: customer.email || null,
      customerPhone: customer.phone || null,
      address: customer.address || null,
      employeeId: employeeId || null,
      serviceId: serviceId || null,
      scheduledAt,
      scheduledEndTime,
      duration: durationMinutes,
      notes: notes || `Booked via ${source}`,
      tenantId: tenantId || null,
      workspaceId: workspaceId || null,
      metadataJson: JSON.stringify({
        source,
        formId: formId || null,
        agentId: agentId || null,
        leadId: createdLead?.id || null,
        dateStr,
        timeStr,
        timezone,
        availableSlotMatched,
        calendar: {
          google: googleCalendarUrl,
          outlook: outlookCalendarUrl,
        },
      }),
    },
  });

  try { await syncOutlookBooking(booking.id, tenantId); }
  catch { await db.booking.update({ where: { id: booking.id }, data: { metadataJson: JSON.stringify({ ...JSON.parse(booking.metadataJson || '{}'), outlookSyncStatus: 'failed' }) } }); }

  // 4. Push Event to Google Calendar & Auto-Generate Google Meet link if connected
  let googleMeetUrl: string | null = null;
  if (tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarSyncEnabled: true },
      });
      if (tenant?.googleCalendarSyncEnabled) {
        const gcalResult = await pushBookingToGoogleCalendar(tenantId, {
          title: displayTitle,
          description: `Appointment with ${customer.name || 'Client'}\nEmail: ${customer.email || 'Not provided'}\nPhone: ${customer.phone || 'Not provided'}\nNotes: ${notes || ''}`,
          startTime: scheduledAt,
          endTime: scheduledEndTime,
          location: customer.address || undefined,
          customerName: customer.name || undefined,
          customerEmail: customer.email || undefined,
          generateMeetingLink: true,
        });

        if (gcalResult.meetingUrl) {
          googleMeetUrl = gcalResult.meetingUrl;
        }

        if (gcalResult.meetingUrl || gcalResult.eventId) {
          try {
            const currentMeta = JSON.parse(booking.metadataJson || '{}');
            currentMeta.meetingUrl = gcalResult.meetingUrl;
            currentMeta.googleCalendarEventId = gcalResult.eventId;
            await db.booking.update({
              where: { id: booking.id },
              data: { metadataJson: JSON.stringify(currentMeta) },
            });
          } catch {}
        }
      }
    } catch (gcalPushErr) {
      console.warn('[booking-service] Google Calendar push warning:', gcalPushErr);
    }
  }

  return {
    success: true,
    booking,
    lead: createdLead,
    availableSlotMatched,
    meetingUrl: googleMeetUrl,
    calendarUrls: {
      google: googleCalendarUrl,
      outlook: outlookCalendarUrl,
    },
    icsContent,
    scheduledAt,
    scheduledEndTime,
    dateStr,
    timeStr,
    timezone,
  };
}
