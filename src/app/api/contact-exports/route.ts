import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/contact-exports — list export jobs for current tenant
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
      db.contactExport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contactExport.count({ where }),
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
    console.error('Error fetching contact exports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact exports' },
      { status: 500 }
    );
  }
}

// POST /api/contact-exports — record an export job (for history/audit)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const { format, filterJson, totalExported, fileUrl } = body as Record<
      string,
      unknown
    >;

    const validFormats = ['csv', 'xlsx', 'json'];
    const finalFormat =
      format && validFormats.includes(String(format)) ? String(format) : 'csv';

    const exportJob = await db.contactExport.create({
      data: {
        format: finalFormat,
        filterJson: filterJson ? String(filterJson) : '{}',
        totalExported:
          typeof totalExported === 'number' ? totalExported : 0,
        fileUrl: fileUrl ? String(fileUrl) : null,
        tenantId,
        workspaceId: user.workspaceId || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: exportJob }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact export:', error);
    return NextResponse.json(
      { error: 'Failed to create contact export' },
      { status: 500 }
    );
  }
}
