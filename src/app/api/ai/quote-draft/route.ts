import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * AI Quote Draft (ServiceOS V1.5)
 * -------------------------------
 * POST /api/ai/quote-draft
 *
 * Given a free-text description of a customer's need (e.g. "Need 4 CCTV cameras"),
 * the LLM returns a structured quote draft the sales rep can review and tweak:
 *
 *   {
 *     lineItems: [{ name, description, quantity, unitPrice, total }],
 *     laborHours, laborCost, tax, discount, subtotal, total, notes
 *   }
 *
 * Pattern mirrors /api/ai/field-assistant/route.ts:
 *   - getAuthUser() + tenantId scoping
 *   - dynamic ZAI import via getZai() helper
 *   - callLLM() wrapper with response_format: { type: 'json_object' }
 *   - ActivityLog audit entry (non-fatal)
 *   - friendly 503 / 502 error envelopes
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface CatalogItemInput {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  duration?: number;
}

interface RequestBody {
  customerNeed: string;
  serviceCatalog?: CatalogItemInput[];
  customerId?: string;
  workspaceId?: string;
}

interface DraftLineItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteDraftResult {
  lineItems: DraftLineItem[];
  laborHours: number;
  laborCost: number;
  tax: number;
  discount: number;
  subtotal: number;
  total: number;
  notes: string;
}

// ─── Helpers (copied verbatim from field-assistant/route.ts) ──────────────

async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/quote-draft] ZAI.create() failed:', msg);
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
    console.error('[ai/quote-draft] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Context loaders ───────────────────────────────────────────────────────

/**
 * Load the tenant's Service catalog (active services only) so the LLM can
 * prefer real catalog items when constructing line items. Best-effort —
 * returns [] if the tenant has no services.
 */
async function loadServiceCatalog(tenantId: string): Promise<CatalogItemInput[]> {
  try {
    const services = await db.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      take: 50,
      select: { id: true, name: true, description: true, category: true, basePrice: true, duration: true },
    });
    return services as CatalogItemInput[];
  } catch {
    return [];
  }
}

/**
 * Best-effort customer context (only if customerId is provided).
 * Customer is scoped via the tenant's workspaceIds (Customer has no
 * `tenantId` field — only `workspaceId`).
 */
async function loadCustomerContext(customerId: string, tenantId: string) {
  try {
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = workspaces.map((w) => w.id);
    return await db.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          { workspaceId: { in: workspaceIds } },
          ...(workspaceIds.length === 0 ? [{}] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
      },
    });
  } catch {
    return null;
  }
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
    if (!body || !body.customerNeed || !body.customerNeed.trim()) {
      return NextResponse.json(
        { error: 'customerNeed is required.' },
        { status: 400 },
      );
    }

    const customerNeed = body.customerNeed.trim();

    // Prefer the catalog passed in by the caller; otherwise load the tenant's.
    let catalog: CatalogItemInput[] = Array.isArray(body.serviceCatalog) ? body.serviceCatalog : [];
    if (catalog.length === 0) {
      catalog = await loadServiceCatalog(tenantId);
    }

    const customer = body.customerId ? await loadCustomerContext(body.customerId, tenantId) : null;

    // Get the ZAI client.
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      const errMsg =
        zaiResult?.error ||
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.';
      return NextResponse.json({ error: errMsg }, { status: 503 });
    }

    const systemPrompt =
      'You are a senior field-service sales engineer. Given a free-text customer need, ' +
      'produce a complete, itemized quote draft with realistic pricing in USD. ' +
      'Always prefer items from the supplied service catalog when they match the need; ' +
      'add reasonable labor and any incidental materials as separate line items. ' +
      'All math MUST be internally consistent: each lineItem.total = quantity * unitPrice; ' +
      'subtotal = sum of all lineItem.total; tax = subtotal * 0.08 (8%); ' +
      'total = subtotal + tax - discount. discount defaults to 0 unless the customer explicitly asked for one. ' +
      'Always respond as a single JSON object — no markdown, no prose, no code fences. ' +
      'The JSON shape MUST be exactly: ' +
      '{"lineItems": [{"name": string, "description": string, "quantity": number, "unitPrice": number, "total": number}], ' +
      '"laborHours": number, "laborCost": number, "tax": number, "discount": number, ' +
      '"subtotal": number, "total": number, "notes": string}';

    const catalogText = catalog.length > 0
      ? catalog.map((s) => `- ${s.name}${s.category ? ' [' + s.category + ']' : ''} — base $${s.basePrice ?? 0}${s.description ? ' (' + truncate(s.description, 80) + ')' : ''}`).join('\n')
      : '(no service catalog provided — invent realistic items)';

    const userPrompt = `CUSTOMER NEED:
${truncate(customerNeed, 1200)}

AVAILABLE SERVICE CATALOG (${catalog.length}):
${catalogText}
${customer ? `
CUSTOMER:
${customer.name || '—'}${customer.address ? ' · ' + customer.address : ''}` : ''}

Build a quote draft as a single JSON object. Double-check every total before responding.`;

    const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.6);
    if (result.error || !result.text) {
      return NextResponse.json(
        { error: result.error || 'AI returned an empty response.' },
        { status: 502 },
      );
    }

    let parsed: Partial<QuoteDraftResult> = {};
    try {
      parsed = JSON.parse(result.text) as Partial<QuoteDraftResult>;
    } catch {
      return NextResponse.json(
        { error: 'AI response was not valid JSON.', raw: result.text },
        { status: 502 },
      );
    }

    // Sanitize + recompute the math defensively (don't trust LLM arithmetic).
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
              description: typeof li.description === 'string' ? li.description.trim().slice(0, 500) : '',
              quantity,
              unitPrice,
              total: Number((quantity * unitPrice).toFixed(2)),
            };
          })
          .slice(0, 30)
      : [];

    const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
    const discount = Number.isFinite(Number(parsed.discount)) && Number(parsed.discount) > 0
      ? Number(parsed.discount)
      : 0;
    const tax = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + tax - discount).toFixed(2));

    // Pull laborCost/laborHours out of the line items if the model put them there.
    const laborLine = lineItems.find((li) => /labor/i.test(li.name));
    const laborCost = Number.isFinite(Number(parsed.laborCost)) && Number(parsed.laborCost) > 0
      ? Number(parsed.laborCost)
      : laborLine
        ? laborLine.total
        : 0;
    const laborHours = Number.isFinite(Number(parsed.laborHours)) && Number(parsed.laborHours) > 0
      ? Number(parsed.laborHours)
      : 0;

    const draft: QuoteDraftResult = {
      lineItems,
      laborHours,
      laborCost,
      tax,
      discount,
      subtotal,
      total,
      notes:
        typeof parsed.notes === 'string' && parsed.notes.trim()
          ? parsed.notes.trim().slice(0, 1000)
          : 'Quote valid for 30 days. Includes standard 1-year warranty on parts and 90-day warranty on labor.',
    };

    // Log the AI query (non-fatal).
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'quote',
        entityId: body.customerId || null,
        entityName: truncate(customerNeed, 80),
        description: `AI quote-draft: "${truncate(customerNeed, 80)}" → $${draft.total} (${draft.lineItems.length} line items)`,
        metadataJson: JSON.stringify({
          action: 'quote_draft',
          customerId: body.customerId || null,
          preview: truncate(customerNeed, 200),
          lineItemCount: draft.lineItems.length,
          subtotal: draft.subtotal,
          tax: draft.tax,
          total: draft.total,
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[ai/quote-draft] logActivity failed:', logErr);
    }

    return NextResponse.json(draft);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    console.error('[/api/ai/quote-draft] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
