import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callOpenRouter, extractJson } from '@/lib/ai-client';
import { formatCurrency } from '@/lib/currency';

/**
 * POST /api/ai/compose-message
 * ----------------------------
 * AI-powered message composer for the Message Customer dialog.
 *
 * Given a customer (+ optional job/invoice), an intent (schedule_reminder,
 * job_started, on_the_way, job_complete, invoice_reminder, thank_you, custom),
 * a tone, and the target channel, the LLM returns a ready-to-send message
 * baked with REAL customer/job/invoice data (no {{var}} placeholders — the
 * AI has access to the DB server-side and writes the final text directly).
 *
 * Request body:
 *   {
 *     customerId:          string,                          // required
 *     jobId?:              string,
 *     invoiceId?:          string,
 *     channel:             'email' | 'sms' | 'whatsapp' | 'in_app',
 *     intent:              string,                          // see INTENT_LABELS below
 *     tone:                'friendly' | 'professional' | 'urgent' | 'casual',
 *     customInstructions?: string,
 *   }
 *
 * Returns 200: { subject?: string, body: string, model?: string }
 *   - subject is omitted for SMS / WhatsApp / in-app (no subject line).
 *
 * Errors:
 *   401 — not authenticated
 *   400 — missing required fields
 *   503 — OPENROUTER_API_KEY not set (AI service not configured)
 *   500 — other errors
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type Channel = 'email' | 'sms' | 'whatsapp' | 'in_app';
type Tone = 'friendly' | 'professional' | 'urgent' | 'casual';

interface ComposeRequest {
  customerId?: string;
  jobId?: string;
  invoiceId?: string;
  channel?: string;
  intent?: string;
  tone?: string;
  customInstructions?: string;
}

interface ComposedMessage {
  subject?: string;
  body: string;
}

// ─── Intent catalog ────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, string> = {
  schedule_reminder: 'Schedule Reminder',
  job_started: 'Job Started',
  on_the_way: 'On The Way',
  job_complete: 'Job Complete',
  invoice_reminder: 'Invoice Reminder',
  thank_you: 'Thank You',
  custom: 'Custom',
};

const VALID_TONES: Tone[] = ['friendly', 'professional', 'urgent', 'casual'];
const VALID_CHANNELS: Channel[] = ['email', 'sms', 'whatsapp', 'in_app'];

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDateOnly(d: Date | string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

// ─── DB context loader ─────────────────────────────────────────────────────

interface ComposeContext {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName: string;
  jobTitle: string;
  assigneeName: string;
  scheduledDate: string;
  jobStatus: string;
  jobNotes: string;
  invoiceNumber: string;
  invoiceAmount: string;
  invoiceDueDate: string;
  invoiceStatus: string;
}

/**
 * Load the real DB rows for the customer (+ optional job/invoice/tenant) so
 * the AI can write FINAL text — no {{var}} placeholders. Every lookup is
 * wrapped in try/catch so a failure in one query never breaks the whole
 * compose flow (the AI still gets a partial context and can write a generic
 * message).
 */
