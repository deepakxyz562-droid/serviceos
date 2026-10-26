/**
 * Social Publishing — Token Refresh Helper
 * ----------------------------------------
 *
 * Most platforms issue short-lived access tokens (1-2 hours for Google,
 * LinkedIn, X; 60 days for Facebook Page tokens after the 2023 deprecation
 * of indefinite tokens). Each adapter that supports refresh implements
 * `adapter.refreshToken()`; this helper orchestrates the "is the token
 * about to expire? → refresh → persist new token → return updated account"
 * flow.
 *
 * DESIGN:
 *   - "About to expire" = less than 5 minutes from now. The 5-minute
 *     buffer covers the time between the refresh check and the actual
 *     publish API call (network + signing + retries).
 *   - If the adapter has no `refreshToken` implementation (e.g. Facebook
 *     uses long-lived page tokens that don't expire for 60 days), the
 *     account is returned as-is. The publisher will attempt the publish
 *     and the platform will return a 401 if the token really is expired
 *     — that's caught and recorded as a per-target failure.
 *   - On successful refresh, the new tokens are persisted to the DB
 *     (encrypted) BEFORE the publish attempt, so even if the publish
 *     crashes, the next attempt uses the fresh token.
 *   - On refresh FAILURE, the account is marked `isActive=false` and
 *     the error is thrown — the publisher catches it and records the
 *     target as failed with a clear "token refresh failed" reason.
 *
 * This module is server-only (imports db + crypto).
 */
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import { ensureAdaptersLoaded, getAdapter } from '@/lib/social/registry';
import type { SocialAccountData } from '@/lib/social/types';

/** Refresh threshold — tokens with <5min remaining are refreshed. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Safely parse any date representation (Date instance, ISO string, timestamp number)
 * into a valid Date, or undefined if invalid or missing.
 */
export function normalizeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/**
 * Determine whether a token is expired or about to expire.
 *
 * `undefined` or unparseable expiry → conservatively assume still valid (some platforms
 * don't return an expiry; the publish will fail with 401 if it's stale).
 */
export function isExpiringSoon(expiry: unknown): boolean {
  const expiryDate = normalizeDate(expiry);
  if (!expiryDate) return false;
  const now = Date.now();
  return expiryDate.getTime() - now < REFRESH_BUFFER_MS;
}

/**
 * Refresh the access token for a SocialAccount if it's about to expire.
 *
 * Returns the (possibly updated) account data — callers should use the
 * returned object's `accessToken` for the actual API call, NOT the input.
 *
 * Behaviour:
 *   - Token still valid (>5min remaining) → return account as-is.
 *   - Token expiring soon AND adapter implements refreshToken → refresh,
 *     persist new encrypted tokens, return updated account data.
 *   - Token expiring soon AND adapter has no refreshToken → return
 *     account as-is (publish may fail with 401 — that's OK).
 *   - Refresh attempt fails → mark SocialAccount.isActive=false in DB,
 *     throw the error so the publisher records the target as failed.
 *
 * NEVER throws silently — all errors propagate to the publisher, which
 * catches them per-target so one expired account doesn't block others.
 */
export async function refreshExpiredToken(
  account: SocialAccountData,
): Promise<SocialAccountData> {
  const normalizedAccount: SocialAccountData = {
    ...account,
    tokenExpiry: normalizeDate(account.tokenExpiry),
  };

  // Fast path: token is still valid.
  if (!isExpiringSoon(normalizedAccount.tokenExpiry)) {
    return normalizedAccount;
  }

  // Make sure adapter modules are loaded (lazy bootstrap on first call).
  await ensureAdaptersLoaded();

  const adapter = getAdapter(normalizedAccount.platform);
  if (!adapter) {
    // No adapter for this platform — can't refresh. Return as-is and
    // let the publish attempt fail with a clearer "no adapter" error.
    return normalizedAccount;
  }

  if (!adapter.refreshToken) {
    // Adapter doesn't support refresh (e.g. Facebook long-lived page
    // tokens). Return as-is; publish will fail with 401 if truly expired.
    return normalizedAccount;
  }

  let refreshResult: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  };

  try {
    refreshResult = await adapter.refreshToken(normalizedAccount);
  } catch (err) {
    // Refresh failed — mark the account inactive so the user sees a
    // "reconnect required" banner in the UI, then propagate the error.
    await markAccountInactive(normalizedAccount.id, err);
    throw new Error(
      `Token refresh failed for ${normalizedAccount.platform} account ${normalizedAccount.accountName}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Persist the new tokens (encrypted at rest) so future publishes skip
  // the refresh step. Best-effort: if the DB write fails, we still return
  // the in-memory refreshed credentials so THIS publish can succeed.
  try {
    await db.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encryptToken(refreshResult.accessToken),
        refreshToken: refreshResult.refreshToken
          ? encryptToken(refreshResult.refreshToken)
          : undefined,
        tokenExpiry: refreshResult.tokenExpiry ?? undefined,
        isActive: true,
      },
    });
  } catch (persistErr) {
    console.warn(
      `[social/token-refresh] Failed to persist refreshed token for account ${account.id} ` +
        `(publish will still proceed with in-memory token):`,
      persistErr,
    );
  }

  // Return the account with fresh credentials for the caller to use.
  return {
    ...account,
    accessToken: refreshResult.accessToken,
    refreshToken: refreshResult.refreshToken ?? account.refreshToken,
    tokenExpiry: normalizeDate(refreshResult.tokenExpiry) ?? normalizeDate(account.tokenExpiry),
  };
}

/**
 * Mark a SocialAccount as inactive (reconnect required).
 *
 * Called when token refresh fails. The user will see a "Reconnect"
 * badge on the account card in the Social Accounts view.
 */
async function markAccountInactive(
  accountId: string,
  err: unknown,
): Promise<void> {
  try {
    await db.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });
    console.warn(
      `[social/token-refresh] Marked account ${accountId} inactive due to refresh failure:`,
      err instanceof Error ? err.message : String(err),
    );
  } catch (updateErr) {
    // Never let the inactive-marking itself throw — the caller is already
    // in an error path and we don't want to mask the original cause.
    console.error(
      `[social/token-refresh] Failed to mark account ${accountId} inactive:`,
      updateErr,
    );
  }
}
