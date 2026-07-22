import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Vapi Webhook Handler
 * --------------------
 * Receives call lifecycle events from Vapi.ai:
 *   - status-update (queued, ringing, in-progress)
 *   - end-of-call-report (final transcript, summary, cost, duration)
 *   - transcript
 *
 * Configure this URL in Vapi Dashboard → Webhooks.
 * URL: https://<your-domain>/api/vapi/webhook
 *
 * The webhook is authenticated by the `x-vapi-secret` header (optional but
 * recommended). Set VAPI_WEBHOOK_SECRET env var to enable verification.
 *
 * Call lookup: we match by `vapiCallId`. If no local AiCall exists yet, we
 * create one (for inbound calls we may not have pre-created a record).
 */

const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

function verifySecret(request: NextRequest): boolean {
  if (!VAPI_WEBHOOK_SECRET) return true; // not configured → skip verification
  const headerSecret = request.headers.get('x-vapi-secret') || request.headers.get('x-vapi-webhook-secret');
  return headerSecret === VAPI_WEBHOOK_SECRET;
}

async function resolveTenant(call: any): Promise<string | null> {
  // Tenant can be identified via: phoneNumberId → AiPhoneNumber.tenantId
  // or assistantId → AiAgent.tenantId
  const assistantId = call?.assistantId || call?.assistant?.id;
  const phoneNumberId = call?.phoneNumberId || call?.phoneNumber?.id;

  if (assistantId) {
    const agent = await db.aiAgent.findFirst({
      where: { vapiAssistantId: assistantId },
      select: { tenantId: true, id: true },
    });
    if (agent) return agent.tenantId;
  }
  if (phoneNumberId) {
    const num = await db.aiPhoneNumber.findFirst({
      where: { vapiNumberId: phoneNumberId },
      select: { tenantId: true, id: true },
    });
    if (num) return num.tenantId;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifySecret(request)) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await request.json();
    const { type, call, message } = body as {
      type: string;
      call?: any;
      message?: any;
    };

    console.log('[Vapi Webhook] type:', type, 'callId:', call?.id);

    switch (type) {
      case 'status-update':
        return handleStatusUpdate(call);
      case 'end-of-call-report':
        return handleEndOfCall(call);
      case 'transcript':
        return handleTranscript(call, message);
      case 'function-call':
        // Some Vapi setups send function calls through the webhook instead of
        // a separate server URL. Forward to the function-call handler.
        return NextResponse.json({ result: 'function-call handled separately' });
      default:
        console.log('[Vapi Webhook] Unhandled type:', type);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('[Vapi Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleStatusUpdate(call: any) {
  if (!call?.id) return NextResponse.json({ received: true });

  const tenantId = await resolveTenant(call);
  if (!tenantId) {
    console.log('[Vapi Webhook] Could not resolve tenant for call', call.id);
    return NextResponse.json({ received: true });
  }

  const existing = await db.aiCall.findFirst({
    where: { vapiCallId: call.id },
  });

  const status = mapCallStatus(call.status);
  const data: Record<string, unknown> = {
    status,
    ...(call.assistantId && { /* keep existing */ }),
    ...(call.phoneNumberId && { /* keep existing */ }),
    ...(call.customer?.number && { customerPhone: call.customer.number }),
    ...(call.startedAt && { startedAt: new Date(call.startedAt) }),
    ...(call.endedAt && { endedAt: new Date(call.endedAt) }),
  };

  if (existing) {
    await db.aiCall.update({ where: { id: existing.id }, data });
  } else {
    // Resolve agent + number for the new call
    const agent = call.assistantId
      ? await db.aiAgent.findFirst({ where: { vapiAssistantId: call.assistantId }, select: { id: true } })
      : null;
    const number = call.phoneNumberId
      ? await db.aiPhoneNumber.findFirst({ where: { vapiNumberId: call.phoneNumberId }, select: { id: true } })
      : null;

    await db.aiCall.create({
      data: {
        tenantId,
        vapiCallId: call.id,
        callType: call.type === 'outbound' ? 'outbound' : 'inbound',
        status,
        assistantId: agent?.id || null,
        phoneNumberId: number?.id || null,
        fromNumber: call.from || null,
        toNumber: call.to || null,
        customerPhone: call.customer?.number || null,
        startedAt: call.startedAt ? new Date(call.startedAt) : null,
      } as any,
    });
  }

  return NextResponse.json({ received: true });
}

async function handleEndOfCall(call: any) {
  if (!call?.id) return NextResponse.json({ received: true });

  const tenantId = await resolveTenant(call);
  if (!tenantId) return NextResponse.json({ received: true });

  const transcript = (call.transcript || [])
    .map((t: any) => ({
      role: t.role || (t.speaker === 'assistant' ? 'assistant' : 'user'),
      content: t.content || t.text || '',
      timestamp: t.timestamp || t.time || null,
    }))
    .filter((t: any) => t.content);

  const summary = call.summary || call.analysis?.summary || null;
  const analysis = call.analysis || {};

  const existing = await db.aiCall.findFirst({
    where: { vapiCallId: call.id },
  });

  if (existing) {
    await db.aiCall.update({
      where: { id: existing.id },
      data: {
        status: 'ended',
        endedAt: call.endedAt ? new Date(call.endedAt) : new Date(),
        endedReason: call.endedReason || call.endReason || null,
        durationSec: call.durationSeconds || call.duration || 0,
        costUsd: call.cost || 0,
        transcriptJson: JSON.stringify(transcript),
        summary,
        analysisJson: JSON.stringify(analysis),
      },
    });

    // Update agent stats
    if (existing.assistantId) {
      await db.aiAgent.update({
        where: { id: existing.assistantId },
        data: {
          totalCalls: { increment: 1 },
          totalSeconds: { increment: call.durationSeconds || 0 },
          lastCallAt: new Date(),
        },
      });
    }
  } else {
    // Create the call record if we missed the status-update
    const agent = call.assistantId
      ? await db.aiAgent.findFirst({ where: { vapiAssistantId: call.assistantId }, select: { id: true } })
      : null;
    const number = call.phoneNumberId
      ? await db.aiPhoneNumber.findFirst({ where: { vapiNumberId: call.phoneNumberId }, select: { id: true } })
      : null;

    await db.aiCall.create({
      data: {
        tenantId,
        vapiCallId: call.id,
        callType: call.type === 'outbound' ? 'outbound' : 'inbound',
        status: 'ended',
        assistantId: agent?.id || null,
        phoneNumberId: number?.id || null,
        customerPhone: call.customer?.number || null,
        startedAt: call.startedAt ? new Date(call.startedAt) : null,
        endedAt: call.endedAt ? new Date(call.endedAt) : new Date(),
        durationSec: call.durationSeconds || 0,
        costUsd: call.cost || 0,
        transcriptJson: JSON.stringify(transcript),
        summary,
        analysisJson: JSON.stringify(analysis),
        endedReason: call.endedReason || null,
      } as any,
    });

    if (agent) {
      await db.aiAgent.update({
        where: { id: agent.id },
        data: {
          totalCalls: { increment: 1 },
          totalSeconds: { increment: call.durationSeconds || 0 },
          lastCallAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleTranscript(call: any, message: any) {
  // Live transcript updates (optional — we mainly rely on end-of-call-report)
  if (!call?.id) return NextResponse.json({ received: true });

  const existing = await db.aiCall.findFirst({
    where: { vapiCallId: call.id },
    select: { id: true, transcriptJson: true },
  });
  if (!existing) return NextResponse.json({ received: true });

  // Append the new transcript segment
  const current = (() => { try { return JSON.parse(existing.transcriptJson || '[]'); } catch { return []; } })();
  if (message?.content) {
    current.push({
      role: message.role || 'user',
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
    });
    await db.aiCall.update({
      where: { id: existing.id },
      data: { transcriptJson: JSON.stringify(current) },
    });
  }

  return NextResponse.json({ received: true });
}

function mapCallStatus(vapiStatus: string): string {
  const map: Record<string, string> = {
    'queued': 'queued',
    'ringing': 'ringing',
    'in-progress': 'in_progress',
    'forwarding': 'in_progress',
    'ended': 'ended',
    'failed': 'failed',
    'busy': 'failed',
    'no-answer': 'failed',
    'canceled': 'failed',
  };
  return map[vapiStatus] || 'queued';
}

// GET — webhook status (for debugging / Vapi dashboard test)
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'vapi-webhook',
    secretRequired: !!VAPI_WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
  });
}
