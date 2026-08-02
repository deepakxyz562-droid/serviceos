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

/**
 * POST /api/contacts/bulk — perform bulk operations on contacts.
 *
 * This route intentionally does NOT use db.$transaction because:
 *   1. With the Supabase REST adapter, $transaction is not truly atomic —
 *      each PostgREST call is an independent HTTP request.
 *   2. The interactive callback form of $transaction can fail in subtle ways
 *      with the proxy-based adapter.
 *
 * Instead, each action is executed directly against `db` with explicit
 * try/catch blocks. This is simpler, more debuggable, and equally "atomic"
 * (which is to say: not atomic, but that's the best Supabase REST can do).
 */
export async function POST(request: NextRequest) {
  const step = '[contacts/bulk]';
  let action: string = 'unknown';
  let contactIdsCount = 0;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    let body: BulkBody;
    try {
      body = (await request.json()) as BulkBody;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    action = body.action;
    contactIdsCount = Array.isArray(body.contactIds)
      ? body.contactIds.length
      : 0;

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

    // ── Validate group/tag ownership ──────────────────────────────────────
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

    // ── Fetch only the contacts that belong to this tenant ────────────────
    const owned = await db.contact.findMany({
      where: { id: { in: contactIds }, tenantId },
      select: { id: true },
    });
    const ownedIds = owned.map((c: { id: string }) => c.id);
    const skippedCount = contactIds.length - ownedIds.length;

    if (ownedIds.length === 0) {
      return NextResponse.json({
        success: 0,
        failed: 0,
        skipped: skippedCount,
      });
    }

    let success = 0;
    let failed = 0;

    // ── Execute the action ────────────────────────────────────────────────
    // Each case has its own try/catch so a failure in one action doesn't
    // obscure the actual error.
    try {
      switch (action) {
        case 'addToGroup': {
          // Add contacts to the group (skips existing pairs internally)
          success = await addContactsToGroup(
            body.groupId!,
            ownedIds,
            user.id,
            db as any
          );
          // Sync memberCount
          try {
            const cnt = await db.contactGroup.count({
              where: { groupId: body.groupId! },
            });
            await db.group.update({
              where: { id: body.groupId! },
              data: { memberCount: cnt },
            });
          } catch (syncErr) {
            // memberCount sync is best-effort — don't fail the whole operation
            console.warn(`${step} memberCount sync failed:`, syncErr);
          }
          break;
        }

        case 'removeFromGroup': {
          const res = await db.contactGroup.deleteMany({
            where: { groupId: body.groupId!, contactId: { in: ownedIds } },
          });
          success = res.count;
          // Sync memberCount
          try {
            const cnt = await db.contactGroup.count({
              where: { groupId: body.groupId! },
            });
            await db.group.update({
              where: { id: body.groupId! },
              data: { memberCount: cnt },
            });
          } catch (syncErr) {
            console.warn(`${step} memberCount sync failed:`, syncErr);
          }
          break;
        }

        case 'applyTag': {
          success = await applyTagToContacts(
            body.tagId!,
            ownedIds,
            user.id,
            db as any
          );
          break;
        }

        case 'removeTag': {
          const res = await db.contactTag.deleteMany({
            where: { tagId: body.tagId!, contactId: { in: ownedIds } },
          });
          success = res.count;
          break;
        }

        case 'updateStatus': {
          const res = await db.contact.updateMany({
            where: { id: { in: ownedIds } },
            data: { status: body.status! },
          });
          success = res.count;
          break;
        }

        case 'delete': {
          const res = await db.contact.deleteMany({
            where: { id: { in: ownedIds } },
          });
          success = res.count;
          break;
        }
      }
    } catch (actionErr) {
      console.error(`${step} action '${action}' failed:`, actionErr);
      failed = ownedIds.length;
      // Re-throw to the outer catch, which will build the error response
      throw actionErr;
    }

    return NextResponse.json({
      success,
      failed: failed + skippedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error(`${step} outer error:`, error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';

    // Detect common schema-mismatch errors
    const isSchemaError =
      /does not exist|Unknown column|no such table|no such column|relation .* does not exist|Could not find/i.test(
        message
      );

    // Include the error name/code if available for better debugging
    const errorName =
      error instanceof Error ? error.constructor.name : 'Error';

    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation.',
        detail: message,
        errorType: errorName,
        action,
        contactIdsCount,
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
