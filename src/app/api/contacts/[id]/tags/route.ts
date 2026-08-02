import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { applyTagsToContact } from '@/lib/contact-links';

type Params = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/tags — list tags applied to this contact
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    // Verify contact belongs to tenant
    const contact = await db.contact.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contactTags = await db.contactTag.findMany({
      where: { contactId: id },
      include: { tag: true },
      orderBy: { appliedAt: 'desc' },
    });

    const data = contactTags.map((ct) => ({
      id: ct.id,
      contactId: ct.contactId,
      tagId: ct.tagId,
      appliedAt: ct.appliedAt,
      appliedById: ct.appliedById,
      tag: ct.tag,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching contact tags:', error);
    return NextResponse.json({ error: 'Failed to fetch contact tags' }, { status: 500 });
  }
}

// POST /api/contacts/[id]/tags — apply tags to contact
// Body: { tagIds: string[] } OR { tagNames: string[] } (auto-create missing)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const contact = await db.contact.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const tagIds: string[] = Array.isArray(body?.tagIds)
      ? (body.tagIds as string[]).map(String).filter(Boolean)
      : [];
    const tagNames: string[] = Array.isArray(body?.tagNames)
      ? (body.tagNames as string[])
          .map((n) => String(n).trim())
          .filter(Boolean)
      : [];

    // Resolve tagNames → tagIds by auto-creating missing tags
    const resolvedIds = [...tagIds];
    if (tagNames.length > 0) {
      for (const name of tagNames) {
        const existing = await db.tag.findFirst({
          where: { tenantId, name },
        });
        if (existing) {
          resolvedIds.push(existing.id);
        } else {
          const created = await db.tag.create({
            data: {
              name,
              tenantId,
              workspaceId: user.workspaceId || null,
            },
          });
          resolvedIds.push(created.id);
        }
      }
    }

    const uniqueIds = Array.from(new Set(resolvedIds));
    if (uniqueIds.length === 0) {
      return NextResponse.json({ applied: 0 });
    }

    const applied = await applyTagsToContact(id, uniqueIds, user.id);

    return NextResponse.json({ applied });
  } catch (error) {
    console.error('Error applying tags to contact:', error);
    return NextResponse.json({ error: 'Failed to apply tags' }, { status: 500 });
  }
}

// DELETE /api/contacts/[id]/tags — remove tags from contact
// Body: { tagIds: string[] }
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const contact = await db.contact.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const tagIds = Array.isArray(body?.tagIds)
      ? (body.tagIds as string[]).map(String).filter(Boolean)
      : [];

    if (tagIds.length === 0) {
      return NextResponse.json({ removed: 0 });
    }

    const result = await db.contactTag.deleteMany({
      where: { contactId: id, tagId: { in: tagIds } },
    });

    return NextResponse.json({ removed: result.count });
  } catch (error) {
    console.error('Error removing tags from contact:', error);
    return NextResponse.json({ error: 'Failed to remove tags' }, { status: 500 });
  }
}
