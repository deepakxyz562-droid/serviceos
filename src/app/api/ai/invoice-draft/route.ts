import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * AI Invoice Draft (ServiceOS V1.5)
 * ---------------------------------
 * POST /api/ai/invoice-draft
 *
 * Given a jobId, the LLM reads the full job context (title, description,
 * services, parts, checklist, time tracking, photos) and returns a draft
 * invoice the billing team can review and post:
 *
 *   {
 *     description: string,
 *     lineItems: [{ name, quantity, unitPrice, total }],
 *     notes: string,
 *     paymentTerms: string (e.g. "Net 15")
 *   }
 *
 * Pattern mirrors /api/ai/field-assistant/route.ts:
 *   - getAuthUser() + tenantId scoping
 *   - dynamic ZAI import via getZai() helper
 *   - callLLM() wrapper with response_format: { type: 'json_object' }
 *   - ActivityLog audit entry (non-fatal)
 *   - friendly 503 / 502 error envelopes
 *
 * Companion to /api/jobs/generate-invoice (which creates a draft invoice
 * row directly with a fixed unit-price heuristic). This endpoint returns
 * AI-generated line items + description so the UI can pre-fill the
 * create-invoice dialog with smarter content before the user POSTs to
 * /api/invoices or /api/jobs/generate-invoice.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  jobId: string;
  workspaceId?: string;
}

interface DraftLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDraftResult {
  description: string;
  lineItems: DraftLineItem[];
  notes: string;
  paymentTerms: string;
}

// ─── Helpers (copied verbatim from field-assistant/route.ts) ──────────────

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
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/invoice-draft] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

async function callLLMJson(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
): Promise<{ text: string | null; error?: string }> {
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { text: null, error: 'AI returned an empty response. Please retry.' };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/invoice-draft] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

// ─── Context loader ────────────────────────────────────────────────────────

