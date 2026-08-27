/**
 * Outreach helpers — daily limit, cooldown, suppression checks, variable
 * injection, claim token generation.
 *
 * Used by /api/superadmin/outreach/* routes. All functions are pure
 * (no side effects except DB reads/writes) and return typed results.
 */
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// ── Constants ────────────────────────────────────────────────────────────

const COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours
const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_DAILY_LIMIT = 20;

const OUTREACH_FEATURE_KEY = 'outreach';

// ── Types ────────────────────────────────────────────────────────────────

export interface PreflightResult {
  ok: boolean;
  /** Present when ok=false — human-readable reason */
  reason?: string;
  /** Present when ok=false — machine code for UI branching */
  code?:
    | 'tenant_outreach_disabled'
    | 'no_email_on_file'
    | 'daily_limit_reached'
    | 'cooldown_active'
    | 'email_suppressed'
    | 'template_not_allowed_for_claimed'
    | 'template_not_allowed_for_unclaimed';
}

export interface OutreachStats {
  dailyLimit: number;
  sentToday: number;
  remaining: number;
  lastSentAt: Date | null;
  cooldownUntil: Date | null; // null if cooldown not active
  isSuppressed: boolean;
  suppressionReason: string | null;
  outreachDisabled: boolean;
}

// ── Settings ─────────────────────────────────────────────────────────────

export async function getDailyLimit(): Promise<number> {
  try {
    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: OUTREACH_FEATURE_KEY },
      select: { configJson: true },
    });
    if (toggle?.configJson) {
      const cfg = JSON.parse(toggle.configJson) as { dailyLimit?: number };
      if (typeof cfg.dailyLimit === 'number' && cfg.dailyLimit > 0) {
        return cfg.dailyLimit;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_DAILY_LIMIT;
}

export async function setDailyLimit(limit: number, userId: string): Promise<void> {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  const configJson = JSON.stringify({ dailyLimit: safeLimit });
  await db.revenueFeatureToggle.upsert({
    where: { featureKey: OUTREACH_FEATURE_KEY },
    update: { configJson, enabled: true },
    create: {
      featureKey: OUTREACH_FEATURE_KEY,
      displayName: 'Outreach',
      description: 'Superadmin to Tenant one-to-one outreach emails',
      enabled: true,
      perTenantOverride: false,
      defaultForNewTenants: false,
      configJson,
    },
  });
  void userId; // reserved for audit logging
}

// ── Counting (only counts provider-accepted 'sent' sends) ────────────────

export async function countSentToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  try {
    return await db.emailCommunication.count({
      where: {
        status: 'sent',
        sentAt: { gte: startOfDay },
      },
    });
  } catch {
    return 0;
  }
}

// ── Cooldown ─────────────────────────────────────────────────────────────

export async function getLastSentAt(tenantId: string): Promise<Date | null> {
  try {
    const last = await db.emailCommunication.findFirst({
      where: { tenantId, status: { in: ['sent', 'delivered'] } },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });
    return last?.sentAt ?? null;
  } catch {
    return null;
  }
}

export function getCooldownUntil(lastSentAt: Date | null): Date | null {
  if (!lastSentAt) return null;
  const until = new Date(lastSentAt.getTime() + COOLDOWN_MS);
  if (until.getTime() <= Date.now()) return null; // cooldown expired
  return until;
}

// ── Suppression ──────────────────────────────────────────────────────────

