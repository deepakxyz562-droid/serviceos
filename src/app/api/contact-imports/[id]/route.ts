import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/contact-imports/[id] — fetch one import job (with errorJson parsed)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const importJob = await db.contactImport.findFirst({
      where: { id, tenantId },
    });
    if (!importJob) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      );
    }

    // Parse errorJson / mappingJson for convenience
    let errors: unknown = [];
    let mapping: unknown = {};
    try {
      errors = importJob.errorJson ? JSON.parse(importJob.errorJson) : [];
    } catch {
      errors = [];
    }
    try {
      mapping = importJob.mappingJson ? JSON.parse(importJob.mappingJson) : {};
    } catch {
      mapping = {};
    }

    return NextResponse.json({
      data: { ...importJob, errors, mapping },
    });
  } catch (error) {
    console.error('Error fetching contact import:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact import' },
      { status: 500 }
    );
  }
}
