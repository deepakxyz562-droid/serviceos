import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateRecurringInvoice, computeNextRun } from '@/lib/invoice-automation';

// GET /api/recurring-invoices/[id] — Get a single recurring invoice schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await db.recurringInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
        invoices: { select: { id: true, number: true, total: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (schedule.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Get recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring invoice' }, { status: 500 });
  }
}

// PUT /api/recurring-invoices/[id] — Update a recurring invoice schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.recurringInvoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.jobId !== undefined) updateData.jobId = body.jobId || null;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.dayOfMonth !== undefined) updateData.dayOfMonth = Number(body.dayOfMonth);
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.taxPercent !== undefined) updateData.taxPercent = Number(body.taxPercent);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.itemsJson !== undefined) updateData.itemsJson = body.itemsJson;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.active !== undefined) updateData.active = body.active;

    // Recompute nextRunAt if frequency or dayOfMonth changed and the schedule is active
    if ((body.frequency !== undefined || body.dayOfMonth !== undefined) && (updateData.active ?? existing.active)) {
      const freq = (updateData.frequency as string) || existing.frequency;
      const dom = (updateData.dayOfMonth as number) || existing.dayOfMonth
      updateData.nextRunAt = computeNextRun(new Date(), freq, dom)
    }

    const schedule = await db.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Update recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to update recurring invoice' }, { status: 500 });
  }
}

// DELETE /api/recurring-invoices/[id] — Delete (deactivate) a recurring invoice schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.recurringInvoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft-delete: deactivate instead of hard delete (preserves generated invoice history)
    await db.recurringInvoice.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true, message: 'Recurring invoice schedule deactivated' });
  } catch (error) {
    console.error('Delete recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to delete recurring invoice' }, { status: 500 });
  }
}

// POST /api/recurring-invoices/[id] — Manually trigger a run for this schedule
// Body: { action: 'run' } — generates an invoice immediately (without advancing the schedule's nextRunAt logic)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.recurringInvoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'run') {
      return NextResponse.json({ error: 'Unknown action. Use { action: "run" } to generate an invoice now.' }, { status: 400 });
    }

    const result = await generateRecurringInvoice(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || result.reason || 'Failed to generate invoice' }, { status: 400 });
    }

    return NextResponse.json({ success: true, invoiceId: result.invoiceId, number: result.number, total: result.total }, { status: 201 });
  } catch (error) {
    console.error('Run recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to run recurring invoice' }, { status: 500 });
  }
}
