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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        _count: { select: { executions: true } },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
      executionCount: workflow._count.executions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.nodes !== undefined) data.nodesJson = JSON.stringify(body.nodes);
    if (body.edges !== undefined) data.edgesJson = JSON.stringify(body.edges);
    if (body.settings !== undefined)
      data.settingsJson = JSON.stringify(body.settings);
    if (body.active !== undefined) data.active = body.active;
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
    if (body.folderId !== undefined) data.folderId = body.folderId;

    const workflow = await db.workflow.update({
      where: { id },
      data,
    });

    // Create a version snapshot if nodes/edges changed
    if (body.nodes !== undefined || body.edges !== undefined) {
      await db.workflowVersion.create({
        data: {
          workflowId: id,
          snapshotJson: JSON.stringify({
            nodes: safeJsonParse(workflow.nodesJson, []),
            edges: safeJsonParse(workflow.edgesJson, []),
            settings: safeJsonParse(workflow.settingsJson, {}),
          }),
          message: body.versionMessage || 'Workflow updated',
        },
      });
    }

    return NextResponse.json({
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    await db.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
