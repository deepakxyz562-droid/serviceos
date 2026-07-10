import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * Resolves a tenant ID from the auth user, falling back to the first tenant
 * for demo / cookieless sessions.
 */
async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }
  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstTenant) {
      return firstTenant.id;
    }
  } catch {
    // DB lookup failed
  }
  return null;
}

/**
 * Generate a unique expense number: EXP-0001, EXP-0002, ...
 * Handles unique-constraint collisions by appending a timestamp suffix.
 */
async function generateExpenseNumber(tenantId: string | null): Promise<string> {
  const prefix = 'EXP-';
  try {
    // Count existing expenses (tenant-scoped if possible) to compute the next sequence.
    const where = tenantId ? { tenantId } : {};
    const count = await db.expense.count({ where });
    const nextSeq = count + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Guard against collisions on the globally-unique `number` column.
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.expense.findUnique({ where: { number: candidate } });
      if (!existing) return candidate;
      candidate = `${prefix}${String(nextSeq + attempt + 1).padStart(4, '0')}-${Date.now().toString(36)}`;
    }
    return candidate;
  } catch {
    // Fallback — guaranteed unique via timestamp
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }
}

/**
 * Resolve the employee id + name for the current auth user (if any).
 * Owners/admins may not have an Employee record, so this is best-effort.
 */
async function resolveEmployee(authUser: Awaited<ReturnType<typeof getAuthUser>>) {
  if (!authUser) return { employeeId: null, employeeName: null };
  // If the auth user already carries an employeeId, trust it.
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
  // Otherwise try to look up by userId link.
  try {
    const emp = await db.employee.findFirst({
      where: { userId: authUser.id },
      select: { id: true, name: true },
    });
    if (emp) return { employeeId: emp.id, employeeName: emp.name };
  } catch {
    // ignore
  }
  // Last resort: use the auth user's name with no employeeId.
  return { employeeId: null, employeeName: authUser.name || null };
}

/**
 * GET /api/expenses
 * List expenses for the authenticated user's tenant.
 *
 * Employee sessions: scoped to expenses they submitted
 *   (employeeId = their employee id OR submittedById = their user id).
 * Owner/admin sessions: all tenant expenses.
 *
 * Query params: status, category, search, jobId, employeeId
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const jobIdParam = searchParams.get('jobId');
    const employeeIdParam = searchParams.get('employeeId');

    const isEmployee = authUser?.role === 'employee';

    // ── Employee: scope to own expenses (no tenant dependency) ──────────────
    if (isEmployee && authUser) {
      const { employeeId } = await resolveEmployee(authUser);
      const ownIds: string[] = [];
      if (employeeId) ownIds.push(employeeId);
      ownIds.push(authUser.id); // also match by submittedById

      const where: Record<string, unknown> = {
        OR: [
          { employeeId: { in: ownIds.filter(Boolean) } },
          { submittedById: authUser.id },
        ],
      };
      if (status && status !== 'all') where.status = status;
      if (category && category !== 'all') where.category = category;
      if (jobIdParam) where.jobId = jobIdParam;
      if (search) {
        where.OR = [
          ...(where.OR as unknown[]),
          { number: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
        ];
      }

      const [expenses, total] = await Promise.all([
        db.expense.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        db.expense.count({ where }),
      ]);

      return NextResponse.json({ expenses, pagination: { total } });
    }

    // ── Owner / admin ───────────────────────────────────────────────────────
    const tenantId = await resolveTenantId(authUser);

    if (!tenantId) {
      return NextResponse.json({ expenses: [], pagination: { total: 0 } });
    }

    const where: Record<string, unknown> = { tenantId };
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (jobIdParam) where.jobId = jobIdParam;
    if (employeeIdParam) where.employeeId = employeeIdParam;
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { employeeName: { contains: search } },
        { submittedByName: { contains: search } },
      ];
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.expense.count({ where }),
    ]);

    return NextResponse.json({ expenses, pagination: { total } });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * Create a new expense.
 *
 * Body: { category, description, amount, currency?, expenseDate?, jobId?, jobTitle?, notes?, receiptUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
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

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(authUser);
    const { employeeId, employeeName } = await resolveEmployee(authUser);

    const number = await generateExpenseNumber(tenantId);

    // Resolve optional linked job title if jobId supplied without title.
    let resolvedJobTitle: string | null = jobTitle || null;
    if (jobId && !resolvedJobTitle) {
      try {
        const job = await db.job.findUnique({ where: { id: jobId }, select: { title: true } });
        resolvedJobTitle = job?.title || null;
      } catch {
        // ignore
      }
    }

    const expense = await db.expense.create({
      data: {
        number,
        tenantId,
        employeeId: employeeId || null,
        employeeName: employeeName || authUser.name || null,
        submittedById: authUser.id,
        submittedByName: authUser.name || authUser.email || null,
        jobId: jobId || null,
        jobTitle: resolvedJobTitle,
        category: category || 'General',
        description: description.trim(),
        amount: Number(amount),
        currency: currency || 'USD',
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        status: 'pending',
        receiptUrl: receiptUrl || null,
        notes: notes || null,
      },
    });

    // Best-effort activity log
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
          jobId: expense.jobId,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Expenses POST] Failed to log activity:', logErr);
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create expense', code, message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 }
    );
  }
}
