/**
 * Auto-Reply orchestrator (server-side only).
 *
 * Fires an automatic reply when:
 *   1. The tenant is allowed to use the feature (paid plan OR FeatureFlag override)
 *   2. Auto-reply is enabled in `Tenant.settingsJson.autoReplyOffline.enabled`
 *   3. The tenant is currently OFFLINE (per `isTenantOnline`)
 *   4. No bot reply was sent in this conversation within the cooldown window
 *
 * Reply modes:
 *   - "scripted": a single templated message with variable substitution
 *     ({businessName}, {emergencyPhone}, {businessHours})
 *   - "ai": an LLM-generated reply using the tenant's configured system prompt
 *     (falls back to scripted if AI is unconfigured or fails)
 *
 * The orchestrator NEVER throws — all errors are caught and returned in the
 * `AutoReplyResult`. This is critical because the orchestrator is wired into
 * inbound webhook handlers (SMS/WhatsApp/omnichannel/public chat) where an
 * unhandled exception would break the inbound flow.
 *
 * IMPORTANT: This module uses `@/lib/db`, `@/lib/presence`, `@/lib/ai-client`,
 * `@/lib/sms-send`, `@/lib/whatsapp-send` — NEVER import it from a client
 * component. Intended for use in Next.js route handlers only.
 */

import { db } from '@/lib/db';
import { isTenantOnline } from '@/lib/presence';
import { callAI, isAiConfiguredAsync } from '@/lib/ai-client';
import { sendSmsMessage } from '@/lib/sms-send';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';

const AUTO_REPLY_FEATURE_KEY = 'auto_reply_offline';

const DEFAULT_CONFIG: AutoReplyConfig = {
  enabled: false,
  mode: 'scripted',
  scriptedMessage:
    'Hi! Thanks for reaching out to {businessName}. Our team is offline right now. We\'ll reply as soon as we\'re back. For emergencies, call {emergencyPhone}.',
  aiSystemPrompt: '',
  respectBusinessHours: true,
  offlineThresholdMinutes: 2,
  cooldownMinutes: 15,
};

const DEFAULT_AI_SYSTEM_PROMPT =
  'You are an automated assistant for a service business. The business team is currently offline. ' +
  'Reply briefly (under 200 words) and helpfully to the visitor\'s message. Let them know someone ' +
  'will follow up when the team is back online. If the visitor has an emergency, suggest they call ' +
  'the business directly. Stay friendly and on-brand. Never make commitments about pricing or timing.';

export interface AutoReplyConfig {
  enabled: boolean;
  mode: 'scripted' | 'ai';
  scriptedMessage: string;
  aiSystemPrompt: string;
  respectBusinessHours: boolean;
  offlineThresholdMinutes: number;
  cooldownMinutes: number;
}

export interface AutoReplyContext {
  tenantId: string;
  conversationId: string;
  visitorMessage: string;
  channel: 'sms' | 'whatsapp' | 'website' | 'email' | string;
  visitorName?: string;
  visitorPhone?: string;
  customerHistory?: string;
}

export interface AutoReplyResult {
  replied: boolean;
  reason?:
    | 'tenant_online'
    | 'disabled'
    | 'trial_locked'
    | 'cooldown_active'
    | 'no_config'
    | 'send_failed'
    | 'ai_unconfigured';
  message?: string;
  messageId?: string;
}

/**
 * Read the auto-reply config from `Tenant.settingsJson.autoReplyOffline`.
 *
 * Returns `null` when:
 *   - The tenant doesn't exist
 *   - `settingsJson` is unparseable
 *   - The `autoReplyOffline` key is missing (treated as "feature is off")
 *
 * Otherwise returns a fully-validated `AutoReplyConfig` with defaults merged
 * in for any missing/invalid fields.
 */
