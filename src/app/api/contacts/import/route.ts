import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Netlify serverless functions time out at ~26s on the free tier. The import
// route can process hundreds of rows, so we give Netlify a hint to allow a
// longer runtime (max 60s on Pro, 26s on Free — the config is a no-op if the
// plan doesn't support it).
export const maxDuration = 60;

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

  // ── Pre-process & deduplicate in-memory ────────────────────────────────
  // Normalise every row, drop rows without a name, and dedupe by email within
  // the batch itself (so a CSV with the same email twice only imports once).
  const seenEmails = new Set<string>();
  const toCreate: Array<{
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    tags: string | null;
  }> = [];

  for (const contactData of contacts) {
    const name = (contactData.name as string)?.trim();
    if (!name) {
      skipped++;
      continue;
    }
    const email = (contactData.email as string)?.trim() || null;
    if (email) {
      if (seenEmails.has(email.toLowerCase())) {
        duplicates++;
        continue;
      }
      seenEmails.add(email.toLowerCase());
    }
    toCreate.push({
      name,
      email,
      phone: (contactData.phone as string)?.trim() || null,
      company: (contactData.company as string)?.trim() || null,
      tags: (contactData.tags as string)?.trim() || null,
    });
  }

  if (toCreate.length === 0) {
    return NextResponse.json({
      total: contacts.length,
      imported: 0,
      duplicates,
      skipped,
    });
  }

  // ── Batch duplicate detection ──────────────────────────────────────────
  // Instead of one findFirst per row (N round-trips), do a single findMany
  // for all emails at once. This is the main perf win for large imports.
  const emailsToCheck = toCreate
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  const existingEmails = new Set<string>();
  if (emailsToCheck.length > 0) {
    try {
      const existing = await db.contact.findMany({
        where: {
          tenantId,
          email: { in: emailsToCheck },
        },
        select: { email: true },
      });
      for (const c of existing) {
        if (c.email) existingEmails.add(c.email.toLowerCase());
      }
    } catch (err) {
      // If the duplicate-check query fails, capture the error but continue —
      // we'll attempt the insert anyway and let the DB reject actual dupes.
      firstError =
        err instanceof Error
          ? err.message
          : 'Unknown error during duplicate check';
    }
  }

  const finalBatch = toCreate.filter((c) => {
    if (c.email && existingEmails.has(c.email.toLowerCase())) {
      duplicates++;
      return false;
    }
    return true;
  });

  if (finalBatch.length === 0) {
    return NextResponse.json({
      total: contacts.length,
      imported: 0,
      duplicates,
      skipped,
    });
  }

  // ── Batch insert with chunking ─────────────────────────────────────────
  // createMany sends a single INSERT per chunk instead of one per row.
  // Chunk size of 100 balances request size against DB limits.
  const CHUNK_SIZE = 100;
  for (let i = 0; i < finalBatch.length; i += CHUNK_SIZE) {
    const chunk = finalBatch.slice(i, i + CHUNK_SIZE);
    try {
      const res = await db.contact.createMany({
        // @ts-expect-error — skipDuplicates is supported by Prisma on Postgres
        // and silently ignored by the Supabase adapter; it's harmless on SQLite.
        skipDuplicates: true,
        data: chunk.map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          tags: c.tags,
          tenantId,
          workspaceId,
        })),
      });
      imported += res.count ?? chunk.length;
    } catch (err) {
      // Fallback: insert rows one-by-one so a single bad row doesn't kill
      // the whole chunk. This keeps the slow path working for SQLite (where
      // createMany with skipDuplicates isn't supported) and for any row-level
      // validation errors.
      if (!firstError) {
        firstError =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown database error during contact create';
      }
      for (const c of chunk) {
        try {
          await db.contact.create({
            data: {
              name: c.name,
              email: c.email,
              phone: c.phone,
              company: c.company,
              tags: c.tags,
              tenantId,
              workspaceId,
            },
          });
          imported++;
        } catch (rowErr) {
          if (!firstError) {
            firstError =
              rowErr instanceof Error
                ? rowErr.message
                : 'Unknown database error during contact create';
          }
          skipped++;
        }
      }
    }
  }

  // If we skipped every single row AND captured a database error, the backend
  // is almost certainly misconfigured (e.g. the `Contact` table is missing in
  // Supabase). Surface a 500 with the real error so the caller can fix it,
  // instead of a misleading 200 with imported:0.
  if (imported === 0 && skipped > 0 && firstError) {
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
