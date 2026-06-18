import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { applyTagsToContact, addContactToGroups } from '@/lib/contact-links';

interface ImportContactItem {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  source?: string;
  tags?: string[];
  tagIds?: string[];
}

// GET /api/contact-imports — list import jobs for current tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    const [data, total] = await Promise.all([
      db.contactImport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactImport.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching contact imports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact imports' },
      { status: 500 }
    );
  }
}

// POST /api/contact-imports — create an import job and (optionally) process inline
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const {
      fileName,
      source,
      totalRows,
      mappingJson,
      autoGroupId,
      contacts,
    } = body as Record<string, unknown>;

    if (!fileName || !String(fileName).trim()) {
      return NextResponse.json(
        { error: 'fileName is required' },
        { status: 400 }
      );
    }

    // Validate autoGroupId belongs to tenant
    if (autoGroupId) {
      const grp = await db.group.findFirst({
        where: { id: String(autoGroupId), tenantId },
        select: { id: true },
      });
      if (!grp) {
        return NextResponse.json(
          { error: 'autoGroupId does not belong to this tenant' },
          { status: 400 }
        );
      }
    }

    const contactList: ImportContactItem[] = Array.isArray(contacts)
      ? (contacts as ImportContactItem[])
      : [];

    const initialTotal =
      typeof totalRows === 'number'
        ? totalRows
        : contactList.length;

    // Create the import job in pending state
    const importJob = await db.contactImport.create({
      data: {
        fileName: String(fileName).trim(),
        source: source ? String(source) : 'csv',
        totalRows: initialTotal,
        mappingJson: mappingJson ? String(mappingJson) : '{}',
        autoGroupId: autoGroupId ? String(autoGroupId) : null,
        status: 'pending',
        tenantId,
        workspaceId: user.workspaceId || null,
        createdById: user.id,
      },
    });

    // If contacts provided, process inline
    if (contactList.length > 0) {
      await db.contactImport.update({
        where: { id: importJob.id },
        data: { status: 'processing' },
      });

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < contactList.length; i++) {
        const item = contactList[i];
        try {
          const name = item.name?.trim();
          if (!name) {
            skippedCount++;
            errors.push({
              row: i + 1,
              error: 'Missing required field: name',
            });
            continue;
          }

          const email = item.email?.trim() || null;

          // Duplicate detection by email
          if (email) {
            const dup = await db.contact.findFirst({
              where: { email, tenantId },
              select: { id: true },
            });
            if (dup) {
              skippedCount++;
              continue;
            }
          }

          const created = await db.contact.create({
            data: {
              name,
              email,
              phone: item.phone?.trim() || null,
              company: item.company?.trim() || null,
              city: item.city?.trim() || null,
              state: item.state?.trim() || null,
              country: item.country?.trim() || null,
              zip: item.zip?.trim() || null,
              source: item.source?.trim() || (source ? String(source) : 'csv_import'),
              status: 'active',
              tenantId,
              workspaceId: user.workspaceId || null,
            },
          });

          // Apply tags (by id or auto-create by name)
          const tagIdsToApply: string[] = [];
          if (Array.isArray(item.tagIds)) {
            tagIdsToApply.push(...item.tagIds.map(String).filter(Boolean));
          }
          if (Array.isArray(item.tags)) {
            for (const tagName of item.tags) {
              const trimmed = String(tagName).trim();
              if (!trimmed) continue;
              const existingTag = await db.tag.findFirst({
                where: { tenantId, name: trimmed },
              });
              if (existingTag) {
                tagIdsToApply.push(existingTag.id);
              } else {
                const newTag = await db.tag.create({
                  data: { name: trimmed, tenantId, workspaceId: user.workspaceId || null },
                });
                tagIdsToApply.push(newTag.id);
              }
            }
          }
          if (tagIdsToApply.length > 0) {
            await applyTagsToContact(created.id, tagIdsToApply, user.id);
          }

          // Add to auto group if specified
          if (autoGroupId) {
            await addContactToGroups(
              created.id,
              [String(autoGroupId)],
              user.id
            );
          }

          importedCount++;
        } catch (err) {
          errorCount++;
          errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          if (errors.length >= 50) break; // cap stored errors
        }
      }

      // Sync memberCount for autoGroup
      if (autoGroupId) {
        const cnt = await db.contactGroup.count({
          where: { groupId: String(autoGroupId) },
        });
        await db.group.update({
          where: { id: String(autoGroupId) },
          data: { memberCount: cnt },
        });
      }

      const completed = await db.contactImport.update({
        where: { id: importJob.id },
        data: {
          importedCount,
          skippedCount,
          errorCount,
          status: 'completed',
          errorJson: JSON.stringify(errors),
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ data: completed }, { status: 201 });
    }

    // No contacts provided → just return the pending job (client may process later)
    return NextResponse.json({ data: importJob }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact import:', error);
    return NextResponse.json(
      { error: 'Failed to create contact import' },
      { status: 500 }
    );
  }
}