/**
 * Load the full job context needed to draft an invoice: job fields, customer,
 * line items (from lineItemsJson), checklists, photos, time entries. All
 * related loads are best-effort — any failure degrades gracefully.
 */
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
    },
  });

  if (!job) return null;

  // Job has no `service` relation — fetch the linked Service by id (best-effort).
  const service = job.serviceId
    ? await db.service.findUnique({
        where: { id: job.serviceId },
        select: { id: true, name: true, basePrice: true, duration: true },
      }).catch(() => null)
    : null;

  // Best-effort parallel loads for related context.
  const [photos, checklists, timeEntries] = await Promise.all([
    db.jobPhoto.findMany({
      where: { jobId },
      orderBy: { capturedAt: 'desc' },
      take: 12,
      select: { id: true, photoType: true, caption: true, notes: true, capturedAt: true, capturedByName: true },
    }).catch(() => []),
    db.jobChecklist.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, status: true, itemsJson: true, completedAt: true, completedByName: true },
    }).catch(() => []),
    db.jobTimeEntry.findMany({
      where: { jobId, status: 'completed' },
      orderBy: { endedAt: 'desc' },
      take: 10,
      select: { id: true, startedAt: true, endedAt: true, durationMinutes: true, workingMinutes: true, pauseMinutes: true, entryType: true, notes: true },
    }).catch(() => []),
  ]);

  return { job, service, photos, checklists, timeEntries };
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

    const body = (await request.json()) as RequestBody;
    if (!body || !body.jobId) {
      return NextResponse.json(
        { error: 'jobId is required.' },
        { status: 400 },
      );
    }

    // Load the job + related context first — return 404 BEFORE spending tokens
    // if the job doesn't exist (or isn't in the caller's tenant).
    const ctx = await loadJobContext(body.jobId, tenantId);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Job not found (or not in your tenant).' },
        { status: 404 },
      );
    }
    const { job, service, photos, checklists, timeEntries } = ctx;

    // Get the ZAI client.
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      const errMsg =
        zaiResult?.error ||
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.';
      return NextResponse.json({ error: errMsg }, { status: 503 });
    }

    const lineItemsJson = safeJsonParse<any[]>(job.lineItemsJson, []);
    const totalMinutes = timeEntries.reduce((s, t) => s + (t.workingMinutes || 0), 0);

    const systemPrompt =
      'You are an expert field-service billing specialist. Given a job with all its context (description, ' +
      'line items negotiated, time tracking, checklist completion, photos, customer), produce a clean, ' +
      'professional invoice draft. Include line items for labor, materials/parts, and any service fees. ' +
      'Prices should be in USD and reflect typical industry rates. ' +
      'Always respond as a single JSON object — no markdown, no prose, no code fences. ' +
      'The JSON shape MUST be exactly: ' +
      '{"description": string (1-2 sentence summary of the work performed), ' +
      '"lineItems": [{"name": string, "quantity": number, "unitPrice": number, "total": number}], ' +
      '"notes": string (thank-you + payment instructions), "paymentTerms": string (e.g. "Net 15")}';

    const userPrompt = `JOB:
Title: ${job.title}
Type: ${job.type}
Status: ${job.status}
Description: ${truncate(job.description || '—', 600)}
Priority: ${job.priority}
Customer: ${job.customerName || job.customer?.name || '—'}
Assignee: ${job.assigneeName || job.assignee?.name || '—'}
Service: ${service?.name || '—'}${service?.basePrice ? ` (base $${service.basePrice})` : ''}
Quoted amount: ${job.quotedAmount ? '$' + job.quotedAmount : '—'}
Estimated duration: ${job.estimatedDuration ? job.estimatedDuration + ' min' : '—'}
${job.completedAt ? 'Completed: ' + fmtDate(job.completedAt) : ''}

NEGOTIATED LINE ITEMS (from the job — use these as a starting point):
${lineItemsJson.length > 0
  ? lineItemsJson.map((li: any) => `- ${li.description || li.name || 'item'} × ${li.quantity || 1} @ ${li.rate ?? li.unitPrice ?? li.price ?? 0}`).join('\n')
  : '(none)'}

TIME TRACKING:
- Total working time: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)
- Time entries: ${timeEntries.length}

CHECKLISTS COMPLETED (${checklists.length}):
${checklists.length > 0
  ? checklists.map((c) => {
      const items = safeJsonParse<any[]>(c.itemsJson, []);
      const checked = items.filter((i) => i.checked).length;
      return `- ${c.name} [${c.status}] — ${checked}/${items.length} items${c.completedByName ? ' by ' + c.completedByName : ''}`;
    }).join('\n')
  : '(none)'}

PHOTOS CAPTURED (${photos.length}):
${photos.length > 0
  ? photos.map((p) => `- [${p.photoType}]${p.caption ? ' ' + p.caption : ''}${p.notes ? ' — ' + truncate(p.notes, 100) : ''} (${fmtDate(p.capturedAt)})`).join('\n')
  : '(none)'}

JOB NOTES (from technician):
${truncate(job.notes || '—', 400)}

Build an invoice draft as a single JSON object. Each lineItem.total MUST equal quantity * unitPrice.`;

    const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.5);
    if (result.error || !result.text) {
      return NextResponse.json(
        { error: result.error || 'AI returned an empty response.' },
        { status: 502 },
      );
    }

    let parsed: Partial<InvoiceDraftResult> = {};
    try {
      parsed = JSON.parse(result.text) as Partial<InvoiceDraftResult>;
    } catch {
      return NextResponse.json(
        { error: 'AI response was not valid JSON.', raw: result.text },
        { status: 502 },
      );
    }

    // Sanitize + recompute math defensively.
    const lineItems: DraftLineItem[] = Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .filter((li): li is DraftLineItem =>
            !!li && typeof li === 'object' && typeof li.name === 'string' && li.name.trim().length > 0,
          )
          .map((li) => {
            const quantity = Number(li.quantity) > 0 ? Number(li.quantity) : 1;
            const unitPrice = Number.isFinite(Number(li.unitPrice)) ? Number(li.unitPrice) : 0;
            return {
              name: String(li.name).trim().slice(0, 200),
              quantity,
              unitPrice,
              total: Number((quantity * unitPrice).toFixed(2)),
            };
          })
          .slice(0, 30)
      : [];

    // If the model failed to produce any line items, fall back to a single
    // labor line based on the quotedAmount (or estimated duration).
    if (lineItems.length === 0) {
      const unitPrice = job.quotedAmount
        ? Number(job.quotedAmount)
        : job.estimatedDuration
          ? job.estimatedDuration * 5 // $5/min — matches /api/jobs/generate-invoice heuristic
          : 150;
      lineItems.push({
        name: `${job.title} — Labor`,
        quantity: 1,
        unitPrice,
        total: unitPrice,
      });
    }

    const draft: InvoiceDraftResult = {
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim().slice(0, 500)
          : `${job.title} — Service performed`,
      lineItems,
      notes:
        typeof parsed.notes === 'string' && parsed.notes.trim()
          ? parsed.notes.trim().slice(0, 1000)
          : 'Thank you for your business. Payment due within 15 days.',
      paymentTerms:
        typeof parsed.paymentTerms === 'string' && parsed.paymentTerms.trim()
          ? parsed.paymentTerms.trim().slice(0, 50)
          : 'Net 15',
    };

    // Log the AI query (non-fatal).
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'invoice',
        entityId: job.id,
        entityName: job.title,
        description: `AI invoice-draft for "${truncate(job.title, 80)}" → ${draft.lineItems.length} line items`,
        metadataJson: JSON.stringify({
          action: 'invoice_draft',
          jobId: job.id,
          lineItemCount: draft.lineItems.length,
          paymentTerms: draft.paymentTerms,
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[ai/invoice-draft] logActivity failed:', logErr);
    }

    return NextResponse.json(draft);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    console.error('[/api/ai/invoice-draft] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
