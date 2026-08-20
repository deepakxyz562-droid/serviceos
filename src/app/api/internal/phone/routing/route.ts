import { NextRequest, NextResponse } from 'next/server';
import { getRoutingDecision } from '@/lib/phone-number-service';

/**
 * POST /api/internal/phone/routing
 * ─────────────────────────────────────────────────────────────────────────
 * INTERNAL endpoint — returns the routing decision for an incoming call.
 *
 * This is called by the Vapi webhook (Phase 5) or the Twilio voice webhook
 * to determine WHERE an incoming call should be routed:
 *   - AI_RECEPTIONIST → call goes to AI (then AdmissionController checks capacity)
 *   - HUMAN_FORWARD → call forwards to routingTarget (human number)
 *   - VOICEMAIL → call goes to voicemail
 *
 * SECURITY: This endpoint is NOT public. It requires a server-to-server secret
 * passed via the `X-Internal-Auth` header. The secret is read from the
 * `INTERNAL_API_SECRET` environment variable.
 *
 * This prevents enumeration of phone numbers → tenantId mappings by
 * unauthenticated callers. Only the Vapi webhook / Twilio webhook (which
 * knows the secret) can call this endpoint.
 *
 * Body: { destinationNumber: string } — the E.164 number the call arrived on
 *
 * Returns: { found, routingMode, routingTarget, tenantId, phoneNumberId, connectionId, fallbackRoutingMode, fallbackRoutingTarget }
 */

export async function POST(request: NextRequest) {
  // ── 1. Verify server-to-server secret ──
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    console.error('[internal/phone/routing] INTERNAL_API_SECRET not configured — rejecting all routing requests');
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('x-internal-auth');
  if (authHeader !== internalSecret) {
    console.warn('[internal/phone/routing] unauthorized request — invalid or missing X-Internal-Auth header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse the request body ──
  const body = await request.json();
  const { destinationNumber } = body;

  if (!destinationNumber) {
    return NextResponse.json(
      { error: 'destinationNumber is required' },
      { status: 400 },
    );
  }

  // ── 3. Get the routing decision ──
  try {
    const decision = await getRoutingDecision(destinationNumber);

    if (!decision) {
      // Unknown number — caller should reject the call
      return NextResponse.json(
        { found: false, routingMode: null },
        { status: 404 },
      );
    }

    // ── 4. Return minimal routing info ──
    // Only what the webhook needs to route the call. No sensitive tenant data
    // beyond what's necessary for routing.
    return NextResponse.json({
      found: true,
      routingMode: decision.routingMode,
      routingTarget: decision.routingTarget,
      tenantId: decision.tenantId,
      phoneNumberId: decision.phoneNumberId,
      connectionId: decision.connectionId,
    });
  } catch (error) {
    console.error('[internal/phone/routing] error:', error);
    return NextResponse.json(
      { error: 'Failed to get routing decision' },
      { status: 500 },
    );
  }
}
