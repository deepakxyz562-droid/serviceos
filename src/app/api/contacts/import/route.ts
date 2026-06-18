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
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[contacts/import] JSON body parse failed:', parseErr);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON with a contacts array.' },
        { status: 400 }
      );
    }

    const contactData = (body as { contacts?: unknown })?.contacts;

    if (!Array.isArray(contactData) || contactData.length === 0) {
      return NextResponse.json(
        {
          error: 'No contacts provided.',
          hint: 'Make sure the CSV has a column mapped to "Name" (required). Rows without a name are skipped.',
        },
        { status: 400 }
      );
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
  let firstError: string | null = null;

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
    } catch (err) {
      // Capture the first error message so we can surface it to the caller.
      // Without this, a misconfigured backend (e.g. a missing `Contact` table
      // in Supabase) would silently skip every row and return imported:0,
      // which is very hard to diagnose.
      if (!firstError) {
        firstError =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown database error during contact create';
      }
      skipped++;
    }
  }

  // If we skipped every single row AND captured a database error, the backend
  // is almost certainly misconfigured (e.g. the `Contact` table is missing in
  // Supabase). Surface a 500 with the real error so the caller can fix it,
  // instead of a misleading 200 with imported:0.
  if (imported === 0 && skipped === contacts.length && firstError) {
    console.error('[contacts/import] All rows failed. First error:', firstError);
    return NextResponse.json(
      {
        error: 'Import failed: no contacts could be saved.',
        detail: firstError,
        total: contacts.length,
        imported,
        duplicates,
        skipped,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    total: contacts.length,
    imported,
    duplicates,
    skipped,
    ...(firstError ? { warning: `${skipped} row(s) skipped. First error: ${firstError}` } : {}),
  });
}

function parseCSV(text: string): Record<string, string>[] {
  // Strip a leading UTF-8 BOM if present — many editors add it and it
  // breaks header matching (the first column would be `\uFEFFname`).
  const cleaned = text.replace(/^\uFEFF/, '');
  return parseCSVRobust(cleaned);
}

/**
 * RFC-4180-ish CSV parser that handles:
 *   - quoted fields containing commas, newlines, and escaped quotes ("")
 *   - both \r\n and \n line endings
 *   - trailing newline at EOF
 *
 * The naive `line.split(',')` approach silently corrupts any row containing
 * a quoted field with a comma (e.g. `"Smith, John"`), which is the most
 * common cause of imports returning zero rows / 400 "No contacts provided".
 */
function parseCSVRobust(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote (`""` inside a quoted field) -> literal `"`
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      // Any character inside quotes (including newlines) is literal
      currentField += ch;
      i++;
      continue;
    }

    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // Treat \r\n as a single line break
      if (text[i + 1] === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = '';
      currentRow = [];
      i++;
      continue;
    }
    if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = '';
      currentRow = [];
      i++;
      continue;
    }
    currentField += ch;
    i++;
  }

  // Flush the last field/row if the file doesn't end with a newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Drop empty rows (e.g. blank line at EOF)
  const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ''));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map(h => h.trim());
  return nonEmpty.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (row[idx] ?? '').trim(); });
    return obj;
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
