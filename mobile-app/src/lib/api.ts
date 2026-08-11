/**
 * Fieseros Mobile App — API Client
 * Fetch wrapper that injects JWT auth, handles errors, and performs
 * automatic token refresh on 401 with a single-flight lock.
 *
 * On a terminal 401 (refresh failed or unavailable) it emits an
 * `auth:unauthorized` event so the root layout can redirect to login.
 */

import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT_MS } from './constants';
import type { ApiError } from '@/types';
import { getToken, getRefreshToken, setTokens, clearTokens } from './auth';
import { emitter } from './event-emitter';

export class ApiRequestError extends Error {
  statusCode: number;
  body: unknown;

  constructor(message: string, statusCode: number, body?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  /** Internal: prevent infinite refresh loop. */
  _retried?: boolean;
  /** Force multipart/form-data (file uploads). When true, body must be FormData. */
  formData?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(
    path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// ── Single-flight token refresh ──────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string; accessToken?: string; refreshToken?: string };
      const newToken = data.token || data.accessToken;
      if (!newToken) return null;

      await setTokens(newToken, data.refreshToken || refreshToken);
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Upload helper for multipart bodies (photos) ──────────────────────
function buildHeaders(
  token: string | null,
  headers: Record<string, string>,
  formData: boolean
): Record<string, string> {
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  // For FormData, let the platform set the correct Content-Type with boundary.
  if (!formData) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  return finalHeaders;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    skipAuth = false,
    _retried = false,
    formData = false,
  } = options;

  const token = skipAuth ? null : await getToken();

  const url = buildUrl(path, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(token, headers, formData),
      body:
        body !== undefined
          ? formData
            ? (body as FormData)
            : JSON.stringify(body)
          : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const responseBody = isJson ? await response.json() : await response.text();

    // ── 401: attempt one silent refresh + retry ──────────────────────
    if (response.status === 401 && !skipAuth && !_retried) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest<T>(path, { ...options, _retried: true });
      }
      // Refresh failed — session is dead.
      await clearTokens();
      emitter.emit('auth:unauthorized');
      throw new ApiRequestError('Your session has expired. Please sign in again.', 401);
    }

    if (response.status === 401 && skipAuth) {
      // Login / OTP endpoints returning 401 — just surface the error.
    }

    if (!response.ok) {
      const errorBody = (isJson ? responseBody : { message: String(responseBody) }) as ApiError;
      throw new ApiRequestError(
        errorBody?.message || errorBody?.error || `Request failed with ${response.status}`,
        response.status,
        errorBody
      );
    }

    return responseBody as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiRequestError('Request timed out. Please check your connection.', 408);
    }

    throw new ApiRequestError(
      error instanceof Error ? error.message : 'Network request failed',
      0
    );
  }
}

export const api = {
  get: <T = unknown>(path: string, params?: RequestOptions['params']) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Pick<RequestOptions, 'skipAuth' | 'formData'>
  ) => apiRequest<T>(path, { method: 'POST', body, ...opts }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),

  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),

  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/**
 * Build an absolute URL to a backend file/asset (e.g. invoice PDF, photo).
 * Handles relative paths returned by the API.
 */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
