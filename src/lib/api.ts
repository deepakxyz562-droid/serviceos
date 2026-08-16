/**
 * Centralized API client for Fieseros.
 *
 * In sandbox/preview environments, API requests must include the
 * `XTransformPort` query parameter so the Caddy gateway routes
 * them to the correct backend port (3000). This utility adds it
 * automatically to every request.
 *
 * Auth tokens are automatically included as Bearer headers from
 * localStorage, providing a fallback when HTTP-only cookies aren't
 * forwarded through the Caddy gateway proxy.
 */

const API_PORT = '3000';

/**
 * Append ?XTransformPort=3000 to relative API URLs — but ONLY in non-production
 * environments.
 *
 * In the sandbox/preview, the Caddy gateway requires this query param to route
 * requests to the correct backend port (3000 = Next.js app).
 *
 * In production (fieseros.com), Caddy's default reverse_proxy already routes
 * to localhost:3000, so the param is a no-op. Worse, it pollutes HTTP cache
 * keys (different query string = different cache entry) and adds noise to the
 * browser Network panel. So we strip it entirely in production.
 */
function addTransformPort(url: string): string {
  if (!url.startsWith('/')) return url; // only relative URLs
  if (process.env.NODE_ENV === 'production') return url; // Caddy handles routing
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}XTransformPort=${API_PORT}`;
}

/**
 * Get the auth token from localStorage (client-side only).
 * The JWT token is stored during login as part of fieseros_auth.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('fieseros_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.token) return parsed.token;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Build headers with auth token if available.
 * Merges user-provided headers with Authorization Bearer token.
 */
function buildHeaders(customHeaders?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => { headers[key] = value; });
    } else {
      Object.assign(headers, customHeaders);
    }
  }

  return headers;
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const finalOptions: RequestInit = {
    ...options,
    headers: buildHeaders(options?.headers),
  };
  const res = await fetch(addTransformPort(url), finalOptions);
  return res.json() as Promise<T>;
}

/**
 * Drop-in replacement for `fetch()` when calling our own /api/* routes.
 * Automatically appends XTransformPort so the gateway routes correctly.
 */
export function apiUrl(url: string): string {
  return addTransformPort(url);
}

/**
 * Auth-aware fetch that includes Bearer token from localStorage.
 * Use this instead of raw fetch() for API calls to ensure auth works
 * even when HTTP-only cookies aren't forwarded through the gateway.
 */
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const finalOptions: RequestInit = {
    ...options,
    headers: buildHeaders(options?.headers),
  };
  return fetch(addTransformPort(url), finalOptions);
}

/**
 * Convenience wrappers
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' });
}

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
