import { prepareGoogleAccount } from './google-account-helper';
import { extractLocationRef } from './adapters/googlebusiness';

/** Exact resource prefix; never infer ownership from a review ID suffix. */
export async function googleReviewScope(tenantId: string, locationId?: string) {
  const account = await prepareGoogleAccount(tenantId, locationId);
  if (!account) return { id: { in: [] as string[] } };
  const location = await extractLocationRef(account);
  return { googleReviewId: { startsWith: `locations/${location.locationId}/reviews/` } };
}

export function reviewLocationId(reviewId: string | null | undefined) {
  return reviewId?.match(/(?:^|\/)locations\/([^/]+)\/reviews\/[^/]+$/)?.[1];
}
