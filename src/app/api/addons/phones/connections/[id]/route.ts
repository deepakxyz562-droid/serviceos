import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateRoutingMode, deactivateConnection, reactivateConnection } from '@/lib/phone-number-service';

/**
 * PATCH /api/addons/phones/connections/[id]
 * ─────────────────────────────────────────────────────────────────────────
 * Update a phone connection's routing mode or status.
 *
 * Body: { routingMode?, routingTarget?, status? }
 *
 * If `routingMode` is provided, updates the routing (WHERE calls go).
 * If `status` is provided ('ACTIVE' | 'INACTIVE'), activates/deactivates.
 *
 * ARCHITECTURAL RULE: This route ONLY changes WHERE the call goes.
 * It does NOT check or modify AI capacity (that's the AdmissionController's job).
 *
 * Auth: owner only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage phone connections' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Update routing mode
    if (body.routingMode) {
      const connection = await updateRoutingMode({
        tenantId: user.tenantId,
        connectionId: id,
        routingMode: body.routingMode,
        routingTarget: body.routingTarget,
      });
      return NextResponse.json({ connection });
    }

    // Update status (activate/deactivate)
    if (body.status) {
      if (body.status === 'INACTIVE') {
        await deactivateConnection(user.tenantId, id);
      } else if (body.status === 'ACTIVE') {
        await reactivateConnection(user.tenantId, id);
      } else {
        return NextResponse.json(
          { error: 'Invalid status. Use "ACTIVE" or "INACTIVE".' },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'No updates provided. Send routingMode or status.' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[PATCH /api/addons/phones/connections/[id]] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update phone connection' },
      { status: 500 },
    );
  }
}
