import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/forms/[id] ───────────────────────────────────────────────────
// Get a single form with its recent responses

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = await db.form.findUnique({
      where: { id },
      include: {
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { responses: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Get form error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

// ─── PUT /api/forms/[id] ───────────────────────────────────────────────────
// Update a form (all fields, including submission actions, field mapping, WhatsApp templates)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.form.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.fieldsJson !== undefined) {
      updateData.fieldsJson = typeof body.fieldsJson === 'string' ? body.fieldsJson : JSON.stringify(body.fieldsJson);
    }
    if (body.submissionActions !== undefined) {
      updateData.submissionActions = typeof body.submissionActions === 'string' ? body.submissionActions : JSON.stringify(body.submissionActions);
    }
    if (body.fieldMappingJson !== undefined) {
      updateData.fieldMappingJson = typeof body.fieldMappingJson === 'string' ? body.fieldMappingJson : JSON.stringify(body.fieldMappingJson);
    }
    if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage;
    if (body.completionMessage !== undefined) updateData.completionMessage = body.completionMessage;
    if (body.whatsappOwnerTemplate !== undefined) updateData.whatsappOwnerTemplate = body.whatsappOwnerTemplate;
    if (body.whatsappUserTemplate !== undefined) updateData.whatsappUserTemplate = body.whatsappUserTemplate;
    if (body.whatsappAiGenerated !== undefined) updateData.whatsappAiGenerated = body.whatsappAiGenerated;
    if (body.embedScriptEnabled !== undefined) updateData.embedScriptEnabled = body.embedScriptEnabled;
    if (body.embedIframeEnabled !== undefined) updateData.embedIframeEnabled = body.embedIframeEnabled;
    if (body.tenantId !== undefined) updateData.tenantId = body.tenantId;
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId;
    if (body.createdById !== undefined) updateData.createdById = body.createdById;
    if (body.slug !== undefined) updateData.slug = body.slug;

    const form = await db.form.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Update form error:', error);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

// ─── DELETE /api/forms/[id] ────────────────────────────────────────────────
// Delete a form and all its responses

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.form.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Cascade delete is set on FormResponse, so responses are auto-deleted
    await db.form.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Form and all responses deleted' });
  } catch (error) {
    console.error('Delete form error:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
