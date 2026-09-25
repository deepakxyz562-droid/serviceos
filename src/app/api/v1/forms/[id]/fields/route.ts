import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { db } from '@/lib/db';

/** POST /api/v1/forms/[id]/fields — add a field to a form */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:write');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await request.json();
  const { label, type, widgetType, required, options, widgetConfig } = body;

  if (!label || !type) return NextResponse.json({ error: 'Label and type are required' }, { status: 400 });

  const form = await db.form.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const schema = form.schemaJson ? JSON.parse(form.schemaJson) : { version: 1, fields: [] };
  const fieldId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newField = {
    id: fieldId,
    label,
    type,
    widgetType: widgetType || undefined,
    required: required || false,
    options: options || undefined,
    widgetConfig: widgetConfig || {},
    stepId: schema.steps?.[0]?.id || 'step_1',
    width: 'full',
  };

  schema.fields = [...(schema.fields || []), newField];

  await db.form.update({
    where: { id },
    data: {
      schemaJson: JSON.stringify(schema),
      fieldsJson: JSON.stringify(schema.fields),
    },
  });

  return NextResponse.json({ fieldId, formId: form.id });
}
