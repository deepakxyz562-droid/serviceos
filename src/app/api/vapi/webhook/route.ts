import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { sendSmsMessage } from '@/lib/sms-send';
import { getTenantVapiKeyByTenantId, updatePhoneNumber } from '@/lib/vapi-client';

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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
let secretWarned = false;

function verifySecret(request: NextRequest): boolean {
  if (!VAPI_WEBHOOK_SECRET) {
    // In production, refuse to process webhooks without a secret — an
    // unauthenticated webhook URL allows anyone to POST fake call events
    // (corrupting AiCall rows, inflating billing counters, injecting fake
    // leads). In dev/test, allow but warn once so the developer knows to
    // set the secret before deploying.
    if (IS_PRODUCTION) {
      console.error(
        '[Vapi Webhook] REJECTED: VAPI_WEBHOOK_SECRET is not set. ' +
        'Set it in your production environment to authenticate webhook requests.',
      );
      return false;
    }
    if (!secretWarned) {
      console.warn(
        '[Vapi Webhook] WARNING: VAPI_WEBHOOK_SECRET is not set — webhook ' +
        'requests are unauthenticated. Set VAPI_WEBHOOK_SECRET before deploying ' +
        'to production. (This warning appears once per process.)',
      );
      secretWarned = true;
    }
    return true;
  }
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

/**
 * Resolve whether a caller is a known Customer, a known Lead, or unknown.
 * Used at the start of a call so the AI Receptionist UI can immediately
 * surface "existing customer" vs. "new lead" context.
 */
async function resolveCallerIdentity(phone: string): Promise<'customer' | 'lead' | 'unknown' | null> {
  if (!phone) return null;
  try {
    const customer = await db.customer.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (customer) return 'customer';
    const lead = await db.lead.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (lead) return 'lead';
    return 'unknown';
  } catch (err) {
    console.error('[Vapi Webhook] callerIdentifiedAs lookup failed:', err);
    return null;
  }
}

/**
 * Phase R8 — Trusted-access allowlist enforcement.
 *
 * Reads `AiAgent.trustedPhonesJson` (a JSON array of E.164 strings) and
 * returns true if the caller's phone is in the list — OR if the allowlist
 * is empty / unparseable (default-allow).
 *
 * NOTE: We can't directly stop Vapi from answering (that's configured on
 * the Vapi assistant side). This check is used to flag the call with a
 * tag so the dashboard shows which calls came from untrusted numbers.
 */
function isCallerTrusted(
  trustedPhonesJson: string | null | undefined,
  callerPhone: string | null | undefined,
): boolean {
  if (!trustedPhonesJson) return true; // no allowlist → allow all
  try {
    const list = JSON.parse(trustedPhonesJson);
    if (!Array.isArray(list) || list.length === 0) return true; // empty → allow all
    if (!callerPhone) return false; // list is set but caller unknown → untrusted
    // Normalise both sides: strip whitespace, compare case-insensitively
    const norm = (p: string) => p.replace(/[\s\-()]/g, '').toLowerCase();
    const callerNorm = norm(callerPhone);
    return list.some((entry) => typeof entry === 'string' && norm(entry) === callerNorm);
  } catch {
    return true; // parse error → don't block (fail open)
  }
}

/**
 * Phase R8 — Per-caller disable enforcement.
 *
 * If ANY previous AiCall from this phone has `aiDisabled: true`, the
 * caller is considered disabled and the AI should not process the call.
 *
 * Returns the AiCall.id that disabled them (for audit), or null.
 */
async function findCallerDisabled(
  callerPhone: string | null | undefined,
): Promise<string | null> {
  if (!callerPhone) return null;
  try {
    const disabledCall = await db.aiCall.findFirst({
      where: { customerPhone: callerPhone, aiDisabled: true },
      select: { id: true },
    });
    return disabledCall?.id ?? null;
  } catch (err) {
    console.error('[Vapi Webhook] caller-disabled lookup failed:', err);
    return null;
  }
}

/**
 * Phase R8 — Append a tag to AiCall.tagsJson.
 *
 * tagsJson shape: `[{label, color, at}]` (default `[]`).
 * Idempotent — if a tag with the same label already exists, no-op.
 * Returns the updated JSON string (or null if no change needed).
 */
function appendTag(
  tagsJson: string | null | undefined,
  label: string,
  color: 'red' | 'amber' | 'emerald' | 'blue' | 'violet',
): string {
  let tags: Array<{ label: string; color: string; at: string }> = [];
  try {
    const parsed = JSON.parse(tagsJson || '[]');
    if (Array.isArray(parsed)) tags = parsed;
  } catch {
    tags = [];
  }
  if (tags.some((t) => t.label === label)) return tagsJson || '[]';
  tags.push({ label, color, at: new Date().toISOString() });
  return JSON.stringify(tags);
}

/**
 * Compute the call outcome from the accumulated function-call history
 * (populated by the function-call bridge) + the endedReason + duration.
 *
 *   booked        — book_appointment tool returned success
 *   lead_created  — create_lead tool returned a leadId
 *   transferred   — transfer_call tool was invoked
 *   missed        — call didn't connect (no-answer, customer-ended, 0s)
 *   info_only     — fallback for answered calls with no tool activity
 */
type CallOutcome = 'booked' | 'lead_created' | 'transferred' | 'info_only' | 'missed' | 'spam';
function computeOutcomeType(
  functionCallsJson: string | null | undefined,
  endedReason: string | null | undefined,
  durationSec: number,
): CallOutcome {
  let calls: Array<{ name?: string; result?: any }> = [];
  try {
    calls = JSON.parse(functionCallsJson || '[]');
  } catch {
    calls = [];
  }

  const hasBooked = calls.some(
    (c) => c.name === 'book_appointment' && c.result && c.result.success !== false,
  );
  if (hasBooked) return 'booked';

  const hasLead = calls.some(
    (c) => c.name === 'create_lead' && c.result && c.result.leadId,
  );
  if (hasLead) return 'lead_created';

  const hasTransfer = calls.some((c) => c.name === 'transfer_call');
  if (hasTransfer) return 'transferred';

  const reason = (endedReason || '').toLowerCase();
  if (reason.includes('no-answer') || reason.includes('customer-ended') || durationSec === 0) {
    return 'missed';
  }

  return 'info_only';
}

/**
 * Increment the tenant's monthly AI billing counter. Resets on month rollover.
 * Non-blocking — caller wraps in .catch() so a failure here never breaks the
 * webhook response.
 *
 * Also emits `ai_billing.threshold_reached` events at 75% and 100% of the
 * tenant's callsLimit (Phase R7). The 75% alert is throttled by
 * `lastAlertAt` (max once per 24h) so a tenant hovering around 75-99% doesn't
 * get spammed. The 100% alert is fired every time a call lands at or above
 * the limit (which is by definition at most once per month unless the limit
 * is bumped down).
 */
async function incrementBillingCounter(tenantId: string): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const existing = await db.aiBillingCounter.findFirst({ where: { tenantId } });

  // Compute the post-increment callsUsed + post-update row state.
  let callsUsed: number;
  let callsLimit: number;
  let rowId: string;
  let effectiveMonthStart: Date;
  let prevLastAlertAt: Date | null;

  if (existing) {
    const shouldReset = existing.monthStart.getTime() < monthStart.getTime();
    callsUsed = shouldReset ? 1 : existing.callsUsed + 1;
    callsLimit = existing.callsLimit;
    rowId = existing.id;
    effectiveMonthStart = shouldReset ? monthStart : existing.monthStart;
    prevLastAlertAt = existing.lastAlertAt;
    await db.aiBillingCounter.update({
      where: { id: existing.id },
      data: {
        callsUsed,
        monthStart: effectiveMonthStart,
      },
    });
  } else {
    callsUsed = 1;
    callsLimit = 30;
    effectiveMonthStart = monthStart;
    prevLastAlertAt = null;
    const created = await db.aiBillingCounter.create({
      data: { tenantId, monthStart, callsUsed: 1, callsLimit: 30 },
    });
    rowId = created.id;
  }

  // ── Threshold alerts (fire-and-forget) ─────────────────────────────
  if (callsLimit <= 0) return; // defensive guard against div-by-zero
  const pct = callsUsed / callsLimit;

  // 75% alert — throttle to once per 24h via lastAlertAt
  if (pct >= 0.75 && pct < 1) {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (!prevLastAlertAt || prevLastAlertAt.getTime() < twentyFourHoursAgo.getTime()) {
      EventBus.emit(
        'ai_billing.threshold_reached',
        {
          tenantId,
          callsUsed,
          callsLimit,
          threshold: 75,
        },
        { tenantId },
      ).catch(err => console.error('[billing] 75% alert emit failed:', err));
      try {
        await db.aiBillingCounter.update({
          where: { id: rowId },
          data: { lastAlertAt: now },
        });
      } catch (err) {
        console.error('[billing] Failed to update lastAlertAt (75%):', err);
      }
    }
  }

  // 100% alert — fire every time the limit is hit (no throttle: the operator
  // needs to know the AI is about to stop answering / overage is starting).
  if (callsUsed >= callsLimit) {
    EventBus.emit(
      'ai_billing.threshold_reached',
      {
        tenantId,
        callsUsed,
        callsLimit,
        threshold: 100,
      },
      { tenantId },
    ).catch(err => console.error('[billing] 100% alert emit failed:', err));

    // ── Enforce billing pause: deactivate Vapi phone numbers ──────────
    // Set pausedAtLimit=true and remove the assistantId mapping from all
    // the tenant's Vapi phone numbers so new calls go to default voicemail
    // instead of the AI. The DB's AiPhoneNumber.assistantId is preserved
    // so we know what to restore when the month resets (see resumeIfPaused).
    try {
      await db.aiBillingCounter.update({
        where: { id: rowId },
        data: { pausedAtLimit: true },
      });
    } catch (err) {
      console.error('[billing] Failed to set pausedAtLimit:', err);
    }
    enforceBillingPause(tenantId).catch(err =>
      console.error('[billing] enforceBillingPause failed:', err),
    );
  } else if (existing?.pausedAtLimit && callsUsed < callsLimit) {
    // Month reset or limit was bumped — clear the pause flag and resume.
    try {
      await db.aiBillingCounter.update({
        where: { id: rowId },
        data: { pausedAtLimit: false },
      });
    } catch (err) {
      console.error('[billing] Failed to clear pausedAtLimit:', err);
    }
    resumeBillingPause(tenantId).catch(err =>
      console.error('[billing] resumeBillingPause failed:', err),
    );
  }
}

