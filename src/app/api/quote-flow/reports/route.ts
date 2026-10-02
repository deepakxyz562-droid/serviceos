import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/quote-flow/reports
 * ─────────────────────────────────────────────────────────────────────────
 * Business summary reports: total billed, paid, outstanding, overdue,
 * revenue by month, top customers.
 *
 * Query: ?from=2026-01-01&to=2026-12-31
 *
 * Returns: { totals, monthlyRevenue, topCustomers, overdueInvoices }
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };

    // Fetch all invoices with payments
    const invoices = await db.aiInvoice.findMany({
      where: {
        businessId: business.id,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: {
        payments: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute totals
    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    const overdueInvoices: any[] = [];
    const monthlyMap: Record<string, { billed: number; paid: number }> = {};
    const customerMap: Record<string, { name: string; billed: number; paid: number }> = {};

    const now = new Date();

    for (const inv of invoices) {
      const items = await db.aiInvoiceItem.findMany({ where: { invoiceId: inv.id } });
      const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      const discount =
        inv.discountType === 'PERCENT'
          ? (subtotal * (inv.discountValue || 0)) / 100
          : inv.discountValue || 0;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * (inv.taxRate || 0)) / 100;
      const total = afterDiscount + tax;

      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, total - paid);

      totalBilled += total;
      totalPaid += paid;
      totalOutstanding += outstanding;

      // Check overdue
      if (outstanding > 0 && inv.dueDate && new Date(inv.dueDate) < now) {
        totalOverdue += outstanding;
        overdueInvoices.push({
          id: inv.id,
          number: inv.number,
          customerName: inv.customer?.name || 'Unknown',
          amount: outstanding,
          dueDate: inv.dueDate.toISOString(),
          daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        });
      }

      // Monthly revenue
      const monthKey = inv.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { billed: 0, paid: 0 };
      monthlyMap[monthKey].billed += total;
      monthlyMap[monthKey].paid += paid;

      // Top customers
      const custId = inv.customerId;
      const custName = inv.customer?.name || 'Unknown';
      if (!customerMap[custId]) customerMap[custId] = { name: custName, billed: 0, paid: 0 };
      customerMap[custId].billed += total;
      customerMap[custId].paid += paid;
    }

    const monthlyRevenue = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const topCustomers = Object.entries(customerMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 10);

    return NextResponse.json({
      totals: {
        totalBilled,
        totalPaid,
        totalOutstanding,
        totalOverdue,
        invoiceCount: invoices.length,
      },
      monthlyRevenue,
      topCustomers,
      overdueInvoices: overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/quote-flow/reports] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
