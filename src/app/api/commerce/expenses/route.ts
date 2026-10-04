import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

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
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { amount, category, description, paymentMode = 'CASH', date } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const tenantScope = business.tenantId || business.id;
    const expenseDate = date ? new Date(date) : new Date();
    const validPaymentMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'];
    const normalizedPaymentMethod = validPaymentMethods.includes(String(paymentMethod).toUpperCase())
      ? String(paymentMethod).toUpperCase()
      : 'CASH';

    const count = await db.expense.count({
      where: {
        OR: [
          { tenantId: business.id },
          ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
        ],
      },
    });

    const expenseNumber = `EXP-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

    const expense = await db.expense.create({
      data: {
        number: expenseNumber,
        tenantId: tenantScope,
        amount: parsedAmount,
        currency: business.currency || 'INR',
        category: category || 'General',
        paymentMethod: normalizedPaymentMethod,
        description: description || 'Operating Expense',
        expenseDate,
        status: 'approved',
      },
    });

    return NextResponse.json({
      success: true,
      expense: {
        id: expense.id,
        number: expense.number,
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        notes: expense.notes,
        date: expense.expenseDate,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to create expense:', e);
    return NextResponse.json({ error: e.message || 'Failed to create expense' }, { status: 500 });
  }
}
