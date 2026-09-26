/**
 * Calendar & Appointment Helper for Fieseros Native Appointment Engine.
 *
 * Implements:
 * 1. Form submission appointment data extraction (scheduledAt, scheduledEndTime, duration)
 * 2. Standard RFC 5545 .ics iCalendar generation
 * 3. 1-Click web calendar links (Google Calendar, Outlook)
 */

export interface ParsedAppointment {
  found: boolean;
  dateStr?: string;
  rawSlot?: string;
  timezone?: string;
  scheduledAt?: Date;
  scheduledEndTime?: Date;
  durationMinutes?: number;
  fieldKey?: string;
  notes?: string;
}

/**
 * Parses appointment data from form submission payload.
 */
export function parseAppointmentFromSubmission(
  submissionData: Record<string, unknown>,
  schema?: any
): ParsedAppointment {
  if (!submissionData || typeof submissionData !== 'object') {
    return { found: false };
  }

  // 1. Check if schema explicitly identifies appointment fields
  let appointmentKey: string | undefined;
  if (schema && Array.isArray(schema.fields)) {
    const aptField = schema.fields.find((f: any) => f?.type === 'appointment');
    if (aptField && (aptField.id in submissionData || aptField.name in submissionData)) {
      appointmentKey = aptField.id in submissionData ? aptField.id : aptField.name;
    }
  }

  // 2. If not found by schema, scan keys for appointment object shape
  let rawVal: any = appointmentKey ? submissionData[appointmentKey] : undefined;

  if (!rawVal) {
    for (const [key, val] of Object.entries(submissionData)) {
      if (val && typeof val === 'object') {
        const obj = val as Record<string, any>;
        if (('date' in obj && 'slot' in obj) || ('date' in obj && 'time' in obj)) {
          appointmentKey = key;
          rawVal = val;
          break;
        }
      } else if (typeof val === 'string' && val.trim().startsWith('{') && val.includes('"date"')) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object' && ('date' in parsed && ('slot' in parsed || 'time' in parsed))) {
            appointmentKey = key;
            rawVal = parsed;
            break;
          }
        } catch {
          // not an appointment JSON string
        }
      }
    }
  }

  if (!rawVal || typeof rawVal !== 'object') {
    return { found: false };
  }

  const dateStr: string = String(rawVal.date || '').trim();
  const slotStr: string = String(rawVal.slot || rawVal.time || '').trim();
  const timezone: string = String(rawVal.timezone || 'UTC').trim();

  if (!dateStr || !slotStr) {
    return { found: false };
  }

  // Parse slot start and end times
  // Formats supported: "10:00 - 10:30", "10:00 AM - 10:30 AM", "14:00", "2:00 PM"
  let startHour = 9;
  let startMinute = 0;
  let durationMinutes = 30;

  try {
    const parts = slotStr.split(/[-–—]/).map((s) => s.trim());
    const startPart = parts[0];

    // Helper to parse "10:00 AM" or "14:30"
    const parseTimePart = (t: string) => {
      const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === 'PM' && h < 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        return { h, m };
      }
      return null;
    };

    const parsedStart = parseTimePart(startPart);
    if (parsedStart) {
      startHour = parsedStart.h;
      startMinute = parsedStart.m;
    }

    if (parts.length > 1) {
      const parsedEnd = parseTimePart(parts[1]);
      if (parsedEnd && parsedStart) {
        const diff = (parsedEnd.h * 60 + parsedEnd.m) - (parsedStart.h * 60 + parsedStart.m);
        if (diff > 0) durationMinutes = diff;
      }
    }
  } catch {
    // Default to 30 mins
    durationMinutes = 30;
  }

  // Construct Dates
  const scheduledAt = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);
  const scheduledEndTime = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

  return {
    found: true,
    dateStr,
    rawSlot: slotStr,
    timezone,
    scheduledAt,
    scheduledEndTime,
    durationMinutes,
    fieldKey: appointmentKey,
    notes: `Selected Slot: ${dateStr} from ${slotStr} (${timezone})`,
  };
}

/**
 * Format date for iCalendar standard (e.g. 20261005T143000Z)
 */
function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content.
 */
export function generateIcsCalendar(params: {
  title: string;
  description?: string;
  location?: string;
  scheduledAt: Date;
  scheduledEndTime: Date;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  uid?: string;
}): string {
  const {
    title,
    description = '',
    location = 'Online / Video Call',
    scheduledAt,
    scheduledEndTime,
    organizerName = 'Fieseros Appointments',
    organizerEmail = 'appointments@fieseros.com',
    attendeeName = 'Client',
    attendeeEmail,
    uid = `fieseros-apt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@fieseros.com`,
  } = params;

  const nowIcs = toIcsDate(new Date());
  const startIcs = toIcsDate(scheduledAt);
  const endIcs = toIcsDate(scheduledEndTime);

  // Sanitize fields for ICS
  const cleanSummary = title.replace(/\n/g, ' ');
  const cleanDesc = description.replace(/\n/g, '\\n');
  const cleanLocation = location.replace(/\n/g, ' ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fieseros//Native Appointment Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowIcs}`,
    `DTSTART:${startIcs}`,
    `DTEND:${endIcs}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${cleanLocation}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
  ];

  if (attendeeEmail) {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${attendeeName}:mailto:${attendeeEmail}`);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT15M');
  lines.push('ACTION:DISPLAY');
  lines.push(`DESCRIPTION:Reminder: ${cleanSummary}`);
  lines.push('END:VALARM');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generates direct web link for 1-click Google Calendar add.
 */
export function generateGoogleCalendarUrl(params: {
  title: string;
  description?: string;
  location?: string;
  scheduledAt: Date;
  scheduledEndTime: Date;
}): string {
  const { title, description = '', location = 'Online', scheduledAt, scheduledEndTime } = params;
  const startStr = toIcsDate(scheduledAt);
  const endStr = toIcsDate(scheduledEndTime);

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/**
 * Generates direct web link for 1-click Outlook Live / Office 365 Calendar add.
 */
export function generateOutlookCalendarUrl(params: {
  title: string;
  description?: string;
  location?: string;
  scheduledAt: Date;
  scheduledEndTime: Date;
}): string {
  const { title, description = '', location = 'Online', scheduledAt, scheduledEndTime } = params;

  const query = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: scheduledAt.toISOString(),
    enddt: scheduledEndTime.toISOString(),
    body: description,
    location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${query.toString()}`;
}
