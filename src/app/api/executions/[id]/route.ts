import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function safeJsonParse(str: string | null, fallback: unknown = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await db.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: { id: true, name: true, active: true },
        },
        nodeData: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflow?.name || 'Unknown',
      workflowActive: execution.workflow?.active || false,
      status: execution.status,
      mode: execution.mode,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      durationMs: execution.durationMs,
      data: safeJsonParse(execution.dataJson, {}),
      error: safeJsonParse(execution.errorJson, null),
      nodeData: execution.nodeData.map((nd) => ({
        id: nd.id,
        nodeName: nd.nodeName,
        nodeId: nd.nodeId,
        input: safeJsonParse(nd.inputJson, {}),
        output: safeJsonParse(nd.outputJson, {}),
        error: safeJsonParse(nd.errorJson, null),
        durationMs: nd.durationMs,
        status: nd.status,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch execution';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.execution.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    await db.execution.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete execution';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
