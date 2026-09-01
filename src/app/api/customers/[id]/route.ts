import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { CUSTOMER_PUBLIC_SELECT } from '@/lib/customer-select'
import { normalizePhone, normalizeEmail } from '@/lib/customer-normalize'
import { getAuthUser } from '@/lib/auth'

async function _GET(
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

    // Tenant-scoped lookup: super-admins can access any tenant; everyone else
    // is constrained to their own tenant. This prevents cross-tenant IDOR.
    const tenantFilter = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
      ? {}
      : { tenantId: user.tenantId }

    // C-2C + Phase 5: use `select` (not `include`) so the top-level Customer row
    // never returns passwordHash / activationToken / marketingConsentIp to the
    // browser. Nested relations use explicit `select` to exclude large blobs
    // (Conversation.messagesJson / metadataJson) that caused 5x payload bloat.
    const customer = await db.customer.findFirst({
      where: { id, ...tenantFilter },
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
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name: explicitName,
      phone,
      email,
      address,
      whatsappId,
      title,
      firstName,
      lastName,
      companyName,
      leadSource,
      notificationSettingsJson,
    } = body

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : '',
    ].filter(Boolean).join(' ').trim()
      || (typeof explicitName === 'string' ? explicitName.trim() : '')
      || (typeof companyName === 'string' ? companyName.trim() : '')

    // Keep normalizedPhone/normalizedEmail in sync when phone/email changes
    const normalizedPhone = phone ? normalizePhone(phone) : undefined
    const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined

    // Tenant-scoped update: use updateMany with tenantId in WHERE so a
    // cross-tenant ID is a no-op (0 rows affected) rather than a mutation.
    // Super-admins can update any tenant; everyone else is constrained.
    const tenantFilter = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
      ? {}
      : { tenantId: user.tenantId }

    const updateResult = await db.customer.updateMany({
      where: { id, ...tenantFilter },
      data: {
        ...(derivedName && { name: derivedName }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(normalizedPhone !== undefined && { normalizedPhone }),
        ...(normalizedEmail !== undefined && { normalizedEmail }),
        ...(address !== undefined && { address }),
        ...(whatsappId !== undefined && { whatsappId }),
        ...(title !== undefined && { title }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(companyName !== undefined && { companyName }),
        ...(leadSource !== undefined && { leadSource }),
        ...(notificationSettingsJson !== undefined && { notificationSettingsJson }),
      },
    })

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Fetch the updated customer to return (tenant-scoped for safety)
    const customer = await db.customer.findFirst({
      where: { id, ...tenantFilter },
      select: CUSTOMER_PUBLIC_SELECT,
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
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Tenant-scoped delete: use deleteMany with tenantId in WHERE so a
    // cross-tenant ID is a no-op (0 rows affected) rather than a deletion.
    const tenantFilter = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
      ? {}
      : { tenantId: user.tenantId }

    const deleteResult = await db.customer.deleteMany({
      where: { id, ...tenantFilter },
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers/[id]', _GET);
