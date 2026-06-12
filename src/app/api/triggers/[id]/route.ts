import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/triggers/[id] - Get a single trigger
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const automation = await db.workflowAutomation.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!automation) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch trigger' }, { status: 500 });
  }
}

// PATCH /api/triggers/[id] - Update a trigger
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, triggerType, triggerConfigJson, conditionsJson, actionsJson, active, tagsJson } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConfigJson !== undefined) updateData.triggerConfigJson = triggerConfigJson;
    if (conditionsJson !== undefined) updateData.conditionsJson = conditionsJson;
    if (actionsJson !== undefined) updateData.actionsJson = actionsJson;
    if (active !== undefined) updateData.active = active;
    if (tagsJson !== undefined) updateData.tagsJson = tagsJson;

    const automation = await db.workflowAutomation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(automation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update trigger' }, { status: 500 });
  }
}

// DELETE /api/triggers/[id] - Delete a trigger
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await db.workflowAutomation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete trigger' }, { status: 500 });
  }
}
