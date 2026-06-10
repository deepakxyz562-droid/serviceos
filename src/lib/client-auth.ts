/**
 * Client-side authentication utilities.
 *
 * Stores the JWT token in localStorage and provides helper functions
 * for making authenticated API requests with the Bearer token.
 */

const TOKEN_KEY = 'serviceos_token';

/**
 * Store the JWT token in localStorage.
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Retrieve the JWT token from localStorage.
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Remove the JWT token from localStorage.
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Build headers for an authenticated API request.
 * Includes the Bearer token if available, plus any custom headers.
 */
export function authHeaders(custom?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    ...custom,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper.
 *
 * Works exactly like `fetch()`, but automatically includes the
 * `Authorization: Bearer <token>` header from localStorage.
 *
 * Usage:
 *   authFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) })
 *   authFetch('/api/employees')
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type for JSON bodies if not already set
  if (options?.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
