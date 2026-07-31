import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// PUT — update an AiCall row. Currently supports:
//   - tagsJson   (string — JSON array of {label, color, at})
//   - aiDisabled (boolean — per-call AI disable toggle for the caller)
//
// Body is whitelisted: unknown fields are ignored. The call is tenant-scoped
// via getAuthUser(), and we verify ownership before updating.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.tagsJson === 'string') {
      // Validate that it parses as JSON before storing
      try {
        JSON.parse(body.tagsJson);
        updateData.tagsJson = body.tagsJson;
      } catch {
        return NextResponse.json({ error: 'tagsJson must be valid JSON' }, { status: 400 });
      }
    }
    if (typeof body.aiDisabled === 'boolean') {
      updateData.aiDisabled = body.aiDisabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided (tagsJson, aiDisabled)' },
        { status: 400 },
      );
    }

    // Ensure the call exists and belongs to the tenant before updating.
    const existing = await db.aiCall.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const updated = await db.aiCall.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ call: updated });
  } catch (error) {
    console.error('[vapi/calls/[id] PUT] error:', error);
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 });
  }
}
