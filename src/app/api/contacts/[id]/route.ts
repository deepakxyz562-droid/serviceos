import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyTagsToContact, addContactToGroups } from '@/lib/contact-links';

type Params = { params: Promise<{ id: string }> };

/**
 * Attach `contactTags` (with nested `tag`) and `contactGroups` (with nested
 * `group`) to a single contact object. Done with explicit queries because the
 * Supabase REST adapter does not support Prisma's nested `include` syntax —
 * those nested includes are silently dropped in production.
 */
async function attachTagsAndGroups<T extends { id: string }>(
  contact: T
): Promise<T & { contactTags: unknown[]; contactGroups: unknown[] }> {
  const [tagLinks, groupLinks] = await Promise.all([
    db.contactTag.findMany({
      where: { contactId: contact.id },
      select: { id: true, contactId: true, tagId: true, appliedAt: true },
    }),
    db.contactGroup.findMany({
      where: { contactId: contact.id },
      select: { id: true, contactId: true, groupId: true, addedAt: true },
    }),
  ]);

  const tagIds = [...new Set(tagLinks.map((l) => l.tagId))];
  const groupIds = [...new Set(groupLinks.map((l) => l.groupId))];

  const [tags, groups] = await Promise.all([
    tagIds.length > 0
      ? db.tag.findMany({ where: { id: { in: tagIds } } })
      : Promise.resolve([]),
    groupIds.length > 0
      ? db.group.findMany({ where: { id: { in: groupIds } } })
      : Promise.resolve([]),
  ]);

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  return {
    ...contact,
    contactTags: tagLinks.map((l) => ({
      id: l.id,
      tag: tagMap.get(l.tagId),
    })),
    contactGroups: groupLinks.map((l) => ({
      id: l.id,
      group: groupMap.get(l.groupId),
    })),
  };
}

// GET /api/contacts/[id] — fetch one contact (include tags + groups)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const contact = await db.contact.findFirst({
      where: { id, tenantId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify workspace isolation if applicable
    if (user.workspaceId && contact.workspaceId && contact.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const withRelations = await attachTagsAndGroups(contact);
    return NextResponse.json({ data: withRelations });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PUT /api/contacts/[id] — update contact (sync tagIds[] / groupIds[] + new fields)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (user.workspaceId && existing.workspaceId && existing.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      company,
      city,
      state,
      country,
      zip,
      source,
      status,
      customFieldsJson,
      avatarUrl,
      tags,
      tagIds,
      groupIds,
    } = body as Record<string, unknown>;

    // Check for duplicate email (excluding self)
    if (email && String(email).trim()) {
      const dup = await db.contact.findFirst({
        where: {
          email: String(email).trim(),
          tenantId,
          NOT: { id },
        },
      });
      if (dup) {
        return NextResponse.json(
          { error: 'A contact with this email already exists' },
          { status: 409 }
        );
      }
    }

    const validStatuses = ['active', 'bounced', 'unsubscribed', 'blocked'];
    const finalStatus =
      status && validStatuses.includes(String(status))
        ? String(status)
        : undefined;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (company !== undefined)
      updateData.company = company ? String(company).trim() : null;
    if (city !== undefined) updateData.city = city ? String(city).trim() : null;
    if (state !== undefined) updateData.state = state ? String(state).trim() : null;
    if (country !== undefined)
      updateData.country = country ? String(country).trim() : null;
    if (zip !== undefined) updateData.zip = zip ? String(zip).trim() : null;
    if (source !== undefined)
      updateData.source = source ? String(source).trim() : null;
    if (finalStatus !== undefined) updateData.status = finalStatus;
    if (customFieldsJson !== undefined)
      updateData.customFieldsJson =
        customFieldsJson != null ? String(customFieldsJson) : '{}';
    if (avatarUrl !== undefined)
      updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
    if (tags !== undefined) updateData.tags = tags ? String(tags).trim() : null;

    const desiredTagIds = Array.isArray(tagIds)
      ? (tagIds as string[]).map(String).filter(Boolean)
      : null;
    const desiredGroupIds = Array.isArray(groupIds)
      ? (groupIds as string[]).map(String).filter(Boolean)
      : null;

    await db.$transaction(async (tx) => {
      await tx.contact.update({ where: { id }, data: updateData });

      // Sync tags: remove ones not in desired, add missing ones
      if (desiredTagIds !== null) {
        const validTags = await tx.tag.findMany({
          where: { id: { in: desiredTagIds }, tenantId },
          select: { id: true },
        });
        const validTagIds = validTags.map((t) => t.id);

        await tx.contactTag.deleteMany({
          where: { contactId: id, NOT: { tagId: { in: validTagIds } } },
        });
        if (validTagIds.length > 0) {
          await applyTagsToContact(id, validTagIds, user.id, tx);
        }
      }

      // Sync groups
      if (desiredGroupIds !== null) {
        const validGroups = await tx.group.findMany({
          where: { id: { in: desiredGroupIds }, tenantId },
          select: { id: true },
        });
        const validGroupIds = validGroups.map((g) => g.id);

        await tx.contactGroup.deleteMany({
          where: { contactId: id, NOT: { groupId: { in: validGroupIds } } },
        });
        if (validGroupIds.length > 0) {
          await addContactToGroups(id, validGroupIds, user.id, tx);
        }

        // Sync memberCount for all affected groups (current + previously removed)
        const affectedGroupIds = Array.from(
          new Set([...validGroupIds, ...desiredGroupIds])
        );
        for (const gid of affectedGroupIds) {
          const cnt = await tx.contactGroup.count({
            where: { groupId: gid },
          });
          await tx.group
            .update({ where: { id: gid }, data: { memberCount: cnt } })
            .catch(() => {
              /* group may have been deleted already */
            });
        }
      }
    });

    const refreshed = await db.contact.findUnique({
      where: { id },
    });

    if (!refreshed) {
      return NextResponse.json({ error: 'Contact not found after update' }, { status: 404 });
    }

    const withRelations = await attachTagsAndGroups(refreshed);
    return NextResponse.json({ data: withRelations });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] — delete contact (cascade removes joins)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (user.workspaceId && existing.workspaceId && existing.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Capture affected groups so we can sync their memberCount after deletion
    const affectedGroups = await db.contactGroup.findMany({
      where: { contactId: id },
      select: { groupId: true },
    });

    await db.contact.delete({ where: { id } });

    // Sync memberCount for each affected group
    for (const ag of affectedGroups) {
      const cnt = await db.contactGroup.count({
        where: { groupId: ag.groupId },
      });
      await db.group
        .update({ where: { id: ag.groupId }, data: { memberCount: cnt } })
        .catch(() => {
          /* group may have been deleted already */
        });
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
