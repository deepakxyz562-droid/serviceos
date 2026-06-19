import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { applyTagsToContact, addContactToGroups } from '@/lib/contact-links';

// GET /api/contacts — list contacts with filters + pagination
// Query params: search|q, groupId, tagId, status, source, country, city, page, limit
// limit may be a number (1..1000) or the literal "all" to return every match.
//
// NOTE: We intentionally resolve the group/tag filters and the tag/group
// includes with EXPLICIT pre-queries instead of relying on Prisma's nested
// relation filters (`contactGroups: { some: { groupId } }`) or nested
// includes (`contactTags: { include: { tag: true } }`). The custom Supabase
// REST adapter (src/lib/supabase-db.ts) does NOT support nested relation
// filters / includes — they are silently dropped — which meant group & tag
// filters and tag/group badges were broken in production. Doing it
// explicitly here works identically on SQLite (Prisma) and Supabase.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const search =
      (searchParams.get('search') || searchParams.get('q') || '').trim() || '';
    const groupId = searchParams.get('groupId');
    const tagId = searchParams.get('tagId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = searchParams.get('limit') || '20';
    const isAll = limitParam === 'all';
    const limit = isAll
      ? 100000
      : Math.min(1000, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (page - 1) * limit;

    // ── Resolve group filter → contactIds ────────────────────────────────
    // If a groupId filter is set, find which contact IDs belong to that group.
    // If none match, we can short-circuit to an empty result.
    let groupFilteredIds: string[] | null = null;
    if (groupId) {
      const links = await db.contactGroup.findMany({
        where: { groupId },
        select: { contactId: true },
      });
      groupFilteredIds = links.map((l) => l.contactId);
      if (groupFilteredIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit: isAll ? 0 : limit, total: 0, totalPages: 0 },
        });
      }
    }

    // ── Resolve tag filter → contactIds ──────────────────────────────────
    let tagFilteredIds: string[] | null = null;
    if (tagId) {
      const links = await db.contactTag.findMany({
        where: { tagId },
        select: { contactId: true },
      });
      tagFilteredIds = links.map((l) => l.contactId);
      if (tagFilteredIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit: isAll ? 0 : limit, total: 0, totalPages: 0 },
        });
      }
    }

    // ── Build the where clause ───────────────────────────────────────────
    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    if (country) where.country = country;
    if (city) where.city = city;

    // Intersect group & tag contact-id filters into the where clause.
    // If both are present we intersect them first (only contacts that are in
    // BOTH the selected group AND have the selected tag).
    const idFilters: string[][] = [groupFilteredIds, tagFilteredIds].filter(
      (x): x is string[] => x !== null
    );
    if (idFilters.length === 1) {
      where.id = { in: idFilters[0] };
    } else if (idFilters.length === 2) {
      const setB = new Set(idFilters[1]);
      const intersection = idFilters[0].filter((id) => setB.has(id));
      if (intersection.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit: isAll ? 0 : limit, total: 0, totalPages: 0 },
        });
      }
      where.id = { in: intersection };
    }

    // ── Fetch contacts (no nested includes — resolved manually below) ────
    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: isAll ? undefined : skip,
        take: isAll ? undefined : limit,
      }),
      db.contact.count({ where }),
    ]);

    // ── Manually attach tags + groups for the returned contacts ──────────
    // This mirrors `include: { contactTags: { include: { tag: true } },
    // contactGroups: { include: { group: true } } }` but works on the
    // Supabase adapter which does not support nested includes.
    const contactIds = (contacts as { id: string }[]).map((c) => c.id);

    const [tagLinks, groupLinks] = await Promise.all([
      contactIds.length > 0
        ? db.contactTag.findMany({
            where: { contactId: { in: contactIds } },
            select: { id: true, contactId: true, tagId: true, appliedAt: true },
          })
        : Promise.resolve([]),
      contactIds.length > 0
        ? db.contactGroup.findMany({
            where: { contactId: { in: contactIds } },
            select: { id: true, contactId: true, groupId: true, addedAt: true },
          })
        : Promise.resolve([]),
    ]);

    // Fetch the referenced Tag + Group rows in one go each.
    const tagIds = [...new Set(tagLinks.map((l) => l.tagId))] as string[];
    const groupIdsForLinks = [
      ...new Set(groupLinks.map((l) => l.groupId)),
    ] as string[];

    const [tags, groups] = await Promise.all([
      tagIds.length > 0
        ? db.tag.findMany({ where: { id: { in: tagIds } } })
        : Promise.resolve([]),
      groupIdsForLinks.length > 0
        ? db.group.findMany({ where: { id: { in: groupIdsForLinks } } })
        : Promise.resolve([]),
    ]);

    const tagMap = new Map(tags.map((t) => [t.id, t]));
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const tagByContact = new Map<string, unknown[]>();
    for (const l of tagLinks) {
      const tag = tagMap.get(l.tagId);
      if (!tag) continue;
      const arr = tagByContact.get(l.contactId) || [];
      arr.push({ id: l.id, tag });
      tagByContact.set(l.contactId, arr);
    }
    const groupByContact = new Map<string, unknown[]>();
    for (const l of groupLinks) {
      const group = groupMap.get(l.groupId);
      if (!group) continue;
      const arr = groupByContact.get(l.contactId) || [];
      arr.push({ id: l.id, group });
      groupByContact.set(l.contactId, arr);
    }

    const dataWithRelations = (contacts as Record<string, unknown>[]).map(
      (c) => ({
        ...c,
        contactTags: tagByContact.get(c.id as string) || [],
        contactGroups: groupByContact.get(c.id as string) || [],
      })
    );

    return NextResponse.json({
      data: dataWithRelations,
      pagination: {
        page,
        limit: isAll ? total : limit,
        total,
        totalPages: isAll ? 1 : Math.ceil(total / limit) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/contacts — create contact with extended fields + tagIds/groupIds
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

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
      tags, // legacy comma-separated string
      tagIds,
      groupIds,
    } = body as Record<string, unknown>;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate email
    if (email && String(email).trim()) {
      const existing = await db.contact.findFirst({
        where: {
          email: String(email).trim(),
          tenantId,
        },
      });
      if (existing) {
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
        : 'active';

    const tagIdList = Array.isArray(tagIds)
      ? (tagIds as string[]).map(String).filter(Boolean)
      : [];
    const groupIdList = Array.isArray(groupIds)
      ? (groupIds as string[]).map(String).filter(Boolean)
      : [];

    // Create contact + join rows in a transaction
    const contact = await db.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          name: String(name).trim(),
          email: email ? String(email).trim() : null,
          phone: phone ? String(phone).trim() : null,
          company: company ? String(company).trim() : null,
          city: city ? String(city).trim() : null,
          state: state ? String(state).trim() : null,
          country: country ? String(country).trim() : null,
          zip: zip ? String(zip).trim() : null,
          source: source ? String(source).trim() : null,
          status: finalStatus,
          customFieldsJson:
            customFieldsJson != null ? String(customFieldsJson) : '{}',
          avatarUrl: avatarUrl ? String(avatarUrl) : null,
          tags: tags ? String(tags).trim() : null,
          tenantId,
          workspaceId: user.workspaceId || null,
        },
      });

      // Apply tags
      if (tagIdList.length > 0) {
        // Only tagIds that exist for this tenant
        const validTags = await tx.tag.findMany({
          where: { id: { in: tagIdList }, tenantId },
          select: { id: true },
        });
        if (validTags.length > 0) {
          await applyTagsToContact(
            created.id,
            validTags.map((t) => t.id),
            user.id,
            tx
          );
        }
      }

      // Add to groups
      if (groupIdList.length > 0) {
        const validGroups = await tx.group.findMany({
          where: { id: { in: groupIdList }, tenantId },
          select: { id: true },
        });
        if (validGroups.length > 0) {
          await addContactToGroups(
            created.id,
            validGroups.map((g) => g.id),
            user.id,
            tx
          );
          // Sync memberCount for each group
          for (const g of validGroups) {
            const cnt = await tx.contactGroup.count({
              where: { groupId: g.id },
            });
            await tx.group.update({
              where: { id: g.id },
              data: { memberCount: cnt },
            });
          }
        }
      }

      return created;
    });

    // Re-fetch and attach tags + groups for the response (explicit queries
    // because the Supabase adapter doesn't support nested includes).
    const full = await db.contact.findUnique({
      where: { id: contact.id },
    });
    if (!full) {
      return NextResponse.json({ error: 'Contact not found after create' }, { status: 500 });
    }
    const [tagLinks, groupLinks] = await Promise.all([
      db.contactTag.findMany({
        where: { contactId: full.id },
        select: { id: true, contactId: true, tagId: true, appliedAt: true },
      }),
      db.contactGroup.findMany({
        where: { contactId: full.id },
        select: { id: true, contactId: true, groupId: true, addedAt: true },
      }),
    ]);
    const tIds = [...new Set(tagLinks.map((l) => l.tagId))];
    const gIds = [...new Set(groupLinks.map((l) => l.groupId))];
    const [fetchedTags, fetchedGroups] = await Promise.all([
      tIds.length > 0 ? db.tag.findMany({ where: { id: { in: tIds } } }) : Promise.resolve([]),
      gIds.length > 0 ? db.group.findMany({ where: { id: { in: gIds } } }) : Promise.resolve([]),
    ]);
    const tagMap = new Map(fetchedTags.map((t) => [t.id, t]));
    const groupMap = new Map(fetchedGroups.map((g) => [g.id, g]));

    return NextResponse.json(
      {
        ...full,
        contactTags: tagLinks.map((l) => ({ id: l.id, tag: tagMap.get(l.tagId) })),
        contactGroups: groupLinks.map((l) => ({ id: l.id, group: groupMap.get(l.groupId) })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}

// PUT /api/contacts?id=xxx — legacy query-param update (kept for backward compat)
// Prefer PUT /api/contacts/[id] for new clients.
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const existing = await db.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
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
    } = body as Record<string, unknown>;

    // Check for duplicate email (excluding current contact)
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

    const contact = await db.contact.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/contacts?id=xxx — legacy query-param delete (cascade handles joins)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const existing = await db.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.contact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
