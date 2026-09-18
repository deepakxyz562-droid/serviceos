import { NextRequest, NextResponse } from 'next/server';
import { generateTemplateFromPrompt } from '@/lib/forms/templates/generators/ai-template-generator';
import type { TemplateIndustryId } from '@/lib/forms/templates';

/**
 * POST /api/templates/generate — AI-generate a template on-demand.
 *
 * Body: { prompt: string, industry?: TemplateIndustryId }
 *
 * This is the "unlimited" layer of the template strategy. When the curated
 * catalog + variation engine don't have a good match, this endpoint calls
 * the LLM (via the existing /api/forms/ai/generate route) to produce a
 * custom template, validates it, and wraps it in a FormTemplate.
 *
 * Generated templates are NOT persisted by default. Release 3.3's usage
 * tracking will auto-persist after ≥3 uses of the same prompt pattern.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, industry } = body as { prompt?: string; industry?: TemplateIndustryId };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'A prompt of at least 3 characters is required.' },
        { status: 400 },
      );
    }

    const result = await generateTemplateFromPrompt({ prompt: prompt.trim(), industry });

    if (result.error || !result.template) {
      return NextResponse.json(
        {
          error: result.error || 'AI generation failed to produce a valid template.',
          validation: result.validation,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      template: result.template,
      validation: result.validation,
      source: 'ai_generated',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'AI generation failed', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