/**
 * Enforce billing pause: remove the assistantId mapping from all the
 * tenant's Vapi phone numbers so new inbound calls go to default voicemail
 * instead of the AI assistant. The DB's AiPhoneNumber.assistantId field
 * is preserved so we know what to restore on resume.
 *
 * Fire-and-forget — caller wraps in .catch(). A Vapi API failure here
 * logs an error but does not break the webhook response. The
 * pausedAtLimit flag is already set in the DB, so the dashboard shows
 * the pause state regardless.
 */
async function enforceBillingPause(tenantId: string): Promise<void> {
  const vapiKey = await getTenantVapiKeyByTenantId(tenantId);
  if (!vapiKey) {
    console.warn('[billing] Cannot pause — no Vapi key configured for tenant', tenantId);
    return;
  }

  const numbers = await db.aiPhoneNumber.findMany({
    where: { tenantId, vapiNumberId: { not: null } },
    select: { id: true, vapiNumberId: true, assistantId: true },
  });

  for (const num of numbers) {
    if (!num.vapiNumberId) continue;
    try {
      // Remove the assistantId mapping on Vapi so calls go to voicemail.
      // We pass the tenant's Vapi key explicitly (no auth context in webhook).
      await updatePhoneNumber(num.vapiNumberId, { assistantId: undefined } as any, vapiKey);
    } catch (err) {
      console.error(
        `[billing] Failed to pause phone number ${num.vapiNumberId}:`,
        err,
      );
    }
  }
  console.log(
    `[billing] Paused ${numbers.length} Vapi phone number(s) for tenant ${tenantId} (limit reached)`,
  );
}

