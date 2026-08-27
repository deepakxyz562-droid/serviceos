import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { getDailyLimit, setDailyLimit } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/superadmin/outreach/settings
 * PUT  /api/superadmin/outreach/settings
 * --------------------------------------
 * Read and update the global outreach daily limit (default 20, capped
 * 1–1000 by the lib helper).
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * The limit is stored in `RevenueFeatureToggle.configJson` under the
 * `outreach` feature key as `{ dailyLimit: number }` — see
 * `src/lib/outreach/index.ts` for storage details.
 *
 * ── GET ──────────────────────────────────────────────────────────────────
 * Returns `{ dailyLimit: number }` via `getDailyLimit()`.
 *
 * ── PUT ──────────────────────────────────────────────────────────────────
 * Body: `{ dailyLimit: number }`
 * Calls `setDailyLimit(dailyLimit, user.id)` (clamped to [1, 1000] inside
 * the lib). Returns 200 `{ ok: true, dailyLimit: number }`.
 *
 * Status codes:
 *   200 — ok
 *   400 — body parse error or missing/invalid dailyLimit
 *   401 — not authenticated
 *   403 — not superadmin
 *   500 — unexpected DB error
 */

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  void request; // not used — auth-only endpoint
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

  let dailyLimit: number;
  try {
    dailyLimit = await getDailyLimit();
  } catch (err) {
    console.error('[outreach/settings] getDailyLimit failed:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ dailyLimit });
}

interface PutBody {
  dailyLimit?: number;
}

export async function PUT(request: NextRequest) {
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

  // ── Parse body ─────────────────────────────────────────────────────────
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body.dailyLimit;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 1) {
    return NextResponse.json(
      { error: 'dailyLimit must be a positive number' },
      { status: 400 },
    );
  }

  // ── Persist ────────────────────────────────────────────────────────────
  try {
    await setDailyLimit(raw, user.id);
  } catch (err) {
    console.error('[outreach/settings] setDailyLimit failed:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Re-read so the response reflects the clamped value (lib clamps to
  // [1, 1000] and floors — the caller may have sent 0.5 and gotten 1).
  let stored: number;
  try {
    stored = await getDailyLimit();
  } catch {
    stored = Math.max(1, Math.min(1000, Math.floor(raw)));
  }

  return NextResponse.json({ ok: true, dailyLimit: stored });
}
