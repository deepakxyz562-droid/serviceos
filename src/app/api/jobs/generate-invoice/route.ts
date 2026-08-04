import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoiceNumber } from '@/lib/invoice-automation'
import { getAuthUser } from '@/lib/auth'

// POST /api/jobs/generate-invoice — Generate invoice from a completed job
//
// Auth: optional. This endpoint is hit both interactively (owner/admin clicking
// "Generate Invoice" in the UI — authenticated) AND by the fire-and-forget
// auto-invoice flow on job completion (autoCreateInvoiceFromJob — may run
// without a session cookie, e.g. when a job is completed via a system trigger).
// We therefore call getAuthUser() but tolerate `null` — tenantId is resolved
// from the job's workspace chain first, falling back to the auth user only
// when present.
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

    // Check if invoice already exists for this job (make idempotent — return 200 OK with existing invoice)
    const existingInvoice = await db.invoice.findFirst({ where: { jobId } })
    if (existingInvoice) {
      return NextResponse.json(existingInvoice, { status: 200 })
    }

    // Resolve the calling user (optional — auto-invoice flow may be anonymous).
    const authUser = await getAuthUser().catch(() => null)

    // Generate a globally-unique invoice number with robust tenantId fallback.
    // Resolution order:
    //   1. job.workspaceId → Workspace.tenantId
    //   2. authUser.tenantId (when the caller is authenticated)
    //   3. null (generateInvoiceNumber handles null by using a global counter)
    let invoiceTenantId: string | undefined = undefined
    if (job.workspaceId) {
      const ws = await db.workspace.findUnique({
        where: { id: job.workspaceId },
        select: { tenantId: true },
      })
      invoiceTenantId = ws?.tenantId || undefined
    }
    if (!invoiceTenantId && authUser?.tenantId) {
      invoiceTenantId = authUser.tenantId
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
