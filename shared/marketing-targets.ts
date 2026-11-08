export type PublishingAccount = {
  id: string;
  platform: string;
  accountName?: string;
  accountId?: string;
  isActive: boolean;
};

export type PublishingTarget = {
  platform: string;
  socialAccountId: string;
};

export const SUPPORTED_PUBLISHING_PLATFORMS = [
  'googlebusiness',
  'facebook',
  'instagram',
  'linkedin',
  'pinterest',
  'twitter',
  'threads',
] as const;

/**
 * Filter accounts down to active, user-selected targets.
 */
export function publishingTargets(
  accounts: PublishingAccount[],
  selectedIds: string[]
): PublishingTarget[] {
  const selected = new Set(selectedIds);
  return accounts
    .filter(
      (a) =>
        a.isActive &&
        selected.has(a.id) &&
        SUPPORTED_PUBLISHING_PLATFORMS.includes(a.platform as (typeof SUPPORTED_PUBLISHING_PLATFORMS)[number])
    )
    .map((a) => ({
      platform: a.platform,
      socialAccountId: a.id,
    }));
}

/**
 * Resolve the selected account IDs.
 * When requireExplicitSelection is true (or user sets manual selection),
 * requires the user to explicitly pick their account without silent auto-selection.
 */
export function selectedPublishingIds(
  accounts: PublishingAccount[],
  manualIds: string[] | null,
  savedGoogleAccountId?: string | null,
  options?: { requireExplicitSelection?: boolean }
): string[] {
  if (manualIds !== null) {
    const validIds = new Set(accounts.filter((a) => a.isActive).map((a) => a.id));
    return manualIds.filter((id) => validIds.has(id));
  }

  if (options?.requireExplicitSelection) {
    return [];
  }

  const selected: string[] = [];
  const googleAccount =
    (savedGoogleAccountId &&
      accounts.find((a) => a.id === savedGoogleAccountId && a.platform === 'googlebusiness' && a.isActive)) ||
    accounts.find((a) => a.platform === 'googlebusiness' && a.isActive);

  if (googleAccount) {
    selected.push(googleAccount.id);
  }

  return selected;
}
