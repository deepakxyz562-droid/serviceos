import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/contacts/import - Import contacts in bulk
// Supports:
//   1. JSON body: { contacts: [{ name, email, phone, company, tags }] }
//   2. Multipart file upload (CSV / XLSX / XLS) with optional mapping
//   3. ?preview=true with multipart file → returns headers + preview rows
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // ─── Multipart file upload (CSV / XLSX) ──────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const mappingStr = formData.get('mapping') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Parse the file into rows (array of key-value objects)
      const rows = await parseFileToRows(file);

      if (rows.length === 0) {
        return NextResponse.json({
          error: 'No data rows found in the file. Make sure the file has a header row and at least one data row.',
        }, { status: 400 });
      }

      // Preview mode — return headers + first 10 rows for mapping UI
      if (isPreview) {
        const headers = Object.keys(rows[0]);
        return NextResponse.json({
          headers,
          preview: rows.slice(0, 10),
          totalRows: rows.length,
          mapping: autoMapHeaders(headers),
        });
      }

      // Import mode — apply mapping and bulk insert
      const mapping = mappingStr ? JSON.parse(mappingStr) : autoMapHeaders(Object.keys(rows[0]));
      const contacts = mapRowsToContacts(rows, mapping);
      return await bulkImportContacts(contacts, user.tenantId || 'default', user.workspaceId);
    }

    // ─── JSON body (client-side parsed CSV) ──────────────────────────────
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        error: 'Invalid request body. Expected JSON with a "contacts" array, or upload a CSV/XLSX file.',
      }, { status: 400 });
    }

    const { contacts: contactData } = body;

    if (!Array.isArray(contactData)) {
      return NextResponse.json({
        error: 'Expected a "contacts" array in the JSON body.',
      }, { status: 400 });
    }

    if (contactData.length === 0) {
      return NextResponse.json({
        error: 'No contacts to import. After field mapping, no rows had a valid "name" field. Please check your CSV column mapping — the name column must be mapped to "name".',
      }, { status: 400 });
    }

    return await bulkImportContacts(contactData, user.tenantId || 'default', user.workspaceId);
  } catch (error) {
    console.error('Error importing contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to import contacts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── File Parser ────────────────────────────────────────────────────────────

/**
 * Parse an uploaded file (CSV, XLSX, or XLS) into an array of row objects.
 * Uses the `xlsx` library for Excel files and a robust CSV parser for CSV.
 */
async function parseFileToRows(file: File): Promise<Record<string, string>[]> {
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() || '';

  if (ext === 'xlsx' || ext === 'xls') {
    // Parse Excel with xlsx library
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    // sheet_to_json with header:1 gives array of arrays; we want objects
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      raw: false, // keep everything as strings for consistency
    });
    // Normalize all values to strings
    return rows.map(row => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[k] = v == null ? '' : String(v).trim();
      }
      return normalized;
    });
  }

  // CSV / TSV — parse as text
  const text = await file.text();
  return parseCSV(text);
}

/**
 * Robust CSV parser — handles quoted fields, commas inside quotes, etc.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  });
}

// ─── Auto-Mapping ───────────────────────────────────────────────────────────

/**
 * Auto-detect which CSV/Excel header maps to which contact field.
 * Catches common variations like "Full Name", "Customer", "E-mail", etc.
 */
function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (
      lower.includes('name') ||
      lower === 'full name' ||
      lower === 'first name' ||
      lower === 'contact' ||
      lower === 'customer' ||
      lower === 'person' ||
      lower === 'client'
    ) {
      // Only map to 'name' if not already mapped (prefer first match)
      if (!Object.values(mapping).includes('name')) {
        mapping[h] = 'name';
      } else {
        mapping[h] = '_skip';
      }
    } else if (lower.includes('email') || lower.includes('e-mail') || lower.includes('mail')) {
      mapping[h] = 'email';
    } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('whatsapp') || lower.includes('contact no') || lower.includes('number')) {
      mapping[h] = 'phone';
    } else if (lower.includes('company') || lower.includes('organization') || lower.includes('org') || lower.includes('business')) {
      mapping[h] = 'company';
    } else if (lower.includes('tag') || lower.includes('label') || lower.includes('category') || lower.includes('group')) {
      mapping[h] = 'tags';
    } else {
      mapping[h] = '_skip';
    }
  }
  return mapping;
}

function mapRowsToContacts(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Record<string, string | null>[] {
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

// ─── Bulk Import ────────────────────────────────────────────────────────────

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

    // Duplicate detection by email (if present)
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
