import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/triggers/executions - List trigger execution logs
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get('automationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (automationId) where.automationId = automationId;
    if (status) where.status = status;
    if (user.tenantId) where.tenantId = user.tenantId;

    let executions;
    try {
      executions = await db.triggerExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        include: { automation: { select: { name: true, triggerType: true } } },
      });
    } catch (dbError: any) {
      // If the table doesn't exist yet or relation fails, return empty array
      console.error('TriggerExecution query failed:', dbError.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(executions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch executions' }, { status: 500 });
  }
}
