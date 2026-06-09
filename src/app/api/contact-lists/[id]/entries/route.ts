import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contactList = await db.contactList.findUnique({
      where: { id },
    })

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 })
    }

    // For role_based/all_employees/customers types, return live data from DB
    if (contactList.type === 'all_employees') {
      const employees = await db.employee.findMany({ orderBy: { name: 'asc' } })
      const entries = employees.map((emp) => ({
        id: `employee-${emp.id}`,
        contactListId: id,
        name: emp.name,
        phone: emp.phone,
        email: null,
        role: emp.role,
        employeeId: emp.id,
        whatsappId: emp.whatsappId,
        avatar: emp.avatar,
        isLive: true,
      }))
      return NextResponse.json(entries)
    }

    if (contactList.type === 'role_based' && contactList.roleFilter) {
      const employees = await db.employee.findMany({
        where: { role: contactList.roleFilter },
        orderBy: { name: 'asc' },
      })
      const entries = employees.map((emp) => ({
        id: `employee-${emp.id}`,
        contactListId: id,
        name: emp.name,
        phone: emp.phone,
        email: null,
        role: emp.role,
        employeeId: emp.id,
        whatsappId: emp.whatsappId,
        avatar: emp.avatar,
        isLive: true,
      }))
      return NextResponse.json(entries)
    }

    if (contactList.type === 'customers') {
      const customers = await db.customer.findMany({ orderBy: { name: 'asc' } })
      const entries = customers.map((cust) => ({
        id: `customer-${cust.id}`,
        contactListId: id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        role: null,
        customerId: cust.id,
        whatsappId: cust.whatsappId,
        avatar: null,
        isLive: true,
      }))
      return NextResponse.json(entries)
    }

    // For custom type, return stored entries
    const entries = await db.contactListEntry.findMany({
      where: { contactListId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching contact list entries:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contactList = await db.contactList.findUnique({
      where: { id },
    })

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 })
    }

    // Only allow adding entries to custom type lists
    if (contactList.type !== 'custom') {
      return NextResponse.json(
        { error: 'Can only add entries to custom type contact lists' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Support single entry or array of entries
    const entriesData = Array.isArray(body) ? body : [body]

    const createdEntries = await Promise.all(
      entriesData.map((entry: { name: string; phone: string; email?: string; role?: string; employeeId?: string; customerId?: string; whatsappId?: string; avatar?: string; metadataJson?: unknown }) =>
        db.contactListEntry.create({
          data: {
            contactListId: id,
            name: entry.name,
            phone: entry.phone,
            email: entry.email,
            role: entry.role,
            employeeId: entry.employeeId,
            customerId: entry.customerId,
            whatsappId: entry.whatsappId,
            avatar: entry.avatar,
            metadataJson: entry.metadataJson ? JSON.stringify(entry.metadataJson) : undefined,
          },
        })
      )
    )

    return NextResponse.json(createdEntries, { status: 201 })
  } catch (error) {
    console.error('Error creating contact list entries:', error)
    return NextResponse.json({ error: 'Failed to create entries' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    await db.contactListEntry.delete({
      where: { id: entryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact list entry:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
