import { NextRequest, NextResponse } from 'next/server';
import { getRoutingDecision } from '@/lib/phone-number-service';
import { admitCall } from '@/lib/ai-admission-controller';
import { onCallStart, onCallFailed } from '@/lib/call-lifecycle-service';

/**
 * POST /api/voice/inbound
 * ─────────────────────────────────────────────────────────────────────────
 * Twilio voice webhook — receives inbound calls.
 *
 * This is the entry point for the entire inbound call flow:
 *
 *   Twilio receives call → POSTs to this endpoint
 *   ↓
 *   1. Identify the PhoneConnection via the destination number (To)
 *   2. Get the routing decision (routingMode + fallback)
 *   3. If AI_RECEPTIONIST:
 *      a. Run AdmissionController
 *      b. If admitted: return TwiML <Connect> to Vapi
 *      c. If rejected: return TwiML <Dial> (human) or <Say> (voicemail) based on fallback
 *   4. If HUMAN_FORWARD: return TwiML <Dial> to the human number
 *   5. If VOICEMAIL: return TwiML <Say> voicemail message
 *
 * Auth: Twilio validates via the webhook URL being configured on the number
 * (no bearer token — Twilio uses URL-based auth + optional signature validation).
 *
 * IMPORTANT: This endpoint returns TwiML (XML), NOT JSON.
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get('To') as string; // the Fieseros phone number
    const from = formData.get('From') as string; // the caller's number
    const callSid = formData.get('CallSid') as string; // Twilio's call ID

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

    // 2. Handle routing modes
    if (routing.routingMode === 'HUMAN_FORWARD') {
      // Forward to human number
      const target = routing.routingTarget;
      if (!target) {
        return twimlResponse(
          `<Response><Say>No forwarding number configured. Please contact support.</Say></Response>`,
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

    // 3. AI_RECEPTIONIST routing
    if (routing.routingMode === 'AI_RECEPTIONIST') {
      // Run admission controller
      const admission = await admitCall({
        tenantId: routing.tenantId,
        addonProductCode: 'AI_RECEPTIONIST',
        externalCallId: callSid,
      });

      if (!admission.allowed) {
        // AI unavailable — use fallback routing
        console.log(
          `[voice/inbound] call ${callSid} rejected by admission: ${admission.reason}. ` +
            `Fallback: ${routing.fallbackRoutingMode}`,
        );

        // Create AiCall record (for audit)
        await onCallStart({
          tenantId: routing.tenantId,
          vapiCallId: callSid,
          fromNumber: from,
          toNumber: to,
          customerPhone: from,
          connectionId: routing.connectionId,
          phoneNumberId: routing.phoneNumberId,
        }).catch(() => {});

        await onCallFailed(callSid, `admission_rejected: ${admission.reason}`).catch(() => {});

        // Return fallback TwiML
        if (routing.fallbackRoutingMode === 'HUMAN_FORWARD' && routing.fallbackRoutingTarget) {
          return twimlResponse(
            `<Response><Dial>${escapeXml(routing.fallbackRoutingTarget)}</Dial></Response>`,
          );
        }

        // Default fallback: voicemail
        return twimlResponse(
          `<Response><Say>Our AI assistant is currently unavailable. Please leave a message.</Say><Record maxlength="60" /></Response>`,
        );
      }

      // Admitted — create AiCall record + connect to Vapi
      await onCallStart({
        tenantId: routing.tenantId,
        vapiCallId: callSid,
        fromNumber: from,
        toNumber: to,
        customerPhone: from,
        connectionId: routing.connectionId,
        phoneNumberId: routing.phoneNumberId,
      }).catch(() => {});

      // Return TwiML that connects the call to Vapi via <Connect> + <Stream>
      // Vapi's Twilio integration uses the Vapi phone number / assistant
      // For V1, we use a simple <Connect> with the Vapi assistant URL
      // (Phase 5's Vapi webhook handles the actual AI conversation)

      // Get the active deployment's external assistant ID
      const deployment = await getActiveDeploymentId(routing.tenantId);
      if (!deployment) {
        // No active deployment — fallback to voicemail
        console.warn(`[voice/inbound] no active deployment for tenant ${routing.tenantId}`);
        return twimlResponse(
          `<Response><Say>AI assistant not configured. Please contact support.</Say></Response>`,
        );
      }

      // Return TwiML <Connect> to Vapi's Twilio Media Stream endpoint
      // Vapi provides a specific URL format for Twilio integration
      return twimlResponse(
        `<Response><Connect><Stream url="wss://${process.env.VAPI_TWILIO_STREAM_URL || 'api.vapi.ai'}/twilio/stream" />${deployment.externalAssistantId ? `<!-- assistant: ${deployment.externalAssistantId} -->` : ''}</Connect></Response>`,
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
  const { db } = await import('@/lib/db');
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
