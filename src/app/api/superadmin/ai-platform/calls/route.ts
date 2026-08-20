import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/superadmin/ai-platform/calls
 * ─────────────────────────────────────────────────────────────────────────
 * List recent AI calls across all tenants (Superadmin operational audit).
 *
 * Query: ?take=20&status=ended&tenantId=xxx
 *
 * Auth: superadmin only.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const take = parseInt(searchParams.get('take') || '20', 10);
    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;

    const calls = await db.aiCall.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        vapiCallId: true,
        status: true,
        fromNumber: true,
        toNumber: true,
        customerPhone: true,
        durationSec: true,
        billableSeconds: true,
        costUsd: true,
        revenueUsd: true,
        outcomeType: true,
        summary: true,
        startedAt: true,
        endedAt: true,
        endedReason: true,
        aiDisabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
    });

    return NextResponse.json({ calls, count: calls.length });
  } catch (error) {
    console.error('[GET /api/superadmin/ai-platform/calls] error:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
