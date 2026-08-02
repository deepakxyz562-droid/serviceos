import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { createRecurringInvoiceSchedule } from '@/lib/invoice-automation';

// GET /api/recurring-invoices — List recurring invoice schedules for the tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const customerId = searchParams.get('customerId');

    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (activeOnly) where.active = true;
    if (customerId) where.customerId = customerId;

    const schedules = await db.recurringInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('List recurring invoices error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring invoices' }, { status: 500 });
  }
}

// POST /api/recurring-invoices — Create a recurring invoice schedule
// Body: { name, customerId?, jobId?, frequency?, dayOfMonth?, amount, taxPercent?, currency?, itemsJson?, notes?, startDate?, endDate? }
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.amount) {
      return NextResponse.json(
        { error: 'Name and amount are required' },
        { status: 400 }
      );
    }

    const result = await createRecurringInvoiceSchedule({
      name: body.name,
      customerId: body.customerId || null,
      jobId: body.jobId || null,
      frequency: body.frequency || 'monthly',
      dayOfMonth: body.dayOfMonth || 1,
      amount: Number(body.amount),
      taxPercent: body.taxPercent ? Number(body.taxPercent) : 0,
      currency: body.currency || 'USD',
      itemsJson: body.itemsJson || JSON.stringify([{ description: body.name, quantity: 1, rate: Number(body.amount) }]),
      notes: body.notes || null,
      startDate: body.startDate || new Date(),
      endDate: body.endDate || null,
      tenantId: user.tenantId,
      createdById: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create schedule' }, { status: 500 });
    }

    const schedule = await db.recurringInvoice.findUnique({
      where: { id: result.scheduleId! },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Create recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to create recurring invoice' }, { status: 500 });
  }
}
