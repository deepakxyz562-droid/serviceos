import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

/**
 * DELETE /api/image-library/[id]
 * Delete an image from the library (only if owned by current tenant).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const { id } = await params
    const existing = await db.imageLibrary.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    if (existing.tenantId !== null && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    await db.imageLibrary.delete({ where: { id } })
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
