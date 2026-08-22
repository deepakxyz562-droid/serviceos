import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

/**
 * POST /api/vapi/function-call
 * ─────────────────────────────────────────────────────────────────────────
 * Vapi function-call bridge — receives tool-call requests from Vapi during
 * an AI conversation.
 *
 * This endpoint is set as `serverUrl` on the Vapi assistant. When the AI
 * decides to call a tool (e.g., `create_lead`, `book_appointment`), Vapi
 * sends a POST to this URL with the tool name + parameters.
 *
 * Phase 5: Basic authentication + routing. Phase 6 will implement the actual
 * tool execution via domain services (AiToolExecution with idempotency).
 *
 * Auth: The tenant's Vapi API key is sent as a bearer token. The route
 * verifies it against the platform's stored Vapi key (same key for all
 * tenants in Phase 5 — Phase 8 adds per-tenant BYOK for Enterprise).
 *
 * ARCHITECTURE BOUNDARY:
 *   Vapi → function-call route → AiToolExecution (Phase 6) → Domain Services → DB
 *
 * The route does NOT execute business logic directly. Phase 6 will add
 * the tool dispatcher that calls LeadService, BookingService, etc.
 */

export async function POST(request: NextRequest) {
  // Phase 10 diagnostic: log that we received a function-call request
  const hasAuth = !!request.headers.get('authorization');
  console.log(`[vapi/function-call] received: hasAuth=${hasAuth}`);

  // ── 1. Authenticate ──
  // Verify the bearer token matches the platform Vapi key
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
  const body = await request.json();
  const { toolCalls, call } = body;

  // Phase 10 diagnostic: log which tools are being called
  if (toolCalls && Array.isArray(toolCalls)) {
    const toolNames = toolCalls.map((tc: { name?: string; function?: { name?: string } }) => tc.name || tc.function?.name || 'unknown');
    console.log(`[vapi/function-call] tools requested: ${toolNames.join(', ')}`);
    console.log(`[vapi/function-call] call ID: ${call?.id || 'none'}`);
  }

  if (!toolCalls || !Array.isArray(toolCalls)) {
    console.warn('[vapi/function-call] no toolCalls in request');
    return NextResponse.json({ error: 'No toolCalls in request' }, { status: 400 });
  }

  // ── 3. Resolve the tenant from the call ──
  // Phase 5.1 hardening: when BOTH call.to and call.assistantId are present,
  // resolve tenant from BOTH paths and verify they agree. If they disagree,
  // REJECT the request (critical tenant isolation check).
  const destinationNumber = call?.to || call?.phoneNumber;
  let tenantFromPhone: string | null = null;
  let tenantFromAssistant: string | null = null;

  // Path A: resolve from destination phone number → PhoneConnection → tenant
  if (destinationNumber) {
    const { getRoutingDecision } = await import('@/lib/phone-number-service');
    const routing = await getRoutingDecision(destinationNumber);
    if (routing?.tenantId) {
      tenantFromPhone = routing.tenantId;
    }
  }

  // Path B: resolve from assistantId → AiProviderDeployment → AiAgentVersion → AiReceptionist → tenant
  // Phase 9.8 Supabase fix: PostgREST (via our adapter) can only resolve ONE
  // level of nested relations at a time. The old code used:
  //   select: { agentVersion: { select: { receptionist: { select: { tenantId } } } } }
  // which the adapter couldn't resolve (nested includes aren't supported, and
  // the relation name was also wrong — "receptionist" vs the schema's "reception").
  // We do a flat 3-step lookup instead:
  //   1. AiProviderDeployment by externalAssistantId (ACTIVE)
  //   2. AiAgentVersion by id (= deployment.aiAgentVersionId)
  //   3. AiReceptionist by id (= version.aiReceptionistId) → tenantId
  if (call?.assistantId) {
    const deployment = await db.aiProviderDeployment.findFirst({
      where: {
        externalAssistantId: call.assistantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        aiAgentVersionId: true,
      },
    });
    if (deployment?.aiAgentVersionId) {
      const agentVersion = await db.aiAgentVersion.findUnique({
        where: { id: deployment.aiAgentVersionId },
        select: { aiReceptionistId: true },
      });
      if (agentVersion?.aiReceptionistId) {
        const receptionist = await db.aiReceptionist.findUnique({
          where: { id: agentVersion.aiReceptionistId },
          select: { tenantId: true },
        });
        if (receptionist?.tenantId) {
          tenantFromAssistant = receptionist.tenantId;
        }
      }
    }
  }

  // ── Cross-check: if both paths resolved, they must agree ──
  if (tenantFromPhone && tenantFromAssistant && tenantFromPhone !== tenantFromAssistant) {
    console.error(
      `[vapi/function-call] TENANT MISMATCH: call.to=${destinationNumber} → tenant=${tenantFromPhone}, ` +
        `assistantId=${call.assistantId} → tenant=${tenantFromAssistant}. REJECTING.`,
    );
    return NextResponse.json(
      { error: 'Tenant mismatch detected — call rejected for security' },
      { status: 403 },
    );
  }

  // Use whichever path resolved (prefer phone, fall back to assistant)
  const tenantId = tenantFromPhone || tenantFromAssistant;

  if (!tenantId) {
    console.warn('[vapi/function-call] could not resolve tenant for call', call?.id);
    return NextResponse.json({ error: 'Could not resolve tenant' }, { status: 400 });
  }

  // ── 4. Process tool calls via AiToolDispatcher ──
  // Phase 6: full tool dispatcher with AiToolExecution (idempotent) + capability checks.
  // Import the tool handlers (registers all handlers on module load)
  await import('@/lib/ai-tool-handlers');
  const { executeTool } = await import('@/lib/ai-tool-dispatcher');

  const executionContext = {
    tenantId,
    externalCallId: call?.id || '',
    toolCallId: '',
  };

  // Resolve receptionist/agent version/deployment from the assistantId (if available)
  // Phase 9.8 Supabase fix: same flat 3-step lookup as above — PostgREST can't
  // resolve the nested `agentVersion: { receptionist: {...} }` include.
  if (call?.assistantId) {
    const deployment = await db.aiProviderDeployment.findFirst({
      where: {
        externalAssistantId: call.assistantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        aiAgentVersionId: true,
      },
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
          executionContext.deploymentId = deployment.id;
          executionContext.agentVersionId = deployment.aiAgentVersionId;
          executionContext.receptionistId = receptionist.id;
        }
      }
    }
  }

  const results = await Promise.all(
    toolCalls.map(async (tc: { id: string; name: string; parameters: Record<string, unknown> }) => {
      const ctx = {
        ...executionContext,
        toolCallId: tc.id,
      };

      const result = await executeTool(ctx, tc.name, tc.parameters || {});

      return {
        toolCallId: tc.id,
        result: result.ok ? result.result : { error: result.error },
        idempotent: result.idempotent || false,
      };
    }),
  );

  return NextResponse.json({ results });
}
