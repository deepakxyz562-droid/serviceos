import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/quote-flow/export/invoices
 * ─────────────────────────────────────────────────────────────────────────
 * Export all invoices as CSV (Excel-compatible).
 *
 * Returns: text/csv with Content-Disposition: attachment
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const invoices = await db.aiInvoice.findMany({
      where: { businessId: business.id },
      include: { customer: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows: string[] = [];
    // Header row
    rows.push([
      'Invoice Number',
      'Status',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Subtotal',
      'Discount',
      'Tax',
      'Total',
      'Paid',
      'Outstanding',
      'Due Date',
      'Created At',
      'Notes',
    ].map(h => `"${h}"`).join(','));

    for (const inv of invoices) {
      const subtotal = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      const discount = inv.discountType === 'PERCENT'
        ? (subtotal * (inv.discountValue || 0)) / 100
        : inv.discountValue || 0;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * (inv.taxRate || 0)) / 100;
      const total = afterDiscount + tax;
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, total - paid);

      rows.push([
        inv.number,
        inv.status,
        inv.customer?.name || '',
        inv.customer?.email || '',
        inv.customer?.phone || '',
        subtotal.toFixed(2),
        discount.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        paid.toFixed(2),
        outstanding.toFixed(2),
        inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : '',
        inv.createdAt.toISOString().split('T')[0],
        (inv.notes || '').replace(/"/g, '""').replace(/\n/g, ' '),
      ].map(v => `"${v}"`).join(','));
    }

    const csv = rows.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
