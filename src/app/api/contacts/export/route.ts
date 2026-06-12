import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/contacts/export - Export contacts
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const ids = searchParams.get('ids');
    const tag = searchParams.get('tag');

    const where: Record<string, unknown> = {
      tenantId: user.tenantId || undefined,
    };

    if (ids) {
      where.id = { in: ids.split(',') };
    }

    if (tag && tag !== 'all') {
      where.tags = { contains: tag };
    }

    const contacts = await db.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (format === 'json') {
      return new NextResponse(JSON.stringify(contacts, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="contacts.json"',
        },
      });
    }

    // CSV format
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Created Date'];
    const csvRows = contacts.map(c => [
      escapeCSV(c.name),
      escapeCSV(c.email || ''),
      escapeCSV(c.phone || ''),
      escapeCSV(c.company || ''),
      escapeCSV(c.tags || ''),
      escapeCSV(new Date(c.createdAt).toISOString()),
    ]);

    const csv = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="contacts.csv"',
      },
    });
  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json({ error: 'Failed to export contacts' }, { status: 500 });
  }
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
