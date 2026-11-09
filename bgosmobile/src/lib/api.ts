import { API_BASE_URL } from './constants';
import { clearTokens, getToken, getRefreshToken, setTokens, sessionRevision } from './auth';
import { detectDeviceCountryAndTimezone } from './country-codes';

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
  signal?: AbortSignal;
  timeoutMs?: number;
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

export function formatNetworkError(error: unknown, baseUrl = API_BASE_URL): ApiError | null {
  const rawMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (
    /fetch failed|network request failed|could not connect|unexpectedexception|expomodulescore|econnrefused|enotfound|econnreset|etimedout|nsurlerrordomain/i.test(
      rawMsg,
    )
  ) {
    let hostLabel = baseUrl;
    try {
      hostLabel = new URL(baseUrl).host;
    } catch {}
    return new ApiError(
      `Could not reach BGOS server (${hostLabel}). Check your internet connection and tap Try again.`,
      0,
    );
  }
  return null;
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

  let deviceLocaleHeaders: Record<string, string> = {};
  try {
    const detected = detectDeviceCountryAndTimezone();
    if (detected.country?.code) deviceLocaleHeaders['X-Device-Country'] = detected.country.code;
    if (detected.timeZone) deviceLocaleHeaders['X-Device-Timezone'] = detected.timeZone;
  } catch {
    // non-fatal
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const hasJsonBody = body !== undefined && body !== null && !isFormData;
  const reqHeaders: Record<string, string> = {
    ...deviceLocaleHeaders,
    ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
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
  const cancel=()=>controller.abort();
  if(options.signal?.aborted)controller.abort();
  options.signal?.addEventListener('abort',cancel,{once:true});
  const timeout = setTimeout(() => controller.abort(), Math.min(options.timeoutMs || 30000,180000));
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: hasJsonBody ? JSON.stringify(body) : isFormData ? body : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError('The request timed out. Refresh to check whether changes were saved before trying again.', 408);
    const friendly = formatNetworkError(error, API_BASE_URL);
    if (friendly) throw friendly;
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort',cancel);
  }

  if (!skipAuth && revision !== sessionRevision()) throw new ApiError('Session ended.', 401);
  if (response.status === 401 && !skipAuth && options.retryAuth !== false) {
    const latest = await getToken();
    if (!latest || latest === requestToken) await refreshSession();
    return apiRequest<T>(path, { ...options, retryAuth: false });
  }
  const contentType = response.headers?.get?.('content-type') || '';
  let rawText = '';
  let hasRawText = false;
  if (typeof response.text === 'function') {
    rawText = await response.text().catch(() => '');
    hasRawText = true;
  }

  if (!response.ok) {
    let errorData: any = null;
    if (hasRawText && rawText) {
      try {
        errorData = JSON.parse(rawText);
      } catch {
        errorData = null;
      }
    } else if (!hasRawText && typeof response.json === 'function') {
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
    }

    const isHtml =
      (hasRawText && /<html|<!doctype/i.test(rawText)) || contentType.includes('text/html');
    const fallbackMessage =
      response.status === 502 || response.status === 503 || response.status === 504
        ? `Server gateway error (HTTP ${response.status}). Please try again in a moment.`
        : response.status === 404
          ? 'API endpoint was not found on the server (HTTP 404). Update or retry shortly.'
          : isHtml
            ? `Server returned an unexpected HTML error page (HTTP ${response.status}).`
            : rawText.trim().slice(0, 180) || response.statusText || 'Request failed';
    throw new ApiError(
      errorData?.error || errorData?.message || fallbackMessage,
      response.status,
      errorData,
    );
  }

  if (response.status === 204) return undefined as T;
  if (hasRawText) {
    if (!rawText.trim()) {
      throw new ApiError('The server returned an invalid response (empty body). Refresh before retrying changes.', 502);
    }
    try {
      return JSON.parse(rawText) as T;
    } catch {
      const isHtml = /<html|<!doctype/i.test(rawText) || contentType.includes('text/html');
      throw new ApiError(
        isHtml
          ? 'The server returned an invalid response (HTML instead of JSON). Please deploy the latest server update or retry.'
          : 'The server returned an invalid response. Refresh before retrying changes.',
        502,
      );
    }
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('The server returned an invalid response. Refresh before retrying changes.', 502);
  }
}
