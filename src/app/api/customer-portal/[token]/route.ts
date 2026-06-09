import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer-portal/[token] - Get customer portal data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate the session
    const session = await db.customerPortalSession.findUnique({
      where: { token },
      include: {
        customer: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid portal token' },
        { status: 404 }
      )
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      )
    }

    // Update last accessed
    await db.customerPortalSession.update({
      where: { id: session.id },
      data: { lastAccessedAt: new Date() },
    })

    const customerId = session.customerId

    // Fetch customer data in parallel
    const [jobs, invoices, leads] = await Promise.all([
      // Jobs (bookings)
      db.job.findMany({
        where: { customerId },
        include: {
          assignee: { select: { id: true, name: true, phone: true, avatar: true, rating: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Invoices
      db.invoice.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      }),
      // Leads
      db.lead.findMany({
        where: { customerId },
        select: {
          id: true,
          name: true,
          status: true,
          serviceType: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      customer: session.customer,
      bookings: jobs.map(job => ({
        id: job.id,
        title: job.title,
        status: job.status,
        priority: job.priority,
        address: job.address,
        scheduledAt: job.scheduledAt,
        assigneeName: job.assigneeName,
        assignee: job.assignee,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount,
        tax: inv.tax,
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
      })),
      leads,
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching customer portal data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
