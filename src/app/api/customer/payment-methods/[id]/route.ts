import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── PATCH /api/customer/payment-methods/[id] ────────────────────────────
// Update a payment method (currently only toggles isDefault).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { isDefault } = body

    // Verify ownership
    const existing = await db.paymentMethod.findFirst({
      where: { id, customerId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    if (isDefault === true) {
      // Unset other defaults
      await db.paymentMethod.updateMany({
        where: { customerId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const updated = await db.paymentMethod.update({
      where: { id },
      data: { isDefault: isDefault ?? existing.isDefault },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json(
      { error: 'Failed to update payment method' },
      { status: 500 }
    )
  }
}

// ── DELETE /api/customer/payment-methods/[id] ───────────────────────────
// Remove a payment method. If the deleted method was default, promote the
// next most recent method to default.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify ownership
    const existing = await db.paymentMethod.findFirst({
      where: { id, customerId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    await db.paymentMethod.delete({ where: { id } })

    // If the deleted method was the default, promote the next one
    if (existing.isDefault) {
      const next = await db.paymentMethod.findFirst({
        where: { customerId: user.id },
        orderBy: { createdAt: 'desc' },
      })
      if (next) {
        await db.paymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    )
  }
}
