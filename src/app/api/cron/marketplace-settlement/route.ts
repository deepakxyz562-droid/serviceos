import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { transferToProvider, StripePayoutError } from '@/lib/stripe';

/**
 * GET /api/cron/marketplace-settlement
 *
 * Marketplace settlement worker — scans every `MarketplaceTransaction` in
 * `escrow` status and releases the provider's share into their Stripe
 * Connect balance once the linked Job reaches a completed-ish state.
 *
 * Trigger:
 *   - Vercel Cron:  every 15 minutes (schedule "star-slash-15 star star star star")  — see vercel.json
 *   - External:     `curl -H "Authorization: Bearer $CRON_SECRET" \
 *                          https://your-app/api/cron/marketplace-settlement`
 *
 * Auth:
 *   - `Authorization: Bearer ${CRON_SECRET}` header (preferred)
 *   - OR `?key=${CRON_SECRET}` query param (fallback for cron services that
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
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedSecret =
    bearerMatch?.[1] ||
    new URL(request.url).searchParams.get('key') ||
    '';

  const isDev = process.env.NODE_ENV !== 'production';

  if (!expectedSecret) {
    if (isDev) {
      logger.warn(
        { component },
        'CRON_SECRET not set — allowing marketplace-settlement cron in dev mode (no auth)',
      );
    } else {
      logger.error(
        { component },
        'CRON_SECRET not set in production — refusing to run marketplace-settlement cron',
      );
      return NextResponse.json(
        { error: 'Cron authentication not configured' },
        { status: 401 },
      );
    }
  } else if (providedSecret !== expectedSecret) {
    logger.warn(
      { component, hasHeader: !!bearerMatch, hasQuery: !!providedSecret },
      'Unauthorized marketplace-settlement cron attempt',
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Find releasable escrow transactions ────────────────────────────
  // MarketplaceTransaction has a `jobId` FK but no Prisma relation to Job
  // (Job doesn't own the relationship). So we fetch the escrow rows first,
  // collect their jobIds, then bulk-fetch the matching Jobs and join in JS.
  // The escrow set is small (cleared every 15 min) so this is cheap.
  let escrowTxns: Array<{
    id: string;
    tenantId: string | null;
    jobId: string | null;
    providerAmount: number;
    currency: string;
    retryCount: number;
    metadataJson: string;
    createdAt: Date;
  }> = [];

  try {
    escrowTxns = await db.marketplaceTransaction.findMany({
      where: { status: 'escrow' },
      select: {
        id: true,
        tenantId: true,
        jobId: true,
        providerAmount: true,
        currency: true,
        retryCount: true,
        metadataJson: true,
        createdAt: true,
      },
    });
  } catch (err) {
    log.error({ err, component }, 'Failed to fetch escrow transactions');
    return NextResponse.json(
      { error: 'Database error fetching escrow transactions' },
      { status: 500 },
    );
  }

  // Bulk-fetch the linked Jobs so we can filter by status.
  const jobIds = escrowTxns
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
  const tenantIds = escrowTxns
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
  const releasable = escrowTxns.filter((t) => {
    if (!t.jobId) return false;
    const jobStatus = jobStatusById.get(t.jobId);
    return !!jobStatus && COMPLETED_JOB_STATES.includes(jobStatus);
  });

  log.info(
    {
      component,
      escrowCount: escrowTxns.length,
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
        throw new StripePayoutError(
          `Transaction ${txn.id} has no tenantId — cannot determine provider`,
        );
      }

      // Convert providerAmount (major units, e.g. dollars) → cents. Round to
      // avoid float drift (47.49 * 100 → 4748.99999…).
      const amountInCents = Math.round(txn.providerAmount * 100);

      const result = await transferToProvider(
        txn.tenantId,
        amountInCents,
        txn.id,
      );

      // Merge the transfer details into the existing metadataJson.
      const priorMeta = safeParseJson(txn.metadataJson, {});
      const updatedMetadata = {
        ...priorMeta,
        settlement: {
          transferId: result.transferId,
          status: result.status,
          mock: result.mock,
          amountInCents,
          currency: txn.currency,
          releasedAt: new Date().toISOString(),
          jobStatusAtRelease: txn.jobId ? (jobStatusById.get(txn.jobId) || null) : null,
        },
      };

      await db.marketplaceTransaction.update({
        where: { id: txn.id },
        data: {
          status: 'released',
          releasedAt: new Date(),
          escrowReleasedAt: new Date(), // legacy field kept in sync
          transferId: result.transferId,
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
          transferId: result.transferId,
          mock: result.mock,
        },
        'MarketplaceTransaction released (escrow → released)',
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
          await db.marketplaceTransaction.update({
            where: { id: txn.id },
            data: {
              status: 'escrow', // leave in escrow for next run
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

  // ── 4. Orphaned-escrow sweep ───────────────────────────────────────────
  // Edge case: instant bookings that never created a Job (e.g. race during
  // job creation, or a manual instant-book that bypassed the Job step).
  // After 7 days in escrow with no Job, treat as releasable — the customer
  // paid, the service was rendered, but there's no Job to gate the release.
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
        status: 'escrow',
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
      'Failed to fetch orphaned escrow transactions — skipping orphan sweep',
    );
  }

  for (const txn of orphanedRows) {
    try {
      const priorMeta = safeParseJson(txn.metadataJson, {});
      const updatedMetadata = {
        ...priorMeta,
        orphanedRelease: {
          reason: 'No linked Job after 7 days in escrow — auto-released',
          createdAt: txn.createdAt.toISOString(),
          releasedAt: new Date().toISOString(),
        },
      };

      await db.marketplaceTransaction.update({
        where: { id: txn.id },
        data: {
          status: 'released',
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
