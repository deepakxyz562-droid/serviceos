import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

/**
 * Module-level cache: have the new `errorCode` / `declineReason` columns been
 * added to the BillingEvent table yet?
 *
 * The billing-failure-tracking migration (`supabase-migration-billing-failure-tracking.sql`)
 * adds these columns. Until the user runs it via Supabase Studio, the columns
 * don't exist and any query referencing them fails with PostgreSQL error 42703
 * (undefined_column).
 *
 * We probe once on the first request (a tiny `findFirst` that references
 * `errorCode`). If it fails, we cache `false` and route around the new columns
 * until the process restarts (e.g. after the user runs the migration + we
 * redeploy, or just the dev server hot-reloads).
 *
 * `undefined` = not probed yet; `boolean` = probed + cached.
 */
let newColumnsExistCache: boolean | undefined = undefined;

async function probeNewColumnsExist(): Promise<boolean> {
  if (newColumnsExistCache !== undefined) return newColumnsExistCache;
  try {
    // Tiny query that references errorCode — if the column exists, this
    // succeeds (returns 0 rows, which is fine). If it doesn't, PostgREST
    // returns 42703 and we cache false.
    await db.billingEvent.findFirst({
      where: { errorCode: { not: null } },
      select: { id: true },
    });
    newColumnsExistCache = true;
  } catch {
    newColumnsExistCache = false;
  }
  return newColumnsExistCache;
}