/**
 * Resume billing pause: re-assign the assistantId mapping on all the
 * tenant's Vapi phone numbers from the DB's AiPhoneNumber.assistantId
 * field (which was preserved during the pause).
 *
 * Called when the billing counter resets (month rollover) or when the
 * limit is bumped up and callsUsed < callsLimit.
 */
async function resumeBillingPause(tenantId: string): Promise<void> {
  const vapiKey = await getTenantVapiKeyByTenantId(tenantId);
  if (!vapiKey) return;

  const numbers = await db.aiPhoneNumber.findMany({
    where: { tenantId, vapiNumberId: { not: null }, assistantId: { not: null } },
    select: { id: true, vapiNumberId: true, assistantId: true },
  });

  // Resolve the Vapi assistantId for each number's local agent
  for (const num of numbers) {
    if (!num.vapiNumberId || !num.assistantId) continue;
    try {
      const agent = await db.aiAgent.findUnique({
        where: { id: num.assistantId },
        select: { vapiAssistantId: true },
      });
      if (agent?.vapiAssistantId) {
        await updatePhoneNumber(
          num.vapiNumberId,
          { assistantId: agent.vapiAssistantId } as any,
          vapiKey,
        );
      }
    } catch (err) {
      console.error(
        `[billing] Failed to resume phone number ${num.vapiNumberId}:`,
        err,
      );
    }
  }
  console.log(
    `[billing] Resumed ${numbers.length} Vapi phone number(s) for tenant ${tenantId} (limit reset)`,
  );
}

