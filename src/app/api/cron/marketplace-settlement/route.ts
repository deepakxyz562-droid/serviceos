import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { payments, DEFAULT_PAYMENT_PROVIDER } from '@/lib/payments/service';
import type { PaymentProviderName } from '@/lib/payments/service';
import { PaymentError } from '@/lib/payments/errors';
import { verifyCronAuth } from '@/lib/cron-auth';

/**
 * GET /api/cron/marketplace-settlement
 *
 * Marketplace settlement worker — scans every `MarketplaceTransaction` in
 * `escrow` status and releases the provider's share into their Stripe
 * Connect balance once the linked Job reaches a completed-ish state.
 *
 * Trigger:
 *   - Vercel Cron:  once daily at 02:00 UTC (schedule "0 2 * * *") — see vercel.json
 *                   (Vercel Hobby plan is limited to daily crons; upgrade to Pro for
 *                   more frequent settlement runs, e.g. every 15 minutes)
 *   - On-demand:    call this route from app flows when a Job is marked complete
 *                   for near-real-time payout (the daily cron is a safety net)
 *   - External:     `curl -H "Authorization: Bearer $CRON_SECRET" \
 *                          https://your-app/api/cron/marketplace-settlement`
 *
 * Auth:
 *   - `Authorization: Bearer ${CRON_SECRET}` header (preferred)
 *   - OR ``x-cron-secret` header or `Authorization: Bearer` header${CRON_SECRET}` query param (fallback for cron services that
 *     can't set headers, e.g. GitHub Actions scheduled workflows)
 *   - If `CRON_SECRET` is not set in env:
 *       * In NODE_ENV=development → allow with a warning (local testing)
 *       * In production           → 401 (refuse to run unauthenticated)
 *
 * Logic:
 *   1. Find all `MarketplaceTransaction` rows where status='escrow' and the
 *      linked Job.status is in ['completed', 'invoiced', 'closed']. For each:
 *        - call `transferToProvider(tenantId, providerAmountCents, txnId)`
 *        - on success → status='released', releasedAt=now, transferId set,
 *          metadataJson stores the full transfer details
 *        - on failure → increment retryCount, leave status='escrow' so the
 *          next run retries. After 5 failed attempts → status='disputed'
 *          with the latest error in metadataJson
 *   2. Orphaned-escrow sweep: status='escrow' AND jobId is null AND
 *      createdAt > 7 days ago → mark as 'released' with a note in
 *      metadataJson (edge case: instant bookings that never linked a Job)
 *   3. Return JSON summary: { processed, released, failed, disputed, orphaned }
 *
 * Idempotency + safety:
 *   - Each transaction is wrapped in its own try/catch — a single failure
 *     never crashes the whole cron run.
 *   - Re-running on the same transaction is safe: once status='released'
 *     the row no longer matches the `status='escrow'` filter, so the
 *     transfer is never issued twice.
 *   - Demo/dev mode: when STRIPE_SECRET_KEY is unset OR the tenant uses an
 *     `acct_demo_*` Connect account, `transferToProvider` returns a mock
 *     transfer — the cron still flips status to 'released' so end-to-end
 *     flow can be tested without real Stripe keys.
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  const component = 'cron.marketplace-settlement';

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const auth = verifyCronAuth(request);
  if (!auth.ok) return auth.response;

  // ── 2. Find releasable held transactions ──────────────────────────────
  // Provider-neutral lifecycle: a transaction is "settlement-eligible" when
  //   - status is 'paid_held' (customer paid, funds held by platform) OR
  //   - status is 'settlement_eligible' (funds_split released, ready for payout)
  // AND the linked Job is in a completed state.
  //
  // Legacy 'escrow' status is included for backward compat with pre-migration
  // rows — we treat it the same as 'paid_held'.
  let heldTxns: Array<{
    id: string;
    tenantId: string | null;
    jobId: string | null;
    providerAmount: number;
    currency: string;
    retryCount: number;
    metadataJson: string;
    createdAt: Date;
    paymentProvider: string | null;
    paymentProviderPaymentId: string | null;
    paymentProviderTransferId: string | null;
  }> = [];

  try {
    heldTxns = await db.marketplaceTransaction.findMany({
      where: {
        status: { in: ['paid_held', 'settlement_eligible', 'escrow'] },
      },
      select: {
        id: true,
        tenantId: true,
        jobId: true,
        providerAmount: true,
        currency: true,
        retryCount: true,
        metadataJson: true,
        createdAt: true,
        paymentProvider: true,
        paymentProviderPaymentId: true,
        paymentProviderTransferId: true,
      },
    });
  } catch (err) {
    log.error({ err, component }, 'Failed to fetch held transactions');
    return NextResponse.json(
      { error: 'Database error fetching held transactions' },
      { status: 500 },
    );
  }

  // Bulk-fetch the linked Jobs so we can filter by status.
  const jobIds = heldTxns
    .map((t) => t.jobId)
    .filter((id): id is string => !!id);

  const jobs: Array<{ id: string; status: string }> = jobIds.length
    ? await db.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, status: true },
      })
    : [];
  const jobStatusById = new Map(jobs.map((j) => [j.id, j.status]));

  // Bulk-fetch tenant names for logging.
  const tenantIds = heldTxns
    .map((t) => t.tenantId)
    .filter((id): id is string => !!id);
  const tenants: Array<{ id: string; name: string }> = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      })
    : [];
  const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));

  const COMPLETED_JOB_STATES = ['completed', 'invoiced', 'closed'];
  const releasable = heldTxns.filter((t) => {
    if (!t.jobId) return false;
    const jobStatus = jobStatusById.get(t.jobId);
    return !!jobStatus && COMPLETED_JOB_STATES.includes(jobStatus);
  });

  log.info(
    {
      component,
      heldCount: heldTxns.length,
      releasableCount: releasable.length,
    },
    'Marketplace settlement cron run starting',
  );

  // ── 3. Process each releasable transaction ────────────────────────────
  let released = 0;
  let failed = 0;
  let disputed = 0;

  for (const txn of releasable) {
    try {
      if (!txn.tenantId) {
        throw new Error(
          `Transaction ${txn.id} has no tenantId — cannot determine provider`,
        );
      }

      // Convert providerAmount (major units, e.g. dollars) → cents. Round to
      // avoid float drift (47.49 * 100 → 4748.99999…).
      const amountInCents = Math.round(txn.providerAmount * 100);

      // Resolve the provider for this transaction (defaults to platform default).
      const providerName: PaymentProviderName =
        (txn.paymentProvider as PaymentProviderName | null) || DEFAULT_PAYMENT_PROVIDER;

      // Look up the tenant's connected-account id (the payout destination).
      const providerTenant = await db.tenant.findUnique({
        where: { id: txn.tenantId },
        select: { paymentProviderAccountId: true, payoutsEnabled: true, name: true },
      });
      if (!providerTenant?.paymentProviderAccountId) {
        throw new PaymentError({
          message: `Tenant ${txn.tenantId} has no paymentProviderAccountId — provider hasn't set up payments`,
          provider: providerName,
          retryable: false,
        });
      }
      if (!providerTenant.payoutsEnabled) {
        throw new PaymentError({
          message: `Tenant ${txn.tenantId} payouts not enabled — complete verification first`,
          provider: providerName,
          retryable: false,
        });
      }

      // Create the payout (instant intra-Airwallex transfer from platform wallet → seller wallet).
      const payoutRequestId = `fieseros_payout_${txn.id}_${Date.now()}`;
      const result = await payments.createPayout(providerName, {
        destinationAccountId: providerTenant.paymentProviderAccountId,
        amount: amountInCents,
        currency: txn.currency || 'USD',
        reference: `Fieseros payout — txn ${txn.id}`,
        requestId: payoutRequestId,
      });

      // Merge the payout details into the existing metadataJson.
      const priorMeta = safeParseJson(txn.metadataJson, {});
      const updatedMetadata = {
        ...priorMeta,
        settlement: {
          payoutId: result.payoutId,
          status: result.status,
          amountInCents,
          currency: txn.currency,
          releasedAt: new Date().toISOString(),
          jobStatusAtRelease: txn.jobId ? (jobStatusById.get(txn.jobId) || null) : null,
        },
      };

      // Create a Payout row (closes the long-standing gap where Payout rows
      // were never written — the provider dashboard can now show payout history).
      const payoutRow = await db.payout.create({
        data: {
          tenantId: txn.tenantId,
          paymentProviderTransferId: result.payoutId,
          paymentProvider: providerName,
          // Keep legacy column in sync during migration:
          stripeTransferId: result.payoutId,
          amount: txn.providerAmount,
          currency: txn.currency || 'USD',
          status: result.status === 'settled' ? 'paid' : 'pending',
          method: 'provider_payout',
          description: `Marketplace payout for transaction ${txn.id}`,
          transactionsJson: JSON.stringify([txn.id]),
          transactionCount: 1,
          paidAt: result.status === 'settled' ? new Date() : null,
        },
      }).catch((err) => {
        // Payout row creation is best-effort — the marketplace transaction
        // update is the source of truth. Don't fail the cron if this fails.
        console.warn(`[marketplace-settlement] Payout.create failed for txn ${txn.id}:`, err);
        return null;
      });

      await db.marketplaceTransaction.update({
        where: { id: txn.id },
        data: {
          status: 'payout_initiated', // provider-neutral lifecycle
          releasedAt: new Date(),
          escrowReleasedAt: new Date(), // legacy field kept in sync
          paymentProviderTransferId: result.payoutId,
          // Keep legacy column in sync during migration:
          transferId: result.payoutId,
          payoutId: payoutRow?.id || null,
          paymentProvider: providerName,
          retryCount: 0, // reset on success
          metadataJson: JSON.stringify(updatedMetadata),
        },
      });

      released++;
      log.info(
        {
          component,
          txnId: txn.id,
          tenantId: txn.tenantId,
          tenantName: txn.tenantId ? (tenantNameById.get(txn.tenantId) || null) : null,
          amountInCents,
          payoutId: result.payoutId,
          payoutStatus: result.status,
        },
        'MarketplaceTransaction payout initiated (paid_held → payout_initiated)',
      );
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      const errName = err instanceof Error ? err.name : 'UnknownError';

      // Increment retry count; after MAX_RETRIES, escalate to 'disputed'.
      const MAX_RETRIES = 5;
      const nextRetryCount = (txn.retryCount || 0) + 1;
      const shouldEscalate = nextRetryCount > MAX_RETRIES;

      try {
        const priorMeta = safeParseJson(txn.metadataJson, {});
        const updatedMetadata = {
          ...priorMeta,
          lastError: {
            message: errMsg,
            name: errName,
            attempt: nextRetryCount,
            at: new Date().toISOString(),
          },
        };

        if (shouldEscalate) {
          await db.marketplaceTransaction.update({
            where: { id: txn.id },
            data: {
              status: 'disputed',
              disputedAt: new Date(),
              retryCount: nextRetryCount,
              metadataJson: JSON.stringify(updatedMetadata),
            },
          });
          disputed++;
          log.error(
            {
              component,
              txnId: txn.id,
              tenantId: txn.tenantId,
              retryCount: nextRetryCount,
              err,
            },
            'MarketplaceTransaction escalated to disputed after max retries',
          );
        } else {
          // Leave the transaction in its current held state for the next run.
          // (Don't reset to 'escrow' — that's a legacy status. The transaction
          // stays in 'paid_held' or 'settlement_eligible' and we just bump retryCount.)
          await db.marketplaceTransaction.update({
            where: { id: txn.id },
            data: {
              retryCount: nextRetryCount,
              metadataJson: JSON.stringify(updatedMetadata),
            },
          });
          log.warn(
            {
              component,
              txnId: txn.id,
              tenantId: txn.tenantId,
              retryCount: nextRetryCount,
              err,
            },
            'MarketplaceTransaction settlement FAILED — will retry next run',
          );
        }
      } catch (updateErr) {
        // If even the retry-count update fails, log loudly but keep going —
        // don't crash the cron for one bad row.
        log.error(
          {
            component,
            txnId: txn.id,
            updateErr,
            originalErr: err,
          },
          'Failed to record settlement error on MarketplaceTransaction',
        );
      }
    }
  }

  // ── 4. Orphaned-held sweep ────────────────────────────────────────────
  // Edge case: instant bookings that never created a Job (e.g. race during
  // job creation, or a manual instant-book that bypassed the Job step).
  // After 7 days held with no Job, treat as releasable — the customer paid,
  // the service was rendered, but there's no Job to gate the release.
  let orphaned = 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let orphanedRows: Array<{
    id: string;
    tenantId: string | null;
    createdAt: Date;
    metadataJson: string;
  }> = [];

  try {
    orphanedRows = await db.marketplaceTransaction.findMany({
      where: {
        status: { in: ['paid_held', 'settlement_eligible', 'escrow'] },
        jobId: null,
        createdAt: { lt: sevenDaysAgo },
      },
      select: {
        id: true,
        tenantId: true,
        createdAt: true,
        metadataJson: true,
      },
    });
  } catch (err) {
    log.error(
      { err, component },
      'Failed to fetch orphaned held transactions — skipping orphan sweep',
    );
  }

  for (const txn of orphanedRows) {
    try {
      const priorMeta = safeParseJson(txn.metadataJson, {});
      const updatedMetadata = {
        ...priorMeta,
        orphanedRelease: {
          reason: 'No linked Job after 7 days held — auto-settlement-eligible',
          createdAt: txn.createdAt.toISOString(),
          releasedAt: new Date().toISOString(),
        },
      };

      await db.marketplaceTransaction.update({
        where: { id: txn.id },
        data: {
          status: 'settlement_eligible', // ready for the next settlement pass
          releasedAt: new Date(),
          escrowReleasedAt: new Date(),
          retryCount: 0,
          metadataJson: JSON.stringify(updatedMetadata),
        },
      });
      orphaned++;
      log.warn(
        { component, txnId: txn.id, tenantId: txn.tenantId, createdAt: txn.createdAt },
        'Released orphaned escrow (no linked Job after 7 days)',
      );
    } catch (err) {
      log.error(
        { err, component, txnId: txn.id },
        'Failed to release orphaned escrow transaction',
      );
    }
  }

  // ── 5. Summary ─────────────────────────────────────────────────────────
  const summary = {
    processed: releasable.length,
    released,
    failed,
    disputed,
    orphaned,
    ranAt: new Date().toISOString(),
  };

  log.info({ component, ...summary }, 'Marketplace settlement cron run complete');

  return NextResponse.json(summary);
}

/**
 * POST alias — some cron schedulers (Vercel included) default to POST.
 * Forward to GET.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

// ── helpers ────────────────────────────────────────────────────────────────

function safeParseJson(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to fallback
  }
  return fallback;
}
