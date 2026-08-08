/**
 * Vapi Function-Calling Bridge
 * ----------------------------
 * When a Vapi assistant calls a tool (function), Vapi sends a POST to our
 * `serverUrl` (configured on the assistant). We receive the tool call and
 * execute the corresponding business logic (create lead, book appointment,
 * check availability, etc.), then return the result back to Vapi.
 *
 * Vapi's function-call spec:
 * POST body: { message: { type: 'tool-call', toolCall: { name, parameters } }, call: {...} }
 * Response: { result: <any> }  — fed back to the LLM as the tool result.
 */

// Server URL that Vapi will call. Must be publicly reachable.
// In production this is the Vercel URL. In dev it's a tunnel (ngrok/cloudflare).
//
// Resolution order:
//   1. VERCEL_URL         (auto-set by Vercel runtime)
//   2. VAPI_SERVER_URL    (explicit override — e.g. ngrok/cloudflare tunnel)
//   3. NEXT_PUBLIC_APP_URL (production app URL — works for non-Vercel deploys)
//
// If none of the above are set, we throw a clear error instead of returning
// a placeholder URL. A placeholder URL would get baked into the Vapi
// assistant's `serverUrl` field and silently break function calling (the AI
// could still converse but create_lead / book_appointment / transfer_call
// would never fire). Throwing forces the operator to set one of the env
// vars before creating assistants — fail-fast is better than silent failure.
export function getFunctionCallServerUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}/api/vapi/function-call`;
  if (process.env.VAPI_SERVER_URL) return process.env.VAPI_SERVER_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    // Strip trailing slash, then append the function-call path.
    return `${appUrl.replace(/\/+$/, '')}/api/vapi/function-call`;
  }
  throw new Error(
    'Cannot determine Vapi function-call server URL. Set one of: VERCEL_URL, ' +
    'VAPI_SERVER_URL, or NEXT_PUBLIC_APP_URL in your environment. Without a ' +
    'publicly reachable URL, Vapi cannot invoke tools (create_lead, ' +
    'book_appointment, transfer_call, etc.) during calls.',
  );
}

// ─── Tool definitions exposed to Vapi assistants ────────────────────────────
// These map to the `functions` array in the Vapi assistant config.
export const AVAILABLE_TOOLS = [
  {
    name: 'create_lead',
    description: 'Create a new lead in the CRM from a phone call',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Caller full name' },
        phone: { type: 'string', description: 'Caller phone (E.164)' },
        email: { type: 'string', description: 'Caller email if provided' },
        service: { type: 'string', description: 'Service they are interested in' },
        notes: { type: 'string', description: 'Additional notes from the conversation' },
      },
      required: ['name', 'phone'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment slot',
    parameters: {
      type: 'object',
      properties: {
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        service: { type: 'string', description: 'Service requested' },
        preferredDate: { type: 'string', description: 'ISO 8601 date' },
        preferredTime: { type: 'string', description: 'HH:mm 24h' },
      },
      required: ['customerName', 'customerPhone', 'preferredDate'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check available appointment slots for a given date',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO 8601 date (YYYY-MM-DD)' },
        service: { type: 'string' },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_business_hours',
    description: 'Get the business hours for the company',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_service_prices',
    description: 'Get pricing for services offered',
    parameters: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Specific service name (optional)' },
      },
    },
  },
  {
    name: 'transfer_call',
    description: 'Transfer the call to a human agent',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why transfer is needed' },
        target: { type: 'string', description: 'Phone number or extension' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'lookup_appointment',
    description: 'Look up upcoming appointments/bookings for a customer by their phone number',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone number in E.164 format' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment by booking ID',
    parameters: {
      type: 'object',
      properties: {
        bookingId: { type: 'string', description: 'The booking ID to cancel' },
        reason: { type: 'string', description: 'Reason for cancellation' },
      },
      required: ['bookingId'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment to a new date/time',
    parameters: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        newDateTime: { type: 'string', description: 'ISO 8601 datetime string for the new appointment time' },
      },
      required: ['bookingId', 'newDateTime'],
    },
  },
  {
    name: 'submit_request',
    description: 'Submit a work/service request from a caller. Creates a lead with request details for follow-up.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        serviceType: { type: 'string', description: 'Type of service requested' },
        description: { type: 'string', description: 'Details of the request' },
        preferredDate: { type: 'string', description: 'Preferred appointment date (ISO 8601)' },
      },
      required: ['name', 'phone', 'description'],
    },
  },
  {
    name: 'create_follow_up_task',
    description: 'Create a follow-up task for the team to contact a caller back',
    parameters: {
      type: 'object',
      properties: {
        callerName: { type: 'string' },
        callerPhone: { type: 'string' },
        reason: { type: 'string', description: 'Why follow-up is needed' },
        dueDate: { type: 'string', description: 'ISO date for follow-up (optional)' },
      },
      required: ['callerName', 'callerPhone', 'reason'],
    },
  },
] as const;

// ─── Tool handlers (business logic) ─────────────────────────────────────────
// Each handler receives the parsed parameters + context (tenantId, call info).

export interface ToolContext {
  tenantId: string;
  callId?: string;
  agentId?: string;
  customerPhone?: string;
}

export async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  switch (toolName) {
    case 'create_lead':
      return handleCreateLead(parameters, ctx);
    case 'book_appointment':
      return handleBookAppointment(parameters, ctx);
    case 'check_availability':
      return handleCheckAvailability(parameters, ctx);
    case 'get_business_hours':
      return handleGetBusinessHours(ctx);
    case 'get_service_prices':
      return handleGetServicePrices(parameters, ctx);
    case 'transfer_call':
      return handleTransferCall(parameters, ctx);
    case 'lookup_appointment':
      return handleLookupAppointment(parameters, ctx);
    case 'cancel_appointment':
      return handleCancelAppointment(parameters);
    case 'reschedule_appointment':
      return handleRescheduleAppointment(parameters);
    case 'submit_request':
      return handleSubmitRequest(parameters, ctx);
    case 'create_follow_up_task':
      return handleCreateFollowUpTask(parameters, ctx);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Lazy import db to avoid circular deps ──────────────────────────────────
async function getDb() {
  const { db } = await import('@/lib/db');
  return db;
}

async function handleCreateLead(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const name = String(params.name || '');
  const phone = String(params.phone || '');
  const email = params.email ? String(params.email) : undefined;
  const service = params.service ? String(params.service) : undefined;
  const notes = params.notes ? String(params.notes) : undefined;

  // Dedupe by phone within tenant
  const existing = await db.lead.findFirst({
    where: { tenantId: ctx.tenantId, phone },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    if (notes) {
      const existingNotes = (() => { try { return JSON.parse(existing.notesJson || '[]'); } catch { return []; } })();
      existingNotes.push({
        text: notes,
        source: 'ai_receptionist',
        at: new Date().toISOString(),
      });
      await db.lead.update({
        where: { id: existing.id },
        data: { notesJson: JSON.stringify(existingNotes) },
      });
    }
    return { success: true, message: 'Lead already exists, notes updated', leadId: existing.id };
  }

  const lead = await db.lead.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      phone,
      email: email || null,
      source: 'ai_receptionist',
      status: 'new',
      serviceType: service || null,
      description: notes || `Created by AI Receptionist call from ${phone}`,
      tagsJson: JSON.stringify(['ai-receptionist', 'voice-call']),
    },
  });

  return { success: true, message: 'Lead created successfully', leadId: lead.id };
}

async function handleBookAppointment(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const phone = String(params.customerPhone || '');
  const customerName = String(params.customerName || 'Unknown');
  const preferredDate = String(params.preferredDate || '');
  const preferredTime = String(params.preferredTime || '09:00');
  const service = params.service ? String(params.service) : undefined;

  // Booking model in this codebase uses customerName/customerPhone strings
  // (no FK to Customer), so we don't need to create a customer here.
  try {
    const booking = await db.booking.create({
      data: {
        tenantId: ctx.tenantId,
        title: `AI Booked: ${service || 'Appointment'}`,
        customerName,
        customerPhone: phone,
        scheduledAt: new Date(`${preferredDate}T${preferredTime}:00`),
        status: 'confirmed',
        source: 'ai_receptionist',
        notes: `Booked via AI Receptionist call from ${phone}`,
      },
    });
    return {
      success: true,
      message: `Appointment booked for ${preferredDate} at ${preferredTime}`,
      bookingId: booking.id,
    };
  } catch (e) {
    return { success: false, error: 'Failed to create booking', detail: (e as Error).message };
  }
}

async function handleCheckAvailability(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const date = String(params.date || '');
  if (!date) return { error: 'Date is required' };

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  // Fetch existing bookings for that day
  const existingBookings = await db.booking.findMany({
    where: {
      tenantId: ctx.tenantId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['confirmed', 'pending'] },
    },
    select: { scheduledAt: true },
  });

  // Business hours: 9 AM - 5 PM, 1-hour slots
  const slots: string[] = [];
  for (let h = 9; h < 17; h++) {
    const slotTime = `${String(h).padStart(2, '0')}:00`;
    const slotDateTime = new Date(`${date}T${slotTime}:00`);
    const isBooked = existingBookings.some(
      (b) => b.scheduledAt && b.scheduledAt.getTime() === slotDateTime.getTime()
    );
    if (!isBooked) slots.push(slotTime);
  }

  return {
    date,
    availableSlots: slots,
    businessHours: '09:00-17:00',
  };
}

// Map short day keys stored in Tenant.businessHoursJson (mon, tue, ...)
// to the long-day keys returned by this tool (monday, tuesday, ...).
const DAY_KEY_MAP: Record<string, string> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
  // Also accept long-day keys directly (defensive).
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

async function handleGetBusinessHours(ctx: ToolContext) {
  const db = await getDb();
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { businessHoursJson: true, name: true },
  });
  let hours: Record<string, string> = {
    monday: '09:00-17:00',
    tuesday: '09:00-17:00',
    wednesday: '09:00-17:00',
    thursday: '09:00-17:00',
    friday: '09:00-17:00',
    saturday: 'Closed',
    sunday: 'Closed',
  };
  try {
    // Bug 1 fix: business hours live in a dedicated column
    // (Tenant.businessHoursJson), NOT in settingsJson.businessHours.
    // Shape: { mon: { open: '09:00', close: '17:00' }, ... } OR
    // { monday: '09:00-17:00', ... } (legacy). Handle both.
    const parsed = JSON.parse(tenant?.businessHoursJson || '{}');
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        const longKey = DAY_KEY_MAP[k.toLowerCase()];
        if (!longKey) continue;
        if (v && typeof v === 'object' && ('open' in v || 'close' in v)) {
          const open = (v as { open?: string }).open || '';
          const close = (v as { close?: string }).close || '';
          if (open && close) hours[longKey] = `${open}-${close}`;
          else if (open) hours[longKey] = open;
          else hours[longKey] = 'Closed';
        } else if (typeof v === 'string') {
          hours[longKey] = v || 'Closed';
        }
      }
    }
  } catch { /* ignore */ }
  return { businessHours: hours };
}

async function handleGetServicePrices(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  // Try to read from ServiceCatalog if model exists
  try {
    const services = await db.service.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { name: true, basePrice: true, description: true },
      take: 20,
    });
    if (services && services.length > 0) {
      const service = params.service ? String(params.service) : null;
      if (service) {
        const match = services.find((s) =>
          s.name?.toLowerCase().includes(service.toLowerCase())
        );
        return match ? { service: match } : { services, message: 'Service not found, showing all' };
      }
      return { services };
    }
  } catch { /* model may not exist */ }

  return {
    message: 'Service catalog not configured. Please ask the caller to describe their needs.',
  };
}

async function handleTransferCall(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { phone: true, settingsJson: true },
  });
  let transferNumber = params.target ? String(params.target) : tenant?.phone;
  try {
    const settings = JSON.parse(tenant?.settingsJson || '{}');
    if (settings.transferNumber) transferNumber = settings.transferNumber;
  } catch { /* ignore */ }

  const reason = params.reason ? String(params.reason) : 'Escalation requested';

  // Bug 2 fix: Vapi recognises a transfer command when the function-call
  // response body is `{ result: { type: 'transfer', destination: '+1...' } }`.
  // Returning a plain `{ action: 'transfer' }` JSON was just narrated by
  // the LLM — it never actually triggered a call transfer. The function-call
  // route passes this wrapper through verbatim when it sees a nested
  // `result` + `message` pair (see route handler).
  if (!transferNumber) {
    return {
      message: 'No transfer number configured. Please take a message and let the caller know the team will follow up.',
    };
  }
  return {
    result: {
      type: 'transfer',
      destination: transferNumber, // E.164 phone number
      reason,
    },
    // Human-readable message for the LLM to narrate before the transfer fires.
    message: `Transferring you to ${transferNumber}. Please hold.`,
  };
}

// ─── New tools (Phase R4) ───────────────────────────────────────────────────

async function handleLookupAppointment(params: Record<string, unknown>, ctx: ToolContext) {
  const phone = params.phone ? String(params.phone) : '';
  if (!phone) return { error: 'phone is required' };
  const db = await getDb();
  // Customer has no tenantId column — scope by phone alone, then tenant-scope
  // the bookings themselves.
  const customer = await db.customer.findFirst({
    where: { phone },
    select: { id: true, name: true },
  });
  if (!customer) {
    return { appointments: [], count: 0, message: 'No customer found with that phone number.' };
  }
  // Use an allowlist (`in`) rather than a blocklist (`notIn`) — `notIn` is
  // not supported by the Supabase REST adapter.
  const bookings = await db.booking.findMany({
    where: {
      customerId: customer.id,
      tenantId: ctx.tenantId,
      scheduledAt: { gte: new Date() },
      status: { in: ['pending', 'confirmed', 'rescheduled', 'in_progress'] },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
    // Booking has no `serviceType` field — `title` carries the appointment
    // description (e.g. "AI Booked: Plumbing").
    select: { id: true, scheduledAt: true, status: true, title: true, notes: true },
  });
  return {
    customer: { name: customer.name, phone },
    appointments: bookings,
    count: bookings.length,
  };
}

async function handleCancelAppointment(params: Record<string, unknown>) {
  const bookingId = params.bookingId ? String(params.bookingId) : '';
  if (!bookingId) return { error: 'bookingId is required' };
  const db = await getDb();
  const reason = params.reason ? String(params.reason) : '';
  const booking = await db.booking
    .update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Cancelled by AI Receptionist',
        notes: `Cancelled by AI Receptionist${reason ? `. Reason: ${reason}` : ' (reason not specified)'}`,
      },
    })
    .catch(() => null);
  if (!booking) return { success: false, error: 'Booking not found or could not be updated' };
  return { success: true, bookingId: booking.id, status: 'cancelled' };
}

async function handleRescheduleAppointment(params: Record<string, unknown>) {
  const bookingId = params.bookingId ? String(params.bookingId) : '';
  const newDateTime = params.newDateTime ? String(params.newDateTime) : '';
  if (!bookingId || !newDateTime) return { error: 'bookingId and newDateTime are required' };
  const newDate = new Date(newDateTime);
  if (isNaN(newDate.getTime())) return { error: 'Invalid datetime format. Use ISO 8601.' };
  const db = await getDb();
  // Capture previous scheduledAt for the rescheduledFrom audit field.
  const existing = await db.booking.findUnique({
    where: { id: bookingId },
    select: { scheduledAt: true },
  }).catch(() => null);
  if (!existing) return { success: false, error: 'Booking not found' };
  const prevIso = existing.scheduledAt
    ? (existing.scheduledAt instanceof Date
        ? existing.scheduledAt.toISOString()
        : String(existing.scheduledAt))
    : null;
  const booking = await db.booking
    .update({
      where: { id: bookingId },
      data: {
        scheduledAt: newDate,
        status: 'rescheduled',
        rescheduledFrom: prevIso,
      },
    })
    .catch(() => null);
  if (!booking) return { success: false, error: 'Booking not found' };
  return { success: true, bookingId: booking.id, newDateTime: newDate.toISOString() };
}

async function handleSubmitRequest(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const name = String(params.name || '');
  const phone = String(params.phone || '');
  const description = String(params.description || '');
  if (!name || !phone || !description) {
    return { error: 'name, phone, and description are required' };
  }
  const email = params.email ? String(params.email) : undefined;
  const serviceType = params.serviceType ? String(params.serviceType) : undefined;
  const preferredDate = params.preferredDate ? String(params.preferredDate) : undefined;

  // Dedupe by phone within tenant (mirrors handleCreateLead). If a Lead with
  // this phone already exists, append the new request as a note rather than
  // creating a duplicate.
  const existing = await db.lead.findFirst({
    where: { tenantId: ctx.tenantId, phone },
    orderBy: { createdAt: 'desc' },
  });

  const noteEntry = {
    text: `Service request: ${description}${serviceType ? ` [${serviceType}]` : ''}${preferredDate ? ` (preferred: ${preferredDate})` : ''}`,
    source: 'ai_receptionist',
    at: new Date().toISOString(),
  };

  if (existing) {
    const existingNotes = (() => { try { return JSON.parse(existing.notesJson || '[]'); } catch { return []; } })();
    existingNotes.push(noteEntry);
    await db.lead.update({
      where: { id: existing.id },
      data: { notesJson: JSON.stringify(existingNotes) },
    });
    return { success: true, leadId: existing.id, message: 'Request added to existing lead. Team will follow up.' };
  }

  const lead = await db.lead.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      phone,
      email: email || null,
      source: 'ai_receptionist',
      status: 'new',
      serviceType: serviceType || null,
      description: noteEntry.text,
      tagsJson: JSON.stringify(['ai-receptionist', 'request', 'voice-call']),
    },
  });

  return { success: true, leadId: lead.id, message: 'Request submitted. Team will follow up.' };
}

async function handleCreateFollowUpTask(params: Record<string, unknown>, ctx: ToolContext) {
  const db = await getDb();
  const callerName = String(params.callerName || '');
  const callerPhone = String(params.callerPhone || '');
  const reason = String(params.reason || '');
  if (!callerName || !callerPhone || !reason) {
    return { error: 'callerName, callerPhone, and reason are required' };
  }
  const dueDate = params.dueDate ? String(params.dueDate) : undefined;

  // Job has no tenantId column — resolve a workspaceId for the tenant.
  // (If no workspace exists yet, leave null — the Job row is still created.)
  let workspaceId: string | undefined;
  try {
    const ws = await db.workspace.findFirst({
      where: { tenantId: ctx.tenantId },
      select: { id: true },
    });
    workspaceId = ws?.id || undefined;
  } catch { /* ignore — workspace model may be missing in some setups */ }

  // Try to resolve a customerId by phone (best-effort).
  let customerId: string | undefined;
  try {
    const customer = await db.customer.findFirst({
      where: { phone: callerPhone },
      select: { id: true },
    });
    customerId = customer?.id || undefined;
  } catch { /* ignore */ }

  const title = `Follow-up: ${callerName}`;
  const scheduledAt = dueDate ? new Date(dueDate) : null;
  const validScheduledAt = scheduledAt && !isNaN(scheduledAt.getTime()) ? scheduledAt : null;

  try {
    const job = await db.job.create({
      data: {
        title,
        description: reason,
        status: 'pending',
        priority: 'medium',
        type: 'task',
        customerName: callerName,
        customerPhone: callerPhone,
        customerId: customerId || null,
        scheduledAt: validScheduledAt,
        notes: `Created by AI Receptionist. Caller: ${callerName} (${callerPhone}). Reason: ${reason}`,
        workspaceId: workspaceId || null,
      },
    });
    return { success: true, taskId: job.id, message: `Follow-up task created for ${callerName}.` };
  } catch (e) {
    return { success: false, error: 'Failed to create follow-up task', detail: (e as Error).message };
  }
}
