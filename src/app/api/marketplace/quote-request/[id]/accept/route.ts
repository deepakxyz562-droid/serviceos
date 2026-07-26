import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { notifyOwner } from '@/lib/owner-notifications';

/**
 * Flow 2: Quote Request — accept (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * POST /api/marketplace/quote-request/[id]/accept
 *
 * Customer accepts a specific quote. The JobRequest transitions to
 * status='accepted' with acceptedQuoteId + acceptedAt set; all other quotes
 * are marked 'rejected'; a Booking is created with bookingType='quote_request';
 * a MarketplaceTransaction (escrow) is created; a Job is created for the
 * winning provider; the winning provider is notified.
 *
 * Body:
 *   { quoteId: string }
 *
 * Public endpoint — the marketplace customer is not authenticated. We rely
 * on the opaque jobRequestId + quoteId being known to the customer (both
 * were returned by the create + submit-quote endpoints).
 *
 * Returns: { jobRequest, booking, job, transactionId }
 */

const DEFAULT_COMMISSION_PCT = 5;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
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

  // ── 1. Parse body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const quoteId =
    typeof body.quoteId === 'string' && body.quoteId.trim().length > 0
      ? body.quoteId.trim()
      : null;
  if (!quoteId) {
    return NextResponse.json(
      { error: '`quoteId` is required.' },
      { status: 400 },
    );
  }

  // ── 2. Load job request + winning quote (and the provider tenant) ──
  let jobRequest;
  try {
    jobRequest = await db.jobRequest.findUnique({
      where: { id },
      include: {
        quotes: {
          select: {
            id: true,
            title: true,
            total: true,
            currency: true,
            tenantId: true,
            status: true,
            validUntil: true,
          },
        },
      },
    });
  } catch (err) {
    log.error({ err, id }, 'marketplace/quote-accept: job request lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!jobRequest) {
    return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
  }
  if (jobRequest.status !== 'open' && jobRequest.status !== 'quoted') {
    return NextResponse.json(
      { error: `Job request is no longer accepting acceptances (status: ${jobRequest.status}).` },
      { status: 409 },
    );
  }

  const winningQuote = jobRequest.quotes.find((q) => q.id === quoteId);
  if (!winningQuote) {
    return NextResponse.json(
      { error: 'Quote not found for this job request.' },
      { status: 404 },
    );
  }
  if (winningQuote.status !== 'sent' && winningQuote.status !== 'draft') {
    return NextResponse.json(
      { error: `Quote is not in an acceptable state (status: ${winningQuote.status}).` },
      { status: 409 },
    );
  }
  if (winningQuote.validUntil && winningQuote.validUntil < new Date()) {
    return NextResponse.json(
      { error: 'Quote has expired.' },
      { status: 409 },
    );
  }
  if (!winningQuote.tenantId) {
    return NextResponse.json(
      { error: 'Winning quote has no provider tenant — cannot accept.' },
      { status: 500 },
    );
  }

  // ── 3. Load provider tenant + a workspace for the Job ──────────────
  let provider: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    email: string | null;
    phone: string | null;
  } | null;
  try {
    provider = await db.tenant.findUnique({
      where: { id: winningQuote.tenantId },
      select: { id: true, name: true, slug: true, currency: true, email: true, phone: true },
    });
  } catch (err) {
    log.error({ err, tenantId: winningQuote.tenantId }, 'marketplace/quote-accept: provider lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json({ error: 'Provider tenant no longer exists.' }, { status: 404 });
  }

  let workspaceId: string | null = null;
  try {
    const ws = await db.workspace.findFirst({
      where: { tenantId: provider.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    workspaceId = ws?.id ?? null;
  } catch {
    // ignore — Job will be created without workspace
  }

  // ── 4. Compute commission + provider amount ────────────────────────
  const grossAmount = winningQuote.total;
  const commissionAmount =
    Math.round(grossAmount * DEFAULT_COMMISSION_PCT) / 100;
  const providerAmount =
    Math.round((grossAmount - commissionAmount) * 100) / 100;
  const currency = winningQuote.currency || 'USD';

  const title = `Accepted Quote — ${jobRequest.title}`.slice(0, 200);
  const description = jobRequest.description || `Quote accepted for ${jobRequest.title}`;

  // ── 5. Atomic transition: JobRequest → accepted, Quote → accepted,
  //       all other quotes → rejected, create Booking + Transaction + Job ──
  let result: {
    jobRequest: Record<string, unknown>;
    booking: Record<string, unknown>;
    job: Record<string, unknown>;
    transactionId: string;
  };
  try {
    result = await db.$transaction(async (tx) => {
      // Optimistic lock: only update if status is still open|quoted.
      const updatedRows = await tx.jobRequest.updateMany({
        where: { id, status: { in: ['open', 'quoted'] } },
        data: {
          status: 'accepted',
          acceptedQuoteId: quoteId,
          acceptedAt: new Date(),
          tenantId: provider.id, // lock to the winning provider
        },
      });
      if (updatedRows.count === 0) {
        throw new Error('JOB_REQUEST_ALREADY_ACCEPTED');
      }

      // Mark winning quote accepted, others rejected.
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'accepted' },
      });
      await tx.quote.updateMany({
        where: { jobRequestId: id, id: { not: quoteId } },
        data: { status: 'rejected' },
      });

      // Booking
      const booking = await tx.booking.create({
        data: {
          title,
          description,
          bookingType: 'quote_request',
          status: 'confirmed',
          source: 'website',
          customerName: jobRequest.customerName,
          customerPhone: jobRequest.customerPhone,
          customerEmail: jobRequest.customerEmail,
          serviceId: jobRequest.serviceId,
          address: jobRequest.address,
          scheduledAt: null, // to be scheduled later
          duration: 60,
          notes: jobRequest.description,
          confirmedAt: new Date(),
          tenantId: provider.id,
          workspaceId,
          metadataJson: JSON.stringify({
            marketplaceFlow: 'quote_request',
            jobRequestId: id,
            quoteId,
            providerTenantId: provider.id,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // MarketplaceTransaction (escrow)
      const txn = await tx.marketplaceTransaction.create({
        data: {
          tenantId: provider.id,
          customerName: jobRequest.customerName,
          customerPhone: jobRequest.customerPhone,
          customerEmail: jobRequest.customerEmail,
          bookingId: booking.id,
          bookingType: 'quote_request',
          serviceDescription: title,
          totalAmount: grossAmount,
          commissionPct: DEFAULT_COMMISSION_PCT,
          commissionAmount,
          providerAmount,
          currency,
          status: grossAmount > 0 ? 'escrow' : 'pending',
          metadataJson: JSON.stringify({
            flow: 'quote_request',
            jobRequestId: id,
            quoteId,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // Job — linked to the booking via externalId
      const job = await tx.job.create({
        data: {
          title,
          description,
          status: 'assigned',
          priority: 'medium',
          type: 'service',
          address: jobRequest.address,
          scheduledAt: null,
          estimatedDuration: 60,
          notes: jobRequest.description,
          customerName: jobRequest.customerName,
          customerPhone: jobRequest.customerPhone,
          customerEmail: jobRequest.customerEmail,
          externalId: booking.id,
          externalSource: 'marketplace_booking',
          serviceId: jobRequest.serviceId,
          assignmentStatus: 'accepted',
          metadataJson: JSON.stringify({
            marketplaceFlow: 'quote_request',
            bookingId: booking.id,
            transactionId: txn.id,
            jobRequestId: id,
            quoteId,
            providerTenantId: provider.id,
          }),
          workspaceId,
        },
      });

      // Link transaction → job
      await tx.marketplaceTransaction.update({
        where: { id: txn.id },
        data: { jobId: job.id },
      });

      const freshJobRequest = await tx.jobRequest.findUnique({
        where: { id },
        select: { id: true, status: true, acceptedQuoteId: true, acceptedAt: true, tenantId: true },
      });

      return {
        jobRequest: freshJobRequest ?? {},
        booking,
        job,
        transactionId: txn.id,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'JOB_REQUEST_ALREADY_ACCEPTED') {
      return NextResponse.json(
        { error: 'This job request has already been accepted.' },
        { status: 409 },
      );
    }
    log.error({ err, id, quoteId }, 'marketplace/quote-accept: transaction failed');
    return NextResponse.json({ error: 'Failed to accept quote' }, { status: 500 });
  }

  // ── 6. Notify the winning provider (best-effort, fire-and-forget) ──
  notifyOwner(provider.id, {
    eventType: 'marketplace.quote.accepted',
    eventLabel: 'Quote Accepted',
    bookingId: (result.booking as { id: string }).id,
    actionUrl: '/bookings',
    smsMessage: `Your quote was accepted! ${title}, customer: ${jobRequest.customerName || 'N/A'}, total: ${grossAmount} ${currency}.`,
    emailSubject: `Quote Accepted: ${title}`,
    emailText: `Your marketplace quote was accepted by the customer.\n\nTitle: ${title}\nCustomer: ${jobRequest.customerName || 'N/A'}\nPhone: ${jobRequest.customerPhone || 'N/A'}\nTotal: ${grossAmount} ${currency}\n\nView this job in your ServiceOS dashboard.`,
    emailHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#0f172a">Quote Accepted</h2><p>The customer accepted your marketplace quote.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Title</td><td style="padding:8px">${title}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Customer</td><td style="padding:8px">${jobRequest.customerName || 'N/A'}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Phone</td><td style="padding:8px">${jobRequest.customerPhone || 'N/A'}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Total</td><td style="padding:8px">${grossAmount} ${currency}</td></tr></table></div>`,
    pushTitle: 'Quote Accepted!',
    pushBody: `${jobRequest.customerName || 'A customer'} accepted your quote — ${grossAmount} ${currency}`,
  }).catch((err) => {
    log.warn({ err }, 'marketplace/quote-accept: provider notification failed');
  });

  log.info(
    {
      jobRequestId: id,
      quoteId,
      bookingId: (result.booking as { id: string }).id,
      jobId: (result.job as { id: string }).id,
      transactionId: result.transactionId,
      providerTenantId: provider.id,
    },
    'marketplace/quote-accept: completed',
  );

  return NextResponse.json(
    {
      jobRequest: result.jobRequest,
      booking: result.booking,
      job: result.job,
      transactionId: result.transactionId,
    },
    { status: 201 },
  );
}
