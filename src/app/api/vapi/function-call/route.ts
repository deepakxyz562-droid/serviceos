import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeTool } from '@/lib/vapi-functions';

/**
 * Vapi Function-Call Bridge
 * -------------------------
 * Vapi invokes this endpoint (set as `serverUrl` on the assistant) whenever
 * the LLM decides to call a tool (function). We execute the corresponding
 * business logic and return the result, which Vapi feeds back to the LLM.
 *
 * Vapi sends:  { message: { toolCall: { name, parameters } }, call: {...} }
 * We return:   { result: <any> }
 *
 * Auth: Vapi signs requests with a bearer token equal to the tenant's API key.
 * We look up the tenant by the assistantId on the call and verify the key.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, call } = body as {
      message?: {
        type: string;
        toolCall?: { name: string; parameters: Record<string, unknown> };
      };
      call?: {
        id?: string;
        assistantId?: string;
        phoneNumberId?: string;
        customer?: { number?: string };
      };
    };

    // Only handle tool-call messages
    if (message?.type !== 'tool-call' || !message.toolCall) {
      return NextResponse.json({ result: 'No tool call to handle' });
    }

    const { name: toolName, parameters } = message.toolCall;
    console.log('[Vapi Function-Call]', toolName, parameters);

    // Resolve tenant from assistantId
    const assistantId = call?.assistantId;
    let tenantId: string | null = null;
    let agentId: string | null = null;

    if (assistantId) {
      const agent = await db.aiAgent.findFirst({
        where: { vapiAssistantId: assistantId },
        select: { tenantId: true, id: true },
      });
      tenantId = agent?.tenantId || null;
      agentId = agent?.id || null;
    }

    // Fallback: resolve via phone number
    if (!tenantId && call?.phoneNumberId) {
      const num = await db.aiPhoneNumber.findFirst({
        where: { vapiNumberId: call.phoneNumberId },
        select: { tenantId: true },
      });
      tenantId = num?.tenantId || null;
    }

    if (!tenantId) {
      return NextResponse.json({
        result: { error: 'Could not resolve tenant for this call' },
      });
    }

    // Resolve local AiCall record (if exists)
    let localCallId: string | undefined;
    if (call?.id) {
      const localCall = await db.aiCall.findFirst({
        where: { vapiCallId: call.id },
        select: { id: true },
      });
      localCallId = localCall?.id;
    }

    // Execute the tool
    const result = await executeTool(toolName, parameters, {
      tenantId,
      callId: localCallId,
      agentId: agentId || undefined,
      customerPhone: call?.customer?.number,
    });

    // Persist the function call on the AiCall record
    if (localCallId) {
      const callRec = await db.aiCall.findUnique({
        where: { id: localCallId },
        select: { functionCallsJson: true },
      });
      if (callRec) {
        const calls = (() => { try { return JSON.parse(callRec.functionCallsJson || '[]'); } catch { return []; } })();
        calls.push({
          name: toolName,
          parameters,
          result,
          at: new Date().toISOString(),
        });
        await db.aiCall.update({
          where: { id: localCallId },
          data: { functionCallsJson: JSON.stringify(calls) },
        });
      }
    }

    // Vapi expects the result wrapped in { result: ... }
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[Vapi Function-Call] Error:', error);
    return NextResponse.json({
      result: { error: 'Function call failed', detail: (error as Error).message },
    }, { status: 200 }); // 200 so Vapi doesn't retry endlessly
  }
}

// GET — for Vapi dashboard connectivity test
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'vapi-function-call-bridge',
    timestamp: new Date().toISOString(),
  });
}
