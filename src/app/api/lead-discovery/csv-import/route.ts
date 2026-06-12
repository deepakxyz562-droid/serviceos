import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

interface CsvRow {
  [key: string]: string;
}

// Column name aliases for flexible CSV parsing
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'business_name', 'businessname', 'company', 'company_name', 'business'],
  phone: ['phone', 'telephone', 'tel', 'phone_number', 'phonenumber', 'mobile'],
  email: ['email', 'e_mail', 'e-mail', 'email_address', 'emailaddress'],
  website: ['website', 'url', 'web', 'site', 'web_address'],
  address: ['address', 'street', 'street_address', 'addr', 'location'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region', 'st'],
  postalCode: ['postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'postcode'],
  country: ['country', 'cnty'],
  businessType: ['business_type', 'businesstype', 'type', 'category', 'industry', 'business_category'],
};

function normalizeColumnName(header: string): string {
  const lower = header.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(lower) || lower === canonical) {
      return canonical;
    }
  }

  return lower;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
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
}

function parseCsv(csvData: string): CsvRow[] {
  const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(normalizeColumnName);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: CsvRow = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return rows;
}

// POST /api/lead-discovery/csv-import — Import businesses from CSV data
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData, records } = body;

    // Support both raw CSV string and pre-parsed records array
    let rows: CsvRow[];

    if (records && Array.isArray(records) && records.length > 0) {
      rows = records;
    } else if (csvData && typeof csvData === 'string') {
      rows = parseCsv(csvData);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found in CSV data. Ensure the CSV has headers and at least one data row.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either csvData (string) or records (array) is required' },
        { status: 400 }
      );
    }

    let created = 0;
    let errors = 0;
    const errorDetails: { row: number; name: string; error: string }[] = [];

    // Create a search record to group the CSV import
    const searchRecord = await db.leadDiscoverySearch.create({
      data: {
        query: `CSV Import (${rows.length} records)`,
        source: 'csv',
        status: 'completed',
        resultsCount: rows.length,
        tenantId: authUser.tenantId,
        createdById: authUser.id,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row.business_name || '';

      if (!name) {
        errors++;
        errorDetails.push({ row: i + 1, name: '', error: 'Missing business name' });
        continue;
      }

      try {
        await db.leadDiscovery.create({
          data: {
            name,
            phone: row.phone || null,
            email: row.email || null,
            website: row.website || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            postalCode: row.postalCode || row.zip || null,
            country: row.country || 'US',
            source: 'csv',
            businessType: row.businessType || row.type || row.category || null,
            status: 'discovered',
            priority: 'medium',
            searchQueryId: searchRecord.id,
            tenantId: authUser.tenantId,
            createdById: authUser.id,
          },
        });
        created++;
      } catch (createErr) {
        console.error(`[LeadDiscovery] CSV import row ${i + 1} error:`, createErr);
        errors++;
        errorDetails.push({ row: i + 1, name, error: 'Failed to create record' });
      }
    }

    // Update search record with actual counts
    await db.leadDiscoverySearch.update({
      where: { id: searchRecord.id },
      data: { resultsCount: created },
    });

    return NextResponse.json({
      summary: {
        total: rows.length,
        created,
        errors,
      },
      searchId: searchRecord.id,
      ...(errorDetails.length > 0 && errorDetails.length <= 20 ? { errorDetails } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error('[LeadDiscovery] CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV data' },
      { status: 500 }
    );
  }
}
