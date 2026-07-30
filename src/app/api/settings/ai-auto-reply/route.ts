import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * AI Auto-Reply settings — stored under `Tenant.settingsJson.aiAutoReply`.
 *
 * NO new Prisma models. We read/write a single JSON sub-key on the existing
 * Tenant row. Other settings sub-keys (emailNotifications, vapiApiKey, etc.)
 * are preserved by read-modify-write — we parse the JSON, replace only the
 * `aiAutoReply` key, and persist the merged object.
 *
 * GET  /api/settings/ai-auto-reply  → returns the current AiAutoReplySettings
 *                                     (always returns a fully-shaped object —
 *                                     defaults are merged in for any missing
 *                                     keys so the client never sees partial
 *                                     state on a fresh tenant).
 * PUT  /api/settings/ai-auto-reply  → replaces the `aiAutoReply` sub-key with
 *                                     the request body. Owner/admin only.
 *
 * Auth: `getAuthUser()` from `@/lib/auth` (resolves cookie or Bearer token).
 * Super-admins (tenantId=null) get a 400 — they have no tenant to configure.
 *
 * Used by: src/components/settings/sections/ai-auto-reply-settings.tsx
 * Complements (does NOT replace) src/components/settings/sections/auto-reply-card.tsx
 * — that card stays in the Communication section for the basic enable/scripted
 * config. This route owns the AI-specific layer (provider, tone, voice,
 * knowledge base, etc.).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AiTone = 'professional' | 'friendly' | 'casual' | 'formal';