export async function getAutoReplyConfig(
  tenantId: string,
): Promise<AutoReplyConfig | null> {
  if (!tenantId) return null;
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) return null;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(tenant.settingsJson || '{}');
      if (!parsed || typeof parsed !== 'object') return null;
    } catch {
      return null;
    }

    const raw = (parsed as { autoReplyOffline?: unknown }).autoReplyOffline;
    if (!raw || typeof raw !== 'object') return null;

    const cfg = raw as Record<string, unknown>;
    return {
      enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : DEFAULT_CONFIG.enabled,
      mode: cfg.mode === 'ai' ? 'ai' : 'scripted',
      scriptedMessage:
        typeof cfg.scriptedMessage === 'string' && cfg.scriptedMessage.trim().length > 0
          ? cfg.scriptedMessage
          : DEFAULT_CONFIG.scriptedMessage,
      aiSystemPrompt:
        typeof cfg.aiSystemPrompt === 'string' ? cfg.aiSystemPrompt : DEFAULT_CONFIG.aiSystemPrompt,
      respectBusinessHours:
        typeof cfg.respectBusinessHours === 'boolean'
          ? cfg.respectBusinessHours
          : DEFAULT_CONFIG.respectBusinessHours,
      offlineThresholdMinutes:
        typeof cfg.offlineThresholdMinutes === 'number' &&
        Number.isFinite(cfg.offlineThresholdMinutes) &&
        cfg.offlineThresholdMinutes > 0
          ? cfg.offlineThresholdMinutes
          : DEFAULT_CONFIG.offlineThresholdMinutes,
      cooldownMinutes:
        typeof cfg.cooldownMinutes === 'number' &&
        Number.isFinite(cfg.cooldownMinutes) &&
        cfg.cooldownMinutes > 0
          ? cfg.cooldownMinutes
          : DEFAULT_CONFIG.cooldownMinutes,
    };
  } catch (err) {
    console.warn(
      '[auto-reply] getAutoReplyConfig error:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Check if the tenant is allowed to use the auto-reply feature.
 *
 * Allowed when:
 *   - `Tenant.planStatus !== 'trial'` (paid/cancelled/etc.), OR
 *   - A `FeatureFlag` row exists for `(tenantId, 'auto_reply_offline')` with `enabled: true`
 *
 * Blocked (returns `allowed: false, reason: 'trial_locked'`) when:
 *   - Tenant is on trial AND no FeatureFlag override exists
 *
 * Errors (DB failures, missing tenant) return `{ allowed: false, reason: '...' }`
 * — fail-closed so trial users can't bypass the gate on a DB hiccup.
 */
export async function canUseAutoReply(
  tenantId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenantId) return { allowed: false, reason: 'no_tenant' };
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { planStatus: true },
    });
    if (!tenant) return { allowed: false, reason: 'tenant_not_found' };
    if (tenant.planStatus !== 'trial') return { allowed: true };

    // Trial user — check FeatureFlag override.
    const flag = await db.featureFlag.findUnique({
      where: {
        tenantId_featureKey: { tenantId, featureKey: AUTO_REPLY_FEATURE_KEY },
      },
      select: { enabled: true },
    });
    if (flag?.enabled === true) return { allowed: true };
    return { allowed: false, reason: 'trial_locked' };
  } catch (err) {
    console.warn(
      '[auto-reply] canUseAutoReply error:',
      err instanceof Error ? err.message : err,
    );
    return { allowed: false, reason: 'error' };
  }
}

/**
 * Main orchestrator. NEVER throws — all errors are caught and returned in
 * the `AutoReplyResult`.
 *
 * Pipeline:
 *   1. Subscription gate (`canUseAutoReply`)
 *   2. Config check (`getAutoReplyConfig` + `enabled`)
 *   3. Presence check (`isTenantOnline`) — only fires when tenant is OFFLINE
 *   4. Cooldown check (no bot reply in the last `cooldownMinutes`)
 *   5. Generate reply (scripted with substitution, OR AI with fallback)
 *   6. Save the reply as an `InboxMessage` (senderType='bot', direction='outbound')
 *   7. Send via provider (SMS/WhatsApp best-effort; website = no provider send)
 *   8. Update `Conversation.lastMessageAt/lastMessageBody/lastDirection`
 *   9. Return `{ replied: true, message, messageId }` (or `{ replied: false, reason }`)
 *
 * On any unexpected error, returns `{ replied: false, reason: 'send_failed' }`
 * rather than throwing.
 */
