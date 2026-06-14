import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            assignee: { select: { id: true, name: true, phone: true, avatar: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Ensure related arrays exist (may be undefined with some DB adapters)
    const jobs = customer.jobs ?? []
    const invoices = customer.invoices ?? []
    const conversations = customer.conversations ?? []
    const leads = customer.leads ?? []

    // Compute aggregate stats
    const completedJobs = jobs.filter(j => j.status === 'completed')
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0)
    const outstandingBalance = invoices
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, i) => sum + (i.total || 0), 0)
    const avgRating = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.customerRating || 0), 0) / completedJobs.filter(j => j.customerRating).length || 0
      : 0

    return NextResponse.json({
      ...customer,
      jobs,
      invoices,
      conversations,
      leads,
      stats: {
        totalJobs: jobs.length,
        completedJobs: completedJobs.length,
        totalRevenue,
        outstandingBalance,
        avgRating: Math.round(avgRating * 10) / 10,
        totalInvoices: invoices.length,
        totalConversations: conversations.length,
      },
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, address, whatsappId } = body

    const customer = await db.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(whatsappId !== undefined && { whatsappId }),
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
