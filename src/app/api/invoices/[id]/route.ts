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
      customerName,
      customerEmail,
      customerPhone,
      itemsJson,
      taxRate,
      discountType,
      discountValue,
      amountPaid,
      paymentMethod,
      paymentId,
      dueDate,
      notes,
    } = body

    // Recalculate totals if items or rates changed
    let subtotal = existing.subtotal
    let taxAmount = existing.taxAmount
    let discountAmount = existing.discountAmount
    let total = existing.total

    if (itemsJson) {
      let items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>
      if (typeof itemsJson === 'string') {
        items = JSON.parse(itemsJson)
      } else {
        items = itemsJson
      }
      subtotal = items.reduce((sum, item) => sum + (item.amount || item.quantity * item.unitPrice), 0)
    }

    const effectiveTaxRate = taxRate ?? existing.taxRate
    taxAmount = subtotal * (effectiveTaxRate / 100)

    const effectiveDiscountType = discountType ?? existing.discountType
    const effectiveDiscountValue = discountValue ?? existing.discountValue
    discountAmount = 0
    if (effectiveDiscountType === 'percentage' && effectiveDiscountValue > 0) {
      discountAmount = subtotal * (effectiveDiscountValue / 100)
    } else if (effectiveDiscountType === 'fixed' && effectiveDiscountValue > 0) {
      discountAmount = effectiveDiscountValue
    }

    total = subtotal + taxAmount - discountAmount

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(customerId !== undefined && { customerId }),
        ...(customerName !== undefined && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(itemsJson !== undefined && {
          itemsJson: typeof itemsJson === 'string' ? itemsJson : JSON.stringify(itemsJson),
        }),
        subtotal,
        taxRate: effectiveTaxRate,
        taxAmount,
        discountType: effectiveDiscountType,
        discountValue: effectiveDiscountValue,
        discountAmount,
        total,
        ...(amountPaid !== undefined && { amountPaid }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(paymentId !== undefined && { paymentId }),
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
      if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod
      if (body.paymentId) updateData.paymentId = body.paymentId
      updateData.amountPaid = existing.total
    } else if (body.action === 'mark_overdue') {
      updateData.status = 'overdue'
    } else if (body.action === 'cancel') {
      updateData.status = 'cancelled'
    } else {
      // Generic partial update
      if (body.status !== undefined) {
        updateData.status = body.status
        if (body.status === 'paid' && !existing.paidAt) updateData.paidAt = new Date()
        if (body.status === 'sent' && !existing.sentAt) updateData.sentAt = new Date()
      }
      if (body.amountPaid !== undefined) updateData.amountPaid = body.amountPaid
      if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
      if (body.paymentId !== undefined) updateData.paymentId = body.paymentId
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
      if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl
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
