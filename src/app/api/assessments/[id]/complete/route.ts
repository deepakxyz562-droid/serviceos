import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * POST /api/assessments/[id]/complete
 * -----------------------------------
 * Mark an assessment as completed.
 *  - Sets status = 'completed' and completedAt = now
 *  - Persists findings, photos, measurements, signature (if supplied)
 *  - Optional `generateSummary: true`  → calls ZAI to produce aiSummary
 *  - Optional `generateQuote: true`    → calls ZAI to draft a Quote and links
 *    it back via `generatedQuoteId`
 *
 * Auth required + tenant scoping.
 *
 * Body:
 *   findings?:       Array<{ severity, description, recommendation }>
 *   measurements?:   Record<string, number | string>
 *   photos?:         Array<{ url, type, caption }>
 *   signatureUrl?:   string
 *   signedByName?:   string
 *   notes?:          string
 *   checklistResponses?: Record<string, unknown>
 *   generateSummary?: boolean (default false)
 *   generateQuote?:    boolean (default false)
 */

interface Finding {
  severity?: string;
  description?: string;
  recommendation?: string;
}

interface Photo {
  url?: string;
  type?: string;
  caption?: string;
}

// ─── ZAI helpers (mirror /api/ai/quote-draft pattern) ─────────────────────

async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { zai: null, error: `AI assistant not configured: ${msg}` };
  }
}

async function callLLMJson(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.6,
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
      return { text: null, error: 'AI returned an empty response.' };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: null, error: `AI call failed: ${msg}` };
  }
}

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/**
 * Generate a structured AI summary of the assessment findings.
 */
async function generateAssessmentSummary(assessment: {
  id: string;
  title: string;
  type: string;
  address: string | null;
  customerName: string | null;
  findingsJson: string;
  measurementsJson: string;
  notes: string | null;
  description: string | null;
}): Promise<{ summary: string | null; error?: string }> {
  const zaiResult = await getZai();
  if (!zaiResult?.zai) {
    return { summary: null, error: zaiResult?.error || 'AI not configured' };
  }

  let findings: Finding[] = [];
  let measurements: Record<string, unknown> = {};
  try {
    findings = JSON.parse(assessment.findingsJson || '[]');
  } catch {
    findings = [];
  }
  try {
    measurements = JSON.parse(assessment.measurementsJson || '{}');
  } catch {
    measurements = {};
  }

  const systemPrompt =
    'You are a senior field-service assessor. Given structured assessment data, ' +
    'write a concise, professional summary (max 3 short paragraphs) that: ' +
    '(1) states the assessment scope, (2) lists the key findings grouped by severity, ' +
    '(3) recommends next steps. Respond as a single JSON object: ' +
    '{"summary": string, "recommendedAction": string}';

  const userPrompt = `ASSESSMENT
title: ${assessment.title}
type: ${assessment.type}
address: ${assessment.address || '—'}
customer: ${assessment.customerName || '—'}
description: ${truncate(assessment.description, 600)}
notes: ${truncate(assessment.notes, 400)}

FINDINGS:
${JSON.stringify(findings, null, 2)}

MEASUREMENTS:
${JSON.stringify(measurements, null, 2)}`;

  const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.5);
  if (result.error || !result.text) {
    return { summary: null, error: result.error || 'Empty AI response' };
  }

  try {
    const parsed = JSON.parse(result.text) as { summary?: string };
    if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
      return { summary: parsed.summary.trim() };
    }
  } catch {
    // fall through
  }
  // If JSON parse fails, use the raw text as the summary (LLM may have ignored instructions).
  return { summary: result.text.trim().slice(0, 2000) };
}

/**
 * Generate a Quote draft from the assessment via the AI quote-draft endpoint
 * logic. We re-implement the call here (rather than HTTP-calling our own
 * route) so we can run it in the same request context.
 */
