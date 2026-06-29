import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toISOString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const automations = await db.workflowAutomation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = automations.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      triggerType: a.triggerType,
      triggerCategory: getTriggerCategory(a.triggerType),
      conditions: JSON.parse(a.conditionsJson || '[]'),
      conditionLogic: (a.triggerConfigJson && JSON.parse(a.triggerConfigJson).conditionLogic) || 'and',
      actions: JSON.parse(a.actionsJson || '[]'),
      active: a.active,
      executionCount: a.executionCount,
      lastExecutedAt: toISOString(a.lastExecutedAt as Date | string | null),
      lastExecutionStatus: a.lastExecutionStatus,
      createdAt: toISOString(a.createdAt as Date | string)?.split('T')[0] ?? '',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch workflow automations:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow automations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, triggerType, conditions, conditionLogic, actions, active } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: 'Name and trigger type are required' }, { status: 400 });
    }

    const automation = await db.workflowAutomation.create({
      data: {
        name,
        description: description || null,
        triggerType,
        triggerConfigJson: JSON.stringify({ conditionLogic: conditionLogic || 'and' }),
        conditionsJson: JSON.stringify(conditions || []),
        actionsJson: JSON.stringify(actions || []),
        active: active !== undefined ? active : true,
        tenantId,
        createdById: authUser.id,
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    console.error('Failed to create workflow automation:', error);
    return NextResponse.json({ error: 'Failed to create workflow automation' }, { status: 500 });
  }
}

function getTriggerCategory(triggerType: string): string {
  if (triggerType.startsWith('lead.')) return 'CRM Triggers';
  if (triggerType.startsWith('quote.')) return 'Quote Triggers';
  if (triggerType.startsWith('invoice.')) return 'Invoice Triggers';
  if (triggerType.startsWith('booking.')) return 'Booking Triggers';
  if (triggerType.startsWith('job.')) return 'Job Triggers';
  if (triggerType.startsWith('employee.')) return 'Employee Triggers';
  if (triggerType.startsWith('whatsapp.')) return 'WhatsApp Triggers';
  if (triggerType.startsWith('form.')) return 'Form Triggers';
  if (triggerType.startsWith('website.')) return 'Website Triggers';
  if (triggerType.startsWith('time.')) return 'Time-Based Triggers';
  return 'Other';
}
