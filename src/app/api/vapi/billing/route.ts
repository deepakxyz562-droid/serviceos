import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * AI Receptionist Billing Endpoint (Phase R7)
 * ─────────────────────────────────────────────
 * GET  /api/vapi/billing — returns the tenant's current monthly billing
 *                          counter (callsUsed / callsLimit / pausedAtLimit
 *                          / remaining). If no row exists yet, returns the
 *                          defaults (0 / 30 / false / 30) so the UI can
 *                          render without a DB write.
 * PUT  /api/vapi/billing — admin-only update of `callsLimit` and/or
 *                          `pausedAtLimit`. Upserts the counter row if it
 *                          doesn't exist yet (so an admin can pre-set the
 *                          limit before the first call).
 *
 * The actual counter increment happens in the Vapi webhook's
 * `incrementBillingCounter(tenantId)` on every end-of-call-report — this
 * endpoint is read-only for the counter itself. Only `callsLimit` and
 * `pausedAtLimit` (the operator-controlled settings) are writable here.
 */

// GET — returns the tenant's current billing counter (or defaults)
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const counter = await db.aiBillingCounter.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (!counter) {
      // No counter row yet → return defaults so the UI can render without
      // a DB write. The first end-of-call-report webhook will create the
      // row with callsUsed=1.
      return NextResponse.json({
        callsUsed: 0,
        callsLimit: 30,
        pausedAtLimit: false,
        monthStart: new Date().toISOString(),
        remaining: 30,
      });
    }

    return NextResponse.json({
      ...counter,
      // Convenience field for the UI — never negative.
      remaining: Math.max(0, counter.callsLimit - counter.callsUsed),
    });
  } catch (error) {
    console.error('[vapi/billing GET] error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT — update billing settings (admin only: callsLimit, pausedAtLimit)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }
    // Only owners / admins can change billing settings. Employees are
    // read-only on the billing card.
    if (user.role === 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const existing = await db.aiBillingCounter.findFirst({
      where: { tenantId: user.tenantId },
    });

    // Build the update payload — only the whitelisted fields.
    const data: Record<string, unknown> = {};
    if (body.callsLimit !== undefined) {
      const limit = Number(body.callsLimit);
      data.callsLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 30;
    }
    if (body.pausedAtLimit !== undefined) {
      data.pausedAtLimit = Boolean(body.pausedAtLimit);
    }

    if (existing) {
      // Empty data (no whitelisted keys sent) → no-op, return current state.
      if (Object.keys(data).length === 0) {
        return NextResponse.json({
          ...existing,
          remaining: Math.max(0, existing.callsLimit - existing.callsUsed),
        });
      }
      const updated = await db.aiBillingCounter.update({
        where: { id: existing.id },
        data,
      });
      return NextResponse.json({
        ...updated,
        remaining: Math.max(0, updated.callsLimit - updated.callsUsed),
      });
    } else {
      // No counter row yet — create one with the supplied settings + a
      // sensible default for any field not supplied.
      const callsLimit =
        typeof data.callsLimit === 'number' ? (data.callsLimit as number) : 30;
      const pausedAtLimit =
        typeof data.pausedAtLimit === 'boolean'
          ? (data.pausedAtLimit as boolean)
          : false;
      const created = await db.aiBillingCounter.create({
        data: {
          tenantId: user.tenantId,
          monthStart: new Date(),
          callsUsed: 0,
          callsLimit,
          pausedAtLimit,
        },
      });
      return NextResponse.json({
        ...created,
        remaining: Math.max(0, created.callsLimit - created.callsUsed),
      });
    }
  } catch (error) {
    console.error('[vapi/billing PUT] error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
