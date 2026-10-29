import { createHash } from 'crypto';
import { counterCustomerPhone } from '../../../../../../shared/walk-in-customer';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { logCommerceActivity } from '@/lib/commerce/audit';

/**
 * GET /api/commerce/customers/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);

    const cleanPhone = id.startsWith('phone:') ? id.replace('phone:', '').replace(/\D/g, '') : null;

    const customer = await db.aiCustomer.findFirst({
      where: {
        businessId: business.id,
        OR: [
          { id },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, payments: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/commerce/customers/[id]
 * Updates customer profile details (name, phone, address, email, gstin/notes).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { business, user } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => ({}));

    const cleanPhone = id.startsWith('phone:') ? id.replace('phone:', '').replace(/\D/g, '') : null;

    let existing = await db.aiCustomer.findFirst({
      where: {
        businessId: business.id,
        OR: [
          { id },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
    });

    let updatedPhone = existing?.phone;
    if (body.phone) {
      try {
        updatedPhone = counterCustomerPhone(body.phone);
      } catch {
        updatedPhone = body.phone.replace(/\D/g, '');
      }
    }

    const updatedName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing?.name || 'Customer';
    const updatedAddress = body.address !== undefined ? (typeof body.address === 'string' && body.address.trim() ? body.address.trim() : null) : existing?.address;
    const updatedEmail = body.email !== undefined ? (typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null) : existing?.email;
    
    // Notes & GSTIN — single source of truth: the gstin COLUMN. Legacy
    // "GSTIN: …" text in notes is stripped so old encodings migrate naturally.
    let updatedNotes = existing?.notes || null;
    let updatedGstin = existing?.gstin ?? null;
    if (body.gstin !== undefined) {
      updatedGstin =
        typeof body.gstin === 'string' && body.gstin.trim()
          ? body.gstin.trim().toUpperCase()
          : null;
      updatedNotes =
        (existing?.notes || '').replace(/GSTIN:\s*[^|,\n]+/gi, '').replace(/^\|\s*|\s*\|$/g, '').trim() || null;
    } else if (body.notes !== undefined) {
      updatedNotes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

    // Party metadata (Phase 1): CUSTOMER | SUPPLIER | BOTH + khata credit limit.
    const PARTY_TYPES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
    const updatedPartyType =
      body.partyType === undefined || body.partyType === null
        ? existing?.partyType ?? null
        : PARTY_TYPES.includes(String(body.partyType).toUpperCase())
          ? String(body.partyType).toUpperCase()
          : null;
    const updatedCreditLimit =
      body.creditLimit === undefined || body.creditLimit === null || body.creditLimit === ''
        ? existing?.creditLimit ?? null
        : Number.isFinite(Number(body.creditLimit)) && Number(body.creditLimit) > 0
          ? Number(body.creditLimit)
          : null;

    let customer;
    if (existing) {
      customer = await db.aiCustomer.update({
        where: { id: existing.id },
        data: {
          name: updatedName,
          phone: updatedPhone,
          address: updatedAddress,
          email: updatedEmail,
          notes: updatedNotes,
          ...(body.gstin !== undefined ? { gstin: updatedGstin } : {}),
          ...(body.partyType !== undefined ? { partyType: updatedPartyType } : {}),
          ...(body.creditLimit !== undefined ? { creditLimit: updatedCreditLimit } : {}),
        },
      });
    } else {
      // Create new customer record if it originated from order history
      const newId = `contact_${createHash('sha256').update(JSON.stringify([business.id, id, Date.now()])).digest('hex')}`;
      customer = await db.aiCustomer.create({
        data: {
          id: newId,
          businessId: business.id,
          name: updatedName,
          phone: updatedPhone || cleanPhone,
          address: updatedAddress,
          email: updatedEmail,
          notes: updatedNotes,
          gstin: updatedGstin ?? null,
          partyType: updatedPartyType,
          creditLimit: updatedCreditLimit,
        },
      });
    }

    // Sync any recent commerce order records matching customer's phone
    if (customer.phone) {
      try {
        await db.gptformCommerceOrder.updateMany({
          where: {
            businessId: business.id,
            customerPhone: customer.phone,
          },
          data: {
            customerName: customer.name,
            ...(customer.address ? { deliveryAddress: customer.address } : {}),
          },
        });
      } catch (err) {
        console.warn('Non-fatal: could not update orders with customer profile name:', err);
      }
    }

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the customer save that just succeeded (logCommerceActivity
    // swallows). Honest action: 'update' when a row changed, 'create' when
    // the profile was materialised from order history.
    await logCommerceActivity({
      business,
      actorId: user.id,
      actorName: user.name || user.email || null,
      action: existing ? 'update' : 'create',
      entityType: 'customer',
      entityId: customer.id,
      entityName: customer.name,
      description: `Customer ${customer.name}${customer.phone ? ` (${customer.phone})` : ''} ${existing ? 'updated' : 'added from order history'}`,
      metadata: {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        partyType: customer.partyType || null,
        creditLimit: customer.creditLimit ?? null,
        createdNew: !existing,
      },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        gstin: customer.gstin ?? null,
        partyType: customer.partyType ?? null,
        creditLimit: customer.creditLimit ?? null,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update customer:', e);
    return NextResponse.json({ error: e.message || 'Failed to update customer' }, { status: 500 });
  }
}

/**
 * DELETE /api/commerce/customers/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { business, user } = await requireQuoteFlowBusiness(req);
    const existing = await db.aiCustomer.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    await db.aiCustomer.delete({ where: { id: existing.id } });

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the deletion that already succeeded (logCommerceActivity swallows).
    await logCommerceActivity({
      business,
      actorId: user.id,
      actorName: user.name || user.email || null,
      action: 'delete',
      entityType: 'customer',
      entityId: existing.id,
      entityName: existing.name,
      description: `Customer ${existing.name}${existing.phone ? ` (${existing.phone})` : ''} deleted`,
      metadata: {
        customerId: existing.id,
        name: existing.name,
        phone: existing.phone,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
