import { createHash } from 'crypto';
import { counterCustomerPhone } from '../../../../../../shared/walk-in-customer';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

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
    const { business } = await requireQuoteFlowBusiness(req);
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
    
    // Notes & GSTIN
    let updatedNotes = existing?.notes || null;
    if (body.gstin !== undefined) {
      const gstinVal = typeof body.gstin === 'string' && body.gstin.trim() ? body.gstin.trim() : null;
      if (gstinVal) {
        // Strip out existing GSTIN if present in notes
        const cleanNotes = (existing?.notes || '').replace(/GSTIN:\s*[^|,\n]+/gi, '').replace(/^\|\s*|\s*\|$/g, '').trim();
        updatedNotes = cleanNotes ? `${cleanNotes} | GSTIN: ${gstinVal}` : `GSTIN: ${gstinVal}`;
      } else {
        updatedNotes = (existing?.notes || '').replace(/GSTIN:\s*[^|,\n]+/gi, '').replace(/^\|\s*|\s*\|$/g, '').trim() || null;
      }
    } else if (body.notes !== undefined) {
      updatedNotes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

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

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
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
    const { business } = await requireQuoteFlowBusiness(req);
    const existing = await db.aiCustomer.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    await db.aiCustomer.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
