import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function extractCustomerId(authUserId: string | undefined): string | null {
  if (!authUserId) return null;
  if (authUserId.startsWith('cust_')) return authUserId.slice(5);
  return authUserId;
}

// ─── PATCH /api/customer/payment-methods/[id] ──────────────────────────────
// Update a payment method. Currently supports:
//   - { isDefault: true }   → set as default (unsets others)
//   - { isDefault: false }  → unset default (only allowed if another default exists)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required.' },
        { status: 401 }
      );
    }

    const customerId = extractCustomerId(user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: 'Unable to resolve customer account.' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await db.paymentMethod.findFirst({
      where: { id, customerId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Payment method not found.' },
        { status: 404 }
      );
    }

    if (body.isDefault === true) {
      // Unset other defaults
      await db.paymentMethod.updateMany({
        where: { customerId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      const updated = await db.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      });
      return NextResponse.json({ paymentMethod: updated });
    }

    if (body.isDefault === false) {
      // Don't allow unsetting the only default if it's the current one
      const otherCount = await db.paymentMethod.count({
        where: { customerId, isDefault: false, NOT: { id } },
      });
      if (otherCount === 0) {
        return NextResponse.json(
          { error: 'At least one payment method must be the default.' },
          { status: 400 }
        );
      }
      const updated = await db.paymentMethod.update({
        where: { id },
        data: { isDefault: false },
      });
      // Promote the most recent other method to default
      const nextDefault = await db.paymentMethod.findFirst({
        where: { customerId, NOT: { id } },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await db.paymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
      return NextResponse.json({ paymentMethod: updated });
    }

    return NextResponse.json(
      { error: 'No supported fields to update.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/customer/payment-methods/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to update payment method.' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/customer/payment-methods/[id] ─────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required.' },
        { status: 401 }
      );
    }

    const customerId = extractCustomerId(user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: 'Unable to resolve customer account.' },
        { status: 400 }
      );
    }

    const { id } = await params;

    const existing = await db.paymentMethod.findFirst({
      where: { id, customerId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Payment method not found.' },
        { status: 404 }
      );
    }

    await db.paymentMethod.delete({ where: { id } });

    // If we deleted the default, promote the next most-recent to default
    if (existing.isDefault) {
      const nextDefault = await db.paymentMethod.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await db.paymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/customer/payment-methods/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method.' },
      { status: 500 }
    );
  }
}
