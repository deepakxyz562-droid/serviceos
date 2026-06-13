import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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

    // Check if invoice already exists for this job
    const existingInvoice = await db.invoice.findUnique({ where: { jobId } })
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists for this job', invoice: existingInvoice }, { status: 409 })
    }

    // Generate invoice number
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    })
    let nextNum = 1
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/)
      if (match) nextNum = parseInt(match[1], 10) + 1
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`

    // Build line items from job
    const items = [
      {
        description: job.service || job.title,
        quantity: 1,
        unitPrice: job.estimatedDuration ? Math.round(job.estimatedDuration * 5) : 1500,
        amount: job.estimatedDuration ? Math.round(job.estimatedDuration * 5) : 1500,
      },
    ]

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const tax = taxRate ?? 18
    const taxAmount = subtotal * (tax / 100)
    const discount = discountValue ?? 0
    let discountAmount = 0
    if (discountType === 'percentage' && discount > 0) discountAmount = subtotal * (discount / 100)
    else if (discountType === 'fixed' && discount > 0) discountAmount = discount
    const total = subtotal + taxAmount - discountAmount

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (dueDays || 7))

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        status: 'draft',
        customerId: job.customerId,
        customerName: job.customerName,
        customerEmail: job.customer?.email,
        customerPhone: job.customerPhone,
        jobId: job.id,
        itemsJson: JSON.stringify(items),
        subtotal,
        taxRate: tax,
        taxAmount,
        discountType: discountType ?? null,
        discountValue: discount,
        discountAmount,
        total,
        amountPaid: 0,
        dueDate,
        notes: `Invoice for ${job.title} (${job.jobNumber || job.id.slice(0,8)})`,
        tenantId: job.tenantId,
        workspaceId: job.workspaceId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    })

    // Update customer totalSpent
    if (job.customerId) {
      await db.customer.update({
        where: { id: job.customerId },
        data: { totalSpent: { increment: total } },
      })
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Failed to generate invoice:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
