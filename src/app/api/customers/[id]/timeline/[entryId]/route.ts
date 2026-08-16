import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PUT /api/customers/[id]/timeline/[entryId]
 *
 * Edit a manual timeline note (title + description).
 *
 * Business rules:
 *   - Only explicit user-created notes can be edited:
 *       entryType === 'note' AND actorType === 'user' AND sourceType === 'Manual'
 *   - System-generated timeline events (leads, jobs, invoices, photos, signatures)
 *     are synthesized from other tables and CANNOT be edited here.
 *   - The `updatedAt` field is set automatically by Prisma @updatedAt.
 *
 * Body: { title?, description? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId, entryId } = await params;

    // ── 1. Fetch the entry and verify ownership ────────────────────────
    const entry = await db.customerTimelineEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        customerId: true,
        tenantId: true,
        entryType: true,
        actorType: true,
        sourceType: true,
        title: true,
        description: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // Verify the entry belongs to the specified customer
    if (entry.customerId !== customerId) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // ── 2. Verify tenant scoping ───────────────────────────────────────
    // Non-super-admins can only edit entries in their tenant
    if (!user.isSuperAdmin && user.tenantId && entry.tenantId && entry.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // ── 3. Verify the entry is an editable user-created note ───────────
    // Only explicit notes created by a user (not system-generated events)
    // can be edited. This prevents users from modifying synthesized timeline
    // entries (leads, jobs, invoices, photos, signatures).
    const isEditableNote =
      entry.entryType === 'note' &&
      entry.actorType === 'user' &&
      entry.sourceType === 'Manual';

    if (!isEditableNote) {
      return NextResponse.json(
        { error: 'Only user-created notes can be edited. System-generated timeline events cannot be modified.' },
        { status: 403 },
      );
    }

    // ── 4. Apply the edit ──────────────────────────────────────────────
    const body = await request.json();
    const { title, description } = body || {};

    const updated = await db.customerTimelineEntry.update({
      where: { id: entryId },
      data: {
        ...(typeof title === 'string' && title.trim() ? { title: title.trim().slice(0, 500) } : {}),
        ...(description !== undefined ? { description: description ? String(description).slice(0, 4000) : null } : {}),
        // updatedAt is auto-set by Prisma @updatedAt
      },
      select: {
        id: true,
        entryType: true,
        title: true,
        description: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('[Timeline PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to edit timeline entry' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/customers/[id]/timeline/[entryId]
 *
 * Delete a manual timeline note.
 *
 * Business rules:
 *   - Only explicit user-created notes can be deleted (same rules as PUT).
 *   - Confirmation dialog is handled on the frontend.
 *   - This is a HARD delete — the entry is permanently removed.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId, entryId } = await params;

    // ── 1. Fetch the entry and verify ownership ────────────────────────
    const entry = await db.customerTimelineEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        customerId: true,
        tenantId: true,
        entryType: true,
        actorType: true,
        sourceType: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // Verify the entry belongs to the specified customer
    if (entry.customerId !== customerId) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // ── 2. Verify tenant scoping ───────────────────────────────────────
    if (!user.isSuperAdmin && user.tenantId && entry.tenantId && entry.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    }

    // ── 3. Verify the entry is a deletable user-created note ───────────
    const isDeletableNote =
      entry.entryType === 'note' &&
      entry.actorType === 'user' &&
      entry.sourceType === 'Manual';

    if (!isDeletableNote) {
      return NextResponse.json(
        { error: 'Only user-created notes can be deleted. System-generated timeline events cannot be removed.' },
        { status: 403 },
      );
    }

    // ── 4. Delete the entry ────────────────────────────────────────────
    await db.customerTimelineEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Timeline DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete timeline entry' },
      { status: 500 },
    );
  }
}