export async function maybeAutoReply(ctx: AutoReplyContext): Promise<AutoReplyResult> {
  try {
    if (!ctx.tenantId || !ctx.conversationId) {
      return { replied: false, reason: 'no_config' };
    }

    // ── 1. Subscription gate ───────────────────────────────────────────────
    const allowed = await canUseAutoReply(ctx.tenantId);
    if (!allowed.allowed) {
      return { replied: false, reason: 'trial_locked' };
    }

    // ── 2. Config check ────────────────────────────────────────────────────
    const config = await getAutoReplyConfig(ctx.tenantId);
    if (!config || !config.enabled) {
      return { replied: false, reason: 'disabled' };
    }

    // ── 3. Presence check ──────────────────────────────────────────────────
    const online = await isTenantOnline(ctx.tenantId, {
      respectBusinessHours: config.respectBusinessHours,
    });
    if (online) {
      return { replied: false, reason: 'tenant_online' };
    }

    // ── 4. Cooldown check ──────────────────────────────────────────────────
    try {
      const cutoff = new Date(Date.now() - config.cooldownMinutes * 60_000);
      const recentBot = await db.inboxMessage.findFirst({
        where: {
          conversationId: ctx.conversationId,
          senderType: 'bot',
          createdAt: { gt: cutoff },
        },
        select: { id: true },
      });
      if (recentBot) {
        return { replied: false, reason: 'cooldown_active' };
      }
    } catch (err) {
      // Cooldown check failure should NOT block the reply — log + continue.
      console.warn(
        '[auto-reply] cooldown check error (continuing):',
        err instanceof Error ? err.message : err,
      );
    }

    // ── 5. Generate reply ──────────────────────────────────────────────────
    let replyText: string;
    let effectiveMode: 'scripted' | 'ai' = config.mode;

    if (config.mode === 'ai') {
      const aiConfigured = await isAiConfiguredAsync();
      if (!aiConfigured) {
        // AI not configured → fall back to scripted message.
        replyText = await generateScriptedReply(ctx.tenantId, config.scriptedMessage);
        effectiveMode = 'scripted';
      } else {
        try {
          const systemPrompt = config.aiSystemPrompt?.trim()
            ? config.aiSystemPrompt
            : DEFAULT_AI_SYSTEM_PROMPT;

          const userContent =
            ctx.customerHistory && ctx.customerHistory.trim().length > 0
              ? `Visitor history:\n${ctx.customerHistory.slice(0, 1500)}\n\nNew message:\n${ctx.visitorMessage}`
              : ctx.visitorMessage;

          const result = await callAI({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature: 0.7,
            maxTokens: 400,
          });
          const aiText = (result?.content || '').trim();
          if (!aiText) {
            replyText = await generateScriptedReply(ctx.tenantId, config.scriptedMessage);
            effectiveMode = 'scripted';
          } else {
            replyText = aiText;
          }
        } catch (err) {
          console.warn(
            '[auto-reply] AI call failed, falling back to scripted:',
            err instanceof Error ? err.message : err,
          );
          replyText = await generateScriptedReply(ctx.tenantId, config.scriptedMessage);
          effectiveMode = 'scripted';
        }
      }
    } else {
      replyText = await generateScriptedReply(ctx.tenantId, config.scriptedMessage);
    }

    if (!replyText || !replyText.trim()) {
      return { replied: false, reason: 'no_config' };
    }

    // ── 6. Save the reply as an InboxMessage ───────────────────────────────
    let savedMessageId: string | undefined;
    try {
      const saved = await db.inboxMessage.create({
        data: {
          conversationId: ctx.conversationId,
          senderType: 'bot',
          senderName: 'Auto Reply',
          content: replyText,
          messageType: 'text',
          direction: 'outbound',
          status: 'sent',
          metadataJson: JSON.stringify({
            autoReply: true,
            mode: effectiveMode,
            visitorMessage: ctx.visitorMessage.slice(0, 200),
            channel: ctx.channel,
          }),
          tenantId: ctx.tenantId,
        },
      });
      savedMessageId = saved.id;
    } catch (err) {
      console.warn(
        '[auto-reply] failed to save InboxMessage:',
        err instanceof Error ? err.message : err,
      );
      return { replied: false, reason: 'send_failed' };
    }

    // ── 7. Send via provider (best-effort) ─────────────────────────────────
    let sendFailed = false;
    const channel = ctx.channel;

    if (channel === 'sms' && ctx.visitorPhone) {
      try {
        const result = await sendSmsMessage({
          to: ctx.visitorPhone,
          message: replyText,
          tenantId: ctx.tenantId,
        });
        if (!result.success) {
          sendFailed = true;
          console.warn('[auto-reply] SMS send failed:', result.error);
        }
      } catch (err) {
        sendFailed = true;
        console.warn(
          '[auto-reply] SMS send threw:',
          err instanceof Error ? err.message : err,
        );
      }
    } else if (channel === 'whatsapp' && ctx.visitorPhone) {
      try {
        const result = await sendWhatsAppMessage({
          to: ctx.visitorPhone,
          message: replyText,
          tenantId: ctx.tenantId,
        });
        if (!result.success) {
          sendFailed = true;
          console.warn('[auto-reply] WhatsApp send failed:', result.error);
        }
      } catch (err) {
        sendFailed = true;
        console.warn(
          '[auto-reply] WhatsApp send threw:',
          err instanceof Error ? err.message : err,
        );
      }
    } else if (channel === 'website') {
      // No provider send — the caller (public chat widget route) saves a
      // PublicChatMessage row and returns the reply in the API response so
      // the widget renders it immediately. The InboxMessage saved above is
      // the canonical record for the inbox view.
    } else if (channel === 'email') {
      // Email auto-reply is complex (SMTP/Mailgun/SendGrid wiring, threading,
      // headers). For now, the InboxMessage record is enough — the tenant
      // sees the would-be reply in their inbox. Future: wire a sendEmail()
      // helper here.
    }

    // ── 8. Update conversation ─────────────────────────────────────────────
    try {
      await db.conversation.updateMany({
        where: { conversationId: ctx.conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: replyText.slice(0, 200),
          lastDirection: 'outbound',
        },
      });
    } catch (err) {
      // Non-fatal — the InboxMessage is already saved.
      console.warn(
        '[auto-reply] conversation update failed (non-fatal):',
        err instanceof Error ? err.message : err,
      );
    }

    // ── 9. Return result ───────────────────────────────────────────────────
    return {
      replied: true,
      message: replyText,
      messageId: savedMessageId,
      ...(sendFailed ? { reason: 'send_failed' } : {}),
    };
  } catch (err) {
    // Catch-all: NEVER throw out of maybeAutoReply.
    console.warn(
      '[auto-reply] maybeAutoReply unexpected error:',
      err instanceof Error ? err.message : err,
    );
    return { replied: false, reason: 'send_failed' };
  }
}

