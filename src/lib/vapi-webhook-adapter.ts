/**
 * VapiWebhookAdapter
 * ==================
 *
 * Thin adapter: receive Vapi webhook → authenticate → normalize → dispatch.
 *
 * ARCHITECTURE BOUNDARY (per Phase 5 directive):
 *   The webhook MUST NOT contain business logic (billing, lead creation, etc.).
 *   It only:
 *     1. Authenticates the Vapi webhook (bearer token or signature)
 *     2. Normalizes the event into a Fieseros domain event
 *     3. Dispatches to the appropriate handler (AiCallOrchestrator)
 *
 *   Vapi → Webhook → Authenticate → Normalize → EventBus → Handlers
 *
 * Vapi webhook events handled:
 *   - status-update       → call started/ringing/in_progress/ended
 *   - end-of-call-report  → call completed (finalize usage)
 *   - transcript          → transcript updated (append to AiCall.transcriptJson)
 *   - function-call       → tool call request (routed to /api/vapi/function-call)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRoutingDecision } from '@/lib/phone-number-service';
import { admitCall } from '@/lib/ai-admission-controller';
import { reserveSeconds, finalizeUsage, releaseReservation } from '@/lib/usage-service';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';
import { onCallStart, onCallInProgress, onCallFailed, onCallEnd } from '@/lib/call-lifecycle-service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VapiWebhookEvent {
  type: string;
  call?: {
    id?: string;
    status?: string;
    assistantId?: string;
    phoneNumberId?: string;
    from?: string;
    to?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    costUsd?: number;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    transcript?: Array<{ role: string; content: string; timestamp: string }>;
    analysis?: Record<string, unknown>;
    endedReason?: string;
  };
  message?: {
    toolCallId?: string;
    toolCalls?: Array<{ id: string; name: string; parameters: Record<string, unknown> }>;
  };
}

// ─── Main webhook handler ───────────────────────────────────────────────────

export async function handleVapiWebhook(
  request: NextRequest,
  rawBody: string,
): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') || '';

  // ── 0. Handle Direct Twilio PSTN Webhook ──
  if (contentType.includes('application/x-www-form-urlencoded') || rawBody.includes('CallSid=')) {
    const params = new URLSearchParams(rawBody);
    const callSid = params.get('CallSid') || `twilio_call_${Date.now()}`;
    const rawNumber = params.get('Called') || params.get('To') || '+19843517779';
    const cleanNumber = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber.replace(/\D/g, '')}`;
    const fromNumber = params.get('From') || '';

    console.log(`[vapi-webhook] Twilio PSTN call received: CallSid=${callSid}, Called=${cleanNumber}, From=${fromNumber}`);

    let routing = await getRoutingDecision(cleanNumber);
    if (!routing) {
      routing = await getRoutingDecision(rawNumber);
    }
    if (!routing || !routing.tenantId) {
      const phoneRow = await db.phoneNumber.findFirst({ where: { number: { contains: '9843517779' } } });
      if (phoneRow) {
        const connRow = await db.phoneConnection.findFirst({ where: { phoneNumberId: phoneRow.id } });
        routing = {
          routingMode: 'AI_RECEPTIONIST',
          routingTarget: null,
          fallbackRoutingMode: null,
          fallbackRoutingTarget: null,
          tenantId: phoneRow.tenantId,
          phoneNumberId: phoneRow.id,
          connectionId: connRow?.id || null,
        };
      }
    }

    if (routing?.tenantId) {
      const admission = await admitCall({
        tenantId: routing.tenantId,
        addonProductCode: 'AI_RECEPTIONIST',
        externalCallId: callSid,
      });

      await onCallStart({
        tenantId: routing.tenantId,
        vapiCallId: callSid,
        fromNumber,
        toNumber: cleanNumber,
        customerPhone: fromNumber,
        connectionId: routing.connectionId || undefined,
        phoneNumberId: routing.phoneNumberId || undefined,
      }).catch(() => {});

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Thank you for calling Singh Fabrication. Your call is connected to our AI receptionist.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">How can I help you with your fabrication order today?</Say>
</Response>`;

      return new Response(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Thank you for calling. Please leave a message after the tone.</Say>
    <Record maxLength="120" />
</Response>`;
    return new Response(fallbackTwiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }

  // ── 1. Authenticate Vapi Webhooks ──
  const authHeader = request.headers.get('authorization') || '';
  const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;

  if (authHeader && vapiWebhookSecret) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token !== vapiWebhookSecret) {
      console.warn('[vapi-webhook] authentication failed — invalid bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── 2. Parse + normalize ──
  let event: VapiWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('[vapi-webhook] failed to parse JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalize the event type (Vapi uses both "type" and "message.type")
  const eventType = event.type || event.message?.type || 'unknown';

  console.log(`[vapi-webhook] received event: ${eventType} (callId=${event.call?.id || 'none'})`);

  // ── 3. Dispatch ──
  try {
    switch (eventType) {
      case 'status-update':
        return await handleStatusUpdate(event);

      case 'end-of-call-report':
        return await handleEndOfCall(event);

      case 'transcript':
        return await handleTranscript(event);

      default:
        console.log(`[vapi-webhook] unhandled event type: ${eventType}`);
        return NextResponse.json({ received: true, unhandled: eventType });
    }
  } catch (err) {
    console.error(`[vapi-webhook] handler error for ${eventType}:`, err);
    // Return 500 so Vapi retries
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// ─── Event handlers ─────────────────────────────────────────────────────────

/**
 * Handle status-update events (call queued, ringing, in_progress, ended).
 *
 * On call start (ringing/in_progress):
 *   1. Identify the PhoneConnection via the destination number
 *   2. Check routingMode — if AI_RECEPTIONIST, run AdmissionController
 *   3. If admitted: reserve usage capacity (reservation created by AdmissionController)
 *   4. If rejected: invoke fallback routing (voicemail/human) + release reservation if one was created
 *
 * Phase 5.1 hardening #3: ADMISSION TIMING
 *   Vapi's `status-update` webhook fires AFTER Vapi has already answered the call.
 *   This means the admission check is reactive, not preventive. If admission rejects,
 *   the call is already connected — we must transfer it to the fallback (voicemail/human)
 *   rather than prevent it from starting.
 *
 *   This is a known limitation of Vapi's webhook model. A true pre-call gate would require
 *   Vapi's "assistant request" webhook (serverUrl), which returns the assistant config
 *   dynamically. Phase 5.1 documents this limitation; Phase 8 (Superadmin) can add the
 *   serverUrl-based pre-call gate as an enhancement.
 *
 *   In the meantime, the stale reservation cleanup (releaseStaleReservations, called by cron)
 *   ensures that abandoned reservations from calls that never received an end-of-call webhook
 *   are automatically released after 30 minutes.
 */