async function generateQuoteFromAssessment(
  assessment: {
    id: string;
    title: string;
    type: string;
    address: string | null;
    customerId: string | null;
    tenantId: string | null;
    findingsJson: string;
    measurementsJson: string;
    estimatedCost: number | null;
    currency: string;
    description: string | null;
  },
  authUserId: string,
  authUserName: string | null,
  authEmail: string,
): Promise<{ quoteId: string | null; error?: string }> {
  let findings: Finding[] = [];
  try {
    findings = JSON.parse(assessment.findingsJson || '[]');
  } catch {
    findings = [];
  }

  const customerNeed = [
    assessment.title,
    assessment.description ? `\n${assessment.description}` : '',
    findings.length > 0 ? `\nFindings: ${JSON.stringify(findings)}` : '',
    assessment.estimatedCost != null
      ? `\nEstimated cost: ${assessment.estimatedCost} ${assessment.currency}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!customerNeed) {
    return { quoteId: null, error: 'No assessment context to generate a quote from.' };
  }

  const zaiResult = await getZai();
  if (!zaiResult?.zai) {
    return { quoteId: null, error: zaiResult?.error || 'AI not configured' };
  }

  // Load tenant services for context
  let catalogText = '(no service catalog provided)';
  let services: Array<{ id: string; name: string; description: string | null; basePrice: number | null }> = [];
  if (assessment.tenantId) {
    try {
      services = await db.service.findMany({
        where: { tenantId: assessment.tenantId, isActive: true },
        orderBy: { name: 'asc' },
        take: 50,
        select: { id: true, name: true, description: true, basePrice: true },
      });
      if (services.length > 0) {
        catalogText = services
          .map(
            (s) =>
              `- ${s.name}${s.basePrice != null ? ` — base $${s.basePrice}` : ''}${s.description ? ` (${truncate(s.description, 80)})` : ''}`,
          )
          .join('\n');
      }
    } catch {
      // ignore — fallback to no catalog
    }
  }

  const systemPrompt =
    'You are a senior field-service sales engineer. Given assessment findings, ' +
    'produce a complete itemized quote draft in JSON. Each lineItem.total MUST equal ' +
    'quantity * unitPrice. subtotal = sum of lineItem.total. tax = subtotal * 0.08. ' +
    'total = subtotal + tax - discount. discount defaults to 0. ' +
    'Respond as JSON: {"lineItems":[{"name","description","quantity","unitPrice","total"}],' +
    '"laborHours":number,"laborCost":number,"tax":number,"discount":number,' +
    '"subtotal":number,"total":number,"notes":string}';

  const userPrompt = `ASSESSMENT CONTEXT:
${truncate(customerNeed, 1200)}

AVAILABLE SERVICE CATALOG:
${catalogText}

Build a quote draft as a single JSON object.`;

  const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.6);
  if (result.error || !result.text) {
    return { quoteId: null, error: result.error || 'Empty AI response' };
  }

  let parsed: {
    lineItems?: Array<{ name?: string; description?: string; quantity?: number; unitPrice?: number; total?: number }>;
    laborHours?: number;
    laborCost?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    total?: number;
    notes?: string;
  } = {};
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { quoteId: null, error: 'AI response was not valid JSON.' };
  }

  // Sanitize + recompute totals (don't trust LLM arithmetic)
  const lineItems = (parsed.lineItems || [])
    .filter((li) => li && typeof li === 'object' && typeof li.name === 'string' && li.name.trim())
    .map((li) => {
      const quantity = Number(li.quantity) > 0 ? Number(li.quantity) : 1;
      const unitPrice = Number.isFinite(Number(li.unitPrice)) ? Number(li.unitPrice) : 0;
      return {
        name: String(li.name).trim().slice(0, 200),
        description: typeof li.description === 'string' ? li.description.trim().slice(0, 500) : '',
        quantity,
        unitPrice,
        total: Number((quantity * unitPrice).toFixed(2)),
      };
    })
    .slice(0, 30);

  const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
  const discount = Number.isFinite(Number(parsed.discount)) && Number(parsed.discount) > 0
    ? Number(parsed.discount)
    : 0;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + tax - discount).toFixed(2));

  // Persist the Quote (status: draft, linked to the assessment via metadata
  // — Quote has no assessmentId FK so we keep the link only on Assessment.generatedQuoteId).
  try {
    const quote = await db.quote.create({
      data: {
        title: `Quote from assessment: ${assessment.title}`.slice(0, 200),
        description: `Auto-generated from assessment ${assessment.id}`,
        itemsJson: JSON.stringify(lineItems),
        addOnsJson: '[]',
        subtotal,
        discount,
        taxRate: 8,
        tax,
        total,
        currency: assessment.currency,
        status: 'draft',
        tenantId: assessment.tenantId,
        customerId: assessment.customerId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { quoteId: quote.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { quoteId: null, error: `Failed to persist quote: ${msg}` };
  }
}

// ─── Main route handler ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Assessment id is required' }, { status: 400 });
    }

    // Tenant-scoped fetch
    const where: Record<string, unknown> = { id };
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }
    const existing = await db.assessment.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json(
        { error: 'Assessment is already completed.' },
        { status: 409 },
      );
    }
    if (existing.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot complete a cancelled assessment.' },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      findings,
      measurements,
      photos,
      signatureUrl,
      signedByName,
      notes,
      checklistResponses,
      generateSummary = false,
      generateQuote = false,
    } = body as Record<string, unknown>;

    // ─── Persist rich completion data + flip status ───
    const updateData: Record<string, unknown> = {
      status: 'completed',
      completedAt: new Date(),
    };

    if (findings !== undefined) {
      updateData.findingsJson = JSON.stringify(Array.isArray(findings) ? findings : []);
    }
    if (measurements !== undefined) {
      updateData.measurementsJson = JSON.stringify(
        measurements && typeof measurements === 'object' ? measurements : {},
      );
    }
    if (photos !== undefined) {
      updateData.photosJson = JSON.stringify(Array.isArray(photos) ? photos : []);
    }
    if (checklistResponses !== undefined) {
      updateData.checklistResponsesJson = JSON.stringify(
        checklistResponses && typeof checklistResponses === 'object' ? checklistResponses : {},
      );
    }
    if (typeof notes === 'string') {
      updateData.notes = notes.trim() || null;
    }
    if (typeof signatureUrl === 'string' && signatureUrl.trim()) {
      updateData.signatureUrl = signatureUrl;
      updateData.signedAt = new Date();
      updateData.signedByName =
        typeof signedByName === 'string' && signedByName.trim()
          ? signedByName
          : authUser.name || authUser.email;
    }

    const assessment = await db.assessment.update({
      where: { id },
      data: updateData,
    });

    log.info(
      { userId: authUser.id, assessmentId: id, generateSummary, generateQuote },
      'Assessment marked completed',
    );

    // ─── Optional: AI summary ───
    let aiSummary: string | null = null;
    let aiSummaryError: string | null = null;
    if (generateSummary) {
      const result = await generateAssessmentSummary({
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        address: assessment.address,
        customerName: assessment.customerName,
        findingsJson: assessment.findingsJson,
        measurementsJson: assessment.measurementsJson,
        notes: assessment.notes,
        description: assessment.description,
      });
      if (result.summary) {
        aiSummary = result.summary;
        try {
          await db.assessment.update({
            where: { id },
            data: { aiSummary },
          });
        } catch (err) {
          log.warn({ err, assessmentId: id }, 'Failed to persist aiSummary');
        }
      } else {
        aiSummaryError = result.error || 'Unknown AI error';
        log.warn({ assessmentId: id, err: aiSummaryError }, 'AI summary generation failed');
      }
    }

    // ─── Optional: AI-generated Quote ───
    let generatedQuoteId: string | null = null;
    let quoteError: string | null = null;
    if (generateQuote) {
      const result = await generateQuoteFromAssessment(
        {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          address: assessment.address,
          customerId: assessment.customerId,
          tenantId: assessment.tenantId,
          findingsJson: assessment.findingsJson,
          measurementsJson: assessment.measurementsJson,
          estimatedCost: assessment.estimatedCost,
          currency: assessment.currency,
          description: assessment.description,
        },
        authUser.id,
        authUser.name,
        authUser.email,
      );
      if (result.quoteId) {
        generatedQuoteId = result.quoteId;
        try {
          await db.assessment.update({
            where: { id },
            data: { generatedQuoteId },
          });
        } catch (err) {
          log.warn({ err, assessmentId: id }, 'Failed to persist generatedQuoteId');
        }
      } else {
        quoteError = result.error || 'Unknown quote generation error';
        log.warn({ assessmentId: id, err: quoteError }, 'AI quote generation failed');
      }
    }

    return NextResponse.json({
      success: true,
      assessment,
      aiSummary,
      aiSummaryError,
      generatedQuoteId,
      quoteError,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to complete assessment');
    const message = error instanceof Error ? error.message : 'Failed to complete assessment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
