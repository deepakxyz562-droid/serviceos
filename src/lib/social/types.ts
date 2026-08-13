/**
 * Social Publishing — Engine 1 — Shared Type Definitions
 * -------------------------------------------------------
 * These types are the contract between the publisher orchestrator, the
 * adapter registry, the platform-specific adapters (Facebook, Instagram,
 * Google Business, LinkedIn, Pinterest, X — built by other agents), and
 * the API routes that drive the UI.
 *
 * IMPORTANT: This file is imported by BOTH client and server code.
 * Keep it free of any server-only imports (no `db`, no `fs`, no `crypto`).
 * It must be a pure type+interface module so it tree-shakes safely into
 * client bundles.
 *
 * The 6 platform adapters are NOT in this file — they live in their own
 * modules and register themselves into the registry at server-boot time.
 * This file only defines the *contract* every adapter must implement.
 */

// ─── Platform enum ─────────────────────────────────────────────────────────

/**
 * The 6 supported publishing platforms.
 *
 * NOTE: The string values MUST match:
 *   - SocialAccount.platform column values in the DB
 *   - the keys in the adapter registry
 *   - the `platform` field in publishTargets JSON
 *
 * `twitter` is used (not `x`) because:
 *   - The X API v2 still uses `twitter` in many contexts (e.g. user IDs are
 *     still "twitter user IDs" in the public API surface).
 *   - It keeps the URL slug stable (`/api/oauth/twitter`) and matches the
 *     existing channel-meta + integration-catalog conventions.
 */
export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'googlebusiness'
  | 'linkedin'
  | 'pinterest'
  | 'twitter';

// ─── Per-target publish lifecycle ──────────────────────────────────────────

export type PublishTargetStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed';

/**
 * One entry inside `SocialPost.publishTargets` JSON.
 *
 * One SocialPost can target multiple SocialAccounts across multiple platforms
 * (e.g. publish the same image+caption to FB + IG + LinkedIn simultaneously).
 * Each target's status/externalPostId/error is tracked individually so a
 * failure on one platform doesn't block the others.
 */
export interface PublishTarget {
  platform: SocialPlatform;
  socialAccountId: string;
  /** Platform-assigned post ID, populated after a successful publish. */
  externalPostId?: string;
  status: PublishTargetStatus;
  /** Human-readable error message if status==='failed'. */
  error?: string;
  /** ISO timestamp — set when status transitions to 'published'. */
  publishedAt?: string;
}

// ─── Request / Response shapes ─────────────────────────────────────────────

/**
 * Inbound publish request — what the API route builds from the form payload
 * before calling the publisher orchestrator.
 */
export interface PublishRequest {
  tenantId: string;
  content: string;
  mediaUrls: string[];
  linkUrl?: string;
  targets: { platform: SocialPlatform; socialAccountId: string }[];
  scheduledAt?: string;
  gbpPostType?: string;
  gbpOfferData?: {
    title: string;
    startDate: string;
    endDate: string;
    couponCode?: string;
  };
  pinterestBoard?: string;
  createdById: string;
}

/**
 * Per-target outcome — what the publisher returns for each target it attempted.
 */
export interface PublishResult {
  platform: SocialPlatform;
  socialAccountId: string;
  externalPostId?: string;
  success: boolean;
  error?: string;
}

// ─── Adapter contract ──────────────────────────────────────────────────────

/**
 * Decrypted account data passed to adapters.
 *
 * The publisher is responsible for:
 *   1. Loading the SocialAccount row from the DB
 *   2. Decrypting accessToken + refreshToken
 *   3. Refreshing the token if it's about to expire (via token-refresh.ts)
 *   4. Passing the fully-usable credentials to the adapter
 *
 * Adapters NEVER touch the DB or the encryption layer — they only see a
 * clean, ready-to-use account object. This keeps adapters small and testable.
 */
export interface SocialAccountData {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  /** Decrypted access token — safe to use in API calls. */
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  /** Platform-specific metadata (pageId, igBusinessId, locationId, etc.). */
  metadata?: Record<string, unknown>;
}

/**
 * Parameters the publisher passes to `adapter.publish()`.
 *
 * These are the post-level fields the adapter needs to actually create the
 * post on the target platform. Account-level data lives in SocialAccountData.
 */
export interface PublishParams {
  content: string;
  mediaUrls: string[];
  linkUrl?: string;
  /** GBP-only: 'offer' | 'event' | 'whats_new' | 'product'. */
  gbpPostType?: string;
  /** GBP-only: structured offer data when gbpPostType='offer'. */
  gbpOfferData?: {
    title: string;
    startDate: string;
    endDate: string;
    couponCode?: string;
  };
  /** Pinterest-only: board ID to pin to. */
  pinterestBoard?: string;
}

/**
 * Normalized metrics returned by `adapter.fetchMetrics()`.
 *
 * Every platform's native metrics API returns a different schema. Each
 * adapter is responsible for mapping its response into these 6 common
 * fields. Platform-specific extras (e.g. Pinterest saves, GBP driving-
 * directions) go into `extraMetrics`.
 */
export interface PlatformMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  clicks: number;
  extraMetrics?: Record<string, unknown>;
}

/**
 * The contract every platform adapter must implement.
 *
 * - `platform` — which platform this adapter handles (registry key).
 * - `publish` — REQUIRED. Create a post on the target platform.
 * - `refreshToken` — OPTIONAL. Platforms with refresh tokens (Google,
 *    LinkedIn, X) implement this; FB/IG use long-lived page tokens that
 *    don't need refreshing so they omit it.
 * - `fetchMetrics` — OPTIONAL. Adapters that support metrics ingestion
 *    implement this; others will be skipped by the metrics-fetch cron.
 *
 * Adapters MUST throw on failure (the publisher catches + records the
 * error). They MUST NOT swallow exceptions silently — the publisher needs
 * to know whether a target failed so it can mark the post as 'partial'
 * or 'failed'.
 */
export interface PlatformAdapter {
  platform: SocialPlatform;
  publish(
    account: SocialAccountData,
    params: PublishParams,
  ): Promise<{ externalPostId: string }>;
  refreshToken?(
    account: SocialAccountData,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  }>;
  fetchMetrics?(
    account: SocialAccountData,
    externalPostId: string,
  ): Promise<PlatformMetrics>;
}