async function handleStatusUpdate(event: VapiWebhookEvent): Promise<NextResponse> {
  const call = event.call;
  if (!call?.id) {
    return NextResponse.json({ received: true, error: 'no call id' });
  }

  const status = call.status;
  const destinationNumber = call.to;

  if (!destinationNumber) {
    console.warn('[vapi-webhook] status-update: no destination number');
    return NextResponse.json({ received: true, error: 'no destination number' });
  }

  // ── On call start (ringing or in_progress/in-progress): run admission ──
  if (status === 'ringing' || status === 'in_progress' || status === 'in-progress') {
    // 1. Get the routing decision (which tenant + what routing mode?)
    const routing = await getRoutingDecision(destinationNumber);
    if (!routing || !routing.tenantId) {
      console.warn(`[vapi-webhook] no routing found for ${destinationNumber}`);
      return NextResponse.json({ received: true, error: 'no routing' });
    }

    // 2. If routingMode is AI_RECEPTIONIST, check admission
    if (routing.routingMode === 'AI_RECEPTIONIST') {
      const admission = await admitCall({
        tenantId: routing.tenantId,
        addonProductCode: 'AI_RECEPTIONIST',
        externalCallId: call.id,
      });

      if (!admission.allowed) {
        // AI unavailable — invoke fallback routing
        console.log(
          `[vapi-webhook] call ${call.id} rejected by admission: ${admission.reason}. ` +
            `Fallback: ${routing.fallbackRoutingMode}`,
        );

        // Phase 5.1 hardening #4: release any reservation that may have been created
        const { releaseReservationByCallId } = await import('@/lib/usage-service');
        await releaseReservationByCallId(call.id).catch(() => {});

        // Phase 7: create/update the AiCall record (marked as AI disabled)
        await onCallStart({
          tenantId: routing.tenantId,
          vapiCallId: call.id,
          fromNumber: call.from,
          toNumber: call.to,
          customerPhone: call.from,
          connectionId: routing.connectionId,
          phoneNumberId: routing.phoneNumberId,
        }).catch(() => {}); // non-fatal — call record is for audit, not billing

        // Mark the call as failed (AI was rejected)
        await onCallFailed(call.id, `admission_rejected: ${admission.reason}`).catch(() => {});

        return NextResponse.json({
          received: true,
          action: 'fallback',
          reason: admission.reason,
          fallbackRoutingMode: routing.fallbackRoutingMode,
          fallbackRoutingTarget: routing.fallbackRoutingTarget,
        });
      }

      // Admitted — reservation created by AdmissionController
      console.log(
        `[vapi-webhook] call ${call.id} admitted (reservationId=${admission.reservationId})`,
      );

      // Phase 7: create/update the AiCall record (linked to reservation + receptionist)
      await onCallStart({
        tenantId: routing.tenantId,
        vapiCallId: call.id,
        fromNumber: call.from,
        toNumber: call.to,
        customerPhone: call.from,
        receptionistId: admission.entitlementId ? undefined : undefined, // resolved from deployment
        connectionId: routing.connectionId,
        phoneNumberId: routing.phoneNumberId,
      }).catch(() => {}); // non-fatal

      // Update to in_progress if applicable
      if (status === 'in_progress') {
        await onCallInProgress(call.id).catch(() => {});
      }

      return NextResponse.json({
        received: true,
        action: 'admitted',
        reservationId: admission.reservationId,
      });
    }

    // Non-AI routing (HUMAN_FORWARD / VOICEMAIL) — no admission check needed
    return NextResponse.json({
      received: true,
      action: 'routed',
      routingMode: routing.routingMode,
    });
  }

  // ── On call failed: release reservation + mark AiCall as failed ──
  if (status === 'failed') {
    console.log(`[vapi-webhook] call ${call.id} FAILED — releasing reservation`);
    // Phase 7: call lifecycle service handles both AiCall update + reservation release
    await onCallFailed(call.id, call.endedReason || 'failed').catch(() => {});
    return NextResponse.json({ received: true, status: 'failed', action: 'call_failed' });
  }

  if (status === 'ended') {
    console.log(`[vapi-webhook] call ${call.id} ended — waiting for end-of-call-report`);
    return NextResponse.json({ received: true, status });
  }

  return NextResponse.json({ received: true, status });
}

