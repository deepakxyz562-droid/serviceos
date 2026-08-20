import { NextRequest, NextResponse } from 'next/server';
import { getRoutingDecision } from '@/lib/phone-number-service';
import { checkAdmission } from '@/lib/ai-admission-controller';
import { db } from '@/lib/db';

/**
 * POST /api/voice/inbound
 * ─────────────────────────────────────────────────────────────────────────
 * Twilio voice webhook — receives inbound calls.
 *
 * Phase 8.6 Gate 2: SINGLE ADMISSION LIFECYCLE
 *
 * This endpoint does ROUTING ONLY (returns TwiML). It does a quick read-only
 * pre-check (subscription active? entitlement active?) to decide whether to
 * connect to Vapi or use fallback. It does NOT create reservations.
 *
 * The actual admission + reservation happens at the Vapi webhook
 * (/api/vapi/webhook) when Vapi reports status=ringing. This ensures:
 *   - One call → one reservation (no double-reservation)
 *   - The Vapi call ID is the single externalCallId throughout
 *   - Reservation + finalization use the same ID (no ID mismatch)
 *
 * TwiML responses:
 *   AI_RECEPTIONIST (admission passes) → <Connect><Stream> to Vapi
 *   AI_RECEPTIONIST (admission fails)  → fallback TwiML (<Dial> or <Say><Record>)
 *   HUMAN_FORWARD                     → <Dial> to routingTarget
 *   VOICEMAIL                          → <Say><Record>
 *
 * Auth: Twilio uses URL-based auth (the webhook URL is configured on the number).
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;

    if (!to) {
      return twimlResponse(`<Response><Say>Invalid call configuration.</Say></Response>`);
    }

    // 1. Get the routing decision
    const routing = await getRoutingDecision(to);
    if (!routing || !routing.tenantId) {
      console.warn(`[voice/inbound] no routing found for ${to}`);
      return twimlResponse(
        `<Response><Say>The number you have called is not in service.</Say></Response>`,
      );
    }

    // 2. Handle non-AI routing modes (no admission needed)
    if (routing.routingMode === 'HUMAN_FORWARD') {
      const target = routing.routingTarget;
      if (!target) {
        return twimlResponse(
          `<Response><Say>No forwarding number configured.</Say></Response>`,
        );
      }
      return twimlResponse(
        `<Response><Dial>${escapeXml(target)}</Dial></Response>`,
      );
    }

    if (routing.routingMode === 'VOICEMAIL') {
      return twimlResponse(
        `<Response><Say>Please leave a message after the beep.</Say><Record maxlength="60" /></Response>`,
      );
    }

    // 3. AI_RECEPTIONIST routing — quick read-only pre-check
    //
    // We do a lightweight checkAdmission() (no reservation, no capacity check)
    // to decide whether to even connect to Vapi. If the subscription is clearly
    // inactive or the entitlement is missing, we skip Vapi entirely and go to
    // fallback. This avoids Vapi processing costs for calls that will be rejected.
    //
    // The ACTUAL reservation (capacity + concurrency check) happens at the
    // Vapi webhook when the call starts. This prevents double-reservation.
    if (routing.routingMode === 'AI_RECEPTIONIST') {
      const precheck = await checkAdmission(routing.tenantId, 'AI_RECEPTIONIST');

      if (!precheck.allowed) {
        console.log(
          `[voice/inbound] call ${callSid} pre-check failed: ${precheck.reason}. ` +
            `Fallback: ${routing.fallbackRoutingMode}`,
        );

        // Return fallback TwiML (don't connect to Vapi at all)
        return getFallbackTwiML(routing.fallbackRoutingMode, routing.fallbackRoutingTarget);
      }

      // Pre-check passed — connect to Vapi
      // Get the active deployment's external assistant ID
      const deployment = await getActiveDeploymentId(routing.tenantId);
      if (!deployment) {
        console.warn(`[voice/inbound] no active deployment for tenant ${routing.tenantId}`);
        return twimlResponse(
          `<Response><Say>AI assistant not configured. Please contact support.</Say></Response>`,
        );
      }

      // Return TwiML <Connect> to Vapi
      // The Vapi webhook (/api/vapi/webhook) will handle admission + reservation
      // when Vapi reports the call starting (status=ringing).
      //
      // NOTE: The exact Vapi Twilio connection mechanism needs to be verified
      // against the Vapi account configuration. Vapi supports multiple
      // Twilio integration patterns:
      //   1. Vapi imports the Twilio number (Vapi manages the webhook)
      //   2. Twilio <Connect><Stream> to Vapi's WebSocket
      //   3. Twilio <Dial> to a Vapi SIP endpoint
      //
      // For V1, we use pattern 1 (Vapi imports the Twilio number) — in this case,
      // Twilio's voice webhook points directly to Vapi (not to Fieseros).
      // Fieseros' /api/voice/inbound is the FALLBACK for non-Vapi numbers.
      //
      // For Vapi-imported numbers, Twilio never calls this endpoint — Vapi
      // receives the call directly and sends webhooks to /api/vapi/webhook.
      //
      // This endpoint is used when:
      //   - The number is Twilio-provisioned (not Vapi-imported)
      //   - The tenant wants Twilio-level control (e.g., Twilio-native voicemail)
      //
      // TwiML <Connect><Stream> connects Twilio's media to Vapi's WebSocket.
      // Vapi assigns its own call ID when it receives the stream.
      return twimlResponse(
        `<Response><Connect><Stream url="wss://api.vapi.ai/twilio/stream" /></Connect></Response>`,
      );
    }

    // Unknown routing mode — default to voicemail
    return twimlResponse(
      `<Response><Say>Please leave a message after the beep.</Say><Record maxlength="60" /></Response>`,
    );
  } catch (error) {
    console.error('[POST /api/voice/inbound] error:', error);
    return twimlResponse(
      `<Response><Say>An error occurred. Please try again later.</Say></Response>`,
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFallbackTwiML(
  fallbackMode: string | null,
  fallbackTarget: string | null,
): NextResponse {
  if (fallbackMode === 'HUMAN_FORWARD' && fallbackTarget) {
    return twimlResponse(
      `<Response><Say>Please hold while we connect you.</Say><Dial>${escapeXml(fallbackTarget)}</Dial></Response>`,
    );
  }

  // Default: voicemail
  return twimlResponse(
    `<Response><Say>Our AI assistant is currently unavailable. Please leave a message.</Say><Record maxlength="60" /></Response>`,
  );
}

function twimlResponse(twiml: string): NextResponse {
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getActiveDeploymentId(tenantId: string): Promise<{ externalAssistantId: string | null } | null> {
  const deployment = await db.aiProviderDeployment.findFirst({
    where: {
      provider: 'VAPI',
      status: 'ACTIVE',
      agentVersion: {
        receptionist: { tenantId },
      },
    },
    select: { externalAssistantId: true },
  });
  return deployment;
}
