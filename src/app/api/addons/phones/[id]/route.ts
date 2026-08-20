import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/addons/phones/[id]
 * ─────────────────────────────────────────────────────────────────────────
 * Get phone number details + connection configuration.
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const phone = await db.phoneNumber.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        phoneConnections: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!phone) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const connection = phone.phoneConnections[0];

    return NextResponse.json({
      phoneNumber: {
        id: phone.id,
        number: phone.number,
        displayName: phone.displayName,
        provider: phone.provider,
        capabilities: phone.capabilities,
        status: phone.status,
        monthlyCost: phone.monthlyCost,
        releaseScheduledAt: phone.releaseScheduledAt?.toISOString() || null,
        releaseAfter: phone.releaseAfter?.toISOString() || null,
        createdAt: phone.createdAt.toISOString(),
      },
      connection: connection ? {
        id: connection.id,
        connectionType: connection.connectionType,
        routingMode: connection.routingMode,
        routingTarget: connection.routingTarget,
        fallbackRoutingMode: connection.fallbackRoutingMode,
        fallbackRoutingTarget: connection.fallbackRoutingTarget,
        status: connection.status,
        verifiedAt: connection.verifiedAt?.toISOString() || null,
      } : null,
    });
  } catch (error) {
    console.error('[GET /api/addons/phones/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to fetch phone number' }, { status: 500 });
  }
}

/**
 * PATCH /api/addons/phones/[id]
 * ─────────────────────────────────────────────────────────────────────────
 * Update phone number display name or status.
 *
 * Body: { displayName?: string, status?: 'active' | 'suspended' }
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
      return NextResponse.json({ error: 'Only owners can update phone numbers' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const phone = await db.phoneNumber.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!phone) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.status !== undefined) {
      if (!['active', 'suspended'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status. Use "active" or "suspended".' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    const updated = await db.phoneNumber.update({
      where: { id: phone.id },
      data: updateData,
    });

    return NextResponse.json({
      phoneNumber: {
        id: updated.id,
        number: updated.number,
        displayName: updated.displayName,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('[PATCH /api/addons/phones/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to update phone number' }, { status: 500 });
  }
}