async function loadContext(
  user: { tenantId: string | null },
  req: ComposeRequest,
): Promise<ComposeContext> {
  const ctx: ComposeContext = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    companyName: '',
    jobTitle: '',
    assigneeName: '',
    scheduledDate: '',
    jobStatus: '',
    jobNotes: '',
    invoiceNumber: '',
    invoiceAmount: '',
    invoiceDueDate: '',
    invoiceStatus: '',
  };

  // Tenant name (companyName) — from the auth user's tenantId, since the
  // Customer model only has workspaceId, not tenantId. Mirrors what the
  // communication engine does in resolveContext().
  if (user.tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, currency: true },
      });
      if (tenant?.name) ctx.companyName = tenant.name;
    } catch (err) {
      console.error('[ai/compose-message] Failed to load tenant:', err);
    }
  }

  // Customer — required, but we degrade gracefully if the lookup fails.
  if (req.customerId) {
    try {
      const c = await db.customer.findUnique({
        where: { id: req.customerId },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (c) {
        ctx.customerName = c.name || '';
        ctx.customerPhone = c.phone || '';
        ctx.customerEmail = c.email || '';
      }
    } catch (err) {
      console.error('[ai/compose-message] Failed to load customer:', err);
    }
  }

  // Job — either the explicit jobId, OR (if only an invoiceId was supplied)
  // loaded later via the invoice's jobId.
  let loadedJob: {
    title: string | null;
    assigneeName: string | null;
    scheduledAt: Date | null;
    status: string | null;
    notes: string | null;
    customerId: string | null;
  } | null = null;

  if (req.jobId) {
    try {
      const j = await db.job.findUnique({
        where: { id: req.jobId },
        select: {
          title: true,
          assigneeName: true,
          scheduledAt: true,
          status: true,
          notes: true,
          customerId: true,
        },
      });
      if (j) loadedJob = j;
    } catch (err) {
      console.error('[ai/compose-message] Failed to load job:', err);
    }
  }

  // Invoice — explicit invoiceId, OR the most recent invoice linked to the job.
  let loadedInvoice: {
    number: string | null;
    amount: number | null;
    dueDate: Date | null;
    currency: string | null;
    status: string | null;
    jobId: string | null;
    customerId: string | null;
  } | null = null;

  if (req.invoiceId) {
    try {
      const inv = await db.invoice.findUnique({
        where: { id: req.invoiceId },
        select: {
          number: true,
          amount: true,
          dueDate: true,
          currency: true,
          status: true,
          jobId: true,
          customerId: true,
        },
      });
      if (inv) loadedInvoice = inv;
    } catch (err) {
      console.error('[ai/compose-message] Failed to load invoice:', err);
    }
  } else if (req.jobId) {
    try {
      const inv = await db.invoice.findFirst({
        where: { jobId: req.jobId },
        orderBy: { createdAt: 'desc' },
        select: {
          number: true,
          amount: true,
          dueDate: true,
          currency: true,
          status: true,
          jobId: true,
          customerId: true,
        },
      });
      if (inv) loadedInvoice = inv;
    } catch (err) {
      console.error('[ai/compose-message] Failed to load job invoice:', err);
    }
  }

  // If we have an invoice but no job yet, try to load the linked job.
  if (!loadedJob && loadedInvoice?.jobId) {
    try {
      const j = await db.job.findUnique({
        where: { id: loadedInvoice.jobId },
        select: {
          title: true,
          assigneeName: true,
          scheduledAt: true,
          status: true,
          notes: true,
          customerId: true,
        },
      });
      if (j) loadedJob = j;
    } catch (err) {
      console.error('[ai/compose-message] Failed to load invoice job:', err);
    }
  }

  // If we still have no customer name but the job/invoice references a
  // different customer, fall back to that.
  if (!ctx.customerName && loadedJob?.customerId && loadedJob.customerId !== req.customerId) {
    try {
      const c = await db.customer.findUnique({
        where: { id: loadedJob.customerId },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (c) {
        ctx.customerName = c.name || '';
        ctx.customerPhone = c.phone || '';
        ctx.customerEmail = c.email || '';
      }
    } catch (err) {
      console.error('[ai/compose-message] Failed to load job customer:', err);
    }
  }
  if (
    !ctx.customerName &&
    loadedInvoice?.customerId &&
    loadedInvoice.customerId !== req.customerId &&
    loadedInvoice.customerId !== loadedJob?.customerId
  ) {
    try {
      const c = await db.customer.findUnique({
        where: { id: loadedInvoice.customerId },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (c) {
        ctx.customerName = c.name || '';
        ctx.customerPhone = c.phone || '';
        ctx.customerEmail = c.email || '';
      }
    } catch (err) {
      console.error('[ai/compose-message] Failed to load invoice customer:', err);
    }
  }

  if (loadedJob) {
    ctx.jobTitle = loadedJob.title || '';
    ctx.assigneeName = loadedJob.assigneeName || '';
    ctx.scheduledDate = fmtDateOnly(loadedJob.scheduledAt);
    ctx.jobStatus = loadedJob.status || '';
    ctx.jobNotes = loadedJob.notes || '';
  }

  if (loadedInvoice) {
    ctx.invoiceNumber = loadedInvoice.number || '';
    ctx.invoiceAmount =
      typeof loadedInvoice.amount === 'number' && loadedInvoice.amount > 0
        ? formatCurrency(loadedInvoice.amount, loadedInvoice.currency || 'USD')
        : '';
    ctx.invoiceDueDate = fmtDateOnly(loadedInvoice.dueDate);
    ctx.invoiceStatus = loadedInvoice.status || '';
  }

  return ctx;
}

// ─── Prompt builders ───────────────────────────────────────────────────────

function buildSystemPrompt(channel: Channel, intent: string): string {
  const intentLabel = INTENT_LABELS[intent] || 'Custom message';
  const channelRules =
    channel === 'email'
      ? 'This is an EMAIL. You MUST include a concise "subject" line (max 70 chars) AND a "body". ' +
        'The body should be 2-4 short paragraphs, use proper salutation and sign-off, and total under 800 chars.'
      : channel === 'sms'
        ? 'This is an SMS. Keep the entire message under 320 characters. No subject line needed — omit the "subject" field. ' +
          'Be direct and skimmable. Use a friendly sign-off like "— CompanyName".'
        : channel === 'whatsapp'
          ? 'This is a WhatsApp message. Keep the entire message under 320 characters. No subject line needed — omit the "subject" field. ' +
            'You MAY use simple line breaks and a couple of relevant emojis (max 2). Be warm and conversational.'
          : 'This is an IN-APP notification. Keep the body under 400 characters. No subject line needed — omit the "subject" field. Be clear and actionable.';

  return `You are a professional customer-service message writer for a field-service company.
Write a ready-to-send customer-facing message for the following scenario:
  • Intent: ${intentLabel}
  • ${channelRules}

CRITICAL RULES:
1. Use ONLY the real data provided in the user message — write the customer's actual name, the job's actual title, the actual scheduled date, the actual invoice number/amount, etc. NEVER use {{placeholder}} tokens or made-up values.
2. If a piece of data is missing (e.g. no job title), write the message without referencing it — do NOT say "TBD" or "[job title]".
3. Match the requested tone exactly.
4. Be professional, concise, and warm. No filler phrases.
5. Incorporate any custom instructions the user provides.
6. Output ONLY a valid JSON object (no markdown, no code fences, no prose) with this shape:
   ${channel === 'email'
      ? '{ "subject": string, "body": string }'
      : '{ "body": string }'}
7. The "body" must be plain text (no HTML, no markdown bold). Newlines are fine.
8. Do NOT include any explanation outside the JSON.`;
}

function buildUserPrompt(
  ctx: ComposeContext,
  channel: Channel,
  intent: string,
  tone: Tone,
  customInstructions?: string,
): string {
  const intentLabel = INTENT_LABELS[intent] || 'Custom message';

  const lines: string[] = [];
  lines.push(`INTENT: ${intentLabel}`);
  lines.push(`CHANNEL: ${channel}`);
  lines.push(`TONE: ${tone}`);
  lines.push('');
  lines.push('— REAL CUSTOMER DATA (use these literal values; do not invent or substitute) —');
  lines.push(`Customer name: ${ctx.customerName || '(unknown)'}`);
  if (ctx.customerPhone) lines.push(`Customer phone: ${ctx.customerPhone}`);
  if (ctx.customerEmail) lines.push(`Customer email: ${ctx.customerEmail}`);
  if (ctx.companyName) lines.push(`Company name (sender): ${ctx.companyName}`);
  if (ctx.jobTitle) lines.push(`Job title: ${ctx.jobTitle}`);
  if (ctx.assigneeName) lines.push(`Technician / assignee name: ${ctx.assigneeName}`);
  if (ctx.scheduledDate) lines.push(`Scheduled date: ${ctx.scheduledDate}`);
  if (ctx.jobStatus) lines.push(`Job status: ${ctx.jobStatus}`);
  if (ctx.jobNotes) lines.push(`Job notes: ${ctx.jobNotes.slice(0, 400)}`);
  if (ctx.invoiceNumber) lines.push(`Invoice number: ${ctx.invoiceNumber}`);
  if (ctx.invoiceAmount) lines.push(`Invoice amount: ${ctx.invoiceAmount}`);
  if (ctx.invoiceDueDate) lines.push(`Invoice due date: ${ctx.invoiceDueDate}`);
  if (ctx.invoiceStatus) lines.push(`Invoice status: ${ctx.invoiceStatus}`);

  lines.push('');
  lines.push('— WHAT TO WRITE —');
  switch (intent) {
    case 'schedule_reminder':
      lines.push('Remind the customer of their upcoming scheduled service. Mention the job title and scheduled date. Reassure them the team will be on time. Invite them to reply with any questions.');
      break;
    case 'job_started':
      lines.push('Notify the customer that their job has just started. Reference the job title. Mention the assigned technician by name if available.');
      break;
    case 'on_the_way':
      lines.push('Notify the customer that the technician is on the way. Reference the technician by name if available. Mention the job title. Ask them to ensure access (gate, parking, pets, etc.).');
      break;
    case 'job_complete':
      lines.push('Notify the customer that their job is complete. Reference the job title. Thank them for choosing the company. Invite feedback.');
      break;
    case 'invoice_reminder':
      lines.push('Politely remind the customer about an unpaid invoice. Reference the invoice number, the amount, and the due date. Make it clear how to pay (assume a generic "pay online" link if you do not have one). Be polite, not threatening.');
      break;
    case 'thank_you':
      lines.push('Send a warm thank-you message to the customer after their service. Reference the job title if available. Invite them to use the company again and leave feedback.');
      break;
    case 'custom':
      lines.push('Use the custom instructions below as the primary guidance for what to write. Still use the real customer data above.');
      break;
    default:
      lines.push('Write a relevant customer-facing message for this intent.');
  }

  if (customInstructions && customInstructions.trim().length > 0) {
    lines.push('');
    lines.push('— CUSTOM INSTRUCTIONS (from the user; obey these) —');
    lines.push(customInstructions.trim().slice(0, 800));
  }

  lines.push('');
  lines.push(`Return ONLY the JSON object now (${channel === 'email' ? 'with "subject" and "body"' : 'with "body" only'}). No markdown, no commentary.`);

  return lines.join('\n');
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // 2. Parse + validate body
    const body = (await request.json().catch(() => null)) as ComposeRequest | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const customerId = (body.customerId || '').trim();
    const intent = (body.intent || '').trim();
    const toneRaw = (body.tone || '').trim();
    const channelRaw = (body.channel || '').trim();

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required.' }, { status: 400 });
    }
    if (!intent) {
      return NextResponse.json({ error: 'intent is required.' }, { status: 400 });
    }
    if (!toneRaw) {
      return NextResponse.json({ error: 'tone is required.' }, { status: 400 });
    }
    if (!channelRaw) {
      return NextResponse.json({ error: 'channel is required.' }, { status: 400 });
    }

    if (!VALID_CHANNELS.includes(channelRaw as Channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!VALID_TONES.includes(toneRaw as Tone)) {
      return NextResponse.json(
        { error: `tone must be one of: ${VALID_TONES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!INTENT_LABELS[intent]) {
      return NextResponse.json(
        { error: `intent must be one of: ${Object.keys(INTENT_LABELS).join(', ')}` },
        { status: 400 },
      );
    }

    const channel = channelRaw as Channel;
    const tone = toneRaw as Tone;
    const customInstructions = body.customInstructions?.trim() || undefined;

    // 3. AI service check (503 if not configured). We check this BEFORE
    //    loading DB context so the client gets a fast, clear "not configured"
    //    signal and can show the right message — no point doing DB work that
    //    will never reach the LLM.
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Set OPENROUTER_API_KEY.' },
        { status: 503 },
      );
    }

    // 4. Load real DB context (customer / job / invoice / tenant).
    const ctx = await loadContext(user, body);

    // 5. Build prompts.
    const system = buildSystemPrompt(channel, intent);
    const userPrompt = buildUserPrompt(ctx, channel, intent, tone, customInstructions);

    // 6. Call OpenRouter (json mode). On failure, surface a 502 so the
    //    client can show a retry-friendly message.
    let raw: string;
    let model: string;
    try {
      const result = await callOpenRouter({
        system,
        user: userPrompt,
        json: true,
        temperature: 0.7,
        maxTokens: 1024,
      });
      raw = result.content;
      model = result.model;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ai/compose-message] callOpenRouter failed:', msg);
      return NextResponse.json(
        { error: `AI generation failed: ${msg.slice(0, 200)}` },
        { status: 502 },
      );
    }

    // 7. Parse the JSON response.
    let parsed: Partial<ComposeMessage> = {};
    try {
      parsed = extractJson<Partial<ComposeMessage>>(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI returned a response that could not be parsed as JSON.', raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    const generatedBody =
      typeof parsed.body === 'string' && parsed.body.trim().length > 0
        ? parsed.body.trim()
        : '';
    const generatedSubject =
      typeof parsed.subject === 'string' && parsed.subject.trim().length > 0
        ? parsed.subject.trim()
        : undefined;

    if (!generatedBody) {
      return NextResponse.json(
        { error: 'AI returned an empty message body. Please try again.', raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    // 8. Return 200 with the composed message. Omit subject for non-email
    //    channels even if the AI emitted one (it shouldn't, but be defensive).
    const response: ComposedMessage & { model?: string } = {
      body: generatedBody,
      ...(channel === 'email' && generatedSubject ? { subject: generatedSubject } : {}),
      model,
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compose message';
    console.error('[/api/ai/compose-message] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
