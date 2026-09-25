import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { db } from '@/lib/db';

/** GET /api/v1/forms — list user's forms */
export async function GET(request: NextRequest) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:read');
  if (errorResponse) return errorResponse;

  const forms = await db.form.findMany({
    where: { tenantId: user.tenantId, status: { not: 'archived' } },
    select: { id: true, name: true, slug: true, status: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ forms });
}

/** POST /api/v1/forms — create a form manually */
export async function POST(request: NextRequest) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:write');
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { name, description, fields, theme } = body;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const form = await db.form.create({
    data: {
      name,
      description: description || null,
      type: 'lead_capture',
      status: 'active',
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      schemaJson: JSON.stringify({ version: 1, fields: fields || [], theme: theme || {} }),
      fieldsJson: JSON.stringify(fields || []),
    },
  });

  return NextResponse.json({ formId: form.id, title: form.name, url: `/form/${form.id}`, status: form.status });
}
