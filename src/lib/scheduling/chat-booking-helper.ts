/**
 * Natural Language Booking & Intake Intent Detector & Executor
 *
 * Automatically parses date, time, customer name, email, phone, property address,
 * urgency score, and conversation summaries from chat messages, and executes:
 * 1. createAppointmentBooking() into the database when booking criteria is met.
 * 2. Structured Lead Capture and qualification into the CRM database.
 *
 * FIX (2026-09-30): Prevents false-positive booking execution caused by:
 *   - Substring collisions: "website" was matching "visit", "services" was matching "service"
 *   - History bleed: stale date/time from prior turns was triggering auto-booking
 *     on completely unrelated questions like "jobs", "services", "your website"
 *   - No informational query guard: questions about pricing, hours, location, website
 *     must NEVER auto-execute a booking regardless of history context
 */

import { db } from '@/lib/db';
import { createAppointmentBooking, BookingResult } from '@/lib/scheduling/booking-service';
import { getLocalDateParts } from '@/lib/locale-timezone';

export interface ExtractedBookingIntent {
  hasIntent: boolean;
  isBookingReady: boolean;
  isEmergency: boolean;
  urgency: 'emergency' | 'high' | 'normal' | 'flexible';
  dateStr?: string;
  timeStr?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  serviceName?: string;
  missingFields: string[];
  executiveSummary: string;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const HINDI_WEEKDAY_MAP: Record<string, string> = {
  ravivar: 'sunday',
  itvar: 'sunday',
  somvar: 'monday',
  somwar: 'monday',
  mangalvar: 'tuesday',
  mangalwar: 'tuesday',
  budhvar: 'wednesday',
  budhwar: 'wednesday',
  guruvar: 'thursday',
  veervar: 'thursday',
  shukravar: 'friday',
  shukrawar: 'friday',
  shanivar: 'saturday',
  shaniwar: 'saturday',
};

function getDateStrWithOffset(daysOffset: number, timeZone?: string | null): string {
  if (timeZone) {
    const parts = getLocalDateParts(new Date(), timeZone);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysOffset))
      .toISOString()
      .split('T')[0];
  }
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Computes the YYYY-MM-DD string for the next occurrence of a given weekday.
 */
