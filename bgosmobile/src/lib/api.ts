import { API_BASE_URL } from './constants';
import { clearTokens, getToken, getRefreshToken, setTokens, sessionRevision } from './auth';

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
  retryAuth?: boolean;
}

let refreshing: Promise<void> | null = null;
export async function refreshSession() {
  if (!refreshing) {
    const revision = sessionRevision();
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) { await clearTokens(); throw new ApiError('Please sign in again.', 401); }
      try {
        const session = await apiRequest<{ token: string; refreshToken: string }>('/api/auth/refresh', {
          method: 'POST', body: { refreshToken, product: 'bgos' }, skipAuth: true,
        });
        if (!session.token || !session.refreshToken) throw new ApiError('Invalid session response.', 502);
        await setTokens(session.token, session.refreshToken, revision);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401 && revision === sessionRevision()) await clearTokens();
        throw error;
      }
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, headers = {}, skipAuth = false } = options;

  let url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  if (new URL(url).origin !== new URL(API_BASE_URL).origin) throw new ApiError('Untrusted API destination.', 400);

  const revision = sessionRevision();
  let requestToken: string | null = null;
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
    requestToken = token;
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError('The request timed out. Refresh to check whether changes were saved before trying again.', 408);
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!skipAuth && revision !== sessionRevision()) throw new ApiError('Session ended.', 401);
  if (response.status === 401 && !skipAuth && options.retryAuth !== false) {
    const latest = await getToken();
    if (!latest || latest === requestToken) await refreshSession();
    return apiRequest<T>(path, { ...options, retryAuth: false });
  }
  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw new ApiError(errorData?.error || errorData?.message || 'Request failed', response.status, errorData);
  }

  if (response.status === 204) return undefined as T;
  try { return (await response.json()) as T; }
  catch { throw new ApiError('The server returned an invalid response. Refresh before retrying changes.', 502); }
}
