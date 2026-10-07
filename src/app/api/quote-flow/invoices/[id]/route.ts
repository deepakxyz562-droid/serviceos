import {atomicCommerce,commerceError} from '@/lib/commerce/atomic';
import {ownerBusiness} from '@/lib/commerce/access';
import { POST as saveMoney } from '@/app/api/commerce/money/route';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const patchSchema = z.object({
  number: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'UNPAID']).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discountValue: z.number().min(0).max(90000000000).optional(),
  discountType: z.enum(['AMOUNT', 'PERCENT']).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  pdfTemplate: z.string().optional(),
  paymentMethod: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(1000),
        qty: z.number().positive().max(100000),
        unitPrice: z.number().min(0).max(90000000000),
        hsnCode: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);

    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { customer: true, items: true, payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totals = computeTotals(
      invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      invoice.discountValue,
      invoice.discountType,
      invoice.taxRate,
      business.currency
    );
    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, totals.total - paid);

    return NextResponse.json({
      invoice: {
        ...invoice,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        paidAmount: Math.min(paid, totals.total),
        balance,
        totals: { ...totals, paid, balance },
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if(e.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    const failure=commerceError(e);return NextResponse.json({error:failure.message},{status:failure.status});
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { payments: true, items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (parsed.data.status === 'PAID') {
      if (parsed.data.items || parsed.data.taxRate !== undefined || parsed.data.discountValue !== undefined) return NextResponse.json({ error: 'Save invoice changes before recording payment.' }, { status: 400 });
      const total=computeTotals(existing.items,existing.discountValue,existing.discountType,existing.taxRate,business.currency).total;
      const due=Math.max(0,total-existing.payments.reduce((sum,p)=>sum+p.amount,0));
      if(due>0){
        const response=await saveMoney(new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({kind:'INVOICE_PAYMENT',invoiceId:id,amount:due,account:parsed.data.paymentMethod==='CASH'?'CASH':'BANK',requestKey:`invoice-paid:${id}`})}));
        if(!response.ok)return response;
      }
      return GET(req,{params:Promise.resolve({id})});
    }
    if(existing.payments.length && (parsed.data.status==='UNPAID'||parsed.data.items||parsed.data.taxRate!==undefined||parsed.data.discountValue!==undefined)) return NextResponse.json({error:'A paid invoice cannot be changed or reset. Record a correction separately.'},{status:409});

    await atomicCommerce('editInvoice',[business.id,id,parsed.data]);
    return GET(req,{params:Promise.resolve({id})});

  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if(e.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    const failure=commerceError(e);return NextResponse.json({error:failure.message},{status:failure.status});
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);
    const existing = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if(await db.aiPayment.count({where:{invoiceId:id}})>0) return NextResponse.json({error:'A paid invoice cannot be deleted.'},{status:409});
    await db.aiInvoice.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if(e.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    const failure=commerceError(e);return NextResponse.json({error:failure.message},{status:failure.status});
  }
}
