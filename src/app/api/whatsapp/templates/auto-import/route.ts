import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { autoImportNotificationTemplates, autoImportForAllTenants } from '@/lib/auto-import-templates'

/**
 * POST /api/whatsapp/templates/auto-import
 *
 * Auto-import the 5 notification WhatsApp templates for the current tenant.
 * Body options:
 *   { scope: 'tenant' }  — import for current tenant only (default)
 *   { scope: 'all' }     — import for ALL tenants (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const scope = body.scope || 'tenant'

    // SuperAdmin can import for all tenants
    if (scope === 'all') {
      if (user.role !== 'superadmin') {
        return NextResponse.json({ error: 'Only SuperAdmin can import for all tenants' }, { status: 403 })
      }
      const result = await autoImportForAllTenants()
      return NextResponse.json(result)
    }

    // Tenant-scoped import
    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const result = await autoImportNotificationTemplates(
      tenantId,
      user.workspaceId,
      body.companyName
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Auto-Import Templates] Error:', error)
    return NextResponse.json({ error: 'Failed to auto-import templates' }, { status: 500 })
  }
}