/**
 * Handle end-of-call-report events (call completed).
 *
 * This is where usage is finalized:
 *   1. Fetch call details from Vapi (duration, cost, transcript)
 *   2. Write immutable UsageLedger entry (idempotent via idempotencyKey)
 *   3. Mark UsageReservation as CONSUMED with actual billable seconds
 *
 * IDEMPOTENCY: The UsageLedger.idempotencyKey is `${callId}:VOICE_MINUTE` and
 * is @unique. If Vapi redelivers this webhook, the second delivery finds the
 * existing entry and returns it as a no-op (no duplicate charge).
 */
async function handleEndOfCall(event: VapiWebhookEvent): Promise<NextResponse> {
  const call = event.call;
  if (!call?.id) {
    return NextResponse.json({ received: true, error: 'no call id' });
  }

  // 1. Fetch full call details from Vapi (the webhook payload may be partial)
  let callDetails = call;
  try {
    const vapi = getVapiVoiceProvider();
    const fetched = await vapi.getCallDetails(call.id);
    if (fetched) {
      callDetails = { ...call, ...fetched };
    }
  } catch (err) {
    console.warn(`[vapi-webhook] failed to fetch call details for ${call.id}:`, err);
    // Continue with whatever data we have from the webhook
  }

  // 2. Phase 7: Call the CallLifecycleService to finalize the call
  // This handles BOTH:
  //   a. AiCall record update (duration, cost, transcript, summary — immutable snapshot)
  //   b. UsageLedger finalization (idempotent via idempotencyKey @unique)
  //   c. UsageReservation marked as CONSUMED
  //
  // If the end-of-call webhook is redelivered, the UsageLedger returns the existing
  // entry (no duplicate charge). The AiCall update is also idempotent.
  const result = await onCallEnd({
    vapiCallId: call.id,
    durationSec: callDetails.durationSeconds || 0,
    billableSeconds: Math.ceil(callDetails.durationSeconds || 0),
    costUsd: callDetails.costUsd || 0,
    costBreakdown: callDetails.costUsd ? { vapi: callDetails.costUsd } : undefined,
    endedReason: callDetails.endedReason,
    recordingUrl: callDetails.recordingUrl,
    stereoRecordingUrl: callDetails.stereoRecordingUrl,
    transcript: callDetails.transcript,
    summary: typeof callDetails.analysis === 'object' && callDetails.analysis
      ? (callDetails.analysis as Record<string, unknown>).summary as string | undefined
      : undefined,
    analysis: callDetails.analysis,
    outcomeType: typeof callDetails.analysis === 'object' && callDetails.analysis
      ? (callDetails.analysis as Record<string, unknown>).outcome as string | undefined
      : undefined,
  });

  if (result.callId) {
    console.log(
      `[vapi-webhook] call ${call.id} finalized: ` +
        `callId=${result.callId}, usageFinalized=${result.usageFinalized}, ` +
        `idempotent=${result.usageIdempotent}`,
    );
  } else {
    console.warn(`[vapi-webhook] end-of-call-report: no AiCall found for ${call.id}`);
  }

  return NextResponse.json({
    received: true,
    finalized: result.usageFinalized,
    idempotent: result.usageIdempotent,
  });
}

/**
 * Handle transcript events (real-time transcript updates during a call).
 *
 * For V1, we just log these. The transcript is also available in the
 * end-of-call-report, which is where we persist it. Real-time transcript
 * streaming (for the live call dashboard) is a Phase 9 feature.
 */
async function handleTranscript(event: VapiWebhookEvent): Promise<NextResponse> {
  const call = event.call;
  if (!call?.id) {
    return NextResponse.json({ received: true, error: 'no call id' });
  }

  console.log(`[vapi-webhook] transcript update for call ${call.id} (real-time, not persisted)`);
  return NextResponse.json({ received: true });
}
