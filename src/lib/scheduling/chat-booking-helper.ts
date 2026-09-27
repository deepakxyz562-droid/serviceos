/**
 * Natural Language Booking Intent Detector & Executor
 *
 * Automatically parses date, time, customer name, email, and phone from chat messages
 * and executes createAppointmentBooking() into the database.
 */

import { createAppointmentBooking, BookingResult } from '@/lib/scheduling/booking-service';

export interface ExtractedBookingIntent {
  isBooking: boolean;
  dateStr?: string;
  timeStr?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Computes the YYYY-MM-DD string for the next occurrence of a given weekday.
 */
function getNextWeekdayDate(dayName: string): string {
  const targetDay = WEEKDAYS.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return new Date().toISOString().split('T')[0];

  const d = new Date();
  const currentDay = d.getDay();
  let daysToAdd = (targetDay - currentDay + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // next week if today
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

/**
 * Extracts booking parameters from current message and conversation history.
 */
export function extractBookingIntent(
  message: string,
  history: Array<{ role?: string; sender?: string; content?: string; text?: string }> = [],
  fallbackServiceName = 'Appointment Inquiry'
): ExtractedBookingIntent {
  const combinedText = [
    ...history.slice(-4).map((h) => h.content || h.text || ''),
    message,
  ].join(' ');

  const lower = message.toLowerCase();
  const lowerCombined = combinedText.toLowerCase();

  const bookingKeywords = [
    'book',
    'appointment',
    'schedule',
    'confirmation call',
    'meeting',
    'reserve',
    'slot',
    'consultation',
  ];

  const hasBookingKeyword = bookingKeywords.some((kw) => lower.includes(kw) || lowerCombined.includes(kw));

  // Time extraction: e.g. "2:00 PM", "2 PM", "14:00", "10:30am", "2pm"
  const timeRegex = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i;
  const timeMatch = combinedText.match(timeRegex);
  let timeStr: string | undefined = timeMatch ? timeMatch[1].toUpperCase() : undefined;

  // If "at 2" or "at 3" without AM/PM:
  if (!timeStr) {
    const atHourMatch = combinedText.match(/\bat\s+(\d{1,2})\b/i);
    if (atHourMatch) {
      const h = parseInt(atHourMatch[1], 10);
      timeStr = h < 8 || h === 12 ? `${h}:00 PM` : `${h}:00 AM`;
    }
  }

  // Date extraction
  let dateStr: string | undefined;
  if (lower.includes('tomorrow') || lowerCombined.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = tomorrow.toISOString().split('T')[0];
  } else if (lower.includes('today') || lowerCombined.includes('today')) {
    dateStr = new Date().toISOString().split('T')[0];
  } else {
    // Check weekdays: "on friday", "next monday", etc.
    for (const day of WEEKDAYS) {
      if (lower.includes(day) || lowerCombined.includes(day)) {
        dateStr = getNextWeekdayDate(day);
        break;
      }
    }
  }

  // YYYY-MM-DD or MM/DD/YYYY regex
  if (!dateStr) {
    const isoDateMatch = combinedText.match(/\b(202\d-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      dateStr = isoDateMatch[1];
    } else {
      const slashDateMatch = combinedText.match(/\b(\d{1,2})\/(\d{1,2})\/(202\d|\d{2})\b/);
      if (slashDateMatch) {
        const m = slashDateMatch[1].padStart(2, '0');
        const d = slashDateMatch[2].padStart(2, '0');
        const y = slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3];
        dateStr = `${y}-${m}-${d}`;
      }
    }
  }

  // Email extraction
  const emailMatch = combinedText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const customerEmail = emailMatch ? emailMatch[1] : undefined;

  // Phone extraction
  const phoneMatch = combinedText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const customerPhone = phoneMatch ? phoneMatch[0] : undefined;

  // Name extraction: e.g. "my name is Deepak", "I'm Deepak", "Deepak here", or capitalized name after "for [Name]"
  let customerName: string | undefined;
  const namePatterns = [
    /(?:my name is|i am|i'm|name:)\s+([A-Za-z]{2,20})/i,
    /(?:for|with)\s+([A-Z][a-z]{2,20})(?:\s+at|\s+tomorrow|\s+on|$)/,
  ];

  for (const pat of namePatterns) {
    const match = combinedText.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['Tomorrow', 'Today', 'Monday', 'Friday', 'Saturday', 'Sunday', 'Call', 'Confirmation', 'Appointment'];
      if (!forbidden.includes(candidate)) {
        customerName = candidate;
        break;
      }
    }
  }

  // Fallback: If message ends with single name or starts with "Deepak,"
  if (!customerName) {
    const singleNameMatch = message.match(/\b([A-Z][a-z]{2,15})\b/);
    if (singleNameMatch) {
      const candidate = singleNameMatch[1];
      const forbidden = ['Book', 'Booking', 'Schedule', 'Tomorrow', 'Today', 'Hello', 'Hi', 'Please', 'Thanks', 'Yes'];
      if (!forbidden.includes(candidate)) {
        customerName = candidate;
      }
    }
  }

  const isBooking = hasBookingKeyword && (Boolean(dateStr) || Boolean(timeStr));

  return {
    isBooking,
    dateStr: dateStr || new Date().toISOString().split('T')[0],
    timeStr: timeStr || '02:00 PM',
    customerName: customerName || 'Valued Visitor',
    customerEmail,
    customerPhone,
    serviceName: fallbackServiceName,
  };
}

/**
 * Attempts to parse and execute a real booking from chat context.
 */
export async function tryExecuteChatBooking(params: {
  tenantId?: string | null;
  workspaceId?: string | null;
  formId?: string | null;
  agentId?: string | null;
  serviceName?: string;
  message: string;
  history?: Array<{ role?: string; sender?: string; content?: string; text?: string }>;
}): Promise<BookingResult | null> {
  const intent = extractBookingIntent(params.message, params.history, params.serviceName);

  if (!intent.isBooking) {
    return null;
  }

  try {
    const result = await createAppointmentBooking({
      tenantId: params.tenantId || null,
      workspaceId: params.workspaceId || null,
      formId: params.formId || null,
      agentId: params.agentId || null,
      serviceName: intent.serviceName || params.serviceName || 'Consultation & Appointment',
      date: intent.dateStr!,
      time: intent.timeStr || '02:00 PM',
      durationMinutes: 30,
      customer: {
        name: intent.customerName,
        email: intent.customerEmail || '',
        phone: intent.customerPhone || '',
      },
      notes: `[Booked via AI Chat Session]\nVisitor: ${intent.customerName}\nOriginal message: "${params.message}"`,
      source: 'ai_chat_widget',
      bypassAvailabilityCheck: true,
    });

    return result;
  } catch (err) {
    console.error('[chat-booking-helper] Failed to create booking:', err);
    return null;
  }
}