function getNextWeekdayDate(dayName: string, timeZone?: string | null): string {
  const targetDay = WEEKDAYS.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return getDateStrWithOffset(0, timeZone);

  if (timeZone) {
    const parts = getLocalDateParts(new Date(), timeZone);
    const localMidnight = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const currentDay = localMidnight.getUTCDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd))
      .toISOString()
      .split('T')[0];
  }

  const d = new Date();
  const currentDay = d.getDay();
  let daysToAdd = (targetDay - currentDay + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // next week if today
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

function parseHinglishOrStandardTime(text: string, allowBareAtHour: boolean): string | undefined {
  const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
  if (timeMatch) {
    return timeMatch[1].toUpperCase();
  }

  // Hinglish: "subah 10 baje", "11 baje", "shaam 5:30 baje"
  const bajeMatch = text.match(
    /(?:(subah|morning|dopahar|afternoon|shaam|sham|evening|raat|night)\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(?:baje|bj)\b(?:\s+(subah|morning|dopahar|afternoon|shaam|sham|evening|raat|night))?/i,
  );
  if (bajeMatch) {
    const period = (bajeMatch[1] || bajeMatch[4] || '').toLowerCase();
    const h = parseInt(bajeMatch[2], 10);
    const m = bajeMatch[3] || '00';
    if (h >= 1 && h <= 12) {
      if (period === 'subah' || period === 'morning') {
        return `${h}:${m} ${h === 12 ? 'PM' : 'AM'}`;
      }
      if (['dopahar', 'afternoon', 'shaam', 'sham', 'evening', 'raat', 'night'].includes(period)) {
        return `${h}:${m} PM`;
      }
      return h < 8 || h === 12 ? `${h}:${m} PM` : `${h}:${m} AM`;
    }
  }

  if (allowBareAtHour) {
    const atHourMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
    if (atHourMatch) {
      const h = parseInt(atHourMatch[1], 10);
      const m = atHourMatch[2] || '00';
      if (h >= 1 && h <= 12) {
        return h < 8 || h === 12 ? `${h}:${m} PM` : `${h}:${m} AM`;
      }
    }
  }

  return undefined;
}

function parseDateFromChatText(text: string, timeZone?: string | null): string | undefined {
  const lower = text.toLowerCase();

  if (/\b(?:day\s+after\s+tomorrow|parso|parson)\b/i.test(lower)) {
    return getDateStrWithOffset(2, timeZone);
  }
  if (/\b(?:tomorrow|kal)\b/i.test(lower)) {
    return getDateStrWithOffset(1, timeZone);
  }
  if (/\b(?:today|aaj)\b/i.test(lower)) {
    return getDateStrWithOffset(0, timeZone);
  }

  for (const day of WEEKDAYS) {
    if (new RegExp(`\\b${day}\\b`, 'i').test(lower)) {
      return getNextWeekdayDate(day, timeZone);
    }
  }

  for (const [hindiDay, engDay] of Object.entries(HINDI_WEEKDAY_MAP)) {
    if (new RegExp(`\\b${hindiDay}\\b`, 'i').test(lower)) {
      return getNextWeekdayDate(engDay, timeZone);
    }
  }

  const isoDateMatch = text.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const slashDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(202\d|\d{2})\b/);
  if (slashDateMatch) {
    const p1 = parseInt(slashDateMatch[1], 10);
    const p2 = parseInt(slashDateMatch[2], 10);
    const y = slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3];
    // Handle DD/MM/YYYY when first component > 12 (e.g. 25/11/2026)
    const month = p1 > 12 && p2 <= 12 ? String(p2).padStart(2, '0') : String(p1).padStart(2, '0');
    const day = p1 > 12 && p2 <= 12 ? String(p1).padStart(2, '0') : String(p2).padStart(2, '0');
    return `${y}-${month}-${day}`;
  }

  return undefined;
}

/**
 * Extracts booking & intake parameters from message and history.
 *
 * IMPORTANT DESIGN RULES:
 *  1. Booking INTENT is only detected from the CURRENT message — history is used
 *     for urgency/context enrichment, never as the trigger for auto-booking.
 *  2. Keyword matching uses whole-word regex patterns, NOT .includes(), to prevent
 *     substring collisions (e.g. "website" must NOT match "visit").
 *  3. Informational queries (website, services, jobs, pricing, hours, location, etc.)
 *     block booking execution even if a booking keyword is present elsewhere.
 *  4. Date/time from history only carries forward if the CURRENT message has explicit
 *     booking intent — preventing stale date/time from prior turns triggering a booking.
 */
