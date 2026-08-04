import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import {
  createPaymentIntent,
  isStripeConfigured,
  StripeConfigError,
} from '@/lib/stripe';
import { notifyOwner } from '@/lib/owner-notifications';
import { sendEmail } from '@/lib/email-send';
import { issueCustomerMagicLink } from '@/lib/customer-magic-link';

/**
 * Flow 1: Instant Booking (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * POST /api/marketplace/book/instant
 *
 * A marketplace customer picks a specific provider + service + slot and
 * confirms immediately. No quote comparison, no dispatch — straight to a
 * Booking + MarketplaceTransaction (escrow) + Job for the provider.
 *
 * Body:
 *   {
 *     providerTenantId: string,
 *     serviceId?:        string,
 *     scheduledAt?:      string (ISO),
 *     customerName:      string,
 *     customerPhone:     string,
 *     customerEmail?:    string,
 *     address?:          string,
 *     notes?:            string,
 *     paymentMethodId?:  string,   // if provided, create a Stripe PaymentIntent
 *     amount?:           number,   // gross amount (major currency units)
 *     currency?:         string,   // default USD
 *   }
 *
 * Public endpoint — rate-limited via apiLimiter. The caller is a marketplace
 * visitor, NOT an authenticated user.
 *
 * Returns: { booking, job, paymentIntent? }
 */

