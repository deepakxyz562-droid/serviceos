import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Job Expenses (read-only summary for the Job Detail page)
 * --------------------------------------------------------
 *   GET /api/jobs/[id]/expenses
 *
 * Returns all Expense rows linked to this job (Expense.jobId = job.id),
 * plus a small totals object. The actual create/update/approve flow stays
 * in /api/expenses — this endpoint is just a convenient scoped read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId } = await params;

    const expenses = await db.expense.findMany({
      where: { jobId },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    });

    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const pendingCount = expenses.filter((e) => e.status === 'pending').length;
    const approvedCount = expenses.filter((e) => e.status === 'approved').length;
    const reimbursedCount = expenses.filter((e) => e.status === 'reimbursed').length;

    return NextResponse.json({
      expenses,
      totals: {
        count: expenses.length,
        totalAmount,
        pendingCount,
        approvedCount,
        reimbursedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching job expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch job expenses' }, { status: 500 });
  }
}
