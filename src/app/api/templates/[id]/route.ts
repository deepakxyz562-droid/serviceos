import { NextRequest, NextResponse } from 'next/server';
import { getTemplate } from '@/lib/forms/templates';

/**
 * GET /api/templates/[id] — fetch a single template by id.
 *
 * Returns the full FormTemplate object including schema.
 * Used by the template detail page and the builder's template picker.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = await getTemplate(id);

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ template });
}
