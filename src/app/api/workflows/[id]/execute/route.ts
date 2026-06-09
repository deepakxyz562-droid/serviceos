import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeWorkflow, type NodeOutput } from '@/lib/workflow-executor';

function safeJsonParse(str: string | null, fallback: unknown = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const nodes: any[] = safeJsonParse(workflow.nodesJson, []);
    const edges: any[] = safeJsonParse(workflow.edgesJson, []);
    const startTime = Date.now();

    // Create execution record
    const execution = await db.execution.create({
      data: {
        workflowId: id,
        status: 'running',
        mode: 'manual',
        startedAt: new Date(),
      },
    });

    // Handle empty workflow
    if (nodes.length === 0) {
      const updatedExecution = await db.execution.update({
        where: { id: execution.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          dataJson: JSON.stringify({ resultData: { runData: {} } }),
        },
      });

      return NextResponse.json({
        id: updatedExecution.id,
        workflowId: updatedExecution.workflowId,
        status: updatedExecution.status,
        mode: updatedExecution.mode,
        durationMs: updatedExecution.durationMs,
        startedAt: updatedExecution.startedAt,
        finishedAt: updatedExecution.finishedAt,
        nodeData: [],
      });
    }

    // Parse optional trigger input from request body
    let triggerInput: NodeOutput[] | undefined;
    let triggerData: Record<string, any> | undefined;
    try {
      const body = await request.json();
      if (body?.triggerInput) {
        triggerInput = body.triggerInput;
      }
      if (body?.triggerData) {
        triggerData = body.triggerData;
      }
    } catch {
      // No body or invalid JSON — that's fine for manual execution
    }

    // ─── Execute the workflow using the real executor ──────────────────────
    const result = await executeWorkflow({
      nodes: nodes.map((n: any) => ({
        id: n.id,
        type: n.type || n.data?.nodeType,
        name: n.name || n.data?.nodeType || 'Node',
        data: {
          nodeType: n.data?.nodeType || n.type,
          config: n.data?.config || {},
          disabled: n.data?.disabled || false,
        },
      })),
      edges: edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourcePort: e.sourcePort || e.sourceHandle,
        targetPort: e.targetPort || e.targetHandle,
      })),
      triggerInput,
      triggerData,
      workflowId: id,
    });

    // ─── Save execution node data ─────────────────────────────────────────
    const nodeDataRecords = result.nodeResults.map((nr) => ({
      executionId: execution.id,
      nodeName: nr.nodeName,
      nodeId: nr.nodeId,
      inputJson: JSON.stringify(nr.input),
      outputJson: JSON.stringify(nr.output),
      durationMs: nr.durationMs,
      status: nr.status as 'success' | 'error',
      ...(nr.status === 'error' && nr.error
        ? { errorJson: JSON.stringify({ message: nr.error, nodeType: nr.nodeType }) }
        : {}),
    }));

    if (nodeDataRecords.length > 0) {
      await db.executionNodeData.createMany({ data: nodeDataRecords });
    }

    // ─── Update execution record ──────────────────────────────────────────
    const totalDuration = Date.now() - startTime;

    const updatedExecution = await db.execution.update({
      where: { id: execution.id },
      data: {
        status: result.status,
        finishedAt: new Date(),
        durationMs: totalDuration,
        dataJson: JSON.stringify({
          resultData: {
            runData: result.nodeResults.reduce((acc: any, nr) => {
              acc[nr.nodeName] = [
                {
                  startTime: Date.now() - (nr.durationMs || 0),
                  executionTime: nr.durationMs,
                  executionStatus: nr.status,
                  data: nr.output,
                },
              ];
              return acc;
            }, {}),
          },
        }),
        ...(result.status === 'error'
          ? {
              errorJson: JSON.stringify({
                message: result.error || 'Execution failed at node',
                failedNode: result.nodeResults.find((r) => r.status === 'error')?.nodeName,
              }),
            }
          : {}),
      },
    });

    return NextResponse.json({
      id: updatedExecution.id,
      workflowId: updatedExecution.workflowId,
      status: updatedExecution.status,
      mode: updatedExecution.mode,
      durationMs: updatedExecution.durationMs,
      startedAt: updatedExecution.startedAt,
      finishedAt: updatedExecution.finishedAt,
      nodeData: result.nodeResults.map((nr) => ({
        nodeName: nr.nodeName,
        nodeId: nr.nodeId,
        nodeType: nr.nodeType,
        status: nr.status,
        durationMs: nr.durationMs,
        input: nr.input,
        output: nr.output,
        error: nr.error,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
