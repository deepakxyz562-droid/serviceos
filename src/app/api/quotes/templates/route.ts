import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { withRequestId } from '@/lib/logger';
import {
  QUOTE_TEMPLATES,
  getTemplateById,
  getTemplatesForIndustry,
  applyTemplate,
  type TemplateVariables,
  type QuoteTemplate,
  type AppliedQuote,
} from '@/lib/quote-templates';

/**
 * Quote Templates API (ServiceOS V1.5 — P6-quotes)
 * -------------------------------------------------
 * GET  /api/quotes/templates         — list templates (?industry= filter)
 * POST /api/quotes/templates         — apply a template, create a Quote row
 *
 * GET returns the full catalog (7 industry templates) or a filtered subset.
 * Each item is returned in a UI-friendly shape (no pricing applied yet).
 *
 * POST body:
 *   { templateId: string, customerId: string, variables?: TemplateVariables }
 *
 * POST flow:
 *   1. Look up the template by ID (404 if unknown).
 *   2. Validate the customer belongs to the caller's tenant (404 otherwise).
 *   3. Apply the template with the supplied variables (defaults if missing).
 *   4. Resolve the tenant's currency + exchange rate.
 *   5. Persist a Quote row (status='draft').
 *   6. Return the created quote.
 *
 * Auth: required. Tenant scoping is enforced on the customer lookup and on
 * the persisted Quote row.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface PublicTemplateItem {
  name: string;
  description: string;
  unit: string;
  defaultQuantity: number;
  unitPrice: number | string;
  hoursPerUnit?: number;
}

interface PublicTemplate {
  id: string;
  industry: string;
  name: string;
  description: string;
  items: PublicTemplateItem[];
  defaultTaxRate: number;
  defaultDepositPct: number;
  termsAndConditions: string;
  estimatedDurationMins: number;
}

interface ApplyRequestBody {
  templateId: string;
  customerId: string;
  leadId?: string;
  variables?: TemplateVariables;
  /** Optional title override (defaults to "<Template Name> — <Customer Name>"). */
  title?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function truncate(s: string | null | undefined, max = 200): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '\u2026' : s;
}

function toPublicTemplate(t: QuoteTemplate): PublicTemplate {
  return {
    id: t.id,
    industry: t.industry,
    name: t.name,
    description: t.description,
    items: t.items.map((i) => ({
      name: i.name,
      description: i.description,
      unit: i.unit,
      defaultQuantity: i.defaultQuantity,
      unitPrice: i.unitPrice,
      ...(i.hoursPerUnit !== undefined ? { hoursPerUnit: i.hoursPerUnit } : {}),
    })),
    defaultTaxRate: t.defaultTaxRate,
    defaultDepositPct: t.defaultDepositPct,
    termsAndConditions: t.termsAndConditions,
    estimatedDurationMins: t.estimatedDurationMins,
  };
}

/**
 * Load a customer scoped to the tenant. The Customer model has no `tenantId`
 * column — it links via `workspaceId`.
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
      select: { id: true, name: true, phone: true, email: true, address: true },
    });
  } catch {
    return null;
  }
}

/** Load a lead scoped to the tenant (Lead has a direct tenantId column). */
async function loadLeadScoped(leadId: string, tenantId: string) {
  try {
    return await db.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { id: true, name: true, serviceType: true },
    });
  } catch {
    return null;
  }
}

/** Build the multi-section description stored on the Quote row. */
function buildStoredDescription(
  template: QuoteTemplate,
  applied: AppliedQuote,
  customerName: string,
  companyName: string,
): string {
  const sections: string[] = [];
  sections.push(
    `${template.name} — generated from template. Customer: ${customerName || '—'}. ` +
      `Company: ${companyName || '—'}. Estimated duration: ${applied.estimatedDurationMins} minutes.`,
  );
  sections.push(`Estimated hours of labour: ${applied.estimatedHours}.`);
  sections.push(`Deposit: ${applied.depositPct}% due on approval (${applied.depositAmount.toFixed(2)}).`);
  sections.push(`Terms & Conditions:\n${applied.termsAndConditions}`);
  return sections.join('\n\n');
}

