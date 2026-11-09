/**
 * BGOS Daily Post & Promotional Push Notification Engine
 * ======================================================
 * Sends at most 1 contextual daily post / promotional push notification per day
 * during the tenant's local morning window (09:30–11:30 local time) to entitled
 * BGOS tenants (active 7-day trial or active paid Razorpay/Creem plan) that have
 * not yet created or scheduled a post today and haven't opted out.
 */

import { db } from '@/lib/db';
import { evaluateBgosEntitlement } from '@/lib/bgos-entitlement';
import {
  computeLocalScheduledDate,
  getLocalDateParts,
  resolveTenantLocale,
} from '@/lib/locale-timezone';
import { createNotification, shouldDeliverNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/web-push-send';

export interface DailyPromoCopy {
  title: string;
  body: string;
  themeKey: string;
}

export interface DailyPushRunOptions {
  now?: Date;
  dryRun?: boolean;
  ignoreTimeWindow?: boolean;
  tenantIdFilter?: string;
  limit?: number;
}

export interface DailyPushTenantResult {
  tenantId: string;
  businessName: string;
  timeZone: string;
  action: 'sent' | 'would_send' | 'skipped';
  reason?: string;
  recipientsNotified: number;
  pushSentCount: number;
}

export interface DailyPushBatchReport {
  evaluatedAt: string;
  dryRun: boolean;
  ignoreTimeWindow: boolean;
  tenantsEvaluated: number;
  sentTenants: number;
  wouldSendTenants: number;
  skippedTenants: number;
  notificationsCreated: number;
  pushesDelivered: number;
  results: DailyPushTenantResult[];
}

const DAILY_ACTION_URL = '/app?product=bgos&view=socialMedia&socialTab=ai-content';

export function buildDailyPromoPushCopy(params: {
  businessName: string;
  industry?: string | null;
  now?: Date;
  localMonth?: number;
  localDay?: number;
}): DailyPromoCopy {
  const biz = (params.businessName || 'your business').trim();
  const ind = (params.industry || '').trim();
  const indSnippet = ind ? `${ind.toLowerCase()} ` : '';
  const refDate = params.now ?? new Date();
  const daySeed =
    typeof params.localDay === 'number' && typeof params.localMonth === 'number'
      ? params.localMonth * 31 + params.localDay
      : Math.floor(refDate.getTime() / (24 * 60 * 60 * 1000));

  const templates: DailyPromoCopy[] = [
    {
      themeKey: 'monday_boost',
      title: `Post today's update for ${biz}`,
      body: `Share a quick Google post or seasonal promo today to attract more nearby customers to ${biz}.`,
    },
    {
      themeKey: 'fresh_photo',
      title: `Keep ${biz} visible on Google Maps`,
      body: `Uploading a fresh ${indSnippet}photo or short video today helps your Google profile win more calls & direction clicks.`,
    },
    {
      themeKey: 'midweek_offer',
      title: `Launch a quick mid-week offer`,
      body: `Turn a 10% deal or featured service for ${biz} into an AI poster in seconds and publish straight to Google.`,
    },
    {
      themeKey: 'trust_story',
      title: `Share what sets ${biz} apart`,
      body: `Publish a helpful ${indSnippet}tip or customer highlight today so locals choose ${biz} first.`,
    },
    {
      themeKey: 'weekend_special',
      title: `Promote your weekend availability`,
      body: `Post a crisp weekend promo or booking reminder for ${biz} before peak local searches kick in.`,
    },
    {
      themeKey: 'ai_poster_idea',
      title: `Ready-to-post idea for ${biz}`,
      body: `Open AI Studio to generate a branded poster and caption for ${biz} in one tap.`,
    },
    {
      themeKey: 'weekly_plan',
      title: `Stay active on Google this week`,
      body: `Schedule a couple of posts for ${biz} today so your profile stays active all week automatically.`,
    },
  ];

  const idx = ((daySeed % templates.length) + templates.length) % templates.length;
  return templates[idx];
}

export function computeLocalDayBoundsUtc(
  now: Date,
  timeZone: string,
): { dayStartUtc: Date; dayEndUtc: Date } {
  const dayStartUtc = computeLocalScheduledDate({
    dayOffset: 0,
    hour: 0,
    minute: 0,
    timeZone,
    now,
  });
  const dayEndUtc = computeLocalScheduledDate({
    dayOffset: 1,
    hour: 0,
    minute: 0,
    timeZone,
    now,
  });
  return { dayStartUtc, dayEndUtc };
}

function isWithinLocalWindow(dateVal: Date | string | null | undefined, startMs: number, endMs: number): boolean {
  if (!dateVal) return false;
  const ms = dateVal instanceof Date ? dateVal.getTime() : Date.parse(String(dateVal));
  return Number.isFinite(ms) && ms >= startMs && ms < endMs;
}

function parseTypePrefs(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function discoverBgosTenantWorkspaces(
  tenantIdFilter?: string,
  limit = 200,
): Promise<{ tenantIds: string[]; workspaceIdsByTenant: Map<string, string[]> }> {
  const workspaceIdsByTenant = new Map<string, string[]>();

  if (tenantIdFilter) {
    if (typeof (db as any).productWorkspace?.findMany === 'function') {
      const pws = await (db as any).productWorkspace
        .findMany({
          where: { tenantId: tenantIdFilter, product: 'bgos' },
          select: { workspaceId: true },
        })
        .catch(() => []);
      workspaceIdsByTenant.set(
        tenantIdFilter,
        Array.isArray(pws) ? pws.map((p: any) => p.workspaceId).filter(Boolean) : [],
      );
    }
    return { tenantIds: [tenantIdFilter], workspaceIdsByTenant };
  }

  const hasWorkspace = typeof (db as any).workspace?.findMany === 'function';
  const hasProdWs = typeof (db as any).productWorkspace?.findMany === 'function';

  if (hasWorkspace || hasProdWs) {
    const tenantIdSet = new Set<string>();
    const [wss, pws] = await Promise.all([
      hasWorkspace
        ? (db as any).workspace
            .findMany({ where: { productType: 'bgos' }, select: { id: true, tenantId: true } })
            .catch(() => [])
        : Promise.resolve([]),
      hasProdWs
        ? (db as any).productWorkspace
            .findMany({ where: { product: 'bgos' }, select: { workspaceId: true, tenantId: true } })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    for (const w of Array.isArray(wss) ? wss : []) {
      if (!w?.tenantId) continue;
      tenantIdSet.add(w.tenantId);
      const list = workspaceIdsByTenant.get(w.tenantId) || [];
      if (w.id && !list.includes(w.id)) list.push(w.id);
      workspaceIdsByTenant.set(w.tenantId, list);
    }

    const orphanWsIds: string[] = [];
    for (const pw of Array.isArray(pws) ? pws : []) {
      if (pw?.tenantId) {
        tenantIdSet.add(pw.tenantId);
        const list = workspaceIdsByTenant.get(pw.tenantId) || [];
        if (pw.workspaceId && !list.includes(pw.workspaceId)) list.push(pw.workspaceId);
        workspaceIdsByTenant.set(pw.tenantId, list);
      } else if (pw?.workspaceId) {
        orphanWsIds.push(pw.workspaceId);
      }
    }

    if (orphanWsIds.length > 0 && hasWorkspace) {
      const resolvedWs = await (db as any).workspace
        .findMany({ where: { id: { in: orphanWsIds } }, select: { id: true, tenantId: true } })
        .catch(() => []);
      for (const w of Array.isArray(resolvedWs) ? resolvedWs : []) {
        if (!w?.tenantId) continue;
        tenantIdSet.add(w.tenantId);
        const list = workspaceIdsByTenant.get(w.tenantId) || [];
        if (w.id && !list.includes(w.id)) list.push(w.id);
        workspaceIdsByTenant.set(w.tenantId, list);
      }
    }

    return {
      tenantIds: Array.from(tenantIdSet).slice(0, Math.max(1, limit)),
      workspaceIdsByTenant,
    };
  }

  // Fallback for minimal mock DB environments without workspace/productWorkspace tables
  if (typeof (db as any).tenant?.findMany === 'function') {
    const tenants = await (db as any).tenant
      .findMany({
        where: { suspendedAt: null },
        select: { id: true },
        take: Math.max(1, limit),
      })
      .catch(() => []);
    return {
      tenantIds: (Array.isArray(tenants) ? tenants : []).map((t: any) => t.id).filter(Boolean),
      workspaceIdsByTenant,
    };
  }

  return { tenantIds: [], workspaceIdsByTenant };
}

export async function runBgosDailyPushBatch(
  options: DailyPushRunOptions = {},
): Promise<DailyPushBatchReport> {
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);
  const ignoreTimeWindow = Boolean(options.ignoreTimeWindow);
  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));

  const { tenantIds, workspaceIdsByTenant } = await discoverBgosTenantWorkspaces(
    options.tenantIdFilter,
    limit,
  );

  const results: DailyPushTenantResult[] = [];
  let sentTenants = 0;
  let wouldSendTenants = 0;
  let skippedTenants = 0;
  let notificationsCreated = 0;
  let pushesDelivered = 0;

  const lookbackStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  for (let idx = 0; idx < tenantIds.length; idx += 50) {
    const chunkIds = tenantIds.slice(idx, idx + 50);
    const chunkWsIds: string[] = [];
    for (const tid of chunkIds) {
      for (const wid of workspaceIdsByTenant.get(tid) || []) {
        chunkWsIds.push(wid);
      }
    }

    const [
      tenants,
      users,
      subscriptions,
      productSubscriptions,
      brandProfiles,
      recentPosts,
      recentDailyNotifs,
      prefsRows,
    ] = await Promise.all([
      typeof (db as any).tenant?.findMany === 'function'
        ? (db as any).tenant
            .findMany({
              where: { id: { in: chunkIds } },
              select: {
                id: true,
                name: true,
                country: true,
                settingsJson: true,
                plan: true,
                planStatus: true,
                trialEndsAt: true,
                planEndsAt: true,
                suspendedAt: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).user?.findMany === 'function'
        ? (db as any).user
            .findMany({
              where: { tenantId: { in: chunkIds }, isActive: true, role: { not: 'customer' } },
              select: { id: true, tenantId: true, name: true, role: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).subscription?.findMany === 'function'
        ? (db as any).subscription
            .findMany({
              where: { tenantId: { in: chunkIds } },
              select: {
                tenantId: true,
                plan: true,
                status: true,
                trialEndsAt: true,
                endDate: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            })
            .catch(() => [])
        : Promise.resolve([]),
      chunkWsIds.length > 0 && typeof (db as any).productSubscription?.findMany === 'function'
        ? (db as any).productSubscription
            .findMany({
              where: { workspaceId: { in: chunkWsIds } },
              select: {
                workspaceId: true,
                plan: true,
                status: true,
                trialEndsAt: true,
                currentPeriodEnd: true,
                billingSource: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).brandProfile?.findMany === 'function'
        ? (db as any).brandProfile
            .findMany({
              where: { tenantId: { in: chunkIds } },
              select: { tenantId: true, businessName: true, industry: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).socialPost?.findMany === 'function'
        ? (db as any).socialPost
            .findMany({
              where: {
                tenantId: { in: chunkIds },
                status: { in: ['scheduled', 'publishing', 'published', 'partial'] },
                OR: [
                  { createdAt: { gte: lookbackStart } },
                  { scheduledAt: { gte: lookbackStart } },
                  { publishedAt: { gte: lookbackStart } },
                ],
              },
              select: {
                id: true,
                tenantId: true,
                status: true,
                createdAt: true,
                scheduledAt: true,
                publishedAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 500,
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).appNotification?.findMany === 'function'
        ? (db as any).appNotification
            .findMany({
              where: {
                tenantId: { in: chunkIds },
                type: 'daily_growth_tips',
                createdAt: { gte: lookbackStart },
              },
              select: { tenantId: true, recipientId: true, createdAt: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).notificationPreference?.findMany === 'function'
        ? (db as any).notificationPreference
            .findMany({
              where: { tenantId: { in: chunkIds } },
              select: {
                tenantId: true,
                userId: true,
                inAppEnabled: true,
                pushEnabled: true,
                typePrefsJson: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    for (const tenant of Array.isArray(tenants) ? tenants : []) {
      const brand = (Array.isArray(brandProfiles) ? brandProfiles : []).find(
        (b: any) => b.tenantId === tenant.id,
      );
      const businessName = brand?.businessName || tenant.name || 'Your Business';
      const locale = resolveTenantLocale({
        tenantCountry: tenant.country,
        settingsJson: tenant.settingsJson,
      });

      if (tenant.suspendedAt) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: 'tenant_suspended',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
        continue;
      }

      const tenantSub = (Array.isArray(subscriptions) ? subscriptions : []).find(
        (s: any) => s.tenantId === tenant.id,
      );
      const tWsIds = workspaceIdsByTenant.get(tenant.id) || [];
      const tenantProdSub = (Array.isArray(productSubscriptions) ? productSubscriptions : []).find(
        (ps: any) => tWsIds.includes(ps.workspaceId),
      );

      const entitlement = evaluateBgosEntitlement({
        tenant,
        subscription: tenantSub ?? null,
        productSubscription: tenantProdSub ?? null,
        now,
      });

      if (!entitlement.entitled) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: 'not_entitled',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
        continue;
      }

      const localParts = getLocalDateParts(now, locale.timeZone);
      const localMinutes = localParts.hour * 60 + localParts.minute;
      // Local morning window: 09:30 (570m) to 11:30 (690m)
      if (!ignoreTimeWindow && (localMinutes < 570 || localMinutes > 690)) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: 'outside_morning_window',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
        continue;
      }

      const { dayStartUtc, dayEndUtc } = computeLocalDayBoundsUtc(now, locale.timeZone);
      const dayStartMs = dayStartUtc.getTime();
      const dayEndMs = dayEndUtc.getTime();

      const tenantPosts = (Array.isArray(recentPosts) ? recentPosts : []).filter(
        (p: any) => p.tenantId === tenant.id,
      );
      const hasPostToday = tenantPosts.some(
        (p: any) =>
          isWithinLocalWindow(p.publishedAt, dayStartMs, dayEndMs) ||
          isWithinLocalWindow(p.scheduledAt, dayStartMs, dayEndMs) ||
          isWithinLocalWindow(p.createdAt, dayStartMs, dayEndMs),
      );

      if (hasPostToday) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: 'already_posted_today',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
        continue;
      }

      const recipients = (Array.isArray(users) ? users : [])
        .filter((u: any) => u.tenantId === tenant.id && u.role !== 'customer')
        .slice(0, 10);

      if (recipients.length === 0) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: 'no_active_users',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
        continue;
      }

      const copy = buildDailyPromoPushCopy({
        businessName,
        industry: brand?.industry,
        now,
        localMonth: localParts.month,
        localDay: localParts.day,
      });

      let tenantRecipientsNotified = 0;
      let tenantPushesSent = 0;
      let skipReasonForTenant: string | undefined;

      for (const user of recipients) {
        const alreadySentToday = (Array.isArray(recentDailyNotifs) ? recentDailyNotifs : []).some(
          (n: any) =>
            n.tenantId === tenant.id &&
            n.recipientId === user.id &&
            isWithinLocalWindow(n.createdAt, dayStartMs, dayEndMs),
        );
        if (alreadySentToday) {
          skipReasonForTenant = skipReasonForTenant || 'already_sent_today';
          continue;
        }

        const pref = (Array.isArray(prefsRows) ? prefsRows : []).find(
          (pr: any) => pr.userId === user.id && (!pr.tenantId || pr.tenantId === tenant.id),
        );
        if (pref) {
          const typePrefs = parseTypePrefs(pref.typePrefsJson);
          if (typePrefs.daily_growth_tips === false || pref.inAppEnabled === false) {
            skipReasonForTenant = skipReasonForTenant || 'opted_out';
            continue;
          }
        }

        const canDeliver =
          typeof (db as any).notificationPreference?.findFirst === 'function'
            ? await shouldDeliverNotification(user.id, 'daily_growth_tips', 'normal').catch(() => true)
            : true;

        if (!canDeliver) {
          skipReasonForTenant = skipReasonForTenant || 'opted_out';
          continue;
        }

        if (dryRun) {
          tenantRecipientsNotified++;
          continue;
        }

        const created = await createNotification({
          tenantId: tenant.id,
          recipientId: user.id,
          type: 'daily_growth_tips',
          category: 'workflow',
          title: copy.title,
          message: copy.body,
          actionUrl: DAILY_ACTION_URL,
          actionLabel: 'Create Post',
          metadataJson: JSON.stringify({
            themeKey: copy.themeKey,
            url: DAILY_ACTION_URL,
          }),
        }).catch(() => null);

        if (created) {
          notificationsCreated++;
          tenantRecipientsNotified++;
        }

        const pushEnabledForUser = pref ? pref.pushEnabled !== false : true;
        if (pushEnabledForUser && typeof (db as any).pushSubscription?.findMany === 'function') {
          const pushRes = await sendWebPushToUser(user.id, tenant.id, {
            title: copy.title,
            body: copy.body,
            url: DAILY_ACTION_URL,
            tag: 'bgos-daily-push',
            data: {
              route: '/(tabs)/marketing',
              mode: 'studio',
              themeKey: copy.themeKey,
            },
          }).catch(() => ({ sent: 0, failed: 0, deactivated: 0, notConfigured: false }));
          tenantPushesSent += pushRes.sent || 0;
          pushesDelivered += pushRes.sent || 0;
        }
      }

      if (tenantRecipientsNotified === 0) {
        skippedTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'skipped',
          reason: skipReasonForTenant || 'already_sent_or_opted_out',
          recipientsNotified: 0,
          pushSentCount: 0,
        });
      } else if (dryRun) {
        wouldSendTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'would_send',
          recipientsNotified: tenantRecipientsNotified,
          pushSentCount: 0,
        });
      } else {
        sentTenants++;
        results.push({
          tenantId: tenant.id,
          businessName,
          timeZone: locale.timeZone,
          action: 'sent',
          recipientsNotified: tenantRecipientsNotified,
          pushSentCount: tenantPushesSent,
        });
      }
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    dryRun,
    ignoreTimeWindow,
    tenantsEvaluated: results.length,
    sentTenants,
    wouldSendTenants,
    skippedTenants,
    notificationsCreated,
    pushesDelivered,
    results,
  };
}
