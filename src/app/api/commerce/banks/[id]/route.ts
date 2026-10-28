import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';

/**
 * PATCH /api/commerce/banks/[id]
 * Update an account's editable fields (name, type, masked-number re-entry,
 * ifsc, upiId, isActive, isDefault). Scoped to the authenticated business.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.aiBankAccount.findFirst({
      where: { id: String(id), businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const data: Partial<{
      name: string;
      type: string;
      accountNumber: string | null;
      ifsc: string | null;
      upiId: string | null;
      isActive: boolean;
      isDefault: boolean;
    }> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 120);
    if (typeof body.type === 'string' && ['BANK', 'CASH', 'UPI', 'WALLET'].includes(body.type.toUpperCase())) {
      data.type = body.type.toUpperCase();
    }
    if (body.accountNumber !== undefined) {
      data.accountNumber = typeof body.accountNumber === 'string' && body.accountNumber.trim()
        ? body.accountNumber.trim()
        : null;
    }
    if (body.ifsc !== undefined) {
      data.ifsc = typeof body.ifsc === 'string' && body.ifsc.trim() ? body.ifsc.trim().toUpperCase() : null;
    }
    if (body.upiId !== undefined) {
      data.upiId = typeof body.upiId === 'string' && body.upiId.trim() ? body.upiId.trim() : null;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    if (body.isDefault === true && !existing.isDefault) {
      await db.aiBankAccount.updateMany({
        where: { businessId: business.id, isDefault: true },
        data: { isDefault: false },
      });
      data.isDefault = true;
    } else if (body.isDefault === false) {
      data.isDefault = false;
    }

    const updated = await db.aiBankAccount.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error('[commerce/banks] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not update account.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}

/**
 * DELETE /api/commerce/banks/[id]
 * Permanently removes the account (scoped to the authenticated business).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await ctx.params;

    const deleted = await db.aiBankAccount.deleteMany({
      where: { id: String(id), businessId: business.id },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[commerce/banks] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not delete account.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}
