import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/contacts/import - Import contacts in bulk
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Preview mode for XLSX files
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    if (contentType.includes('multipart/form-data') && isPreview) {
      // Handle file upload for preview (XLSX)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // For XLSX preview, return basic info
      // In production, you'd use a library like xlsx to parse
      return NextResponse.json({
        headers: ['name', 'email', 'phone', 'company', 'tags'],
        preview: [],
        mapping: { name: 'name', email: 'email', phone: 'phone', company: 'company', tags: 'tags' },
      });
    }

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload import
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const mappingStr = formData.get('mapping') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // For CSV files from multipart
      const text = await file.text();
      const rows = parseCSV(text);
      const mapping = mappingStr ? JSON.parse(mappingStr) : {};

      const contacts = mapRowsToContacts(rows, mapping);
      return await bulkImportContacts(contacts, user.tenantId || 'default', user.workspaceId);
    }

    // Handle JSON body (from CSV client-side parsing)
    const body = await request.json();
    const { contacts: contactData } = body;

    if (!Array.isArray(contactData) || contactData.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 });
    }

    return await bulkImportContacts(contactData, user.tenantId || 'default', user.workspaceId);
  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 });
  }
}

async function bulkImportContacts(
  contacts: Record<string, string | null>[],
  tenantId: string,
  workspaceId: string | null
) {
  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const contactData of contacts) {
    const name = (contactData.name as string)?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const email = (contactData.email as string)?.trim() || null;

    // Duplicate detection by email
    if (email) {
      const existing = await db.contact.findFirst({
        where: { email, tenantId },
      });
      if (existing) {
        duplicates++;
        continue;
      }
    }

    try {
      await db.contact.create({
        data: {
          name,
          email,
          phone: (contactData.phone as string)?.trim() || null,
          company: (contactData.company as string)?.trim() || null,
          tags: (contactData.tags as string)?.trim() || null,
          tenantId,
          workspaceId,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    total: contacts.length,
    imported,
    duplicates,
    skipped,
  });
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function mapRowsToContacts(rows: Record<string, string>[], mapping: Record<string, string>): Record<string, string | null>[] {
  return rows.map(row => {
    const contact: Record<string, string | null> = {};
    Object.entries(mapping).forEach(([sourceHeader, targetField]) => {
      if (targetField !== '_skip' && row[sourceHeader] !== undefined) {
        contact[targetField] = row[sourceHeader] || null;
      }
    });
    return contact;
  });
}
