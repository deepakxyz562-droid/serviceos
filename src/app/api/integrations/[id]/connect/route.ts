import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/integrations/[id]/connect - Connect an integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { storeUrl, accessToken, apiSecret, scopes } = body

    const integration = await db.integrationConnection.findUnique({ where: { id } })
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate required credentials based on provider
    const finalStoreUrl = storeUrl || integration.storeUrl
    const finalAccessToken = accessToken || integration.accessToken
    const finalApiSecret = apiSecret || integration.apiSecret

    if (!finalStoreUrl) {
      return NextResponse.json(
        { error: 'Store URL is required to connect' },
        { status: 400 }
      )
    }

    if (!finalAccessToken) {
      return NextResponse.json(
        { error: 'Access token / API key is required to connect' },
        { status: 400 }
      )
    }

    // Provider-specific validation
    if (integration.provider === 'shopify' && !finalStoreUrl.includes('myshopify.com') && !finalStoreUrl.includes('shopify.com')) {
      return NextResponse.json(
        { error: 'Shopify store URL should be a myshopify.com domain' },
        { status: 400 }
      )
    }

    if (integration.provider === 'woocommerce' && !finalStoreUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'WooCommerce store URL should be a valid URL (e.g., https://mystore.com)' },
        { status: 400 }
      )
    }

    // Generate webhook URL for this integration
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc'
    const webhookPath = `/api/webhooks/ecommerce/${integration.provider}/${id}`
    const webhookUrl = `${appUrl}${webhookPath}`

    // Simulate credential validation (in production, make actual API call to the provider)
    const isValid = simulateCredentialValidation(integration.provider, finalStoreUrl, finalAccessToken)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Failed to validate credentials. Please check your store URL and API key.' },
        { status: 400 }
      )
    }

    // Update integration with credentials and set status to connected
    const updatedIntegration = await db.integrationConnection.update({
      where: { id },
      data: {
        status: 'connected',
        storeUrl: finalStoreUrl,
        accessToken: finalAccessToken,
        apiSecret: finalApiSecret || null,
        scopesJson: JSON.stringify(scopes || ['read_orders', 'read_products', 'read_customers']),
        webhookUrl,
        webhookVerified: false,
        lastError: null,
      },
    })

    // Create an initial sync log for the connection
    await db.ecommerceSyncLog.create({
      data: {
        syncType: 'full',
        entity: 'connection',
        status: 'completed',
        recordsTotal: 1,
        recordsSynced: 1,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 0,
        integrationId: id,
        tenantId: auth.tenantId,
      },
    })

    return NextResponse.json({
      message: 'Integration connected successfully',
      integration: {
        ...updatedIntegration,
        scopes: safeJsonParse(updatedIntegration.scopesJson, []),
        config: safeJsonParse(updatedIntegration.configJson, {}),
        syncSettings: safeJsonParse(updatedIntegration.syncSettingsJson, {}),
      },
    })
  } catch (error) {
    console.error('Error connecting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Simulate credential validation.
 * In production, this would make actual API calls to verify credentials
 * (e.g., GET /admin/api/2024-01/shop.json for Shopify).
 * For now, always returns true unless the token is obviously invalid.
 */
function simulateCredentialValidation(
  _provider: string,
  storeUrl: string,
  accessToken: string
): boolean {
  // Basic validation: non-empty store URL and access token
  if (!storeUrl || !accessToken) return false
  if (accessToken.length < 5) return false
  return true
}

function safeJsonParse(jsonStr: string, fallback: unknown = {}) {
  try {
    return JSON.parse(jsonStr)
  } catch {
    return fallback
  }
}
