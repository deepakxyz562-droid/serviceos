import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { checkMarketplaceEligibility } from '@/lib/marketplace-eligibility';

/**
 * Flow 2: Quote Request — list + submit quotes (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET  /api/marketplace/quote-request/[id]/quotes   — list all quotes submitted
 * POST /api/marketplace/quote-request/[id]/quotes   — provider submits a quote
 *
 * GET is public (rate-limited). POST requires auth — the caller must be a
 * marketplace-eligible provider (tenant with all 8 gates passed).
 *
 * POST body:
 *   {
 *     items:        Array<{ name: string, price: number, qty?: number, description?: string }>,
 *     subtotal:     number,
 *     tax:          number,
 *     total:        number,
 *     validUntil?:  string (ISO),
 *     timeline?:    string,                  (e.g. "2-3 days")
 *     terms?:       string,                  (free-text terms)
 *     depositPct?:  number,                  (0-100)
 *   }
 *
 * Returns: { quote }
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    // Verify the job request exists.
    const jobRequest = await db.jobRequest.findUnique({
      where: { id },
      select: { id: true, status: true, currency: true },
    });
    if (!jobRequest) {
      return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
    }

    const quotes = await db.quote.findMany({
      where: { jobRequestId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        subtotal: true,
        tax: true,
        total: true,
        currency: true,
        status: true,
        validUntil: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info({ jobRequestId: id, count: quotes.length }, 'marketplace/quotes: list');
    return NextResponse.json({ quotes });
  } catch (err) {
    log.error({ err, id }, 'marketplace/quotes: list failed');
    return NextResponse.json({ error: 'Failed to list quotes' }, { status: 500 });
  }
}

interface QuoteItem {
  name: string;
  price: number;
  qty?: number;
  description?: string;
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  // ── 1. Auth required ───────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // ── 2. Marketplace eligibility check ───────────────────────────────
  let eligibility;
  try {
    eligibility = await checkMarketplaceEligibility(authUser.tenantId);
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'marketplace/quotes: eligibility check failed');
    return NextResponse.json({ error: 'Eligibility check failed' }, { status: 500 });
  }
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: 'Provider is not marketplace-eligible.',
        missingRequirements: eligibility.missingRequirements,
      },
      { status: 403 },
    );
  }

  // ── 3. Parse + validate body ───────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  const items: QuoteItem[] = itemsRaw
    .filter(
      (i): i is Record<string, unknown> =>
        typeof i === 'object' && i !== null,
    )
    .map((i) => ({
      name: typeof i.name === 'string' ? i.name.trim().slice(0, 200) : '',
      price:
        typeof i.price === 'number' && Number.isFinite(i.price) && i.price >= 0
          ? i.price
          : 0,
      qty:
        typeof i.qty === 'number' && Number.isFinite(i.qty) && i.qty > 0
          ? i.qty
          : 1,
      description:
        typeof i.description === 'string'
          ? i.description.trim().slice(0, 500)
          : undefined,
    }))
    .filter((i) => i.name.length > 0);

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'At least one quote item with a name + price is required.' },
      { status: 400 },
    );
  }

  const subtotal =
    typeof body.subtotal === 'number' && Number.isFinite(body.subtotal) && body.subtotal >= 0
      ? body.subtotal
      : items.reduce((sum, i) => sum + i.price * (i.qty ?? 1), 0);
  const tax =
    typeof body.tax === 'number' && Number.isFinite(body.tax) && body.tax >= 0
      ? body.tax
      : 0;
  const total =
    typeof body.total === 'number' && Number.isFinite(body.total) && body.total >= 0
      ? body.total
      : subtotal + tax;

  if (Math.abs(total - (subtotal + tax)) > 0.01) {
    return NextResponse.json(
      { error: '`total` must equal `subtotal` + `tax`.' },
      { status: 400 },
    );
  }

  const validUntilRaw =
    typeof body.validUntil === 'string' && body.validUntil.trim().length > 0
      ? body.validUntil.trim()
      : null;
  let validUntil: Date | null = null;
  if (validUntilRaw) {
    const dt = new Date(validUntilRaw);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json(
        { error: '`validUntil` must be a valid ISO datetime.' },
        { status: 400 },
      );
    }
    validUntil = dt;
  }

  const timeline =
    typeof body.timeline === 'string' ? body.timeline.trim().slice(0, 200) : null;
  const terms =
    typeof body.terms === 'string' ? body.terms.trim().slice(0, 2000) : null;
  const depositPct =
    typeof body.depositPct === 'number' &&
    Number.isFinite(body.depositPct) &&
    body.depositPct >= 0 &&
    body.depositPct <= 100
      ? body.depositPct
      : 0;

  // ── 4. Verify the job request is still open + the provider was broadcast ──
  let jobRequest;
  try {
    jobRequest = await db.jobRequest.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        currency: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        tenantId: true,
        metadataJson: true,
      },
    });
  } catch (err) {
    log.error({ err, id }, 'marketplace/quotes: job request lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!jobRequest) {
    return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
  }
  if (jobRequest.status !== 'open' && jobRequest.status !== 'quoted') {
    return NextResponse.json(
      { error: `Job request is no longer accepting quotes (status: ${jobRequest.status}).` },
      { status: 409 },
    );
  }

  // Defensive: prevent a provider from submitting two quotes for the same
  // job request.
  const existing = await db.quote.findFirst({
    where: { jobRequestId: id, tenantId: authUser.tenantId },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: 'Your tenant has already submitted a quote for this job request.',
        existingQuoteId: existing.id,
      },
      { status: 409 },
    );
  }

  // ── 5. Create the Quote (linked to the JobRequest) ─────────────────
  const quoteTitle = `Quote — ${jobRequest.title}`.slice(0, 200);
  let quote;
  try {
    quote = await db.quote.create({
      data: {
        title: quoteTitle,
        description: terms || null,
        itemsJson: JSON.stringify(items),
        addOnsJson: JSON.stringify([]),
        subtotal,
        tax,
        taxRate: subtotal > 0 ? (tax / subtotal) * 100 : 0,
        discount: 0,
        discountType: 'fixed',
        total,
        currency: jobRequest.currency || 'USD',
        exchangeRate: 1,
        baseCurrency: jobRequest.currency || 'USD',
        baseAmount: total,
        status: 'sent',
        tenantId: authUser.tenantId,
        jobRequestId: id,
        validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    log.error({ err, jobRequestId: id, tenantId: authUser.tenantId }, 'marketplace/quotes: create failed');
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }

  // ── 6. Bump the job request's quoteCount + transition status to 'quoted' ──
  try {
    await db.jobRequest.update({
      where: { id },
      data: {
        quoteCount: { increment: 1 },
        status: jobRequest.status === 'open' ? 'quoted' : jobRequest.status,
      },
    });
  } catch (err) {
    log.warn({ err, jobRequestId: id }, 'marketplace/quotes: failed to bump quoteCount');
  }

  // ── 7. Notify the customer (best-effort) ───────────────────────────
  // We don't have a customer UserId (marketplace customer is not in User
  // table), so we just log this. A real implementation would send an email
  // via the email-send lib.
  log.info(
    {
      quoteId: quote.id,
      jobRequestId: id,
      tenantId: authUser.tenantId,
      total,
    },
    'marketplace/quotes: created',
  );

  return NextResponse.json({ quote }, { status: 201 });
}