/**
 * Generate a scripted reply with variable substitution.
 *
 * Supported variables:
 *   - `{businessName}`    → tenant's name
 *   - `{emergencyPhone}`  → tenant's primary `phone`, OR `settingsJson.transferNumber`
 *   - `{businessHours}`   → formatted "Mon: 09:00-17:00, Tue: ..." from
 *                            `Tenant.businessHoursJson`
 *
 * Returns the original template (un-substituted) on any error — better to
 * send the raw template than nothing.
 */
async function generateScriptedReply(
  tenantId: string,
  template: string,
): Promise<string> {
  if (!template) return '';
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        phone: true,
        businessHoursJson: true,
        settingsJson: true,
      },
    });
    if (!tenant) return template;

    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
    } catch {
      settings = {};
    }
    const transferNumber =
      typeof (settings as { transferNumber?: unknown }).transferNumber === 'string'
        ? ((settings as { transferNumber?: string }).transferNumber as string)
        : '';

    const businessName = tenant.name || '';
    const emergencyPhone = tenant.phone || transferNumber || '';
    const businessHours = formatBusinessHours(tenant.businessHoursJson);

    return template
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{emergencyPhone\}/g, emergencyPhone)
      .replace(/\{businessHours\}/g, businessHours);
  } catch (err) {
    console.warn(
      '[auto-reply] generateScriptedReply error:',
      err instanceof Error ? err.message : err,
    );
    return template;
  }
}

