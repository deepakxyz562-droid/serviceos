import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/invoices/[id] — Get single invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, address: true },
        },
        job: {
          select: { id: true, title: true, jobNumber: true, status: true, service: true },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Failed to get invoice:', error)
    return NextResponse.json(
      { error: 'Failed to get invoice' },
      { status: 500 }
    )
  }
}

// PUT /api/invoices/[id] — Full update of invoice (status changes, payment info)
// NOTE: The Invoice schema uses `amount`, `tax`, `discount`, `total` (NOT
// `subtotal`, `taxAmount`, `discountAmount`, `taxRate`, `discountType`,
// `discountValue`). There is no `customerName/Email/Phone`, `amountPaid`,
// `paymentMethod`, `paymentId`, or `pdfUrl` column on Invoice either. This
// handler was rewritten to only touch fields that actually exist on the model.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      status,
      customerId,
      itemsJson,
      taxPercent,   // percentage e.g. 18
      discount,     // flat amount in transaction currency
      dueDate,
      notes,
    } = body

    // Recalculate totals only if line items changed. The schema stores a single
    // `amount` (subtotal), `tax`, `discount`, `total`.
    let amount = existing.amount
    let tax = existing.tax
    let discountVal = existing.discount
    let total = existing.total

    if (itemsJson !== undefined) {
      let items: Array<{ description: string; quantity: number; rate: number; unitPrice?: number; amount?: number }>
      if (typeof itemsJson === 'string') {
        items = JSON.parse(itemsJson)
      } else {
        items = itemsJson
      }
      amount = items.reduce((sum, item) => sum + (item.amount || (item.quantity * (item.rate ?? item.unitPrice ?? 0))), 0)
      // Recompute tax/discount from the new subtotal
      const pct = typeof taxPercent === 'number' ? taxPercent : 0
      tax = amount * (pct / 100)
      discountVal = typeof discount === 'number' ? discount : 0
      total = amount + tax - discountVal
    } else if (typeof taxPercent === 'number' || typeof discount === 'number') {
      // Subtotal unchanged but tax % or discount changed
      const pct = typeof taxPercent === 'number' ? taxPercent : 0
      tax = amount * (pct / 100)
      discountVal = typeof discount === 'number' ? discount : existing.discount
      total = amount + tax - discountVal
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(customerId !== undefined && { customerId }),
        ...(itemsJson !== undefined && {
          itemsJson: typeof itemsJson === 'string' ? itemsJson : JSON.stringify(itemsJson),
        }),
        amount,
        tax,
        discount: discountVal,
        total,
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        // Set paidAt when status changes to paid
        ...(status === 'paid' && !existing.paidAt && { paidAt: new Date() }),
        // Set sentAt when status changes to sent
        ...(status === 'sent' && !existing.sentAt && { sentAt: new Date() }),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        job: {
          select: { id: true, title: true, jobNumber: true, status: true },
        },
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Failed to update invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id] — Partial update (mark as sent, mark as paid, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    // Handle quick status actions
    if (body.action === 'mark_sent') {
      updateData.status = 'sent'
      updateData.sentAt = new Date()
    } else if (body.action === 'mark_paid') {
      updateData.status = 'paid'
      updateData.paidAt = new Date()
    } else if (body.action === 'mark_overdue') {
      updateData.status = 'overdue'
    } else if (body.action === 'cancel') {
      updateData.status = 'cancelled'
    } else {
      // Generic partial update — only touch real Invoice columns
      if (body.status !== undefined) {
        updateData.status = body.status
        if (body.status === 'paid' && !existing.paidAt) updateData.paidAt = new Date()
        if (body.status === 'sent' && !existing.sentAt) updateData.sentAt = new Date()
      }
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
      if (body.total !== undefined) updateData.total = body.total
      if (body.amount !== undefined) updateData.amount = body.amount
      if (body.tax !== undefined) updateData.tax = body.tax
      if (body.discount !== undefined) updateData.discount = body.discount
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        job: {
          select: { id: true, title: true, jobNumber: true, status: true },
        },
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Failed to patch invoice:', error)
    return NextResponse.json(
      { error: 'Failed to patch invoice' },
      { status: 500 }
    )
  }
}