// ─── GET: list templates ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    // Note: we intentionally allow any authenticated user (including customer
    // portal sessions) to LIST templates — the catalog itself is not secret.
    // Applying a template (POST) is restricted to staff via tenant scoping.

    const { searchParams } = new URL(request.url);
    const industryFilter = searchParams.get('industry');

    let templates: QuoteTemplate[];
    if (industryFilter) {
      templates = getTemplatesForIndustry(industryFilter);
    } else {
      templates = QUOTE_TEMPLATES;
    }

    log.info(
      { count: templates.length, industryFilter },
      '[quotes/templates] list',
    );

    return NextResponse.json({
      count: templates.length,
      templates: templates.map(toPublicTemplate),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to list templates';
    log.error({ err: error }, '[/api/quotes/templates GET] error');
    console.error('[/api/quotes/templates GET] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: apply template → create Quote ──────────────────────────────────

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
    // Customer-portal sessions may not apply templates — only staff.
    if (user.role === 'customer') {
      return NextResponse.json(
        { error: 'Customers cannot apply quote templates.' },
        { status: 403 },
      );
    }

    // ── 2. Parse + validate body ──────────────────────────────────────────
    const body = (await request.json().catch(() => null)) as ApplyRequestBody | null;
    if (!body || !body.templateId || !body.customerId) {
      return NextResponse.json(
        { error: 'templateId and customerId are required.' },
        { status: 400 },
      );
    }

    // ── 3. Resolve template ───────────────────────────────────────────────
    const template = getTemplateById(body.templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template "${body.templateId}" not found.` },
        { status: 404 },
      );
    }

    // ── 4. Resolve customer (must belong to tenant) ───────────────────────
    const customer = await loadCustomerScoped(body.customerId, tenantId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found in this tenant.' },
        { status: 404 },
      );
    }

    // ── 5. Resolve lead (optional, must belong to tenant) ─────────────────
    let lead: { id: string; name: string } | null = null;
    if (body.leadId) {
      lead = await loadLeadScoped(body.leadId, tenantId);
      if (!lead) {
        return NextResponse.json(
          { error: 'Lead not found in this tenant.' },
          { status: 404 },
        );
      }
    }

    // ── 6. Load tenant (currency + name) ──────────────────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, currency: true },
    });
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found.' },
        { status: 404 },
      );
    }
    const baseCurrency = tenant.currency || 'USD';

    // ── 7. Apply the template (variables sanitized inside applyTemplate) ──
    const variables: TemplateVariables = {
      customerName: customer.name ?? undefined,
      companyName: tenant.name ?? undefined,
      ...(body.variables ?? {}),
    };
    const applied = applyTemplate(template, variables);

    // ── 8. Currency conversion (quote is recorded in tenant's base currency) ──
    // Templates price in a numeric "neutral" currency. We treat the applied
    // totals as being in the tenant's base currency directly (the templates
    // don't carry their own currency). If the caller wants a different
    // transaction currency, they can POST-convert; for now we lock 1:1.
    const transactionCurrency = baseCurrency;
    const exchangeRate = 1;
    const baseAmount = applied.total;

    // ── 9. Build stored description ───────────────────────────────────────
    const storedDescription = buildStoredDescription(
      template,
      applied,
      customer.name ?? '',
      tenant.name ?? '',
    );

    const title =
      (body.title && body.title.trim()) ||
      `${template.name} — ${customer.name || 'Customer'}`;
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // ── 10. Persist the Quote row ─────────────────────────────────────────
    const quote = await db.quote.create({
      data: {
        title: title.slice(0, 200),
        description: storedDescription,
        itemsJson: JSON.stringify(applied.lineItems),
        addOnsJson: JSON.stringify([]),
        subtotal: round2(applied.subtotal),
        tax: round2(applied.tax),
        taxRate: round2(applied.taxRate),
        discount: 0,
        discountType: 'fixed',
        total: round2(applied.total),
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount: round2(baseAmount),
        status: 'draft',
        customerId: customer.id,
        leadId: lead?.id ?? null,
        validUntil,
        tenantId,
      },
    });

    // ── 11. Activity log (non-fatal) ──────────────────────────────────────
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'user',
        action: 'create',
        entityType: 'quote',
        entityId: quote.id,
        entityName: truncate(title, 80),
        description: `Quote created from template "${template.name}" (${template.id}) → ${transactionCurrency} ${applied.total.toFixed(2)} for ${customer.name || 'customer'}`,
        metadataJson: JSON.stringify({
          action: 'template_apply',
          quoteId: quote.id,
          templateId: template.id,
          customerId: customer.id,
          leadId: lead?.id ?? null,
          subtotal: applied.subtotal,
          tax: applied.tax,
          total: applied.total,
          depositPct: applied.depositPct,
          depositAmount: applied.depositAmount,
          estimatedHours: applied.estimatedHours,
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      log.error({ err: logErr }, '[quotes/templates POST] logActivity failed');
    }

    log.info(
      { quoteId: quote.id, templateId: template.id, customerId: customer.id },
      '[quotes/templates POST] quote created from template',
    );

    return NextResponse.json(
      {
        id: quote.id,
        title: quote.title,
        description: quote.description,
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
        templateMeta: {
          templateId: template.id,
          templateName: template.name,
          industry: template.industry,
          depositPct: applied.depositPct,
          depositAmount: applied.depositAmount,
          estimatedHours: applied.estimatedHours,
          estimatedDurationMins: applied.estimatedDurationMins,
          termsAndConditions: applied.termsAndConditions,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to apply template';
    log.error({ err: error }, '[/api/quotes/templates POST] error');
    console.error('[/api/quotes/templates POST] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
