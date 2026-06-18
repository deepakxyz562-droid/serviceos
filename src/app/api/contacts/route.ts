import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { applyTagsToContact, addContactToGroups } from '@/lib/contact-links';

// GET /api/contacts — list contacts with filters + pagination
// Query params: search|q, groupId, tagId, status, source, country, city, page, limit
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const search =
      (searchParams.get('search') || searchParams.get('q') || '').trim() ||
      '';
    const groupId = searchParams.get('groupId');
    const tagId = searchParams.get('tagId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const country = searchParams.get('country');
    const city = searchParams.get('city');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    );
    const skip = (page - 1) * limit;

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
    if (groupId) {
      where.contactGroups = { some: { groupId } };
    }
    if (tagId) {
      where.contactTags = { some: { tagId } };
    }

    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          contactTags: { include: { tag: true } },
          contactGroups: { include: { group: true } },
        },
      }),
      db.contact.count({ where }),
    ]);

    return NextResponse.json({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
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

    // Re-fetch with relations for the response
    const full = await db.contact.findUnique({
      where: { id: contact.id },
      include: {
        contactTags: { include: { tag: true } },
        contactGroups: { include: { group: true } },
      },
    });

    return NextResponse.json(full, { status: 201 });
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
