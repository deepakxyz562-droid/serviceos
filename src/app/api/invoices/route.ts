import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { getAuthUser } from '@/lib/auth';
import { getExchangeRate, convertCurrency } from '@/lib/currency';
import { generateInvoiceNumber } from '@/lib/invoice-automation';
import { logActivity } from '@/lib/activity-log';
import { EventBus } from '@/lib/event-bus';
import { requireCrmTenant } from '@/lib/require-crm-tenant';
import { withCrmTrace } from '@/lib/crm-perf-trace';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getInvoices, RpcFunctionNotFoundError } from '@/lib/supabase-rpc';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── C-2B.3: RPC availability cache ─────────────────────────────────────
// When the get_invoices RPC function hasn't been applied to the database
// yet, each request would waste ~130-200ms on a failed .rpc() call before
// falling through to the original Promise.all path. This cache remembers
// the "not found" state for 5 minutes, so only the FIRST request after
// server startup (or after the 5-minute window expires) pays the overhead.
// Once the SQL is applied, the first successful RPC call sets
// `rpcAvailable = 'available'` and all subsequent requests use the fast
// RPC path (5 calls → 1, ~340ms → ~150-220ms).
let rpcAvailability: 'unknown' | 'available' | 'not_found' = 'unknown';
let rpcAvailabilityCheckedAt = 0;
const RPC_AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function shouldTryInvoicesRpc(): boolean {
  if (!shouldUseSupabaseDB()) return false;
  if (rpcAvailability === 'available') return true;
  if (rpcAvailability === 'not_found') {
    // Re-check periodically so the RPC is picked up after the SQL is applied.
    return Date.now() - rpcAvailabilityCheckedAt > RPC_AVAILABILITY_TTL_MS;
  }
  return true; // 'unknown' — first request, try it
}

/**
 * P4: build a Prisma `createdAt` range filter from the optional `from`/`to`
 * query params. Accepts either a bare YYYY-MM-DD date (interpreted in the
 * server's local timezone: from → start-of-day, to → end-of-day so the last
 * day is fully inclusive) or a full ISO timestamp. Returns null when neither
 * param is present or parseable, so callers can skip the filter entirely.
 */
function buildCreatedAtRange(from?: string | null, to?: string | null): Record<string, Date> | null {
  const range: Record<string, Date> = {};
  if (from) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      const [y, m, d] = from.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      if (!isNaN(start.getTime())) range.gte = start;
    } else {
      const start = new Date(from);
      if (!isNaN(start.getTime())) range.gte = start;
    }
  }
  if (to) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const [y, m, d] = to.split('-').map(Number);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      if (!isNaN(end.getTime())) range.lte = end;
    } else {
      const end = new Date(to);
      if (!isNaN(end.getTime())) range.lte = end;
    }
  }
  return Object.keys(range).length > 0 ? range : null;
}

// resolveTenantId is now imported from @/lib/tenant-resolver (C-2C + cache fix).
// The old local copy queried db.tenant.findFirst on EVERY request, which
// timed out at ~10s (Supabase 57014) under load. The shared helper caches
// the first-tenant ID for 60s (success) / 5s (failure) so only the first
// request pays the DB cost.

/**
 * GET /api/invoices
 * List invoices for the authenticated user's tenant.
 *
 * Customer sessions: ALWAYS scoped to the logged-in customer's own invoices
 * (where.customerId = authUser.id). The tenantId filter is intentionally
 * skipped for customers — they may belong to a tenant via Customer→Workspace→Tenant,
 * but if that chain is broken (e.g. Customer.workspaceId is null), the
 * tenantId filter would return zero rows. Filtering by customerId alone is
 * both sufficient (customers can only see their own invoices) and resilient
 * (no dependency on the workspace link being set).
 *
 * Admin/employee sessions: scoped by tenantId (resolved from auth or first
 * tenant fallback) plus optional customerId filter from the query string.
 */
/**
 * Book-wide money summary for the stats header (Vyapar-style: Total Sales /
 * Received / Outstanding / Overdue). Computed over the WHOLE matching book —
 * deliberately ignores search/status filters so the header always reflects
 * the full ledger, never just the current page.
 *
 * P4: also deliberately ignores the `from`/`to` date-range params — those
 * filter the LIST only. The stats header must stay book-wide (matching
 * Vyapar, where the top tiles never change as you browse a date range).
 */
