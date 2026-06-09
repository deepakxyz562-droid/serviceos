import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const [
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      recentExecutions,
      runningExecutions,
      successfulExecutionsWithDuration,
      workflowsWithExecutionCounts,
    ] = await Promise.all([
      db.workflow.count(),
      db.workflow.count({ where: { active: true } }),
      db.execution.count(),
      db.execution.count({ where: { status: 'success' } }),
      db.execution.count({ where: { status: 'error' } }),
      db.execution.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: {
            select: { id: true, name: true },
          },
        },
      }),
      db.execution.count({ where: { status: 'running' } }),
      db.execution.findMany({
        where: {
          status: 'success',
          durationMs: { not: null },
        },
        select: { durationMs: true },
        take: 100,
        orderBy: { startedAt: 'desc' },
      }),
      db.workflow.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { executions: true } },
        },
      }),
    ]);

    const avgDurationMs =
      successfulExecutionsWithDuration.length > 0
        ? Math.round(
            successfulExecutionsWithDuration.reduce(
              (sum, e) => sum + (e.durationMs || 0),
              0
            ) / successfulExecutionsWithDuration.length
          )
        : 0;

    const successRate =
      totalExecutions > 0
        ? Math.round((successfulExecutions / totalExecutions) * 100)
        : 0;

    return NextResponse.json({
      totalWorkflows,
      activeWorkflows,
      inactiveWorkflows: totalWorkflows - activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      runningExecutions,
      successRate,
      avgDurationMs,
      recentExecutions: recentExecutions.map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow?.name || 'Unknown',
        status: e.status,
        mode: e.mode,
        startedAt: e.startedAt,
        finishedAt: e.finishedAt,
        durationMs: e.durationMs,
      })),
      topWorkflows: workflowsWithExecutionCounts.map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        executionCount: w._count.executions,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
