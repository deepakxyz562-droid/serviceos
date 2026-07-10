import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/expenses/[id]
 * Fetch a single expense.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const expense = await db.expense.findUnique({ where: { id } });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Employees may only read their own expenses.
    if (authUser.role === 'employee') {
      const isOwner =
        expense.submittedById === authUser.id ||
        expense.employeeId === authUser.employeeId;
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update an expense.
 *
 *  - Employees may only edit their OWN expenses that are still `pending`,
 *    and may only change: category, description, amount, currency,
 *    expenseDate, jobId, jobTitle, notes, receiptUrl.
 *  - Owners/admins may additionally change `status` (approve / reject /
 *    reimburse) and supply rejectedReason.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.expense.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const isEmployee = authUser.role === 'employee';
    const isOwner =
      existing.submittedById === authUser.id ||
      existing.employeeId === authUser.employeeId;

    // ── Employee permissions ───────────────────────────────────────────────
    if (isEmployee) {
      if (!isOwner) {
        return NextResponse.json({ error: 'You can only edit your own expenses' }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json(
          { error: 'You can only edit expenses that are still pending' },
          { status: 400 }
        );
      }
      // Employees cannot change status / approval fields.
      const {
        category,
        description,
        amount,
        currency,
        expenseDate,
        jobId,
        jobTitle,
        notes,
        receiptUrl,
      } = body;

      const updated = await db.expense.update({
        where: { id },
        data: {
          ...(category !== undefined ? { category } : {}),
          ...(description !== undefined ? { description: String(description).trim() } : {}),
          ...(amount !== undefined ? { amount: Number(amount) } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(expenseDate !== undefined ? { expenseDate: new Date(expenseDate) } : {}),
          ...(jobId !== undefined ? { jobId: jobId || null } : {}),
          ...(jobTitle !== undefined ? { jobTitle: jobTitle || null } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
          ...(receiptUrl !== undefined ? { receiptUrl: receiptUrl || null } : {}),
        },
      });

      return NextResponse.json({ expense: updated });
    }

    // ── Owner / admin ──────────────────────────────────────────────────────
    const {
      category,
      description,
      amount,
      currency,
      expenseDate,
      jobId,
      jobTitle,
      notes,
      receiptUrl,
      status,
      rejectedReason,
    } = body;

    const data: Record<string, unknown> = {};
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = String(description).trim();
    if (amount !== undefined) data.amount = Number(amount);
    if (currency !== undefined) data.currency = currency;
    if (expenseDate !== undefined) data.expenseDate = new Date(expenseDate);
    if (jobId !== undefined) data.jobId = jobId || null;
    if (jobTitle !== undefined) data.jobTitle = jobTitle || null;
    if (notes !== undefined) data.notes = notes || null;
    if (receiptUrl !== undefined) data.receiptUrl = receiptUrl || null;

    if (status !== undefined && status !== existing.status) {
      data.status = status;
      if (status === 'approved') {
        data.approvedById = authUser.id;
        data.approvedByName = authUser.name || authUser.email || null;
        data.approvedAt = new Date();
        data.rejectedReason = null;
      } else if (status === 'rejected') {
        data.rejectedReason = rejectedReason || null;
        data.approvedById = null;
        data.approvedByName = null;
        data.approvedAt = null;
      } else if (status === 'reimbursed') {
        // reimbursed keeps approval info; just marks payout done.
        if (existing.status !== 'approved') {
          return NextResponse.json(
            { error: 'Expense must be approved before it can be reimbursed' },
            { status: 400 }
          );
        }
      } else if (status === 'pending') {
        // Re-open: clear approval fields.
        data.approvedById = null;
        data.approvedByName = null;
        data.approvedAt = null;
        data.rejectedReason = null;
      }
    }

    const updated = await db.expense.update({ where: { id }, data });

    // Activity log for status changes
    if (status !== undefined && status !== existing.status) {
      try {
        await logActivity({
          tenantId: existing.tenantId ?? '',
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update',
          entityType: 'expense',
          entityId: existing.id,
          entityName: existing.number,
          description: `${status.charAt(0).toUpperCase() + status.slice(1)} expense ${existing.number} (${existing.currency} ${existing.amount.toFixed(2)})`,
          metadataJson: JSON.stringify({
            number: existing.number,
            previousStatus: existing.status,
            newStatus: status,
            rejectedReason: rejectedReason || null,
          }),
          severity: 'info',
        });
      } catch (logErr) {
        console.error('[Expenses PATCH] Failed to log activity:', logErr);
      }
    }

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error('Error updating expense:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update expense', message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete an expense.
 *  - Employees may only delete their OWN pending expenses.
 *  - Owners/admins may delete any expense.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.expense.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const isEmployee = authUser.role === 'employee';
    if (isEmployee) {
      const isOwner =
        existing.submittedById === authUser.id ||
        existing.employeeId === authUser.employeeId;
      if (!isOwner) {
        return NextResponse.json({ error: 'You can only delete your own expenses' }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json(
          { error: 'You can only delete expenses that are still pending' },
          { status: 400 }
        );
      }
    }

    await db.expense.delete({ where: { id } });

    try {
      await logActivity({
        tenantId: existing.tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'delete',
        entityType: 'expense',
        entityId: existing.id,
        entityName: existing.number,
        description: `Deleted expense ${existing.number} (${existing.currency} ${existing.amount.toFixed(2)})`,
        metadataJson: JSON.stringify({
          number: existing.number,
          category: existing.category,
          amount: existing.amount,
        }),
        severity: 'warn',
      });
    } catch (logErr) {
      console.error('[Expenses DELETE] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
