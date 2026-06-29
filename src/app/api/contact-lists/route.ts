import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const workspaceId = searchParams.get('workspaceId')

    const authUser = await getAuthUser()
    const isSuperAdmin = authUser?.isSuperAdmin || (authUser?.role === 'admin' && !authUser?.tenantId)

    // Build workspace filter for ContactList query
    const where: Record<string, unknown> = {}
    if (type) where.type = type

    // Build a reusable workspaceId filter for employee/customer queries
    let workspaceIdFilter: Record<string, unknown> = {}

    if (isSuperAdmin) {
      if (workspaceId) {
        where.workspaceId = workspaceId
        workspaceIdFilter = { workspaceId }
      }
      // Super admin without specific workspaceId: no filter (sees all)
    } else if (authUser?.tenantId) {
      if (workspaceId) {
        where.workspaceId = workspaceId
        workspaceIdFilter = { workspaceId }
      } else {
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: authUser.tenantId },
          select: { id: true },
        })
        const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id)
        if (workspaceIds.length > 0) {
          where.workspaceId = { in: workspaceIds }
          workspaceIdFilter = { workspaceId: { in: workspaceIds } }
        }
      }
    } else if (authUser?.workspaceId) {
      where.workspaceId = authUser.workspaceId
      workspaceIdFilter = { workspaceId: authUser.workspaceId }
    } else {
      // Not authenticated or no tenant info
      return NextResponse.json([])
    }

    const contactLists = await db.contactList.findMany({
      where,
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // For role_based lists, compute live count from Employee/Customer table
    const result = await Promise.all(
      contactLists.map(async (cl) => {
        let liveEntryCount: number | null = null

        if (cl.type === 'role_based' && cl.roleFilter) {
          liveEntryCount = await db.employee.count({
            where: { role: cl.roleFilter, ...workspaceIdFilter },
          })
        } else if (cl.type === 'all_employees') {
          liveEntryCount = await db.employee.count({ where: workspaceIdFilter })
        } else if (cl.type === 'customers') {
          liveEntryCount = await db.customer.count({ where: workspaceIdFilter })
        }

        return {
          ...cl,
          entryCount: liveEntryCount ?? cl._count.entries,
          _count: undefined,
        }
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching contact lists:', error)
    return NextResponse.json({ error: 'Failed to fetch contact lists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, roleFilter, icon, color, isDefault, workspaceId, syncFromDb } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const contactList = await db.contactList.create({
      data: {
        name,
        description,
        type: type || 'custom',
        roleFilter,
        icon,
        color,
        isDefault: isDefault ?? false,
        workspaceId,
      },
    })

    // If syncFromDb is true, auto-populate entries from Employees/Customers
    if (syncFromDb) {
      // Apply workspace-based filtering for sync as well
      const authUser = await getAuthUser()
      const isSuperAdmin = authUser?.isSuperAdmin || (authUser?.role === 'admin' && !authUser?.tenantId)
      const syncWorkspaceId = workspaceId || authUser?.workspaceId

      if (type === 'all_employees' || type === 'role_based') {
        const employeeWhere: Record<string, unknown> = {}
        if (type === 'role_based' && roleFilter) {
          employeeWhere.role = roleFilter
        }
        if (!isSuperAdmin && syncWorkspaceId) {
          employeeWhere.workspaceId = syncWorkspaceId
        }
        const employees = await db.employee.findMany({ where: employeeWhere })

        if (employees.length > 0) {
          await db.contactListEntry.createMany({
            data: employees.map((emp) => ({
              contactListId: contactList.id,
              name: emp.name,
              phone: emp.phone,
              role: emp.role,
              employeeId: emp.id,
              whatsappId: emp.whatsappId,
              avatar: emp.avatar,
            })),
          })
        }
      } else if (type === 'customers') {
        const customerWhere: Record<string, unknown> = {}
        if (!isSuperAdmin && syncWorkspaceId) {
          customerWhere.workspaceId = syncWorkspaceId
        }
        const customers = await db.customer.findMany({ where: customerWhere })

        if (customers.length > 0) {
          await db.contactListEntry.createMany({
            data: customers.map((cust) => ({
              contactListId: contactList.id,
              name: cust.name,
              phone: cust.phone,
              email: cust.email,
              customerId: cust.id,
              whatsappId: cust.whatsappId,
            })),
          })
        }
      }
    }

    // Return with entry count
    const entryCount = await db.contactListEntry.count({
      where: { contactListId: contactList.id },
    })

    return NextResponse.json({ ...contactList, entryCount }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact list:', error)
    return NextResponse.json({ error: 'Failed to create contact list' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Contact list ID is required' }, { status: 400 })
    }

    const contactList = await db.contactList.update({
      where: { id },
      data,
    })

    return NextResponse.json(contactList)
  } catch (error) {
    console.error('Error updating contact list:', error)
    return NextResponse.json({ error: 'Failed to update contact list' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Contact list ID is required' }, { status: 400 })
    }

    await db.contactList.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact list:', error)
    return NextResponse.json({ error: 'Failed to delete contact list' }, { status: 500 })
  }
}
