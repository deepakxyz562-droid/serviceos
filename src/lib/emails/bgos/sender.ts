/**
 * BGOS Email Delivery & Guardrails Layer
 * ======================================
 * Centralized dispatcher for all BGOS registered-user emails:
 *   - Enforces deliverable email filtering (skips synthetic phone_/relay addresses)
 *   - Enforces EmailSuppression (hard bounces / spam complaints)
 *   - Enforces BGOS user email preferences (`Tenant.settingsJson.bgosEmailPrefs`)
 *   - Deduplicates and rate-limits lifecycle sends via `NotificationLog`
 *   - Routes platform marketing/lifecycle emails with `platformMarketing: true`
 *     and `skipTenantQuota: true` so `bgos.fieseros.com` tracking links &
 *     List-Unsubscribe work without touching customer monthly SMTP quotas.
 *
 * Uses flat DB queries compatible with both SQLite/Prisma and Supabase PostgREST.
 */

import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import {
  DEFAULT_BGOS_URL,
  type BgosEmailKey,
  isDeliverableEmail,
  isSyntheticPlaceholderEmail,
  renderBgosPasswordResetEmail,
  renderBgosVerificationEmail,
  renderBgosWelcomeEmail,
  resolveBgosBaseUrl,
} from './templates';

export interface BgosEmailPrefs {
  productNudges: boolean;
  marketing: boolean;
  weeklyDigest: boolean;
  unsubscribedAt?: string | null;
  unsubscribeSource?: string | null;
}

export interface BgosSendOutcome {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
}

export function parseBgosEmailPrefs(settingsJson?: string | null): BgosEmailPrefs {
  let parsed: Record<string, unknown> = {};
  if (settingsJson) {
    try {
      const raw = JSON.parse(settingsJson);
      if (raw && typeof raw === 'object') {
        parsed = raw as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }

  const rawPrefs =
    parsed.bgosEmailPrefs && typeof parsed.bgosEmailPrefs === 'object'
      ? (parsed.bgosEmailPrefs as Record<string, unknown>)
      : {};
  const gbpSummary =
    parsed.gbpSummaryConfig && typeof parsed.gbpSummaryConfig === 'object'
      ? (parsed.gbpSummaryConfig as Record<string, unknown>)
      : {};

  const unsubscribedAt =
    typeof rawPrefs.unsubscribedAt === 'string' && rawPrefs.unsubscribedAt
      ? rawPrefs.unsubscribedAt
      : null;

  return {
    productNudges:
      typeof rawPrefs.productNudges === 'boolean'
        ? rawPrefs.productNudges
        : !unsubscribedAt,
    marketing:
      typeof rawPrefs.marketing === 'boolean'
        ? rawPrefs.marketing
        : !unsubscribedAt,
    weeklyDigest:
      typeof rawPrefs.weeklyDigest === 'boolean'
        ? rawPrefs.weeklyDigest
        : gbpSummary.enabled === true,
    unsubscribedAt,
    unsubscribeSource:
      typeof rawPrefs.unsubscribeSource === 'string' ? rawPrefs.unsubscribeSource : null,
  };
}

/**
 * Determine if a user/workspace/tenant belongs to BGOS (`productType = 'bgos'`
 * or `ProductWorkspace.product = 'bgos'`). Uses flat queries only.
 */
export async function isBgosContext(opts: {
  tenantId?: string | null;
  workspaceId?: string | null;
}): Promise<{ isBgos: boolean; isBgosOnly: boolean }> {
  const { tenantId, workspaceId } = opts;
  try {
    const productTypes = new Set<string>();

    if (workspaceId) {
      const [ws, pw] = await Promise.all([
        db.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, tenantId: true, productType: true },
        }),
        db.productWorkspace.findUnique({
          where: { workspaceId },
          select: { product: true },
        }),
      ]);
      if (ws?.productType) productTypes.add(ws.productType);
      if (pw?.product) productTypes.add(pw.product);
    }

    if (tenantId) {
      const [wss, pws] = await Promise.all([
        db.workspace.findMany({
          where: { tenantId },
          select: { id: true, productType: true },
        }),
        db.productWorkspace.findMany({
          where: { tenantId },
          select: { product: true },
        }),
      ]);
      for (const w of wss) {
        if (w.productType) productTypes.add(w.productType);
      }
      for (const p of pws) {
        if (p.product) productTypes.add(p.product);
      }
    }

    const isBgos = productTypes.has('bgos');
    const hasCrm = productTypes.has('crm') || productTypes.has('both');
    return {
      isBgos,
      isBgosOnly: isBgos && !hasCrm,
    };
  } catch {
    return { isBgos: false, isBgosOnly: false };
  }
}

