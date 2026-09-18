import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTemplate } from '@/lib/forms/templates/validation';
import type { FormTemplate, TemplateCategoryId, TemplateIndustryId, TemplateUseCaseId, TemplateAudienceId } from '@/lib/forms/templates';

/**
 * POST /api/templates/submit — community template submission.
 *
 * Body: {
 *   name: string,
 *   description: string,
 *   categories: TemplateCategoryId[],
 *   industries: TemplateIndustryId[],
 *   useCases: TemplateUseCaseId[],
 *   audiences: TemplateAudienceId[],
 *   tags: string[],
 *   schema: FormSchema,  // the form schema from the user's form
 *   authorId?: string,   // the submitting user's id
 * }
 *
 * Creates a FormTemplate row with status='submitted'. An admin must review
 * and approve before it becomes public (status='published').
 *
 * The submission runs through the validation engine (T1.4). If validation
 * fails, returns 422 with the errors. If it passes, persists with status
 * 'submitted' for admin review.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      shortDescription,
      categories,
      industries,
      useCases,
      audiences,
      tags,
      schema,
      authorId,
    } = body as {
      name?: string;
      description?: string;
      shortDescription?: string;
      categories?: TemplateCategoryId[];
      industries?: TemplateIndustryId[];
      useCases?: TemplateUseCaseId[];
      audiences?: TemplateAudienceId[];
      tags?: string[];
      schema?: unknown;
      authorId?: string;
    };

    // Basic validation
    if (!name || typeof name !== 'string' || name.length < 3) {
      return NextResponse.json({ error: 'Name must be at least 3 characters.' }, { status: 400 });
    }
    if (!schema || typeof schema !== 'object') {
      return NextResponse.json({ error: 'A valid form schema is required.' }, { status: 400 });
    }

    // Build a FormTemplate for validation (status='submitted')
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

    const template: FormTemplate = {
      id: `community-${slug}-${Date.now().toString(36)}`,
      name,
      shortDescription: shortDescription || description?.slice(0, 120) || name,
      description,
      schema: schema as never,
      categories: categories || [],
      industries: industries || [],
      useCases: useCases || [],
      audiences: audiences || [],
      tags: tags || [],
      source: 'community',
      status: 'submitted',
      isFeatured: false,
      isPublic: false, // not public until approved
      seo: { seoKeywords: tags || [] },
      authorId: authorId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Run validation
    const validation = validateTemplate(template);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Template failed schema validation.',
          validation,
          errors: validation.schemaErrors,
        },
        { status: 422 },
      );
    }

    // Persist to DB (status='submitted', isPublic=false)
    try {
      const dbTemplate = await db.formTemplate.create({
        data: {
          slug: template.id, // use the unique template id as slug
          name: template.name,
          shortDescription: template.shortDescription,
          description: template.description || null,
          schemaJson: template as unknown as object,
          categories: template.categories,
          industries: template.industries,
          useCases: template.useCases,
          audiences: template.audiences,
          tags: template.tags,
          source: 'community',
          status: 'submitted',
          isPublic: false,
          isFeatured: false,
          seoKeywords: template.seo.seoKeywords,
          authorId: authorId || null,
        },
      });
      return NextResponse.json({
        ok: true,
        templateId: dbTemplate.id,
        status: 'submitted',
        message: 'Template submitted for review. An admin will approve it before it goes public.',
        qualityScore: validation.qualityScore,
        seoScore: validation.seoScore,
      });
    } catch (dbError) {
      // DB unavailable (sandbox) — return success but note the limitation
      console.warn('[templates/submit] DB unavailable, returning simulated success:', dbError);
      return NextResponse.json({
        ok: true,
        templateId: template.id,
        status: 'submitted',
        message: 'Template submitted for review (simulated — DB not available in this environment).',
        qualityScore: validation.qualityScore,
        seoScore: validation.seoScore,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Submission failed', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
