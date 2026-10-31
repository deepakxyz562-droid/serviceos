import { prepareGoogleAccount } from './google-account-helper';
import { extractLocationRef } from './adapters/googlebusiness';

/** Exact resource prefix or verified google review record for the tenant. */
export async function googleReviewScope(tenantId: string, locationId?: string) {
  const account = await prepareGoogleAccount(tenantId, locationId);
  if (!account) return { source: 'google' };
  const location = await extractLocationRef(account);
  if (!location?.locationId) return { source: 'google' };

  if (locationId) {
    return {
      OR: [
        { googleReviewId: { startsWith: `locations/${location.locationId}/reviews/` } },
        { googleReviewId: { contains: location.locationId } },
        { responseJson: { contains: location.locationId } },
        { source: 'google' },
      ],
    };
  }

  return {
    OR: [
      { googleReviewId: { startsWith: `locations/${location.locationId}/reviews/` } },
      { googleReviewId: { not: null }, source: 'google' },
      { source: 'google' },
    ],
  };
}

export function reviewLocationId(reviewId: string | null | undefined) {
  return reviewId?.match(/(?:^|\/)locations\/([^/]+)\/reviews\/[^/]+$/)?.[1];
}
