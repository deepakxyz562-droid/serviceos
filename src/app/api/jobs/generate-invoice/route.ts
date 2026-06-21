import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoiceNumber } from '@/lib/invoice-automation'

// POST /api/jobs/generate-invoice — Generate invoice from a completed job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, taxRate, discountType, discountValue, dueDays } = body

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { customer: true, assignee: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if invoice already exists for this job (jobId is NOT unique on Invoice,
    // so we use findFirst instead of findUnique)
    const existingInvoice = await db.invoice.findFirst({ where: { jobId } })
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists for this job', invoice: existingInvoice }, { status: 409 })
    }

    // Generate a globally-unique invoice number. The `number` column is
    // @unique globally, so use the shared collision-safe generator (same one
    // used by the auto-invoice path) instead of a naive "last + 1" which
    // races on Postgres and collides across tenants.
    let invoiceTenantId: string | undefined = undefined
    if (job.workspaceId) {
      const ws = await db.workspace.findUnique({
        where: { id: job.workspaceId },
        select: { tenantId: true },
      })
      invoiceTenantId = ws?.tenantId || undefined
    }
    const invoiceNumber = await generateInvoiceNumber(invoiceTenantId || null)

    // Build line items from job
    const unitPrice = job.estimatedDuration ? Math.round(job.estimatedDuration * 5) : 1500
    const items = [
      {
        description: job.title,
        quantity: 1,
        unitPrice,
        amount: unitPrice,
      },
    ]

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxPct = taxRate ?? 18
    const taxAmount = subtotal * (taxPct / 100)
    const discountVal = discountValue ?? 0
    let discountAmount = 0
    if (discountType === 'percentage' && discountVal > 0) discountAmount = subtotal * (discountVal / 100)
    else if (discountType === 'fixed' && discountVal > 0) discountAmount = discountVal
    const total = subtotal + taxAmount - discountAmount

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (dueDays || 7))

    // Persist breakdown details in itemsJson so the Invoice model stays clean
    const breakdown = {
      subtotal,
      taxRate: taxPct,
      taxAmount,
      discountType: discountType ?? null,
      discountValue: discountVal,
      discountAmount,
      currency: 'USD',
      customerSnapshot: {
        name: job.customerName,
        email: job.customer?.email,
        phone: job.customerPhone,
      },
    }

    const invoice = await db.invoice.create({
      data: {
        number: invoiceNumber,
        status: 'draft',
        customerId: job.customerId,
        jobId: job.id,
        employeeId: job.assigneeId,
        // Invoice model uses amount/tax/discount/total (not subtotal/taxRate/etc.)
        amount: subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total,
        currency: 'USD',
        itemsJson: JSON.stringify({ items, breakdown }),
        dueDate,
        notes: `Invoice for ${job.title} (${job.jobNumber || job.id.slice(0, 8)})`,
        tenantId: invoiceTenantId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Failed to generate invoice:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
