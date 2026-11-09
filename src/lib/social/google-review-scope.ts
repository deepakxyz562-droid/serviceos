import { db } from '@/lib/db';
import { prepareGoogleAccount } from './google-account-helper';
import { extractLocationRef } from './adapters/googlebusiness';

/** Exact resource prefix or verified google review record for the tenant. */
export async function googleReviewScope(tenantId: string, locationId?: string) {
  const account = await prepareGoogleAccount(tenantId, locationId);
  if (!account) return { source: 'google' };

  // Count active Google Business accounts for this workspace
  let gbpAccountCount = 1;
  try {
    gbpAccountCount = await db.socialAccount.count({
      where: { tenantId, platform: 'googlebusiness', isActive: true },
    });
  } catch {}

  let resolvedLocationId: string | undefined;
  try {
    const location = await extractLocationRef(account);
    if (location && typeof location === 'object' && typeof location.locationId === 'string') {
      resolvedLocationId = location.locationId;
    }
  } catch (err: unknown) {
    console.warn(
      '[googleReviewScope] extractLocationRef warning:',
      err instanceof Error ? err.message : err,
    );
  }

  if (!resolvedLocationId) {
    const meta = (account.metadata || {}) as Record<string, unknown>;
    const rawFallback =
      (locationId && locationId !== 'all' ? locationId : undefined) ||
      (typeof meta.locationId === 'string' ? meta.locationId : undefined) ||
      (typeof meta.activeProfileId === 'string' ? meta.activeProfileId : undefined) ||
      (typeof account.accountId === 'string' ? account.accountId : undefined);
    const candidate = rawFallback
      ? rawFallback.replace(/^locations\//, '').split('/').pop()?.trim()
      : undefined;
    if (candidate && candidate !== 'primary' && candidate !== '5008' && candidate !== 'all') {
      resolvedLocationId = candidate;
    }
  }

  if (!resolvedLocationId) {
    if (gbpAccountCount <= 1 && !locationId) {
      return { source: 'google' };
    }
    return { googleReviewId: '__missing_gbp_location__' };
  }

  const locationConditions: Array<Record<string, unknown>> = [
    { googleReviewId: { startsWith: `locations/${resolvedLocationId}/reviews/` } },
    { googleReviewId: { contains: resolvedLocationId } },
    { responseJson: { contains: resolvedLocationId } },
  ];

  // Only allow unscoped fallback if the tenant has only 1 Google Business account
  // and no specific location was requested. If multiple accounts exist, reviews
  // MUST strictly match the active location to prevent cross-profile leakage.
  if (gbpAccountCount <= 1 && !locationId) {
    locationConditions.push({ source: 'google' });
  }

  return {
    OR: locationConditions,
  };
}

export function reviewLocationId(reviewId: string | null | undefined) {
  return reviewId?.match(/(?:^|\/)locations\/([^/]+)\/reviews\/[^/]+$/)?.[1];
}