/**
 * Check if a tenant is currently paused at their monthly AI call limit.
 *
 * Returns true when ALL of the following are true:
 *   - The tenant has an AiBillingCounter row.
 *   - The row's monthStart is the current month (i.e. the counter hasn't been
 *     reset by a month rollover — the reset happens lazily inside
 *     incrementBillingCounter, so a stale counter from last month is NOT a
 *     pause signal).
 *   - pausedAtLimit === true AND callsUsed >= callsLimit.
 *
 * Used by handleStatusUpdate to log a billing-pause warning. The actual
 * assistant deactivation (removing the assistantId mapping from Vapi phone
 * numbers so new calls go to voicemail) is performed automatically by
 * enforceBillingPause() when the limit is first hit — see
 * incrementBillingCounter. The dashboard billing card surfaces the
 * pausedAtLimit flag so the operator knows the AI is paused.
 */
async function isTenantPaused(tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const counter = await db.aiBillingCounter.findFirst({ where: { tenantId } });
    if (!counter) return false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (counter.monthStart.getTime() < monthStart.getTime()) return false; // new month, not paused
    return counter.pausedAtLimit && counter.callsUsed >= counter.callsLimit;
  } catch {
    return false;
  }
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

  // ── Phase R7: Billing pause check ──────────────────────────────────
  // If the tenant is paused-at-limit, log a warning so the operator (via
  // dev.log / monitoring) is aware that calls arriving here should have
  // gone to voicemail. The call is still recorded (the AiCall row is
  // created below) so the operator has full audit history. The actual
  // Vapi phone number deactivation is performed automatically by
  // enforceBillingPause() when the limit is first hit — but a race is
  // possible (call in-flight when the limit was hit), so this log line
  // catches those edge cases.
  try {
    const paused = await isTenantPaused(tenantId);
    if (paused) {
      console.warn(
        `[billing] Tenant ${tenantId} is paused at limit — AI should not be answering (call ${call.id})`,
      );
    }
  } catch (err) {
    console.error('[billing] isTenantPaused check failed:', err);
  }

  // ── Step 4: Resolve callerIdentifiedAs at the start of the call ──
  // Quick Customer/Lead lookup by phone so the UI can immediately surface
  // "existing customer" vs. "new lead" context.
  const customerPhone = call.customer?.number || call.customerPhone || null;
  const callerIdentifiedAs = customerPhone ? await resolveCallerIdentity(customerPhone) : null;

  // ── Phase R8 Step 1 & 3: Trusted-access allowlist + caller-disabled checks ──
  // Resolve the agent (with the trusted-phones allowlist) so we can flag
  // untrusted callers. Also look up whether this caller has been disabled
  // via a previous AiCall.aiDisabled=true.
  const agentForGuard = call.assistantId
    ? await db.aiAgent.findFirst({
        where: { vapiAssistantId: call.assistantId },
        select: { id: true, trustedPhonesJson: true },
      })
    : null;

  const isTrusted = isCallerTrusted(agentForGuard?.trustedPhonesJson, customerPhone);
  const disabledByCallId = await findCallerDisabled(customerPhone);

  if (!isTrusted) {
    console.log(
      `[webhook] Untrusted caller ${customerPhone} — AI will answer but call is flagged`,
    );
  }
  if (disabledByCallId) {
    console.log(
      `[webhook] Caller ${customerPhone} is disabled (by AiCall ${disabledByCallId}) — AI will answer but call is flagged`,
    );
  }

  // Pre-compute the tagsJson to persist on create OR update — only when at
  // least one guard fired.
  const guardTagsJson = (!isTrusted || disabledByCallId)
    ? (() => {
        let tags: Array<{ label: string; color: string; at: string }> = [];
        if (!isTrusted) tags.push({ label: 'untrusted', color: 'red', at: new Date().toISOString() });
        if (disabledByCallId) tags.push({ label: 'caller-disabled', color: 'red', at: new Date().toISOString() });
        return JSON.stringify(tags);
      })()
    : null;

  const existing = await db.aiCall.findFirst({
    where: { vapiCallId: call.id },
  });

  const status = mapCallStatus(call.status);
  const data: Record<string, unknown> = {
    status,
    ...(callerIdentifiedAs && { callerIdentifiedAs }),
    ...(call.customer?.number && { customerPhone: call.customer.number }),
    ...(call.startedAt && { startedAt: new Date(call.startedAt) }),
    ...(call.endedAt && { endedAt: new Date(call.endedAt) }),
    ...(guardTagsJson && { tagsJson: guardTagsJson }),
  };

  let aiCallId: string | null = null;
  let assistantIdLocal: string | null = null;
  if (existing) {
    // For update path, merge any new guard tags with existing tagsJson
    let finalTagsJson = existing.tagsJson;
    if (!isTrusted) {
      finalTagsJson = appendTag(existing.tagsJson, 'untrusted', 'red');
    }
    if (disabledByCallId) {
      finalTagsJson = appendTag(finalTagsJson, 'caller-disabled', 'red');
    }
    await db.aiCall.update({
      where: { id: existing.id },
      data: { ...data, ...(finalTagsJson !== existing.tagsJson && { tagsJson: finalTagsJson }) },
    });
    aiCallId = existing.id;
    assistantIdLocal = existing.assistantId || null;
  } else {
    // Resolve agent + number for the new call
    const agent = agentForGuard
      ?? (call.assistantId
        ? await db.aiAgent.findFirst({ where: { vapiAssistantId: call.assistantId }, select: { id: true } })
        : null);
    const number = call.phoneNumberId
      ? await db.aiPhoneNumber.findFirst({ where: { vapiNumberId: call.phoneNumberId }, select: { id: true } })
      : null;

    const created = await db.aiCall.create({
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
        ...(callerIdentifiedAs ? { callerIdentifiedAs } : {}),
        ...(guardTagsJson ? { tagsJson: guardTagsJson } : {}),
        startedAt: call.startedAt ? new Date(call.startedAt) : null,
      } as any,
    });
    aiCallId = created.id;
    assistantIdLocal = agent?.id || null;
  }

  // ── Step 5: Emit ai_call.started on call begin (in_progress / ringing) ──
  if (aiCallId && (status === 'in_progress' || status === 'ringing')) {
    EventBus.emit(
      'ai_call.started',
      {
        call: {
          id: aiCallId,
          customerPhone,
          assistantId: assistantIdLocal,
          tenantId,
        },
        resourceType: 'ai_call',
        resourceId: aiCallId,
      },
      { tenantId: tenantId || undefined },
    ).catch(err => console.error('[EventBus] ai_call.started emit failed:', err));
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

  const durationSec = call.durationSeconds || call.duration || 0;
  const costUsd = call.cost || 0;
  const endedReason = call.endedReason || call.endReason || null;
  // ── Step 1: Capture recordingUrl + stereoRecordingUrl from Vapi payload ──
  const recordingUrl = call.recordingUrl || null;
  const stereoRecordingUrl = call.stereoRecordingUrl || null;

  const existing = await db.aiCall.findFirst({
    where: { vapiCallId: call.id },
  });

  // ── Step 2: Compute outcomeType from the function-call history ──
  const outcomeType = computeOutcomeType(
    existing?.functionCallsJson,
    endedReason,
    durationSec,
  );

  // ── Step 3: Compute timeSavedSec (AI ~1.5x faster than a human) ──
  const timeSavedSec = Math.round(durationSec * 1.5);

  // Hoisted so the SMS send-back block (after the if/else) can read the
  // assistantId regardless of which branch ran.
  let resolvedAssistantIdForSms: string | null = null;

  if (existing) {
    await db.aiCall.update({
      where: { id: existing.id },
      data: {
        status: 'ended',
        endedAt: call.endedAt ? new Date(call.endedAt) : new Date(),
        endedReason,
        durationSec,
        costUsd,
        transcriptJson: JSON.stringify(transcript),
        summary,
        analysisJson: JSON.stringify(analysis),
        recordingUrl,
        stereoRecordingUrl,
        outcomeType,
        timeSavedSec,
      },
    });

    // Update agent stats
    if (existing.assistantId) {
      await db.aiAgent.update({
        where: { id: existing.assistantId },
        data: {
          totalCalls: { increment: 1 },
          totalSeconds: { increment: durationSec },
          lastCallAt: new Date(),
        },
      });
    }

    // Track for SMS send-back below
    resolvedAssistantIdForSms = existing.assistantId || null;

    // ── Step 5: Emit ai_call.ended ──
    EventBus.emit(
      'ai_call.ended',
      {
        call: {
          id: existing.id,
          durationSec,
          outcomeType,
          costUsd,
          tenantId,
        },
        resourceType: 'ai_call',
        resourceId: existing.id,
      },
      { tenantId: tenantId || undefined },
    ).catch(err => console.error('[EventBus] ai_call.ended emit failed:', err));
  } else {
    // Create the call record if we missed the status-update
    const agent = call.assistantId
      ? await db.aiAgent.findFirst({ where: { vapiAssistantId: call.assistantId }, select: { id: true } })
      : null;
    const number = call.phoneNumberId
      ? await db.aiPhoneNumber.findFirst({ where: { vapiNumberId: call.phoneNumberId }, select: { id: true } })
      : null;

    const created = await db.aiCall.create({
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
        durationSec,
        costUsd,
        transcriptJson: JSON.stringify(transcript),
        summary,
        analysisJson: JSON.stringify(analysis),
        endedReason,
        recordingUrl,
        stereoRecordingUrl,
        outcomeType,
        timeSavedSec,
      } as any,
    });

    if (agent) {
      await db.aiAgent.update({
        where: { id: agent.id },
        data: {
          totalCalls: { increment: 1 },
          totalSeconds: { increment: durationSec },
          lastCallAt: new Date(),
        },
      });
    }

    // Track for SMS send-back below
    resolvedAssistantIdForSms = agent?.id || null;

    // ── Step 5: Emit ai_call.ended for the freshly-created record too ──
    EventBus.emit(
      'ai_call.ended',
      {
        call: {
          id: created.id,
          durationSec,
          outcomeType,
          costUsd,
          tenantId,
        },
        resourceType: 'ai_call',
        resourceId: created.id,
      },
      { tenantId: tenantId || undefined },
    ).catch(err => console.error('[EventBus] ai_call.ended emit failed:', err));
  }

  // ── Phase R8 Step 2: SMS send-back for missed calls ──
  // If the call was "missed" (caller hung up before the AI could respond,
  // or the call was very short) AND the agent has smsSendBackEnabled, send
  // an SMS to the caller with the configured template. Non-blocking — a
  // failure here must not break the webhook response.
  //
  // We resolve the assistantId + customerPhone for BOTH the update and the
  // create branches: update branch uses `existing.*`, create branch uses
  // the freshly-resolved `agent?.id` and `call.customer?.number`.
  if (outcomeType === 'missed') {
    const callerPhone = existing?.customerPhone || call.customer?.number || null;
    const assistantIdForSms = resolvedAssistantIdForSms;
    if (callerPhone && assistantIdForSms) {
      try {
        const agentForSms = await db.aiAgent.findFirst({
          where: { id: assistantIdForSms },
          select: { smsSendBackEnabled: true, smsSendBackTemplate: true },
        });
        if (agentForSms?.smsSendBackEnabled) {
          const message =
            agentForSms.smsSendBackTemplate?.trim() ||
            'Hi, sorry we missed your call. How can we help you today?';
          // Fire-and-forget SMS send. sendSmsMessage handles provider
          // resolution (tenant → platform → env → simulated) internally.
          sendSmsMessage({
            to: callerPhone,
            message,
            tenantId,
          })
            .then((r) => {
              if (r.success) {
                console.log(
                  `[webhook] SMS send-back sent to ${callerPhone} (provider=${r.provider || 'simulated'}, messageId=${r.messageId || '-'})`,
                );
              } else {
                console.error(
                  `[webhook] SMS send-back to ${callerPhone} failed:`,
                  r.error || 'unknown error',
                );
              }
            })
            .catch((err) =>
              console.error('[webhook] SMS send-back threw:', err),
            );
        }
      } catch (err) {
        console.error('[webhook] SMS send-back setup failed:', err);
      }
    }

    // ── Auto-create a Lead from missed AI calls ──────────────────────
    // When a caller hangs up before the AI can qualify them (outcomeType
    // === 'missed'), we still have their phone number. Create a Lead so
    // the tenant sees every missed caller in their CRM and can follow up
    // manually. Only creates a Lead if one doesn't already exist for this
    // phone number (avoids duplicates). Non-blocking.
    const missedCallerPhone = existing?.customerPhone || call.customer?.number || null;
    if (missedCallerPhone && tenantId) {
      createLeadFromMissedCall(missedCallerPhone, tenantId, resolvedAssistantIdForSms)
        .catch(err => console.error('[webhook] Failed to create Lead from missed call:', err));
    }
  }

  // ── Step 7: Increment tenant's monthly AiBillingCounter (prep for Phase R7) ──
  // Non-blocking — a failure here must not break the webhook response.
  incrementBillingCounter(tenantId).catch(err =>
    console.error('[webhook] Failed to increment AiBillingCounter:', err),
  );

  return NextResponse.json({ received: true });
}

