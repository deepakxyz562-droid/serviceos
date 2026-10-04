import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/commerce/daybook
 * Daily Day Book: Calculates Cash-in-Hand, UPI collections, Expenses, and Net Profit
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch Today's Orders
    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch Today's Operating Expenses
    const expenses = await db.expense.findMany({
      where: {
        OR: [
          { tenantId: business.id },
          ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
        ],
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    // 3. Compute Inflows
    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let pendingSales = 0;

    for (const ord of orders) {
      const amt = Number(ord.total) || 0;
      totalSales += amt;

      if (ord.paymentStatus === 'PAID') {
        const method = (ord.paymentMethod || '').toUpperCase();
        if (method.includes('UPI')) {
          upiSales += amt;
        } else {
          cashSales += amt;
        }
      } else {
        pendingSales += amt;
      }
    }

    // 4. Compute Outflows
    let totalExpenses = 0;
    let cashExpenses = 0;
    let upiExpenses = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const note = (exp.notes || '').toUpperCase();
      if (note.includes('UPI') || note.includes('BANK')) {
        upiExpenses += amt;
      } else {
        cashExpenses += amt;
      }
    }

    // 5. Net Calculations
    const netCashInHand = cashSales - cashExpenses;
    const netUpiInBank = upiSales - upiExpenses;
    const netProfitToday = (cashSales + upiSales) - totalExpenses;

    // 6. Chronological Transaction Timeline
    const transactions = [
      ...orders.map((o) => ({
        id: o.id,
        type: 'INFLOW',
        source: 'ORDER',
        title: `Order #${o.id.slice(-6).toUpperCase()}`,
        subtitle: `${o.customerName || 'Walk-in'} • ${o.deliveryType || 'Counter'}`,
        amount: o.total,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod || 'Cash',
        time: o.createdAt,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'OUTFLOW',
        source: 'EXPENSE',
        title: e.category,
        subtitle: e.description,
        amount: e.amount,
        paymentStatus: 'PAID',
        paymentMethod: (e.notes || 'Cash').replace('Paid via ', ''),
        time: e.expenseDate,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        ordersCount: orders.length,
        cashSales: Number(cashSales.toFixed(2)),
        upiSales: Number(upiSales.toFixed(2)),
        pendingSales: Number(pendingSales.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        cashExpenses: Number(cashExpenses.toFixed(2)),
        upiExpenses: Number(upiExpenses.toFixed(2)),
        netCashInHand: Number(netCashInHand.toFixed(2)),
        netUpiInBank: Number(netUpiInBank.toFixed(2)),
        netProfitToday: Number(netProfitToday.toFixed(2)),
      },
      transactions,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to compute daybook:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch daybook' }, { status: 500 });
  }
}
