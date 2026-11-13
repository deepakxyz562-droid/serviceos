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

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  forceRefresh?: boolean;
  cacheTtlMs?: number;
}

interface ApiCacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache for GET responses to enable 0ms instant tab switching
const apiMemoryCache = new Map<string, ApiCacheEntry<any>>();

// In-flight request deduplication map to prevent multiple concurrent HTTP calls for the same URL
const inFlightRequests = new Map<string, Promise<any>>();

export function clearApiCache(pathPattern?: string): void {
  if (pathPattern) {
    for (const key of apiMemoryCache.keys()) {
      if (key.includes(pathPattern)) {
        apiMemoryCache.delete(key);
      }
    }
  } else {
    apiMemoryCache.clear();
  }
}

function invalidateOnMutation(url: string, method: string): void {
  if (method === 'GET') return;
  if (url.includes('/api/commerce/config') || url.includes('/api/commerce/inventory')) {
    clearApiCache('/api/commerce/config');
    clearApiCache('/api/commerce/inventory');
    clearApiCache('/api/commerce/home');
  } else if (url.includes('/api/commerce/orders')) {
    clearApiCache('/api/commerce/orders');
    clearApiCache('/api/commerce/home');
  } else if (url.includes('/api/commerce/customers')) {
    clearApiCache('/api/commerce/customers');
    clearApiCache('/api/commerce/home');
  } else if (url.includes('/api/tenant/blueprint')) {
    clearApiCache('/api/tenant/blueprint');
    clearApiCache('/api/commerce/home');
  } else {
    clearApiCache('/api/commerce');
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    skipAuth = false,
    forceRefresh = false,
    cacheTtlMs = 45_000,
  } = options;

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

  // 1. Fast path: Memory Cache hit for GET requests (<1ms instant render)
  if (method === 'GET' && !forceRefresh) {
    const cached = apiMemoryCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    // 2. In-flight request deduplication: reuse active promise
    const pending = inFlightRequests.get(url);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const runRequest = async (): Promise<T> => {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const isTrustedOrigin = !path.startsWith('http') || path.startsWith(API_BASE_URL);

    if (!skipAuth && isTrustedOrigin) {
      const token = await getToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const send = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        return await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } catch {
        throw new ApiError('Unable to connect. Check your internet connection and try again.', 0);
      } finally {
        clearTimeout(timeout);
      }
    };
    const response = await send();

    if (response.status === 401 && !skipAuth) {
      // Attempt automatic single-flight refresh.
      let refreshed: boolean;
      try {
        refreshed = await attemptTokenRefresh();
      } catch {
        throw new ApiError(
          'Unable to reach the server. Please check your connection and try again.',
          401,
          { transient: true },
        );
      }

      if (refreshed) {
        const newToken = await getToken();
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await send();
        if (retryResponse.ok) {
          const result = (await retryResponse.json()) as T;
          if (method === 'GET') {
            apiMemoryCache.set(url, { data: result, expiresAt: Date.now() + cacheTtlMs });
          } else {
            invalidateOnMutation(url, method);
          }
          return result;
        }
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

      clearApiCache();
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

    let parsedResult: T;
    try {
      parsedResult = (await response.json()) as T;
    } catch {
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        parsedResult = {} as T;
      } else {
        throw new ApiError('Invalid JSON response from server', response.status);
      }
    }

    if (method === 'GET') {
      apiMemoryCache.set(url, {
        data: parsedResult,
        expiresAt: Date.now() + cacheTtlMs,
      });
    } else {
      invalidateOnMutation(url, method);
    }

    return parsedResult;
  };

  if (method === 'GET' && !forceRefresh) {
    const promise = runRequest();
    inFlightRequests.set(url, promise);
    try {
      return await promise;
    } finally {
      inFlightRequests.delete(url);
    }
  }

  return await runRequest();
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
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);
      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          if (!data.refreshToken) return false;
          await setTokens(data.token, data.refreshToken);
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
