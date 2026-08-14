import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { getAuthUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { requireCrmTenant } from '@/lib/require-crm-tenant'
import { CUSTOMER_PUBLIC_SELECT } from '@/lib/customer-select'

// GET /api/customers — list customers for the authenticated user's tenant
// Scopes results to the logged-in user's workspace/tenant so cross-tenant
// data never leaks.
//
// Query params:
//   search    — ILIKE search across name/phone/email/address
//   page      — default 1
//   pageSize  — default 50, max 500 (alias: `limit` for backward compat)
//
// Returns: { customers: [...], pagination: { page, pageSize, total, totalPages, hasNextPage } }
//
// C-1 (C1): previously returned ALL matching customers with no cap —
// Seq Scan, 221ms cold / 11ms warm at 10K rows, plus the full payload
// transferred over the wire. Now uses server-side pagination (default 50).
//
// C-3 (C3b): when `search` is present, the exact count(*) is OMITTED
// because ILIKE '%term%' across 4 columns cannot use any B-tree index
// (23ms warm Seq Scan at 10K rows). Instead we return hasNextPage and
// total = null. Non-search paths keep the exact count (C2 count is
// 1.74ms warm, indexed).
async function _GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // ── C-1: Server-side pagination ──────────────────────────────────
    // `limit` is honored as an alias for `pageSize` (backward compat for
    // dropdown consumers that pass ?limit=200 or ?limit=500). Hard cap: 500.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSizeRaw = parseInt(
      searchParams.get('pageSize') || searchParams.get('limit') || '50',
      10,
    ) || 50;
    const pageSize = Math.min(Math.max(1, pageSizeRaw), 500);
    const skip = (page - 1) * pageSize;

    // Scope to the user's workspace. If the user has no direct workspaceId
    // (e.g. super-admin / admin@fieseros.com), resolve via their tenantId →
    // first workspace in that tenant. If they also have no tenantId, fall
    // back to the first workspace in the system so the UI still works for
    // the demo admin (instead of silently returning an empty list).
    const where: Record<string, unknown> = {}
    if (user.workspaceId) {
      where.workspaceId = user.workspaceId
    } else {
      const fallbackWorkspace = await db.workspace.findFirst({
        where: user.tenantId ? { tenantId: user.tenantId } : undefined,
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (fallbackWorkspace) {
        where.workspaceId = fallbackWorkspace.id
      } else {
        return NextResponse.json({ customers: [], pagination: { page, pageSize, total: 0, totalPages: 0, hasNextPage: false } })
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { address: { contains: search } },
      ]
    }

    // C-2C payload hygiene: select only non-sensitive columns. Previously
    // this had no `select`, which leaked passwordHash / activationToken /
    // marketingConsentIp to the browser on every customer-list fetch.

    // C-3 (C3b): when search is present, skip the expensive count(*).
    // ILIKE '%term%' can't use B-tree indexes → count scans the full table.
    const isSearchActive = !!search?.trim();

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: CUSTOMER_PUBLIC_SELECT,
        take: pageSize,
        skip,
      }),
      isSearchActive ? Promise.resolve(null) : db.customer.count({ where }),
    ]);

    const hasNextPage = customers.length === pageSize;
    const totalPages = total === null ? null : (total === 0 ? 0 : Math.ceil(total / pageSize));

    return NextResponse.json({
      customers,
      pagination: {
        page,
        pageSize,
        total,           // null during search, exact count otherwise
        totalPages,      // null during search, exact count otherwise
        hasNextPage,
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// POST /api/customers — create a new customer
// Automatically attaches the customer to the logged-in user's workspace so
// the workspaceId is NEVER null (which was breaking invitation links because
// the slug lookup chain Customer→Workspace→Tenant was broken).
export async function POST(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, email, address, whatsappId, preferredCurrency } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Always use the logged-in user's workspaceId — ignore any workspaceId in
    // the request body. This ensures every customer is properly scoped and
    // the Customer→Workspace→Tenant→slug chain stays intact for invitation
    // link generation.
    const workspaceId = user.workspaceId || null

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        address: address || null,
        whatsappId: whatsappId || null,
        workspaceId,
        preferredCurrency: preferredCurrency || 'USD',
      },
    })

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Best-effort — never fails the customer creation. Customer uses
    // workspaceId → workspace.tenantId for tenant scoping.
    try {
      let customerTenantId: string | null = user.tenantId || null
      if (!customerTenantId && customer.workspaceId) {
        const ws = await db.workspace.findUnique({
          where: { id: customer.workspaceId },
          select: { tenantId: true },
        })
        customerTenantId = ws?.tenantId ?? null
      }
      if (customerTenantId) {
        await logActivity({
          tenantId: customerTenantId,
          actorId: user.id,
          actorName: user.name || user.email,
          actorType: 'user',
          action: 'create',
          entityType: 'customer',
          entityId: customer.id,
          entityName: customer.name || null,
          description: `Created customer: ${customer.name}`,
          metadataJson: JSON.stringify({
            phone: customer.phone,
            email: customer.email,
            workspaceId: customer.workspaceId,
          }),
          severity: 'info',
        })
      }
    } catch (logErr) {
      console.error('[Customers POST] Failed to log activity:', logErr)
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

// PUT /api/customers?id=... — update an existing customer
// Verifies the customer belongs to the authenticated user's workspace before
// updating.
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Ownership check: the customer must belong to the user's workspace
    if (user.workspaceId) {
      const existing = await db.customer.findFirst({
        where: { id, workspaceId: user.workspaceId },
        select: { id: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
    }

    const body = await request.json()
    const { name, phone, email, address, whatsappId, preferredCurrency } = body

    const customer = await db.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(whatsappId !== undefined && { whatsappId }),
        ...(preferredCurrency !== undefined && { preferredCurrency }),
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// DELETE /api/customers?id=... — delete a customer
// Verifies ownership before deleting.
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Ownership check
    if (user.workspaceId) {
      const existing = await db.customer.findFirst({
        where: { id, workspaceId: user.workspaceId },
        select: { id: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
    }

    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers', _GET);
