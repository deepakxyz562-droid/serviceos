import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { applyTagToContacts, addContactsToGroup } from '@/lib/contact-links';

type BulkAction =
  | 'addToGroup'
  | 'removeFromGroup'
  | 'applyTag'
  | 'removeTag'
  | 'delete'
  | 'updateStatus';

interface BulkBody {
  contactIds: string[];
  action: BulkAction;
  groupId?: string;
  tagId?: string;
  status?: string;
}

// POST /api/contacts/bulk — perform bulk operations on contacts
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = (await request.json()) as BulkBody;
    const { action } = body;
    const contactIds = Array.isArray(body.contactIds)
      ? body.contactIds.map(String).filter(Boolean)
      : [];

    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'No contactIds provided' }, { status: 400 });
    }

    const validActions: BulkAction[] = [
      'addToGroup',
      'removeFromGroup',
      'applyTag',
      'removeTag',
      'delete',
      'updateStatus',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Validate group/tag ownership where applicable
    if (action === 'addToGroup' || action === 'removeFromGroup') {
      if (!body.groupId) {
        return NextResponse.json(
          { error: 'groupId is required for this action' },
          { status: 400 }
        );
      }
      const group = await db.group.findFirst({
        where: { id: body.groupId, tenantId },
        select: { id: true },
      });
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
    }
    if (action === 'applyTag' || action === 'removeTag') {
      if (!body.tagId) {
        return NextResponse.json(
          { error: 'tagId is required for this action' },
          { status: 400 }
        );
      }
      const tag = await db.tag.findFirst({
        where: { id: body.tagId, tenantId },
        select: { id: true },
      });
      if (!tag) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }
    }
    if (action === 'updateStatus') {
      const validStatuses = ['active', 'bounced', 'unsubscribed', 'blocked'];
      if (!body.status || !validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: active, bounced, unsubscribed, blocked' },
          { status: 400 }
        );
      }
    }

    // Fetch only the contacts that belong to this tenant
    const owned = await db.contact.findMany({
      where: { id: { in: contactIds }, tenantId },
      select: { id: true },
    });
    const ownedIds = owned.map((c) => c.id);
    const skippedCount = contactIds.length - ownedIds.length;

    let success = 0;
    let failed = 0;

    await db.$transaction(async (tx) => {
      if (ownedIds.length === 0) return;

      try {
        switch (action) {
          case 'addToGroup': {
            success = await addContactsToGroup(
              body.groupId!,
              ownedIds,
              user.id,
              tx
            );
            // Sync memberCount for the group
            const cnt = await tx.contactGroup.count({
              where: { groupId: body.groupId! },
            });
            await tx.group.update({
              where: { id: body.groupId! },
              data: { memberCount: cnt },
            });
            break;
          }
          case 'removeFromGroup': {
            const res = await tx.contactGroup.deleteMany({
              where: { groupId: body.groupId!, contactId: { in: ownedIds } },
            });
            success = res.count;
            const cnt = await tx.contactGroup.count({
              where: { groupId: body.groupId! },
            });
            await tx.group.update({
              where: { id: body.groupId! },
              data: { memberCount: cnt },
            });
            break;
          }
          case 'applyTag': {
            success = await applyTagToContacts(body.tagId!, ownedIds, user.id, tx);
            break;
          }
          case 'removeTag': {
            const res = await tx.contactTag.deleteMany({
              where: { tagId: body.tagId!, contactId: { in: ownedIds } },
            });
            success = res.count;
            break;
          }
          case 'updateStatus': {
            const res = await tx.contact.updateMany({
              where: { id: { in: ownedIds } },
              data: { status: body.status! },
            });
            success = res.count;
            break;
          }
          case 'delete': {
            const res = await tx.contact.deleteMany({
              where: { id: { in: ownedIds } },
            });
            success = res.count;
            break;
          }
        }
      } catch (err) {
        console.error('Bulk transaction error:', err);
        failed = ownedIds.length;
        throw err;
      }
    });

    return NextResponse.json({
      success,
      failed: failed + skippedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);

    // Extract a useful message from Prisma/Supabase errors so the caller can
    // diagnose schema mismatches (e.g. a missing table/column in the DB).
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';

    // Detect common "table/column does not exist" errors so we can give an
    // actionable hint about syncing the production DB schema.
    const isSchemaError =
      /does not exist|Unknown column|no such table|no such column|relation .* does not exist|Could not find/i.test(
        message
      );

    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation.',
        detail: message,
        action,
        contactIdsCount: contactIds?.length ?? 0,
        ...(isSchemaError
          ? {
              hint: 'The database schema appears to be out of sync. Run the supabase-migration.sql in the Supabase SQL Editor to create any missing tables/columns.',
            }
          : {}),
      },
      { status: 500 }
    );
  }
}
