import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const schema = z.object({
  amount: z.number().positive(),
  method: z.string().default('MANUAL'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const inv = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { items: true, payments: true },
    });
    if (!inv) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totals = computeTotals(
      inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      inv.discountValue,
      inv.discountType,
      inv.taxRate,
      business.currency
    );

    const totalPaid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const newTotal = totalPaid + parsed.data.amount;
    let newStatus = inv.status;
    if (newTotal >= totals.total) newStatus = 'PAID';
    else if (newTotal > 0) newStatus = 'PARTIALLY_PAID';

    await db.aiPayment.create({
      data: {
        invoiceId: inv.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
      },
    });

    if (newStatus !== inv.status) {
      await db.aiInvoice.update({
        where: { id: inv.id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({ ok: true, status: newStatus, totalPaid: newTotal });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