/**
 * Auto-create a Lead from a missed AI call.
 *
 * Only creates a Lead if one doesn't already exist for this phone number
 * on this tenant (avoids duplicates). The Lead is created with:
 *   - source: 'ai_receptionist_missed'
 *   - status: 'new'
 *   - priority: 'medium'
 *   - name: 'Missed Call — <phone>' (tenant can update later)
 *   - description: auto-generated note explaining the origin
 *
 * Also links the Lead to the AiCall record if both exist.
 */
async function createLeadFromMissedCall(
  callerPhone: string,
  tenantId: string,
  agentId: string | null,
): Promise<void> {
  // Check if a Lead already exists for this phone on this tenant
  const existingLead = await db.lead.findFirst({
    where: { phone: callerPhone, tenantId },
    select: { id: true },
  });
  if (existingLead) return; // already have this caller as a lead

  // Derive a display name from the phone number (best-effort)
  const displayName = `Missed Call — ${callerPhone}`;

  await db.lead.create({
    data: {
      name: displayName,
      phone: callerPhone,
      source: 'ai_receptionist_missed',
      status: 'new',
      priority: 'medium',
      description: `Missed AI receptionist call. Caller hung up before the AI could qualify them. Follow up to see what they needed.`,
      tenantId,
      tagsJson: JSON.stringify([
        { label: 'missed-call', color: 'amber' },
        { label: 'ai-receptionist', color: 'blue' },
      ]),
    },
  });
  console.log(
    `[webhook] Auto-created Lead from missed AI call (phone=${callerPhone}, tenant=${tenantId})`,
  );
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
