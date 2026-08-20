import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getReceptionistForTenant,
  getCurrentVersion,
  getActiveDeployment,
} from '@/lib/ai-receptionist-service';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';
import { admitCall } from '@/lib/ai-admission-controller';
import { releaseReservationByCallId } from '@/lib/usage-service';
import { onCallStart } from '@/lib/call-lifecycle-service';

/**
 * POST /api/addons/receptionist/test-call
 * ─────────────────────────────────────────────────────────────────────────
 * Initiate a test call — Fieseros calls the tenant's phone and connects them
 * to their own AI Receptionist.
 *
 * This is the "Test & Activate" step in onboarding and the first-class
 * "Test Call" action in the workspace.
 *
 * Flow:
 *   1. Validate the customer number (E.164)
 *   2. Resolve the active Vapi assistant + phone number
 *   3. admitCall() — checks subscription + entitlement + capacity + reserves usage
 *   4. Create AiCall record (callType=outbound) via onCallStart
 *   5. Call VapiVoiceProvider.createOutboundCall()
 *   6. Return the call ID for polling
 *
 * The call's lifecycle (ringing → in_progress → ended) is driven by Vapi
 * webhooks — the same webhook path as inbound calls. The only difference is
 * `callType=outbound` and the `fromNumber` is the tenant's Fieseros number.
 *
 * Auth: owner only.
 *
 * Body: { customerNumber: string }  (E.164, e.g. "+14155551234")
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can initiate test calls' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { customerNumber } = body as { customerNumber?: string };

    // ── Validate the customer number ──
    if (!customerNumber) {
      return NextResponse.json(
        { error: 'customerNumber is required' },
        { status: 400 },
      );
    }

    // Normalize to E.164 (strip non-digits, ensure leading +)
    const normalized = customerNumber.trim();
    const e164 = normalized.startsWith('+')
      ? normalized
      : `+${normalized.replace(/[^\d]/g, '')}`;

    if (!/^\+\d{8,15}$/.test(e164)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use E.164 format, e.g. +14155551234' },
        { status: 400 },
      );
    }

    const tenantId = user.tenantId;

    // ── 1. Resolve the receptionist + current version + active deployment ──
    const receptionist = await getReceptionistForTenant(tenantId);
    if (!receptionist) {
      return NextResponse.json(
        { error: 'No AI Receptionist configured. Set up your receptionist first.' },
        { status: 400 },
      );
    }

    if (receptionist.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `AI Receptionist is ${receptionist.status.toLowerCase()}. Activate it first.` },
        { status: 400 },
      );
    }

    const currentVersion = await getCurrentVersion(tenantId, receptionist.id);
    if (!currentVersion || currentVersion.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'No published agent version. Publish your receptionist first.' },
        { status: 400 },
      );
    }

    const deployment = await getActiveDeployment(tenantId, currentVersion.id);
    if (!deployment || deployment.status !== 'ACTIVE' || !deployment.externalAssistantId) {
      return NextResponse.json(
        { error: 'No active Vapi deployment. Deploy your receptionist first.' },
        { status: 400 },
      );
    }

    // ── 2. Resolve the phone number + Vapi binding ──
    const phoneConnection = await db.phoneConnection.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        phoneNumber: {
          select: {
            id: true,
            number: true,
            status: true,
            vapiNumberId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!phoneConnection) {
      return NextResponse.json(
        { error: 'No active phone connection. Provision a phone number first.' },
        { status: 400 },
      );
    }

    if (phoneConnection.routingMode !== 'AI_RECEPTIONIST') {
      return NextResponse.json(
        { error: `Phone routing is set to ${phoneConnection.routingMode}. Switch to AI Receptionist to test.` },
        { status: 400 },
      );
    }

    const phone = phoneConnection.phoneNumber;
    if (phone.status !== 'active') {
      return NextResponse.json(
        { error: `Phone number is ${phone.status}. Cannot make test call.` },
        { status: 400 },
      );
    }

    if (!phone.vapiNumberId) {
      return NextResponse.json(
        { error: 'Phone number is not bound to Vapi. Contact support.' },
        { status: 400 },
      );
    }

    // ── 3. Admission check + reservation (atomic via admitCall) ──
    // The test call goes through the same admission path as a real inbound call.
    // admitCall checks: platform enabled → subscription active → entitlement active
    // → usage remaining → concurrency, then creates a UsageReservation.
    const externalCallId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const admission = await admitCall({
      tenantId,
      addonProductCode: 'AI_RECEPTIONIST',
      externalCallId,
      requestedSeconds: Math.min(currentVersion.maxDurationSeconds, 300), // cap test calls at 5 min
    });

    if (!admission.allowed) {
      const reasonMessages: Record<string, string> = {
        PLATFORM_DISABLED: 'The AI Receptionist platform is temporarily disabled.',
        SUBSCRIPTION_INACTIVE: 'Your subscription is not active. Reactivate it to make test calls.',
        ENTITLEMENT_NOT_FOUND: 'No active entitlement found for your subscription.',
        ENTITLEMENT_NOT_ACTIVE: 'Your entitlement is not active.',
        USAGE_EXHAUSTED: 'You do not have enough AI minutes remaining for a test call.',
        CONCURRENCY_EXCEEDED: 'You have too many active calls. Wait for one to finish.',
        INTERNAL_ERROR: 'An internal error occurred during the admission check.',
      };
      return NextResponse.json(
        {
          error: reasonMessages[admission.reason || 'INTERNAL_ERROR'] || 'Test call blocked.',
          reason: admission.reason,
        },
        { status: 402 },
      );
    }

    // ── 4. Create AiCall record via onCallStart ──
    let aiCallId: string | null = null;
    try {
      const callStart = await onCallStart({
        tenantId,
        vapiCallId: externalCallId, // temporary — updated when Vapi responds
        receptionistId: receptionist.id,
        agentVersionId: currentVersion.id,
        deploymentId: deployment.id,
        connectionId: phoneConnection.id,
        fromNumber: phone.number,
        toNumber: e164,
        customerPhone: e164,
      });
      aiCallId = callStart.callId;

      // Tag as outbound test call (onCallStart creates as inbound by default)
      await db.aiCall.update({
        where: { id: callStart.callId },
        data: {
          callType: 'outbound',
        },
      });
    } catch (e) {
      // onCallStart may fail if a call with this vapiCallId already exists (idempotent guard).
      // This is non-fatal — we still proceed to create the Vapi call.
      console.error('[test-call] onCallStart failed (non-fatal):', e);
    }

    // ── 5. Call Vapi to create the outbound call ──
    let vapiCallId: string | null = null;
    try {
      const result = await getVapiVoiceProvider().createOutboundCall({
        assistantId: deployment.externalAssistantId,
        phoneNumberId: phone.vapiNumberId,
        customerNumber: e164,
      });
      vapiCallId = result.callId;

      // Update the AiCall with the real Vapi call ID + ringing status
      if (aiCallId) {
        await db.aiCall.update({
          where: { id: aiCallId },
          data: {
            vapiCallId: result.callId,
            status: 'ringing',
          },
        });
      }
    } catch (err) {
      // Vapi call creation failed — release the reservation + mark call failed
      console.error('[test-call] Vapi createOutboundCall failed:', err);

      await releaseReservationByCallId(externalCallId);

      if (aiCallId) {
        await db.aiCall.update({
          where: { id: aiCallId },
          data: {
            status: 'failed',
            endedReason: 'vapi_creation_failed',
            endedAt: new Date(),
          },
        });
      }

      return NextResponse.json(
        {
          error: 'Failed to start the call on Vapi',
          detail: err instanceof Error ? err.message : 'Unknown error',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      callId: aiCallId,
      vapiCallId,
      customerNumber: e164,
      fromNumber: phone.number,
      status: 'ringing',
      message: `Calling ${e164}... Your AI Receptionist will answer.`,
    });
  } catch (error) {
    console.error('[POST /api/addons/receptionist/test-call] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate test call' },
      { status: 500 },
    );
  }
}
