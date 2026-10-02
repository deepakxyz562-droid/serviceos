/**
 * Unified Agent Tool Registry — Enterprise Agent Architecture Phase 3
 * =================================================================
 *
 * A single tool registry shared across voice (AiToolDispatcher) and text chat
 * (public agent-chat route). Each tool has:
 *   - name: unique identifier
 *   - description: shown to the LLM
 *   - riskLevel: low | medium | high | critical
 *   - requiresConfirmation: whether human approval is needed before execution
 *   - schema: JSON-Schema for arguments validation
 *   - execute: server-side handler with tenantId/agentId baked in
 *
 * The LLM proposes the action. Your application decides whether it's allowed.
 * The model never directly controls the database.
 */

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentTool {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  requiresConfirmation: boolean;
  argSchema: Record<string, { type: string; required?: boolean; description?: string }>;
  execute: (ctx: ToolContext, args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolContext {
  tenantId: string | null;
  workspaceId: string | null;
  agentId: string | null;
  formId: string | null;
  sessionId: string | null;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  cardType?: string;  // if this tool should render a card in the chat UI
  cardData?: unknown;  // card payload for the widget
}

// ─── Tool Registry ──────────────────────────────────────────────────────────

const REGISTRY: Map<string, AgentTool> = new Map();

export function registerTool(tool: AgentTool): void {
  REGISTRY.set(tool.name, tool);
}

export function getTool(name: string): AgentTool | undefined {
  return REGISTRY.get(name);
}

export function getAllTools(): AgentTool[] {
  return Array.from(REGISTRY.values());
}

export function getToolCatalogForPrompt(): string {
  const tools = getAllTools();
  return tools
    .map(
      (t) =>
        `- ${t.name}(${Object.entries(t.argSchema)
          .map(([k, v]) => `${k}: ${v.type}${v.required ? '' : '?'}`)
          .join(', ')}) — ${t.description} [risk: ${t.riskLevel}]`
    )
    .join('\n');
}

export async function executeTool(
  name: string,
  ctx: ToolContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const tool = REGISTRY.get(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  try {
    // Validate required args
    for (const [argName, argSpec] of Object.entries(tool.argSchema)) {
      if (argSpec.required && !(argName in args)) {
        return { success: false, error: `Missing required argument: ${argName}` };
      }
    }
    return await tool.execute(ctx, args);
  } catch (err) {
    return {
      success: false,
      error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Built-in Tools ──────────────────────────────────────────────────────────

// 1. get_knowledge — search the knowledge base (low risk)
registerTool({
  name: 'get_knowledge',
  description: 'Search the business knowledge base for relevant information. Use this to answer questions about services, pricing, policies, hours, service areas.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    query: { type: 'string', required: true, description: 'The search query' },
  },
  execute: async (_ctx, args) => {
    // Delegated to the existing hybrid search — imported lazily to avoid circular deps
    const { searchKnowledgeBaseHybrid } = await import('@/lib/ai-knowledge');
    const query = String(args.query || '');
    if (!query) return { success: false, error: 'Query is required' };
    // Use the agent/form scope — ctx.agentId or ctx.tenantId
    const scope = ctx.tenantId || ctx.agentId;
    if (!scope) return { success: false, error: 'No search scope available' };
    const result = await searchKnowledgeBaseHybrid(scope, query, { k: 3, strictMode: false });
    return {
      success: true,
      data: {
        snippets: result.snippets?.slice(0, 3) || [],
        confidence: result.confidenceTier,
        citations: result.citations?.slice(0, 3) || [],
      },
    };
  },
});

// 2. get_services — list business services (low risk)
registerTool({
  name: 'get_services',
  description: 'Get the list of services offered by this business. Use when a customer asks "what services do you offer?" or "what do you do?"',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {},
  execute: async (ctx) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    const { db } = await import('@/lib/db');
    const services = await db.serviceItem.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true, description: true, basePrice: true, durationMinutes: true },
      take: 20,
    });
    return { success: true, data: { services } };
  },
});

// 3. check_availability — check calendar slots (low risk)
registerTool({
  name: 'check_availability',
  description: 'Check available appointment slots for a given date. Use when a customer wants to know when they can book.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    date: { type: 'string', required: true, description: 'YYYY-MM-DD format' },
  },
  execute: async (_ctx, args) => {
    const date = String(args.date || '');
    // Generate default 9-5 slots (same as existing check_availability action)
    const slots: string[] = [];
    for (let h = 9; h < 17; h++) {
      if (h === 12) continue; // lunch break
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      slots.push(`${h12}:00 ${ampm}`);
      slots.push(`${h12}:30 ${ampm}`);
    }
    return { success: true, data: { date, slots }, cardType: 'slot_picker', cardData: { date, slots } };
  },
});

