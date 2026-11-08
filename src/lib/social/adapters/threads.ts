/**
 * Threads Platform Adapter — Meta Threads Official Graph API
 * ------------------------------------------------------------
 *
 * Implements the `PlatformAdapter` contract from `src/lib/social/types.ts`
 * for Meta Threads publishing via the official Threads Graph API v1.0.
 *
 * WHAT THIS ADAPTER DOES:
 *   - `publish`       — Two-step Threads publishing:
 *                        1. POST /{threads-user-id}/threads (media_type: TEXT, IMAGE, or VIDEO)
 *                        2. POST /{threads-user-id}/threads_publish (creation_id)
 *   - `refreshToken`  — Refresh 60-day long-lived access token:
 *                        GET https://graph.threads.net/refresh_access_token
 *   - `fetchMetrics`  — Query views, likes, replies, reposts, quotes:
 *                        GET /{threads-media-id}/insights
 *
 * SPECIFICATIONS:
 *   - Character limit: 500 characters
 *   - Media: Optional (supports text-only, single image, or video)
 *   - Token: 60-day long-lived token, refreshable when at least 24h old
 */

import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  SocialAccountData,
} from '@/lib/social/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';
const THREADS_MAX_CHARS = 500;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getThreadsUserId(account: SocialAccountData): string {
  const metaId = (account.metadata as { threadsUserId?: string; id?: string })?.threadsUserId;
  if (typeof metaId === 'string' && metaId.trim()) {
    return metaId.trim();
  }
  return (account.accountId || 'me').trim();
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv')
  );
}

async function threadsFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      const threadsErr = (errBody as { error?: { message?: string; type?: string; code?: number } }).error;
      detail = threadsErr?.message
        ? `${threadsErr.message}${threadsErr.code ? ` (code ${threadsErr.code})` : ''}`
        : JSON.stringify(errBody);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = `<status ${res.status}>`;
      }
    }
    throw new Error(`[threads adapter] Graph API ${res.status}: ${detail}`);
  }

  return (await res.json()) as T;
}

// ─── Adapter implementation ────────────────────────────────────────────────

const threadsAdapter: PlatformAdapter = {
  platform: 'threads',

  /**
   * Publish a text or media post to Threads.
   */
  async publish(account: SocialAccountData, params: PublishParams) {
    const userId = getThreadsUserId(account);
    if (!account.accessToken) {
      throw new Error('[threads adapter] Cannot publish: missing access token');
    }

    let text = (params.content || '').trim();
    if (text.length > THREADS_MAX_CHARS) {
      text = text.slice(0, THREADS_MAX_CHARS - 1).trimEnd() + '…';
    }

    const firstMedia = Array.isArray(params.mediaUrls) && params.mediaUrls.length > 0
      ? params.mediaUrls[0]
      : null;

    // Step 1: Create media container
    const containerParams = new URLSearchParams();
    containerParams.set('access_token', account.accessToken);

    if (firstMedia) {
      if (isVideoUrl(firstMedia)) {
        containerParams.set('media_type', 'VIDEO');
        containerParams.set('video_url', firstMedia);
      } else {
        containerParams.set('media_type', 'IMAGE');
        containerParams.set('image_url', firstMedia);
      }
      if (text) {
        containerParams.set('text', text);
      }
    } else {
      if (!text) {
        throw new Error('[threads adapter] Threads post requires either text content or media.');
      }
      containerParams.set('media_type', 'TEXT');
      containerParams.set('text', text);
      if (params.linkUrl) {
        containerParams.set('link_attachment', params.linkUrl);
      }
    }

    const containerUrl = `${THREADS_API_BASE}/${userId}/threads`;
    const containerRes = await threadsFetch<{ id: string }>(containerUrl, {
      method: 'POST',
      body: containerParams.toString(),
    });

    const containerId = containerRes?.id;
    if (!containerId) {
      throw new Error('[threads adapter] Failed to create media container: no ID returned');
    }

    // Optional status wait if media was uploaded (Threads downloads media asynchronously)
    if (firstMedia) {
      let isReady = false;
      const maxRetries = 6;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const statusRes = await threadsFetch<{ status?: string; error_message?: string }>(
            `${THREADS_API_BASE}/${containerId}?fields=status,error_message&access_token=${account.accessToken}`,
          );
          if (statusRes.status === 'FINISHED') {
            isReady = true;
            break;
          }
          if (statusRes.status === 'ERROR') {
            throw new Error(statusRes.error_message || 'Container processing failed');
          }
        } catch (pollErr) {
          if (attempt === maxRetries - 1) {
            console.warn('[threads adapter] Polling container warning:', pollErr);
          }
        }
      }
    }

    // Step 2: Publish media container
    const publishParams = new URLSearchParams();
    publishParams.set('creation_id', containerId);
    publishParams.set('access_token', account.accessToken);

    const publishUrl = `${THREADS_API_BASE}/${userId}/threads_publish`;
    const publishRes = await threadsFetch<{ id: string }>(publishUrl, {
      method: 'POST',
      body: publishParams.toString(),
    });

    const externalPostId = publishRes?.id;
    if (!externalPostId) {
      throw new Error('[threads adapter] Publish returned no media ID');
    }

    return {
      externalPostId,
      url: `https://www.threads.net/post/${externalPostId}`,
    };
  },

  /**
   * Refresh 60-day long-lived access token.
   */
  async refreshToken(account: SocialAccountData) {
    if (!account.accessToken) {
      throw new Error('[threads adapter] Missing access token to refresh');
    }

    const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(
      account.accessToken,
    )}`;

    const res = await threadsFetch<{ access_token: string; token_type: string; expires_in: number }>(
      url,
    );

    if (!res?.access_token) {
      throw new Error('[threads adapter] Token refresh failed: no access_token in response');
    }

    const expiresInSec = res.expires_in || 60 * 24 * 60 * 60; // default 60 days
    const tokenExpiry = new Date(Date.now() + expiresInSec * 1000);

    return {
      accessToken: res.access_token,
      tokenExpiry,
    };
  },

  /**
   * Fetch engagement insights for a Threads post.
   */
  async fetchMetrics(account: SocialAccountData, externalPostId: string): Promise<PlatformMetrics> {
    if (!account.accessToken) {
      throw new Error('[threads adapter] Missing access token for insights');
    }

    try {
      const url = `${THREADS_API_BASE}/${externalPostId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${encodeURIComponent(
        account.accessToken,
      )}`;

      const res = await threadsFetch<{
        data?: Array<{ name: string; values?: Array<{ value: number }> }>;
      }>(url);

      let impressions = 0;
      let likes = 0;
      let comments = 0;
      let shares = 0;

      if (Array.isArray(res?.data)) {
        for (const item of res.data) {
          const val = item.values?.[0]?.value || 0;
          if (item.name === 'views') impressions = val;
          if (item.name === 'likes') likes = val;
          if (item.name === 'replies') comments = val;
          if (item.name === 'reposts' || item.name === 'quotes') shares += val;
        }
      }

      return {
        likes,
        comments,
        shares,
        impressions,
        reach: impressions,
        clicks: 0,
        engagementRate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
      };
    } catch (err) {
      console.warn(`[threads adapter] fetchMetrics error for ${externalPostId}:`, err);
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        engagementRate: 0,
      };
    }
  },
};

registerAdapter(threadsAdapter);

export { threadsAdapter };
export default threadsAdapter;
