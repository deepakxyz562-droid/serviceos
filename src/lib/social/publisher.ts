/**
 * Social Publishing — Publisher Orchestrator
 * ------------------------------------------
 *
 * `publishPost(postId)` is the single entry point for publishing a
 * SocialPost to all its target platforms. It's called by:
 *
 *   - `POST /api/social/publish` (immediate publish of a draft)
 *   - `GET  /api/social/publish-due` (cron — picks up scheduled posts)
 *
 * The orchestrator is platform-agnostic — it doesn't know how to publish
 * to Facebook or Instagram. It loads the post, finds each target's
 * adapter via the registry, decrypts the account token, refreshes it if
 * needed, calls `adapter.publish()`, and records the result back into
 * the `publishTargets` JSON column.
 *
 * FAULT ISOLATION:
 *   Each target is published in its own try/catch. A failure on one
 *   platform (e.g. Instagram returns 401) does NOT block the others
 *   (Facebook + LinkedIn still publish). The post's final status is:
 *     - 'published' if ALL targets succeed
 *     - 'partial'   if SOME targets succeed
 *     - 'failed'    if ALL targets fail
 *
 * NON-THROWING:
 *   The orchestrator logs errors but never throws — even if the entire
 *   publish pipeline crashes, the cron endpoint should return a 200 with
 *   a summary, not a 500. Individual target failures are recorded in the
 *   `publishTargets` JSON for the UI to surface.
 *
 * This module is server-only (imports db + crypto + registry + token-refresh).
 */
import { db } from '@/lib/db';
import { decryptToken } from '@/lib/social/crypto';
import { ensureAdaptersLoaded, getAdapter } from '@/lib/social/registry';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import type {
  PublishTarget,
  PublishParams,
  SocialAccountData,
  SocialPlatform,
} from '@/lib/social/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Safely parse the publishTargets JSON column.
 *
 * Defensive: the column is `String @default("[]")` but a corrupt row
 * could contain malformed JSON. We always return an array.
 */
function parsePublishTargets(raw: string | null | undefined): PublishTarget[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PublishTarget[];
    return [];
  } catch {
    return [];
  }
}

/**
 * Convert a DB SocialAccount row into a decrypted SocialAccountData object
 * suitable for passing to an adapter.
 *
 * Throws if the access token can't be decrypted (rotated key / tampered).
 * The caller (publisher) catches per-target so one bad token doesn't
 * block other targets.
 */
