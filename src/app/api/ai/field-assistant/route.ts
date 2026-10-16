import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { checkAiQuota, trackAiUsage } from '@/lib/ai-usage-tracker';
import { callAI } from '@/lib/ai-client';

/**
 * AI Field Assistant (Fieseros V1.5)
 * -----------------------------------
 * A single POST endpoint that powers LLM-backed actions for field technicians:
 *   - summarize_customer  → concise customer-history summary
 *   - troubleshoot        → troubleshooting steps for the asset/issue
 *   - completion_notes    → professional job-completion notes
 *   - polish_notes        → polish raw notes / voice dictation into clear summary
 *   - upsell              → upsell service recommendations
 *   - draft_message       → draft SMS/Email/WhatsApp message
 *   - ask                 → free-form Q&A with context
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type Action =
  | 'summarize_customer'
  | 'troubleshoot'
  | 'completion_notes'
  | 'polish_notes'
  | 'upsell'
  | 'draft_message'
  | 'ask';

interface RequestBody {
  jobId: string;
  action: Action;
  question?: string;
  context?: string;
  rawNotes?: string;
  messageType?: 'sms' | 'email' | 'whatsapp';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

/**
 * Get an initialized z-ai-web-dev-sdk client. Returns null + a friendly
 * error message if the SDK isn't available (e.g. missing API key).
 */
async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/field-assistant] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

/**
 * Multi-provider callLLM wrapper.
 * Attempts callAI() first (OpenRouter → OpenAI → Anthropic → Gemini),
 * then falls back to ZAI SDK.
 */
async function callLLM(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
): Promise<{ text: string | null; error?: string }> {
  try {
    const aiRes = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature });
    if (aiRes && aiRes.text && aiRes.text.trim()) {
      return { text: aiRes.text };
    }
  } catch (aiErr) {
    console.warn('[ai/field-assistant] callAI failed, trying zai fallback:', aiErr);
  }

  if (zai) {
    try {
      const response = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      });
      const text = response?.choices?.[0]?.message?.content;
      if (text && typeof text === 'string' && text.trim().length > 0) {
        return { text };
      }
    } catch (err) {
      console.error('[ai/field-assistant] zai fallback failed:', err);
    }
  }

  return { text: null, error: 'AI service could not be reached. Please check AI provider settings.' };
}

// ─── Context loaders ───────────────────────────────────────────────────────
// Each loader pulls the relevant records for a job and returns a structured
// object that the action handler can serialize into the prompt.

