import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OAUTH_PROVIDERS, SOCIAL_PUBLISHING_PLATFORMS } from '@/lib/channel-meta'

/**
 * GET /api/oauth/{provider}/callback
 *
 * OAuth callback handler. The provider redirects here with `?code=...&state=...`.
 * We exchange the code for an access token, then store it in the tenant's
 * CommunicationProvider record (channel type = the provider name).
 *
 * State contains the tenantId + userId we set in /connect — we verify it to
 * prevent CSRF.
 *
 * SOCIAL-PUBLISHING PLATFORMS (linkedin, pinterest, twitter):
 *   These have dedicated callback handlers at /api/oauth/{provider}/callback/route.ts
 *   (NOT this generic route) because they store tokens into the SocialAccount
 *   table for social publishing. We 302-redirect to the dedicated handler so
 *   the existing UI's `/api/oauth/{provider}/callback` URL keeps working.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params

  // Social-publishing platforms delegate to their dedicated callback handler.
  if (SOCIAL_PUBLISHING_PLATFORMS.has(provider)) {
    const url = new URL(`/api/oauth/${provider}/callback`, request.url)
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))
    return NextResponse.redirect(url.toString())
  }

  if (!OAUTH_PROVIDERS[provider]) {
    return renderErrorPage(`Unknown provider: ${provider}`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return renderErrorPage(`Authorization denied: ${errorParam}`)
  }

  if (!code || !stateParam) {
    return renderErrorPage('Missing authorization code or state')
  }

  // Verify state
  let state: { tenantId?: string; userId?: string; provider?: string; ts?: number }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return renderErrorPage('Invalid state parameter')
  }

  // State must be < 10 min old (CSRF protection)
  if (!state.ts || Date.now() - state.ts > 10 * 60 * 1000) {
    return renderErrorPage('Authorization timed out — please try again')
  }

  if (state.provider !== provider) {
    return renderErrorPage('Provider mismatch in state')
  }

  // Look up the superadmin OAuth app credentials
  const cred = await db.integrationCredential.findFirst({
    where: { provider, status: 'active' },
  })
  if (!cred) {
    return renderErrorPage('Platform credentials not configured')
  }

  const meta = OAUTH_PROVIDERS[provider]
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/oauth/${provider}/callback`

  // Exchange code for access token
  let tokenResponse: { access_token?: string; token_type?: string; expires_in?: number; refresh_token?: string; scope?: string }
  try {
    const tokenReq = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!tokenReq.ok) {
      const errText = await tokenReq.text()
      console.error(`[OAuth callback] Token exchange failed for ${provider}:`, errText)
      return renderErrorPage(`Token exchange failed: ${tokenReq.status}`)
    }
    tokenResponse = await tokenReq.json()
  } catch (err) {
    console.error(`[OAuth callback] Token exchange error for ${provider}:`, err)
    return renderErrorPage('Failed to exchange authorization code')
  }

  if (!tokenResponse.access_token) {
    return renderErrorPage('No access token in response')
  }

  // Store the token in the tenant's CommunicationProvider record
  const tenantId = state.tenantId || null
  const existing = await db.communicationProvider.findFirst({
    where: { type: provider, tenantId },
  })

  const configJson = JSON.stringify({
    accessToken: tokenResponse.access_token,
    tokenType: tokenResponse.token_type || 'bearer',
    expiresAt: tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null,
    refreshToken: tokenResponse.refresh_token || null,
    scope: tokenResponse.scope || meta.scopes,
    connectedAt: new Date().toISOString(),
  })

  if (existing) {
    await db.communicationProvider.update({
      where: { id: existing.id },
      data: {
        configJson,
        status: 'active',
        sendingEnabled: true,
        lastUsedAt: new Date(),
      },
    })
  } else {
    await db.communicationProvider.create({
      data: {
        name: meta.displayName,
        type: provider,
        provider,
        status: 'active',
        configJson,
        isDefault: false,
        sendingEnabled: true,
        tenantId,
      },
    })
  }

  // Mark the ChannelConfig as setup-completed
  await db.channelConfig.updateMany({
    where: { channel: provider, tenantId },
    data: {
      status: 'active',
      setupCompleted: true,
      setupStep: 3,
      lastTestStatus: 'success',
      lastTestedAt: new Date(),
    },
  })

  // Render a success page that auto-closes the popup (or redirects to channels)
  return new NextResponse(
    `<!html>
<html><head><title>Connected</title><style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #166534; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; }
button { background: #16a34a; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
<div class="card">
  <div class="icon">✓</div>
  <h1>Connected!</h1>
  <p>${meta.displayName} is now connected. You can close this window.</p>
  <button onclick="window.close()">Close</button>
</div>
<script>
  // Try to notify the opener window
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_success', provider: '${provider}' }, '*');
    setTimeout(() => window.close(), 1000);
  }
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}

function renderErrorPage(message: string): NextResponse {
  return new NextResponse(
    `<!html>
<html><head><title>Connection Failed</title><style>
body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #991b1b; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; }
button { background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
<div class="card">
  <div class="icon">✗</div>
  <h1>Connection Failed</h1>
  <p>${message}</p>
  <button onclick="window.close()">Close</button>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', error: '${message.replace(/'/g, "\\'")}' }, '*');
    setTimeout(() => window.close(), 2000);
  }
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}