export async function isEmailSuppressed(
  email: string,
  tenantId: string
): Promise<{ suppressed: boolean; reason: string | null }> {
  const normalized = email.toLowerCase().trim();
  try {
    // Check both tenant-specific and platform-wide (tenantId=null)
    const row = await db.emailSuppression.findFirst({
      where: {
        email: normalized,
        resolvedAt: null,
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { createdAt: 'desc' },
      select: { reason: true },
    });
    return { suppressed: !!row, reason: row?.reason ?? null };
  } catch {
    return { suppressed: false, reason: null };
  }
}

// ── Pre-flight check (run before sending) ────────────────────────────────

export async function preflightSend(opts: {
  tenantId: string;
  recipientEmail: string;
  templateCategory?: string; // 'claim' | 'outreach' | 'operational'
  tenantClaimed: boolean;
  tenantOutreachDisabled: boolean;
}): Promise<PreflightResult & { stats: OutreachStats }> {
  const { tenantId, recipientEmail, tenantClaimed, tenantOutreachDisabled } = opts;

  // 1. Tenant-level outreach opt-out
  if (tenantOutreachDisabled) {
    return statsAndFail(opts, 'tenant_outreach_disabled',
      'This business has opted out of all outreach emails.');
  }

  // 2. No email on file
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return statsAndFail(opts, 'no_email_on_file',
      'No valid email address on file for this tenant.');
  }

  // 3. Suppression check
  const supp = await isEmailSuppressed(recipientEmail, tenantId);
  if (supp.suppressed) {
    return statsAndFail(opts, 'email_suppressed',
      `This email address is suppressed (${supp.reason}). Resolve the suppression before sending.`);
  }

  // 4. Template gate: "Claim Your Business" only for unclaimed tenants
  if (opts.templateCategory === 'claim' && tenantClaimed) {
    return statsAndFail(opts, 'template_not_allowed_for_claimed',
      'This tenant is already claimed. The "Claim Your Business" template is only available for unclaimed listings.');
  }

  // 5. Daily limit
  const dailyLimit = await getDailyLimit();
  const sentToday = await countSentToday();
  if (sentToday >= dailyLimit) {
    return statsAndFail(opts, 'daily_limit_reached',
      `Daily limit reached (${sentToday}/${dailyLimit} sent today). Try again tomorrow.`);
  }

  // 6. Cooldown
  const lastSentAt = await getLastSentAt(tenantId);
  const cooldownUntil = getCooldownUntil(lastSentAt);
  if (cooldownUntil) {
    return statsAndFail(opts, 'cooldown_active',
      `Cooldown active until ${cooldownUntil.toLocaleString()}. Last email sent ${lastSentAt ? new Date(lastSentAt).toLocaleString() : 'recently'}.`);
  }

  // All checks passed — return full stats
  const stats = await buildStats({
    tenantId,
    recipientEmail,
    tenantOutreachDisabled,
    dailyLimit,
    sentToday,
    lastSentAt,
    cooldownUntil: null,
    isSuppressed: false,
    suppressionReason: null,
  });
  return { ok: true, stats };
}

// Helper: build stats + return a failure result
async function statsAndFail(
  opts: { tenantId: string; recipientEmail: string; tenantOutreachDisabled: boolean },
  code: NonNullable<PreflightResult['code']>,
  reason: string
): Promise<PreflightResult & { stats: OutreachStats }> {
  const [dailyLimit, sentToday, lastSentAt] = await Promise.all([
    getDailyLimit(),
    countSentToday(),
    getLastSentAt(opts.tenantId),
  ]);
  const cooldownUntil = getCooldownUntil(lastSentAt);
  const supp = await isEmailSuppressed(opts.recipientEmail, opts.tenantId);
  const stats = await buildStats({
    tenantId: opts.tenantId,
    recipientEmail: opts.recipientEmail,
    tenantOutreachDisabled: opts.tenantOutreachDisabled,
    dailyLimit,
    sentToday,
    lastSentAt,
    cooldownUntil,
    isSuppressed: supp.suppressed,
    suppressionReason: supp.reason,
  });
  return { ok: false, code, reason, stats };
}

async function buildStats(data: {
  tenantId: string;
  recipientEmail: string;
  tenantOutreachDisabled: boolean;
  dailyLimit: number;
  sentToday: number;
  lastSentAt: Date | null;
  cooldownUntil: Date | null;
  isSuppressed: boolean;
  suppressionReason: string | null;
}): Promise<OutreachStats> {
  return {
    dailyLimit: data.dailyLimit,
    sentToday: data.sentToday,
    remaining: Math.max(0, data.dailyLimit - data.sentToday),
    lastSentAt: data.lastSentAt,
    cooldownUntil: data.cooldownUntil,
    isSuppressed: data.isSuppressed,
    suppressionReason: data.suppressionReason,
    outreachDisabled: data.tenantOutreachDisabled,
  };
}

