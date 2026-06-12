import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { TRIGGER_CATALOG, ACTION_CATALOG } from '@/lib/trigger-engine';

// GET /api/triggers - List all triggers/automations
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where: any = {};
    if (user.tenantId) where.tenantId = user.tenantId;
    if (category) where.triggerType = { startsWith: category.toLowerCase() };
    if (active !== null && active !== undefined) where.active = active === 'true';

    const automations = await db.workflowAutomation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Also return the catalog
    return NextResponse.json({
      automations,
      catalog: {
        triggers: TRIGGER_CATALOG,
        actions: ACTION_CATALOG,
        categories: [...new Set(TRIGGER_CATALOG.map(t => t.category))],
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch triggers:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch triggers' }, { status: 500 });
  }
}

// POST /api/triggers - Create a new trigger/automation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, triggerType, triggerConfigJson, conditionsJson, actionsJson, active, tagsJson } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: 'Name and trigger type are required' }, { status: 400 });
    }

    // Validate triggerType against catalog (allow custom triggers that aren't in catalog)
    const triggerDef = TRIGGER_CATALOG.find(t => t.id === triggerType);
    // Allow custom trigger types that aren't in the predefined catalog
    // Only validate format: must contain a dot (e.g. "lead.created", "custom.event")
    if (!triggerDef && !triggerType.includes('.')) {
      return NextResponse.json({ error: `Invalid trigger type format: ${triggerType}. Must be in format: category.event` }, { status: 400 });
    }

    const automation = await db.workflowAutomation.create({
      data: {
        name,
        description: description || null,
        triggerType,
        triggerConfigJson: triggerConfigJson || '{}',
        conditionsJson: conditionsJson || '[]',
        actionsJson: actionsJson || '[]',
        active: active !== undefined ? active : true,
        tagsJson: tagsJson || '[]',
        tenantId: user.tenantId || null,
        workspaceId: user.workspaceId || null,
        createdById: user.id || null,
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create trigger:', error);
    return NextResponse.json({ error: error.message || 'Failed to create trigger' }, { status: 500 });
  }
}
