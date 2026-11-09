/**
 * BGOS Lifecycle Decision Engine & Batch Runner
 * ==============================================
 * Evaluates registered BGOS tenants and sends contextual lifecycle, activation,
 * review-growth ("Go from 0 to more than 5 reviews"), and post-trial non-payment
 * inactivity rescue emails.
 *
 * Uses flat DB queries compatible with both SQLite/Prisma and Supabase PostgREST.
 */

import { db } from '@/lib/db';
import {
  buildGoogleReviewLink,
  getBgosPricingForTenant,
  isDeliverableEmail,
  renderBgosConnectGbpNudgeEmail,
  renderBgosFirstPostNudgeEmail,
  renderBgosPostTrialInactiveEmail,
  renderBgosReviewGrowthEmail,
  renderBgosTrialEndingEmail,
  renderBgosTrialExpiredEmail,
  renderBgosUnrepliedReviewsEmail,
  renderBgosWinBackEmail,
  resolveBgosBaseUrl,
  type BgosEmailKey,
  type RenderedBgosEmail,
} from './templates';
import {
  type BgosConsentCategory,
  dispatchBgosEmail,
  isEmailSuppressed,
  parseBgosEmailPrefs,
  safeParseMeta,
} from './sender';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface SentHistoryItem {
  emailKey: string;
  cycleKey?: string | null;
  sentAt: Date;
}

export interface BgosTenantSnapshot {
  tenantId: string;
  businessName: string;
  recipientEmail: string | null;
  recipientName: string | null;
  createdAt: Date;
  plan: string;
  planStatus: string;
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  country?: string | null;
  currency?: string | null;
  phone?: string | null;
  settingsJson?: string | null;
  isPaidActive: boolean;
  gbpConnected: boolean;
  placeId?: string | null;
  reviewUrl?: string | null;
  totalReviewsCount: number;
  unrepliedOldReviewsCount: number;
  publishedPostsCount: number;
  lastActivityAt: Date;
  sentHistory: SentHistoryItem[];
}