// ── Variable injection ───────────────────────────────────────────────────

export interface OutreachVariables {
  businessName: string;
  industry: string;
  city: string;
  country: string;
  marketplaceUrl: string;
  tenantSlug: string;
  claimLink?: string; // only for 'claim' category templates
  claimToken?: string; // the raw token (for audit)
  [key: string]: string | undefined;
}

export async function buildVariables(opts: {
  tenant: {
    name: string;
    slug: string;
    industry?: string | null;
    city?: string | null;
    country?: string;
  };
  claimLink?: string;
  claimToken?: string;
}): Promise<OutreachVariables> {
  const t = opts.tenant;
  const base: OutreachVariables = {
    businessName: t.name,
    industry: t.industry || 'your industry',
    city: t.city || 'your area',
    country: t.country || 'US',
    marketplaceUrl: `https://fieseros.com/${t.slug}`,
    tenantSlug: t.slug,
  };
  if (opts.claimLink) base.claimLink = opts.claimLink;
  if (opts.claimToken) base.claimToken = opts.claimToken;
  return base;
}

/**
 * Render a template string by replacing {{var}} placeholders.
 * Unknown variables are left as-is (so the editor can see they're unrendered).
 */
export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

// ── Claim token ──────────────────────────────────────────────────────────

export async function generateClaimToken(tenantId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MS);
  // Upsert: one active token per tenant (replaces any previous)
  await db.outreachClaimToken.upsert({
    where: { tenantId },
    update: { token, expiresAt, usedAt: null, emailCommunicationId: null },
    create: { tenantId, token, expiresAt },
  });
  return { token, expiresAt };
}

export function buildClaimUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
  return `${base}/claim?token=${token}&source=outreach`;
}

// ── Suppression management ───────────────────────────────────────────────

export async function suppressEmail(opts: {
  email: string;
  tenantId?: string | null;
  reason: 'hard_bounce' | 'complaint' | 'manual';
  source: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const email = opts.email.toLowerCase().trim();
  const metadataJson = JSON.stringify(opts.metadata ?? {});
  // Upsert: one active suppression per [email, tenantId]
  // If a resolved suppression exists, reopen it by clearing resolvedAt.
  // NOTE: Prisma's compound unique `email_tenantId` only works when tenantId
  // is non-null (nulls are distinct in the unique constraint). For the
  // platform-wide case (tenantId=null), we fall back to findFirst+update/create.
  if (opts.tenantId) {
    await db.emailSuppression.upsert({
      where: {
        email_tenantId: { email, tenantId: opts.tenantId },
      },
      update: {
        reason: opts.reason,
        source: opts.source,
        provider: opts.provider ?? null,
        metadataJson,
        resolvedAt: null,
        resolvedBy: null,
        resolveReason: null,
      },
      create: {
        email,
        tenantId: opts.tenantId,
        reason: opts.reason,
        source: opts.source,
        provider: opts.provider ?? null,
        metadataJson,
      },
    });
  } else {
    // Platform-wide suppression (tenantId=null): find existing active one
    const existing = await db.emailSuppression.findFirst({
      where: { email, tenantId: null },
    });
    if (existing) {
      await db.emailSuppression.update({
        where: { id: existing.id },
        data: {
          reason: opts.reason,
          source: opts.source,
          provider: opts.provider ?? null,
          metadataJson,
          resolvedAt: null,
          resolvedBy: null,
          resolveReason: null,
        },
      });
    } else {
      await db.emailSuppression.create({
        data: {
          email,
          tenantId: null,
          reason: opts.reason,
          source: opts.source,
          provider: opts.provider ?? null,
          metadataJson,
        },
      });
    }
  }
}

export async function unsuppressEmail(
  email: string,
  tenantId: string | null,
  resolvedBy: string,
  resolveReason?: string
): Promise<boolean> {
  const e = email.toLowerCase().trim();
  const result = await db.emailSuppression.updateMany({
    where: { email: e, tenantId, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedBy, resolveReason: resolveReason ?? null },
  });
  return result.count > 0;
}