export interface AiAutoReplySettings {
  offline: {
    enabled: boolean;
    /** 24h "HH:MM" — when quiet hours start. */
    quietHoursStart: string;
    /** 24h "HH:MM" — when quiet hours end. */
    quietHoursEnd: string;
    /** IANA tz, e.g. "America/New_York". */
    timezone: string;
    /** Plain-text fallback used if AI generation fails. */
    fallbackMessage: string;
    /** openrouter | openai | anthropic | gemini — platform-managed keys. */
    provider: string;
  };
  messageGen: {
    systemPrompt: string;
    tone: AiTone;
    maxLength: number;
    includeBusinessHours: boolean;
  };
  callReply: {
    enabled: boolean;
    /** Vapi voice id/name (free-text — Vapi voice list varies by account). */
    voice: string;
    script: string;
    transferToHuman: boolean;
  };
  knowledgeBase: {
    entries: Array<{ question: string; answer: string }>;
  };
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_AI_AUTO_REPLY_SETTINGS: AiAutoReplySettings = {
  offline: {
    enabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'UTC',
    fallbackMessage:
      "Thanks for reaching out! Our team is currently offline. We'll get back to you as soon as we're back. For emergencies, please call us directly.",
    provider: 'openrouter',
  },
  messageGen: {
    systemPrompt:
      'You are a helpful assistant for {business}. Answer customer questions accurately using the provided knowledge base. Keep replies concise and friendly. If you cannot answer, let the customer know a human will follow up shortly. Never make up pricing, availability, or appointments.',
    tone: 'friendly',
    maxLength: 500,
    includeBusinessHours: true,
  },
  callReply: {
    enabled: false,
    voice: '',
    script:
      'Hello, thanks for calling {business}. Our team is currently unavailable. How can I help you today?',
    transferToHuman: true,
  },
  knowledgeBase: {
    entries: [],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_PROVIDERS = ['openrouter', 'openai', 'anthropic', 'gemini'];
const VALID_TONES: AiTone[] = ['professional', 'friendly', 'casual', 'formal'];

/**
 * Validate + normalise an incoming payload. Unknown/missing fields fall back
 * to defaults so the DB never holds a malformed object. We clamp numeric
 * fields and validate enums — this is the only place that decides what
 * actually lands in `settingsJson.aiAutoReply`.
 */
function normalizeSettings(input: unknown): AiAutoReplySettings {
  const src = (input ?? {}) as Record<string, unknown>;
  const offlineRaw = (src.offline ?? {}) as Record<string, unknown>;
  const messageGenRaw = (src.messageGen ?? {}) as Record<string, unknown>;
  const callReplyRaw = (src.callReply ?? {}) as Record<string, unknown>;
  const kbRaw = (src.knowledgeBase ?? {}) as Record<string, unknown>;

  // Quiet hours: accept "HH:MM" or "HH:MM AM/PM"; we don't strictly enforce
  // the 24h format because the UI uses <input type="time"> which already
  // returns "HH:MM". Defensive: strip non-time chars + clamp to 23:59 max.
  const cleanTime = (v: unknown, fallback: string): string => {
    if (typeof v !== 'string') return fallback;
    const m = v.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return fallback;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const provider =
    typeof offlineRaw.provider === 'string' &&
    VALID_PROVIDERS.includes(offlineRaw.provider)
      ? offlineRaw.provider
      : DEFAULT_AI_AUTO_REPLY_SETTINGS.offline.provider;

  const tone: AiTone = VALID_TONES.includes(messageGenRaw.tone as AiTone)
    ? (messageGenRaw.tone as AiTone)
    : DEFAULT_AI_AUTO_REPLY_SETTINGS.messageGen.tone;

  const maxLengthRaw = Number(messageGenRaw.maxLength);
  const maxLength =
    Number.isFinite(maxLengthRaw) && maxLengthRaw > 0
      ? Math.min(4000, Math.floor(maxLengthRaw))
      : DEFAULT_AI_AUTO_REPLY_SETTINGS.messageGen.maxLength;

  const entriesRaw = Array.isArray(kbRaw.entries) ? kbRaw.entries : [];
  const entries = entriesRaw
    .map((e) => {
      if (!e || typeof e !== 'object') return null;
      const obj = e as Record<string, unknown>;
      const question = typeof obj.question === 'string' ? obj.question : '';
      const answer = typeof obj.answer === 'string' ? obj.answer : '';
      if (!question.trim() && !answer.trim()) return null;
      return { question, answer };
    })
    .filter(
      (e): e is { question: string; answer: string } => e !== null,
    )
    .slice(0, 500); // hard cap to avoid unbounded JSON payloads

  return {
    offline: {
      enabled: Boolean(offlineRaw.enabled),
      quietHoursStart: cleanTime(
        offlineRaw.quietHoursStart,
        DEFAULT_AI_AUTO_REPLY_SETTINGS.offline.quietHoursStart,
      ),
      quietHoursEnd: cleanTime(
        offlineRaw.quietHoursEnd,
        DEFAULT_AI_AUTO_REPLY_SETTINGS.offline.quietHoursEnd,
      ),
      timezone:
        typeof offlineRaw.timezone === 'string' && offlineRaw.timezone.trim()
          ? offlineRaw.timezone.trim()
          : DEFAULT_AI_AUTO_REPLY_SETTINGS.offline.timezone,
      fallbackMessage:
        typeof offlineRaw.fallbackMessage === 'string'
          ? offlineRaw.fallbackMessage.slice(0, 2000)
          : DEFAULT_AI_AUTO_REPLY_SETTINGS.offline.fallbackMessage,
      provider,
    },
    messageGen: {
      systemPrompt:
        typeof messageGenRaw.systemPrompt === 'string'
          ? messageGenRaw.systemPrompt.slice(0, 8000)
          : DEFAULT_AI_AUTO_REPLY_SETTINGS.messageGen.systemPrompt,
      tone,
      maxLength,
      includeBusinessHours: Boolean(messageGenRaw.includeBusinessHours),
    },
    callReply: {
      enabled: Boolean(callReplyRaw.enabled),
      voice:
        typeof callReplyRaw.voice === 'string'
          ? callReplyRaw.voice.slice(0, 200)
          : '',
      script:
        typeof callReplyRaw.script === 'string'
          ? callReplyRaw.script.slice(0, 4000)
          : DEFAULT_AI_AUTO_REPLY_SETTINGS.callReply.script,
      transferToHuman: Boolean(callReplyRaw.transferToHuman),
    },
    knowledgeBase: {
      entries,
    },
  };
}

/**
 * Merge persisted JSON (which may be partial / from older schema versions)
 * on top of defaults so the client always receives a complete shape.
 */
function withDefaults(partial: unknown): AiAutoReplySettings {
  const normalized = normalizeSettings(partial);
  // normalizeSettings already fills in defaults for any missing field, so
  // returning it directly gives us a fully-shaped object. The two-step
  // (normalize → return) is kept so future migrations (e.g. moving from
  // `v1` to `v2` of this shape) have an obvious extension point.
  return {
    offline: { ...DEFAULT_AI_AUTO_REPLY_SETTINGS.offline, ...normalized.offline },
    messageGen: {
      ...DEFAULT_AI_AUTO_REPLY_SETTINGS.messageGen,
      ...normalized.messageGen,
    },
    callReply: {
      ...DEFAULT_AI_AUTO_REPLY_SETTINGS.callReply,
      ...normalized.callReply,
    },
    knowledgeBase: {
      ...DEFAULT_AI_AUTO_REPLY_SETTINGS.knowledgeBase,
      ...normalized.knowledgeBase,
    },
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/settings/ai-auto-reply
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      // Super-admins (no tenant) get the defaults so the UI is previewable.
      return NextResponse.json(withDefaults(null));
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let parsed: unknown = {};
    try {
      parsed = tenant.settingsJson ? JSON.parse(tenant.settingsJson) : {};
    } catch {
      // Corrupt JSON in DB — treat as empty so the UI still renders.
      parsed = {};
    }

    const stored = (parsed as Record<string, unknown>)?.aiAutoReply;
    return NextResponse.json(withDefaults(stored));
  } catch (error) {
    console.error('[ai-auto-reply] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI auto-reply settings' },
      { status: 500 },
    );
  }
}

// PUT /api/settings/ai-auto-reply
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json(
        { error: 'No tenant context — super-admins cannot configure AI auto-reply.' },
        { status: 400 },
      );
    }
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update AI auto-reply settings' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const normalized = normalizeSettings(body);

    // Read-modify-write: pull the current settingsJson, merge `aiAutoReply`
    // into it, persist. This preserves every other sub-key (vapiApiKey,
    // emailNotifications, etc.) without overwriting them.
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { settingsJson: true },
    });
    let existing: Record<string, unknown> = {};
    if (tenant?.settingsJson) {
      try {
        existing = JSON.parse(tenant.settingsJson) as Record<string, unknown>;
      } catch {
        existing = {};
      }
    }
    existing.aiAutoReply = normalized;

    await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { settingsJson: JSON.stringify(existing) },
    });

    return NextResponse.json({
      success: true,
      aiAutoReply: withDefaults(normalized),
    });
  } catch (error) {
    console.error('[ai-auto-reply] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI auto-reply settings' },
      { status: 500 },
    );
  }
}