async function loadJobContext(jobId: string, tenantId: string) {
  // The Job model uses workspaceId (not tenantId) — find all workspaceIds
  // for this tenant so we can scope the query correctly.
  const workspaces = await db.workspace.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const workspaceIds = workspaces.map((w) => w.id);

  const job = await db.job.findFirst({
    where: {
      id: jobId,
      OR: [
        { workspaceId: { in: workspaceIds } },
        // Fallback — some legacy rows may not have a workspaceId set.
        ...(workspaceIds.length === 0 ? [{}] : []),
      ],
    },
    include: {
      customer: true,
      assignee: true,
      invoices: { select: { id: true, number: true, total: true, status: true, currency: true, createdAt: true, paidAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
    },
  });

  return job;
}

async function loadCustomerAssets(customerId: string) {
  if (!customerId) return [];
  try {
    return await db.customerAsset.findMany({
      where: { customerId, status: { not: 'disposed' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  } catch {
    return [];
  }
}

async function loadCustomerTimeline(customerId: string, tenantId: string) {
  if (!customerId) return [];
  try {
    return await db.customerTimelineEntry.findMany({
      where: { customerId, tenantId },
      orderBy: { eventDate: 'desc' },
      take: 30,
      select: {
        id: true,
        entryType: true,
        title: true,
        description: true,
        actorName: true,
        actorType: true,
        eventDate: true,
        metadataJson: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadJobPhotos(jobId: string) {
  try {
    return await db.jobPhoto.findMany({
      where: { jobId },
      orderBy: { capturedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        photoType: true,
        caption: true,
        notes: true,
        capturedAt: true,
        capturedByName: true,
        url: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadJobChecklists(jobId: string) {
  try {
    return await db.jobChecklist.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        itemsJson: true,
        completedAt: true,
        completedByName: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadJobTimeEntries(jobId: string) {
  try {
    return await db.jobTimeEntry.findMany({
      where: { jobId, status: 'completed' },
      orderBy: { endedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        durationMinutes: true,
        workingMinutes: true,
        pauseMinutes: true,
        entryType: true,
        notes: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadAssetServiceHistory(assetIds: string[]) {
  if (assetIds.length === 0) return [];
  try {
    return await db.assetServiceHistory.findMany({
      where: { assetId: { in: assetIds } },
      orderBy: { serviceDate: 'desc' },
      take: 20,
    });
  } catch {
    return [];
  }
}

// ─── Action handlers ───────────────────────────────────────────────────────

interface ActionResult {
  text: string;
  error?: never;
}
interface ActionError {
  text?: never;
  error: string;
  status?: number;
}

async function handleSummarizeCustomer(
  zai: any,
  job: any,
  tenantId: string,
): Promise<ActionResult | ActionError> {
  if (!job.customerId) {
    return { error: 'No customer linked to this job — cannot summarize history.' };
  }
  const [timeline, assets] = await Promise.all([
    loadCustomerTimeline(job.customerId, tenantId),
    loadCustomerAssets(job.customerId),
  ]);

  const recentJobs = await db.job.findMany({
    where: { customerId: job.customerId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      scheduledAt: true,
      actualStartTime: true,
      completedAt: true,
      quotedAmount: true,
      assigneeName: true,
    },
  });

  const invoices = job.invoices || [];

  const systemPrompt =
    'You are an expert field-service assistant. Summarize the customer\'s history for a technician who is about to visit them. ' +
    'Be concise, structured, and focus on actionable insights: prior issues, recurring services, equipment that may need attention, payment patterns, and any red flags. ' +
    'Use markdown-style formatting (bullets, bold) for readability. Keep it under 250 words.';

  const userPrompt = `Customer: ${job.customer?.name || 'Unknown'}
Phone: ${job.customer?.phone || '—'}
Email: ${job.customer?.email || '—'}
Address: ${job.customer?.address || '—'}

RECENT TIMELINE ENTRIES (${timeline.length}):
${timeline
  .map(
    (t) =>
      `- [${fmtDate(t.eventDate)}] (${t.entryType}) ${t.title}${t.description ? ' — ' + truncate(t.description, 120) : ''}${t.actorName ? ` [by ${t.actorName}]` : ''}`,
  )
  .join('\n') || '(none)'}

CUSTOMER ASSETS (${assets.length}):
${assets
  .map(
    (a) =>
      `- ${a.name} (${a.assetType}${a.brand ? ', ' + a.brand : ''}${a.model ? ' ' + a.model : ''}) — status: ${a.status}, warranty: ${a.warrantyStatus}${a.location ? ', location: ' + a.location : ''}`,
  )
  .join('\n') || '(none)'}

RECENT JOBS (${recentJobs.length}):
${recentJobs
  .map(
    (j) =>
      `- ${j.title} [${j.status}]${j.assigneeName ? ' — ' + j.assigneeName : ''}${j.scheduledAt ? ' · ' + fmtDate(j.scheduledAt) : ''}${j.quotedAmount ? ' · $' + j.quotedAmount : ''}`,
  )
  .join('\n') || '(none)'}

RECENT INVOICES (${invoices.length}):
${invoices
  .map(
    (i) =>
      `- ${i.number} [${i.status}] ${i.currency} ${i.total}${i.paidAt ? ' — paid ' + fmtDate(i.paidAt) : ''}`,
  )
  .join('\n') || '(none)'}

Please summarize this customer's history for the visiting technician.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.5);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handleTroubleshoot(
  zai: any,
  job: any,
  tenantId: string,
): Promise<ActionResult | ActionError> {
  const assets = job.customerId ? await loadCustomerAssets(job.customerId) : [];

  const systemPrompt =
    'You are an expert universal field-service troubleshooter across all trades (cleaning, plumbing, electrical, HVAC, pest control, landscaping, appliance repair, roofing, painting, handyman, pool care, etc.). ' +
    'Given the job details, service type, and any customer equipment, ' +
    'provide clear, step-by-step diagnostic and troubleshooting instructions tailored to that exact trade. Start with the most likely causes. ' +
    'Use numbered steps, with safety warnings where appropriate (electrical lock-out, PPE, chemical dilution, water shut-off). Mention any tools or supplies needed. ' +
    'Use markdown formatting. Keep it practical, professional, and under 350 words.';

  const userPrompt = `JOB DETAILS:
Title: ${job.title}
Service Category: ${job.service?.name || job.type || 'General Service'}
Description: ${truncate(job.description || '—', 600)}
Priority: ${job.priority}
Type: ${job.type}
Notes: ${truncate(job.notes || '—', 400)}
Visit instructions: ${truncate(job.visitInstructions || '—', 400)}

CUSTOMER ASSETS / EQUIPMENT (${assets.length}):
${assets
  .map(
    (a) =>
      `- ${a.name} (${a.assetType})${a.brand ? ' Brand: ' + a.brand : ''}${a.model ? ' Model: ' + a.model : ''}${a.serialNumber ? ' Serial: ' + a.serialNumber : ''}${a.notes ? ' Notes: ' + truncate(a.notes, 200) : ''}`,
  )
  .join('\n') || '(none linked to this customer)'}

Provide troubleshooting and diagnostic steps for this service job.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.6);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handleCompletionNotes(
  zai: any,
  job: any,
): Promise<ActionResult | ActionError> {
  const [photos, checklists, timeEntries] = await Promise.all([
    loadJobPhotos(job.id),
    loadJobChecklists(job.id),
    loadJobTimeEntries(job.id),
  ]);

  const totalMinutes = timeEntries.reduce(
    (sum, t) => sum + (t.workingMinutes || 0),
    0,
  );

  const systemPrompt =
    'You are a professional field-service technician writing completion notes for a finished job. ' +
    'Write in a clear, professional tone that the customer could read. ' +
    'Include: work performed, parts replaced (if any), findings, time spent, and any follow-up recommendations. ' +
    'Use markdown with sections (Work Performed, Findings, Recommendations). Keep it under 300 words.';

  const userPrompt = `JOB:
Title: ${job.title}
Description: ${truncate(job.description || '—', 400)}
Type: ${job.type}
Status: ${job.status}
Customer: ${job.customerName || '—'}
Assignee: ${job.assigneeName || '—'}
Notes from technician: ${truncate(job.notes || '—', 400)}
Visit instructions: ${truncate(job.visitInstructions || '—', 300)}

PHOTOS CAPTURED (${photos.length}):
${photos
  .map((p) => `- [${p.photoType}]${p.caption ? ' ' + p.caption : ''}${p.notes ? ' — ' + truncate(p.notes, 100) : ''} (${fmtDate(p.capturedAt)})`)
  .join('\n') || '(none)'}

CHECKLISTS (${checklists.length}):
${checklists
  .map((c) => {
    const items = safeJsonParse<any[]>(c.itemsJson, []);
    const checked = items.filter((i) => i.checked).length;
    return `- ${c.name} [${c.status}] — ${checked}/${items.length} items checked${c.completedByName ? ' by ' + c.completedByName : ''}`;
  })
  .join('\n') || '(none)'}

TIME TRACKING:
- Total working time: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)
- Time entries: ${timeEntries.length}

Please generate professional completion notes for this job.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.5);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handleUpsell(
  zai: any,
  job: any,
  tenantId: string,
): Promise<ActionResult | ActionError> {
  if (!job.customerId) {
    return { error: 'No customer linked to this job — cannot recommend upsells.' };
  }
  const [assets, serviceHistory, recentJobs] = await Promise.all([
    loadCustomerAssets(job.customerId),
    loadAssetServiceHistory([]), // populated below if assets exist
    db.job.findMany({
      where: { customerId: job.customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, type: true, createdAt: true },
    }),
  ]);

  // Pull service history for the customer's assets.
  const assetIds = assets.map((a) => a.id);
  const history = assetIds.length > 0 ? await loadAssetServiceHistory(assetIds) : [];

  const systemPrompt =
    'You are a field-service business advisor. Based on the customer\'s equipment, service history, and recent jobs, ' +
    'recommend 3-5 specific upsell opportunities (e.g. annual maintenance contracts, filter replacements, warranty extensions, accessory add-ons). ' +
    'For each, explain the benefit to the customer and an approximate price range. ' +
    'Use markdown with a numbered list and bold titles. Be specific and practical — no fluff.';

  const userPrompt = `CURRENT JOB: ${job.title} (type: ${job.type})
Customer: ${job.customerName || '—'}

CUSTOMER ASSETS (${assets.length}):
${assets
  .map(
    (a) =>
      `- ${a.name} (${a.assetType}, ${a.brand || 'unknown brand'} ${a.model || ''}) — installed: ${a.installationDate ? fmtDate(a.installationDate) : '—'}, warranty: ${a.warrantyStatus}${a.warrantyEnd ? ' until ' + fmtDate(a.warrantyEnd) : ''}`,
  )
  .join('\n') || '(none)'}

SERVICE HISTORY (${history.length}):
${history
  .map(
    (h) =>
      `- ${h.serviceType || 'service'} on ${fmtDate(h.serviceDate)}${h.notes ? ' — ' + truncate(h.notes, 120) : ''}${h.cost ? ' ($' + h.cost + ')' : ''}${h.nextServiceDate ? ' · next: ' + fmtDate(h.nextServiceDate) : ''}`,
  )
  .join('\n') || '(none)'}

RECENT JOBS (${recentJobs.length}):
${recentJobs
  .map((j) => `- ${j.title} [${j.status}] ${fmtDate(j.createdAt)}`)
  .join('\n') || '(none)'}

Recommend 3-5 upsell services for this customer.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.7);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handleDraftMessage(
  zai: any,
  job: any,
  body: RequestBody,
): Promise<ActionResult | ActionError> {
  const messageType = body.messageType || 'email';
  const customerName = job.customer?.name || job.customerName || 'Customer';

  const systemPrompt =
    'You are a professional field-service communication assistant. Draft a message from the service company to the customer. ' +
    `The message will be sent via ${messageType.toUpperCase()}. ` +
    (messageType === 'sms' || messageType === 'whatsapp'
      ? 'Keep it under 300 characters, friendly, and include only essential info.'
      : 'Use a professional tone with a clear subject line and a brief, friendly body.');

  const userPrompt = `Company: (the service company)
Customer: ${customerName}
Job: ${job.title}
Status: ${job.status}
Scheduled: ${job.scheduledAt ? fmtDate(job.scheduledAt) : '—'}
Assignee: ${job.assigneeName || '—'}
Address: ${job.address || '—'}

Additional context from technician: ${body.context ? truncate(body.context, 400) : '(none)'}

Draft a ${messageType} message to the customer about this job.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.7);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handleAsk(
  zai: any,
  job: any,
  tenantId: string,
  body: RequestBody,
): Promise<ActionResult | ActionError> {
  const question = (body.question || '').trim();
  if (!question) {
    return { error: 'Please provide a question.', status: 400 };
  }

  const [assets, timeline] = job
    ? await Promise.all([
        job.customerId ? loadCustomerAssets(job.customerId) : Promise.resolve([]),
        job.customerId ? loadCustomerTimeline(job.customerId, tenantId) : Promise.resolve([]),
      ])
    : [[], []];

  const systemPrompt =
    'You are an expert universal AI Field-Service Copilot assisting field technicians across all service industries ' +
    '(cleaning, plumbing, electrical, HVAC, pest control, landscaping, appliance repair, roofing, painting, handyman, pool care, etc.). ' +
    'Provide clear, safety-first, step-by-step guidance tailored to the technician’s trade and question. ' +
    'Highlight safety warnings (power shut-off, chemical dilution, PPE, gas/water isolation) where applicable. ' +
    'Be concise, practical, and use markdown formatting where helpful.';

  const userPrompt = job
    ? `JOB CONTEXT:
Title: ${job.title}
Service Category: ${job.service?.name || job.type || 'General Service'}
Description: ${truncate(job.description || '—', 600)}
Status: ${job.status}
Priority: ${job.priority}
Customer: ${job.customerName || '—'}
Address: ${job.address || '—'}
Assignee: ${job.assigneeName || '—'}

CUSTOMER ASSETS / EQUIPMENT:
${assets
  .map(
    (a) =>
      `- ${a.name} (${a.assetType}, ${a.brand || ''} ${a.model || ''})${a.serialNumber ? ' SN: ' + a.serialNumber : ''}`,
  )
  .join('\n') || '(none)'}

TECHNICIAN'S QUESTION:
${question}

Please provide clear, professional, trade-appropriate step-by-step guidance.`
    : `TECHNICIAN'S FIELD QUESTION:
${question}

Please provide clear, professional, safety-minded step-by-step guidance for this field question.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.6);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

async function handlePolishNotes(
  zai: any,
  job: any,
  body: RequestBody,
): Promise<ActionResult | ActionError> {
  const rawNotes = (body.rawNotes || body.context || '').trim();
  if (!rawNotes) {
    return { error: 'Please provide notes to polish.', status: 400 };
  }

  const systemPrompt =
    'You are a professional field-service documentation assistant. ' +
    'The technician has provided raw, quick notes or voice dictation from on-site work. ' +
    'Transform them into a clean, well-formatted, professional work summary. ' +
    'Use concise sections:\n' +
    '• Work Performed: Clear summary of service/repairs completed.\n' +
    '• Parts / Materials: Any parts replaced or materials used.\n' +
    '• System Test & Verification: Operational checks and test results.\n' +
    '• Recommendations: Any preventative tips or future actions.\n' +
    'Correct any spelling, abbreviations, or grammar issues while maintaining all technical specifics. Keep it practical and under 250 words.';

  const userPrompt = `Job: ${job.title}
Customer: ${job.customerName || 'Customer'}
Address: ${job.address || 'Job Site'}

Raw technician notes:
"${rawNotes}"

Please polish and format these notes into clear, professional summary.`;

  const result = await callLLM(zai, systemPrompt, userPrompt, 0.4);
  if (result.error) return { error: result.error };
  return { text: result.text! };
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenantId for this user.' },
        { status: 400 },
      );
    }

    // AI quota check — refuse if tenant is over their plan's AI call limit
    const quotaCheck = await checkAiQuota(tenantId);
    if (!quotaCheck.ok) return quotaCheck.response;

    const body = (await request.json()) as RequestBody;
    if (!body || !body.action) {
      return NextResponse.json(
        { error: 'action is required.' },
        { status: 400 },
      );
    }

    const validActions: Action[] = [
      'summarize_customer',
      'troubleshoot',
      'completion_notes',
      'polish_notes',
      'upsell',
      'draft_message',
      'ask',
    ];
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { error: `Unknown action: ${body.action}` },
        { status: 400 },
      );
    }

    // Load the job + customer context if jobId is provided
    let job: any = null;
    if (body.jobId) {
      job = await loadJobContext(body.jobId, tenantId);
      if (!job && body.action !== 'ask') {
        return NextResponse.json(
          { error: 'Job not found (or not in your tenant).' },
          { status: 404 },
        );
      }
    } else if (body.action !== 'ask') {
      return NextResponse.json(
        { error: 'jobId is required for this action.' },
        { status: 400 },
      );
    }

    // Optional ZAI client for fallback
    const zaiResult = await getZai().catch(() => null);
    const zai = zaiResult?.zai || null;

    // Dispatch to the appropriate handler.
    let result: ActionResult | ActionError;
    switch (body.action) {
      case 'summarize_customer':
        result = await handleSummarizeCustomer(zai, job, tenantId);
        break;
      case 'troubleshoot':
        result = await handleTroubleshoot(zai, job, tenantId);
        break;
      case 'completion_notes':
        result = await handleCompletionNotes(zai, job);
        break;
      case 'polish_notes':
        result = await handlePolishNotes(zai, job, body);
        break;
      case 'upsell':
        result = await handleUpsell(zai, job, tenantId);
        break;
      case 'draft_message':
        result = await handleDraftMessage(zai, job, body);
        break;
      case 'ask':
      default:
        result = await handleAsk(zai, job, tenantId, body);
        break;
    }

    // Log the AI query to ActivityLog (non-fatal).
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'job',
        entityId: job?.id || 'field-assistant',
        entityName: job?.title || 'Universal Field AI',
        description: `AI query [${body.action}]${body.question ? `: ${truncate(body.question, 120)}` : ''}${result.error ? ' — FAILED' : ''}`,
        metadataJson: JSON.stringify({
          action: body.action,
          jobId: job?.id ?? null,
          question: body.question ?? null,
          messageType: body.messageType ?? null,
          success: !result.error,
          error: result.error ?? null,
        }),
        severity: result.error ? 'warning' : 'info',
      });
    } catch (logErr) {
      console.error('[ai/field-assistant] logActivity failed:', logErr);
    }

    if ('error' in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 502 },
      );
    }

    // Track AI usage (best-effort, non-blocking)
    await trackAiUsage(tenantId);

    return NextResponse.json({
      action: body.action,
      jobId: job?.id ?? null,
      text: result.text,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    console.error('[/api/ai/field-assistant] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
