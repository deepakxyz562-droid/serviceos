import { db } from '@/lib/db';
import type { SocialAccountData } from '@/lib/social/types';

export type GbpConnectionState =
  | 'connected'
  | 'pending_approval'
  | 'select_profile'
  | 'reconnect_required'
  | 'not_connected';

export const PLACE_PAYLOAD_CACHE = new Map<string, { data: any; expiresAt: number }>();

export function invalidatePlacePayloadCacheForTenant(tenantId?: string) {
  if (!tenantId) {
    PLACE_PAYLOAD_CACHE.clear();
    return;
  }
  for (const key of PLACE_PAYLOAD_CACHE.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      PLACE_PAYLOAD_CACHE.delete(key);
    }
  }
}

/**
 * Determine accurate Google Business Profile connection state without weakening
 * strict multi-profile scoping in prepareGoogleAccount().
 *
 * - 'connected': active GBP account resolved & approved
 * - 'pending_approval': connected Google account awaiting Google API approval
 * - 'select_profile': 1+ active googlebusiness rows exist but tenant must select location
 * - 'reconnect_required': googlebusiness account(s) exist with isActive=false (expired/revoked)
 * - 'not_connected': no googlebusiness SocialAccount rows exist for this tenant
 */
export async function resolveGoogleConnectionState(
  tenantId: string,
  googleAccount: SocialAccountData | null,
): Promise<{
  isConnected: boolean;
  connectionState: GbpConnectionState;
}> {
  if (googleAccount) {
    const meta = (googleAccount.metadata || {}) as Record<string, unknown>;
    return {
      isConnected: true,
      connectionState: meta.pendingApiApproval ? 'pending_approval' : 'connected',
    };
  }

  try {
    const findMany = (db as any)?.socialAccount?.findMany;
    if (typeof findMany === 'function') {
      const accounts = (await findMany({
        where: { tenantId, platform: 'googlebusiness' },
        select: { id: true, isActive: true, accountId: true },
        take: 10,
      })) as Array<{ id: string; isActive?: boolean; accountId?: string }>;

      if (Array.isArray(accounts) && accounts.length > 0) {
        const hasActive = accounts.some((a) => a.isActive !== false);
        return {
          isConnected: false,
          connectionState: hasActive ? 'select_profile' : 'reconnect_required',
        };
      }
    } else {
      const findFirst = (db as any)?.socialAccount?.findFirst;
      if (typeof findFirst === 'function') {
        const account = await findFirst({
          where: { tenantId, platform: 'googlebusiness' },
          select: { id: true, isActive: true },
        });
        if (account) {
          return {
            isConnected: false,
            connectionState: account.isActive !== false ? 'select_profile' : 'reconnect_required',
          };
        }
      }
    }
  } catch (err) {
    console.warn(
      '[resolveGoogleConnectionState] Lookup warning:',
      err instanceof Error ? err.message : err,
    );
  }

  return {
    isConnected: false,
    connectionState: 'not_connected',
  };
}
