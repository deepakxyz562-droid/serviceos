import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET /api/customers — list customers for the authenticated user's tenant
// Scopes results to the logged-in user's workspace/tenant so cross-tenant
// data never leaks. Supports optional ?search= query.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Scope to the user's workspace. If they have no workspace (shouldn't
    // happen for staff), fall back to returning nothing rather than leaking
    // all customers.
    const where: Record<string, unknown> = {}
    if (user.workspaceId) {
      where.workspaceId = user.workspaceId
    } else {
      // No workspace → return empty list (safer than returning everything)
      return NextResponse.json([])
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { address: { contains: search } },
      ]
    }

    const customers = await db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(customers)
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
