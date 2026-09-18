import { NextRequest, NextResponse } from 'next/server';
import { searchTemplates, getAllTemplates } from '@/lib/forms/templates';
import { generateIndustryVariant } from '@/lib/forms/templates/generators/industry';
import type { TemplateIndustryId, TemplateUseCaseId, TemplateCategoryId } from '@/lib/forms/templates';

/**
 * GET /api/templates/search — search the template registry.
 *
 * Query params:
 *   q        — search query (free text)
 *   category — filter by TemplateCategoryId
 *   industry — filter by TemplateIndustryId
 *   useCase  — filter by TemplateUseCaseId
 *   tags     — comma-separated tags (AND match)
 *   sort     — relevance | popular | recent | featured | rating
 *   limit    — default 50, max 200
 *   offset   — default 0
 *   generate — if true and no curated match found, generate industry variants
 *               on-demand (Release 3.3 persistence still TBD)
 *
 * Returns: { results: TemplateSearchResult[], total: number, generated?: FormTemplate[] }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') as TemplateCategoryId | null;
  const industry = searchParams.get('industry') as TemplateIndustryId | null;
  const useCase = searchParams.get('useCase') as TemplateUseCaseId | null;
  const tagsParam = searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const sort = (searchParams.get('sort') as 'relevance' | 'popular' | 'recent' | 'featured' | 'rating' | null) || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;
  const shouldGenerate = searchParams.get('generate') === 'true';

  const results = await searchTemplates({
    query: q,
    category: category || undefined,
    industry: industry || undefined,
    useCase: useCase || undefined,
    tags,
    sort,
    limit,
    offset,
  });

  // If no curated results and generate=true, produce on-demand variants
  let generated: ReturnType<typeof generateIndustryVariant>[] = [];
  if (shouldGenerate && results.length === 0 && industry) {
    const allBases = getAllTemplates();
    // Generate variants for this industry across all base templates
    generated = allBases
      .map((base) => generateIndustryVariant(base, industry))
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .slice(0, 10); // cap at 10 generated variants

    // Score them against the query if present
    if (q) {
      const ql = q.toLowerCase();
      generated.sort((a, b) => {
        const aScore = (a.name.toLowerCase().includes(ql) ? 10 : 0) +
                       (a.shortDescription.toLowerCase().includes(ql) ? 5 : 0);
        const bScore = (b.name.toLowerCase().includes(ql) ? 10 : 0) +
                       (b.shortDescription.toLowerCase().includes(ql) ? 5 : 0);
        return bScore - aScore;
      });
    }
  }

  return NextResponse.json({
    results,
    total: results.length,
    generated: generated.length > 0 ? generated : undefined,
    query: { q, category, industry, useCase, tags, sort, limit, offset },
  });
}