/**
 * GET /api/superadmin/billing-events
 *
 * Lists billing events (with a focus on FAILED payments) for the SuperAdmin
 * "Failed Payments" dashboard view. This is the platform owner's primary
 * visibility into payment failures across ALL tenants.
 *
 * Query params:
 *   - status:   'failed' (default) | 'all' | 'success' | 'pending'
 *   - type:     filter by BillingEvent.type ('fail', 'addon_subscription_past_due', etc.)
 *               — accepts comma-separated list, e.g. ?type=fail,addon_subscription_past_due
 *   - provider: filter by paymentProvider ('paypal' | 'creem' | 'stripe' | 'manual')
 *   - tenantId: filter by specific tenant
 *   - search:   search across description + errorCode + invoiceNumber + payerEmail + declineReason
 *   - errorCode: filter by exact errorCode (e.g. 'PAYMENT.SALE.DENIED')
 *   - days:     lookback window in days (default 30, max 365)
 *   - page:     1-based page number (default 1)
 *   - limit:    page size (default 50, max 200)
 *
 * Response shape:
 *   {
 *     events: BillingEvent[],
 *     total: number,
 *     page: number,
 *     limit: number,
 *     kpis: {
 *       totalFailures: number,
 *       totalFailedAmount: number,
 *       uniqueTenantsAffected: number,
 *       byProvider: { paypal, creem, stripe, manual },
 *       byErrorCode: [{ errorCode, count, lastOccurrence }],
 *       last24h: number,
 *       last7d: number,
 *     }
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // ── 1. Auth check — SuperAdmin only ─────────────────────────────────
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden - SuperAdmin access required' },
        { status: 403 },
      );
    }

    // Probe whether the new errorCode/declineReason columns exist yet.
    // Cached after the first request — see probeNewColumnsExist() above.
    const newColumnsExist = await probeNewColumnsExist();

    // ── 2. Parse query params ───────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'failed';
    const typeFilter = searchParams.get('type') || '';
    const providerFilter = searchParams.get('provider') || '';
    const tenantIdFilter = searchParams.get('tenantId') || '';
    const search = searchParams.get('search') || '';
    const errorCodeFilter = searchParams.get('errorCode') || '';
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10) || 30));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    // ── 3. Build where clause ───────────────────────────────────────────
    const where: Record<string, unknown> = {};

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // Type filter accepts comma-separated list
    if (typeFilter) {
      const types = typeFilter.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) {
        where.type = types[0];
      } else if (types.length > 1) {
        where.type = { in: types };
      }
    }

    if (providerFilter) {
      where.paymentProvider = providerFilter;
    }
    if (tenantIdFilter) {
      where.tenantId = tenantIdFilter;
    }
    if (errorCodeFilter) {
      where.errorCode = errorCodeFilter;
    }

    // Date range — lookback window
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    where.createdAt = { gte: since };

    // Search across own columns via OR (ilike).
    // NOTE: `errorCode` and `declineReason` are new columns added by the
    // billing-failure-tracking migration. Until the user runs that migration,
    // those columns don't exist in Supabase and referencing them in the OR
    // clause would fail with "column BillingEvent.errorCode does not exist".
    // We include them ONLY when the migration has been applied — detected
    // via a runtime probe on the first request (see `columnsExist` cache below).
    if (search) {
      where.OR = [
        { description: { ilike: `%${search}%` } },
        { invoiceNumber: { ilike: `%${search}%` } },
        { payerEmail: { ilike: `%${search}%` } },
        ...(newColumnsExist ? [
          { errorCode: { ilike: `%${search}%` } },
          { declineReason: { ilike: `%${search}%` } },
        ] : []),
      ];
    }

    // ── 4. Fetch events + total count in parallel ───────────────────────
    // If the new columns don't exist yet AND the user passed an errorCode
    // filter, we can't apply it — drop it (the query returns all failed
    // events, which is still useful). This is a graceful degradation that
    // unblocks the UI before the migration is run.
    const queryWhere = { ...where };
    if (!newColumnsExist && errorCodeFilter) {
      delete queryWhere.errorCode;
    }

    const [events, total] = await Promise.all([
      db.billingEvent.findMany({
        where: queryWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.billingEvent.count({ where: queryWhere }),
    ]);

    // Fetch tenant names for the events (deduped tenant IDs)
    const tenantIds = Array.from(
      new Set(events.map((e: { tenantId: string }) => e.tenantId)),
    );
    const tenants = tenantIds.length
      ? await db.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const tenantMap = new Map(
      tenants.map((t: { id: string; name: string; email: string | null }) => [t.id, t]),
    );

    // Attach tenantName/tenantEmail to each event
    const eventsWithTenant = events.map((e: Record<string, unknown>) => {
      const t = tenantMap.get(e.tenantId as string);
      return {
        ...e,
        tenantName: t?.name || null,
        tenantEmail: t?.email || null,
      };
    });

    // ── 5. KPIs — computed on the FAILED-events set (regardless of the
    //        list filter, so the KPI strip always shows the failure picture) ──
    const failureWhere: Record<string, unknown> = {
      status: 'failed',
      createdAt: { gte: since },
    };
    // Apply the same tenantId filter to KPIs if one is set (so the KPIs match
    // the filtered view, not the global picture).
    if (tenantIdFilter) failureWhere.tenantId = tenantIdFilter;

    const [failures, last24h, last7d] = await Promise.all([
      db.billingEvent.findMany({
        where: failureWhere,
        // NOTE: we intentionally do NOT pass an explicit `select` here.
        // Selecting `*` (the default) lets the query succeed both BEFORE
        // and AFTER the user runs the billing-failure-tracking migration
        // (which adds the errorCode / declineReason columns). If we listed
        // `errorCode: true` here, the query would fail with
        // "column BillingEvent.errorCode does not exist" until the migration
        // is applied. With `*`, errorCode is simply undefined on rows when
        // the column doesn't exist yet — the byErrorCode grouping falls
        // back to 'UNKNOWN' gracefully.
        orderBy: { createdAt: 'desc' },
        take: 500, // cap for KPI computation safety
      }),
      db.billingEvent.count({
        where: { ...failureWhere, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.billingEvent.count({
        where: { ...failureWhere, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const byProvider: Record<string, number> = { paypal: 0, creem: 0, stripe: 0, manual: 0 };
    const errorCodeMap = new Map<string, { count: number; lastOccurrence: Date }>();
    let totalFailedAmount = 0;
    const affectedTenants = new Set<string>();

    for (const f of failures) {
      const provider = (f.paymentProvider as string) || 'paypal';
      byProvider[provider] = (byProvider[provider] || 0) + 1;

      const code = (f.errorCode as string) || 'UNKNOWN';
      const existing = errorCodeMap.get(code);
      const occurredAt = f.createdAt as Date;
      if (existing) {
        existing.count++;
        if (occurredAt > existing.lastOccurrence) existing.lastOccurrence = occurredAt;
      } else {
        errorCodeMap.set(code, { count: 1, lastOccurrence: occurredAt });
      }

      totalFailedAmount += Number(f.amount) || 0;
      affectedTenants.add(f.tenantId as string);
    }

    const byErrorCode = Array.from(errorCodeMap.entries())
      .map(([errorCode, info]) => ({
        errorCode,
        count: info.count,
        lastOccurrence: info.lastOccurrence.toISOString(),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      events: eventsWithTenant,
      total,
      page,
      limit,
      kpis: {
        totalFailures: failures.length,
        totalFailedAmount: Math.round(totalFailedAmount * 100) / 100,
        uniqueTenantsAffected: affectedTenants.size,
        byProvider,
        byErrorCode,
        last24h,
        last7d,
      },
    });
  } catch (err) {
    console.error('[superadmin/billing-events] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch billing events', detail: String(err) },
      { status: 500 },
    );
  }
}
