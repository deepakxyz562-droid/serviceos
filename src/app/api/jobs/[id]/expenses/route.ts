import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  uploadFile,
  STORAGE_BUCKETS,
} from '@/lib/supabase-storage';
import { logActivity } from '@/lib/activity-log';
import { normalizeExpenseCategory } from '@/lib/job-taxonomy';
import { randomUUID } from 'crypto';

/**
 * Job-scoped Expenses API
 * ------------------------
 *   GET    /api/jobs/[id]/expenses            — list expenses for a job + totals
 *   POST   /api/jobs/[id]/expenses            — create an expense for a job
 *   DELETE /api/jobs/[id]/expenses/[expenseId] — delete an expense
 *
 * This route exists alongside the global /api/expenses endpoint so that BOTH
 * the PWA (which POSTs JSON with a pre-uploaded receiptUrl to /api/expenses)
 * AND the mobile app (which POSTs multipart/form-data with the receipt file
 * directly to /api/jobs/[id]/expenses) work against the same Expense table.
 *
 * The POST handler here accepts either:
 *   • multipart/form-data  — fields: description, amount, category, notes?,
 *     expenseDate?, and an optional `receipt` File. (mobile app shape)
 *   • application/json     — fields: description, amount, category, notes?,
 *     expenseDate?, receiptUrl?. (PWA fallback shape)
 *
 * Category is normalized via normalizeExpenseCategory() so lowercase mobile
 * values (materials, fuel, labor, equipment, other) land in canonical form.
 */

/**
 * Generate a unique expense number: EXP-0001, EXP-0002, ...
 * Handles unique-constraint collisions by appending a timestamp suffix.
 */
async function generateExpenseNumber(tenantId: string | null): Promise<string> {
  const prefix = 'EXP-';
  try {
    const where = tenantId ? { tenantId } : {};
    const count = await db.expense.count({ where });
    const nextSeq = count + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.expense.findUnique({ where: { number: candidate } });
      if (!existing) return candidate;
      candidate = `${prefix}${String(nextSeq + attempt + 1).padStart(4, '0')}-${Date.now().toString(36)}`;
    }
    return candidate;
  } catch {
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }
}

/**
 * Best-effort employee resolution for the current auth user.
 */
async function resolveEmployee(authUser: Awaited<ReturnType<typeof getAuthUser>>) {
  if (!authUser) return { employeeId: null, employeeName: null };
  if (authUser.employeeId) {
    try {
      const emp = await db.employee.findUnique({
        where: { id: authUser.employeeId },
        select: { id: true, name: true },
      });
      if (emp) return { employeeId: emp.id, employeeName: emp.name };
    } catch {
      // fall through
    }
  }
  try {
    const emp = await db.employee.findFirst({
      where: { userId: authUser.id },
      select: { id: true, name: true },
    });
    if (emp) return { employeeId: emp.id, employeeName: emp.name };
  } catch {
    // ignore
  }
  return { employeeId: null, employeeName: authUser.name || null };
}

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

/**
 * POST /api/jobs/[id]/expenses
 *
 * Accepts multipart/form-data (mobile) or JSON (PWA fallback).
 * Creates an Expense row linked to the job + uploads the receipt (if any).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId } = await params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, customerId: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const tenantId = job.workspaceId || authUser.tenantId || null;
    const { employeeId, employeeName } = await resolveEmployee(authUser);

    // Resolve tenant base currency.
    let baseCurrency = 'USD';
    if (tenantId) {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: tenantId },
          select: { currency: true },
        });
        if (tenant?.currency) baseCurrency = tenant.currency;
      } catch {
        // fall back to USD
      }
    }

    let description = '';
    let amount: number | null = null;
    let category = 'General';
    let notes: string | null = null;
    let expenseDate: Date = new Date();
    let receiptUrl: string | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      description = (formData.get('description') as string) || '';
      const amountStr = formData.get('amount') as string | null;
      amount = amountStr != null ? Number(amountStr) : null;
      category = (formData.get('category') as string) || 'General';
      const notesStr = formData.get('notes') as string | null;
      notes = notesStr || null;
      const dateStr = formData.get('expenseDate') as string | null;
      if (dateStr) expenseDate = new Date(dateStr);

      const receiptFile = formData.get('receipt');
      if (receiptFile && receiptFile instanceof File) {
        const arrayBuffer = await receiptFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = (receiptFile.name.split('.').pop() || 'jpg').toLowerCase();
        const companyId = (tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueName = `${jobId}_receipt_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
        const { url } = await uploadFile({
          bucket: STORAGE_BUCKETS.jobAttachments,
          file: buffer,
          companyId,
          folder: `expense-receipts/${jobId}`,
          fileName: uniqueName,
          contentType: receiptFile.type || 'image/jpeg',
        });
        receiptUrl = url;
      }
    } else {
      const body = await request.json();
      description = body.description || '';
      amount = body.amount != null ? Number(body.amount) : null;
      category = body.category || 'General';
      notes = body.notes || null;
      if (body.expenseDate) expenseDate = new Date(body.expenseDate);
      receiptUrl = body.receiptUrl || null;
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (amount === null || isNaN(amount)) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
    }

    const number = await generateExpenseNumber(tenantId);
    const expense = await db.expense.create({
      data: {
        number,
        tenantId,
        employeeId: employeeId || null,
        employeeName: employeeName || authUser.name || null,
        submittedById: authUser.id,
        submittedByName: authUser.name || authUser.email || null,
        jobId,
        jobTitle: job.title,
        category: normalizeExpenseCategory(category),
        description: description.trim(),
        amount,
        currency: baseCurrency,
        expenseDate,
        status: 'pending',
        receiptUrl,
        notes,
      },
    });

    try {
      await logActivity({
        tenantId: tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'create',
        entityType: 'expense',
        entityId: expense.id,
        entityName: expense.number,
        description: `Submitted expense ${expense.number} (${expense.category}, ${expense.currency} ${expense.amount.toFixed(2)})`,
        metadataJson: JSON.stringify({
          number: expense.number,
          category: expense.category,
          amount: expense.amount,
          currency: expense.currency,
          jobId,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Job Expenses POST] Failed to log activity:', logErr);
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating job expense:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create expense', message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 }
    );
  }
}
