import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addWebhookRequest } from '@/lib/webhook-buffer';
import { executeWorkflow, type NodeOutput } from '@/lib/workflow-executor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  return handleWebhookRequest(request, webhookPath);
}

async function handleWebhookRequest(
  request: NextRequest,
  webhookPath: string,
) {
  try {
    // Parse the request body
    let body: unknown = null;
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        const text = await request.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      body = null;
    }

    // Collect headers (filter out internal ones)
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

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const receivedAt = new Date().toISOString();

    // Store in database for "Listen for test event" polling
    await addWebhookRequest({
      id: requestId,
      path: webhookPath,
      method: request.method,
      headers,
      queryParams,
      body,
      receivedAt,
      contentType,
    });

    // Try to find a workflow for this webhook path
    try {
      const workflow = await db.workflow.findFirst({
        where: {
          nodesJson: {
            contains: webhookPath,
          },
        },
      });

      if (workflow) {
        // Build trigger input
        const triggerInput: NodeOutput[] = [
          {
            json: {
              body,
              headers,
              queryParams,
              method: request.method,
              path: webhookPath,
              receivedAt,
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

        // Parse workflow nodes and edges
        const nodes = JSON.parse(workflow.nodesJson || '[]');
        const edges = JSON.parse(workflow.edgesJson || '[]');

        // Create execution record
        const execution = await db.execution.create({
          data: {
            workflowId: workflow.id,
            status: 'running',
            mode: 'trigger',
            startedAt: new Date(),
            dataJson: JSON.stringify({
              trigger: {
                type: 'webhook',
                path: webhookPath,
                mode: 'test',
                method: request.method,
              },
              input: { body, headers, queryParams },
            }),
          },
        });

        // Execute workflow in the background (test mode returns immediately)
        executeTestWorkflowAsync(execution.id, nodes, edges, triggerInput, triggerData);

        // Parse webhook trigger config for response settings
        let responseCode = 200;
        let responseBody: unknown = { success: true };

        try {
          const webhookNode = nodes.find(
            (n: { data?: { nodeType?: string; config?: Record<string, unknown> } }) =>
              n.data?.nodeType === 'webhookTrigger' || n.data?.nodeType === 'httpRequestTrigger',
          );
          if (webhookNode) {
            const config = webhookNode.data?.config || {};
            responseCode = (config.responseCode as number) || 200;
            try {
              responseBody = config.responseBody
                ? JSON.parse(config.responseBody as string)
                : { success: true };
            } catch {
              responseBody = { success: true };
            }
          }
        } catch {
          // Use defaults
        }

        return NextResponse.json(responseBody, { status: responseCode });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    // If no workflow found, still return success
    // The request is already stored in the in-memory buffer for the test listener
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received (test mode)',
        requestId,
        receivedAt,
        note: 'No workflow matched this webhook path, but the request was captured for testing.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Execute a test workflow in the background (fire-and-forget).
 */
async function executeTestWorkflowAsync(
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
    console.error('Test workflow execution failed:', error);
    try {
      await db.execution.update({
        where: { id: executionId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          errorJson: JSON.stringify({ message: error.message || 'Test execution failed' }),
        },
      });
    } catch {
      console.error('Failed to update execution record:', error);
    }
  }
}
