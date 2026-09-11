import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { CUSTOMER_PUBLIC_SELECT } from '@/lib/customer-select'
import { normalizePhone, normalizeEmail } from '@/lib/customer-normalize'
import { getAuthUser } from '@/lib/auth'
import { requireCrmTenant } from '@/lib/require-crm-tenant'
import { logActivity } from '@/lib/activity-log'

async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'

    const whereClause: Record<string, unknown> = { id }
    if (!isSuperAdmin) {
      const orConditions: Array<Record<string, unknown>> = []
      if (user.tenantId) {
        orConditions.push({ tenantId: user.tenantId })
        orConditions.push({ workspace: { tenantId: user.tenantId } })
      }
      if (user.workspaceId) {
        orConditions.push({ workspaceId: user.workspaceId })
      }
      if (orConditions.length === 0) {
        return NextResponse.json({ error: 'Tenant context required' }, { status: 401 })
      }
      whereClause.OR = orConditions
    }

    // C-2C + Phase 5: use `select` (not `include`) so the top-level Customer row
    // never returns passwordHash / activationToken / marketingConsentIp to the
    // browser. Nested relations use explicit `select` to exclude large blobs
    // (Conversation.messagesJson / metadataJson) that caused 5x payload bloat.
    const customer = await db.customer.findFirst({
      where: whereClause,
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
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

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
      preferredCurrency,
      notificationSettingsJson,
      properties,
      additionalContacts,
    } = body

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'

    const whereClause: Record<string, unknown> = { id }
    if (!isSuperAdmin) {
      const orConditions: Array<Record<string, unknown>> = []
      if (user.tenantId) {
        orConditions.push({ tenantId: user.tenantId })
        orConditions.push({ workspace: { tenantId: user.tenantId } })
      }
      if (user.workspaceId) {
        orConditions.push({ workspaceId: user.workspaceId })
      }
      if (orConditions.length === 0) {
        return NextResponse.json({ error: 'Tenant context required' }, { status: 401 })
      }
      whereClause.OR = orConditions
    }

    const existingCustomer = await db.customer.findFirst({
      where: whereClause,
      select: {
        id: true,
        tenantId: true,
        workspaceId: true,
        normalizedPhone: true,
        normalizedEmail: true,
        workspace: {
          select: { id: true, tenantId: true },
        },
      },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : '',
    ].filter(Boolean).join(' ').trim()
      || (typeof explicitName === 'string' ? explicitName.trim() : '')
      || (typeof companyName === 'string' ? companyName.trim() : '')

    // Keep normalizedPhone/normalizedEmail in sync when phone/email changes
    const normalizedPhone = phone !== undefined ? (phone ? normalizePhone(phone) : null) : undefined
    const normalizedEmail = email !== undefined ? (email ? normalizeEmail(email) : null) : undefined

    const targetTenantId = existingCustomer.tenantId || user.tenantId || existingCustomer.workspace?.tenantId || null

    // ── Duplicate detection on update ──
    if (targetTenantId && (normalizedPhone !== undefined || normalizedEmail !== undefined)) {
      const dupOr: Array<Record<string, unknown>> = []
      if (normalizedPhone && normalizedPhone !== existingCustomer.normalizedPhone) {
        dupOr.push({ tenantId: targetTenantId, normalizedPhone })
      }
      if (normalizedEmail && normalizedEmail !== existingCustomer.normalizedEmail) {
        dupOr.push({ tenantId: targetTenantId, normalizedEmail })
      }
      if (dupOr.length > 0) {
        const duplicate = await db.customer.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              { OR: dupOr },
            ],
          },
          select: { id: true, name: true, phone: true, email: true },
        })
        if (duplicate) {
          return NextResponse.json(
            {
              error: 'duplicate_customer',
              existingCustomer: duplicate,
            },
            { status: 409 },
          )
        }
      }
    }

    // ── Parse & clean nested collections ──
    const hasAdditionalContacts = Array.isArray(additionalContacts)
    const cleanedAdditionalContacts = hasAdditionalContacts
      ? additionalContacts
          .filter(
            (c: unknown): c is Record<string, unknown> =>
              !!c && typeof c === 'object' && typeof (c as Record<string, unknown>).name === 'string' &&
              (c as Record<string, unknown>).name.trim().length > 0,
          )
          .map((c: Record<string, unknown>) => ({
            name: String(c.name).trim(),
            phone: typeof c.phone === 'string' && c.phone.trim() ? c.phone.trim() : null,
            email: typeof c.email === 'string' && c.email.trim() ? c.email.trim() : null,
            role: typeof c.role === 'string' && c.role.trim() ? c.role.trim() : null,
          }))
      : []

    const hasProperties = Array.isArray(properties)
    const cleanedProperties = hasProperties
      ? properties
          .filter(
            (p: unknown): p is Record<string, unknown> =>
              !!p && typeof p === 'object' && typeof (p as Record<string, unknown>).street1 === 'string' &&
              (p as Record<string, unknown>).street1.trim().length > 0,
          )
          .map((p: Record<string, unknown>) => {
            const contacts = Array.isArray(p.contacts)
              ? p.contacts
                  .filter(
                    (c: unknown): c is Record<string, unknown> =>
                      !!c && typeof c === 'object' && typeof (c as Record<string, unknown>).name === 'string' &&
                      (c as Record<string, unknown>).name.trim().length > 0,
                  )
                  .map((c: Record<string, unknown>) => ({
                    name: String(c.name).trim(),
                    phone: typeof c.phone === 'string' && c.phone.trim() ? c.phone.trim() : null,
                    email: typeof c.email === 'string' && c.email.trim() ? c.email.trim() : null,
                    role: typeof c.role === 'string' && c.role.trim() ? c.role.trim() : null,
                  }))
              : []
            return {
              label: typeof p.label === 'string' && p.label.trim() ? p.label.trim() : null,
              street1: String(p.street1).trim(),
              street2: typeof p.street2 === 'string' && p.street2.trim() ? p.street2.trim() : null,
              city: typeof p.city === 'string' && p.city.trim() ? p.city.trim() : null,
              province: typeof p.province === 'string' && p.province.trim() ? p.province.trim() : null,
              postalCode: typeof p.postalCode === 'string' && p.postalCode.trim() ? p.postalCode.trim() : null,
              country: typeof p.country === 'string' && p.country.trim() ? p.country.trim() : null,
              isPrimary: p.isPrimary === true,
              contacts,
            }
          })
      : []

    // ── Execute update in a single transaction ──
    await db.$transaction(async (tx) => {
      let resolvedAddress = address !== undefined ? address : undefined
      if (resolvedAddress === undefined && cleanedProperties.length > 0) {
        const primary = cleanedProperties.find((p) => p.isPrimary) || cleanedProperties[0]
        if (primary) {
          resolvedAddress = [primary.street1, primary.city, primary.province, primary.postalCode]
            .filter(Boolean)
            .join(', ')
        }
      }

      await tx.customer.update({
        where: { id },
        data: {
          ...(derivedName ? { name: derivedName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
          ...(normalizedPhone !== undefined ? { normalizedPhone } : {}),
          ...(normalizedEmail !== undefined ? { normalizedEmail } : {}),
          ...(resolvedAddress !== undefined ? { address: resolvedAddress || null } : {}),
          ...(whatsappId !== undefined ? { whatsappId: whatsappId || null } : {}),
          ...(title !== undefined ? { title: title || null } : {}),
          ...(firstName !== undefined ? { firstName: firstName || null } : {}),
          ...(lastName !== undefined ? { lastName: lastName || null } : {}),
          ...(companyName !== undefined ? { companyName: companyName || null } : {}),
          ...(leadSource !== undefined ? { leadSource: leadSource || null } : {}),
          ...(preferredCurrency !== undefined ? { preferredCurrency: preferredCurrency || 'USD' } : {}),
          ...(notificationSettingsJson !== undefined ? { notificationSettingsJson } : {}),
          // Backfill tenantId if it was missing on the customer row
          ...(!existingCustomer.tenantId && targetTenantId ? { tenantId: targetTenantId } : {}),
        },
      })

      if (hasAdditionalContacts) {
        await tx.customerContact.deleteMany({ where: { customerId: id } })
        if (cleanedAdditionalContacts.length > 0) {
          await tx.customerContact.createMany({
            data: cleanedAdditionalContacts.map((c) => ({ ...c, customerId: id })),
          })
        }
      }

      if (hasProperties) {
        await tx.propertyContact.deleteMany({
          where: { property: { customerId: id } },
        })
        await tx.property.deleteMany({
          where: { customerId: id },
        })
        for (const prop of cleanedProperties) {
          const { contacts: propContacts, ...propFields } = prop
          const createdProp = await tx.property.create({
            data: { ...propFields, customerId: id },
          })
          if (propContacts.length > 0) {
            await tx.propertyContact.createMany({
              data: propContacts.map((c) => ({ ...c, propertyId: createdProp.id })),
            })
          }
        }
      }
    })

    // Fetch the updated customer to return
    const customer = await db.customer.findUnique({
      where: { id },
      select: CUSTOMER_PUBLIC_SELECT,
    })

    // Best-effort activity logging
    try {
      if (targetTenantId) {
        await logActivity({
          tenantId: targetTenantId,
          actorId: user.id,
          actorName: user.name || user.email,
          actorType: 'user',
          action: 'update',
          entityType: 'customer',
          entityId: id,
          entityName: customer?.name || null,
          description: `Updated customer: ${customer?.name || id}`,
          metadataJson: JSON.stringify({
            phone: customer?.phone,
            email: customer?.email,
            workspaceId: customer?.workspaceId,
            leadSource: customer?.leadSource,
            propertiesCount: cleanedProperties.length,
            additionalContactsCount: cleanedAdditionalContacts.length,
          }),
          severity: 'info',
        })
      }
    } catch (actErr) {
      console.warn('[customers/[id]] Non-fatal activity log failure on update:', actErr)
    }

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
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'

    const whereClause: Record<string, unknown> = { id }
    if (!isSuperAdmin) {
      const orConditions: Array<Record<string, unknown>> = []
      if (user.tenantId) {
        orConditions.push({ tenantId: user.tenantId })
        orConditions.push({ workspace: { tenantId: user.tenantId } })
      }
      if (user.workspaceId) {
        orConditions.push({ workspaceId: user.workspaceId })
      }
      if (orConditions.length === 0) {
        return NextResponse.json({ error: 'Tenant context required' }, { status: 401 })
      }
      whereClause.OR = orConditions
    }

    const existingCustomer = await db.customer.findFirst({
      where: whereClause,
      select: {
        id: true,
        name: true,
        tenantId: true,
        workspace: { select: { tenantId: true } },
      },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await db.customer.delete({
      where: { id },
    })

    // Best-effort activity logging
    try {
      const deleteTenantId = existingCustomer.tenantId || user.tenantId || existingCustomer.workspace?.tenantId || null
      if (deleteTenantId) {
        await logActivity({
          tenantId: deleteTenantId,
          actorId: user.id,
          actorName: user.name || user.email,
          actorType: 'user',
          action: 'delete',
          entityType: 'customer',
          entityId: id,
          entityName: existingCustomer.name || null,
          description: `Deleted customer: ${existingCustomer.name || id}`,
          severity: 'info',
        })
      }
    } catch (actErr) {
      console.warn('[customers/[id]] Non-fatal activity log failure on delete:', actErr)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers/[id]', _GET);
