import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { withRequestId } from '@/lib/logger';

/**
 * AI Quote Enhance (ServiceOS V1.5 — P6-quotes)
 * ----------------------------------------------
 * POST /api/quotes/[id]/ai-enhance
 *
 * Body: { enhancementType: 'add_line_items' | 'optimize_pricing' | 'add_terms' | 'risk_assessment' }
 *
 * Reads an existing Quote, calls the LLM with the appropriate prompt for the
 * requested enhancement, and returns SUGGESTIONS ONLY — the original Quote
 * row is never modified. The caller (UI) can apply the suggestions via
 * PUT /api/quotes/[id].
 *
 * Response shape:
 *   {
 *     quoteId, enhancementType, suggestions: {...}, generatedBy, createdAt
 *   }
 *
 * `suggestions` is polymorphic — its shape depends on `enhancementType`:
 *   - add_line_items   → { items: [{ name, description, quantity, unit, unitPrice, total, reason }] }
 *   - optimize_pricing → { adjustments: [{ itemName, currentPrice, suggestedPrice, reason, confidence }] }
 *   - add_terms        → { termsAndConditions: string }
 *   - risk_assessment  → { riskAssessment: string, riskLevel: 'low'|'medium'|'high', mitigations: string[] }
 *
 * If the SDK is unavailable, returns 503 with a friendly message. Auth is
 * required; the quote must belong to the caller's tenant.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type EnhancementType =
  | 'add_line_items'
  | 'optimize_pricing'
  | 'add_terms'
  | 'risk_assessment';

interface RequestBody {
  enhancementType: EnhancementType;
}

interface SuggestedLineItem {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  reason: string;
}

interface PricingAdjustment {
  itemName: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  confidence: number;
}

interface EnhanceResponse {
  quoteId: string;
  enhancementType: EnhancementType;
  suggestions:
    | { items: SuggestedLineItem[] }
    | { adjustments: PricingAdjustment[] }
    | { termsAndConditions: string }
    | {
        riskAssessment: string;
        riskLevel: 'low' | 'medium' | 'high';
        mitigations: string[];
      };
  generatedBy: 'ai';
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '\u2026' : s;
}

function safeString(v: unknown, max = 1000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Get an initialized z-ai-web-dev-sdk client (or null + error). */
async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[quotes/ai-enhance] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

