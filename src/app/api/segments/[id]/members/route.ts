import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/segments/[id]/members
 * Body: { contactId: string }
 *
 * Adds a single contact to a segment by creating a SegmentMember row.
 * Uses upsert semantics so re-adding the same contact is idempotent
 * (SegmentMember has @@unique([segmentId, customerId])).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const { id: segmentId } = await params;
    const body = await request.json().catch(() => ({}));
    const contactId = typeof body?.contactId === 'string' ? body.contactId.trim() : '';

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    // Verify the segment exists and belongs to the user's tenant.
    const segment = await db.segment.findFirst({
      where: { id: segmentId, tenantId: authUser.tenantId },
    });
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Verify the contact exists under the same tenant.
    const contact = await db.contact.findFirst({
      where: { id: contactId, tenantId: authUser.tenantId },
      select: { id: true, name: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Upsert so adding an already-linked contact doesn't throw a unique
    // constraint error.
    const member = await db.segmentMember.upsert({
      where: {
        segmentId_customerId: { segmentId, customerId: contactId },
      },
      update: {},
      create: { segmentId, customerId: contactId },
    });

    // Sync memberCount so segment lists show an accurate count.
    try {
      const actualCount = await db.segmentMember.count({
        where: { segmentId },
      });
      await db.segment.update({
        where: { id: segmentId },
        data: { memberCount: actualCount },
      });
    } catch {
      // Non-fatal — best-effort count sync.
    }

    return NextResponse.json(
      { data: { id: member.id, segmentId, customerId: contactId, alreadyMember: !member } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding contact to segment:', error);
    return NextResponse.json(
      { error: 'Failed to add contact to segment' },
      { status: 500 }
    );
  }
}
