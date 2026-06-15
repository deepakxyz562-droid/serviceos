import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/integrations/[id]/disconnect - Disconnect an integration
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

    const integration = await db.integrationConnection.findUnique({ where: { id } })
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (integration.status === 'disconnected') {
      return NextResponse.json(
        { error: 'Integration is already disconnected' },
        { status: 400 }
      )
    }

    if (integration.status === 'syncing') {
      return NextResponse.json(
        { error: 'Cannot disconnect while a sync is in progress. Please wait for the sync to complete.' },
        { status: 400 }
      )
    }

    // Update integration: clear sensitive credentials and set status to disconnected
    const updatedIntegration = await db.integrationConnection.update({
      where: { id },
      data: {
        status: 'disconnected',
        accessToken: null,
        apiSecret: null,
        scopesJson: '[]',
        webhookVerified: false,
        lastError: null,
      },
    })

    // Create a sync log for the disconnection
    await db.ecommerceSyncLog.create({
      data: {
        syncType: 'webhook',
        entity: 'connection',
        status: 'completed',
        recordsTotal: 1,
        recordsSynced: 0,
        recordsFailed: 0,
        errorsJson: '[]',
        durationMs: 0,
        integrationId: id,
        tenantId: auth.tenantId,
      },
    })

    return NextResponse.json({
      message: 'Integration disconnected successfully',
      integration: {
        ...updatedIntegration,
        scopes: safeJsonParse(updatedIntegration.scopesJson, []),
        config: safeJsonParse(updatedIntegration.configJson, {}),
        syncSettings: safeJsonParse(updatedIntegration.syncSettingsJson, {}),
      },
    })
  } catch (error) {
    console.error('Error disconnecting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeJsonParse(jsonStr: string, fallback: unknown = {}) {
  try {
    return JSON.parse(jsonStr)
  } catch {
    return fallback
  }
}
