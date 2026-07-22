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
export function getFunctionCallServerUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}/api/vapi/function-call`;
  // Allow override via env (e.g. ngrok tunnel for local dev)
  if (process.env.VAPI_SERVER_URL) return process.env.VAPI_SERVER_URL;
  // Fallback: relative path — Vapi will reject, but assistant still works
  // for non-function-call conversations.
  return 'https://your-serviceos-instance.com/api/vapi/function-call';
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

async function handleGetBusinessHours(ctx: ToolContext) {
  const db = await getDb();
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settingsJson: true, name: true },
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
    const settings = JSON.parse(tenant?.settingsJson || '{}');
    if (settings.businessHours) hours = { ...hours, ...settings.businessHours };
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

  return {
    action: 'transfer',
    target: transferNumber,
    reason: params.reason,
    message: transferNumber
      ? `Transferring to ${transferNumber}`
      : 'No transfer number configured. Please take a message.',
  };
}
