import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/integrations/[id]/sync - Trigger a sync for an integration (simulated)
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
    const { syncType = 'full', entities = ['orders', 'products', 'customers'] } = body

    const integration = await db.integrationConnection.findUnique({ where: { id } })
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (integration.status === 'disconnected') {
      return NextResponse.json(
        { error: 'Cannot sync a disconnected integration. Please connect it first.' },
        { status: 400 }
      )
    }

    // Set integration status to syncing
    await db.integrationConnection.update({
      where: { id },
      data: { status: 'syncing' },
    })

    const syncStartTime = Date.now()

    // Simulate sync results for each entity
    const syncResults = []
    let totalOrdersSynced = 0
    let totalProductsSynced = 0
    let totalCustomersSynced = 0
    let hasErrors = false
    const allErrors: string[] = []

    for (const entity of entities) {
      const validEntities = ['orders', 'products', 'customers', 'carts']
      if (!validEntities.includes(entity)) continue

      // Simulate sync with random counts (in production, this would call the provider API)
      const recordsTotal = Math.floor(Math.random() * 100) + 10
      const recordsFailed = Math.random() > 0.9 ? Math.floor(Math.random() * 5) : 0
      const recordsSynced = recordsTotal - recordsFailed

      if (recordsFailed > 0) {
        hasErrors = true
        allErrors.push(`${recordsFailed} ${entity} records failed to sync`)
      }

      // Create a sync log entry
      await db.ecommerceSyncLog.create({
        data: {
          syncType,
          entity,
          status: recordsFailed > 0 ? 'completed' : 'completed',
          recordsTotal,
          recordsSynced,
          recordsFailed,
          errorsJson: JSON.stringify(
            recordsFailed > 0
              ? allErrors.filter((e) => e.includes(entity))
              : []
          ),
          durationMs: Date.now() - syncStartTime,
          integrationId: id,
          tenantId: auth.tenantId,
        },
      })

      // Track synced counts
      if (entity === 'orders') totalOrdersSynced = recordsSynced
      if (entity === 'products') totalProductsSynced = recordsSynced
      if (entity === 'customers') totalCustomersSynced = recordsSynced

      syncResults.push({
        entity,
        recordsTotal,
        recordsSynced,
        recordsFailed,
      })
    }

    const durationMs = Date.now() - syncStartTime

    // Update integration with sync results
    await db.integrationConnection.update({
      where: { id },
      data: {
        status: hasErrors ? 'error' : 'connected',
        lastSyncAt: new Date(),
        lastSyncStatus: hasErrors ? 'partial' : 'success',
        lastError: hasErrors ? allErrors.join('; ') : null,
        totalSyncedOrders: integration.totalSyncedOrders + totalOrdersSynced,
        totalSyncedProducts: integration.totalSyncedProducts + totalProductsSynced,
        totalSyncedCustomers: integration.totalSyncedCustomers + totalCustomersSynced,
      },
    })

    return NextResponse.json({
      message: 'Sync completed',
      syncType,
      results: syncResults,
      durationMs,
      status: hasErrors ? 'partial' : 'success',
    })
  } catch (error) {
    console.error('Error triggering sync:', error)

    // Try to reset integration status if it's stuck in 'syncing'
    try {
      const { id } = await params
      await db.integrationConnection.update({
        where: { id },
        data: {
          status: 'error',
          lastSyncStatus: 'failed',
          lastError: 'Sync failed due to internal error',
        },
      })
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
