import { NextRequest, NextResponse } from 'next/server';
import { searchTemplatesPaginated } from '@/lib/forms/templates';

/**
 * GET /api/templates/search — search the 20,000+ template registry.
 *
 * Query params:
 *   q        — search query (free text)
 *   category — filter by TemplateCategoryId
 *   industry — filter by TemplateIndustryId
 *   sort     — featured | popular | rating | recent
 *   page     — 1-indexed page number (default 1)
 *   pageSize — items per page (default 24, max 100)
 *
 * Returns: { templates: FormTemplate[], total: number, page: number, pageSize: number, totalPages: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const industry = searchParams.get('industry') || undefined;
  const sort = (searchParams.get('sort') as any) || 'featured';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '24', 10) || 24), 100);

  const data = searchTemplatesPaginated({
    query: q,
    category,
    industry,
    sort,
    page,
    pageSize,
  });

  return NextResponse.json(data);
}