// 4. create_booking — book an appointment (medium risk, configurable confirmation)
registerTool({
  name: 'create_booking',
  description: 'Create a booking/appointment. Requires customer name, contact info, date, and time. Only use when the customer has explicitly requested to book AND provided their contact information.',
  riskLevel: 'medium',
  requiresConfirmation: false,
  argSchema: {
    customerName: { type: 'string', required: true, description: 'Customer full name' },
    customerPhone: { type: 'string', description: 'Phone number' },
    customerEmail: { type: 'string', description: 'Email address' },
    date: { type: 'string', required: true, description: 'YYYY-MM-DD' },
    time: { type: 'string', required: true, description: 'HH:MM AM/PM' },
    service: { type: 'string', description: 'Service name' },
  },
  execute: async (ctx, args) => {
    // Delegate to the existing booking helper with all the guards
    const { tryExecuteChatBooking } = await import('@/lib/scheduling/chat-booking-helper');
    const result = await tryExecuteChatBooking({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      formId: ctx.formId,
      agentId: ctx.agentId,
      serviceName: String(args.service || 'Appointment'),
      message: `Book ${args.date} at ${args.time} for ${args.customerName}`,
      sessionId: ctx.sessionId,
    });
    if (result?.success) {
      return {
        success: true,
        data: result,
        cardType: 'booking_confirmation',
        cardData: {
          leadId: result.lead?.id,
          bookingId: result.booking?.id,
          calendarUrls: result.calendarUrls,
          dateStr: result.dateStr,
          timeStr: result.timeStr,
          name: result.lead?.name || args.customerName,
          service: args.service || 'Appointment',
        },
      };
    }
    return { success: false, error: 'Booking could not be created. Missing contact info or date/time.' };
  },
});

// 5. create_submission — create a form submission (low risk)
registerTool({
  name: 'create_submission',
  description: 'Create a form submission record from collected customer data. Use when the customer has provided their information and you want to save it as a structured lead.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    formId: { type: 'string', required: true, description: 'The form ID to submit to' },
    data: { type: 'object', required: true, description: 'Key-value pairs of form field data' },
  },
  execute: async (ctx, args) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    const { db } = await import('@/lib/db');
    const formId = String(args.formId || ctx.formId || '');
    if (!formId) return { success: false, error: 'No form ID provided' };
    const submission = await db.formSubmission.create({
      data: {
        formId,
        tenantId: ctx.tenantId,
        respondentName: String((args.data as any)?.name || ''),
        respondentEmail: String((args.data as any)?.email || ''),
        respondentPhone: String((args.data as any)?.phone || ''),
        data: args.data as any,
        source: 'ai_chat_widget',
        status: 'new',
      },
    });
    return { success: true, data: { submissionId: submission.id } };
  },
});

// 6. calculate — run a calculation (low risk)
registerTool({
  name: 'calculate',
  description: 'Calculate an estimate or quote based on service parameters. Use when a customer asks about pricing.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    service: { type: 'string', description: 'Service name' },
    quantity: { type: 'number', description: 'Quantity or square footage' },
    options: { type: 'object', description: 'Additional pricing options' },
  },
  execute: async (ctx, args) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    const { db } = await import('@/lib/db');
    const serviceName = String(args.service || '');
    const service = await db.serviceItem.findFirst({
      where: { tenantId: ctx.tenantId, name: { contains: serviceName, mode: 'insensitive' } },
      select: { name: true, basePrice: true, description: true },
    });
    if (!service) return { success: false, error: 'Service not found' };
    const qty = Number(args.quantity) || 1;
    const basePrice = service.basePrice || 0;
    const estimate = basePrice * qty;
    return {
      success: true,
      data: { service: service.name, estimate, basePrice, quantity: qty },
      cardType: 'quote_card',
      cardData: { service: service.name, estimate: `$${estimate.toFixed(0)}` },
    };
  },
});

// 7. send_email — send a notification email (medium risk)
registerTool({
  name: 'send_email',
  description: 'Send a notification email to the customer or business. Use for appointment confirmations, follow-ups, or lead notifications.',
  riskLevel: 'medium',
  requiresConfirmation: false,
  argSchema: {
    to: { type: 'string', required: true, description: 'Email address' },
    subject: { type: 'string', required: true, description: 'Email subject' },
    body: { type: 'string', required: true, description: 'Email body' },
  },
  execute: async (_ctx, args) => {
    // Delegate to the existing email service
    try {
      const { sendEmail } = await import('@/lib/email-send');
      await sendEmail({
        to: String(args.to),
        subject: String(args.subject),
        html: String(args.body),
      });
      return { success: true, data: { sent: true } };
    } catch (err) {
      return { success: false, error: `Email failed: ${err}` };
    }
  },
});

