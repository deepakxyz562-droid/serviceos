import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/vapi/calls/disabled
 * ----------------------------
 * Returns the distinct list of caller phone numbers that have been disabled
 * (any AiCall with `aiDisabled: true`). Used by the AI Receptionist
 * dashboard's "Disabled Callers" management card.
 *
 * Response shape:
 *   {
 *     callers: Array<{
 *       phone: string,
 *       disabledAt: string  (ISO — the most recent disabled call's createdAt),
 *       disabledCallId: string  (the AiCall.id that triggered the disable),
 *       callCount: number  (total calls from this number)
 *     }>
 *   }
 *
 * Note: we don't use Prisma `distinct` because PostgREST (Supabase REST)
 * doesn't support it. Instead we fetch the rows and dedupe in JS.
 */
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all disabled calls for this tenant, ordered newest-first so the
    // first occurrence per phone is the most recent disable event.
    const disabledCalls = await db.aiCall.findMany({
      where: { tenantId: auth.tenantId, aiDisabled: true },
      select: {
        id: true,
        customerPhone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // safety cap
    });

    // Dedupe by phone, keeping the most recent entry (already ordered desc).
    const byPhone = new Map<
      string,
      { phone: string; disabledAt: string; disabledCallId: string; callCount: number }
    >();
    for (const c of disabledCalls) {
      if (!c.customerPhone) continue;
      const existing = byPhone.get(c.customerPhone);
      if (existing) {
        existing.callCount += 1;
      } else {
        byPhone.set(c.customerPhone, {
          phone: c.customerPhone,
          disabledAt: c.createdAt.toISOString(),
          disabledCallId: c.id,
          callCount: 1,
        });
      }
    }

    return NextResponse.json({ callers: Array.from(byPhone.values()) });
  } catch (error) {
    console.error('[vapi/calls/disabled GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch disabled callers' }, { status: 500 });
  }
}

/**
 * PATCH /api/vapi/calls/disabled
 * ------------------------------
 * Re-enables a caller by setting `aiDisabled: false` on ALL AiCall rows
 * matching the given phone number for the tenant.
 *
 * Body: { phone: string }
 * Response: { reEnabledCount: number }
 */
export async function PATCH(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { phone?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    // Update all disabled calls from this phone number for the tenant.
    // PostgREST supports `updateMany` via Prisma's `updateMany` → maps to a
    // PATCH with filters; this is supported.
    const result = await db.aiCall.updateMany({
      where: { tenantId: auth.tenantId, customerPhone: phone, aiDisabled: true },
      data: { aiDisabled: false },
    });

    return NextResponse.json({ reEnabledCount: result.count });
  } catch (error) {
    console.error('[vapi/calls/disabled PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to re-enable caller' }, { status: 500 });
  }
}
