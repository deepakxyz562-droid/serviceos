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
  const authHeader = request.headers.get('authorization') || '';
  console.log(`[vapi/function-call] HTTP ${request.method} request received (hasAuth=${!!authHeader})`);

  const platformKey = await getDecryptedApiKey('VAPI');

  if (!platformKey) {
    console.error('[vapi/function-call] Vapi API key not configured');
    return NextResponse.json({ error: 'Provider not configured' }, { status: 503 });
  }

  // Accept either "Bearer <key>" or just "<key>"
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== platformKey) {
    console.warn(`[vapi/function-call] authentication failed — token mismatch (tokenLen=${token.length}, platformKeyLen=${platformKey.length})`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse the request ──
  const body = await request.json();
  const { toolCalls, call } = body;

  if (!toolCalls || !Array.isArray(toolCalls)) {
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
  if (call?.assistantId) {
    const deployment = await db.aiProviderDeployment.findFirst({
      where: {
        externalAssistantId: call.assistantId,
        status: 'ACTIVE',
      },
      select: {
        agentVersion: {
          select: {
            receptionist: {
              select: { tenantId: true },
            },
          },
        },
      },
    });
    if (deployment) {
      tenantFromAssistant = deployment.agentVersion.receptionist.tenantId;
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
  if (call?.assistantId) {
    const deployment = await db.aiProviderDeployment.findFirst({
      where: {
        externalAssistantId: call.assistantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        agentVersion: {
          select: {
            id: true,
            receptionist: {
              select: { id: true, tenantId: true },
            },
          },
        },
      },
    });

    if (deployment) {
      executionContext.deploymentId = deployment.id;
      executionContext.agentVersionId = deployment.agentVersion.id;
      executionContext.receptionistId = deployment.agentVersion.receptionist.id;
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
