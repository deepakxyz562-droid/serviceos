import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function safeJsonParse(str: string | null, fallback: unknown = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (active !== null && active !== undefined && active !== '') {
      where.active = active === 'true';
    }

    const [workflows, total] = await Promise.all([
      db.workflow.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { executions: true } },
        },
      }),
      db.workflow.count({ where }),
    ]);

    return NextResponse.json({
      workflows: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        nodes: safeJsonParse(w.nodesJson, []),
        edges: safeJsonParse(w.edgesJson, []),
        settings: safeJsonParse(w.settingsJson, {}),
        active: w.active,
        tags: safeJsonParse(w.tags, []),
        folderId: w.folderId,
        workspaceId: w.workspaceId,
        createdById: w.createdById,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        executionCount: w._count.executions,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch workflows';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const workflow = await db.workflow.create({
      data: {
        name: body.name || 'Untitled Workflow',
        description: body.description || null,
        nodesJson: JSON.stringify(body.nodes || []),
        edgesJson: JSON.stringify(body.edges || []),
        settingsJson: JSON.stringify(body.settings || {}),
        tags: JSON.stringify(body.tags || []),
        active: false,
        folderId: body.folderId || null,
        workspaceId: body.workspaceId || null,
        createdById: body.createdById || null,
      },
    });

    return NextResponse.json(
      {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodesJson, []),
        edges: safeJsonParse(workflow.edgesJson, []),
        settings: safeJsonParse(workflow.settingsJson, {}),
        active: workflow.active,
        tags: safeJsonParse(workflow.tags, []),
        folderId: workflow.folderId,
        workspaceId: workflow.workspaceId,
        createdById: workflow.createdById,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
