import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toISOString } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const automation = await db.workflowAutomation.findUnique({
      where: { id },
    });

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (automation.tenantId && automation.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const formatted = {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      triggerType: automation.triggerType,
      triggerCategory: getTriggerCategory(automation.triggerType),
      conditions: JSON.parse(automation.conditionsJson || '[]'),
      conditionLogic: (automation.triggerConfigJson && JSON.parse(automation.triggerConfigJson).conditionLogic) || 'and',
      actions: JSON.parse(automation.actionsJson || '[]'),
      active: automation.active,
      executionCount: automation.executionCount,
      lastExecutedAt: toISOString(automation.lastExecutedAt as Date | string | null),
      lastExecutionStatus: automation.lastExecutionStatus,
      createdAt: toISOString(automation.createdAt as Date | string)?.split('T')[0] ?? '',
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch workflow automation:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow automation' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, triggerType, conditions, conditionLogic, actions, active } = body;

    const existing = await db.workflowAutomation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (existing.tenantId && existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (conditions !== undefined) updateData.conditionsJson = JSON.stringify(conditions);
    if (conditionLogic !== undefined) updateData.triggerConfigJson = JSON.stringify({ conditionLogic });
    if (actions !== undefined) updateData.actionsJson = JSON.stringify(actions);
    if (active !== undefined) updateData.active = active;

    const automation = await db.workflowAutomation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(automation);
  } catch (error) {
    console.error('Failed to update workflow automation:', error);
    return NextResponse.json({ error: 'Failed to update workflow automation' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.workflowAutomation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (existing.tenantId && existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.workflowAutomation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workflow automation:', error);
    return NextResponse.json({ error: 'Failed to delete workflow automation' }, { status: 500 });
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
