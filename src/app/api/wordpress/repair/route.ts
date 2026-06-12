import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ─── WordPress Integration Repair ─────────────────────────────────────────
// POST: Fix orphan leads and endpoints that have no tenantId assigned
// This repairs leads created before the tenantId auto-assignment fix

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required. You must be logged in to repair WordPress integrations.' },
        { status: 401 }
      );
    }

    const tenantId = authUser.tenantId;
    const workspaceId = authUser.workspaceId || null;

    // 1. Fix WordPress endpoints that have no tenantId
    const endpointsFixed = await db.webhookEndpoint.updateMany({
      where: {
        source: 'wordpress',
        tenantId: null,
      },
      data: {
        tenantId,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    // 2. Fix WordPress-sourced leads that have no tenantId
    const leadsFixed = await db.lead.updateMany({
      where: {
        source: 'wordpress',
        tenantId: null,
      },
      data: {
        tenantId,
      },
    });

    // 3. Fix orphan customers created by WordPress auto-create that have no workspaceId
    const customersFixed = await db.customer.updateMany({
      where: {
        workspaceId: null,
        leads: {
          some: {
            source: 'wordpress',
            tenantId,
          },
        },
      },
      data: {
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Repair complete! Fixed ${endpointsFixed.count} endpoint(s), ${leadsFixed.count} lead(s), and ${customersFixed.count} customer(s).`,
      details: {
        endpointsFixed: endpointsFixed.count,
        leadsFixed: leadsFixed.count,
        customersFixed: customersFixed.count,
        tenantId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Repair failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
