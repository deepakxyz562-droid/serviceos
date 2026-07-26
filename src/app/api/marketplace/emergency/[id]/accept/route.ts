import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { checkMarketplaceEligibility } from '@/lib/marketplace-eligibility';
import { notifyOwner } from '@/lib/owner-notifications';

/**
 * Flow 3: Emergency Dispatch — provider accept (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * POST /api/marketplace/emergency/[id]/accept
 *
 * A marketplace-eligible provider accepts an emergency dispatch.
 *
 * First-accept-wins: if another provider already accepted, return 409
 * Conflict. The atomic claim is done via `updateMany` with a `where` clause
 * on status='broadcasting' — if zero rows are updated, we know someone else
 * got there first.
 *
 * On success:
 *   - EmergencyDispatch.status → 'accepted'
 *   - acceptedById / acceptedAt set
 *   - estimatedArrivalMins + estimatedCost stored
 *   - A Booking with bookingType='emergency' is created
 *   - A MarketplaceTransaction is created (escrow)
 *   - A Job is created for the accepting provider
 *   - The customer is notified (best-effort — no in-app notification since
 *     the marketplace customer isn't a User; we just log it)
 *
 * Body:
 *   {
 *     providerTenantId:    string,        (must match the auth'd tenant)
 *     estimatedArrivalMins: number,       (required, 1-600)
 *     estimatedCost:        number,       (required, ≥ 0)
 *   }
 *
 * Auth required (provider). Caller must be marketplace-eligible.
 *
 * Returns: { emergencyDispatch, booking, job, transactionId }
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
    log.error({ err, tenantId: authUser.tenantId }, 'marketplace/emergency/accept: eligibility check failed');
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

  const bodyTenantId =
    typeof body.providerTenantId === 'string' ? body.providerTenantId.trim() : '';
  const estimatedArrivalMins =
    typeof body.estimatedArrivalMins === 'number' &&
    Number.isFinite(body.estimatedArrivalMins) &&
    body.estimatedArrivalMins >= 1 &&
    body.estimatedArrivalMins <= 600
      ? Math.round(body.estimatedArrivalMins)
      : null;
  const estimatedCost =
    typeof body.estimatedCost === 'number' &&
    Number.isFinite(body.estimatedCost) &&
    body.estimatedCost >= 0
      ? body.estimatedCost
      : null;

  if (!bodyTenantId) {
    return NextResponse.json(
      { error: '`providerTenantId` is required.' },
      { status: 400 },
    );
  }
  if (bodyTenantId !== authUser.tenantId) {
    return NextResponse.json(
      { error: '`providerTenantId` must match the authenticated tenant.' },
      { status: 403 },
    );
  }
  if (estimatedArrivalMins == null) {
    return NextResponse.json(
      { error: '`estimatedArrivalMins` must be a number between 1 and 600.' },
      { status: 400 },
    );
  }
  if (estimatedCost == null) {
    return NextResponse.json(
      { error: '`estimatedCost` must be a non-negative number.' },
      { status: 400 },
    );
  }

  // ── 4. Fetch the dispatch (need customer info for Booking + Job) ───
  let dispatch;
  try {
    dispatch = await db.emergencyDispatch.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        industry: true,
        address: true,
        lat: true,
        lng: true,
        status: true,
        customerName: true,
        customerPhone: true,
        currency: true,
        metadataJson: true,
      },
    });
  } catch (err) {
    log.error({ err, id }, 'marketplace/emergency/accept: dispatch lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  // Customer email is stored in metadataJson (EmergencyDispatch has no
  // dedicated customerEmail column).
  let customerEmail: string | null = null;
  try {
    const meta = JSON.parse(dispatch.metadataJson || '{}');
    if (meta && typeof meta.customerEmail === 'string') {
      customerEmail = meta.customerEmail;
    }
  } catch {
    // ignore malformed JSON
  }
  if (!dispatch) {
    return NextResponse.json(
      { error: 'Emergency dispatch not found' },
      { status: 404 },
    );
  }

  // ── 5. Resolve provider tenant + workspace ─────────────────────────
  let provider: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  } | null;
  try {
    provider = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { id: true, name: true, slug: true, currency: true },
    });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'marketplace/emergency/accept: provider lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json({ error: 'Provider tenant not found' }, { status: 404 });
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

  // ── 6. Compute commission + provider amount ────────────────────────
  const grossAmount = estimatedCost;
  const commissionAmount =
    Math.round(grossAmount * DEFAULT_COMMISSION_PCT) / 100;
  const providerAmount =
    Math.round((grossAmount - commissionAmount) * 100) / 100;
  const currency = dispatch.currency || provider.currency || 'USD';

  const title = `Emergency — ${dispatch.title}`.slice(0, 200);
  const description = dispatch.description || `Emergency dispatch accepted by ${provider.name}`;

  // ── 7. Atomic first-accept-wins ────────────────────────────────────
  // updateMany with where: { id, status: 'broadcasting' } is atomic in
  // Postgres — if two providers race, only one updateMany returns count=1.
  let result: {
    emergencyDispatch: Record<string, unknown>;
    booking: Record<string, unknown>;
    job: Record<string, unknown>;
    transactionId: string;
  };
  try {
    result = await db.$transaction(async (tx) => {
      const claimRows = await tx.emergencyDispatch.updateMany({
        where: { id, status: 'broadcasting' },
        data: {
          status: 'accepted',
          tenantId: provider.id,
          acceptedById: provider.id,
          acceptedAt: new Date(),
          estimatedArrivalMins,
          estimatedCost: grossAmount,
          currency,
        },
      });
      if (claimRows.count === 0) {
        throw new Error('EMERGENCY_ALREADY_ACCEPTED');
      }

      // Booking
      const booking = await tx.booking.create({
        data: {
          title,
          description,
          bookingType: 'emergency',
          status: 'confirmed',
          source: 'website',
          customerName: dispatch.customerName,
          customerPhone: dispatch.customerPhone,
          customerEmail: customerEmail,
          address: dispatch.address,
          scheduledAt: new Date(), // emergency = now
          duration: 60,
          notes: dispatch.description,
          confirmedAt: new Date(),
          tenantId: provider.id,
          workspaceId,
          metadataJson: JSON.stringify({
            marketplaceFlow: 'emergency',
            emergencyDispatchId: id,
            providerTenantId: provider.id,
            estimatedArrivalMins,
            estimatedCost: grossAmount,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // MarketplaceTransaction (escrow)
      const txn = await tx.marketplaceTransaction.create({
        data: {
          tenantId: provider.id,
          customerName: dispatch.customerName,
          customerPhone: dispatch.customerPhone,
          customerEmail: customerEmail,
          bookingId: booking.id,
          bookingType: 'emergency',
          serviceDescription: title,
          totalAmount: grossAmount,
          commissionPct: DEFAULT_COMMISSION_PCT,
          commissionAmount,
          providerAmount,
          currency,
          status: grossAmount > 0 ? 'escrow' : 'pending',
          metadataJson: JSON.stringify({
            flow: 'emergency',
            emergencyDispatchId: id,
            estimatedArrivalMins,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // Job
      const job = await tx.job.create({
        data: {
          title,
          description,
          status: 'assigned',
          priority: 'urgent',
          type: 'service',
          address: dispatch.address,
          scheduledAt: new Date(),
          estimatedDuration: 60,
          notes: dispatch.description,
          customerName: dispatch.customerName,
          customerPhone: dispatch.customerPhone,
          customerEmail: customerEmail,
          externalId: booking.id,
          externalSource: 'marketplace_booking',
          assignmentStatus: 'accepted',
          metadataJson: JSON.stringify({
            marketplaceFlow: 'emergency',
            bookingId: booking.id,
            transactionId: txn.id,
            emergencyDispatchId: id,
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

      const freshDispatch = await tx.emergencyDispatch.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          acceptedById: true,
          acceptedAt: true,
          estimatedArrivalMins: true,
          estimatedCost: true,
          currency: true,
        },
      });

      return {
        emergencyDispatch: freshDispatch ?? {},
        booking,
        job,
        transactionId: txn.id,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'EMERGENCY_ALREADY_ACCEPTED') {
      return NextResponse.json(
        { error: 'This emergency has already been accepted by another provider.' },
        { status: 409 },
      );
    }
    log.error({ err, id, tenantId: authUser.tenantId }, 'marketplace/emergency/accept: transaction failed');
    return NextResponse.json({ error: 'Failed to accept emergency' }, { status: 500 });
  }

  // ── 8. Best-effort: notify the customer via SMS (if we had their
  //       User account we'd send an in-app notification too). For now
  //       we just log — the customer polls /emergency/[id] for status.
  logger.info(
    {
      dispatchId: id,
      bookingId: (result.booking as { id: string }).id,
      jobId: (result.job as { id: string }).id,
      transactionId: result.transactionId,
      providerTenantId: provider.id,
      estimatedArrivalMins,
      customerPhone: dispatch.customerPhone,
    },
    'marketplace/emergency/accept: completed — customer should poll status',
  );

  // Also notify the provider's own team (in case the dispatcher isn't the
  // technician who'll do the job — the in-app bell alerts the owner).
  notifyOwner(provider.id, {
    eventType: 'marketplace.emergency.accepted',
    eventLabel: 'Emergency Accepted',
    bookingId: (result.booking as { id: string }).id,
    actionUrl: '/bookings',
    smsMessage: `Emergency accepted! ${title}, ETA ${estimatedArrivalMins} min, customer: ${dispatch.customerName || 'N/A'} (${dispatch.customerPhone || 'N/A'}).`,
    emailSubject: `Emergency Accepted: ${title}`,
    emailText: `Your tenant accepted an emergency dispatch.\n\nTitle: ${title}\nCustomer: ${dispatch.customerName || 'N/A'}\nPhone: ${dispatch.customerPhone || 'N/A'}\nAddress: ${dispatch.address || 'N/A'}\nETA: ${estimatedArrivalMins} minutes\nEstimated cost: ${grossAmount} ${currency}\n\nView this job in your ServiceOS dashboard.`,
    emailHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#dc2626">Emergency Accepted</h2><p>Your tenant accepted an emergency dispatch.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Title</td><td style="padding:8px">${title}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Customer</td><td style="padding:8px">${dispatch.customerName || 'N/A'}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Phone</td><td style="padding:8px">${dispatch.customerPhone || 'N/A'}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Address</td><td style="padding:8px">${dispatch.address || 'N/A'}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">ETA</td><td style="padding:8px">${estimatedArrivalMins} minutes</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Est. Cost</td><td style="padding:8px">${grossAmount} ${currency}</td></tr></table></div>`,
    pushTitle: 'Emergency Accepted!',
    pushBody: `${dispatch.customerName || 'Customer'} — ETA ${estimatedArrivalMins} min`,
  }).catch((err) => {
    log.warn({ err }, 'marketplace/emergency/accept: provider notification failed');
  });

  return NextResponse.json(
    {
      emergencyDispatch: result.emergencyDispatch,
      booking: result.booking,
      job: result.job,
      transactionId: result.transactionId,
    },
    { status: 201 },
  );
}
