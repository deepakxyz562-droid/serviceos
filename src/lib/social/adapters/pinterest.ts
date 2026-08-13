/**
 * Pinterest Platform Adapter — REAL IMPLEMENTATION
 * -------------------------------------------------
 *
 * Creates pins via Pinterest API v5.
 *
 * ENDPOINTS:
 *   - Publish:    POST https://api.pinterest.com/v5/pins
 *   - Refresh:    POST https://api.pinterest.com/v5/oauth/token
 *   - Metrics:    GET  https://api.pinterest.com/v5/pins/{pinId}/analytics
 *
 * SCOPES (set by /api/oauth/pinterest):
 *   - boards:read          — list user's boards (for the board picker)
 *   - pins:read            — read pin analytics
 *   - pins:write           — create new pins
 *   - user_accounts:read   — fetch the user account profile
 *
 * TOKEN:
 *   Pinterest v5 access tokens expire in 1 year. Refresh tokens are issued
 *   for confidential apps (those with a client_secret). We implement
 *   `refreshToken` using Basic-auth (client_id:client_secret base64).
 *
 * MVP SUPPORT:
 *   - Image pin via image_url: ✅ (uses media_source.source_type='image_url')
 *   - Video pin:               ❌
 *   - Board creation:          ❌ (user must pick existing board)
 *
 * Pinterest is the ONLY platform where media is REQUIRED — you can't pin
 * without an image. The adapter throws a clear error if mediaUrls is empty.
 */
import { db } from '@/lib/db';
import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  SocialAccountData,
} from '@/lib/social/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve the board ID to pin to.
 * Priority: PublishParams.pinterestBoard (per-post override)
 *         → account.metadata.defaultBoardId (OAuth-time default)
 *
 * Throws if neither is set — without a board, the pin can't be created.
 */
function getBoardId(
  account: SocialAccountData,
  params: PublishParams,
): string {
  if (params.pinterestBoard) return params.pinterestBoard;
  const defaultBoardId = account.metadata?.defaultBoardId;
  if (typeof defaultBoardId === 'string' && defaultBoardId) return defaultBoardId;
  throw new Error(
    `Pinterest account "${account.accountName}" has no board selected. Choose a board in the post composer or set a default board on the account.`,
  );
}

/**
 * Thin wrapper around fetch that throws on non-2xx with a useful message.
 * Pinterest's v5 API consistently returns `{ code, message, status }` on error.
 */
async function pinterestFetch<T>(
  url: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail =
        body?.message ||
        body?.message_detail ||
        body?.error ||
        JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '<no body>';
      }
    }
    throw new Error(
      `Pinterest API ${res.status} ${res.statusText} for ${url}: ${detail}`,
    );
  }

  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Look up the superadmin-configured Pinterest OAuth app credentials.
 */
async function getPinterestCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'pinterest', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    throw new Error(
      'Pinterest OAuth app credentials not configured. Ask the superadmin to register a Pinterest app.',
    );
  }
  return cred;
}

/**
 * Format a Date as YYYY-MM-DD (Pinterest analytics requires calendar dates,
 * not ISO timestamps).
 */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Adapter ──────────────────────────────────────────────────────────────

