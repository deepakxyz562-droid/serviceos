import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

/**
 * POST /api/vapi/function-call
 * ─────────────────────────────────────────────────────────────────────────
 * Vapi function-call bridge — receives tool-call requests from Vapi during
 * an AI conversation.
 *
 * Vapi V2 payload structure (as sent by Vapi in production):
 * {
 *   message: {
 *     type: "tool-calls",
 *     toolCalls: [{ id, type: "function", function: { name, arguments: {...} } }],
 *     call: {
 *       id: "...",
 *       assistantId: "...",
 *       phoneNumberId: "...",   ← use this, NOT call.to (which is always undefined)
 *       customer: { number: "+91..." },
 *     }
 *   }
 * }
 *
 * Auth: Vapi sends the platform Vapi API key as Bearer token.
 */

export async function POST(request: NextRequest) {
  const hasAuth = !!request.headers.get('authorization');
  console.log(`[vapi/function-call] received: hasAuth=${hasAuth}`);

  // ── 1. Authenticate ──
  const authHeader = request.headers.get('authorization') || '';
  const platformKey = await getDecryptedApiKey('VAPI');

  if (!platformKey) {
    console.error('[vapi/function-call] Vapi API key not configured — getDecryptedApiKey returned null');
    return NextResponse.json({ error: 'Provider not configured' }, { status: 503 });
  }

  // Accept either "Bearer <key>" or just "<key>"
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== platformKey) {
    console.warn(`[vapi/function-call] authentication failed — token mismatch (received: ${token.substring(0, 8)}..., expected: ${platformKey.substring(0, 8)}...)`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[vapi/function-call] authentication passed');

  // ── 2. Parse the request ──
  // Vapi V2 wraps everything in body.message — handle both wrapped and flat formats.
  const body = await request.json();
  const msg = body.message || body;

  // Extract toolCalls: Vapi V2 → msg.toolCalls
  const toolCalls = msg.toolCalls || body.toolCalls || msg.toolWithToolCallList;

  // Extract call object: Vapi V2 → msg.call
  const call = msg.call || body.call || body;

  console.log(`[vapi/function-call] body top-level keys: ${Object.keys(body).join(', ')}`);
  console.log(`[vapi/function-call] msg type: ${msg.type || 'none'}`);
  console.log(`[vapi/function-call] toolCalls found: ${toolCalls ? toolCalls.length : 'none'}`);
  console.log(`[vapi/function-call] call.id: ${call?.id || 'none'}`);
  console.log(`[vapi/function-call] call.assistantId: ${call?.assistantId || 'none'}`);
  console.log(`[vapi/function-call] call.phoneNumberId: ${call?.phoneNumberId || 'none'}`);

  if (!toolCalls || !Array.isArray(toolCalls)) {
    console.warn('[vapi/function-call] no toolCalls in request — raw body:', JSON.stringify(body).substring(0, 500));
    return NextResponse.json({ error: 'No toolCalls in request' }, { status: 400 });
  }

  // Log which tools are being called
  const toolNames = toolCalls.map((tc: { name?: string; function?: { name?: string } }) =>
    tc.function?.name || tc.name || 'unknown'
  );
  console.log(`[vapi/function-call] tools requested: ${toolNames.join(', ')}`);

  // ── 3. Resolve the tenant from the call ──
  // Vapi V2: use phoneNumberId → look up PhoneNumber by vapiNumberId → get tenantId
  // Fall back to assistantId → AiProviderDeployment → tenant
  let tenantId: string | null = null;
  let receptionistId: string | null = null;
  let deploymentId: string | null = null;
  let agentVersionId: string | null = null;

  // Path A: phoneNumberId → PhoneNumber.vapiNumberId → tenant
  if (call?.phoneNumberId) {
    const phoneNumber = await db.phoneNumber.findFirst({
      where: { vapiNumberId: call.phoneNumberId },
      select: { tenantId: true },
    });
    if (phoneNumber?.tenantId) {
      tenantId = phoneNumber.tenantId;
      console.log(`[vapi/function-call] tenant resolved via phoneNumberId: ${tenantId}`);
    }
  }

  // Path B: assistantId → AiProviderDeployment → AiAgentVersion → AiReceptionist → tenant
  if (call?.assistantId) {
    const deployment = await db.aiProviderDeployment.findFirst({
      where: {
        externalAssistantId: call.assistantId,
        status: 'ACTIVE',
      },
      select: { id: true, aiAgentVersionId: true },
    });
    if (deployment?.aiAgentVersionId) {
      const agentVersion = await db.aiAgentVersion.findUnique({
        where: { id: deployment.aiAgentVersionId },
        select: { aiReceptionistId: true },
      });
      if (agentVersion?.aiReceptionistId) {
        const receptionist = await db.aiReceptionist.findUnique({
          where: { id: agentVersion.aiReceptionistId },
          select: { id: true, tenantId: true },
        });
        if (receptionist) {
          if (!tenantId) {
            tenantId = receptionist.tenantId;
            console.log(`[vapi/function-call] tenant resolved via assistantId deployment: ${tenantId}`);
          }
          receptionistId = receptionist.id;
          deploymentId = deployment.id;
          agentVersionId = deployment.aiAgentVersionId;
        }
      }
    }
  }

  if (!tenantId) {
    console.warn('[vapi/function-call] could not resolve tenant for call', call?.id,
      `| phoneNumberId=${call?.phoneNumberId} | assistantId=${call?.assistantId}`);
    return NextResponse.json({ error: 'Could not resolve tenant' }, { status: 400 });
  }

  // ── 4. Process tool calls via AiToolDispatcher ──
  await import('@/lib/ai-tool-handlers');
  const { executeTool } = await import('@/lib/ai-tool-dispatcher');

  const executionContext: Record<string, unknown> = {
    tenantId,
    externalCallId: call?.id || '',
    toolCallId: '',
    ...(receptionistId ? { receptionistId } : {}),
    ...(deploymentId ? { deploymentId } : {}),
    ...(agentVersionId ? { agentVersionId } : {}),
  };

  const results = await Promise.all(
    toolCalls.map(async (tc: { id?: string; name?: string; parameters?: Record<string, unknown>; function?: { name?: string; arguments?: Record<string, unknown> | string } }) => {
      // Vapi V2: tool name is in tc.function.name, args in tc.function.arguments
      const toolName = tc.function?.name || tc.name || '';
      const rawArgs = tc.function?.arguments ?? tc.parameters ?? {};
      const toolParams = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
      const toolCallId = tc.id || `tc_${Date.now()}`;

      console.log(`[vapi/function-call] executing tool: ${toolName} (id=${toolCallId})`);
      console.log(`[vapi/function-call] params: ${JSON.stringify(toolParams).substring(0, 200)}`);

      const ctx = { ...executionContext, toolCallId };
      const result = await executeTool(ctx as Parameters<typeof executeTool>[0], toolName, toolParams);

      console.log(`[vapi/function-call] result for ${toolName}: ok=${result.ok}, result=${JSON.stringify(result.result || result.error).substring(0, 200)}`);

      return {
        toolCallId,
        result: result.ok ? result.result : { error: result.error },
        idempotent: result.idempotent || false,
      };
    }),
  );

  return NextResponse.json({ results });
}
