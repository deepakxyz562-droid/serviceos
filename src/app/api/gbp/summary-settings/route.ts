import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GBP AI Agents — weekly email summary preference + automation flags
 * ------------------------------------------------------------------
 * Stored under `Tenant.settingsJson.gbpSummaryConfig` (existing JSON sub-key
 * pattern — the same mechanism used by `settingsJson.aiAutoReply` and
 * `settingsJson.autoReplyReviews`). NO new Prisma models/fields needed.
 *
 * GET  /api/gbp/summary-settings
 *   → { summary: { enabled, email }, automations: { reviewAutoReply, reviewAutoReplyMinRating, autoPosting } }
 *
 * POST /api/gbp/summary-settings   body: { enabled: boolean, email: string }
 *   → persists { enabled, email } into settingsJson.gbpSummaryConfig via
 *     read-modify-write (all other settings sub-keys are preserved).
 *   Email format is validated when enabled=true. No external email is sent in
 *   this phase — the weekly digest cron (`/api/cron/gbp-weekly-digest`) can
 *   read this config later.
 */

interface GbpSummaryConfig {
  enabled: boolean;
  email: string;
}

interface AutomationsConfig {
  reviewAutoReply: boolean;
  reviewAutoReplyMinRating: number;
  autoPosting: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readSettingsJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = readSettingsJson(tenant.settingsJson);

    const stored = (settings.gbpSummaryConfig || {}) as Partial<GbpSummaryConfig>;
    const summary: GbpSummaryConfig = {
      enabled: Boolean(stored.enabled),
      email: typeof stored.email === 'string' ? stored.email : '',
    };

    // Automation flags live in the same settingsJson — surface them so the hub
    // roadmap reflects the REAL workspace config (never fabricated).
    const autoReplyReviews = (settings.autoReplyReviews || {}) as { enabled?: boolean; minRating?: number };
    const automations = {
      reviewAutoReply: autoReplyReviews.enabled === true,
      reviewAutoReplyMinRating:
        typeof autoReplyReviews.minRating === 'number' ? autoReplyReviews.minRating : 5,
      // SAFE-BY-DEFAULT: auto-posting is strictly opt-in (cron/gbp-auto-post
      // only runs when settingsJson.autoGbpPosting === true).
      autoPosting: settings.autoGbpPosting === true,
    };

    return NextResponse.json({ summary, automations });
  } catch (error: unknown) {
    console.error('[api/gbp/summary-settings] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load summary settings' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      enabled?: unknown;
      email?: unknown;
      automations?: {
        reviewAutoReply?: unknown;
        reviewAutoReplyMinRating?: unknown;
        autoPosting?: unknown;
      };
    };
    const enabled = body.enabled === true;
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 320) : '';

    if (enabled && !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required to enable the weekly summary' },
        { status: 400 },
      );
    }
    if (!enabled && email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Read-modify-write: only touch the keys this API owns.
    const settings = readSettingsJson(tenant.settingsJson);
    settings.gbpSummaryConfig = { enabled, email } satisfies GbpSummaryConfig;

    // Automation flags (safe-by-default: absent keys keep their current value;
    // booleans must be explicitly provided to change anything).
    if (body.automations && typeof body.automations === 'object') {
      const a = body.automations;
      const prevAutoReply = (settings.autoReplyReviews || {}) as Record<string, unknown>;
      const nextAutoReply: Record<string, unknown> = { ...prevAutoReply };
      if (typeof a.reviewAutoReply === 'boolean') nextAutoReply.enabled = a.reviewAutoReply;
      if (typeof a.reviewAutoReplyMinRating === 'number' && a.reviewAutoReplyMinRating >= 1 && a.reviewAutoReplyMinRating <= 5) {
        nextAutoReply.minRating = Math.round(a.reviewAutoReplyMinRating);
      }
      settings.autoReplyReviews = nextAutoReply;
      if (typeof a.autoPosting === 'boolean') settings.autoGbpPosting = a.autoPosting;
    }

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    const autoReply = (settings.autoReplyReviews || {}) as { enabled?: boolean; minRating?: number };
    return NextResponse.json({
      success: true,
      summary: { enabled, email },
      automations: {
        reviewAutoReply: autoReply.enabled === true,
        reviewAutoReplyMinRating:
          typeof autoReply.minRating === 'number' ? autoReply.minRating : 5,
        autoPosting: settings.autoGbpPosting === true,
      } satisfies AutomationsConfig,
      message: enabled
        ? 'Weekly GBP summary enabled. The digest will be sent to your inbox.'
        : 'Weekly GBP summary disabled.',
    });
  } catch (error: unknown) {
    console.error('[api/gbp/summary-settings] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save summary settings' },
      { status: 500 },
    );
  }
}
