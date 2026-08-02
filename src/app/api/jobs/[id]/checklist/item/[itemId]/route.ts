import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── PATCH /api/jobs/[id]/checklist/item/[itemId] ──────────────────────────
// Toggle/check a single item in the JobChecklist.
// Body: { checked, notes?, photoUrl? }
// Updates the matching item in the itemsJson array and records checkedAt +
// checkedBy metadata on the item.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id, itemId } = await params;
    const body = await request.json();

    const job = await db.job.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const existing = await db.jobChecklist.findFirst({ where: { jobId: id } });
    if (!existing) {
      return NextResponse.json({ error: 'JobChecklist not found' }, { status: 404 });
    }

    let items: any[] = [];
    try {
      const parsed = JSON.parse(existing.itemsJson || '[]');
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }

    const idx = items.findIndex((it) => it?.id === itemId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Item not found in checklist' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const item = items[idx];

    if (typeof body.checked === 'boolean') {
      item.checked = body.checked;
      if (body.checked) {
        item.checkedAt = now;
        item.checkedBy = user.id;
        item.checkedByName = user.name || user.email || null;
      } else {
        item.checkedAt = null;
        item.checkedBy = null;
        item.checkedByName = null;
      }
    }
    if (typeof body.notes === 'string') item.notes = body.notes;
    if (body.photoUrl !== undefined) item.photoUrl = body.photoUrl || null;

    items[idx] = item;

    const updated = await db.jobChecklist.update({
      where: { id: existing.id },
      data: { itemsJson: JSON.stringify(items) },
    });

    return NextResponse.json({ jobChecklist: updated, item });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}