const pinterestAdapter: PlatformAdapter = {
  platform: 'pinterest',

  /**
   * Create a pin on the user's board.
   *
   * Body shape (v5):
   *   {
   *     board_id:      "<boardId>",
   *     title:         "Pin",                       // 100 char max
   *     description:   "<params.content>",           // 800 char max
   *     media_source: {
   *       source_type: "image_url",
   *       url:         "<params.mediaUrls[0]>"
   *     }
   *   }
   *
   * Pinterest has no "text-only" pin — every pin needs media. Throws a
   * clear error if mediaUrls is empty so the composer UI can surface it.
   */
  async publish(account, params: PublishParams) {
    if (!params.mediaUrls || params.mediaUrls.length === 0) {
      throw new Error('Pinterest requires at least one image.');
    }

    const boardId = getBoardId(account, params);
    const imageUrl = params.mediaUrls[0];

    // Pinterest title is capped at 100 chars; description at 800.
    // We use a short fixed title and put the user's caption in description.
    const description = (params.content || '').slice(0, 800);

    const body = {
      board_id: boardId,
      title: 'Pin',
      description,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
    };

    const response = await pinterestFetch<{ id: string }>(
      'https://api.pinterest.com/v5/pins',
      {
        method: 'POST',
        accessToken: account.accessToken,
        body: JSON.stringify(body),
      },
    );

    if (!response?.id) {
      throw new Error('Pinterest did not return a pin ID.');
    }

    return { externalPostId: String(response.id) };
  },

  /**
   * Refresh a Pinterest access token using the stored refresh_token.
   *
   * Pinterest v5 issues refresh tokens for confidential apps. The refresh
   * endpoint requires HTTP Basic auth (client_id:client_secret base64).
   *
   * If no refresh_token is stored, throws — the user must reconnect.
   */
  async refreshToken(account) {
    if (!account.refreshToken) {
      throw new Error(
        'Pinterest account has no refresh_token — user must reconnect via OAuth.',
      );
    }

    const { clientId, clientSecret } = await getPinterestCredentials();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail =
          body?.message_detail || body?.message || JSON.stringify(body);
      } catch {
        detail = await res.text().catch(() => '<no body>');
      }
      throw new Error(`Pinterest token refresh failed: ${detail}`);
    }

    const token = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    // Pinterest access tokens expire in ~1 year (31536000 seconds).
    const expiresIn = token.expires_in ?? 31536000;
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? account.refreshToken,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000),
    };
  },

  /**
   * Fetch daily analytics for a pin and sum across days.
   *
   * Endpoint:
   *   GET /v5/pins/{pinId}/analytics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
   *       &metric_types=IMPRESSION,SAVE,OUTBOUND_CLICK
   *       &app_types=MOBILE,WEB&split_field=NO_SPLIT
   *
   * Pinterest returns a map of { "YYYY-MM-DD": { IMPRESSION: 0, SAVE: 0, ... } }.
   * We sum each metric across all days in the window.
   *
   * Mapping (Pinterest has no likes/comments concepts):
   *   - impressions ← sum(IMPRESSION)
   *   - shares      ← sum(SAVE)        (Pinterest "saves" = our shares)
   *   - clicks      ← sum(OUTBOUND_CLICK)
   *   - likes       ← 0
   *   - comments    ← 0
   *   - reach       ← 0 (Pinterest doesn't expose unique reach per pin)
   */
  async fetchMetrics(account, externalPostId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const url =
      `https://api.pinterest.com/v5/pins/${encodeURIComponent(externalPostId)}/analytics` +
      `?start_date=${toDateString(startDate)}&end_date=${toDateString(endDate)}` +
      `&metric_types=IMPRESSION,SAVE,OUTBOUND_CLICK` +
      `&app_types=MOBILE,WEB&split_field=NO_SPLIT`;

    try {
      const data = await pinterestFetch<
        Record<string, { IMPRESSION?: number; SAVE?: number; OUTBOUND_CLICK?: number }>
      >(url, { method: 'GET', accessToken: account.accessToken });

      let impressions = 0;
      let saves = 0;
      let clicks = 0;
      for (const day of Object.values(data || {})) {
        impressions += Number(day?.IMPRESSION ?? 0);
        saves += Number(day?.SAVE ?? 0);
        clicks += Number(day?.OUTBOUND_CLICK ?? 0);
      }

      return {
        likes: 0,
        comments: 0,
        shares: saves,
        impressions,
        reach: 0,
        clicks,
        extraMetrics: {
          source: 'pinAnalytics',
          window: `${toDateString(startDate)}..${toDateString(endDate)}`,
          saves,
        },
      };
    } catch (err) {
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        extraMetrics: {
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

registerAdapter(pinterestAdapter);

export { pinterestAdapter };
