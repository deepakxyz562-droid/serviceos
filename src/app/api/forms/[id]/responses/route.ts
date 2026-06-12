import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/forms/[id]/responses ─────────────────────────────────────────
// List responses for a form with pagination

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const source = searchParams.get('source');

    const form = await db.form.findUnique({ where: { id } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { formId: id };
    if (source) where.source = source;

    const [responses, total] = await Promise.all([
      db.formResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.formResponse.count({ where }),
    ]);

    return NextResponse.json({
      responses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List form responses error:', error);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

// ─── DELETE /api/forms/[id]/responses ──────────────────────────────────────
// Delete a specific response (query param: responseId)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json({ error: 'responseId query parameter is required' }, { status: 400 });
    }

    const response = await db.formResponse.findFirst({
      where: { id: responseId, formId: id },
    });

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    await db.formResponse.delete({ where: { id: responseId } });

    return NextResponse.json({ success: true, message: 'Response deleted' });
  } catch (error) {
    console.error('Delete form response error:', error);
    return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
  }
}
