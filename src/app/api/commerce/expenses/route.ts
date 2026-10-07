import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { POST as saveMoney } from '@/app/api/commerce/money/route';

/**
 * GET /api/commerce/expenses
 * List merchant operating expenses for Day Book & P&L
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const categoryParam = searchParams.get('category');

    const tenantScope = business.tenantId || business.id;

    let dateFilter = {};
    if (dateParam) {
      const startOfDay = new Date(dateParam);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateParam);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const expenses = await db.expense.findMany({
      where: {
        OR: [
          { tenantId: business.id },
          ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
        ],
        ...(categoryParam ? { category: categoryParam } : {}),
        ...dateFilter,
      },
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        number: e.number,
        amount: e.amount,
        category: e.category,
        paymentMethod: e.paymentMethod || 'CASH',
        description: e.description,
        notes: e.notes,
        date: e.expenseDate,
        createdAt: e.createdAt,
      })),
      totalAmount: Number(totalAmount.toFixed(2)),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch expenses:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

/**
 * POST /api/commerce/expenses
 * Create a new operating expense
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid expense' }, { status: 400 });
  return saveMoney(new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({
    kind: 'EXPENSE', amount: body.amount, account: body.paymentMode === 'CASH' ? 'CASH' : 'BANK',
    reference: body.description || body.category || 'Shop expense', requestKey: body.requestKey,
  }) }));
}
