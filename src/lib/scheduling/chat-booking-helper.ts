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
  history: Array<{ role?: string; sender?: string; content?: string; text?: string }> = [],
  fallbackServiceName = 'Appointment Inquiry'
): ExtractedBookingIntent {
  const combinedText = [
    ...history.slice(-5).map((h) => h.content || h.text || ''),
    message,
  ].join(' ');

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
  ];

  // Explicit user confirmation phrases (user is explicitly confirming a prior booking offer)
  const confirmationPatterns = [
    /\byes\s+(please|book|confirm|schedule|go\s+ahead|do\s+it|that\s+works?)\b/i,
    /\bconfirm\s+(my|the|this)?\s*(booking|appointment|slot|schedule)\b/i,
    /\bgo\s+ahead\s+(and\s+)?(book|schedule|confirm)\b/i,
    /\bbook\s+(me|it|that|us)\b/i,
    /\byes,?\s*(please|book|schedule|confirm)\b/i,
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

  // 3. Time extraction
  //    - Current message: always extracted if present
  //    - History: ONLY carried forward if current message also has explicit booking intent
  //      (prevents a time from 3 turns ago triggering a booking on "your services")
  const timeRegex = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i;
  const timeMatchCurrent = message.match(timeRegex);
  const timeMatchCombined = combinedText.match(timeRegex);
  let timeStr: string | undefined = timeMatchCurrent
    ? timeMatchCurrent[1].toUpperCase()
    : (hasIntent && timeMatchCombined ? timeMatchCombined[1].toUpperCase() : undefined);

  // "at 2" or "at 10" without AM/PM — current message only
  if (!timeStr) {
    const atHourMatch = message.match(/\bat\s+(\d{1,2})\b/i);
    if (atHourMatch) {
      const h = parseInt(atHourMatch[1], 10);
      timeStr = h < 8 || h === 12 ? `${h}:00 PM` : `${h}:00 AM`;
    }
  }

  // 4. Date extraction
  //    Current message is checked first. History is only used if hasIntent is true
  //    to prevent stale dates bleeding into unrelated responses.
  let dateStr: string | undefined;

  if (lower.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = tomorrow.toISOString().split('T')[0];
  } else if (lower.includes('today')) {
    dateStr = new Date().toISOString().split('T')[0];
  } else {
    for (const day of WEEKDAYS) {
      if (lower.includes(day)) {
        dateStr = getNextWeekdayDate(day);
        break;
      }
    }
  }

  if (!dateStr) {
    const isoDateMatchCurrent = message.match(/\b(202\d-\d{2}-\d{2})\b/);
    if (isoDateMatchCurrent) {
      dateStr = isoDateMatchCurrent[1];
    } else {
      const slashDateMatchCurrent = message.match(/\b(\d{1,2})\/(\d{1,2})\/(202\d|\d{2})\b/);
      if (slashDateMatchCurrent) {
        const m = slashDateMatchCurrent[1].padStart(2, '0');
        const d = slashDateMatchCurrent[2].padStart(2, '0');
        const y = slashDateMatchCurrent[3].length === 2 ? `20${slashDateMatchCurrent[3]}` : slashDateMatchCurrent[3];
        dateStr = `${y}-${m}-${d}`;
      }
    }
  }

  // Fallback to history dates ONLY when current message has explicit booking intent
  if (!dateStr && hasIntent) {
    if (lowerCombined.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split('T')[0];
    } else if (lowerCombined.includes('today')) {
      dateStr = new Date().toISOString().split('T')[0];
    } else {
      for (const day of WEEKDAYS) {
        if (lowerCombined.includes(day)) {
          dateStr = getNextWeekdayDate(day);
          break;
        }
      }
    }
    if (!dateStr) {
      const isoDateMatch = combinedText.match(/\b(202\d-\d{2}-\d{2})\b/);
      if (isoDateMatch) dateStr = isoDateMatch[1];
    }
  }

  // 5. Email extraction
  const emailMatch = combinedText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const customerEmail = emailMatch ? emailMatch[1] : undefined;

  // 6. Phone extraction
  const phoneMatch = combinedText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const customerPhone = phoneMatch ? phoneMatch[0] : undefined;

  // 7. Address extraction
  let customerAddress: string | undefined;
  const addressMatch = combinedText.match(/(?:at|address(?: is)?|located at|property at)\s+([0-9]+\s+[A-Za-z0-9\s,.-]+?)(?:\.|\\n|tomorrow|at|my|$)/i);
  if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 5) {
    customerAddress = addressMatch[1].trim();
  }

  // 8. Name extraction
  let customerName: string | undefined;
  const namePatterns = [
    /(?:my name is|i am|i'm|name:)\s+([A-Za-z]{2,20})/i,
    /(?:for|with)\s+([A-Z][a-z]{2,20})(?:\s+at|\s+tomorrow|\s+on|$)/,
  ];

  for (const pat of namePatterns) {
    const match = combinedText.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['Tomorrow', 'Today', 'Monday', 'Friday', 'Saturday', 'Sunday', 'Call', 'Confirmation', 'Appointment', 'Emergency'];
      if (!forbidden.includes(candidate)) {
        customerName = candidate;
        break;
      }
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
    const existing = tenantId
      ? await db.lead.findFirst({
          where: {
            tenantId,
            OR: [
              ...(intent.customerPhone ? [{ phone: intent.customerPhone }] : []),
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
  history?: Array<{ role?: string; sender?: string; content?: string; text?: string }>;
}): Promise<BookingResult | null> {
  const intent = extractBookingIntent(params.message, params.history, params.serviceName);

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

  // Only execute booking if ready with date and time
  if (!intent.isBookingReady && !(intent.hasIntent && intent.dateStr && intent.timeStr)) {
    return null;
  }

  try {
    const effectiveDate = intent.dateStr || new Date().toISOString().split('T')[0];
    const effectiveTime = intent.timeStr || '10:00 AM';

    const result = await createAppointmentBooking({
      tenantId: params.tenantId || null,
      workspaceId: params.workspaceId || null,
      formId: params.formId || null,
      agentId: params.agentId || null,
      serviceName: intent.serviceName || params.serviceName || 'Consultation & Appointment',
      date: effectiveDate,
      time: effectiveTime,
      durationMinutes: 30,
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
