import { db } from '@/lib/db';
import type { BgosTenantSnapshot } from '@/lib/emails/bgos/lifecycle';
import { createNotification, shouldDeliverNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/web-push-send';

const UNREPLIED_REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ANY_REVIEW_NOTIF_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BGOS_REVIEWS_ACTION_URL = '/app?product=bgos&view=reviews';

export interface UnrepliedReviewNotificationItem {
  tenantId: string;
  businessName: string;
  pendingCount: number;
  action: 'sent' | 'would_send' | 'skipped';
  reason?: string;
  notificationsCreated: number;
  pushesDelivered: number;
}

export interface UnrepliedReviewNotificationReport {
  evaluatedAt: string;
  dryRun: boolean;
  eligibleTenants: number;
  sentTenants: number;
  wouldSendTenants: number;
  skippedTenants: number;
  notificationsCreated: number;
  pushesDelivered: number;
  results: UnrepliedReviewNotificationItem[];
}

function safeParseJson(raw: string | null | undefined): Record<string, any> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

/**
 * Dispatch Push + In-App Notifications (instead of unsolicited email) for
 * non-suspended BGOS tenants that still have Google reviews awaiting a reply
 * for >48 hours. Respects NotificationPreference (`customer_review`, `inAppEnabled`,
 * `pushEnabled`, quiet hours) and deduplicates for 7 days.
 */
export async function dispatchUnrepliedReviewNotifications(
  snapshots: BgosTenantSnapshot[],
  options: { dryRun?: boolean; now?: Date } = {},
): Promise<UnrepliedReviewNotificationReport> {
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);

  const eligible = snapshots.filter(
    (s) => !s.suspendedAt && s.gbpConnected && s.unrepliedOldReviewsCount >= 1,
  );

  if (eligible.length === 0) {
    return {
      evaluatedAt: now.toISOString(),
      dryRun,
      eligibleTenants: 0,
      sentTenants: 0,
      wouldSendTenants: 0,
      skippedTenants: 0,
      notificationsCreated: 0,
      pushesDelivered: 0,
      results: [],
    };
  }

  const results: UnrepliedReviewNotificationItem[] = [];
  let sentTenants = 0;
  let wouldSendTenants = 0;
  let skippedTenants = 0;
  let totalNotificationsCreated = 0;
  let totalPushesDelivered = 0;

  const sevenDaysAgo = new Date(now.getTime() - UNREPLIED_REMINDER_WINDOW_MS);

  for (let idx = 0; idx < eligible.length; idx += 50) {
    const chunk = eligible.slice(idx, idx + 50);
    const chunkIds = chunk.map((s) => s.tenantId);

    const [users, prefRows, recentNotifs] = await Promise.all([
      typeof (db as any).user?.findMany === 'function'
        ? db.user
            .findMany({
              where: {
                tenantId: { in: chunkIds },
                role: { in: ['owner', 'admin'] },
                isActive: true,
              },
              select: { id: true, tenantId: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof (db as any).notificationPreference?.findMany === 'function'
        ? db.notificationPreference
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
      typeof (db as any).appNotification?.findMany === 'function'
        ? db.appNotification
            .findMany({
              where: {
                tenantId: { in: chunkIds },
                type: 'customer_review',
                createdAt: { gte: sevenDaysAgo },
              },
              select: {
                tenantId: true,
                recipientId: true,
                metadataJson: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 500,
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    for (const snap of chunk) {
      const recipients = (Array.isArray(users) ? users : [])
        .filter((u: any) => u.tenantId === snap.tenantId)
        .slice(0, 10);

      if (recipients.length === 0) {
        skippedTenants++;
        results.push({
          tenantId: snap.tenantId,
          businessName: snap.businessName,
          pendingCount: snap.unrepliedOldReviewsCount,
          action: 'skipped',
          reason: 'no_active_owners',
          notificationsCreated: 0,
          pushesDelivered: 0,
        });
        continue;
      }

      const n = Math.max(1, snap.unrepliedOldReviewsCount);
      const biz = snap.businessName.trim() || 'your business';
      const title = `${n} Google review${n === 1 ? '' : 's'} awaiting your reply`;
      const message = `${n} customer review${n === 1 ? ' on Google has' : 's on Google have'} no reply yet for ${biz}. Open Reviews to reply in 1 click with AI.`;

      let tenantNotificationsCreated = 0;
      let tenantPushesDelivered = 0;
      let skipReason: string | undefined;

      for (const owner of recipients) {
        const ownerNotifs = (Array.isArray(recentNotifs) ? recentNotifs : []).filter(
          (item: any) => item.tenantId === snap.tenantId && item.recipientId === owner.id,
        );

        const recentlyReminded = ownerNotifs.some((item: any) => {
          const meta = safeParseJson(item.metadataJson);
          if (meta.reminderKind === 'unreplied_reviews') return true;
          const createdMs =
            item.createdAt instanceof Date
              ? item.createdAt.getTime()
              : Date.parse(String(item.createdAt));
          return Number.isFinite(createdMs) && now.getTime() - createdMs < ANY_REVIEW_NOTIF_COOLDOWN_MS;
        });

        if (recentlyReminded) {
          skipReason = skipReason || 'already_notified_recently';
          continue;
        }

        const pref = (Array.isArray(prefRows) ? prefRows : []).find(
          (p: any) => p.userId === owner.id && (!p.tenantId || p.tenantId === snap.tenantId),
        );
        if (pref) {
          const typePrefs = safeParseJson(pref.typePrefsJson);
          if (pref.inAppEnabled === false || typePrefs.customer_review === false) {
            skipReason = skipReason || 'opted_out';
            continue;
          }
        }

        const canDeliver =
          typeof (db as any).notificationPreference?.findFirst === 'function'
            ? await shouldDeliverNotification(owner.id, 'customer_review', 'normal').catch(() => true)
            : true;
        if (!canDeliver) {
          skipReason = skipReason || 'opted_out';
          continue;
        }

        if (dryRun) {
          tenantNotificationsCreated++;
          continue;
        }

        const created = await createNotification({
          tenantId: snap.tenantId,
          recipientId: owner.id,
          type: 'customer_review',
          category: 'customer',
          title,
          message,
          actionUrl: BGOS_REVIEWS_ACTION_URL,
          actionLabel: 'Reply to Reviews',
          priority: 'normal',
          senderType: 'system',
          metadataJson: JSON.stringify({
            url: BGOS_REVIEWS_ACTION_URL,
            view: 'reviews',
            reminderKind: 'unreplied_reviews',
            pendingCount: n,
          }),
        }).catch(() => null);

        if (created) {
          tenantNotificationsCreated++;
          totalNotificationsCreated++;
        }

        const pushEnabledForUser = pref ? pref.pushEnabled !== false : true;
        if (pushEnabledForUser) {
          const pushRes = await sendWebPushToUser(owner.id, snap.tenantId, {
            title,
            body: message,
            url: BGOS_REVIEWS_ACTION_URL,
            data: {
              route: '/(tabs)/reviews',
              view: 'reviews',
              reminderKind: 'unreplied_reviews',
              count: n,
            },
            tag: `bgos_unreplied_reviews_${snap.tenantId}`,
            requireInteraction: true,
          }).catch(() => ({ sent: 0, failed: 0, deactivated: 0, notConfigured: false }));

          const sent = pushRes?.sent || 0;
          tenantPushesDelivered += sent;
          totalPushesDelivered += sent;

          if (sent > 0 && created?.id && typeof (db as any).appNotification?.update === 'function') {
            await db.appNotification
              .update({
                where: { id: created.id },
                data: { pushSent: true, pushSentAt: now },
              })
              .catch(() => null);
          }
        }
      }

      if (tenantNotificationsCreated === 0) {
        skippedTenants++;
        results.push({
          tenantId: snap.tenantId,
          businessName: snap.businessName,
          pendingCount: n,
          action: 'skipped',
          reason: skipReason || 'already_notified_or_opted_out',
          notificationsCreated: 0,
          pushesDelivered: 0,
        });
      } else if (dryRun) {
        wouldSendTenants++;
        results.push({
          tenantId: snap.tenantId,
          businessName: snap.businessName,
          pendingCount: n,
          action: 'would_send',
          notificationsCreated: tenantNotificationsCreated,
          pushesDelivered: 0,
        });
      } else {
        sentTenants++;
        results.push({
          tenantId: snap.tenantId,
          businessName: snap.businessName,
          pendingCount: n,
          action: 'sent',
          notificationsCreated: tenantNotificationsCreated,
          pushesDelivered: tenantPushesDelivered,
        });
      }
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    dryRun,
    eligibleTenants: eligible.length,
    sentTenants,
    wouldSendTenants,
    skippedTenants,
    notificationsCreated: totalNotificationsCreated,
    pushesDelivered: totalPushesDelivered,
    results,
  };
}