/**
 * Format `Tenant.businessHoursJson` (shape `{ mon: {open, close, enabled?}, ... }`)
 * as a human-readable string: "Mon: 09:00-17:00, Tue: 09:00-17:00, ...".
 *
 * Returns an empty string on parse failure or when no days are configured.
 */
function formatBusinessHours(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return '';
    const days: Array<{ key: string; label: string }> = [
      { key: 'mon', label: 'Mon' },
      { key: 'tue', label: 'Tue' },
      { key: 'wed', label: 'Wed' },
      { key: 'thu', label: 'Thu' },
      { key: 'fri', label: 'Fri' },
      { key: 'sat', label: 'Sat' },
      { key: 'sun', label: 'Sun' },
    ];
    const parts: string[] = [];
    for (const d of days) {
      const cfg = (parsed as Record<string, { open?: string; close?: string; enabled?: boolean }>)[d.key];
      if (!cfg) continue;
      if (cfg.enabled === false) continue;
      if (!cfg.open || !cfg.close) continue;
      parts.push(`${d.label}: ${cfg.open}-${cfg.close}`);
    }
    return parts.join(', ');
  } catch {
    return '';
  }
}

/**
 * Generate a TEST auto-reply WITHOUT saving or sending — used by the
 * `/api/auto-reply/test` "Test" button so the tenant can preview what
 * the auto-reply would look like.
 *
 * Skips subscription / presence / cooldown checks (the route already gates
 * on `requireNotTrial` before calling this). Just generates the reply text.
 *
 * Returns `{ reply, mode }` where `mode` is the actual mode used (may be
 * 'scripted' even if `config.mode === 'ai'` when AI is unconfigured/fails).
 */
export async function generateTestReply(
  tenantId: string,
  visitorMessage: string,
): Promise<{ reply: string; mode: 'scripted' | 'ai' }> {
  const config = await getAutoReplyConfig(tenantId);

  // If no config (tenant hasn't enabled yet), preview the default scripted message.
  const effectiveConfig: AutoReplyConfig = config ?? DEFAULT_CONFIG;
  const scriptedMessage = effectiveConfig.scriptedMessage || DEFAULT_CONFIG.scriptedMessage;

  if (effectiveConfig.mode === 'ai') {
    const aiConfigured = await isAiConfiguredAsync();
    if (!aiConfigured) {
      return {
        reply: await generateScriptedReply(tenantId, scriptedMessage),
        mode: 'scripted',
      };
    }
    try {
      const systemPrompt = effectiveConfig.aiSystemPrompt?.trim()
        ? effectiveConfig.aiSystemPrompt
        : DEFAULT_AI_SYSTEM_PROMPT;
      const result = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: visitorMessage || 'Hello, I need help' },
        ],
        temperature: 0.7,
        maxTokens: 400,
      });
      const reply = (result?.content || '').trim();
      if (!reply) {
        return {
          reply: await generateScriptedReply(tenantId, scriptedMessage),
          mode: 'scripted',
        };
      }
      return { reply, mode: 'ai' };
    } catch (err) {
      console.warn(
        '[auto-reply] generateTestReply AI failed:',
        err instanceof Error ? err.message : err,
      );
      return {
        reply: await generateScriptedReply(tenantId, scriptedMessage),
        mode: 'scripted',
      };
    }
  }

  return {
    reply: await generateScriptedReply(tenantId, scriptedMessage),
    mode: 'scripted',
  };
}
