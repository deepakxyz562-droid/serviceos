import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { getDailyLimit, countSentToday, getLastSentAt, getCooldownUntil, isEmailSuppressed } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/outreach/eligible-tenants
 * ------------------------------------------------
 * Returns a paginated list of tenants for the Outreach "Compose" tab's
 * left-hand tenant picker. Each row includes an `eligibility` object so the
 * UI can render selectable vs greyed-out rows.
 *
 * Query params:
 *   search       — substring match on name / email / slug
 *   filter       — 'all' | 'unclaimed' | 'claimed' | 'no_email' | 'opted_out'
 *   page         — 1-based (default 1)
 *   limit        — default 50, max 200
 *
 * Response:
 *   {
 *     tenants: [{
 *       id, name, slug, email, industry, city, claimed, outreachDisabled,
 *       lastSentAt,          // ISO or null
 *       eligibility: {
 *         selectable: boolean,     // false → greyed out + uncheckable
 *         reason: string | null,   // 'no_email' | 'cooldown_active' | 'email_suppressed' | 'outreach_disabled' | null
 *         cooldownUntil: string | null,
 *         lastSentAt: string | null,
 *       }
 *     }],
 *     total, page, limit,
 *     dailyLimit, sentToday, remaining
 *   }
 *
 * Auth: superadmin only.
 *
 * Note: suppression + cooldown checks are per-tenant (using tenant.email).
 * If tenant.email is null, eligibility.reason = 'no_email'.
 */
interface EligibleTenantRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  industry: string | null;
  city: string | null;
  claimed: boolean;
  outreachDisabled: boolean;
  lastSentAt: Date | null;
  eligibility: {
    selectable: boolean;
    reason: string | null;
    cooldownUntil: string | null;
    lastSentAt: string | null;
  };
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
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

  // ── Parse query params ────────────────────────────────────────────────
  const sp = request.nextUrl.searchParams;
  const search = (sp.get('search') || '').trim();
  const filter = sp.get('filter') || 'all';
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '50', 10) || 50));

  // ── Build where clause ────────────────────────────────────────────────
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (filter === 'unclaimed') where.claimed = false;
  if (filter === 'claimed') where.claimed = true;
  if (filter === 'no_email') where.OR = [{ email: null }, { email: '' }];
  if (filter === 'opted_out') where.outreachDisabled = true;

  // ── Fetch tenants (paginated) ─────────────────────────────────────────
  let tenants: Array<{
    id: string;
    name: string;
    slug: string;
    email: string | null;
    industry: string | null;
    city: string | null;
    claimed: boolean;
    outreachDisabled: boolean;
  }>;
  let total: number;
  try {
    [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          industry: true,
          city: true,
          claimed: true,
          outreachDisabled: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tenant.count({ where }),
    ]);
  } catch (err) {
    console.error('[outreach/eligible-tenants] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // ── Per-tenant eligibility (parallel) ────────────────────────────────
  // For each tenant, check: outreachDisabled, no-email, suppression, cooldown.
  // We also fetch lastSentAt (used to show "Sent Aug 27 / Next eligible Aug 30").
  const enrichedPromises = tenants.map(async (t): Promise<EligibleTenantRow> => {
    let reason: string | null = null;
    let selectable = true;
    let cooldownUntilIso: string | null = null;

    // a. outreachDisabled
    if (t.outreachDisabled) {
      selectable = false;
      reason = 'outreach_disabled';
    }
    // b. no email
    else if (!t.email || !t.email.includes('@')) {
      selectable = false;
      reason = 'no_email';
    } else {
      // c. suppression
      const supp = await isEmailSuppressed(t.email, t.id);
      if (supp.suppressed) {
        selectable = false;
        reason = 'email_suppressed';
      } else {
        // d. cooldown
        const lastSentAt = await getLastSentAt(t.id);
        const cooldownUntil = getCooldownUntil(lastSentAt);
        if (cooldownUntil) {
          selectable = false;
          reason = 'cooldown_active';
          cooldownUntilIso = cooldownUntil.toISOString();
        }
      }
    }

    const lastSentAt = await getLastSentAt(t.id);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      industry: t.industry,
      city: t.city,
      claimed: t.claimed,
      outreachDisabled: t.outreachDisabled,
      lastSentAt,
      eligibility: {
        selectable,
        reason,
        cooldownUntil: cooldownUntilIso,
        lastSentAt: lastSentAt ? lastSentAt.toISOString() : null,
      },
    };
  });

  const enriched = await Promise.all(enrichedPromises);

  // ── Quota ─────────────────────────────────────────────────────────────
  const [dailyLimit, sentToday] = await Promise.all([
    getDailyLimit(),
    countSentToday(),
  ]);

  return NextResponse.json({
    tenants: enriched,
    total,
    page,
    limit,
    dailyLimit,
    sentToday,
    remaining: Math.max(0, dailyLimit - sentToday),
  });
}