export function extractBookingIntent(
  message: string,
  history: Array<{ role?: string; sender?: string; senderType?: string; content?: string; text?: string }> = [],
  fallbackServiceName = 'Appointment Inquiry',
  defaults?: {
    customerPhone?: string | null;
    customerName?: string | null;
    timezone?: string | null;
  },
): ExtractedBookingIntent {
  // combinedText: USER-AUTHORED messages only — NOT the AI's responses.
  // Previously included ALL history (including the AI's responses), which
  // leaked dates/times from the AI's FAQ answers into the booking intent
  // extraction. E.g. the AI says "Monday through Friday 8:00 AM to 6:00 PM"
  // → the booking helper extracted "Monday" as the requested date and
  // "8:00 AM" as the requested time, then auto-booked an appointment.
  const userHistory = history
    .slice(-5)
    .filter((h) => h.role === 'user' || h.sender === 'user' || h.senderType === 'visitor')
    .map((h) => h.content || h.text || '');
  const combinedText = [...userHistory, message].join(' ');

  const lower = message.toLowerCase();
  const lowerCombined = combinedText.toLowerCase();

  // 1. Urgency Classification (history is safe to use for this — urgency context)
  let urgency: 'emergency' | 'high' | 'normal' | 'flexible' = 'normal';
  const emergencyKeywords = ['leak', 'flooding', 'flooded', 'burst', 'sparks', 'no heat', 'freezing', 'emergency', 'urgent', 'overflow', 'broken pipe', 'shingle blown'];
  const highKeywords = ['asap', 'today', 'tomorrow morning', 'right away', 'immediately', 'soon as possible'];
  const flexibleKeywords = ['quote', 'estimate', 'gathering', 'sometime', 'planning', 'curious'];

  if (emergencyKeywords.some((kw) => lowerCombined.includes(kw))) {
    urgency = 'emergency';
  } else if (highKeywords.some((kw) => lowerCombined.includes(kw))) {
    urgency = 'high';
  } else if (flexibleKeywords.some((kw) => lowerCombined.includes(kw))) {
    urgency = 'flexible';
  }

  // 2. Booking Intent Detection
  //
  //    RULE: Use WHOLE-WORD regex patterns, NOT .includes() substring matching.
  //    This prevents false positives like:
  //      - "website" ⊃ "visit"  → was triggering booking intent
  //      - "services" ⊃ "service" + history → was triggering booking
  //      - "jobs" → was bleeding stale history date/time
  //
  //    Intent ONLY fires on the CURRENT message, not on history.
  const bookingKeywordPatterns = [
    /\bbook\b/,
    /\bbooking\b/,
    /\bappointment\b/,
    /\bschedule\b/,
    /\bconfirmation\s+call\b/,
    /\bmeeting\b/,
    /\breserve\b/,
    /\bslot\b/,
    /\bsite\s+visit\b/,        // "site visit" only — NOT bare "visit" (prevents "website" collision)
    /\bhouse\s+visit\b/,
    /\bon-?site\s+visit\b/,
    /\bconsultation\b/,
    /\bcome\s+over\b/,
    /\bdispatch\b/,
    // Hinglish / Hindi conversational booking intent
    /\b(?:book\s*kar|book\s*karo|book\s*kard[eo]|kar\s*do|milna\s*hai|aana\s*hai|chahiye|checkup|check-?up|trial|timings?|baje)\b/i,
  ];

  // Explicit user confirmation phrases (user is explicitly confirming a prior booking offer)
  const confirmationPatterns = [
    /\byes\s+(please|book|confirm|schedule|go\s+ahead|do\s+it|that\s+works?)\b/i,
    /\bconfirm\s+(my|the|this)?\s*(booking|appointment|slot|schedule)\b/i,
    /\bgo\s+ahead\s+(and\s+)?(book|schedule|confirm)\b/i,
    /\bbook\s+(me|it|that|us)\b/i,
    /\byes,?\s*(please|book|schedule|confirm)\b/i,
    /\b(?:haan|ha|hanji|ji)\s*(?:please|book|confirm|theek\s*hai|chalega|done|kar\s*do|kardo)\b/i,
  ];

  // Informational queries that MUST NOT trigger booking execution under any circumstances.
  // These represent questions about the business, not requests to book.
  const informationalPatterns = [
    /\b(website|web\s*site|your\s+site|your\s+url|site\s+url)\b/i,
    /\b(services?|what\s+do\s+you\s+(do|offer)|offerings?)\b/i,
    /\b(jobs?|careers?|hiring|employ|open\s+positions?)\b/i,
    /\b(how\s+much|what\s+(does\s+it\s+)?cost|rates?|fees?|pricing)\b/i,
    /\b(hours?|open\s+today|when\s+(do\s+you\s+)?open|are\s+you\s+open|closed)\b/i,
    /\b(phone\s+number|your\s+number|how\s+do\s+i\s+contact|contact\s+info)\b/i,
    /\b(where\s+are\s+you\s+located|your\s+address|directions?|location)\b/i,
    /\b(who\s+are\s+you|tell\s+me\s+about|what\s+is\s+your|about\s+your)\b/i,
  ];

  const hasIntentInCurrentMessage =
    bookingKeywordPatterns.some((re) => re.test(lower)) ||
    confirmationPatterns.some((re) => re.test(lower));

  const isInformationalQuery = informationalPatterns.some((re) => re.test(lower));

  // Final intent: requires booking keyword in CURRENT message AND not an informational query
  const hasIntent = hasIntentInCurrentMessage && !isInformationalQuery;

  // 3. Time extraction (supports standard AM/PM + Hinglish "baje")
  const timeMatchCurrent = parseHinglishOrStandardTime(message, true);
  const timeMatchCombined = parseHinglishOrStandardTime(combinedText, false);
  const timeStr: string | undefined = timeMatchCurrent
    ? timeMatchCurrent
    : (hasIntent ? timeMatchCombined : undefined);

  // 4. Date extraction (supports EN + Hinglish "kal"/"aaj"/"parso" & Hindi weekdays in tenant TZ)
  let dateStr: string | undefined = parseDateFromChatText(message, defaults?.timezone);
  if (!dateStr && hasIntent) {
    dateStr = parseDateFromChatText(combinedText, defaults?.timezone);
  }

  // 5. Email extraction
  const emailMatch = combinedText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const customerEmail = emailMatch ? emailMatch[1] : undefined;

  // 6. Phone extraction (falls back to channel caller phone e.g. WhatsApp `from`)
  const phoneMatch = combinedText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const defaultPhone = defaults?.customerPhone?.trim();
  const customerPhone = phoneMatch ? phoneMatch[0] : (defaultPhone || undefined);

  // 7. Address extraction
  let customerAddress: string | undefined;
  const addressMatch = combinedText.match(/(?:at|address(?: is)?|located at|property at)\s+([0-9]+\s+[A-Za-z0-9\s,.-]+?)(?:\.|\\n|tomorrow|at|my|$)/i);
  if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 5) {
    customerAddress = addressMatch[1].trim();
  }

  // 8. Name extraction — CURRENT MESSAGE ONLY (not combinedText)
  let customerName: string | undefined;
  const namePatterns = [
    /(?:my name is|name:|mera naam)\s+([a-zA-Z]{2,20})/i,
    /(?:i am|i'm)\s+([a-zA-Z]{2,20})\b/i,
  ];

  for (const pat of namePatterns) {
    const match = message.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['tomorrow', 'today', 'kal', 'aaj', 'parso', 'monday', 'friday', 'saturday',
        'sunday', 'call', 'confirmation', 'appointment', 'emergency',
        'your', 'our', 'the', 'this', 'that', 'here', 'there',
        'welcome', 'hello', 'hi', 'glad', 'happy', 'sorry', 'ready'];
      if (!forbidden.includes(candidate.toLowerCase())) {
        customerName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  if (!customerName && defaults?.customerName?.trim()) {
    const fallbackName = defaults.customerName.trim();
    if (!['unknown', 'visitor', 'customer'].includes(fallbackName.toLowerCase())) {
      customerName = fallbackName;
    }
  }

  // Missing fields for complete booking execution
  const missingFields: string[] = [];
  if (!dateStr) missingFields.push('date');
  if (!timeStr) missingFields.push('time');
  if (!customerPhone && !customerEmail) missingFields.push('contact_info');

  // Booking is "ready to execute" ONLY when ALL of the following are true:
  //   ✓ Current message has explicit booking intent (not informational)
  //   ✓ Date AND time are present
  //   ✓ Contact info (phone or email) is available
  const isBookingReady =
    hasIntent &&
    Boolean(dateStr) &&
    Boolean(timeStr) &&
    (Boolean(customerPhone) || Boolean(customerEmail));

  // Executive Summary of Customer Needs
  let executiveSummary = 'Customer initiated contact via AI Intake.';
  if (urgency === 'emergency') {
    executiveSummary = `🚨 URGENT: Customer reported active emergency needing rapid dispatch.`;
  } else if (hasIntent && dateStr) {
    executiveSummary = `Customer requested service appointment for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`;
  } else if (customerPhone) {
    executiveSummary = `Customer requested callback/quote at ${customerPhone}.`;
  }

  return {
    hasIntent,
    isBookingReady,
    isEmergency: urgency === 'emergency',
    urgency,
    dateStr,
    timeStr,
    customerName: customerName || 'Valued Visitor',
    customerEmail,
    customerPhone,
    customerAddress,
    serviceName: fallbackServiceName,
    missingFields,
    executiveSummary,
  };
}

/**
 * Captures or updates a Lead record in the CRM from conversation details.
 */
export async function tryCaptureChatLead(params: {
  tenantId?: string | null;
  workspaceId?: string | null;
  agentId?: string | null;
  formId?: string | null;
  intent: ExtractedBookingIntent;
  message: string;
  imageUrl?: string;
}) {
  const { tenantId, workspaceId, intent, imageUrl, formId } = params;
  if (!intent.customerPhone && !intent.customerEmail) {
    return null;
  }

  try {
    const rawPhone = intent.customerPhone?.trim() || '';
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const last10Phone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : '';
    const existing = tenantId
      ? await db.lead.findFirst({
          where: {
            tenantId,
            OR: [
              ...(rawPhone ? [{ phone: rawPhone }] : []),
              ...(phoneDigits ? [{ phone: phoneDigits }, { phone: `+${phoneDigits}` }] : []),
              ...(last10Phone ? [{ phone: { endsWith: last10Phone } }] : []),
              ...(intent.customerEmail ? [{ email: intent.customerEmail }] : []),
            ],
          },
        })
      : null;

    const priority = intent.isEmergency ? 'urgent' : intent.hasIntent ? 'high' : 'medium';
    const tag = intent.isEmergency ? 'emergency_intake' : 'ai_intake_lead';
    const photoNote = imageUrl ? `\n[Customer Uploaded Photo]: ${imageUrl}` : '';

    // Record submission into FormResponse so standalone GPTForm users see it in their Submissions tab
    if (formId) {
      await db.formResponse.create({
        data: {
          formId,
          workspaceId: workspaceId || null,
          tenantId: tenantId || null,
          respondent: intent.customerEmail || intent.customerPhone || 'Chat Visitor',
          respondentName: intent.customerName !== 'Valued Visitor' ? intent.customerName : null,
          source: 'ai_chat_widget',
          dataJson: JSON.stringify({
            f_name: intent.customerName !== 'Valued Visitor' ? intent.customerName : undefined,
            f_phone: intent.customerPhone,
            f_email: intent.customerEmail,
            f_address: intent.customerAddress,
            f_urgency: intent.urgency,
            f_notes: intent.executiveSummary,
            notes: intent.executiveSummary,
            photo: imageUrl || null,
          }),
        },
      }).catch((e) => console.warn('[chat-intake] FormResponse record notice:', e));
    }

    if (existing) {
      let existingTags: string[] = [];
      try {
        existingTags = JSON.parse(existing.tagsJson || '[]');
      } catch {}

      let existingImages: string[] = [];
      try {
        existingImages = JSON.parse(existing.imagesJson || '[]');
      } catch {}

      const updatedTags = Array.from(new Set([...existingTags, tag]));
      const updatedImages = imageUrl ? Array.from(new Set([...existingImages, imageUrl])) : existingImages;

      return await db.lead.update({
        where: { id: existing.id },
        data: {
          name: intent.customerName !== 'Valued Visitor' ? intent.customerName : existing.name,
          phone: intent.customerPhone || existing.phone,
          email: intent.customerEmail || existing.email,
          address: intent.customerAddress || existing.address,
          priority: intent.isEmergency ? 'urgent' : existing.priority,
          description: `${existing.description || ''}\n[AI Update]: ${intent.executiveSummary}${photoNote}`.trim(),
          tagsJson: JSON.stringify(updatedTags),
          imagesJson: JSON.stringify(updatedImages),
        },
      });
    }

    // Only create Lead if tenantId exists (CRM mode) or if explicitly standalone
    if (tenantId) {
      return await db.lead.create({
        data: {
          tenantId,
          name: intent.customerName || 'Inquiry Contact',
          phone: intent.customerPhone || 'N/A',
          email: intent.customerEmail || null,
          address: intent.customerAddress || null,
          priority,
          status: intent.isEmergency ? 'hot' : 'new',
          source: 'ai_intake_chat',
          description: `[AI Intake Session]: ${intent.executiveSummary}${photoNote}`.trim(),
          tagsJson: JSON.stringify([tag]),
          imagesJson: imageUrl ? JSON.stringify([imageUrl]) : '[]',
        },
      });
    }

    return null;
  } catch (err) {
    console.warn('[chat-booking-helper] Lead capture notice:', err);
    return null;
  }
}

export async function upsertWhatsAppInquiryLead(params: {
  tenantId: string;
  customerPhone: string;
  customerName?: string | null;
  message: string;
  agentId?: string | null;
  timezone?: string | null;
  intent?: ExtractedBookingIntent;
}) {
  const intent =
    params.intent ||
    extractBookingIntent(params.message, [], 'WhatsApp Inquiry', {
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      timezone: params.timezone,
    });

  return tryCaptureChatLead({
    tenantId: params.tenantId,
    agentId: params.agentId,
    intent,
    message: params.message,
  });
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
  imageUrl?: string;
  customerPhone?: string | null;
  customerName?: string | null;
  timezone?: string | null;
  history?: Array<{ role?: string; sender?: string; senderType?: string; content?: string; text?: string }>;
}): Promise<BookingResult | null> {
  const intent = extractBookingIntent(params.message, params.history, params.serviceName, {
    customerPhone: params.customerPhone,
    customerName: params.customerName,
    timezone: params.timezone,
  });

  // If user provided contact info, capture intake lead & submission asynchronously
  if (intent.customerPhone || intent.customerEmail) {
    tryCaptureChatLead({
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      agentId: params.agentId,
      formId: params.formId,
      intent,
      message: params.message,
      imageUrl: params.imageUrl,
    }).catch(() => {});
  }

  // GATE: Require isBookingReady — which gates on contact info (phone OR email).
  // Previously had a bypass: (hasIntent && dateStr && timeStr) which allowed
  // bookings WITHOUT contact info, creating "Valued Visitor / N/A / N/A"
  // bookings on every message where the AI's prior turn mentioned "book" +
  // "today" + "8 AM".
  if (!intent.isBookingReady) {
    return null;
  }

  // Also require explicit date AND time — no more defaulting to "today at 10am"
  if (!intent.dateStr || !intent.timeStr) {
    return null;
  }

  try {
    const effectiveDate = intent.dateStr;
    const effectiveTime = intent.timeStr;

    const result = await createAppointmentBooking({
      tenantId: params.tenantId || null,
      workspaceId: params.workspaceId || null,
      formId: params.formId || null,
      agentId: params.agentId || null,
      serviceName: intent.serviceName || params.serviceName || 'Consultation & Appointment',
      date: effectiveDate,
      time: effectiveTime,
      durationMinutes: 30,
      timezone: params.timezone || undefined,
      customer: {
        name: intent.customerName,
        email: intent.customerEmail || '',
        phone: intent.customerPhone || '',
        address: intent.customerAddress || '',
      },
      notes: `[Booked via AI Chat Session]\nVisitor: ${intent.customerName}\nUrgency: ${intent.urgency.toUpperCase()}\nSummary: ${intent.executiveSummary}${params.imageUrl ? `\nPhoto: ${params.imageUrl}` : ''}`,
      source: 'ai_chat_widget',
      bypassAvailabilityCheck: false,
    });

    return result;
  } catch (err) {
    console.error('[chat-booking-helper] Failed to create booking:', err);
    return null;
  }
}
