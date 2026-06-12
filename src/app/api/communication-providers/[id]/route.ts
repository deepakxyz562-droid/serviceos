import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// PUT /api/communication-providers/[id] - Update a communication provider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if provider exists and belongs to user's tenant
    const existing = await db.communicationProvider.findFirst({
      where: {
        id,
        ...(authUser.tenantId ? { tenantId: authUser.tenantId } : {}),
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Handle config updates — merge with existing configJson
    if (body.config) {
      let existingConfig: Record<string, string> = {}
      try {
        existingConfig = JSON.parse(existing.configJson)
      } catch { /* empty */ }
      // Merge: new values override existing, but we don't remove keys not in the update
      const mergedConfig = { ...existingConfig, ...body.config }
      updateData.configJson = JSON.stringify(mergedConfig)
    }

    // Handle status toggle
    if (body.status !== undefined) {
      updateData.status = body.status
    }

    // Handle sendingEnabled toggle
    if (body.sendingEnabled !== undefined) {
      updateData.sendingEnabled = body.sendingEnabled
    }

    // Handle name update
    if (body.name !== undefined) {
      updateData.name = body.name
    }

    // Handle isDefault toggle
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault
    }

    // Handle daily/monthly limit updates
    if (body.dailyLimit !== undefined) {
      updateData.dailyLimit = body.dailyLimit
    }
    if (body.monthlyLimit !== undefined) {
      updateData.monthlyLimit = body.monthlyLimit
    }

    // Handle provider update
    if (body.provider !== undefined) {
      updateData.provider = body.provider
    }

    const result = await db.communicationProvider.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error updating communication provider:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}

// DELETE /api/communication-providers/[id] - Delete a communication provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if provider exists and belongs to user's tenant
    const existing = await db.communicationProvider.findFirst({
      where: {
        id,
        ...(authUser.tenantId ? { tenantId: authUser.tenantId } : {}),
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    await db.communicationProvider.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting communication provider:', error)
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 })
  }
}
