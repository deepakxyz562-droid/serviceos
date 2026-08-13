/**
 * Social Publishing — OAuth Callback HTML Page Helpers
 * ----------------------------------------------------
 *
 * Shared HTML renderers for the social-publishing OAuth callback routes
 * (LinkedIn, Pinterest, X). Each callback returns a small HTML page that:
 *
 *   1. Tells the user the connection succeeded (or failed).
 *   2. Posts a message to `window.opener` so the social-accounts UI can
 *      refresh its account list without a manual reload.
 *   3. Auto-closes the popup after a short delay.
 *
 * The HTML is intentionally inline (no external CSS / JS) so the page
 * renders instantly even if the user's CDN is slow.
 */
import { NextResponse } from 'next/server';

export interface OAuthSuccessPageOptions {
  /** Display name, e.g. "LinkedIn" or "Acme Corp (LinkedIn)". */
  accountLabel: string;
  /** OAuth provider key (linkedin | pinterest | twitter). */
  provider: string;
  /** Optional secondary message shown under the account name. */
  note?: string;
}

export interface OAuthErrorPageOptions {
  /** Human-readable error message. */
  message: string;
  /** OAuth provider key (linkedin | pinterest | twitter). */
  provider?: string;
}

/**
 * Render a success page for a completed OAuth flow.
 *
 * The page posts `{ type: 'oauth_success', provider, accountLabel }` to
 * `window.opener` so the social-accounts UI can refresh + show a toast,
 * then auto-closes after 1 second. If there's no opener (direct visit),
 * the user sees the success card with a "Continue" button that closes
 * the tab (or does nothing if window.close() is denied by the browser).
 */
export function renderOAuthSuccessPage({
  accountLabel,
  provider,
  note,
}: OAuthSuccessPageOptions): NextResponse {
  const safeLabel = escapeHtml(accountLabel);
  const safeNote = note ? escapeHtml(note) : '';
  const html = `<!html>
<html><head><title>Connected</title><style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 420px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #166534; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; }
.sub { color: #6b7280; font-size: 0.875rem; margin: 0 0 1.5rem; }
button { background: #16a34a; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
<div class="card">
  <div class="icon">&#10003;</div>
  <h1>Connected!</h1>
  <p>${safeLabel} is now connected.</p>
  ${safeNote ? `<div class="sub">${safeNote}</div>` : ''}
  <button onclick="window.close()">Close</button>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_success', provider: ${JSON.stringify(provider)}, accountLabel: ${JSON.stringify(accountLabel)} }, '*');
    setTimeout(function() { window.close(); }, 1000);
  }
</script>
</body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Render an error page for a failed OAuth flow.
 *
 * Posts `{ type: 'oauth_error', provider, error }` to `window.opener` so
 * the UI can surface a toast with the failure reason.
 */
export function renderOAuthErrorPage({
  message,
  provider,
}: OAuthErrorPageOptions): NextResponse {
  const safeMessage = escapeHtml(message);
  const html = `<!html>
<html><head><title>Connection Failed</title><style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 420px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #991b1b; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; word-break: break-word; }
button { background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
<div class="card">
  <div class="icon">&#10007;</div>
  <h1>Connection Failed</h1>
  <p>${safeMessage}</p>
  <button onclick="window.close()">Close</button>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', provider: ${JSON.stringify(provider || '')}, error: ${JSON.stringify(message)} }, '*');
    setTimeout(function() { window.close(); }, 4000);
  }
</script>
</body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── OAuth state encoding / decoding ──────────────────────────────────────

export interface OAuthState {
  tenantId: string;
  userId: string;
  provider: string;
  /** Extra payload (e.g. PKCE code_verifier for Twitter). */
  v?: Record<string, unknown>;
  ts: number;
}

/**
 * Encode OAuth state as base64url(JSON(payload)).
 *
 * State is sent to the OAuth provider as the `state` query param and echoed
 * back on callback. We embed tenantId + userId + provider + timestamp so we
 * can verify CSRF-safely and route to the right tenant without a server-side
 * session store.
 *
 * For Twitter PKCE, we also embed the `code_verifier` here so the callback
 * can verify the code_challenge without a server-side store.
 */
export function encodeOAuthState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Decode + verify OAuth state.
 *
 * Returns the decoded state or `null` if invalid/expired.
 *
 * Verification:
 *   - JSON parses cleanly
 *   - `ts` is < 10 min old (CSRF protection)
 *   - `provider` matches the expected provider
 */
export function decodeOAuthState(
  raw: string | null | undefined,
  expectedProvider: string,
): OAuthState | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(raw, 'base64url').toString(),
    ) as OAuthState;
    if (!decoded?.ts) return null;
    if (Date.now() - decoded.ts > 10 * 60 * 1000) return null;
    if (decoded.provider !== expectedProvider) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Compute the public app URL for OAuth redirect_uri construction.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL env var
 *   2. x-forwarded-proto://x-forwarded-host (when behind Caddy proxy)
 *   3. host header
 *   4. http://localhost:3000 (dev fallback)
 */
export function getPublicAppUrl(request: {
  headers: { get(name: string): string | null };
}): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const headers = request.headers;
  const forwardedProto = headers.get('x-forwarded-proto');
  const forwardedHost = headers.get('x-forwarded-host');
  const host = forwardedHost || headers.get('host');
  if (host) {
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return 'http://localhost:3000';
}
