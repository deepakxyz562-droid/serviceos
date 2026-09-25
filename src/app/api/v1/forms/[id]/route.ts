import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { db } from '@/lib/db';

/** GET /api/v1/forms/[id] — get form by ID */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:read');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const trimmedId = typeof id === 'string' ? id.replace(/^-+|-+$/g, '') : id;

  const form = await db.form.findFirst({
    where: {
      OR: [
        { id },
        { id: trimmedId },
        { slug: id },
        { slug: trimmedId },
      ],
      tenantId: user.tenantId,
    },
  });

  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const schema = form.schemaJson ? JSON.parse(form.schemaJson) : null;
  return NextResponse.json({
    formId: form.id,
    title: form.name,
    description: form.description,
    status: form.status,
    url: `/form/${form.id}`,
    fields: schema?.fields || [],
    theme: schema?.theme || {},
  });
}

/** PUT /api/v1/forms/[id] — update form */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:write');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await request.json();
  const { name, description, fields, theme } = body;

  const form = await db.form.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const existingSchema = form.schemaJson ? JSON.parse(form.schemaJson) : { version: 1, fields: [] };
  const updatedSchema = {
    ...existingSchema,
    ...(fields ? { fields } : {}),
    ...(theme ? { theme } : {}),
  };

  const updated = await db.form.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      schemaJson: JSON.stringify(updatedSchema),
      fieldsJson: JSON.stringify(fields || existingSchema.fields || []),
    },
  });

  return NextResponse.json({ formId: updated.id, title: updated.name, status: updated.status });
}

/** DELETE /api/v1/forms/[id] — archive form */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:write');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const form = await db.form.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  await db.form.update({ where: { id }, data: { status: 'archived' } });
  return NextResponse.json({ success: true, message: 'Form archived' });
}
