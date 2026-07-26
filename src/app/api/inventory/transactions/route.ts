import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Stock Transactions API
 * -----------------------
 * GET /api/inventory/transactions — list stock transaction history
 *
 * Filters: inventoryItemId, type, direction, referenceId,
 *          startDate, endDate (ISO), limit
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_TYPES = ['purchase', 'sale', 'transfer', 'adjustment', 'consumption', 'return'];
const VALID_DIRECTIONS = ['in', 'out'];

export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inventoryItemId = searchParams.get('inventoryItemId');
    const type = searchParams.get('type');
    const direction = searchParams.get('direction');
    const referenceId = searchParams.get('referenceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = {};
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }

    if (inventoryItemId) where.inventoryItemId = inventoryItemId;
    if (referenceId) where.referenceId = referenceId;
    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
          { status: 400 },
        );
      }
      where.type = type;
    }
    if (direction) {
      if (!VALID_DIRECTIONS.includes(direction)) {
        return NextResponse.json(
          { error: `Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(', ')}` },
          { status: 400 },
        );
      }
      where.direction = direction;
    }

    // Date range
    const dateRange: Record<string, unknown> = {};
    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) dateRange.gte = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) dateRange.lte = d;
    }
    if (Object.keys(dateRange).length > 0) {
      where.createdAt = dateRange;
    }

    const transactions = await db.stockTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        item: {
          select: { id: true, name: true, sku: true, unit: true },
        },
      },
    });

    log.info(
      {
        userId: authUser.id,
        count: transactions.length,
        filters: { inventoryItemId, type, direction, referenceId, startDate, endDate },
      },
      'Stock transactions listed',
    );

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list stock transactions');
    const message = error instanceof Error ? error.message : 'Failed to fetch stock transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
