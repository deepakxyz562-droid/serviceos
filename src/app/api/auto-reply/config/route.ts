/**
 * GET / PATCH /api/auto-reply/config
 *
 * Read or update the tenant's offline auto-reply configuration. The config
 * is stored under `Tenant.settingsJson.autoReplyOffline` and has the shape:
 *
 *   {
 *     "enabled": boolean,
 *     "mode": "scripted" | "ai",
 *     "scriptedMessage": string,
 *     "aiSystemPrompt": string,
 *     "respectBusinessHours": boolean,
 *     "offlineThresholdMinutes": number,
 *     "cooldownMinutes": number
 *   }
 *
 * Auth: required (`getAuthUser()`).
 *
 * Subscription gate (PATCH only): trial users get HTTP 403 with
 * `code: 'TRIAL_LOCKED'`. Paid users + superadmins can update freely.
 * The GET handler is open to authenticated users so trial users can still
 * SEE the configuration UI (they just can't save it).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireNotTrial } from '@/lib/trial-gate';
import {
  getAutoReplyConfig,
  type AutoReplyConfig,
} from '@/lib/auto-reply';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/**
 * GET — read the tenant's auto-reply config.
 *
 * Returns the stored config if present, otherwise returns the defaults so
 * the UI can render with sensible initial values. Always returns 200 (even
 * when the tenant hasn't configured anything yet).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 },
      );
    }

    const config = await getAutoReplyConfig(user.tenantId);
    return NextResponse.json({ config: config ?? DEFAULT_CONFIG });
  } catch (err) {
    console.error('[/api/auto-reply/config GET] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH — update the tenant's auto-reply config.
 *
 * Merges the provided partial config into the existing `Tenant.settingsJson`
 * (preserving other keys). Trial users get HTTP 403 unless they have a
 * `FeatureFlag` override for `auto_reply_offline`.
 *
 * Validation:
 *   - `enabled` must be boolean (if provided)
 *   - `mode` must be 'scripted' | 'ai' (if provided)
 *   - `scriptedMessage` must be a non-empty string ≤ 5000 chars (if provided)
 *   - `aiSystemPrompt` must be a string ≤ 5000 chars (if provided)
 *   - `respectBusinessHours` must be boolean (if provided)
 *   - `offlineThresholdMinutes` must be a positive integer (if provided)
 *   - `cooldownMinutes` must be a positive integer (if provided)
 */
export async function PATCH(request: NextRequest) {
  try {
    // ── Subscription gate ──────────────────────────────────────────────────
    const gate = await requireNotTrial(AUTO_REPLY_FEATURE_KEY);
    if (!gate.ok) return gate.response;

    const tenantId = gate.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 },
      );
    }

    // ── Parse + validate body ──────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const updates: Partial<AutoReplyConfig> = {};

    if ('enabled' in body) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'enabled must be a boolean' },
          { status: 400 },
        );
      }
      updates.enabled = body.enabled;
    }

    if ('mode' in body) {
      if (body.mode !== 'scripted' && body.mode !== 'ai') {
        return NextResponse.json(
          { error: 'mode must be "scripted" or "ai"' },
          { status: 400 },
        );
      }
      updates.mode = body.mode;
    }

    if ('scriptedMessage' in body) {
      if (typeof body.scriptedMessage !== 'string') {
        return NextResponse.json(
          { error: 'scriptedMessage must be a string' },
          { status: 400 },
        );
      }
      if (body.scriptedMessage.length > 5000) {
        return NextResponse.json(
          { error: 'scriptedMessage must be ≤ 5000 characters' },
          { status: 400 },
        );
      }
      updates.scriptedMessage = body.scriptedMessage;
    }

    if ('aiSystemPrompt' in body) {
      if (typeof body.aiSystemPrompt !== 'string') {
        return NextResponse.json(
          { error: 'aiSystemPrompt must be a string' },
          { status: 400 },
        );
      }
      if (body.aiSystemPrompt.length > 5000) {
        return NextResponse.json(
          { error: 'aiSystemPrompt must be ≤ 5000 characters' },
          { status: 400 },
        );
      }
      updates.aiSystemPrompt = body.aiSystemPrompt;
    }

    if ('respectBusinessHours' in body) {
      if (typeof body.respectBusinessHours !== 'boolean') {
        return NextResponse.json(
          { error: 'respectBusinessHours must be a boolean' },
          { status: 400 },
        );
      }
      updates.respectBusinessHours = body.respectBusinessHours;
    }

    if ('offlineThresholdMinutes' in body) {
      const v = body.offlineThresholdMinutes;
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1440) {
        return NextResponse.json(
          { error: 'offlineThresholdMinutes must be a positive number ≤ 1440' },
          { status: 400 },
        );
      }
      updates.offlineThresholdMinutes = Math.floor(v);
    }

    if ('cooldownMinutes' in body) {
      const v = body.cooldownMinutes;
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1440) {
        return NextResponse.json(
          { error: 'cooldownMinutes must be a positive number ≤ 1440' },
          { status: 400 },
        );
      }
      updates.cooldownMinutes = Math.floor(v);
    }

    // ── Read existing settingsJson, merge, save ────────────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 },
      );
    }

    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
      if (!settings || typeof settings !== 'object') {
        settings = {};
      }
    } catch {
      settings = {};
    }

    // Read the existing autoReplyOffline (or defaults) and apply updates.
    const existingConfig = await getAutoReplyConfig(tenantId);
    const mergedConfig: AutoReplyConfig = {
      enabled: updates.enabled ?? existingConfig?.enabled ?? DEFAULT_CONFIG.enabled,
      mode: updates.mode ?? existingConfig?.mode ?? DEFAULT_CONFIG.mode,
      scriptedMessage:
        updates.scriptedMessage ?? existingConfig?.scriptedMessage ?? DEFAULT_CONFIG.scriptedMessage,
      aiSystemPrompt:
        updates.aiSystemPrompt ?? existingConfig?.aiSystemPrompt ?? DEFAULT_CONFIG.aiSystemPrompt,
      respectBusinessHours:
        updates.respectBusinessHours ??
        existingConfig?.respectBusinessHours ??
        DEFAULT_CONFIG.respectBusinessHours,
      offlineThresholdMinutes:
        updates.offlineThresholdMinutes ??
        existingConfig?.offlineThresholdMinutes ??
        DEFAULT_CONFIG.offlineThresholdMinutes,
      cooldownMinutes:
        updates.cooldownMinutes ?? existingConfig?.cooldownMinutes ?? DEFAULT_CONFIG.cooldownMinutes,
    };

    settings.autoReplyOffline = mergedConfig;

    await db.tenant.update({
      where: { id: tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({ config: mergedConfig });
  } catch (err) {
    console.error('[/api/auto-reply/config PATCH] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
