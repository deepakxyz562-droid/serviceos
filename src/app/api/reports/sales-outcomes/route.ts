import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Sales Outcomes Report — `/api/reports/sales-outcomes`.
 *
 * GET → returns closed-won and closed-lost deals within an optional date
 *       range, plus aggregate totals (won value, lost value, win rate).
 *
 * Auth: owner / admin / manager only. (Aggregate sales outcomes are
 * sensitive — employees shouldn't see win/loss totals.)
 *
 * Query params:
 *   - from   YYYY-MM-DD  (inclusive, default: 30 days ago)
 *   - to     YYYY-MM-DD  (inclusive, default: today)
 *   - type   'won' | 'lost' | 'all'  (default: 'all')
 *
 * Response shape:
 *   {
 *     outcomes: Array<{
 *       id, title, stage, value, currency,
 *       customerName, customerPhone, leadId, convertedJobId,
 *       lossReason, createdAt, closedAt
 *     }>,
 *     totals: {
 *       wonValue, lostValue, wonCount, lostCount, winRate
 *     }
 *   }
 *
 * Supabase-safe: only `findMany` + `findFirst` are used. No `groupBy`,
 * no raw SQL, no `notIn`, no compound-unique upsert. The closed-stage
 * filter uses `OR: [{ stage: 'won' }, { stage: 'lost' }, ...]` so it
 * works on the PostgREST adapter (which translates `in` for strings but
 * we add explicit `OR`s for the custom PipelineStage keys too).
 *
 * The custom PipelineStage keys (per-tenant `isClosedWon` / `isClosedLost`
 * stages) are resolved first via a separate `findMany`, then merged into
 * the OR clause. This two-step keeps the query PostgREST-safe and lets
 * the report pick up deals sitting in a tenant's customized won/lost
 * stages (e.g. `closed_won`, `deal_won`, …).
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** Legacy closed-stage keys that always count as won/lost regardless of
 *  tenant-level PipelineStage customization. */
const LEGACY_WON_KEY = 'won';
const LEGACY_LOST_KEY = 'lost';

const DEFAULT_RANGE_DAYS = 30;

// ─── Types ──────────────────────────────────────────────────────────────────

interface OutcomeRow {
  id: string;
  title: string;
  stage: string;
  value: number;
  currency: string;
  customerName: string | null;
  customerPhone: string | null;
  leadId: string | null;
  convertedJobId: string | null;
  lossReason: string | null;
  createdAt: string | null;
  closedAt: string | null;
  type: 'won' | 'lost';
}

interface SalesOutcomesTotals {
  wonValue: number;
  lostValue: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
}

interface SalesOutcomesResponse {
  outcomes: OutcomeRow[];
  totals: SalesOutcomesTotals;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse a `YYYY-MM-DD` query param into a Date at local midnight. Returns
 * null if the input is missing/invalid. Used for the from/to range.
 */
function parseDateParam(raw: string | null): Date | null {
  if (!raw) return null;
  // Accept YYYY-MM-DD only — anything else is ignored (default range applies).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const [_, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Inclusive end-of-day for the `to` param: takes the parsed midnight Date
 * and bumps it to 23:59:59.999 so a `closedAt <= to` comparison includes
 * deals closed any time on the `to` day.
 */
function endOfDay(dt: Date): Date {
  const out = new Date(dt);
  out.setHours(23, 59, 59, 999);
  return out;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  // Owner/admin/manager only. Employees + customers get 403.
  const role = (user.role || '').toLowerCase();
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json(
      { error: 'Forbidden — requires owner, admin, or manager role' },
      { status: 403 },
    );
  }

  if (!user.tenantId && !user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden — no tenant context' },
      { status: 403 },
    );
  }

  try {
    // ─── Parse query params ──────────────────────────────────────────────
    const url = new URL(req.url);
    const fromRaw = url.searchParams.get('from');
    const toRaw = url.searchParams.get('to');
    const typeRaw = (url.searchParams.get('type') || 'all').toLowerCase();

    const type: 'won' | 'lost' | 'all' =
      typeRaw === 'won' || typeRaw === 'lost' ? typeRaw : 'all';

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_RANGE_DAYS);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = parseDateParam(fromRaw) ?? defaultFrom;
    const to = endOfDay(parseDateParam(toRaw) ?? now);

    // ─── Resolve won/lost stage keys for this tenant ─────────────────────
    // Legacy: 'won' / 'lost' always count.
    // Custom: any PipelineStage row with `isClosedWon: true` /
    // `isClosedLost: true` for this tenant also counts. Super-admin
    // without a tenantId falls back to legacy keys only (can't resolve
    // per-tenant stages without a tenant).
    let wonStageKeys = new Set<string>([LEGACY_WON_KEY]);
    let lostStageKeys = new Set<string>([LEGACY_LOST_KEY]);

    if (user.tenantId) {
      try {
        const stages = await db.pipelineStage.findMany({
          where: { tenantId: user.tenantId },
          select: { key: true, isClosedWon: true, isClosedLost: true },
        });
        for (const s of stages) {
          if (s.isClosedWon) wonStageKeys.add(s.key);
          if (s.isClosedLost) lostStageKeys.add(s.key);
        }
      } catch (stageErr) {
        // Non-fatal — fall back to legacy keys only.
        console.error('[sales-outcomes] Failed to load PipelineStage rows:', stageErr);
      }
    }

    // Build OR clause for stage matching. PostgREST translates `in` for
    // arrays of scalars, but we use explicit `OR`s to be safe across
    // adapter versions and to keep the where-clause uniform.
    const allClosedStageKeys = Array.from(
      new Set<string>([...wonStageKeys, ...lostStageKeys]),
    );

    if (allClosedStageKeys.length === 0) {
      // No closed stages defined at all — return empty.
      const empty: SalesOutcomesResponse = {
        outcomes: [],
        totals: {
          wonValue: 0,
          lostValue: 0,
          wonCount: 0,
          lostCount: 0,
          winRate: 0,
        },
      };
      return NextResponse.json(empty);
    }

    // ─── Fetch closed deals in range ─────────────────────────────────────
    // We fetch ALL closed deals in range (won + lost), then filter by
    // `type` client-side. This keeps the Prisma query simple and the
    // totals computation correct (we always need both won and lost
    // counts for the win-rate calculation).
    const tenantFilter = user.tenantId
      ? { tenantId: user.tenantId }
      : user.isSuperAdmin
        ? {}
        : { tenantId: null };

    // Build stage OR filter
    const stageOrs = allClosedStageKeys.map((k) => ({ stage: k }));

    const deals = await db.deal.findMany({
      where: {
        ...tenantFilter,
        OR: stageOrs,
        closedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        currency: true,
        customerName: true,
        customerPhone: true,
        leadId: true,
        convertedJobId: true,
        lossReason: true,
        createdAt: true,
        closedAt: true,
      },
      orderBy: { closedAt: 'desc' },
      take: 1000, // defensive cap
    });

    // ─── Build outcome rows + totals ─────────────────────────────────────
    const outcomes: OutcomeRow[] = [];
    let wonValue = 0;
    let lostValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const d of deals) {
      const isWon = wonStageKeys.has(d.stage);
      const isLost = lostStageKeys.has(d.stage);
      // Skip deals whose stage isn't recognized as won or lost (defensive —
      // the OR filter should already exclude these).
      if (!isWon && !isLost) continue;

      const typeForRow: 'won' | 'lost' = isWon ? 'won' : 'lost';

      if (isWon) {
        wonValue += d.value || 0;
        wonCount++;
      } else {
        lostValue += d.value || 0;
        lostCount++;
      }

      // If the user requested only 'won' or 'lost', filter out the other
      // type from the outcomes array (but still count it in totals so
      // the win-rate is correct).
      if (type !== 'all' && type !== typeForRow) continue;

      outcomes.push({
        id: d.id,
        title: d.title,
        stage: d.stage,
        value: d.value || 0,
        currency: d.currency || 'USD',
        customerName: d.customerName ?? null,
        customerPhone: d.customerPhone ?? null,
        leadId: d.leadId ?? null,
        convertedJobId: d.convertedJobId ?? null,
        lossReason: d.lossReason ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        closedAt: d.closedAt ? new Date(d.closedAt).toISOString() : null,
        type: typeForRow,
      });
    }

    // Win rate: won / (won + lost) * 100. Rounded to 1 decimal place.
    const totalClosed = wonCount + lostCount;
    const winRate =
      totalClosed > 0
        ? Math.round((wonCount / totalClosed) * 1000) / 10
        : 0;

    const response: SalesOutcomesResponse = {
      outcomes,
      totals: {
        wonValue,
        lostValue,
        wonCount,
        lostCount,
        winRate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[sales-outcomes] Failed to fetch outcomes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales outcomes' },
      { status: 500 },
    );
  }
}
