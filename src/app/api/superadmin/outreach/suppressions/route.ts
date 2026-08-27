import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/outreach/suppressions?resolved=false&page=1&limit=20
 * -----------------------------------------------------------------------
 * Paginated EmailSuppression list for the Outreach → Suppressions table.
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * Query params:
 *   resolved — optional, one of 'false' (default), 'true', 'all'
 *     false → only active suppressions (resolvedAt IS NULL)
 *     true  → only resolved suppressions (resolvedAt IS NOT NULL)
 *     all   → both
 *   page     — optional, 1-based (default 1, min 1)
 *   limit    — optional, page size (default 20, max 100, min 1)
 *
 * `tenantId` is a plain String? on EmailSuppression (no Prisma relation),
 * so we manually batch-fetch the Tenant.name for each suppression's tenantId
 * and merge as `tenantName`. Platform-wide suppressions (tenantId=null) get
 * `tenantName=null`.
 *
 * Response:
 *   {
 *     suppressions: [{
 *       id, email, tenantId, tenantName, reason, source, provider,
 *       createdAt, resolvedAt, resolvedBy, resolveReason
 *     }],
 *     total: number,
 *     page: number,
 *     limit: number
 *   }
 *
 * Status codes:
 *   200 — ok
 *   400 — invalid resolved= or pagination params
 *   401 — not authenticated
 *   403 — not superadmin
 *   500 — unexpected DB error
 */

interface SuppressionRow {
  id: string;
  email: string;
  tenantId: string | null;
  reason: string;
  source: string;
  provider: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolveReason: string | null;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

type ResolvedFilter = 'false' | 'true' | 'all';

function parseResolvedParam(value: string | null): ResolvedFilter {
  if (value === 'true' || value === 'all') return value;
  return 'false';
}

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden — SuperAdmin access required' },
      { status: 403 },
    );
  }

  // ── Parse query params ─────────────────────────────────────────────────
  const sp = request.nextUrl.searchParams;
  const resolved = parseResolvedParam(sp.get('resolved'));
  const page = parsePositiveInt(sp.get('page'), 1, 100000);
  const limit = parsePositiveInt(sp.get('limit'), 20, 100);

  // ── Build WHERE clause ─────────────────────────────────────────────────
  // false → only active (resolvedAt IS NULL)
  // true  → only resolved (resolvedAt IS NOT NULL)
  // all   → no resolvedAt filter
  const where: Prisma.EmailSuppressionWhereInput =
    resolved === 'false'
      ? { resolvedAt: null }
      : resolved === 'true'
        ? { resolvedAt: { not: null } }
        : {};

  // ── Fetch suppressions + total in parallel ─────────────────────────────
  let rows: SuppressionRow[];
  let total: number;
  try {
    [rows, total] = await Promise.all([
      db.emailSuppression.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          tenantId: true,
          reason: true,
          source: true,
          provider: true,
          createdAt: true,
          resolvedAt: true,
          resolvedBy: true,
          resolveReason: true,
        },
      }),
      db.emailSuppression.count({ where }),
    ]);
  } catch (err) {
    console.error('[outreach/suppressions] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // ── Batch-fetch tenant names ───────────────────────────────────────────
  const tenantIds = Array.from(
    new Set(rows.map((r) => r.tenantId).filter((t): t is string => t !== null)),
  );
  const tenantMap = new Map<string, string>();
  if (tenantIds.length > 0) {
    try {
      const tenants = await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      });
      for (const t of tenants) {
        tenantMap.set(t.id, t.name);
      }
    } catch (err) {
      // Non-fatal — names just won't be present.
      console.error('[outreach/suppressions] failed to load tenants:', err);
    }
  }

  // ── Assemble response ──────────────────────────────────────────────────
  const suppressions = rows.map((r) => ({
    id: r.id,
    email: r.email,
    tenantId: r.tenantId,
    tenantName: r.tenantId ? (tenantMap.get(r.tenantId) ?? null) : null,
    reason: r.reason,
    source: r.source,
    provider: r.provider,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    resolvedBy: r.resolvedBy,
    resolveReason: r.resolveReason,
  }));

  return NextResponse.json({
    suppressions,
    total,
    page,
    limit,
  });
}
