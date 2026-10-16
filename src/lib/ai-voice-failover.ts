import { db } from '@/lib/db';
import { sendSms } from '@/lib/sms-send';

interface VoiceFailoverParams {
  tenantId: string;
  fromNumber?: string | null;
  toNumber?: string | null;
  callId: string;
  reason: string;
}

// In-memory set to prevent duplicate failover alerts for the same call ID
const failoverDedupeSet = new Set<string>();

/**
 * Checks if a reason string indicates an AI provider outage, rate limit, or failure.
 */
export function isAiProviderFailure(reason?: string | null): boolean {
  if (!reason) return false;
  const lower = reason.toLowerCase();
  return (
    lower.includes('rate') ||
    lower.includes('quota') ||
    lower.includes('limit') ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('llm') ||
    lower.includes('timeout') ||
    lower.includes('pipeline') ||
    lower.includes('unavailable') ||
    lower.includes('exceeded')
  );
}

/**
 * Trigger automated error recovery for an inbound call that failed due to
 * AI provider rate limits or system errors.
 *
 * 1. Sends an instant customer reassurance SMS so the caller is not lost.
 * 2. Sends an emergency SMS alert to the business owner/dispatcher.
 * 3. Records an in-app emergency notification for the tenant.
 */
export async function triggerVoiceFailover(params: VoiceFailoverParams): Promise<{
  customerSmsSent: boolean;
  ownerSmsSent: boolean;
  skipped?: boolean;
}> {
  const { tenantId, fromNumber, toNumber, callId, reason } = params;

  // Deduplicate: only execute failover once per callId
  if (failoverDedupeSet.has(callId)) {
    return { customerSmsSent: false, ownerSmsSent: false, skipped: true };
  }
  failoverDedupeSet.add(callId);
  setTimeout(() => failoverDedupeSet.delete(callId), 10 * 60 * 1000); // 10m TTL

  console.log(
    `[ai-voice-failover] Triggering automated recovery for call ${callId} (tenant: ${tenantId}, reason: ${reason})`,
  );

  let customerSmsSent = false;
  let ownerSmsSent = false;

  try {
    // 1. Fetch tenant and managers
    const [tenant, managers] = await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true },
      }),
      db.user.findMany({
        where: {
          tenantId,
          role: { in: ['owner', 'admin'] },
        },
        select: { id: true, phone: true, name: true },
      }),
    ]);

    const businessName = tenant?.name || 'our service team';
    const cleanFrom = fromNumber?.trim();

    // 2. Customer Reassurance SMS
    if (cleanFrom && cleanFrom.length >= 10 && !cleanFrom.startsWith('+000')) {
      const customerMsg =
        `Hi! Thank you for calling ${businessName}. Our lines are currently experiencing high volume. ` +
        `We have logged your call and a live team member will reach out to you shortly.`;

      try {
        const custRes = await sendSms({
          to: cleanFrom,
          message: customerMsg,
          tenantId,
        });
        customerSmsSent = custRes.success;
      } catch (custErr) {
        console.warn(`[ai-voice-failover] failed to send customer reassurance SMS:`, custErr);
      }
    }

    // 3. Owner & Dispatcher Emergency SMS Alert
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ownerMsg =
      `🚨 [AI VOICE FAILOVER ALERT]\n` +
      `An inbound customer call could not be handled by AI due to provider rate limit/error.\n` +
      `Caller: ${cleanFrom || 'Unknown'}\n` +
      `Time: ${timeStr}\n` +
      `Reason: ${reason}\n` +
      (customerSmsSent ? `✓ Customer was sent an automated reassurance SMS.\n` : '') +
      `Please call the customer back immediately.`;

    const ownerPhones = new Set<string>();
    for (const m of managers) {
      if (m.phone?.trim()) ownerPhones.add(m.phone.trim());
    }
    if (ownerPhones.size === 0 && tenant?.phone) {
      ownerPhones.add(tenant.phone.trim());
    }

    for (const phone of ownerPhones) {
      try {
        const ownerRes = await sendSms({
          to: phone,
          message: ownerMsg,
          tenantId,
        });
        if (ownerRes.success) ownerSmsSent = true;
      } catch (ownerErr) {
        console.warn(`[ai-voice-failover] failed to send manager alert SMS to ${phone}:`, ownerErr);
      }
    }

    // 4. Create in-app system notification
    if (managers.length > 0) {
      try {
        await db.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            tenantId,
            title: `🚨 AI Voice Failover: Inbound Call Missed`,
            message: `Call from ${cleanFrom || 'customer'} failed due to AI rate limits (${reason}). Follow up needed.`,
            type: 'ai_voice_failover',
            read: false,
            metadataJson: JSON.stringify({
              callId,
              fromNumber: cleanFrom,
              toNumber,
              reason,
              timestamp: new Date().toISOString(),
              customerSmsSent,
            }),
          })),
        });
      } catch (notifErr) {
        console.warn(`[ai-voice-failover] failed to create in-app notification:`, notifErr);
      }
    }

    // 5. Update AiCall record if exists
    try {
      await db.aiCall.updateMany({
        where: { vapiCallId: callId },
        data: {
          endedReason: `failover_triggered: ${reason}`,
          summary: `Call failed (${reason}). Customer sent reassurance SMS. Dispatcher alerted.`,
        },
      });
    } catch {
      /* non-fatal */
    }
  } catch (error) {
    console.error(`[ai-voice-failover] error in triggerVoiceFailover:`, error);
  }

  return { customerSmsSent, ownerSmsSent };
}
