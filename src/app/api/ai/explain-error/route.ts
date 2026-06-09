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

export async function POST(request: NextRequest) {
  try {
    const { executionId } = await request.json();
    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    // Get execution data
    const execution = await db.execution.findUnique({
      where: { id: executionId },
      include: { nodeData: true },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Only analyze if there are actual errors
    if (execution.status !== 'error' && !execution.nodeData.some(nd => nd.status === 'error')) {
      return NextResponse.json({
        explanation: 'This execution completed successfully with no errors to analyze.',
        executionId,
      });
    }

    // Build error context
    const errorData = safeJsonParse(execution.errorJson, null);
    const nodeErrors = execution.nodeData
      .filter(nd => nd.status === 'error')
      .map(nd => ({
        nodeName: nd.nodeName,
        nodeId: nd.nodeId,
        input: safeJsonParse(nd.inputJson, {}),
        error: safeJsonParse(nd.errorJson, null),
      }));

    const context = {
      executionId: execution.id,
      status: execution.status,
      duration: execution.durationMs,
      errors: errorData,
      nodeErrors,
    };

    // Use AI to explain the error
    let zai: any = null;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      zai = await ZAI.create();
    } catch {
      return NextResponse.json({ 
        error: 'AI SDK not configured. Set ZAI_API_KEY environment variable to enable AI features.' 
      }, { status: 503 });
    }

    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a workflow debugging expert. Analyze the execution error data and provide a clear explanation of what went wrong and suggest specific fixes. Be concise and actionable.',
        },
        {
          role: 'user',
          content: `Analyze this failed execution and explain the error:\n\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const explanation = result.choices?.[0]?.message?.content || 'Unable to analyze the error.';

    return NextResponse.json({ explanation, executionId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to explain error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
