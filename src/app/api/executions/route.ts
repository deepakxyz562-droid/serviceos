import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startedAt = {} as any;
      if (startDate) {
        try {
          const sd = new Date(startDate);
          if (!isNaN(sd.getTime())) {
            (where.startedAt as any).gte = sd;
          }
        } catch {
          // Invalid date, skip filter
        }
      }
      if (endDate) {
        try {
          const ed = new Date(endDate);
          if (!isNaN(ed.getTime())) {
            (where.startedAt as any).lte = ed;
          }
        } catch {
          // Invalid date, skip filter
        }
      }
    }

    const [executions, total] = await Promise.all([
      db.execution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          workflow: {
            select: { id: true, name: true, active: true },
          },
        },
      }),
      db.execution.count({ where }),
    ]);

    return NextResponse.json({
      executions: executions.map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow?.name || 'Unknown',
        workflowActive: e.workflow?.active || false,
        status: e.status,
        mode: e.mode,
        startedAt: e.startedAt,
        finishedAt: e.finishedAt,
        durationMs: e.durationMs,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch executions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
