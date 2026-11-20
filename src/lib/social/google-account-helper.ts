import { db } from '@/lib/db';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import type { SocialAccountData } from '@/lib/social/types';

/**
 * Retrieve and prepare the authenticated Google Business Profile account for a tenant.
 * Respects the tenant's active profile setting, decrypts access tokens,
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

  // A saved selection must never silently switch to another business.
  if (activeLocationId && !account) {
    const candidates = await db.socialAccount.findMany({
      where: { tenantId, platform: 'googlebusiness', isActive: true },
    });
    account = candidates.find((candidate) => {
      try {
        const meta = typeof candidate.metadata === 'string' ? JSON.parse(candidate.metadata) : candidate.metadata;
        return String(meta?.locationId || meta?.activeProfileId || '') === String(activeLocationId)
          || meta?.locations?.some((location: any) => String(location.locationId || location.id) === String(activeLocationId));
      } catch { return false; }
    }) || null;
    if (!account) return null;
  }
  if (!account) {
    if (typeof (db as any).socialAccount?.findMany === 'function') {
      const candidates = await db.socialAccount.findMany({
        where: { tenantId, platform: 'googlebusiness', isActive: true },
      });
      if (candidates.length === 1) {
        account = candidates[0];
      } else if (candidates.length > 1) {
        // Smart match against tenant / brand business name if an explicit location hasn't been chosen yet
        const bizName = (tenant?.brandProfile?.businessName || tenant?.name || '').trim().toLowerCase();
        if (bizName) {
          account = candidates.find((c: any) => {
            const accName = (c.accountName || '').toLowerCase();
            let locTitle = '';
            try {
              const m = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
              locTitle = (m?.locationTitle || '').toLowerCase();
            } catch {}
            return (
              accName === bizName ||
              locTitle === bizName ||
              (locTitle && (bizName.includes(locTitle) || locTitle.includes(bizName))) ||
              (accName && (bizName.includes(accName) || accName.includes(bizName)))
            );
          }) || null;
        }
        // If still unresolved, default to the most recently updated active profile
        if (!account && candidates.length > 0) {
          account = candidates[0];
        }
      }
    } else if (typeof (db as any).socialAccount?.findFirst === 'function') {
      account = await db.socialAccount.findFirst({
        where: { tenantId, platform: 'googlebusiness', isActive: true },
      });
    }
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

    if (activeLocationId) metadata.activeProfileId = String(activeLocationId);
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
