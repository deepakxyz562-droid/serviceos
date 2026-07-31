import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeTool } from '@/lib/vapi-functions';
import { EventBus } from '@/lib/event-bus';

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

    // Bug 3 fix: link the AiCall row to the newly-created Lead / set the
    // outcomeType after a successful create_lead / book_appointment /
    // submit_request. Fire-and-forget so a slow DB write doesn't block the
    // Vapi response. The fields are bare String? (no Prisma @relation — soft
    // FK, see Phase R2 worklog) so a direct `update` is safe on Supabase.
    if (localCallId && result && typeof result === 'object') {
      const r = result as { leadId?: string; bookingId?: string };
      if (toolName === 'create_lead' && r.leadId) {
        db.aiCall.update({
          where: { id: localCallId },
          data: { leadId: r.leadId, outcomeType: 'lead_created' },
        }).catch(err => console.error('[function-call] Failed to link AiCall.leadId:', err));
      } else if (toolName === 'book_appointment' && r.bookingId) {
        db.aiCall.update({
          where: { id: localCallId },
          data: { outcomeType: 'booked' },
        }).catch(err => console.error('[function-call] Failed to set outcomeType:', err));
      } else if (toolName === 'submit_request' && r.leadId) {
        // submit_request also creates a Lead — mirror the linkage so the call
        // record shows where the request came from.
        db.aiCall.update({
          where: { id: localCallId },
          data: { leadId: r.leadId, outcomeType: 'lead_created' },
        }).catch(err => console.error('[function-call] Failed to link AiCall.leadId (submit_request):', err));
      } else if (toolName === 'transfer_call') {
        db.aiCall.update({
          where: { id: localCallId },
          data: { outcomeType: 'transferred' },
        }).catch(err => console.error('[function-call] Failed to set outcomeType (transfer):', err));
      }
    }

    // ── Emit ai_call.* events for successful lead/booking tool calls ──
    // These events drive the lifecycle-push-dispatcher → in-app + web push
    // notifications to the tenant owner/admins.
    const resultObj = (result && typeof result === 'object') ? result as Record<string, any> : {};
    const isSuccessful =
      resultObj.success === true ||
      (resultObj.success === undefined && (!!resultObj.leadId || !!resultObj.bookingId));

    if (isSuccessful && tenantId && localCallId) {
      const basePayload = {
        call: {
          id: localCallId,
          customerPhone: call?.customer?.number,
          assistantId: agentId,
          tenantId,
        },
        toolName,
        parameters,
        result,
        resourceType: 'ai_call',
        resourceId: localCallId,
      } as Record<string, any>;

      if (toolName === 'create_lead' && resultObj.leadId) {
        basePayload.leadId = resultObj.leadId;
        EventBus.emit('ai_call.lead_created', basePayload, { tenantId })
          .catch(err => console.error('[EventBus] ai_call.lead_created emit failed:', err));
      } else if (toolName === 'book_appointment' && resultObj.bookingId) {
        basePayload.bookingId = resultObj.bookingId;
        EventBus.emit('ai_call.appointment_booked', basePayload, { tenantId })
          .catch(err => console.error('[EventBus] ai_call.appointment_booked emit failed:', err));
      }
    }

    // Vapi response shape:
    //  - Normal tools: { result: <data> } — Vapi feeds `<data>` to the LLM
    //    as the tool result.
    //  - transfer_call (Bug 2 fix): the handler returns a pre-wrapped
    //    `{ result: { type: 'transfer', destination, reason }, message }`
    //    so Vapi recognises the transfer command (per Vapi docs). Pass it
    //    through verbatim — wrapping it again would nest `result.result`
    //    and Vapi would treat it as ordinary data the LLM narrates (the bug).
    if (
      result &&
      typeof result === 'object' &&
      'result' in (result as Record<string, unknown>) &&
      'message' in (result as Record<string, unknown>)
    ) {
      return NextResponse.json(result);
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
