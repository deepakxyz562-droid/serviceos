/**
 * Centralized API client for ServiceOS.
 *
 * In sandbox/preview environments, API requests must include the
 * `XTransformPort` query parameter so the Caddy gateway routes
 * them to the correct backend port (3000). This utility adds it
 * automatically to every request.
 */

const API_PORT = '3000';

function addTransformPort(url: string): string {
  if (!url.startsWith('/')) return url; // only relative URLs
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}XTransformPort=${API_PORT}`;
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(addTransformPort(url), options);
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
