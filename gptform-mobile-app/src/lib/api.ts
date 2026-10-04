import { API_BASE_URL, API_PATHS } from './constants';
import { getToken, getRefreshToken, setTokens, clearTokens } from './auth';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, headers = {}, skipAuth = false } = options;

  let url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    // Attempt automatic single-flight refresh.
    // IMPORTANT: only clear the session on a genuine auth rejection.
    // A transient error (network, 5xx, rate limit) must NOT nuke the session —
    // the token may still be valid and the user should be able to retry.
    let refreshed: boolean;
    try {
      refreshed = await attemptTokenRefresh();
    } catch {
      // Transient refresh failure (network / 5xx / 429). Do NOT clear tokens.
      // Surface the original 401 so the caller can show a retry affordance.
      throw new ApiError(
        'Unable to reach the server. Please check your connection and try again.',
        401,
        { transient: true },
      );
    }

    if (refreshed) {
      const newToken = await getToken();
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (retryResponse.ok) {
        return (await retryResponse.json()) as T;
      }
      // If the retry returns 401 after a successful token refresh, the session is VALID,
      // but this specific endpoint is rejecting access (e.g. role, tenant, or plan restriction).
      // NEVER clearTokens() here! Doing so would nuke the valid session across the entire app.
      if (retryResponse.status === 401) {
        let errData: any = {};
        try {
          errData = await retryResponse.json();
        } catch {}
        throw new ApiError(
          errData.error || errData.message || 'Access denied for this feature.',
          401,
          errData
        );
      }
      // Non-401 retry failure — surface the actual status, don't clear session.
      let retryErrData: any = {};
      try {
        retryErrData = await retryResponse.json();
      } catch {}
      throw new ApiError(
        retryErrData.error || retryErrData.message || `Request failed with status ${retryResponse.status}`,
        retryResponse.status,
        retryErrData
      );
    }

    // Refresh was authoritatively rejected (returned false) — token is dead.
    await clearTokens();
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {}
    throw new ApiError(
      errorData.error || errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh outcome:
 *   - `true`  → refresh succeeded, new token stored
 *   - `false` → refresh authoritatively REJECTED the token (401 with a fatal
 *               code like INVALID_TOKEN / ABSOLUTE_MAX_EXCEEDED / USER_DISABLED).
 *               Caller should clear the session.
 *   - throws  → refresh failed due to a TRANSIENT error (network, 5xx, rate
 *               limit). Caller should NOT clear the session — the token may
 *               still be valid, and a single failed commerce API call must not
 *               nuke the whole session. Let the caller surface the error and
 *               let the user retry.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const currentToken = await getToken();
      const refreshToken = (await getRefreshToken()) || currentToken;
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({ refreshToken, token: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          await setTokens(data.token, data.refreshToken || data.token);
          return true;
        }
        return false;
      }

      if (res.status === 401) {
        // Authoritative rejection — token is genuinely dead.
        return false;
      }

      // Any other status (500, 502, 503, 429, timeout) is a TRANSIENT error.
      // Do NOT treat it as an auth failure — throw so the caller knows not
      // to clear the session.
      throw new Error(`refresh_transient_${res.status}`);
    } catch (err: any) {
      // Network failure / fetch rejection — transient, NOT an auth rejection.
      if (err?.message?.startsWith('refresh_transient_')) throw err;
      throw new Error('refresh_transient_network');
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
