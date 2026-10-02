import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  aiRawInput: z.string().optional().nullable(),
  discountValue: z.number().default(0),
  discountType: z.enum(['AMOUNT', 'PERCENT']).default('AMOUNT'),
  taxRate: z.number().default(0),
  pdfTemplate: z.string().default('modern'),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        qty: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let targetCustomerId = parsed.data.customerId;
    if (!targetCustomerId && parsed.data.customerName) {
      const newCust = await db.aiCustomer.create({
        data: {
          businessId: business.id,
          name: parsed.data.customerName,
          email: parsed.data.customerEmail,
          phone: parsed.data.customerPhone,
          address: parsed.data.customerAddress,
        },
      });
      targetCustomerId = newCust.id;
    }

    if (!targetCustomerId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    const updatedBiz = await db.aiBusiness.update({
      where: { id: business.id },
      data: { invoiceSeq: { increment: 1 } },
    });
    const invoiceNumber = `INV-${updatedBiz.invoiceSeq}`;

    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.aiInvoice.create({
        data: {
          businessId: business.id,
          customerId: targetCustomerId!,
          number: invoiceNumber,
          status: 'DRAFT',
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          notes: parsed.data.notes,
          aiRawInput: parsed.data.aiRawInput,
          discountValue: parsed.data.discountValue,
          discountType: parsed.data.discountType,
          taxRate: parsed.data.taxRate,
          pdfTemplate: parsed.data.pdfTemplate,
        },
      });

      for (const item of parsed.data.items) {
        await tx.aiInvoiceItem.create({
          data: {
            invoiceId: inv.id,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
          },
        });
      }

      return tx.aiInvoice.findUnique({
        where: { id: inv.id },
        include: { customer: true, items: true, payments: true },
      });
    });

    const totals = computeTotals(
      invoice?.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })) || [],
      invoice?.discountValue || 0,
      invoice?.discountType || 'AMOUNT',
      invoice?.taxRate || 0,
      business.currency
    );

    return NextResponse.json({ invoice: { ...invoice, totals: { ...totals, paid: 0, balance: totals.total } } });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
