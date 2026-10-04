/**
 * Client-side authentication utilities.
 *
 * Stores the JWT token in localStorage and provides helper functions
 * for making authenticated API requests with the Bearer token.
 */

const TOKEN_KEY = 'fieseros_token';

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
    // First try the dedicated token key
    const directToken = localStorage.getItem(TOKEN_KEY);
    if (directToken) return directToken;
    // Fallback: extract token from the auth data object
    try {
      const authData = localStorage.getItem('fieseros_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.token) return parsed.token;
      }
    } catch {}
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
 * Authenticated fetch wrapper with automatic 401 token refresh.
 *
 * Works exactly like `fetch()`, but:
 *   - Automatically includes the `Authorization: Bearer <token>` header from
 *     localStorage and sends `credentials: 'include'` (HTTP-only session cookie).
 *   - On a 401 response, transparently calls `/api/auth/refresh` to obtain a
 *     fresh token, stores it, and retries the original request exactly once.
 *   - On refresh failure (token forged / absolute max exceeded / etc.), clears
 *     the stored token and redirects to `/login` so the user can re-authenticate.
 *
 * This mirrors the mobile app's `apiRequest` 401-refresh flow and is the fix
 * for the "session expires every time" complaint on web — the 30-day JWT can
 * now be refreshed silently without the user noticing.
 *
 * Usage:
 *   authFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) })
 *   authFetch('/api/employees')
 */

// Single-flight refresh promise — prevents a thundering herd of concurrent
// 401s all calling /api/auth/refresh at the same time.
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const currentToken = getToken();
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({
          refreshToken: currentToken || '',
          token: currentToken || '',
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.token) {
        setToken(data.token);
        // Also keep fieseros_auth JSON object updated with the fresh token
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('fieseros_auth');
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.token = data.token;
              if (data.user) parsed.user = data.user;
              localStorage.setItem('fieseros_auth', JSON.stringify(parsed));
            }
          } catch {}
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  removeToken();
  // Avoid redirect loops if we're already on /login.
  if (window.location.pathname === '/login') return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${redirect}`;
}

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

  let response = await fetch(url, {
    ...options,
    headers,
    // Always include credentials (cookies) so the HTTP-only session
    // cookie is sent even if the caller forgets to set this explicitly.
    credentials: options?.credentials ?? 'include',
  });

  // ── 401 → silent refresh + single retry ─────────────────────────────
  if (response.status === 401 && token) {
    const refreshed = await refreshSession();
    if (refreshed) {
      // Retry the original request with the new token.
      const newToken = getToken();
      const retryHeaders = new Headers(options?.headers);
      if (newToken) {
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
      }
      if (options?.body && !retryHeaders.has('Content-Type') && typeof options.body === 'string') {
        retryHeaders.set('Content-Type', 'application/json');
      }
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: options?.credentials ?? 'include',
      });
      return response;
    }
    // Refresh failed → force re-authentication.
    redirectToLogin();
  }

  return response;
}