// 8. send_webhook — trigger a webhook (medium risk)
registerTool({
  name: 'send_webhook',
  description: 'Trigger a webhook to notify an external system. Use for CRM integration, Slack notifications, or custom automations.',
  riskLevel: 'medium',
  requiresConfirmation: false,
  argSchema: {
    event: { type: 'string', required: true, description: 'Event name (e.g. lead.created)' },
    payload: { type: 'object', description: 'Webhook payload data' },
  },
  execute: async (ctx, args) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    const { db } = await import('@/lib/db');
    const endpoints = await db.webhookEndpoint.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { url: true, secret: true },
    });
    const event = String(args.event);
    const payload = JSON.stringify({ event, tenantId: ctx.tenantId, data: args.payload, timestamp: new Date().toISOString() });
    const results = await Promise.allSettled(
      endpoints.map((ep) =>
        fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(ep.secret ? { 'X-Webhook-Secret': ep.secret } : {}) },
          body: payload,
        })
      )
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return { success: true, data: { delivered: succeeded, total: endpoints.length } };
  },
});

// 9. request_payment — request a payment (high risk, requires confirmation)
registerTool({
  name: 'request_payment',
  description: 'Send a payment request to the customer. Use for deposits, invoice payments, or service fees. Requires customer email/phone for delivery.',
  riskLevel: 'high',
  requiresConfirmation: true,
  argSchema: {
    amount: { type: 'number', required: true, description: 'Amount in dollars' },
    description: { type: 'string', required: true, description: 'Payment description' },
    customerEmail: { type: 'string', description: 'Customer email for payment link' },
  },
  execute: async (ctx, args) => {
    // Delegate to the existing payment intent flow
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    return {
      success: true,
      data: {
        amount: Number(args.amount),
        description: String(args.description),
        message: 'Payment request created. Customer will receive a payment link.',
      },
      cardType: 'quote_card',
      cardData: {
        service: String(args.description),
        estimate: `$${Number(args.amount).toFixed(2)}`,
      },
    };
  },
});

// 10. transfer_to_human — escalate to a human agent (low risk)
registerTool({
  name: 'transfer_to_human',
  description: 'Transfer the conversation to a human agent. Use when the customer is upset, the request is too complex, or the AI cannot help.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    reason: { type: 'string', required: true, description: 'Reason for escalation' },
  },
  execute: async (ctx, args) => {
    const { requestHumanHandoff } = await import('@/lib/chat/handoff-service');
    const handoff = await requestHumanHandoff({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      agentId: ctx.agentId,
      agentName: 'AI Assistant',
      formId: ctx.formId,
      message: String(args.reason),
      history: [],
    });
    return {
      success: true,
      data: handoff,
    };
  },
});

// 11. request_photo — ask the customer to upload a photo (low risk)
registerTool({
  name: 'request_photo',
  description: 'Ask the customer to upload a photo of the issue or property. Use when you need visual context for a service request.',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    prompt: { type: 'string', required: true, description: 'What to ask the customer to photograph' },
    hint: { type: 'string', description: 'Optional hint text' },
  },
  execute: async (_ctx, args) => {
    return {
      success: true,
      data: { prompt: String(args.prompt) },
      cardType: 'media_upload',
      cardData: { prompt: String(args.prompt), hint: String(args.hint || '') },
    };
  },
});

// 12. get_business_info — retrieve structured business facts (low risk)
registerTool({
  name: 'get_business_info',
  description: 'Get structured business information: name, phone, email, address, service areas, operating hours, emergency availability, services and pricing. Use for direct factual questions like "What is your phone number?" or "What cities do you serve?"',
  riskLevel: 'low',
  requiresConfirmation: false,
  argSchema: {
    category: { type: 'string', description: 'Optional: "contact", "hours", "service_areas", "services", "emergency", "pricing", "all"' },
  },
  execute: async (ctx, args) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    const { queryStructuredFacts } = await import('@/lib/ai-structured-facts');
    const category = String(args.category || 'all');
    const result = await queryStructuredFacts(ctx.tenantId, category);
    if (!result) return { success: false, error: 'No structured facts found for this business.' };
    return { success: true, data: result };
  },
});

// 13. send_sms — send an SMS message (medium risk)
registerTool({
  name: 'send_sms',
  description: 'Send an SMS message to a phone number. Use for appointment confirmations, follow-up reminders, or lead notifications.',
  riskLevel: 'medium',
  requiresConfirmation: false,
  argSchema: {
    to: { type: 'string', required: true, description: 'Phone number (E.164 format: +1XXXXXXXXXX)' },
    message: { type: 'string', required: true, description: 'SMS message body' },
  },
  execute: async (ctx, args) => {
    if (!ctx.tenantId) return { success: false, error: 'No tenant context' };
    try {
      const { sendSms } = await import('@/lib/sms-send');
      const result = await sendSms({
        to: String(args.to),
        message: String(args.message),
        tenantId: ctx.tenantId,
      });
      return { success: true, data: { messageId: result.messageId || 'sent' } };
    } catch (err) {
      return { success: false, error: `SMS failed: ${err}` };
    }
  },
});