async function computeInvoiceSummary(baseWhere: Record<string, unknown>) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const moneyWhere: Record<string, unknown> = { ...baseWhere, status: { notIn: ['draft', 'cancelled'] } };
  const now = new Date();
  const [salesAgg, paidAgg, overdueAgg, count] = await Promise.all([
    db.invoice.aggregate({ where: moneyWhere, _sum: { total: true } }),
    db.invoicePayment.aggregate({
      where: { invoice: { is: moneyWhere as never } },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: { ...moneyWhere, status: { notIn: ['draft', 'cancelled', 'paid'] }, dueDate: { lt: now } },
      _sum: { total: true },
    }),
    db.invoice.count({ where: baseWhere }),
  ]);
  const totalSales = salesAgg._sum.total || 0;
  const received = Math.min(paidAgg._sum.amount || 0, totalSales);
  return {
    totalSales: round2(totalSales),
    received: round2(received),
    outstanding: round2(Math.max(0, totalSales - received)),
    overdue: round2(overdueAgg._sum.total || 0),
    count,
  };
}

async function _GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request, { allowStandalone: true });
    if (crmGuard) return crmGuard;
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '200');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerIdParam = searchParams.get('customerId');
    // P4: optional date-range filters (ISO date or YYYY-MM-DD). These filter
    // the invoice LIST (and its pagination count) on createdAt only — the
    // `summary` block below continues to compute on the unfiltered
    // tenant/customer scope so the stats header stays book-wide.
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const createdAtRange = buildCreatedAtRange(fromParam, toParam);
    // PAGINATION-ARCHIVE-1: archived=true → only soft-deleted invoices.
    // Default (unset or 'false') → only active invoices (deletedAt IS NULL).
    // archived='all' → both active + archived (legacy / dashboard aggregation).
    const archivedParam = searchParams.get('archived');
    const archivedOnly = archivedParam === 'true';
    const includeArchived = archivedParam === 'all';

    // ── C-2B.3: Try the get_invoices RPC first (5 → 1 call) ──────────────
    // The SQL function (supabase-rpc-invoices.sql) consolidates the invoice
    // list + count + Customer/Employee/Job JOINs into a single PostgREST
    // round-trip. Expected: ~150-220ms (vs ~340ms with the 5-call fallback).
    //
    // The RPC unifies BOTH route branches via nullable params:
    //   - Customer session → p_customer_id = authUser.id, p_tenant_id = null
    //   - Admin/employee   → p_tenant_id = tenantId, p_customer_id = customerIdParam?
    //
    // AVAILABILITY CACHE: the first failed attempt caches "not_found" for
    // 5 minutes (see shouldTryInvoicesRpc above), so subsequent requests
    // skip the failed RPC call and go straight to the fallback path.
    //
    // P4: the RPC signature has no from/to params. Rather than change the SQL
    // function (risky), requests WITH a date range skip the RPC and use the
    // Prisma fallback below, which supports createdAt filtering. Requests
    // without a range keep using the fast RPC path, and the availability
    // cache is unaffected.
    if (!createdAtRange && shouldTryInvoicesRpc()) {
      try {
        let rpcTenantId: string | null = null;
        let rpcCustomerId: string | null = null;

        if (authUser?.role === 'customer' && authUser.id) {
          // Customer session: scope by customerId only (privacy safeguard —
          // matches the original branch below).
          rpcCustomerId = authUser.id;
        } else {
          // Admin/employee: resolve tenant, optional customerId filter.
          rpcTenantId = await resolveFallbackTenantId(authUser);
          if (!rpcTenantId) {
            // No tenant found — short-circuit with empty (matches original).
            return NextResponse.json({
              invoices: [],
              pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
            });
          }
          if (customerIdParam) rpcCustomerId = customerIdParam;
        }

        const result = await getInvoices(
          rpcTenantId,
          rpcCustomerId,
          status,
          search,
          page,
          limit,
        );
        // Success — cache the availability so future requests skip the check.
        rpcAvailability = 'available';
        rpcAvailabilityCheckedAt = Date.now();
        // Book-wide stats header (single aggregate round-trip alongside the
        // list RPC — computed in Prisma so it works with either DB adapter).
        const summaryWhere: Record<string, unknown> =
          authUser?.role === 'customer' ? { customerId: authUser.id, deletedAt: null } : { tenantId: rpcTenantId, deletedAt: null };
        if (customerIdParam && authUser?.role !== 'customer') summaryWhere.customerId = customerIdParam;
        try {
          (result as Record<string, unknown>).summary = await computeInvoiceSummary(summaryWhere);
        } catch (sumErr) {
          console.warn('[invoices] summary computation failed (non-fatal):', sumErr);
        }
        return NextResponse.json(result);
      } catch (err) {
        if (err instanceof RpcFunctionNotFoundError) {
          // Cache "not_found" so the next 5 minutes of requests skip the
          // failed RPC call and go straight to the fallback path.
          rpcAvailability = 'not_found';
          rpcAvailabilityCheckedAt = Date.now();
          console.warn(
            '[invoices] get_invoices RPC not found — ' +
              'using 5-call Promise.all fallback. Apply supabase-rpc-invoices.sql to enable the RPC path.',
          );
        } else {
          throw err;
        }
      }
    }

    // ── Customer session: enforce customer-scoped access server-side ──────────
    // Ignore the customerId query param — the customer can ONLY ever see their
    // own invoices, full stop. This is a privacy safeguard AND a resilience fix
    // (handles the case where Customer.workspaceId is null and tenantId can't
    // be resolved from the workspace chain).
    if (authUser?.role === 'customer' && authUser.id) {
      const where: Record<string, unknown> = { customerId: authUser.id };
      if (status && status !== 'all') {
        where.status = status;
      }
      // P4: date-range filter — LIST only (summary below stays unfiltered).
      if (createdAtRange) {
        where.createdAt = createdAtRange;
      }
      // PAGINATION-ARCHIVE-1: filter on deletedAt to support the Active vs
      // Archived tabs on the frontend.
      if (archivedOnly) {
        where.deletedAt = { not: null };
      } else if (!includeArchived) {
        where.deletedAt = null;
      }
      if (search) {
        where.OR = [
          { number: { contains: search, ...CI } },
          { customer: { name: { contains: search, ...CI } } },
        ];
      }

      const [invoices, total] = await Promise.all([
        db.invoice.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            job: { select: { id: true, title: true } },
            employee: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.invoice.count({ where }),
      ]);

      let summary: Awaited<ReturnType<typeof computeInvoiceSummary>> | undefined;
      try {
        const summaryWhere: Record<string, unknown> = { customerId: authUser.id };
        if (archivedOnly) summaryWhere.deletedAt = { not: null };
        else if (!includeArchived) summaryWhere.deletedAt = null;
        summary = await computeInvoiceSummary(summaryWhere);
      } catch {}

      return NextResponse.json({
        invoices,
        ...(summary ? { summary } : {}),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ── Admin / employee session (existing flow) ──────────────────────────────
    const tenantId = await resolveFallbackTenantId(authUser);

    if (!tenantId) {
      return NextResponse.json({ invoices: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    }

    const where: Record<string, unknown> = { tenantId };
    if (status && status !== 'all') {
      where.status = status;
    }
    if (customerIdParam) {
      where.customerId = customerIdParam;
    }
    // P4: date-range filter — LIST only (summary below stays unfiltered).
    if (createdAtRange) {
      where.createdAt = createdAtRange;
    }
    // PAGINATION-ARCHIVE-1: filter on deletedAt to support the Active vs
    // Archived tabs on the frontend.
    if (archivedOnly) {
      where.deletedAt = { not: null };
    } else if (!includeArchived) {
      where.deletedAt = null;
    }
    if (search) {
      where.OR = [
        { number: { contains: search, ...CI } },
        { customer: { name: { contains: search, ...CI } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          job: { select: { id: true, title: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    // Book-wide stats header — computed on the tenant/customer scope (not the
    // search/status filter) so it always reflects the full book.
    let summary: Awaited<ReturnType<typeof computeInvoiceSummary>> | undefined;
    try {
      const summaryWhere: Record<string, unknown> = customerIdParam ? { tenantId, customerId: customerIdParam } : { tenantId };
      if (archivedOnly) summaryWhere.deletedAt = { not: null };
      else if (!includeArchived) summaryWhere.deletedAt = null;
      summary = await computeInvoiceSummary(summaryWhere);
    } catch {}

    return NextResponse.json({
      invoices,
      ...(summary ? { summary } : {}),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request, { allowStandalone: true });
    if (crmGuard) return crmGuard;
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, jobId, employeeId, items, dueDate, notes, discount, taxPercent, currency: invoiceCurrency } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const tenantId = await resolveFallbackTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // ── FK-injection IDOR fix: customerId/jobId/employeeId come from the
    // request body. Verify each referenced record belongs to the caller's
    // tenant before linking it — otherwise tenant A could invoice tenant
    // B's customer and then read their PII through the invoice relation.
    if (customerId) {
      const ownedCustomer = await db.customer.findFirst({
        where: { id: customerId, OR: [{ tenantId }, { workspace: { tenantId } }] },
        select: { id: true },
      });
      if (!ownedCustomer) {
        return NextResponse.json({ error: 'Invalid customerId' }, { status: 400 });
      }
    }
    if (jobId) {
      const ownedJob = await db.job.findFirst({
        where: { id: jobId, workspace: { tenantId } },
        select: { id: true },
      });
      if (!ownedJob) {
        return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
      }
    }
    if (employeeId) {
      const ownedEmployee = await db.employee.findFirst({
        where: { id: employeeId, workspace: { tenantId } },
        select: { id: true },
      });
      if (!ownedEmployee) {
        return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
      }
    }

    // Resolve tenant's base currency
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const baseCurrency = tenant?.currency || 'USD';
    const transactionCurrency = invoiceCurrency || baseCurrency;

    // Calculate amounts
    const subtotal = items.reduce((sum: number, item: { quantity: number; rate: number }) => sum + item.quantity * item.rate, 0);
    const taxPercentVal = taxPercent || 0;
    const tax = subtotal * (taxPercentVal / 100);
    const discountVal = discount || 0;
    const total = subtotal + tax - discountVal;

    // Calculate exchange rate and base amount for multi-currency
    const exchangeRate = transactionCurrency === baseCurrency ? 1 : getExchangeRate(transactionCurrency, baseCurrency);
    const baseAmount = transactionCurrency === baseCurrency ? total : convertCurrency(total, transactionCurrency, baseCurrency, exchangeRate);

    // Generate a globally-unique invoice number. The `number` column is
    // @unique globally (not per-tenant), so a naive per-tenant count would
    // collide across tenants on multi-tenant deployments (Supabase/Postgres
    // → P2002 unique constraint violation → 500). generateInvoiceNumber()
    // detects collisions and appends a timestamp suffix when needed.
    const number = await generateInvoiceNumber(tenantId);

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId,
        jobId: jobId || null,
        customerId,
        employeeId: employeeId || null,
        amount: subtotal,
        tax,
        discount: discountVal,
        total,
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        itemsJson: JSON.stringify(items),
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        job: { select: { id: true, title: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Best-effort — never fails the invoice creation.
    try {
      await logActivity({
        tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'create',
        entityType: 'invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        description: `Created invoice ${invoice.number} for ${invoice.customer?.name || 'customer'} (${transactionCurrency} ${total.toFixed(2)})`,
        metadataJson: JSON.stringify({
          number: invoice.number,
          customerId,
          jobId: jobId || null,
          employeeId: employeeId || null,
          total,
          currency: transactionCurrency,
          status: 'draft',
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Invoices POST] Failed to log activity:', logErr);
    }

    // ─── Emit invoice.created event ─────────────────────────────────
    // Best-effort — never fails the invoice creation. Triggers workflow
    // automations and customer notifications.
    try {
      await EventBus.emit(
        'invoice.created',
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          customerId: invoice.customerId || null,
          tenantId,
          total,
          currency: transactionCurrency,
          resourceType: 'invoice',
          resourceId: invoice.id,
        },
        { tenantId: tenantId || undefined }
      );
    } catch (eventErr) {
      console.error('[Invoices POST] invoice.created event failed:', eventErr);
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    // Surface the underlying Prisma error code so the client can distinguish
    // unique-constraint collisions (P2002) from FK violations (P2003) etc.
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create invoice', code, message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 }
    );
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/invoices', _GET);
