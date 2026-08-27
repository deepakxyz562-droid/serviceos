import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  getDailyLimit,
  countSentToday,
  getLastSentAt,
  getCooldownUntil,
  isEmailSuppressed,
  type OutreachStats,
} from '@/lib/outreach';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/outreach/stats?tenantId=X
 * --------------------------------------------
 * Pre-flight stats for a tenant — used by the Send Email dialog to show
 * the pre-flight check list (daily limit, cooldown, suppression, opt-out).
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * Query params:
 *   tenantId — required
 *
 * Response:
 *   {
 *     stats: {
 *       dailyLimit, sentToday, remaining,
 *       lastSentAt,     // ISO string | null
 *       cooldownUntil,  // ISO string | null
 *       isSuppressed, suppressionReason,
 *       outreachDisabled
 *     },
 *     tenant: { id, name, email, claimed, industry, city }
 *   }
 *
 * Status codes:
 *   200 — ok (always, even if no email on file — stats.isSuppressed=false in that case)
 *   400 — missing tenantId
 *   401 — not authenticated
 *   403 — not superadmin
 *   404 — tenant not found
 *   500 — unexpected DB error
 */

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
  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId query parameter is required' },
      { status: 400 },
    );
  }

  // ── Load tenant ────────────────────────────────────────────────────────
  let tenant: {
    id: string;
    name: string;
    email: string | null;
    claimed: boolean;
    industry: string | null;
    city: string | null;
    outreachDisabled: boolean;
  } | null;
  try {
    tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        claimed: true,
        industry: true,
        city: true,
        outreachDisabled: true,
      },
    });
  } catch (err) {
    console.error('[outreach/stats] DB error loading tenant:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // ── Compute stats ──────────────────────────────────────────────────────
  let stats: OutreachStats;
  try {
    const [dailyLimit, sentToday, lastSentAt] = await Promise.all([
      getDailyLimit(),
      countSentToday(),
      getLastSentAt(tenant.id),
    ]);
    const cooldownUntil = getCooldownUntil(lastSentAt);
    let supp: { suppressed: boolean; reason: string | null } = {
      suppressed: false,
      reason: null,
    };
    if (tenant.email) {
      supp = await isEmailSuppressed(tenant.email, tenant.id);
    }
    stats = {
      dailyLimit,
      sentToday,
      remaining: Math.max(0, dailyLimit - sentToday),
      lastSentAt,
      cooldownUntil,
      isSuppressed: supp.suppressed,
      suppressionReason: supp.reason,
      outreachDisabled: tenant.outreachDisabled,
    };
  } catch (err) {
    console.error('[outreach/stats] failed to compute stats:', err);
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }

  return NextResponse.json({
    stats,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      claimed: tenant.claimed,
      industry: tenant.industry,
      city: tenant.city,
    },
  });
}