function toAccountData(account: {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  metadata: string | null;
}): SocialAccountData {
  let metadata: Record<string, unknown> | undefined;
  if (account.metadata) {
    try {
      const parsed = JSON.parse(account.metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      // Stale/corrupt metadata — ignore, adapter will work without it.
    }
  }

  return {
    id: account.id,
    platform: account.platform as SocialPlatform,
    accountId: account.accountId,
    accountName: account.accountName,
    accessToken: decryptToken(account.accessToken),
    refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : undefined,
    tokenExpiry: account.tokenExpiry ?? undefined,
    metadata,
  };
}

/**
 * Build the PublishParams object for the adapter from the SocialPost row.
 */
function toPublishParams(post: {
  content: string;
  mediaUrls: string;
  linkUrl: string | null;
  gbpPostType: string | null;
  gbpOfferData: string | null;
  pinterestBoard: string | null;
}): PublishParams {
  let mediaUrls: string[] = [];
  try {
    const parsed = JSON.parse(post.mediaUrls);
    if (Array.isArray(parsed)) {
      mediaUrls = parsed.filter((u): u is string => typeof u === 'string');
    }
  } catch {
    // corrupt mediaUrls JSON — publish with no media
  }

  let gbpOfferData: PublishParams['gbpOfferData'] | undefined;
  if (post.gbpOfferData) {
    try {
      const parsed = JSON.parse(post.gbpOfferData);
      if (parsed && typeof parsed === 'object' && parsed.title) {
        gbpOfferData = {
          title: String(parsed.title),
          startDate: String(parsed.startDate ?? ''),
          endDate: String(parsed.endDate ?? ''),
          couponCode: parsed.couponCode ? String(parsed.couponCode) : undefined,
        };
      }
    } catch {
      // ignore — adapter will publish as a standard GBP post
    }
  }

  return {
    content: post.content,
    mediaUrls,
    linkUrl: post.linkUrl ?? undefined,
    gbpPostType: post.gbpPostType ?? undefined,
    gbpOfferData,
    pinterestBoard: post.pinterestBoard ?? undefined,
  };
}

// ─── Main orchestrator ─────────────────────────────────────────────────────

/**
 * Publish a SocialPost to all its target platforms.
 *
 * Flow:
 *   1. Load the post by ID (must be status='draft' or 'scheduled').
 *   2. Atomically set status='publishing' (so the cron doesn't double-publish).
 *   3. Parse publishTargets JSON.
 *   4. Ensure adapters are loaded (lazy bootstrap).
 *   5. For each target:
 *        a. Load the SocialAccount (skip if inactive).
 *        b. Decrypt + refresh the token.
 *        c. Look up the adapter (skip if no adapter registered).
 *        d. Call adapter.publish().
 *        e. Record externalPostId + 'published' OR error + 'failed'.
 *   6. Compute final status (published / partial / failed).
 *   7. Persist the updated publishTargets JSON + status + publishedAt.
 *
 * NEVER throws — all errors are caught and logged. Returns silently on
 * not-found / already-publishing / no-targets so the caller (cron or
 * manual publish button) doesn't crash.
 */
export async function publishPost(postId: string): Promise<void> {
  let post;
  try {
    post = await db.socialPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        content: true,
        mediaUrls: true,
        linkUrl: true,
        gbpPostType: true,
        gbpOfferData: true,
        pinterestBoard: true,
        publishTargets: true,
      },
    });
  } catch (err) {
    console.error(`[social/publisher] Failed to load post ${postId}:`, err);
    return;
  }

  if (!post) {
    console.warn(`[social/publisher] Post ${postId} not found — skipping.`);
    return;
  }

  // Guard: only publish drafts/scheduled. Don't republish 'published' posts
  // (avoids duplicate external posts if the cron fires twice or the user
  // clicks "Publish now" on an already-published draft).
  if (!['draft', 'scheduled', 'failed', 'partial'].includes(post.status)) {
    console.warn(
      `[social/publisher] Post ${postId} has status '${post.status}' — skipping (only draft/scheduled/failed/partial can be published).`,
    );
    return;
  }

  // Atomically claim the post (status → 'publishing'). If another worker
  // already flipped it, the update will succeed but the row's previous
  // status won't match — we use a conditional update to detect the race.
  try {
    const updated = await db.socialPost.updateMany({
      where: { id: postId, status: post.status },
      data: { status: 'publishing' },
    });
    if (updated.count === 0) {
      console.warn(
        `[social/publisher] Post ${postId} was claimed by another worker — skipping.`,
      );
      return;
    }
  } catch (err) {
    console.error(`[social/publisher] Failed to claim post ${postId}:`, err);
    return;
  }

  // Parse targets.
  const targets = parsePublishTargets(post.publishTargets);
  if (targets.length === 0) {
    // No targets — mark as failed with a clear reason.
    await finalizePost(postId, [], 'No publish targets defined for this post.');
    return;
  }

  // Lazy-load adapters (skips platforms whose adapter modules haven't
  // been built yet without crashing).
  await ensureAdaptersLoaded();

  // Publish each target in parallel. Each target is isolated so a failure
  // on one doesn't block the others.
  const publishParams = toPublishParams(post);
  const results = await Promise.all(
    targets.map((target) => publishSingleTarget(postId, post.tenantId, target, publishParams)),
  );

  // Compute final status.
  const successCount = results.filter((r) => r.status === 'published').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  let finalStatus: 'published' | 'partial' | 'failed';
  let failureReason: string | null = null;

  if (failCount === 0) {
    finalStatus = 'published';
  } else if (successCount === 0) {
    finalStatus = 'failed';
    failureReason = results
      .filter((r) => r.status === 'failed' && r.error)
      .map((r) => `${r.platform}: ${r.error}`)
      .join('; ');
  } else {
    finalStatus = 'partial';
    failureReason = `${failCount} of ${results.length} target(s) failed: ` +
      results
        .filter((r) => r.status === 'failed' && r.error)
        .map((r) => `${r.platform}: ${r.error}`)
        .join('; ');
  }

  await finalizePost(postId, results, finalStatus === 'failed' ? failureReason : null, finalStatus);
}

