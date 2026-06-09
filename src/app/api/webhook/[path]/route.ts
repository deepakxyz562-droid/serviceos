import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeWorkflow, type NodeOutput } from '@/lib/workflow-executor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath, 'production');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath, 'production');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath, 'production');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath, 'production');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath, 'production');
}

async function handleWebhookRequest(
  request: NextRequest,
  webhookPath: string,
  mode: 'test' | 'production',
) {
  try {
    // Find the workflow with this webhook path
    const workflow = await db.workflow.findFirst({
      where: {
        active: true,
        nodesJson: {
          contains: webhookPath,
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Webhook not found', path: webhookPath },
        { status: 404 },
      );
    }

    // Parse the request body
    let body: any = null;
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        body = await request.text();
        try { body = JSON.parse(body); } catch { /* keep as string */ }
      }
    } catch {
      body = null;
    }

    // Collect headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.startsWith('x-middleware-') && !key.startsWith('x-next-')) {
        headers[key] = value;
      }
    });

    // Collect query params
    const queryParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Build trigger input data
    const triggerInput: NodeOutput[] = [
      {
        json: {
          body,
          headers,
          queryParams,
          method: request.method,
          path: webhookPath,
          receivedAt: new Date().toISOString(),
        },
      },
    ];

    const triggerData = {
      body,
      headers,
      queryParams,
      method: request.method,
      path: webhookPath,
    };

    // Parse workflow nodes to find the webhook trigger node config for response settings
    const nodes = JSON.parse(workflow.nodesJson || '[]');
    const edges = JSON.parse(workflow.edgesJson || '[]');

    let respondMode = 'immediately';
    let responseCode = 200;
    let responseBody: any = { success: true };

    try {
      const webhookNode = nodes.find(
        (n: any) => n.data?.nodeType === 'webhookTrigger' || n.type === 'webhookTrigger' || n.data?.nodeType === 'httpRequestTrigger' || n.type === 'httpRequestTrigger',
      );
      if (webhookNode) {
        const config = webhookNode.data?.config || {};
        respondMode = config.respond || 'immediately';
        responseCode = config.responseCode || 200;
        if (config.responseBody) {
          try { responseBody = JSON.parse(config.responseBody); } catch { responseBody = { success: true }; }
        }
      }
    } catch {
      // Use defaults
    }

    // Create execution record
    const execution = await db.execution.create({
      data: {
        workflowId: workflow.id,
        status: 'running',
        mode: 'trigger',
        startedAt: new Date(),
        dataJson: JSON.stringify({
          trigger: { type: 'webhook', path: webhookPath, mode, method: request.method },
          input: { body, headers, queryParams },
        }),
      },
    });

    // If respond mode is "immediately", return the response right away
    // and execute the workflow in the background
    if (respondMode === 'immediately') {
      // Execute workflow asynchronously in the background
      executeWorkflowAsync(workflow.id, execution.id, nodes, edges, triggerInput, triggerData);

      return NextResponse.json(responseBody, { status: responseCode });
    }

    // For "lastNode" or "webhookResponse" modes, execute synchronously
    // and return the last node's output
    try {
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
        workflowId: workflow.id,
      });

      // Save node data records
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

      // Update execution record
      await db.execution.update({
        where: { id: execution.id },
        data: {
          status: result.status,
          finishedAt: new Date(),
          durationMs: result.durationMs,
          dataJson: JSON.stringify({
            trigger: { type: 'webhook', path: webhookPath, mode, method: request.method },
            input: { body, headers, queryParams },
            output: result.nodeResults.length > 0
              ? result.nodeResults[result.nodeResults.length - 1].output
              : null,
          }),
          ...(result.status === 'error'
            ? { errorJson: JSON.stringify({ message: result.error || 'Execution failed' }) }
            : {}),
        },
      });

      // Return the last node's output as the response
      if (respondMode === 'lastNode' && result.nodeResults.length > 0) {
        const lastOutput = result.nodeResults[result.nodeResults.length - 1].output;
        return NextResponse.json(
          lastOutput.length > 0 ? lastOutput[0].json : { success: true },
          { status: responseCode },
        );
      }

      return NextResponse.json(responseBody, { status: responseCode });
    } catch (execError: any) {
      await db.execution.update({
        where: { id: execution.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          errorJson: JSON.stringify({ message: execError.message || 'Execution failed' }),
        },
      });

      return NextResponse.json(
        { error: 'Workflow execution failed', message: execError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Execute a workflow in the background (fire-and-forget).
 * Used when the webhook respond mode is "immediately".
 */
async function executeWorkflowAsync(
  workflowId: string,
  executionId: string,
  nodes: any[],
  edges: any[],
  triggerInput: NodeOutput[],
  triggerData: Record<string, any>,
) {
  try {
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
      workflowId: workflowId,
    });

    // Save node data records
    const nodeDataRecords = result.nodeResults.map((nr) => ({
      executionId,
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

    // Update execution record
    await db.execution.update({
      where: { id: executionId },
      data: {
        status: result.status,
        finishedAt: new Date(),
        durationMs: result.durationMs,
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
          ? { errorJson: JSON.stringify({ message: result.error || 'Execution failed' }) }
          : {}),
      },
    });
  } catch (error: any) {
    console.error('Background workflow execution failed:', error);
    try {
      await db.execution.update({
        where: { id: executionId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          errorJson: JSON.stringify({ message: error.message || 'Background execution failed' }),
        },
      });
    } catch {
      // If we can't even update the execution record, just log
      console.error('Failed to update execution record:', error);
    }
  }
}
