import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { CUSTOMER_PUBLIC_SELECT } from '@/lib/customer-select'
import { normalizePhone, normalizeEmail } from '@/lib/customer-normalize'

async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // C-2C + Phase 5: use `select` (not `include`) so the top-level Customer row
    // never returns passwordHash / activationToken / marketingConsentIp to the
    // browser. Nested relations use explicit `select` to exclude large blobs
    // (Conversation.messagesJson / metadataJson) that caused 5x payload bloat.
    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        ...CUSTOMER_PUBLIC_SELECT,
        jobs: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            type: true,
            address: true,
            scheduledAt: true,
            scheduledTime: true,
            estimatedDuration: true,
            quotedAmount: true,
            actualStartTime: true,
            actualEndTime: true,
            completedAt: true,
            notes: true,
            customerId: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            assigneeId: true,
            assigneeName: true,
            assigneePhone: true,
            paymentStatus: true,
            paymentMethod: true,
            customerRating: true,
            cancelledAt: true,
            createdAt: true,
            updatedAt: true,
            assignee: { select: { id: true, name: true, phone: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        invoices: {
          select: {
            id: true,
            number: true,
            status: true,
            amount: true,
            tax: true,
            discount: true,
            total: true,
            currency: true,
            invoiceType: true,
            dueDate: true,
            sentAt: true,
            paidAt: true,
            notes: true,
            jobId: true,
            customerId: true,
            employeeId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        leads: {
          select: {
            id: true,
            name: true,
            source: true,
            serviceType: true,
            status: true,
            value: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        conversations: {
          // Phase 5: explicitly select columns — EXCLUDE messagesJson and
          // metadataJson (large blobs that caused 5x payload bloat when
          // using `include: true` on the nested relation).
          select: {
            id: true,
            conversationId: true,
            customerPhone: true,
            customerName: true,
            customerWhatsappId: true,
            customerId: true,
            channel: true,
            status: true,
            currentStage: true,
            intentDetected: true,
            lastMessageAt: true,
            lastMessageBody: true,
            lastDirection: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
        },
        quotes: {
          // Phase 2: quotes for the Customer 360 Quotes tab + Convert to Job.
          // Select only the fields needed by the UI (exclude large description
          // blobs unless needed).
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            subtotal: true,
            tax: true,
            discount: true,
            discountType: true,
            total: true,
            currency: true,
            itemsJson: true,
            addOnsJson: true,
            validUntil: true,
            jobId: true,
            customerId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
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
    const quotes = customer.quotes ?? []

    // Compute aggregate stats
    const completedJobs = jobs.filter(j => j.status === 'completed')
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0)
    // Outstanding = invoices that have been sent but not yet paid.
    // Valid Invoice statuses: draft, sent, paid, pending_approval, cancelled.
    // 'pending' and 'overdue' are included for legacy data safety.
    const outstandingBalance = invoices
      .filter(i => ['sent', 'pending_approval', 'pending', 'overdue'].includes(i.status))
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
      quotes,
      stats: {
        totalJobs: jobs.length,
        completedJobs: completedJobs.length,
        totalRevenue,
        outstandingBalance,
        avgRating: Math.round(avgRating * 10) / 10,
        totalInvoices: invoices.length,
        totalConversations: conversations.length,
        totalQuotes: quotes.length,
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

    // Keep normalizedPhone/normalizedEmail in sync when phone/email changes
    const normalizedPhone = phone ? normalizePhone(phone) : undefined
    const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined

    const customer = await db.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(normalizedPhone !== undefined && { normalizedPhone }),
        ...(normalizedEmail !== undefined && { normalizedEmail }),
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

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers/[id]', _GET);