// ─── Single-target publish ─────────────────────────────────────────────────

/**
 * Publish to ONE target platform. Isolated — never throws.
 *
 * Returns the updated PublishTarget with status/externalPostId/error set.
 */
async function publishSingleTarget(
  postId: string,
  tenantId: string,
  target: PublishTarget,
  params: PublishParams,
): Promise<PublishTarget> {
  const updated: PublishTarget = {
    ...target,
    status: 'publishing',
  };

  try {
    // 1. Load the SocialAccount.
    const account = await db.socialAccount.findFirst({
      where: {
        id: target.socialAccountId,
        tenantId,
        platform: target.platform,
      },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
        metadata: true,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error(
        `SocialAccount not found (id=${target.socialAccountId}). It may have been disconnected.`,
      );
    }
    if (!account.isActive) {
      throw new Error(
        `SocialAccount '${account.accountName}' is inactive — reconnect it in Social Accounts.`,
      );
    }

    // 2. Decrypt + refresh the token.
    const accountData = toAccountData(account);
    const refreshedAccount = await refreshExpiredToken(accountData);

    // 3. Look up the adapter.
    const adapter = getAdapter(target.platform);
    if (!adapter) {
      throw new Error(
        `No adapter registered for platform '${target.platform}'. ` +
          `This platform's integration is still being built — try again later.`,
      );
    }

    // 4. Publish.
    const result = await adapter.publish(refreshedAccount, params);

    updated.externalPostId = result.externalPostId;
    updated.status = 'published';
    updated.publishedAt = new Date().toISOString();
    updated.error = undefined;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[social/publisher] Target ${target.platform} (account ${target.socialAccountId}) failed for post ${postId}:`,
      msg,
    );
    updated.status = 'failed';
    updated.error = msg;
  }

  return updated;
}

// ─── Finalize ──────────────────────────────────────────────────────────────

/**
 * Persist the final publish state to the DB.
 *
 * Sets:
 *   - publishTargets JSON (with per-target results)
 *   - status (published / partial / failed)
 *   - publishedAt (if at least one target succeeded)
 *   - failureReason (if any target failed)
 */
async function finalizePost(
  postId: string,
  results: PublishTarget[],
  failureReason: string | null,
  explicitStatus?: 'published' | 'partial' | 'failed',
): Promise<void> {
  const successCount = results.filter((r) => r.status === 'published').length;
  const status = explicitStatus ?? (successCount === 0 ? 'failed' : successCount === results.length ? 'published' : 'partial');

  try {
    await db.socialPost.update({
      where: { id: postId },
      data: {
        status,
        publishTargets: JSON.stringify(results),
        publishedAt: successCount > 0 ? new Date() : null,
        failureReason: failureReason ?? (status === 'failed' ? 'All publish targets failed.' : null),
      },
    });
  } catch (err) {
    console.error(
      `[social/publisher] Failed to finalize post ${postId} (status=${status}):`,
      err,
    );
    // Last resort: at least flip status so the post isn't stuck in 'publishing'.
    try {
      await db.socialPost.update({
        where: { id: postId },
        data: { status: 'failed', failureReason: `Finalize failed: ${err}` },
      });
    } catch {
      // give up — logged, not crashed
    }
  }
}
