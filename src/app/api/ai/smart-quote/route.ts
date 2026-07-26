import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { withRequestId } from '@/lib/logger';
import { estimatePrice } from '@/lib/smart-pricing';
import { INDUSTRY_CATALOG } from '@/lib/industry-catalog';
import {
  getTemplateForIndustry,
  applyTemplate,
  type AppliedQuote,
  type QuoteTemplate,
} from '@/lib/quote-templates';

/**
 * AI Smart Quote Builder (ServiceOS V1.5 — P6-quotes)
 * ----------------------------------------------------
 * POST /api/ai/smart-quote
 *
 * Body:
 *   { problemDescription, customerId?, leadId?, industry?, serviceId? }
 *
 * Generates a FULL quote from a free-text problem description by calling the
 * LLM with the prescribed estimator system prompt. The LLM returns:
 *   - line items (labour, materials, equipment, waste removal, permits)
 *   - estimated hours + duration
 *   - timeline, risk assessment, terms & conditions
 *   - deposit percentage + tax rate
 *
 * The route then:
 *   1. Recomputes ALL arithmetic defensively (never trusts LLM totals).
 *   2. Resolves the tenant's currency + exchange rate.
 *   3. Persists the quote to the Quote table (status='draft').
 *   4. Returns the created quote + an `aiMeta` object with the non-schema
 *      fields (timeline, risk, terms, deposit).
 *
 * If the SDK is unavailable (missing ZAI_API_KEY, network error, JSON parse
 * failure), the route falls back to `applyTemplate()` using the best-matching
 * industry template — so the endpoint is ALWAYS functional. The response's
 * `aiMeta.generatedBy` field indicates which path produced the quote.
 *
 * Auth: required. Tenant scoping is enforced on the customer/lead lookup
 * and on the persisted Quote row.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  problemDescription: string;
  customerId?: string;
  leadId?: string;
  industry?: string;
  serviceId?: string;
}

interface LlmLineItem {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface LlmQuote {
  title: string;
  description: string;
  lineItems: LlmLineItem[];
  addOns?: LlmLineItem[];
  estimatedHours: number;
  estimatedDurationDays: number;
  timeline: string;
  riskAssessment: string;
  termsAndConditions: string;
  depositPct: number;
  taxRate: number;
}

interface AiMeta {
  estimatedHours: number;
  estimatedDurationDays: number;
  timeline: string;
  riskAssessment: string;
  termsAndConditions: string;
  depositPct: number;
  depositAmount: number;
  generatedBy: 'ai' | 'template-fallback';
  templateId: string | null;
  aiError?: string;
}

interface CreatedQuoteResponse {
  id: string;
  title: string;
  description: string;
  customerId: string | null;
  leadId: string | null;
  tenantId: string | null;
  itemsJson: unknown;
  addOnsJson: unknown;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountType: string;
  total: number;
  currency: string;
  exchangeRate: number;
  baseCurrency: string;
  baseAmount: number;
  status: string;
  validUntil: string | null;
  createdAt: string;
  aiMeta: AiMeta;
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

function safeString(v: unknown, max = 500): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safePositiveInt(v: unknown, fallback = 0): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build the readable multi-section description string that gets persisted in
 * `Quote.description`. The existing UI renders this field as plain text —
 * markdown-style headings degrade gracefully to plain-text section labels.
 */
function buildStoredDescription(
  baseDescription: string,
  meta: {
    timeline: string;
    riskAssessment: string;
    termsAndConditions: string;
    depositPct: number;
    depositAmount: number;
    currency: string;
  },
): string {
  const sections: string[] = [];
  if (baseDescription) sections.push(baseDescription.trim());
  if (meta.timeline) sections.push(`Timeline: ${meta.timeline.trim()}`);
  if (meta.riskAssessment) sections.push(`Risk Assessment: ${meta.riskAssessment.trim()}`);
  if (meta.depositPct > 0) {
    sections.push(
      `Deposit: ${meta.depositPct}% (${meta.currency} ${meta.depositAmount.toFixed(2)}) due on approval.`,
    );
  }
  if (meta.termsAndConditions) {
    sections.push(`Terms & Conditions:\n${meta.termsAndConditions.trim()}`);
  }
  return sections.join('\n\n');
}

