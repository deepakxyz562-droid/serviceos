import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { isSuperAdminRequest } from '@/lib/admin-auth'

/** DELETE /api/superadmin/integration-credentials/[id] — remove an OAuth app credential. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 })
  }

  const { id } = await params
  await db.integrationCredential.deleteMany({ where: { id } })
  return NextResponse.json({ success: true })
}
