/**
 * .ics Calendar Invite Generator
 *
 * Generates iCalendar (.ics) file content for booking confirmations.
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */

export interface IcsEventOptions {
  title: string;
  description?: string;
  startUtc: Date;
  endUtc: Date;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  uid: string; // unique identifier (e.g. booking ID)
}

/**
 * Generate a .ics file string for a calendar event.
 *
 * Usage:
 *   const ics = generateIcsEvent({...});
 *   // Send as email attachment with Content-Type: text/calendar
 *   // Or use as a download link: data:text/calendar;charset=utf8,${encodeURIComponent(ics)}
 */
export function generateIcsEvent(options: IcsEventOptions): string {
  const {
    title,
    description = '',
    startUtc,
    endUtc,
    location = '',
    organizerName = 'Fieseros',
    organizerEmail = '',
    attendeeName = '',
    attendeeEmail = '',
    uid,
  } = options;

  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const now = formatDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fieseros//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}@fieseros.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(startUtc)}`,
    `DTEND:${formatDate(endUtc)}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }

  if (organizerEmail) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:${organizerEmail}`);
  } else {
    lines.push(`ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:noreply@fieseros.com`);
  }

  if (attendeeEmail) {
    lines.push(`ATTENDEE;CN=${escapeIcsText(attendeeName || 'Customer')};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendeeEmail}`);
  }

  lines.push(
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Reminder: ${title}`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Reminder: ${title} in 1 hour`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.join('\r\n');
}

/**
 * Generate a Google Calendar "Add to Calendar" URL.
 * Opens Google Calendar with the event pre-filled.
 */
export function generateGoogleCalendarUrl(options: IcsEventOptions): string {
  const { title, description, startUtc, endUtc, location } = options;
  const dates = `${formatDateForGoogle(startUtc)}/${formatDateForGoogle(endUtc)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatDateForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
