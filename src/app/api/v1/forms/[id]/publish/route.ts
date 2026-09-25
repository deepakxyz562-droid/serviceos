import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { db } from '@/lib/db';

/** POST /api/v1/forms/[id]/publish — publish form */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, errorResponse] = await requireApiKey(request, 'forms:publish');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const form = await db.form.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  await db.form.update({ where: { id }, data: { status: 'active' } });
  return NextResponse.json({ formId: form.id, status: 'active', url: `/form/${form.id}` });
}
