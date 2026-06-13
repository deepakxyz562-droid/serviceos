import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// POST /api/plugins/install-config — Generate one-click install configuration
// Creates an API key and returns the config for the WordPress plugin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { label = 'WordPress Plugin', tenantId } = body

    // Generate a new API key for this installation
    const apiKey = `sos_wp_${crypto.randomBytes(16).toString('hex')}`

    // Store as a credential (don't set workspaceId if it doesn't reference a real workspace)
    const credential = await db.credential.create({
      data: {
        name: label,
        type: 'apiKey',
        encryptedData: JSON.stringify({
          apiKey,
          source: 'wordpress-plugin',
          tenantId: tenantId || '',
        }),
      },
    })

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin

    // Return the install configuration
    return NextResponse.json({
      success: true,
      config: {
        apiUrl: `${baseUrl}/api`,
        apiKey,
        tenantId: tenantId || '',
        webhookEndpoint: `${baseUrl}/api/webhooks/ingest`,
        credentialId: credential.id,
      },
      installInstructions: {
        manual: {
          step1: 'Download the plugin from Settings → WordPress Integration',
          step2: 'Go to WordPress Admin → Plugins → Add New → Upload Plugin',
          step3: 'Upload the .php file and activate',
          step4: 'Go to ServiceOS CRM in WordPress sidebar',
          step5: 'Enter the API URL and API Key shown above',
        },
        oneClick: {
          url: `${baseUrl}/api/plugins/download?format=zip&key=${apiKey}`,
          note: 'Download and upload to WordPress Plugins → Add New → Upload',
        },
      },
    })
  } catch (error) {
    console.error('[Plugin Install Config] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate install configuration' },
      { status: 500 }
    )
  }
}
