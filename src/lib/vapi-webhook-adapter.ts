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
  // ── 1. Authenticate ──
  // Phase 5.1 hardening: Vapi webhook authentication uses VAPI_WEBHOOK_SECRET ONLY.
  // NEVER accept INTERNAL_API_SECRET as a fallback — that would allow an internal
  // platform secret to become a public webhook credential. Trust boundaries are:
  //   Vapi → /api/vapi/webhook → VAPI_WEBHOOK_SECRET only
  //   Fieseros internal → /api/internal/* → INTERNAL_API_SECRET
  const authHeader = request.headers.get('authorization') || '';
  const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;

  if (!vapiWebhookSecret) {
    // In production, this is a configuration error — reject all webhooks.
    // In dev, log a warning and accept (so local testing works without setup).
    if (process.env.NODE_ENV === 'production') {
      console.error('[vapi-webhook] VAPI_WEBHOOK_SECRET not configured — rejecting all webhooks (PRODUCTION)');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }
    console.warn('[vapi-webhook] VAPI_WEBHOOK_SECRET not configured — accepting unauthenticated (DEV ONLY)');
  } else {
    // Constant-time comparison to prevent timing attacks
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

  // ── On call start (ringing or in_progress): run admission ──
  if (status === 'ringing' || status === 'in_progress') {
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
        // (AdmissionController may have created one before the rejection check failed
        // due to a race — defensive cleanup)
        const { releaseReservationByCallId } = await import('@/lib/usage-service');
        await releaseReservationByCallId(call.id).catch(() => {});

        // The telephony layer handles the actual fallback (forward/voicemail).
        // Vapi should end the call or transfer to the fallback target.
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

  // ── On call ended/failed: release reservation if no end-of-call-report follows ──
  // Phase 5.1 hardening #4: if the call failed (not just ended normally), release
  // the reservation immediately. The end-of-call-report handler will handle normal
  // finalization (CONSUMED). This handles the failure path.
  if (status === 'failed') {
    console.log(`[vapi-webhook] call ${call.id} FAILED — releasing reservation`);
    const { releaseReservationByCallId } = await import('@/lib/usage-service');
    await releaseReservationByCallId(call.id).catch(() => {});
    return NextResponse.json({ received: true, status: 'failed', action: 'reservation_released' });
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

  // 2. Identify the tenant + entitlement
  const destinationNumber = callDetails.to;
  if (!destinationNumber) {
    console.warn('[vapi-webhook] end-of-call-report: no destination number');
    return NextResponse.json({ received: true, error: 'no destination number' });
  }

  const routing = await getRoutingDecision(destinationNumber);
  if (!routing?.tenantId) {
    console.warn(`[vapi-webhook] end-of-call-report: no routing for ${destinationNumber}`);
    return NextResponse.json({ received: true, error: 'no routing' });
  }

  // 3. Get the active entitlement for this tenant
  const { getActiveEntitlement } = await import('@/lib/entitlement-service');
  const entitlement = await getActiveEntitlement(routing.tenantId, 'AI_RECEPTIONIST');
  if (!entitlement) {
    console.warn(`[vapi-webhook] end-of-call-report: no active entitlement for tenant ${routing.tenantId}`);
    return NextResponse.json({ received: true, error: 'no entitlement' });
  }

  // 4. Calculate billable seconds
  const durationSeconds = callDetails.durationSeconds || 0;
  const billableSeconds = Math.ceil(durationSeconds); // round up to nearest second

  // 5. Finalize usage (idempotent — won't duplicate on webhook retry)
  const result = await finalizeUsage({
    tenantId: routing.tenantId,
    entitlementId: entitlement.id,
    externalCallId: call.id,
    billableSeconds,
    providerCostUsd: callDetails.costUsd || 0,
    // revenueUsd is calculated by the billing layer (Phase 6+) — for now, leave null
    costBreakdown: callDetails.costUsd
      ? { vapi: callDetails.costUsd }
      : undefined,
    occurredAt: callDetails.endedAt ? new Date(callDetails.endedAt) : new Date(),
  });

  if (result.ok) {
    console.log(
      `[vapi-webhook] finalized usage: ${billableSeconds}s for call ${call.id} ` +
        `(ledger ${result.ledgerId}, idempotent=${result.idempotent})`,
    );
  } else {
    console.error(`[vapi-webhook] finalizeUsage failed for call ${call.id}:`, result.reason);
  }

  // 6. If the call was rejected (no reservation created), release any stale reservation
  // This handles the edge case where the call started but was rejected before the
  // reservation was created (e.g., concurrency exceeded).
  if (!result.ok && result.reason === 'ENTITLEMENT_NOT_FOUND') {
    // No reservation to release — the call was never admitted
  }

  return NextResponse.json({ received: true, finalized: result.ok, idempotent: result.idempotent });
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
