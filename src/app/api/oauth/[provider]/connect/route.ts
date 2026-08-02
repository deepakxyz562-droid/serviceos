import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { OAUTH_PROVIDERS } from '@/lib/channel-meta'

/**
 * GET /api/oauth/{provider}/connect
 *
 * Initiates the OAuth flow for a channel provider. Tenant clicks "Connect with
 * WhatsApp" → this route looks up the superadmin-configured IntegrationCredential
 * for that provider → redirects to the provider's OAuth consent screen.
 *
 * After consent, the provider redirects back to /api/oauth/{provider}/callback
 * with a `code` query param, which is exchanged for an access token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params

  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.json({ error: `Unknown OAuth provider: ${provider}` }, { status: 400 })
  }

  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up the superadmin-configured OAuth app credentials
  const cred = await db.integrationCredential.findFirst({
    where: { provider, status: 'active' },
  })

  if (!cred) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message: `The platform hasn't registered OAuth credentials for ${OAUTH_PROVIDERS[provider].displayName} yet. Please contact support.`,
      },
      { status: 503 },
    )
  }

  const meta = OAUTH_PROVIDERS[provider]
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const redirectUri = `${appUrl}/api/oauth/${provider}/callback`

  // Build the authorization URL
  const state = Buffer.from(
    JSON.stringify({
      tenantId: authUser.tenantId,
      userId: authUser.id,
      provider,
      ts: Date.now(),
    }),
  ).toString('base64url')

  const authUrl = new URL(meta.authUrl)
  authUrl.searchParams.set('client_id', cred.clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', meta.scopes)
  authUrl.searchParams.set('state', state)

  // Meta providers need auth_type
  if (provider === 'whatsapp' || provider === 'messenger' || provider === 'instagram') {
    authUrl.searchParams.set('auth_type', 'rerequest')
  }

  return NextResponse.redirect(authUrl.toString())
}
