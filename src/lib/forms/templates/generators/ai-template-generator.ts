/**
 * AI Template Generator — generates form templates on-demand.
 *
 * Architecture:
 *   1. User searches for a template (e.g. "solar installation quote form")
 *   2. The template search engine checks curated + generated variants
 *   3. If NO good match found, this generator kicks in:
 *      a. Call the LLM via /api/forms/ai/generate (existing route)
 *      b. Validate the output with the schema validator (T1.4)
 *      c. Wrap in a FormTemplate with proper classification
 *      d. Return for preview + use
 *
 * This is the "unlimited" layer of the template strategy:
 *   51 curated + 1,600 variations + AI on-demand = anything is possible
 *
 * Generated templates can be persisted after ≥3 uses (Release 3.3 hook).
 */
import type { FormTemplate, TemplateIndustryId, TemplateCategoryId, TemplateUseCaseId, TemplateAudienceId } from '../types';
import type { FormSchema } from '../../form-schema-types';
import { resolveIndustryFromText } from '../taxonomy/industries';
import { validateTemplate } from '../validation';

export interface GenerateTemplateParams {
  /** The user's search prompt (e.g. "solar panel installation quote form"). */
  prompt: string;
  /** Optional industry hint (if known from filters). */
  industry?: TemplateIndustryId;
}

export interface GenerateTemplateResult {
  template: FormTemplate | null;
  validation: ReturnType<typeof validateTemplate> | null;
  source: 'ai_generated';
  error?: string;
}

/**
 * Generate a form template from a natural-language prompt.
 *
 * Calls the existing /api/forms/ai/generate endpoint (LLM-backed) and wraps
 * the result in a FormTemplate with auto-detected classification.
 *
 * This function is SAFE to call from the client — it uses fetch() to hit
 * the API route, which handles the actual LLM call server-side.
 */
export async function generateTemplateFromPrompt(
  params: GenerateTemplateParams,
): Promise<GenerateTemplateResult> {
  const { prompt, industry } = params;

  try {
    // Call the existing LLM-backed generation route
    const res = await fetch('/api/forms/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        industry: industry || resolveIndustryFromText(prompt),
        style: 'card',
      }),
    });

    if (!res.ok) {
      throw new Error(`AI generation failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const schema: FormSchema = data.schema || data;

    // Validate the generated schema
    const template = wrapAsTemplate(schema, prompt, industry);
    const validation = validateTemplate(template);

    if (!validation.valid) {
      console.warn('[ai-template-generator] Schema validation failed:', validation.schemaErrors);
      return {
        template: null,
        validation,
        source: 'ai_generated',
        error: `Generated schema has ${validation.schemaErrors.length} errors`,
      };
    }

    return {
      template,
      validation,
      source: 'ai_generated',
    };
  } catch (error) {
    return {
      template: null,
      validation: null,
      source: 'ai_generated',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wrap a generated FormSchema in a FormTemplate with auto-detected classification.
 */
function wrapAsTemplate(
  schema: FormSchema,
  prompt: string,
  hintIndustry?: TemplateIndustryId,
): FormTemplate {
  const detectedIndustry = hintIndustry || resolveIndustryFromText(prompt) || 'general';
  const promptLower = prompt.toLowerCase();

  // Detect category from prompt keywords
  const categories: TemplateCategoryId[] = [];
  if (/contact|inquiry|message/.test(promptLower)) categories.push('contact');
  if (/book|appointment|schedule|reserve/.test(promptLower)) categories.push('booking');
  if (/order|buy|purchase/.test(promptLower)) categories.push('order');
  if (/survey|feedback|satisfaction|nps/.test(promptLower)) categories.push('survey');
  if (/quote|estimate|pricing/.test(promptLower)) categories.push('quote');
  if (/register|signup|sign up/.test(promptLower)) categories.push('registration');
  if (/apply|application/.test(promptLower)) categories.push('application');
  if (/intake|onboard/.test(promptLower)) categories.push('intake');
  if (/inspect|inspection/.test(promptLower)) categories.push('inspection');
  if (/consent|waiver|agreement/.test(promptLower)) categories.push('consent');
  if (/donat|donation/.test(promptLower)) categories.push('donation');
  if (/event|rsvp/.test(promptLower)) categories.push('event');
  if (categories.length === 0) categories.push('contact'); // fallback

  // Detect use case
  const useCases: TemplateUseCaseId[] = [];
  if (/lead|inquiry/.test(promptLower)) useCases.push('lead_generation');
  if (/quote|estimate/.test(promptLower)) useCases.push('quote_request');
  if (/appointment|booking/.test(promptLower)) useCases.push('appointment_booking');
  if (/service|repair|maintenance/.test(promptLower)) useCases.push('service_request');
  if (/intake|onboard/.test(promptLower)) useCases.push('intake');
  if (/feedback|survey/.test(promptLower)) useCases.push('customer_feedback');
  if (useCases.length === 0) useCases.push('lead_generation');

  // Detect audience
  const audiences: TemplateAudienceId[] = [];
  if (/business|company|enterprise|b2b/.test(promptLower)) audiences.push('b2b');
  if (/customer|consumer|personal|home/.test(promptLower)) audiences.push('b2c');
  if (audiences.length === 0) audiences.push('b2c');

  // Generate id from prompt (kebab-case)
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');

  // Extract keywords for SEO
  const keywords = promptLower
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);

  return {
    id: `ai-${slug}-${Date.now().toString(36)}`,
    name: toTitleCase(prompt.slice(0, 80)),
    shortDescription: `AI-generated form template for: ${prompt}`,
    description: `This template was generated by AI based on the prompt: "${prompt}". Customize the fields, theme, and settings to fit your needs.`,
    schema,
    categories,
    industries: [detectedIndustry] as TemplateIndustryId[],
    useCases,
    audiences,
    tags: ['ai-generated', ...keywords],
    source: 'ai_generated',
    status: 'published', // available for use, but not featured
    isFeatured: false,
    isPublic: true,
    usageCount: 0,
    viewCount: 0,
    cloneCount: 0,
    seo: {
      seoTitle: `${toTitleCase(prompt.slice(0, 50))} — AI Generated Template`,
      seoDescription: `AI-generated form template for ${prompt}. Customize and launch in minutes.`,
      seoKeywords: ['ai-generated', ...keywords],
      faq: [
        {
          question: `What is this ${prompt.toLowerCase()} template?`,
          answer: `This form was generated by AI based on your search for "${prompt}". It includes fields the AI determined are relevant to your use case. You can customize every field in the builder.`,
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 80);
}
