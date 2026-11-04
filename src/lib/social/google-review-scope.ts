import { db } from '@/lib/db';
import { prepareGoogleAccount } from './google-account-helper';
import { extractLocationRef } from './adapters/googlebusiness';

/** Exact resource prefix or verified google review record for the tenant. */
export async function googleReviewScope(tenantId: string, locationId?: string) {
  const account = await prepareGoogleAccount(tenantId, locationId);
  if (!account) return { source: 'google' };
  const location = await extractLocationRef(account);
  if (!location?.locationId) return { source: 'google' };

  // Count active Google Business accounts for this workspace
  let gbpAccountCount = 1;
  try {
    gbpAccountCount = await db.socialAccount.count({
      where: { tenantId, platform: 'googlebusiness', isActive: true },
    });
  } catch {}

  const locationConditions: Array<Record<string, unknown>> = [
    { googleReviewId: { startsWith: `locations/${location.locationId}/reviews/` } },
    { googleReviewId: { contains: location.locationId } },
    { responseJson: { contains: location.locationId } },
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