export interface LifecycleDecision {
  action: 'send' | 'skip';
  reason?: string;
  emailKey?: BgosEmailKey;
  cycleKey?: string;
  category?: BgosConsentCategory;
  rendered?: RenderedBgosEmail;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function isoWeekKey(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((copy.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function wasSentInHistory(
  history: SentHistoryItem[],
  emailKey: BgosEmailKey,
  opts?: { cycleKey?: string; withinMs?: number; now?: Date },
): boolean {
  const nowMs = (opts?.now || new Date()).getTime();
  return history.some((item) => {
    if (item.emailKey !== emailKey) return false;
    if (opts?.cycleKey && item.cycleKey === opts.cycleKey) return true;
    if (typeof opts?.withinMs === 'number') {
      return nowMs - item.sentAt.getTime() < opts.withinMs;
    }
    return !opts?.cycleKey;
  });
}

function getHoursSinceLastLifecycleEmail(
  history: SentHistoryItem[],
  now: Date,
): number | null {
  let latestMs = -1;
  for (const item of history) {
    // Ignore password reset / verification / promo broadcasts when computing automated cadence?
    // Actually include welcome + all automated lifecycle/nudge emails so user doesn't get bombarded.
    if (
      item.emailKey === 'bgos_verification' ||
      item.emailKey === 'bgos_password_reset'
    ) {
      continue;
    }
    const t = item.sentAt.getTime();
    if (t > latestMs) latestMs = t;
  }
  if (latestMs < 0) return null;
  return (now.getTime() - latestMs) / HOUR_MS;
}

/**
 * Pure decision function — evaluates a single tenant snapshot at timestamp `now`
 * and picks AT MOST ONE email to send right now.
 */
export function evaluateBgosLifecycleDecision(
  snapshot: BgosTenantSnapshot,
  now: Date = new Date(),
  appUrl?: string,
): LifecycleDecision {
  if (snapshot.suspendedAt) {
    return { action: 'skip', reason: 'tenant_suspended' };
  }
  if (!isDeliverableEmail(snapshot.recipientEmail)) {
    return { action: 'skip', reason: 'undeliverable_email' };
  }

  const prefs = parseBgosEmailPrefs(snapshot.settingsJson);
  const pricing = getBgosPricingForTenant({
    country: snapshot.country,
    currency: snapshot.currency,
    phone: snapshot.phone,
  });
  const baseUrl = resolveBgosBaseUrl(appUrl);
  const hoursSinceLast = getHoursSinceLastLifecycleEmail(snapshot.sentHistory, now);
  const passed24hCooldown = hoursSinceLast === null || hoursSinceLast >= 24;
  const passed72hCooldown = hoursSinceLast === null || hoursSinceLast >= 72;

  const trialEndsAt = snapshot.trialEndsAt;
  const trialTag = trialEndsAt ? isoDay(trialEndsAt) : isoDay(snapshot.createdAt);

  // ── 1. Trial Ending Soon (1–2.5 days before trialEndsAt) ───────────────
  if (
    !snapshot.isPaidActive &&
    snapshot.planStatus === 'trial' &&
    trialEndsAt &&
    passed24hCooldown
  ) {
    const msLeft = trialEndsAt.getTime() - now.getTime();
    if (msLeft > 0 && msLeft <= 2.5 * DAY_MS) {
      const cycleKey = `trial_ending_2d:${trialTag}`;
      if (!wasSentInHistory(snapshot.sentHistory, 'bgos_trial_ending_2d', { cycleKey })) {
        const daysRemaining = Math.max(1, Math.ceil(msLeft / DAY_MS));
        const trialEndsAtLabel = trialEndsAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return {
          action: 'send',
          emailKey: 'bgos_trial_ending_2d',
          cycleKey,
          category: 'transactional',
          rendered: renderBgosTrialEndingEmail({
            businessName: snapshot.businessName,
            daysRemaining,
            trialEndsAtLabel,
            reviewsCount: snapshot.totalReviewsCount,
            postsCount: snapshot.publishedPostsCount,
            pricing,
            appUrl: baseUrl,
          }),
        };
      }
    }
  }

  // ── 2. Trial Just Expired (< 3 days past expiry, unpaid) ───────────────
  const isTrialPastEnd = Boolean(trialEndsAt && trialEndsAt.getTime() <= now.getTime());
  const isMarkedExpired =
    snapshot.planStatus === 'expired' || snapshot.planStatus === 'trial_expired';

  if (
    !snapshot.isPaidActive &&
    trialEndsAt &&
    isTrialPastEnd &&
    (isMarkedExpired || snapshot.planStatus === 'trial') &&
    passed24hCooldown
  ) {
    const elapsedExpiryMs = now.getTime() - trialEndsAt.getTime();
    if (elapsedExpiryMs >= 0 && elapsedExpiryMs < 3 * DAY_MS) {
      const cycleKey = `trial_expired:${trialTag}`;
      if (!wasSentInHistory(snapshot.sentHistory, 'bgos_trial_expired', { cycleKey })) {
        return {
          action: 'send',
          emailKey: 'bgos_trial_expired',
          cycleKey,
          category: 'transactional',
          rendered: renderBgosTrialExpiredEmail({
            businessName: snapshot.businessName,
            pricing,
            appUrl: baseUrl,
          }),
        };
      }
    }
  }

  // Wait for 72h frequency cap for all non-transactional nudges / rescues / win-back
  if (!passed72hCooldown) {
    return { action: 'skip', reason: 'cooldown_72h' };
  }

  const inactiveDays = Math.max(
    0,
    Math.floor((now.getTime() - snapshot.lastActivityAt.getTime()) / DAY_MS),
  );
  const daysSinceExpiry = trialEndsAt
    ? (now.getTime() - trialEndsAt.getTime()) / DAY_MS
    : isMarkedExpired
      ? (now.getTime() - snapshot.createdAt.getTime()) / DAY_MS
      : -1;

  // ── 3. Post-Trial Unpaid + Inactive Day +3 Rescue ──────────────────────
  if (
    !snapshot.isPaidActive &&
    prefs.productNudges &&
    (isMarkedExpired || isTrialPastEnd) &&
    daysSinceExpiry >= 3 &&
    daysSinceExpiry < 10 &&
    inactiveDays >= 3
  ) {
    const cycleKey = `post_trial_inactive_3d:${trialTag}`;
    if (!wasSentInHistory(snapshot.sentHistory, 'bgos_post_trial_inactive_3d', { cycleKey })) {
      return {
        action: 'send',
        emailKey: 'bgos_post_trial_inactive_3d',
        cycleKey,
        category: 'nudge',
        rendered: renderBgosPostTrialInactiveEmail({
          businessName: snapshot.businessName,
          inactiveDays,
          gbpConnected: snapshot.gbpConnected,
          reviewsCount: snapshot.totalReviewsCount,
          pricing,
          appUrl: baseUrl,
        }),
      };
    }
  }

  // ── 4. Post-Trial Unpaid + Inactive Day +10-14 Win-Back ────────────────
  if (
    !snapshot.isPaidActive &&
    prefs.marketing &&
    (isMarkedExpired || isTrialPastEnd) &&
    daysSinceExpiry >= 10 &&
    inactiveDays >= 10
  ) {
    const cycleKey = `post_trial_winback_14d:${trialTag}`;
    if (!wasSentInHistory(snapshot.sentHistory, 'bgos_post_trial_winback_14d', { cycleKey })) {
      return {
        action: 'send',
        emailKey: 'bgos_post_trial_winback_14d',
        cycleKey,
        category: 'marketing',
        rendered: renderBgosWinBackEmail({
          businessName: snapshot.businessName,
          inactiveDays,
          pricing,
          appUrl: baseUrl,
        }),
      };
    }
  }

  // Remaining items are product-growth nudges controlled by `prefs.productNudges`
  if (!prefs.productNudges) {
    return { action: 'skip', reason: 'opted_out_nudges' };
  }

  const ageHours = (now.getTime() - snapshot.createdAt.getTime()) / HOUR_MS;

  // ── 5. Unreplied Google Reviews (> 48h old) ────────────────────────────
  if (snapshot.gbpConnected && snapshot.unrepliedOldReviewsCount >= 1) {
    const recentlySent = wasSentInHistory(snapshot.sentHistory, 'bgos_unreplied_reviews', {
      withinMs: 14 * DAY_MS,
      now,
    });
    if (!recentlySent) {
      const cycleKey = `unreplied:${isoWeekKey(now)}`;
      return {
        action: 'send',
        emailKey: 'bgos_unreplied_reviews',
        cycleKey,
        category: 'nudge',
        rendered: renderBgosUnrepliedReviewsEmail({
          businessName: snapshot.businessName,
          pendingCount: snapshot.unrepliedOldReviewsCount,
          appUrl: baseUrl,
        }),
      };
    }
  }

  // ── 6. Connect GBP Nudge (24h+ after signup, GBP still disconnected) ───
  if (!snapshot.gbpConnected && ageHours >= 24 && !isMarkedExpired && !isTrialPastEnd) {
    const cycleKey = `connect_gbp:${snapshot.tenantId}`;
    if (!wasSentInHistory(snapshot.sentHistory, 'bgos_connect_gbp_nudge', { cycleKey })) {
      return {
        action: 'send',
        emailKey: 'bgos_connect_gbp_nudge',
        cycleKey,
        category: 'nudge',
        rendered: renderBgosConnectGbpNudgeEmail({
          businessName: snapshot.businessName,
          appUrl: baseUrl,
        }),
      };
    }
  }

  // ── 7. Google-Inspired "Go from X to more than 5 reviews" Nudge ────────
  if (snapshot.gbpConnected && snapshot.totalReviewsCount < 5 && ageHours >= 48) {
    const recentlySent = wasSentInHistory(snapshot.sentHistory, 'bgos_review_growth_0_to_5', {
      withinMs: 30 * DAY_MS,
      now,
    });
    if (!recentlySent) {
      const cycleKey = `review_growth_0_to_5:${isoMonth(now)}`;
      return {
        action: 'send',
        emailKey: 'bgos_review_growth_0_to_5',
        cycleKey,
        category: 'nudge',
        rendered: renderBgosReviewGrowthEmail({
          businessName: snapshot.businessName,
          reviewCount: snapshot.totalReviewsCount,
          placeId: snapshot.placeId,
          reviewUrl: snapshot.reviewUrl,
          appUrl: baseUrl,
        }),
      };
    }
  }

  // ── 8. First GBP Post Nudge (4d+ old, GBP connected, 0 published posts) ─
  if (
    snapshot.gbpConnected &&
    snapshot.publishedPostsCount === 0 &&
    ageHours >= 96 &&
    !isMarkedExpired &&
    !isTrialPastEnd
  ) {
    const cycleKey = `first_post:${snapshot.tenantId}`;
    if (!wasSentInHistory(snapshot.sentHistory, 'bgos_first_post_nudge', { cycleKey })) {
      return {
        action: 'send',
        emailKey: 'bgos_first_post_nudge',
        cycleKey,
        category: 'nudge',
        rendered: renderBgosFirstPostNudgeEmail({
          businessName: snapshot.businessName,
          appUrl: baseUrl,
        }),
      };
    }
  }

  return { action: 'skip', reason: 'no_rule_matched' };
}

// ─── Data Loader & Batch Runner ────────────────────────────────────────────

export interface BgosBatchRunOptions {
  dryRun?: boolean;
  limit?: number;
  tenantIdFilter?: string;
}

export interface BgosBatchItemResult {
  tenantId: string;
  businessName: string;
  email: string | null;
  action: 'sent' | 'would_send' | 'skipped' | 'failed';
  emailKey?: BgosEmailKey;
  cycleKey?: string;
  reason?: string;
  error?: string;
}

export interface BgosBatchRunReport {
  ranAt: string;
  dryRun: boolean;
  evaluated: number;
  sent: number;
  wouldSend: number;
  skipped: number;
  failed: number;
  results: BgosBatchItemResult[];
}

function parseJsonSafe(str?: string | null): Record<string, unknown> {
  if (!str) return {};
  try {
    const p = JSON.parse(str);
    return p && typeof p === 'object' ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function loadBgosTenantSnapshots(
  tenantIdFilter?: string,
): Promise<BgosTenantSnapshot[]> {
  // 1. Collect all BGOS tenantIds using flat queries
  const bgosTenantIds = new Set<string>();
  const bgosWorkspaceIdsByTenant = new Map<string, string[]>();

  if (tenantIdFilter) {
    bgosTenantIds.add(tenantIdFilter);
  } else {
    const [bgosWorkspaces, bgosProductWorkspaces] = await Promise.all([
      db.workspace.findMany({
        where: { productType: 'bgos' },
        select: { id: true, tenantId: true },
      }),
      db.productWorkspace.findMany({
        where: { product: 'bgos' },
        select: { workspaceId: true, tenantId: true },
      }),
    ]);

    const orphanWsIds: string[] = [];
    for (const w of bgosWorkspaces) {
      if (w.tenantId) {
        bgosTenantIds.add(w.tenantId);
        const list = bgosWorkspaceIdsByTenant.get(w.tenantId) || [];
        list.push(w.id);
        bgosWorkspaceIdsByTenant.set(w.tenantId, list);
      }
    }
    for (const pw of bgosProductWorkspaces) {
      if (pw.tenantId) {
        bgosTenantIds.add(pw.tenantId);
        const list = bgosWorkspaceIdsByTenant.get(pw.tenantId) || [];
        if (!list.includes(pw.workspaceId)) list.push(pw.workspaceId);
        bgosWorkspaceIdsByTenant.set(pw.tenantId, list);
      } else if (pw.workspaceId) {
        orphanWsIds.push(pw.workspaceId);
      }
    }

    if (orphanWsIds.length > 0) {
      const orphanWs = await db.workspace.findMany({
        where: { id: { in: orphanWsIds } },
        select: { id: true, tenantId: true },
      });
      for (const w of orphanWs) {
        if (w.tenantId) {
          bgosTenantIds.add(w.tenantId);
          const list = bgosWorkspaceIdsByTenant.get(w.tenantId) || [];
          if (!list.includes(w.id)) list.push(w.id);
          bgosWorkspaceIdsByTenant.set(w.tenantId, list);
        }
      }
    }
  }

  const allTenantIds = Array.from(bgosTenantIds);
  if (allTenantIds.length === 0) return [];

  if (tenantIdFilter) {
    const wss = await db.workspace.findMany({
      where: { tenantId: tenantIdFilter },
      select: { id: true },
    });
    bgosWorkspaceIdsByTenant.set(
      tenantIdFilter,
      wss.map((w) => w.id),
    );
  }

  const snapshots: BgosTenantSnapshot[] = [];

  // Process in chunks of 50 tenants to avoid query/Take truncation
  for (let idx = 0; idx < allTenantIds.length; idx += 50) {
    const chunkIds = allTenantIds.slice(idx, idx + 50);
    const chunkWsIds: string[] = [];
    for (const tid of chunkIds) {
      for (const wid of bgosWorkspaceIdsByTenant.get(tid) || []) {
        chunkWsIds.push(wid);
      }
    }

    const [
      tenants,
      users,
      subscriptions,
      productSubscriptions,
      socialAccounts,
      reviews,
      socialPosts,
      logs,
    ] = await Promise.all([
      db.tenant.findMany({
        where: { id: { in: chunkIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          country: true,
          currency: true,
          plan: true,
          planStatus: true,
          trialEndsAt: true,
          suspendedAt: true,
          createdAt: true,
          settingsJson: true,
          googlePlaceId: true,
          googleBusinessProfileUrl: true,
        },
      }),
      db.user.findMany({
        where: { tenantId: { in: chunkIds }, isActive: true },
        select: {
          id: true,
          tenantId: true,
          email: true,
          name: true,
          role: true,
          lastLoginAt: true,
          lastActivityAt: true,
          createdAt: true,
        },
      }),
      db.subscription.findMany({
        where: { tenantId: { in: chunkIds } },
        select: { tenantId: true, plan: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      chunkWsIds.length > 0
        ? db.productSubscription.findMany({
            where: { workspaceId: { in: chunkWsIds } },
            select: { workspaceId: true, plan: true, status: true },
          })
        : Promise.resolve([]),
      db.socialAccount.findMany({
        where: {
          tenantId: { in: chunkIds },
          platform: 'googlebusiness',
          isActive: true,
        },
        select: { tenantId: true, metadata: true },
      }),
      db.review.findMany({
        where: { tenantId: { in: chunkIds } },
        select: { tenantId: true, responseJson: true, createdAt: true },
      }),
      db.socialPost.findMany({
        where: { tenantId: { in: chunkIds } },
        select: { tenantId: true, status: true, publishedAt: true, createdAt: true },
      }),
      db.notificationLog.findMany({
        where: { tenantId: { in: chunkIds }, type: 'email', status: 'sent' },
        select: { tenantId: true, metadataJson: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2500,
      }),
    ]);

    const prodSubMap = new Map<string, { plan: string; status: string }>();
    for (const ps of productSubscriptions) {
      prodSubMap.set(ps.workspaceId, { plan: ps.plan, status: ps.status });
    }

    const nowMs = Date.now();
    const cutoff48hMs = nowMs - 48 * HOUR_MS;

    for (const tenant of tenants) {
      const tenantUsers = users
        .filter((u) => u.tenantId === tenant.id)
        .sort((a, b) => {
          if (a.role === 'owner' && b.role !== 'owner') return -1;
          if (b.role === 'owner' && a.role !== 'owner') return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      const owner = tenantUsers[0];
      const recipientEmail = owner?.email || tenant.email || null;
      const recipientName = owner?.name || null;

      // Active paid check across Tenant, Subscription, and ProductSubscription
      const tenantSubs = subscriptions.filter((s) => s.tenantId === tenant.id);
      const latestSub = tenantSubs[0];
      const wsIds = bgosWorkspaceIdsByTenant.get(tenant.id) || [];
      const paidProdSub = wsIds.some((wid) => {
        const ps = prodSubMap.get(wid);
        return Boolean(ps && ps.status === 'active' && ps.plan !== 'free');
      });

      const isPaidActive =
        (tenant.planStatus === 'active' && tenant.plan !== 'free') ||
        Boolean(latestSub && latestSub.status === 'active' && latestSub.plan !== 'free') ||
        paidProdSub;

      // GBP connection & placeId
      const gbpAccount = socialAccounts.find((sa) => sa.tenantId === tenant.id);
      const gbpMeta = parseJsonSafe(gbpAccount?.metadata);
      const placeId =
        (typeof gbpMeta.placeId === 'string' && gbpMeta.placeId) ||
        tenant.googlePlaceId ||
        null;
      const reviewUrl =
        (typeof gbpMeta.newReviewUri === 'string' && gbpMeta.newReviewUri) ||
        tenant.googleBusinessProfileUrl ||
        buildGoogleReviewLink(placeId) ||
        null;

      // Reviews metrics
      const tenantReviews = reviews.filter((r) => r.tenantId === tenant.id);
      let unrepliedOldReviewsCount = 0;
      let latestReviewMs = 0;
      for (const r of tenantReviews) {
        const rCreated = new Date(r.createdAt).getTime();
        if (rCreated > latestReviewMs) latestReviewMs = rCreated;
        const resp = parseJsonSafe(r.responseJson);
        const hasReply = typeof resp.text === 'string' && resp.text.trim().length > 0;
        if (!hasReply && rCreated <= cutoff48hMs) {
          unrepliedOldReviewsCount++;
        }
      }

      // Posts metrics
      const tenantPosts = socialPosts.filter((p) => p.tenantId === tenant.id);
      let publishedPostsCount = 0;
      let latestPostMs = 0;
      for (const p of tenantPosts) {
        if (p.status === 'published') publishedPostsCount++;
        const pTime = new Date(p.publishedAt || p.createdAt).getTime();
        if (pTime > latestPostMs) latestPostMs = pTime;
      }

      // Last meaningful activity timestamp
      const candidateActivityTimes: number[] = [new Date(tenant.createdAt).getTime()];
      for (const u of tenantUsers) {
        if (u.lastLoginAt) candidateActivityTimes.push(new Date(u.lastLoginAt).getTime());
        if (u.lastActivityAt) candidateActivityTimes.push(new Date(u.lastActivityAt).getTime());
      }
      if (latestPostMs > 0) candidateActivityTimes.push(latestPostMs);
      if (latestReviewMs > 0) candidateActivityTimes.push(latestReviewMs);
      const lastActivityAt = new Date(Math.max(...candidateActivityTimes));

      // Sent BGOS history
      const sentHistory: SentHistoryItem[] = [];
      for (const log of logs) {
        if (log.tenantId !== tenant.id) continue;
        const meta = safeParseMeta(log.metadataJson);
        if (meta.product === 'bgos' && meta.emailKey) {
          sentHistory.push({
            emailKey: String(meta.emailKey),
            cycleKey: meta.cycleKey || null,
            sentAt: new Date(log.createdAt),
          });
        }
      }

      snapshots.push({
        tenantId: tenant.id,
        businessName: tenant.name || 'your business',
        recipientEmail,
        recipientName,
        createdAt: new Date(tenant.createdAt),
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null,
        suspendedAt: tenant.suspendedAt ? new Date(tenant.suspendedAt) : null,
        country: tenant.country,
        currency: tenant.currency,
        phone: tenant.phone,
        settingsJson: tenant.settingsJson,
        isPaidActive,
        gbpConnected: Boolean(gbpAccount),
        placeId,
        reviewUrl,
        totalReviewsCount: tenantReviews.length,
        unrepliedOldReviewsCount,
        publishedPostsCount,
        lastActivityAt,
        sentHistory,
      });
    }
  }

  return snapshots;
}

export async function runBgosLifecycleBatch(
  options: BgosBatchRunOptions = {},
): Promise<BgosBatchRunReport> {
  const { dryRun = false, limit = 200, tenantIdFilter } = options;
  const now = new Date();
  const baseUrl = resolveBgosBaseUrl();
  const snapshots = await loadBgosTenantSnapshots(tenantIdFilter);
  const capped = snapshots.slice(0, Math.max(1, limit));

  const results: BgosBatchItemResult[] = [];

  for (const snap of capped) {
    const decision = evaluateBgosLifecycleDecision(snap, now, baseUrl);
    if (decision.action !== 'send' || !decision.emailKey || !decision.cycleKey || !decision.rendered || !decision.category) {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'skipped',
        reason: decision.reason || 'no_rule_matched',
      });
      continue;
    }

    if (snap.recipientEmail && (await isEmailSuppressed(snap.recipientEmail, snap.tenantId))) {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'skipped',
        emailKey: decision.emailKey,
        cycleKey: decision.cycleKey,
        reason: 'email_suppressed',
      });
      continue;
    }

    if (dryRun) {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'would_send',
        emailKey: decision.emailKey,
        cycleKey: decision.cycleKey,
      });
      continue;
    }

    const sendRes = await dispatchBgosEmail({
      tenantId: snap.tenantId,
      to: snap.recipientEmail!,
      recipientName: snap.recipientName || snap.businessName,
      settingsJson: snap.settingsJson,
      emailKey: decision.emailKey,
      cycleKey: decision.cycleKey,
      category: decision.category,
      subject: decision.rendered.subject,
      html: decision.rendered.html,
      text: decision.rendered.text,
      appUrl: baseUrl,
    });

    if (sendRes.sent) {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'sent',
        emailKey: decision.emailKey,
        cycleKey: decision.cycleKey,
      });
    } else if (sendRes.skipped) {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'skipped',
        emailKey: decision.emailKey,
        cycleKey: decision.cycleKey,
        reason: sendRes.reason,
      });
    } else {
      results.push({
        tenantId: snap.tenantId,
        businessName: snap.businessName,
        email: snap.recipientEmail,
        action: 'failed',
        emailKey: decision.emailKey,
        cycleKey: decision.cycleKey,
        error: sendRes.error,
      });
    }
  }

  return {
    ranAt: now.toISOString(),
    dryRun,
    evaluated: results.length,
    sent: results.filter((r) => r.action === 'sent').length,
    wouldSend: results.filter((r) => r.action === 'would_send').length,
    skipped: results.filter((r) => r.action === 'skipped').length,
    failed: results.filter((r) => r.action === 'failed').length,
    results,
  };
}