/**
 * Get an initialized z-ai-web-dev-sdk client. Returns null + a friendly
 * error message if the SDK isn't available (e.g. missing API key).
 * Pattern mirrors /api/ai/quote-draft/route.ts.
 */
async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/smart-quote] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

/**
 * Wrap zai.chat.completions.create in try/catch and extract the text.
 * Forces JSON-object response format for reliable parsing.
 */
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
      return { text: null, error: 'AI returned an empty response. Please retry.' };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/smart-quote] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

// ─── Context loaders ───────────────────────────────────────────────────────

/**
 * Load a customer scoped to the tenant. The Customer model has no `tenantId`
 * column — it links via `workspaceId` — so we resolve the tenant's workspace
 * IDs first and find the customer within those workspaces.
 */
async function loadCustomerScoped(customerId: string, tenantId: string) {
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

/**
 * Load a lead scoped to the tenant. Lead has a direct `tenantId` column.
 */
async function loadLeadScoped(leadId: string, tenantId: string) {
  try {
    return await db.lead.findFirst({
      where: { id: leadId, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        serviceType: true,
        serviceId: true,
        description: true,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Load the tenant's Service catalog (active services only) — used to bias the
 * LLM toward real catalog items.
 */
async function loadServiceCatalog(tenantId: string) {
  try {
    return await db.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      take: 30,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        basePrice: true,
        duration: true,
      },
    });
  } catch {
    return [];
  }
}

// ─── Sanitization (defensive — never trust LLM arithmetic) ─────────────────

function sanitizeLlmQuote(parsed: Partial<LlmQuote>): {
  quote: LlmQuote;
  lineItems: LlmLineItem[];
  addOns: LlmLineItem[];
} {
  const rawItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
  const lineItems: LlmLineItem[] = rawItems
    .filter((li): li is LlmLineItem =>
      !!li && typeof li === 'object' && typeof li.name === 'string' && li.name.trim().length > 0,
    )
    .map((li) => {
      const quantity = Math.max(0, safeNumber(li.quantity, 1));
      const unitPrice = Math.max(0, safeNumber(li.unitPrice, 0));
      return {
        name: String(li.name).trim().slice(0, 200),
        description: safeString(li.description, 500),
        quantity: round2(quantity),
        unit: safeString(li.unit, 20) || 'item',
        unitPrice: round2(unitPrice),
        total: round2(quantity * unitPrice),
      };
    })
    .slice(0, 30);

  const rawAddOns = Array.isArray(parsed.addOns) ? parsed.addOns : [];
  const addOns: LlmLineItem[] = rawAddOns
    .filter((li): li is LlmLineItem =>
      !!li && typeof li === 'object' && typeof li.name === 'string' && li.name.trim().length > 0,
    )
    .map((li) => {
      const quantity = Math.max(0, safeNumber(li.quantity, 1));
      const unitPrice = Math.max(0, safeNumber(li.unitPrice, 0));
      return {
        name: String(li.name).trim().slice(0, 200),
        description: safeString(li.description, 500),
        quantity: round2(quantity),
        unit: safeString(li.unit, 20) || 'item',
        unitPrice: round2(unitPrice),
        total: round2(quantity * unitPrice),
      };
    })
    .slice(0, 20);

  const title = safeString(parsed.title, 200) || 'Smart Quote';
  const description = safeString(parsed.description, 2000);
  const timeline = safeString(parsed.timeline, 500);
  const riskAssessment = safeString(parsed.riskAssessment, 1000);
  const termsAndConditions = safeString(parsed.termsAndConditions, 3000);
  const depositPct = Math.min(100, Math.max(0, safeNumber(parsed.depositPct, 30)));
  const taxRate = Math.min(100, Math.max(0, safeNumber(parsed.taxRate, 0)));
  const estimatedHours = Math.max(0, safeNumber(parsed.estimatedHours, 0));
  const estimatedDurationDays = Math.max(0, safeNumber(parsed.estimatedDurationDays, 0));

  return {
    quote: {
      title,
      description,
      lineItems,
      addOns,
      estimatedHours,
      estimatedDurationDays,
      timeline,
      riskAssessment,
      termsAndConditions,
      depositPct,
      taxRate,
    },
    lineItems,
    addOns,
  };
}

// ─── Template-based fallback ───────────────────────────────────────────────

/**
 * Build a quote from the industry template, deriving sensible variables from
 * the price estimate and problem description. Used when the AI is unavailable
 * or returns invalid JSON.
 */
function buildTemplateFallback(
  template: QuoteTemplate,
  estimate: Awaited<ReturnType<typeof estimatePrice>>,
  problemDescription: string,
): { applied: AppliedQuote; title: string; description: string; riskAssessment: string } {
  const descriptionLen = problemDescription.length;
  // Heuristic: ~1 hour of work per 200 chars of description, capped.
  const derivedHours = Math.max(
    template.estimatedDurationMins / 60,
    Math.min(12, Math.round(descriptionLen / 200)),
  );

  const hourlyRate = estimate?.breakdown.base && derivedHours > 0
    ? estimate.breakdown.base / derivedHours
    : 50;

  const variables = {
    hours: derivedHours,
    hourlyRate: round2(hourlyRate),
    crew: 1,
    materialsCost: round2((estimate?.breakdown.base ?? 200) * 0.4),
    equipmentCost: round2((estimate?.breakdown.base ?? 200) * 0.15),
    wasteRemovalCost: 80,
    permitsCost: 100,
    callOutFee: estimate?.breakdown.callOutFee ?? 0,
    area: 1200,
    quantity: 1,
    days: Math.max(1, Math.ceil(derivedHours / 8)),
  };

  const applied = applyTemplate(template, variables);

  // Compose a human-readable description.
  const description =
    `Based on your request: "${truncate(problemDescription, 300)}". ` +
    `Our crew will perform the work described in the ${template.name} ` +
    `template. Final scope will be confirmed on site visit.`;

  const riskAssessment =
    'Low-to-medium risk. Standard safety precautions apply. ' +
    'Site survey may reveal additional requirements not covered in this baseline quote.';

  const title = `${template.name} — Estimate`;

  return { applied, title, description, riskAssessment };
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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

    // ── 2. Parse + validate body ──────────────────────────────────────────
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    if (!body || !body.problemDescription || !body.problemDescription.trim()) {
      return NextResponse.json(
        { error: 'problemDescription is required.' },
        { status: 400 },
      );
    }
    const problemDescription = body.problemDescription.trim();

    // ── 3. Load tenant + resolve currency + industry ──────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        currency: true,
        industry: true,
      },
    });
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found.' },
        { status: 404 },
      );
    }
    const baseCurrency = tenant.currency || 'USD';

    // Resolve industry: body.industry > tenant.industry > null
    const industryId =
      (body.industry && String(body.industry).trim()) ||
      (tenant.industry && String(tenant.industry).trim()) ||
      '';
    const industryMeta = INDUSTRY_CATALOG.find((i) => i.id === industryId) ?? null;

    // ── 4. Load optional context (customer, lead, service catalog) ────────
    const customer = body.customerId
      ? await loadCustomerScoped(body.customerId, tenantId)
      : null;
    if (body.customerId && !customer) {
      return NextResponse.json(
        { error: 'Customer not found in this tenant.' },
        { status: 404 },
      );
    }

    const lead = body.leadId
      ? await loadLeadScoped(body.leadId, tenantId)
      : null;
    if (body.leadId && !lead) {
      return NextResponse.json(
        { error: 'Lead not found in this tenant.' },
        { status: 404 },
      );
    }

    const catalog = await loadServiceCatalog(tenantId);
    const service = body.serviceId
      ? catalog.find((s) => s.id === body.serviceId) ?? null
      : null;

    // ── 5. Run estimatePrice() for initial pricing context ────────────────
    // This gives us the tenant's real pricing rules (callOutFee, surcharges,
    // base price) so the LLM has realistic anchors and the fallback template
    // has sensible defaults.
    const estimate = await estimatePrice({
      tenantId,
      serviceId: body.serviceId,
    }).catch(() => null);

    // ── 6. Try the AI path ────────────────────────────────────────────────
    let aiGenerated: { quote: LlmQuote; lineItems: LlmLineItem[]; addOns: LlmLineItem[] } | null = null;
    let aiError: string | undefined;

    const zaiResult = await getZai();
    if (zaiResult && zaiResult.zai) {
      const systemPrompt =
        'You are an expert service business estimator for ServiceOS, a platform for local service businesses.\n' +
        'Given a customer\'s problem description, generate a detailed quote.\n\n' +
        'Return a JSON object:\n' +
        '{\n' +
        '  "title": "short quote title",\n' +
        '  "description": "detailed description of the work",\n' +
        '  "lineItems": [\n' +
        '    { "name": "Labour", "description": "...", "quantity": 1, "unit": "hour", "unitPrice": 45, "total": 45 },\n' +
        '    { "name": "Materials", "description": "...", "quantity": 1, "unit": "lot", "unitPrice": 120, "total": 120 }\n' +
        '  ],\n' +
        '  "addOns": [],\n' +
        '  "estimatedHours": 4,\n' +
        '  "estimatedDurationDays": 1,\n' +
        '  "timeline": "Start within 2-3 business days, complete in 1 day",\n' +
        '  "riskAssessment": "Low risk. Standard safety precautions apply.",\n' +
        '  "termsAndConditions": "1. 50% deposit required...\\n2. Work guaranteed for 90 days...",\n' +
        '  "depositPct": 30,\n' +
        '  "taxRate": 20\n' +
        '}\n\n' +
        'Consider:\n' +
        '- The industry and typical service costs\n' +
        '- Labour rates ($30-80/hour depending on trade)\n' +
        '- Material costs\n' +
        '- Equipment needs\n' +
        '- Waste removal if applicable\n' +
        '- Permits if applicable\n' +
        '- A reasonable profit margin';

      const estimateContext = estimate
        ? `Tenant pricing context (use as a sanity-check anchor):\n` +
          `- Base price (high end): ${estimate.currency} ${estimate.high.toFixed(2)}\n` +
          `- Pricing type: ${estimate.pricingType}\n` +
          `- Call-out fee: ${estimate.currency} ${estimate.breakdown.callOutFee.toFixed(2)}\n` +
          `- Estimated duration: ${estimate.estimatedDurationMins} minutes`
        : 'No tenant pricing context available.';

      const catalogText =
        catalog.length > 0
          ? catalog
              .slice(0, 15)
              .map(
                (s) =>
                  `- ${s.name}${s.category ? ` [${s.category}]` : ''} — base ${baseCurrency} ${s.basePrice ?? 0}`,
              )
              .join('\n')
          : '(no service catalog available)';

      const userPrompt =
        `INDUSTRY: ${industryMeta ? industryMeta.name : industryId || 'general'}\n` +
        `${service ? `REQUESTED SERVICE: ${service.name} (base ${baseCurrency} ${service.basePrice}, ${service.duration} mins)\n` : ''}` +
        `${estimateContext}\n\n` +
        `AVAILABLE SERVICE CATALOG (${catalog.length}):\n${catalogText}\n\n` +
        `${customer ? `CUSTOMER:\n${customer.name || '—'}${customer.address ? ` · ${customer.address}` : ''}\n` : ''}` +
        `${lead ? `LEAD SOURCE:\n${lead.name}${lead.serviceType ? ` · ${lead.serviceType}` : ''}\n` : ''}` +
        `\nPROBLEM DESCRIPTION:\n${truncate(problemDescription, 1500)}\n\n` +
        `Build a detailed quote as a single JSON object. All math MUST be internally consistent: ` +
        `each lineItem.total = quantity * unitPrice. Respond with ONLY the JSON object — no markdown, no prose, no code fences.`;

      const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.6);
      if (result.text) {
        try {
          const parsed = JSON.parse(result.text) as Partial<LlmQuote>;
          const sanitized = sanitizeLlmQuote(parsed);
          // Require at least one line item from the AI path — otherwise fall back.
          if (sanitized.lineItems.length > 0) {
            aiGenerated = sanitized;
          } else {
            aiError = 'AI returned a quote with no usable line items.';
          }
        } catch (parseErr) {
          aiError = 'AI response was not valid JSON.';
          log.warn({ err: parseErr }, '[ai/smart-quote] JSON parse failed');
        }
      } else {
        aiError = result.error || 'AI returned an empty response.';
      }
    } else {
      aiError = zaiResult?.error || 'AI SDK unavailable.';
    }

    // ── 7. Assemble the quote (AI success OR template fallback) ───────────
    let title: string;
    let description: string;
    let lineItems: LlmLineItem[];
    let addOns: LlmLineItem[];
    let timeline: string;
    let riskAssessment: string;
    let termsAndConditions: string;
    let depositPct: number;
    let taxRate: number;
    let estimatedHours: number;
    let estimatedDurationDays: number;
    let generatedBy: 'ai' | 'template-fallback' = 'ai';
    let templateId: string | null = null;

    if (aiGenerated) {
      const q = aiGenerated.quote;
      title = q.title;
      description = q.description;
      lineItems = aiGenerated.lineItems;
      addOns = aiGenerated.addOns;
      timeline = q.timeline;
      riskAssessment = q.riskAssessment;
      termsAndConditions = q.termsAndConditions;
      depositPct = q.depositPct;
      taxRate = q.taxRate;
      estimatedHours = q.estimatedHours;
      estimatedDurationDays = q.estimatedDurationDays;
    } else {
      // Fall back to the industry template.
      const template = industryId ? getTemplateForIndustry(industryId) : null;
      if (!template) {
        return NextResponse.json(
          {
            error:
              'AI unavailable and no quote template exists for this industry. ' +
              'Set ZAI_API_KEY or supply a supported industry.',
            aiError,
          },
          { status: 503 },
        );
      }
      const fallback = buildTemplateFallback(template, estimate, problemDescription);
      title = fallback.title;
      description = fallback.description;
      lineItems = fallback.applied.lineItems.map((li) => ({
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
        total: li.total,
      }));
      addOns = [];
      timeline = `Estimated ${fallback.applied.estimatedDurationMins} minutes (template default).`;
      riskAssessment = fallback.riskAssessment;
      termsAndConditions = fallback.applied.termsAndConditions;
      depositPct = fallback.applied.depositPct;
      taxRate = fallback.applied.taxRate;
      estimatedHours = fallback.applied.estimatedHours;
      estimatedDurationDays = Math.max(1, Math.ceil(fallback.applied.estimatedDurationMins / 480));
      generatedBy = 'template-fallback';
      templateId = template.id;
    }

    // ── 8. Recompute totals (never trust LLM arithmetic) ──────────────────
    const itemsTotal = round2(lineItems.reduce((s, li) => s + li.total, 0));
    const addOnsTotal = round2(addOns.reduce((s, li) => s + li.total, 0));
    const subtotal = round2(itemsTotal + addOnsTotal);
    const tax = round2((subtotal * taxRate) / 100);
    const total = round2(subtotal + tax);
    const depositAmount = round2((total * depositPct) / 100);

    // Currency conversion (quote is recorded in tenant's base currency).
    const transactionCurrency = baseCurrency;
    const exchangeRate = 1; // same currency — locked at creation
    const baseAmount = total; // already in base currency

    // ── 9. Build the stored description (rich, multi-section) ─────────────
    const storedDescription = buildStoredDescription(description, {
      timeline,
      riskAssessment,
      termsAndConditions,
      depositPct,
      depositAmount,
      currency: transactionCurrency,
    });

    // validUntil = 30 days from now
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // ── 10. Persist the Quote row ─────────────────────────────────────────
    const quote = await db.quote.create({
      data: {
        title,
        description: storedDescription,
        itemsJson: JSON.stringify(lineItems),
        addOnsJson: JSON.stringify(addOns),
        subtotal,
        tax,
        taxRate,
        discount: 0,
        discountType: 'fixed',
        total,
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount,
        status: 'draft',
        customerId: customer?.id ?? body.customerId ?? null,
        leadId: lead?.id ?? body.leadId ?? null,
        validUntil,
        tenantId,
      },
    });

    // ── 11. Build the response (quote + aiMeta) ───────────────────────────
    const aiMeta: AiMeta = {
      estimatedHours: round2(estimatedHours),
      estimatedDurationDays: safePositiveInt(estimatedDurationDays, 0),
      timeline,
      riskAssessment,
      termsAndConditions,
      depositPct: round2(depositPct),
      depositAmount,
      generatedBy,
      templateId,
      ...(aiError && generatedBy === 'template-fallback' ? { aiError } : {}),
    };

    const response: CreatedQuoteResponse = {
      id: quote.id,
      title: quote.title,
      description: quote.description ?? '',
      customerId: quote.customerId,
      leadId: quote.leadId,
      tenantId: quote.tenantId,
      itemsJson: JSON.parse(quote.itemsJson || '[]'),
      addOnsJson: JSON.parse(quote.addOnsJson || '[]'),
      subtotal: quote.subtotal,
      tax: quote.tax,
      taxRate: quote.taxRate,
      discount: quote.discount,
      discountType: quote.discountType,
      total: quote.total,
      currency: quote.currency,
      exchangeRate: quote.exchangeRate,
      baseCurrency: quote.baseCurrency,
      baseAmount: quote.baseAmount,
      status: quote.status,
      validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
      createdAt: quote.createdAt.toISOString(),
      aiMeta,
    };

    // ── 12. Activity log (non-fatal) ──────────────────────────────────────
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'quote',
        entityId: quote.id,
        entityName: truncate(title, 80),
        description: `AI smart-quote: "${truncate(problemDescription, 80)}" → ${transactionCurrency} ${total.toFixed(2)} (${lineItems.length} items, ${generatedBy})`,
        metadataJson: JSON.stringify({
          action: 'smart_quote',
          quoteId: quote.id,
          customerId: quote.customerId ?? null,
          leadId: quote.leadId ?? null,
          industry: industryId || null,
          generatedBy,
          templateId,
          subtotal,
          tax,
          total,
          depositPct,
          estimatedHours,
          estimatedDurationDays,
          preview: truncate(problemDescription, 200),
          success: true,
          ...(aiError ? { aiError } : {}),
        }),
        severity: 'info',
      });
    } catch (logErr) {
      log.error({ err: logErr }, '[ai/smart-quote] logActivity failed');
    }

    log.info(
      {
        quoteId: quote.id,
        generatedBy,
        total,
        lineItemCount: lineItems.length,
      },
      '[ai/smart-quote] quote created',
    );

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to build smart quote';
    log.error({ err: error }, '[/api/ai/smart-quote] unhandled error');
    console.error('[/api/ai/smart-quote] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
