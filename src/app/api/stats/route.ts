import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function emptyStats() {
  return {
    totalWorkflows: 0,
    activeWorkflows: 0,
    inactiveWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    runningExecutions: 0,
    successRate: 0,
    avgDurationMs: 0,
    recentExecutions: [],
    topWorkflows: [],
  };
}

export async function GET() {
  try {
    const authUser = await getAuthUser();

    // If not authenticated, return empty stats
    if (!authUser) {
      return NextResponse.json(emptyStats());
    }

    // Super admins can see all data
    const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !authUser.tenantId);

    // For non-super-admins, resolve workspace IDs from their tenant
    let workspaceIds: string[] = [];
    if (!isSuperAdmin) {
      if (!authUser.tenantId) {
        return NextResponse.json(emptyStats());
      }
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: authUser.tenantId },
        select: { id: true },
      });
      workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
      if (workspaceIds.length === 0) {
        return NextResponse.json(emptyStats());
      }
    }

    // Build filters
    const workflowFilter = isSuperAdmin ? {} : { workspaceId: { in: workspaceIds } };
    const executionFilter = isSuperAdmin ? {} : { workflow: { workspaceId: { in: workspaceIds } } };

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
      db.workflow.count({ where: workflowFilter }),
      db.workflow.count({ where: { ...workflowFilter, active: true } }),
      db.execution.count({ where: executionFilter }),
      db.execution.count({ where: { ...executionFilter, status: 'success' } }),
      db.execution.count({ where: { ...executionFilter, status: 'error' } }),
      db.execution.findMany({
        where: executionFilter,
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: {
            select: { id: true, name: true },
          },
        },
      }),
      db.execution.count({ where: { ...executionFilter, status: 'running' } }),
      db.execution.findMany({
        where: {
          ...executionFilter,
          status: 'success',
          durationMs: { not: null },
        },
        select: { durationMs: true },
        take: 100,
        orderBy: { startedAt: 'desc' },
      }),
      db.workflow.findMany({
        where: workflowFilter,
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
