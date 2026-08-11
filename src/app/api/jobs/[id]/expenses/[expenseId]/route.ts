import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * DELETE /api/jobs/[id]/expenses/[expenseId]
 *
 * Deletes a single expense row. The expense must belong to the given job
 * (Expense.jobId === job.id) for safety. Employee sessions may only delete
 * their own expenses (submittedById or employeeId match). Owners/admins may
 * delete any expense in their tenant.
 *
 * Used by the mobile app's expense list (long-press / trash button).
 * The PWA previously had no delete UI — adding this endpoint unblocks a
 * future PWA delete button too.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId, expenseId } = await params;

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        number: true,
        jobId: true,
        tenantId: true,
        submittedById: true,
        employeeId: true,
        category: true,
        amount: true,
        currency: true,
      },
    });

    if (!expense || expense.jobId !== jobId) {
      return NextResponse.json({ error: 'Expense not found for this job' }, { status: 404 });
    }

    // Authorization: employees may only delete their own expenses.
    const isEmployee = authUser.role === 'employee';
    if (isEmployee) {
      const owns =
        expense.submittedById === authUser.id ||
        expense.employeeId === authUser.id ||
        expense.employeeId === authUser.employeeId;
      if (!owns) {
        return NextResponse.json(
          { error: 'You can only delete your own expenses' },
          { status: 403 }
        );
      }
    }

    await db.expense.delete({ where: { id: expenseId } });

    try {
      await logActivity({
        tenantId: expense.tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'delete',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.number,
        description: `Deleted expense ${expense.number} (${expense.category}, ${expense.currency} ${expense.amount.toFixed(2)})`,
        metadataJson: JSON.stringify({
          number: expense.number,
          jobId,
          category: expense.category,
        }),
        severity: 'warn',
      });
    } catch (logErr) {
      console.error('[Expense DELETE] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, id: expenseId });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
