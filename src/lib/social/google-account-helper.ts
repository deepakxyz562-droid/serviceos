import { db } from '@/lib/db';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import type { SocialAccountData } from '@/lib/social/types';

/**
 * Retrieve and prepare the authenticated Google Business Profile account for a tenant.
 * Respects the tenant's active profile setting (e.g. FieserOS), decrypts access tokens,
 * and transparently refreshes expired credentials.
 */
export async function prepareGoogleAccount(
  tenantId: string,
  preferredLocationId?: string,
): Promise<SocialAccountData | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });

  let activeLocationId = preferredLocationId;
  if (!activeLocationId && tenant?.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      activeLocationId = parsed.activeGbpLocationId;
    } catch {}
  }

  let account: any = null;

  // 1. Try finding account matching activeLocationId
  if (activeLocationId) {
    account = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: 'googlebusiness',
        isActive: true,
        accountId: activeLocationId,
      },
    });
  }

  // 2. Fallback to FieserOS if no specific account was found
  if (!account) {
    account = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: 'googlebusiness',
        isActive: true,
        OR: [
          { accountId: '10777612572223040949' },
          { accountName: { contains: 'Fieser', mode: 'insensitive' } },
        ],
      },
    });
  }

  // 3. Fallback to most recently updated active googlebusiness account
  if (!account) {
    account = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!account) return null;

  try {
    const rawAccessToken = decryptToken(account.accessToken);
    const rawRefreshToken = account.refreshToken ? decryptToken(account.refreshToken) : undefined;
    let metadata: Record<string, unknown> = {};
    if (typeof account.metadata === 'string') {
      try {
        metadata = JSON.parse(account.metadata);
      } catch {
        metadata = {};
      }
    } else if (account.metadata && typeof account.metadata === 'object') {
      metadata = account.metadata as Record<string, unknown>;
    }

    const accountData: SocialAccountData = {
      id: account.id,
      platform: 'googlebusiness',
      accountId: account.accountId,
      accountName: account.accountName,
      accessToken: rawAccessToken,
      refreshToken: rawRefreshToken,
      tokenExpiry: account.tokenExpiry || undefined,
      metadata,
    };

    return await refreshExpiredToken(accountData);
  } catch (err) {
    console.warn('[prepareGoogleAccount] Error preparing Google account:', err);
    return null;
  }
}
