import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { auditAmountLabel, logCommerceActivity } from '@/lib/commerce/audit';
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
 * Create a new operating expense.
 *
 * Persistence path: the atomic money RPC (nuvora_finance_command, EXPENSE
 * kind). The RPC maps amount → Expense.amount, account → Expense.paymentMethod,
 * category → Expense.category (real column) and reference → Expense.description.
 * vendorName/billNumber have no RPC columns of their own, so they ride the
 * reference in a readable "Vendor: X | Bill: Y" format. totalAmount
 * (bill-vs-paid partial-bill semantics) is NOT representable by the RPC and is
 * therefore not yet supported — only the paid `amount` is recorded.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid expense' }, { status: 400 });
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 120)
      : '';
  const vendorName =
    typeof body.vendorName === 'string' && body.vendorName.trim()
      ? body.vendorName.trim().slice(0, 60)
      : '';
  const billNumber =
    typeof body.billNumber === 'string' && body.billNumber.trim()
      ? body.billNumber.trim().slice(0, 40)
      : '';
  const category =
    typeof body.category === 'string' && body.category.trim()
      ? body.category.trim().slice(0, 60)
      : undefined;
  const account = body.paymentMode === 'CASH' ? 'CASH' : 'BANK';
  // Reference doubles as the Expense.description — keep it readable.
  const parts = [description || category || 'Shop expense'];
  if (vendorName) parts.push(`Vendor: ${vendorName}`);
  if (billNumber) parts.push(`Bill: ${billNumber}`);
  const reference = parts.join(' | ').slice(0, 200);

  // Mark the delegated request so the money handler knows its audit row is
  // written HERE (with vendor/bill context) instead of double-logging a
  // generic 'money' row for the same operation.
  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set('x-commerce-audit-via', 'expenses');

  const response = await saveMoney(
    new Request(req.url, {
      method: 'POST',
      headers: forwardedHeaders,
      body: JSON.stringify({
        kind: 'EXPENSE',
        amount: body.amount,
        account,
        category,
        reference,
        requestKey: body.requestKey,
      }),
    })
  );
  if (!response.ok) return response;
  const result = await response.json().catch(() => ({}));

  // Commerce audit trail — fire-and-forget; a logging failure can never
  // fail the expense that was just recorded (logCommerceActivity swallows).
  try {
    const { business, user } = await requireQuoteFlowBusiness(req);
    await logCommerceActivity({
      business,
      actorId: user.id,
      actorName: user.name || user.email || null,
      action: 'create',
      entityType: 'expense',
      entityName: billNumber || category || 'Expense',
      description: `Expense ${auditAmountLabel(business, Number(body.amount) || 0)} recorded — ${description || category || 'Shop expense'}${vendorName ? ` (Vendor: ${vendorName})` : ''}`,
      metadata: {
        amount: Number(body.amount) || 0,
        account,
        category: category || null,
        vendorName: vendorName || null,
        billNumber: billNumber || null,
        reference,
        requestKey: body.requestKey || null,
      },
    });
  } catch {
    // Audit context resolution failed — the expense itself is already saved.
  }

  // Echo what was actually persisted so callers can verify.
  return NextResponse.json(
    {
      ...result,
      expense: {
        amount: Number(body.amount) || 0,
        paymentMethod: account,
        category: category || 'General',
        description: reference,
        vendorName: vendorName || null,
        billNumber: billNumber || null,
      },
    },
    { status: response.status }
  );
}