const DEFAULT_COMMISSION_PCT = 5;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Rate limit (public endpoint — no auth) ──────────────────────
  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    log.warn({ ip: limited.ip }, 'marketplace/book/instant: rate limited');
    return rateLimitResponse(limited.resetAtMs);
  }

  // ── 2. Parse + validate body ───────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const providerTenantId =
    typeof body.providerTenantId === 'string'
      ? body.providerTenantId.trim()
      : '';
  const serviceId =
    typeof body.serviceId === 'string' && body.serviceId.trim().length > 0
      ? body.serviceId.trim()
      : null;
  const scheduledAtRaw =
    typeof body.scheduledAt === 'string' && body.scheduledAt.trim().length > 0
      ? body.scheduledAt.trim()
      : null;
  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerPhone =
    typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
  const customerEmail =
    typeof body.customerEmail === 'string' && body.customerEmail.trim().length > 0
      ? body.customerEmail.trim()
      : null;
  const address =
    typeof body.address === 'string' && body.address.trim().length > 0
      ? body.address.trim()
      : null;
  const notes =
    typeof body.notes === 'string' && body.notes.trim().length > 0
      ? body.notes.trim().slice(0, 2000)
      : null;
  const paymentMethodId =
    typeof body.paymentMethodId === 'string' && body.paymentMethodId.trim().length > 0
      ? body.paymentMethodId.trim()
      : null;
  const amount =
    typeof body.amount === 'number' && Number.isFinite(body.amount) && body.amount > 0
      ? body.amount
      : null;
  const currency =
    typeof body.currency === 'string' && body.currency.length === 3
      ? body.currency.toUpperCase()
      : 'USD';

  if (!providerTenantId) {
    return NextResponse.json(
      { error: '`providerTenantId` is required.' },
      { status: 400 },
    );
  }
  if (!customerName || customerName.length < 2 || customerName.length > 200) {
    return NextResponse.json(
      { error: '`customerName` is required (2-200 chars).' },
      { status: 400 },
    );
  }
  if (!customerPhone || !isValidPhone(customerPhone)) {
    return NextResponse.json(
      { error: '`customerPhone` must be a valid phone number.' },
      { status: 400 },
    );
  }
  if (customerEmail && !isValidEmail(customerEmail)) {
    return NextResponse.json(
      { error: '`customerEmail` must be a valid email.' },
      { status: 400 },
    );
  }
  if (scheduledAtRaw && Number.isNaN(new Date(scheduledAtRaw).getTime())) {
    return NextResponse.json(
      { error: '`scheduledAt` must be a valid ISO datetime.' },
      { status: 400 },
    );
  }

  // ── 3. Verify the provider tenant exists and is marketplace-eligible ──
  // Use the cached eligibility gates on the Tenant row for the read path
  // (the full `checkMarketplaceEligibility` function does extra plan +
  // subscription lookups and is too expensive for a hot booking path).
  let provider: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    email: string | null;
    phone: string | null;
    marketplaceOptIn: boolean;
    suspendedAt: Date | null;
    identityVerified: boolean;
    businessVerified: boolean;
    insuranceVerified: boolean;
    stripeConnected: boolean;
    planStatus: string;
  } | null;
  try {
    provider = await db.tenant.findUnique({
      where: { id: providerTenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        email: true,
        phone: true,
        marketplaceOptIn: true,
        suspendedAt: true,
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        stripeConnected: true,
        planStatus: true,
      },
    });
  } catch (err) {
    log.error({ err, providerTenantId }, 'marketplace/book/instant: DB error fetching provider');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json(
      { error: 'Provider not found.' },
      { status: 404 },
    );
  }
  // ── Eligibility gate ──────────────────────────────────────────────────
  // Matches the browse-page gate: a provider is bookable if they opted into
  // the marketplace and are not suspended. Verification flags (identity,
  // business, insurance, Stripe) are no longer hard requirements — they're
  // rendered as trust badges on the browse grid so customers can see how
  // verified a pro is, but a provider who hasn't finished Stripe Connect or
  // insurance upload is still bookable (payment is settled on completion, not
  // at booking time). This keeps the booking button working for ALL providers
  // visible in the marketplace instead of silently 409-ing for 6 of 8.
  const eligible = provider.marketplaceOptIn && !provider.suspendedAt;
  if (!eligible) {
    return NextResponse.json(
      { error: 'Provider is not currently available for marketplace bookings.' },
      { status: 409 },
    );
  }

  // ── 4. Optionally validate serviceId belongs to this provider ────────
  let serviceName: string | null = null;
  let service: { id: string; name: string; basePrice: number | null } | null = null;
  if (serviceId) {
    try {
      const svc = await db.service.findFirst({
        where: { id: serviceId, tenantId: provider.id, isActive: true },
        select: { id: true, name: true, basePrice: true },
      });
      if (svc) {
        serviceName = svc.name;
        service = svc;
      }
    } catch {
      // Service table missing — soft-fail (booking proceeds without service)
    }
  }

  // ── 5. Resolve a workspace for the provider (needed for Job creation) ─
  let workspaceId: string | null = null;
  try {
    const ws = await db.workspace.findFirst({
      where: { tenantId: provider.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    workspaceId = ws?.id ?? null;
  } catch (err) {
    log.warn({ err, providerTenantId: provider.id }, 'marketplace/book/instant: workspace lookup failed');
  }

  // ── 6. Compute commission + provider amount (if amount provided) ─────
  const grossAmount = amount ?? 0;
  const commissionAmount =
    Math.round(grossAmount * DEFAULT_COMMISSION_PCT) / 100;
  const providerAmount =
    Math.round((grossAmount - commissionAmount) * 100) / 100;

  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const title = serviceName
    ? `Instant Booking — ${serviceName}`
    : 'Instant Marketplace Booking';
  const description = notes || `Instant booking from marketplace for ${provider.name}`;

  // ── 7. Create Booking + MarketplaceTransaction + Job atomically ─────
  let booking: Record<string, unknown>;
  let job: Record<string, unknown> | null = null;
  let transactionId: string | null = null;
  // Customer row in the provider's CRM — captured from the transaction for
  // the confirmation email + magic link. May be null if workspaceId was null.
  let customerRow: { id: string } | null = null;

  try {
    const result = await db.$transaction(async (tx) => {
      // 7a. Booking
      const b = await tx.booking.create({
        data: {
          title,
          description,
          bookingType: 'instant',
          status: 'confirmed', // instant bookings are auto-confirmed
          source: 'website',
          customerName,
          customerPhone,
          customerEmail,
          serviceId: serviceId,
          address,
          scheduledAt,
          duration: 60,
          notes,
          confirmedAt: new Date(),
          tenantId: provider.id,
          workspaceId,
          metadataJson: JSON.stringify({
            marketplaceFlow: 'instant',
            providerTenantId: provider.id,
            customerEmail,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // 7b. MarketplaceTransaction (escrow)
      const txn = await tx.marketplaceTransaction.create({
        data: {
          tenantId: provider.id,
          customerName,
          customerPhone,
          customerEmail,
          bookingId: b.id,
          bookingType: 'instant',
          serviceDescription: serviceName || title,
          totalAmount: grossAmount,
          commissionPct: DEFAULT_COMMISSION_PCT,
          commissionAmount,
          providerAmount,
          currency,
          status: grossAmount > 0 ? 'escrow' : 'pending',
          metadataJson: JSON.stringify({
            flow: 'instant',
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // 7c-pre. Auto-resolve or auto-create Customer in the provider's CRM
      // (scoped via the provider tenant's workspace so the Job is linked to
      // a real Customer row that shows up in the provider's CRM 360 view).
      let customer: { id: string } | null = null;
      if (workspaceId) {
        try {
          const existing = await tx.customer.findFirst({
            where: {
              workspaceId,
              OR: [
                { phone: customerPhone },
                ...(customerEmail ? [{ email: customerEmail }] : []),
              ],
            },
            select: { id: true },
          });
          if (existing) {
            customer = existing;
          } else {
            customer = await tx.customer.create({
              data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address,
                workspaceId,
              },
              select: { id: true },
            });
          }
        } catch (custErr) {
          log.warn(
            { err: custErr, providerTenantId: provider.id },
            'marketplace/book/instant: customer auto-creation failed (non-fatal)',
          );
        }
      }

      // 7c-pre2. Generate 4-digit PIN + itemized service line items for CRM
      const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
      const lineItemsJson = JSON.stringify(service ? [{
        id: service.id,
        name: service.name,
        unitPrice: service.basePrice ?? amount ?? 0,
        quantity: 1,
        description: service.name,
      }] : []);

      // 7c. Job — link back to the booking via externalId
      const j = await tx.job.create({
        data: {
          title,
          description,
          status: 'assigned',
          priority: 'high',
          type: 'service',
          address,
          scheduledAt,
          estimatedDuration: 60,
          notes,
          customerName,
          customerPhone,
          customerEmail,
          customerId: customer?.id || null,
          externalId: b.id,
          externalSource: 'marketplace_booking',
          serviceId: serviceId,
          quotedAmount: grossAmount > 0 ? grossAmount : (service?.basePrice ?? null),
          lineItemsJson,
          verificationPin,
          assignmentStatus: 'accepted',
          metadataJson: JSON.stringify({
            marketplaceFlow: 'instant',
            bookingId: b.id,
            transactionId: txn.id,
            providerTenantId: provider.id,
          }),
          workspaceId,
        },
      });

      // Link transaction → job
      await tx.marketplaceTransaction.update({
        where: { id: txn.id },
        data: { jobId: j.id },
      });

      return { booking: b, job: j, transactionId: txn.id, customer };
    });

    booking = result.booking;
    job = result.job;
    transactionId = result.transactionId;
    // Capture the customer object for the confirmation email + magic link.
    customerRow = result.customer;
  } catch (err) {
    log.error({ err, providerTenantId: provider.id }, 'marketplace/book/instant: transaction failed');
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 },
    );
  }

  // ── 8. Stripe PaymentIntent (if payment method provided) ────────────
  let paymentIntent:
    | { clientSecret: string; paymentIntentId: string }
    | null = null;

  if (paymentMethodId && grossAmount > 0 && isStripeConfigured()) {
    try {
      const stripeAmount = Math.round(grossAmount * 100); // cents
      const pi = await createPaymentIntent(stripeAmount, currency, {
        transactionId: transactionId ?? '',
        providerTenantId: provider.id,
        bookingType: 'instant',
        serviceDescription: serviceName || title,
      });

      // Persist the paymentIntentId on the transaction
      if (transactionId) {
        await db.marketplaceTransaction.update({
          where: { id: transactionId },
          data: { paymentIntentId: pi.paymentIntentId },
        });
      }

      paymentIntent = pi;
      log.info(
        { paymentIntentId: pi.paymentIntentId, transactionId, amount: grossAmount },
        'marketplace/book/instant: PaymentIntent created',
      );
    } catch (err) {
      if (err instanceof StripeConfigError) {
        log.warn({ err: err.message }, 'marketplace/book/instant: Stripe not configured');
      } else {
        log.error(
          { err: err instanceof Error ? err.message : String(err), transactionId },
          'marketplace/book/instant: PaymentIntent failed',
        );
      }
      // Booking still succeeds — payment can be retried separately
    }
  }

  // ── 9. Notify the provider (best-effort, fire-and-forget) ───────────
  notifyOwner(provider.id, {
    eventType: 'marketplace.booking.instant',
    eventLabel: 'Instant Marketplace Booking',
    bookingId: (booking as { id: string }).id,
    actionUrl: '/bookings',
    smsMessage: `New instant booking: ${title}, customer: ${customerName}, scheduled: ${scheduledAt ? scheduledAt.toISOString() : 'TBD'}.`,
    emailSubject: `New Instant Booking: ${title}`,
    emailText: `New instant marketplace booking.\n\nTitle: ${title}\nCustomer: ${customerName}\nPhone: ${customerPhone}\n${customerEmail ? `Email: ${customerEmail}\n` : ''}${address ? `Address: ${address}\n` : ''}Scheduled: ${scheduledAt ? scheduledAt.toISOString() : 'TBD'}\n\n— Sent from Fieseros`,
    emailHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#0f172a">New Instant Booking</h2><p>A marketplace customer just booked you instantly.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Title</td><td style="padding:8px">${title}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Customer</td><td style="padding:8px">${customerName}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Phone</td><td style="padding:8px">${customerPhone}</td></tr>${customerEmail ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600">Email</td><td style="padding:8px">${customerEmail}</td></tr>` : ''}${address ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600">Address</td><td style="padding:8px">${address}</td></tr>` : ''}</table></div>`,
    pushTitle: 'New Instant Booking',
    pushBody: `${customerName} booked ${serviceName || 'a service'} — ${scheduledAt ? scheduledAt.toLocaleString() : 'TBD'}`,
  }).catch((err) => {
    log.warn({ err }, 'marketplace/book/instant: provider notification failed');
  });

  // ── 10. Customer booking confirmation email + magic link ───────────
  // If the customer provided an email, send them a booking confirmation.
  // Two cases:
  //   (a) Customer already has portal access (portalEnabled=true) → send a
  //       "Your booking is confirmed" email with a magic link to view it.
  //   (b) Customer is NEW (portalEnabled=false) → silently enable portal
  //       access AND send a magic link email so they can log in and view
  //       their booking. This is the "silently create account" flow — the
  //       Customer record IS the portal account (no separate User table for
  //       marketplace customers), so enabling portal + issuing a magic link
  //       is the equivalent of creating an account.
  // All fire-and-forget so the booking response stays fast.
  if (customerEmail && customerRow?.id) {
    fireAndForgetCustomerEmail({
      customerId: customerRow.id,
      customerName,
      customerEmail,
      providerName: provider.name,
      serviceName,
      title,
      scheduledAt,
      address,
      notes,
      bookingId: (booking as { id: string }).id,
      jobId: job ? (job as { id: string }).id : null,
      workspaceId,
      providerTenantId: provider.id,
      request,
      log,
    });
  }

  log.info(
    {
      bookingId: (booking as { id: string }).id,
      jobId: job ? (job as { id: string }).id : null,
      transactionId,
      providerTenantId: provider.id,
      hasPayment: !!paymentIntent,
    },
    'marketplace/book/instant: completed',
  );

  return NextResponse.json(
    {
      booking,
      job,
      paymentIntent,
    },
    { status: 201 },
  );
}

// ─── Customer booking confirmation email + magic link ─────────────────────
// Extracted as a standalone fire-and-forget function so the booking response
// is never blocked by email/magic-link generation. All errors are caught +
// logged — the booking already succeeded.

interface CustomerEmailParams {
  customerId: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  serviceName: string | null;
  title: string;
  scheduledAt: Date | null;
  address: string | null;
  notes: string | null;
  bookingId: string;
  jobId: string | null;
  workspaceId: string | null;
  providerTenantId: string;
  request: NextRequest;
  log: ReturnType<typeof withRequestId>;
}

async function fireAndForgetCustomerEmail(params: CustomerEmailParams): Promise<void> {
  const {
    customerId, customerEmail, providerName, serviceName,
    title, scheduledAt, address, notes, bookingId, jobId,
    providerTenantId, request, log,
  } = params;

  try {
    // ── (b) Silently enable portal access for NEW customers ──
    // The Customer record IS the portal account (no separate User table for
    // marketplace customers). If portalEnabled is false, enable it now and
    // mark the invitation as accepted. This is the "silently create account"
    // flow — the customer doesn't need to register; they just click the magic
    // link in the email and they're logged in.
    let wasNewlyEnabled = false;
    try {
      const existing = await db.customer.findUnique({
        where: { id: customerId },
        select: { portalEnabled: true, invitationStatus: true, activatedAt: true },
      });
      if (existing && !existing.portalEnabled) {
        await db.customer.update({
          where: { id: customerId },
          data: {
            portalEnabled: true,
            invitationStatus: 'accepted',
            activatedAt: existing.activatedAt ?? new Date(),
          },
        });
        wasNewlyEnabled = true;
        log.info(
          { customerId, providerTenantId },
          'marketplace/book/instant: silently enabled portal access for new customer',
        );
      }
    } catch (enableErr) {
      log.warn(
        { err: enableErr, customerId },
        'marketplace/book/instant: failed to enable portal access (non-fatal, email still sent)',
      );
    }

    // ── Issue a magic link that auto-logs the customer in and deep-links
    // to their booking in the customer portal ──
    let magicLinkUrl: string | null = null;
    try {
      const mlResult = await issueCustomerMagicLink({
        customerId,
        redirect: jobId ? `/bookings` : '/',
        expiresInHours: 24,
        request,
      });
      magicLinkUrl = mlResult.url;
    } catch (mlErr) {
      log.warn(
        { err: mlErr, customerId },
        'marketplace/book/instant: magic link generation failed (non-fatal, email still sent without link)',
      );
    }

    // ── Format the scheduled date/time for the email body ──
    const scheduledStr = scheduledAt
      ? scheduledAt.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'To be confirmed';

    // ── Build the email HTML ──
    const isActivation = wasNewlyEnabled;
    const subject = isActivation
      ? `Your booking with ${providerName} is confirmed — activate your account`
      : `Your booking with ${providerName} is confirmed`;

    const headerText = isActivation
      ? 'Your booking is confirmed! We\'ve also created a customer portal account for you so you can track this booking, view invoices, and message your provider.'
      : 'Your booking is confirmed! Click the button below to view it in your customer portal.';

    const ctaText = isActivation
      ? 'Activate Account & View Booking'
      : 'View My Booking';

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
  <div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #059669">
    <h1 style="color:#0f172a;font-size:22px;margin:0">Booking Confirmed</h1>
    <p style="color:#64748b;font-size:14px;margin:4px 0 0">${providerName}</p>
  </div>

  <p style="color:#334155;font-size:15px;line-height:1.6;margin:24px 0">${headerText}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px">
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569;width:40%;vertical-align:top">Service</td>
      <td style="padding:10px 12px;color:#0f172a">${serviceName || title}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569;vertical-align:top">Provider</td>
      <td style="padding:10px 12px;color:#0f172a">${providerName}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569;vertical-align:top">Scheduled</td>
      <td style="padding:10px 12px;color:#0f172a">${scheduledStr}</td>
    </tr>
    ${address ? `<tr><td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569;vertical-align:top">Address</td><td style="padding:10px 12px;color:#0f172a">${address}</td></tr>` : ''}
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;font-weight:600;color:#475569;vertical-align:top">Booking ID</td>
      <td style="padding:10px 12px;color:#0f172a;font-family:monospace;font-size:12px">${bookingId.slice(-8).toUpperCase()}</td>
    </tr>
  </table>

  ${notes ? `<p style="color:#475569;font-size:13px;margin:0 0 24px"><strong>Your notes:</strong> ${notes}</p>` : ''}

  ${magicLinkUrl ? `<div style="text-align:center;margin:32px 0">
    <a href="${magicLinkUrl}" style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px">${ctaText}</a>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0">This link expires in 24 hours. No password needed — just click to sign in.</p>` : ''}

  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0">
    <p style="color:#94a3b8;font-size:12px;margin:0">
      You received this email because a booking was made with ${providerName} using this email address.
      ${isActivation ? 'Your customer portal account is now active — use the button above to sign in.' : 'Manage your bookings anytime in the customer portal.'}
    </p>
  </div>
</div>`;

    const text = `${isActivation ? 'Activate your account and view your booking' : 'Your booking is confirmed'}\n\n` +
      `Service: ${serviceName || title}\n` +
      `Provider: ${providerName}\n` +
      `Scheduled: ${scheduledStr}\n` +
      (address ? `Address: ${address}\n` : '') +
      `Booking ID: ${bookingId.slice(-8).toUpperCase()}\n` +
      (notes ? `Notes: ${notes}\n` : '') +
      (magicLinkUrl ? `\n${ctaText}: ${magicLinkUrl}\n` : '') +
      `\n— Sent from Fieseros`;

    // ── Send the email (transactional — uses the platform default or the
    // provider tenant's configured email provider) ──
    const result = await sendEmail({
      to: customerEmail,
      subject,
      html,
      text,
      usageType: 'transactional',
      tenantId: providerTenantId || undefined,
    });

    if (result.success) {
      log.info(
        { customerId, customerEmail, isActivation, simulated: result.simulated },
        'marketplace/book/instant: customer confirmation email sent',
      );
    } else {
      log.warn(
        { customerId, customerEmail, error: result.error },
        'marketplace/book/instant: customer email send failed (non-fatal)',
      );
    }
  } catch (err) {
    // Never let the email helper throw — the booking already succeeded.
    log.error(
      { err, customerId, customerEmail },
      'marketplace/book/instant: customer email flow crashed (non-fatal)',
    );
  }
}