export async function isEmailSuppressed(
  email: string,
  _tenantId?: string | null,
): Promise<boolean> {
  const lower = email.trim().toLowerCase();
  if (!lower) return true;
  try {
    const hit = await db.emailSuppression.findFirst({
      where: {
        email: lower,
        resolvedAt: null,
      },
      select: { id: true },
    });
    return Boolean(hit);
  } catch {
    return false;
  }
}

export interface BgosNotificationMeta {
  product?: string;
  emailKey?: BgosEmailKey | string;
  cycleKey?: string;
  campaignKey?: string;
}

export function safeParseMeta(jsonStr?: string | null): BgosNotificationMeta {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      return parsed as BgosNotificationMeta;
    }
    return {};
  } catch {
    return {};
  }
}

export async function hasBgosEmailBeenSent(opts: {
  tenantId?: string | null;
  recipientEmail?: string | null;
  emailKey: BgosEmailKey | string;
  cycleKey?: string;
  withinHours?: number;
}): Promise<boolean> {
  const { tenantId, recipientEmail, emailKey, cycleKey, withinHours } = opts;
  try {
    const since =
      typeof withinHours === 'number' && withinHours > 0
        ? new Date(Date.now() - withinHours * 60 * 60 * 1000)
        : undefined;

    const where: Record<string, unknown> = {
      type: 'email',
      status: 'sent',
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    if (tenantId) {
      where.tenantId = tenantId;
    } else if (recipientEmail) {
      where.recipient = recipientEmail.trim().toLowerCase();
    }

    const rows = await db.notificationLog.findMany({
      where,
      select: { metadataJson: true, recipient: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const targetEmail = recipientEmail ? recipientEmail.trim().toLowerCase() : null;
    for (const row of rows) {
      const meta = safeParseMeta(row.metadataJson);
      if (meta.product !== 'bgos') continue;
      if (meta.emailKey !== emailKey) continue;
      if (cycleKey && meta.cycleKey !== cycleKey) continue;
      if (!tenantId && targetEmail && row.recipient.toLowerCase() !== targetEmail) continue;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function logBgosEmailDispatch(opts: {
  tenantId?: string | null;
  recipient: string;
  recipientName?: string | null;
  subject: string;
  emailKey: BgosEmailKey | string;
  cycleKey?: string;
  campaignKey?: string;
  status: 'sent' | 'failed';
  messageId?: string;
  providerUsed?: string;
  error?: string;
}): Promise<void> {
  try {
    await db.notificationLog.create({
      data: {
        type: 'email',
        recipient: opts.recipient.trim().toLowerCase(),
        recipientName: opts.recipientName || null,
        recipientRole: 'owner',
        subject: opts.subject,
        message: `BGOS email [${opts.emailKey}]`,
        status: opts.status,
        externalId: opts.messageId || null,
        tenantId: opts.tenantId || null,
        metadataJson: JSON.stringify({
          product: 'bgos',
          emailKey: opts.emailKey,
          cycleKey: opts.cycleKey || null,
          campaignKey: opts.campaignKey || null,
          providerUsed: opts.providerUsed || null,
          error: opts.error || null,
        }),
      },
    });
  } catch (err) {
    console.warn('[bgos-email] Failed to log NotificationLog (non-fatal):', err);
  }
}

// ─── Transactional BGOS Emails ──────────────────────────────────────────────

export async function sendBgosVerificationEmail(params: {
  to: string;
  ownerName?: string | null;
  verifyLink: string;
  appUrl?: string;
  tenantId?: string | null;
}): Promise<BgosSendOutcome> {
  if (isSyntheticPlaceholderEmail(params.to)) {
    return { sent: false, skipped: true, reason: 'undeliverable_email' };
  }
  const baseUrl = resolveBgosBaseUrl(params.appUrl);
  const rendered = renderBgosVerificationEmail({
    ownerName: params.ownerName,
    verifyLink: params.verifyLink,
    appUrl: baseUrl,
  });

  const res = await sendEmail({
    to: params.to.trim(),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    usageType: 'transactional',
    tenantId: params.tenantId || undefined,
    skipTenantQuota: true,
  });

  await logBgosEmailDispatch({
    tenantId: params.tenantId,
    recipient: params.to,
    recipientName: params.ownerName,
    subject: rendered.subject,
    emailKey: 'bgos_verification',
    status: res.success ? 'sent' : 'failed',
    messageId: res.messageId,
    providerUsed: res.providerUsed,
    error: res.error,
  });

  return res.success
    ? { sent: true, messageId: res.messageId }
    : { sent: false, error: res.error || 'Failed to send BGOS verification email' };
}

export async function sendBgosPasswordResetEmail(params: {
  to: string;
  ownerName?: string | null;
  businessName?: string | null;
  resetUrl: string;
  appUrl?: string;
  tenantId?: string | null;
}): Promise<BgosSendOutcome> {
  if (isSyntheticPlaceholderEmail(params.to)) {
    return { sent: false, skipped: true, reason: 'undeliverable_email' };
  }
  const baseUrl = resolveBgosBaseUrl(params.appUrl);
  const rendered = renderBgosPasswordResetEmail({
    ownerName: params.ownerName,
    businessName: params.businessName,
    resetUrl: params.resetUrl,
    appUrl: baseUrl,
  });

  const res = await sendEmail({
    to: params.to.trim(),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    usageType: 'transactional',
    tenantId: params.tenantId || undefined,
    skipTenantQuota: true,
  });

  await logBgosEmailDispatch({
    tenantId: params.tenantId,
    recipient: params.to,
    recipientName: params.ownerName || params.businessName,
    subject: rendered.subject,
    emailKey: 'bgos_password_reset',
    status: res.success ? 'sent' : 'failed',
    messageId: res.messageId,
    providerUsed: res.providerUsed,
    error: res.error,
  });

  return res.success
    ? { sent: true, messageId: res.messageId }
    : { sent: false, error: res.error || 'Failed to send BGOS password reset email' };
}

// ─── Day-0 Idempotent Welcome Email ────────────────────────────────────────

export async function sendBgosWelcomeEmail(params: {
  to: string;
  ownerName?: string | null;
  businessName: string;
  tenantId?: string | null;
  trialDays?: number;
  appUrl?: string;
}): Promise<BgosSendOutcome> {
  const email = (params.to || '').trim();
  if (!isDeliverableEmail(email)) {
    return { sent: false, skipped: true, reason: 'undeliverable_email' };
  }
  if (await isEmailSuppressed(email, params.tenantId)) {
    return { sent: false, skipped: true, reason: 'email_suppressed' };
  }

  // Respect explicit opt-out if tenant already opted out before verification
  if (params.tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: params.tenantId },
        select: { settingsJson: true },
      });
      if (tenant) {
        const prefs = parseBgosEmailPrefs(tenant.settingsJson);
        if (!prefs.productNudges) {
          return { sent: false, skipped: true, reason: 'unsubscribed' };
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  const alreadySent = await hasBgosEmailBeenSent({
    tenantId: params.tenantId,
    recipientEmail: email,
    emailKey: 'bgos_welcome',
  });
  if (alreadySent) {
    return { sent: false, skipped: true, reason: 'already_sent' };
  }

  const baseUrl = resolveBgosBaseUrl(params.appUrl);
  const rendered = renderBgosWelcomeEmail({
    ownerName: params.ownerName,
    businessName: params.businessName,
    trialDays: params.trialDays,
    appUrl: baseUrl,
  });

  const res = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    usageType: 'marketing',
    platformMarketing: true,
    skipTenantQuota: true,
    trackingBaseUrl: baseUrl || DEFAULT_BGOS_URL,
    tenantId: params.tenantId || undefined,
    campaignId: 'bgos_welcome',
    recipientSource: 'bgos_user',
  });

  await logBgosEmailDispatch({
    tenantId: params.tenantId,
    recipient: email,
    recipientName: params.ownerName || params.businessName,
    subject: rendered.subject,
    emailKey: 'bgos_welcome',
    cycleKey: params.tenantId ? `welcome:${params.tenantId}` : `welcome:${email.toLowerCase()}`,
    status: res.success ? 'sent' : 'failed',
    messageId: res.messageId,
    providerUsed: res.providerUsed,
    error: res.error,
  });

  return res.success
    ? { sent: true, messageId: res.messageId }
    : { sent: false, error: res.error || 'Failed to send BGOS welcome email' };
}

// ─── Unified Lifecycle / Promo Dispatcher ──────────────────────────────────

export type BgosConsentCategory = 'transactional' | 'nudge' | 'marketing';

export async function dispatchBgosEmail(params: {
  tenantId: string;
  to: string;
  recipientName?: string | null;
  settingsJson?: string | null;
  emailKey: BgosEmailKey;
  cycleKey: string;
  category: BgosConsentCategory;
  subject: string;
  html: string;
  text: string;
  campaignKey?: string;
  appUrl?: string;
}): Promise<BgosSendOutcome> {
  const email = (params.to || '').trim();
  if (!isDeliverableEmail(email)) {
    return { sent: false, skipped: true, reason: 'undeliverable_email' };
  }

  if (params.category !== 'transactional') {
    if (await isEmailSuppressed(email, params.tenantId)) {
      return { sent: false, skipped: true, reason: 'email_suppressed' };
    }
    const prefs = parseBgosEmailPrefs(params.settingsJson);
    if (params.category === 'nudge' && !prefs.productNudges) {
      return { sent: false, skipped: true, reason: 'opted_out_nudges' };
    }
    if (params.category === 'marketing' && !prefs.marketing) {
      return { sent: false, skipped: true, reason: 'opted_out_marketing' };
    }
  }

  const baseUrl = resolveBgosBaseUrl(params.appUrl);
  const isMarketingChannel = params.category !== 'transactional';

  const res = await sendEmail({
    to: email,
    subject: params.subject,
    html: params.html,
    text: params.text,
    usageType: isMarketingChannel ? 'marketing' : 'transactional',
    platformMarketing: isMarketingChannel,
    skipTenantQuota: true,
    trackingBaseUrl: baseUrl || DEFAULT_BGOS_URL,
    tenantId: params.tenantId,
    campaignId: params.campaignKey || params.emailKey,
    recipientSource: 'bgos_user',
  });

  await logBgosEmailDispatch({
    tenantId: params.tenantId,
    recipient: email,
    recipientName: params.recipientName,
    subject: params.subject,
    emailKey: params.emailKey,
    cycleKey: params.cycleKey,
    campaignKey: params.campaignKey,
    status: res.success ? 'sent' : 'failed',
    messageId: res.messageId,
    providerUsed: res.providerUsed,
    error: res.error,
  });

  return res.success
    ? { sent: true, messageId: res.messageId }
    : { sent: false, error: res.error || 'Email send failed' };
}
