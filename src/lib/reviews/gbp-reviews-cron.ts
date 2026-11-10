import { db } from '@/lib/db';
import {
  GoogleBusinessNotConnectedError,
  syncGoogleReviewsForTenant,
} from './sync-google-service';

export interface GbpReviewsSyncCronOptions {
  dryRun?: boolean;
  limit?: number;
  tenantIdFilter?: string;
  now?: Date;
}

export interface GbpReviewsSyncTenantOutcome {
  tenantId: string;
  businessName: string;
  status: 'synced' | 'would_sync' | 'skipped' | 'failed';
  reason?: string;
  newReviewsCount: number;
  updatedReviewsCount: number;
  autoRepliesCount: number;
  notificationsCreated: number;
  pushesDelivered: number;
  error?: string;
}

export interface GbpReviewsSyncCronReport {
  ranAt: string;
  dryRun: boolean;
  tenantsEvaluated: number;
  syncedTenants: number;
  wouldSyncTenants: number;
  skippedTenants: number;
  failedTenants: number;
  totalNewReviews: number;
  totalNotificationsCreated: number;
  totalPushesDelivered: number;
  results: GbpReviewsSyncTenantOutcome[];
}

function parseActiveLocationId(settingsJson: string | null | undefined): string | undefined {
  if (!settingsJson) return undefined;
  try {
    const parsed = JSON.parse(settingsJson);
    return typeof parsed?.activeGbpLocationId === 'string' && parsed.activeGbpLocationId
      ? parsed.activeGbpLocationId
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Background Google Business Profile review sync cron runner.
 * Polls active GBP-connected non-suspended tenants, imports new reviews into
 * `Review`, triggers optional AI auto-replies, and dispatches in-app + mobile/web
 * push alerts immediately instead of relying on manual UI sync or batch emails.
 */
export async function runGbpReviewsSyncCron(
  options: GbpReviewsSyncCronOptions = {},
): Promise<GbpReviewsSyncCronReport> {
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));

  const gbpAccounts = await db.socialAccount.findMany({
    where: {
      platform: 'googlebusiness',
      isActive: true,
      ...(options.tenantIdFilter ? { tenantId: options.tenantIdFilter } : {}),
    },
    select: {
      tenantId: true,
      accountId: true,
    },
    take: limit * 3,
  });

  const accountsByTenant = new Map<string, string[]>();
  for (const row of gbpAccounts) {
    if (!row.tenantId) continue;
    const list = accountsByTenant.get(row.tenantId) || [];
    if (row.accountId && !list.includes(row.accountId)) {
      list.push(row.accountId);
    }
    accountsByTenant.set(row.tenantId, list);
  }

  const candidateTenantIds = Array.from(accountsByTenant.keys()).slice(0, limit);
  if (candidateTenantIds.length === 0) {
    return {
      ranAt: now.toISOString(),
      dryRun,
      tenantsEvaluated: 0,
      syncedTenants: 0,
      wouldSyncTenants: 0,
      skippedTenants: 0,
      failedTenants: 0,
      totalNewReviews: 0,
      totalNotificationsCreated: 0,
      totalPushesDelivered: 0,
      results: [],
    };
  }

  const tenants = await db.tenant.findMany({
    where: { id: { in: candidateTenantIds } },
    select: {
      id: true,
      name: true,
      suspendedAt: true,
      settingsJson: true,
    },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const results: GbpReviewsSyncTenantOutcome[] = [];
  let totalNewReviews = 0;
  let totalNotificationsCreated = 0;
  let totalPushesDelivered = 0;

  for (const tenantId of candidateTenantIds) {
    const tenant = tenantMap.get(tenantId);
    const businessName = tenant?.name || 'Your Business';

    if (!tenant || tenant.suspendedAt) {
      results.push({
        tenantId,
        businessName,
        status: 'skipped',
        reason: tenant ? 'tenant_suspended' : 'tenant_not_found',
        newReviewsCount: 0,
        updatedReviewsCount: 0,
        autoRepliesCount: 0,
        notificationsCreated: 0,
        pushesDelivered: 0,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        tenantId,
        businessName,
        status: 'would_sync',
        newReviewsCount: 0,
        updatedReviewsCount: 0,
        autoRepliesCount: 0,
        notificationsCreated: 0,
        pushesDelivered: 0,
      });
      continue;
    }

    const accountIds = accountsByTenant.get(tenantId) || [];
    const activeLoc = parseActiveLocationId(tenant.settingsJson);
    const targetLocationIds: Array<string | undefined> =
      accountIds.length > 1 && !activeLoc ? accountIds : [activeLoc];

    let newReviewsCount = 0;
    let updatedReviewsCount = 0;
    let autoRepliesCount = 0;
    let notificationsCreated = 0;
    let pushesDelivered = 0;
    let skippedNoAccount = false;
    let lastError: string | undefined;

    for (const preferredLocationId of targetLocationIds) {
      try {
        const res = await syncGoogleReviewsForTenant({
          tenantId,
          preferredLocationId,
          now,
        });
        newReviewsCount += res.newReviewsCount;
        updatedReviewsCount += res.updatedReviewsCount;
        autoRepliesCount += res.autoRepliesCount;
        notificationsCreated += res.notificationsCreated;
        pushesDelivered += res.pushesDelivered;
      } catch (err) {
        if (err instanceof GoogleBusinessNotConnectedError) {
          skippedNoAccount = true;
        } else {
          lastError = err instanceof Error ? err.message : String(err);
          console.warn(`[cron/gbp-reviews-sync] Failed for tenant ${tenantId}:`, lastError);
        }
      }
    }

    totalNewReviews += newReviewsCount;
    totalNotificationsCreated += notificationsCreated;
    totalPushesDelivered += pushesDelivered;

    if (lastError && newReviewsCount === 0 && updatedReviewsCount === 0) {
      results.push({
        tenantId,
        businessName,
        status: 'failed',
        error: lastError,
        newReviewsCount,
        updatedReviewsCount,
        autoRepliesCount,
        notificationsCreated,
        pushesDelivered,
      });
    } else if (skippedNoAccount && newReviewsCount === 0 && updatedReviewsCount === 0) {
      results.push({
        tenantId,
        businessName,
        status: 'skipped',
        reason: 'no_google_account',
        newReviewsCount: 0,
        updatedReviewsCount: 0,
        autoRepliesCount: 0,
        notificationsCreated: 0,
        pushesDelivered: 0,
      });
    } else {
      results.push({
        tenantId,
        businessName,
        status: 'synced',
        newReviewsCount,
        updatedReviewsCount,
        autoRepliesCount,
        notificationsCreated,
        pushesDelivered,
        ...(lastError ? { error: lastError } : {}),
      });
    }
  }

  return {
    ranAt: now.toISOString(),
    dryRun,
    tenantsEvaluated: results.length,
    syncedTenants: results.filter((r) => r.status === 'synced').length,
    wouldSyncTenants: results.filter((r) => r.status === 'would_sync').length,
    skippedTenants: results.filter((r) => r.status === 'skipped').length,
    failedTenants: results.filter((r) => r.status === 'failed').length,
    totalNewReviews,
    totalNotificationsCreated,
    totalPushesDelivered,
    results,
  };
}
