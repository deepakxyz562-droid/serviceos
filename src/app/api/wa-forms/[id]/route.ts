import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// ─── GET /api/wa-forms/[id] ──────────────────────────────────────────────
// PUBLIC endpoint — intentionally NO auth. Used for rendering the public
// WhatsApp form to respondents (no session required). Do NOT add auth here.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const form = await db.wAForm.findUnique({
      where: { id },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't expose inactive/archived forms via public link
    if (form.status !== 'active') {
      return NextResponse.json({ error: 'This form is no longer available' }, { status: 410 })
    }

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error fetching WA form:', error)
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 })
  }
}

// ─── PUT /api/wa-forms/[id] ──────────────────────────────────────────────
// Update a WA form.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation (super-admins bypass).
//   2. Use updateMany with the tenant filter and check `count === 0` → 404.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Tenant-scoped lookup: super-admins can access any tenant; everyone
    // else is constrained to their own tenant. The WAForm model has a
    // `tenantId` field for ownership.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.fieldsJson !== undefined) updateData.fieldsJson = body.fieldsJson
    if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage
    if (body.completionMessage !== undefined) updateData.completionMessage = body.completionMessage
    if (body.status !== undefined) updateData.status = body.status

    // Use updateMany with the tenant scope so a cross-tenant caller can't
    // mutate another tenant's form. If count === 0, either the form doesn't
    // exist or doesn't belong to the caller's tenant.
    const updateResult = await db.wAForm.updateMany({
      where: { id, ...tenantFilter },
      data: updateData,
    })

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch the updated form to return (tenant-scoped for safety)
    const form = await db.wAForm.findFirst({ where: { id, ...tenantFilter } })

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error updating WA form:', error)
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
  }
}

// ─── DELETE /api/wa-forms/[id] ────────────────────────────────────────────
// Soft-delete a WA form by setting status to 'archived'.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation (super-admins bypass).
//   2. Use updateMany with the tenant filter and check `count === 0` → 404.
//      (We soft-delete via updateMany because the existing behavior uses
//      an `archived` status flag rather than a hard delete.)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    // Soft-delete via updateMany with the tenant scope so a cross-tenant
    // caller can't archive another tenant's form.
    const updateResult = await db.wAForm.updateMany({
      where: { id, ...tenantFilter },
      data: { status: 'archived' },
    })

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch the updated form to return (tenant-scoped for safety)
    const form = await db.wAForm.findFirst({ where: { id, ...tenantFilter } })

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error deleting WA form:', error)
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 })
  }
}