/** Wrap zai.chat.completions.create in try/catch and extract the text. */
async function callLLMJson(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5,
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
    console.error('[quotes/ai-enhance] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

/** Safely parse JSON from the LLM response. Returns null on failure. */
function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    // Try to extract a JSON object from a markdown-fenced block.
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        const parsed = JSON.parse(fenceMatch[1]);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// ─── Prompt builders per enhancement type ──────────────────────────────────

interface QuoteContext {
  id: string;
  title: string;
  description: string | null;
  itemsJson: string;
  addOnsJson: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: string;
  customerName: string | null;
  customerId: string | null;
}

function buildAddLineItemsPrompts(q: QuoteContext) {
  const items = JSON.parse(q.itemsJson || '[]') as Array<{
    name?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    total?: number;
  }>;
  const itemsText = items
    .map(
      (li, i) =>
        `${i + 1}. ${li.name ?? '—'} — qty ${li.quantity ?? 1} ${li.unit ?? 'item'} @ ${q.currency} ${li.unitPrice ?? 0} = ${q.currency} ${li.total ?? 0}`,
    )
    .join('\n');

  const system =
    'You are a senior service-business consultant. Given an existing quote, suggest ' +
    '3-6 ADDITIONAL line items the customer might reasonably need but that are not yet ' +
    'on the quote. Focus on complementary services, consumables, permits, warranties, ' +
    'and optional add-ons that genuinely add value. Do NOT duplicate items already on the quote. ' +
    'Return a JSON object: { "items": [{ "name": string, "description": string, "quantity": number, "unit": string, "unitPrice": number, "total": number, "reason": string }] }. ' +
    'Each item.total MUST equal quantity * unitPrice. Respond with ONLY the JSON object — no markdown, no prose.';

  const user =
    `QUOTE TITLE: ${q.title}\n` +
    `QUOTE DESCRIPTION: ${truncate(q.description || '', 800)}\n` +
    `CURRENCY: ${q.currency}\n` +
    `EXISTING LINE ITEMS:\n${itemsText || '(none)'}\n` +
    `SUBTOTAL: ${q.currency} ${q.subtotal.toFixed(2)}\n\n` +
    `Suggest 3-6 additional line items as a JSON object.`;
  return { system, user };
}

function buildOptimizePricingPrompts(q: QuoteContext) {
  const items = JSON.parse(q.itemsJson || '[]') as Array<{
    name?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  const itemsText = items
    .map(
      (li, i) =>
        `${i + 1}. ${li.name ?? '—'} — qty ${li.quantity ?? 1} @ ${q.currency} ${li.unitPrice ?? 0} = ${q.currency} ${li.total ?? 0}`,
    )
    .join('\n');

  const system =
    'You are a pricing strategist for service businesses. Given an existing quote, review ' +
    'each line item and suggest price adjustments based on typical market rates, value-based ' +
    'pricing, and the perceived profit margin. Be conservative — only suggest changes when ' +
    'the current price seems clearly below market (raise) or clearly above market (lower). ' +
    'Return a JSON object: { "adjustments": [{ "itemName": string, "currentPrice": number, "suggestedPrice": number, "reason": string, "confidence": number }] }. ' +
    'confidence is 0.0-1.0. Only include items where you recommend a change. Respond with ONLY the JSON object — no markdown, no prose.';

  const user =
    `QUOTE TITLE: ${q.title}\n` +
    `CURRENCY: ${q.currency}\n` +
    `CURRENT LINE ITEMS:\n${itemsText || '(none)'}\n` +
    `SUBTOTAL: ${q.currency} ${q.subtotal.toFixed(2)}\n\n` +
    `Return a JSON object with pricing adjustments (only for items where a change is warranted).`;
  return { system, user };
}

function buildAddTermsPrompts(q: QuoteContext) {
  const system =
    'You are a service-business contracts specialist. Generate clear, balanced, ' +
    'jurisdiction-neutral Terms & Conditions for the given quote. Cover: payment terms, ' +
    'deposit, validity period, change-order policy, warranty, liability, cancellation, ' +
    'and dispute resolution. Use plain English, numbered list, ~8-12 clauses. ' +
    'Return a JSON object: { "termsAndConditions": string }. ' +
    'The string may contain \\n for line breaks. Respond with ONLY the JSON object — no markdown, no prose.';

  const user =
    `QUOTE TITLE: ${q.title}\n` +
    `QUOTE DESCRIPTION: ${truncate(q.description || '', 800)}\n` +
    `CURRENCY: ${q.currency}\n` +
    `TOTAL: ${q.currency} ${q.total.toFixed(2)}\n\n` +
    `Generate Terms & Conditions as a JSON object.`;
  return { system, user };
}

function buildRiskAssessmentPrompts(q: QuoteContext) {
  const items = JSON.parse(q.itemsJson || '[]') as Array<{ name?: string }>;
  const itemsText = items.map((li) => `- ${li.name ?? '—'}`).join('\n');

  const system =
    'You are a service-business risk manager. Given an existing quote, identify the ' +
    'primary risks (safety, scope, weather, permits, materials availability, customer ' +
    'expectations) and propose concrete mitigations. ' +
    'Return a JSON object: { "riskAssessment": string, "riskLevel": "low"|"medium"|"high", "mitigations": string[] }. ' +
    'riskAssessment is a 2-4 sentence summary. mitigations is an array of 3-6 short actionable items. ' +
    'Respond with ONLY the JSON object — no markdown, no prose.';

  const user =
    `QUOTE TITLE: ${q.title}\n` +
    `QUOTE DESCRIPTION: ${truncate(q.description || '', 800)}\n` +
    `LINE ITEMS:\n${itemsText || '(none)'}\n` +
    `TOTAL: ${q.currency} ${q.total.toFixed(2)}\n\n` +
    `Generate a risk assessment as a JSON object.`;
  return { system, user };
}

// ─── Suggestion sanitizers (defensive — never trust LLM output) ────────────

function sanitizeLineItems(parsed: Record<string, unknown>): SuggestedLineItem[] {
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  return rawItems
    .filter((li): li is Record<string, unknown> => !!li && typeof li === 'object')
    .map((li) => {
      const quantity = Math.max(0, safeNumber(li.quantity, 1));
      const unitPrice = Math.max(0, safeNumber(li.unitPrice, 0));
      return {
        name: safeString(li.name, 200) || 'Suggested Item',
        description: safeString(li.description, 500),
        quantity: round2(quantity),
        unit: safeString(li.unit, 20) || 'item',
        unitPrice: round2(unitPrice),
        total: round2(quantity * unitPrice),
        reason: safeString(li.reason, 300),
      };
    })
    .slice(0, 10);
}

function sanitizeAdjustments(parsed: Record<string, unknown>): PricingAdjustment[] {
  const rawAdj = Array.isArray(parsed.adjustments) ? parsed.adjustments : [];
  return rawAdj
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map((a) => {
      const confidence = Math.min(1, Math.max(0, safeNumber(a.confidence, 0.5)));
      return {
        itemName: safeString(a.itemName, 200) || 'Item',
        currentPrice: round2(Math.max(0, safeNumber(a.currentPrice, 0))),
        suggestedPrice: round2(Math.max(0, safeNumber(a.suggestedPrice, 0))),
        reason: safeString(a.reason, 300),
        confidence: round2(confidence),
      };
    })
    .slice(0, 15);
}

function sanitizeTerms(parsed: Record<string, unknown>): string {
  return safeString(parsed.termsAndConditions, 5000);
}

function sanitizeRisk(parsed: Record<string, unknown>): {
  riskAssessment: string;
  riskLevel: 'low' | 'medium' | 'high';
  mitigations: string[];
} {
  const level = safeString(parsed.riskLevel, 10).toLowerCase();
  const riskLevel: 'low' | 'medium' | 'high' =
    level === 'high' || level === 'medium' || level === 'low' ? level : 'medium';
  const mitigations = Array.isArray(parsed.mitigations)
    ? parsed.mitigations
        .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        .map((m) => m.trim().slice(0, 300))
        .slice(0, 8)
    : [];
  return {
    riskAssessment: safeString(parsed.riskAssessment, 2000),
    riskLevel,
    mitigations,
  };
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);

  try {
    // ── 1. Auth + tenant scoping ──────────────────────────────────────────
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
    if (user.role === 'customer') {
      return NextResponse.json(
        { error: 'Customers cannot enhance quotes with AI.' },
        { status: 403 },
      );
    }

    const { id: quoteId } = await params;

    // ── 2. Load the quote (must belong to tenant) ─────────────────────────
    const quote = await db.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found in this tenant.' },
        { status: 404 },
      );
    }

    // ── 3. Parse + validate body ──────────────────────────────────────────
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    if (!body || !body.enhancementType) {
      return NextResponse.json(
        { error: 'enhancementType is required.' },
        { status: 400 },
      );
    }
    const validTypes: EnhancementType[] = [
      'add_line_items',
      'optimize_pricing',
      'add_terms',
      'risk_assessment',
    ];
    if (!validTypes.includes(body.enhancementType)) {
      return NextResponse.json(
        {
          error: `Invalid enhancementType. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const enhancementType = body.enhancementType;

    // ── 4. Build the context + prompts ────────────────────────────────────
    const ctx: QuoteContext = {
      id: quote.id,
      title: quote.title,
      description: quote.description,
      itemsJson: quote.itemsJson,
      addOnsJson: quote.addOnsJson,
      subtotal: quote.subtotal,
      tax: quote.tax,
      taxRate: quote.taxRate,
      discount: quote.discount,
      total: quote.total,
      currency: quote.currency || 'USD',
      customerName: quote.customer?.name ?? null,
      customerId: quote.customerId,
    };

    const { system, user: userPrompt } = (() => {
      switch (enhancementType) {
        case 'add_line_items':
          return buildAddLineItemsPrompts(ctx);
        case 'optimize_pricing':
          return buildOptimizePricingPrompts(ctx);
        case 'add_terms':
          return buildAddTermsPrompts(ctx);
        case 'risk_assessment':
          return buildRiskAssessmentPrompts(ctx);
      }
    })();

    // ── 5. Get ZAI client (503 if unavailable) ────────────────────────────
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      return NextResponse.json(
        {
          error:
            zaiResult?.error ||
            'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
        },
        { status: 503 },
      );
    }

    // ── 6. Call the LLM ───────────────────────────────────────────────────
    const result = await callLLMJson(zaiResult.zai, system, userPrompt, 0.5);
    if (result.error || !result.text) {
      return NextResponse.json(
        { error: result.error || 'AI returned an empty response.' },
        { status: 502 },
      );
    }
    const parsed = safeParseJson(result.text);
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI response was not valid JSON.', raw: truncate(result.text, 800) },
        { status: 502 },
      );
    }

    // ── 7. Sanitize the suggestions for the requested type ────────────────
    let suggestions: EnhanceResponse['suggestions'];
    switch (enhancementType) {
      case 'add_line_items': {
        const items = sanitizeLineItems(parsed);
        if (items.length === 0) {
          return NextResponse.json(
            { error: 'AI did not return any usable line-item suggestions.' },
            { status: 502 },
          );
        }
        suggestions = { items };
        break;
      }
      case 'optimize_pricing': {
        const adjustments = sanitizeAdjustments(parsed);
        if (adjustments.length === 0) {
          return NextResponse.json(
            {
              error:
                'AI did not return any pricing adjustments. The current pricing may already be optimal.',
            },
            { status: 200 },
          );
        }
        suggestions = { adjustments };
        break;
      }
      case 'add_terms': {
        const terms = sanitizeTerms(parsed);
        if (!terms) {
          return NextResponse.json(
            { error: 'AI did not return usable terms & conditions.' },
            { status: 502 },
          );
        }
        suggestions = { termsAndConditions: terms };
        break;
      }
      case 'risk_assessment': {
        const risk = sanitizeRisk(parsed);
        if (!risk.riskAssessment) {
          return NextResponse.json(
            { error: 'AI did not return a usable risk assessment.' },
            { status: 502 },
          );
        }
        suggestions = risk;
        break;
      }
    }

    // ── 8. Activity log (non-fatal) ───────────────────────────────────────
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'quote',
        entityId: quote.id,
        entityName: truncate(quote.title, 80),
        description: `AI quote-enhance (${enhancementType}) on quote "${truncate(quote.title, 60)}"`,
        metadataJson: JSON.stringify({
          action: 'quote_enhance',
          quoteId: quote.id,
          enhancementType,
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      log.error({ err: logErr }, '[quotes/ai-enhance] logActivity failed');
    }

    const response: EnhanceResponse = {
      quoteId: quote.id,
      enhancementType,
      suggestions,
      generatedBy: 'ai',
      createdAt: new Date().toISOString(),
    };

    log.info(
      { quoteId: quote.id, enhancementType },
      '[quotes/ai-enhance] suggestions generated',
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to enhance quote';
    log.error({ err: error }, '[/api/quotes/[id]/ai-enhance] error');
    console.error('[/api/quotes/[id]/ai-enhance] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
