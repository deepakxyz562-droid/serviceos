import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { suppressEmail, unsuppressEmail } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

/**
 * POST /api/superadmin/outreach/suppress
 * DELETE /api/superadmin/outreach/suppress?email=X&tenantId=Y
 * ----------------------------------------------------------
 * Manual suppression management for the Outreach → Suppressions UI.
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * ── POST ──────────────────────────────────────────────────────────────────
 * Body:
 *   {
 *     email:     string,                // required
 *     tenantId?: string | null,         // optional — null = platform-wide
 *     notes?:    string                 // optional — surfaced in metadata
 *   }
 * Calls `suppressEmail({ email, tenantId, reason: 'manual', source: 'manual',
 *   metadata: { notes, suppressedBy: user.id } })` (upsert — if a resolved
 *   suppression exists for the same [email, tenantId], it is reopened).
 * Returns 200 `{ ok: true }`.
 *
 * ── DELETE ────────────────────────────────────────────────────────────────
 * Query params:
 *   email     — required
 *   tenantId  — optional; "null" literal string is normalized to null
 * Calls `unsuppressEmail(email, tenantId, user.id,
 *   'Manual unsuppress by superadmin')`. Returns
 *   200 `{ ok: true, unsuppressed: boolean }` — `unsuppressed=false` means
 *   no active suppression matched (idempotent).
 *
 * Status codes:
 *   200 — ok
 *   400 — missing/invalid params, body parse error
 *   401 — not authenticated
 *   403 — not superadmin
 *   500 — unexpected DB error
 */

interface SuppressBody {
  email?: string;
  tenantId?: string | null;
  notes?: string;
}

export async function POST(request: NextRequest) {
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
  let body: SuppressBody;
  try {
    body = (await request.json()) as SuppressBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  // tenantId may be null (platform-wide suppression) or a real tenant id.
  const tenantId = body.tenantId && body.tenantId.length > 0 ? body.tenantId : null;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  // ── Suppress ───────────────────────────────────────────────────────────
  try {
    await suppressEmail({
      email,
      tenantId,
      reason: 'manual',
      source: 'manual',
      metadata: {
        notes: notes ?? null,
        suppressedBy: user.id,
        suppressedByEmail: user.email,
      },
    });
  } catch (err) {
    console.error('[outreach/suppress] suppressEmail failed:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
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
  const email = sp.get('email')?.trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'A valid ?email= query parameter is required' },
      { status: 400 },
    );
  }
  const tenantIdRaw = sp.get('tenantId');
  // Treat "" / "null" as platform-wide (null).
  const tenantId =
    tenantIdRaw && tenantIdRaw.length > 0 && tenantIdRaw !== 'null' ? tenantIdRaw : null;

  // ── Unsuppress ─────────────────────────────────────────────────────────
  let unsuppressed = false;
  try {
    unsuppressed = await unsuppressEmail(
      email,
      tenantId,
      user.id,
      'Manual unsuppress by superadmin',
    );
  } catch (err) {
    console.error('[outreach/suppress] unsuppressEmail failed:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, unsuppressed });
}
