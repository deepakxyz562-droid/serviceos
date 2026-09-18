/**
 * T1.1 smoke test — verifies the template registry, taxonomy, and search
 * engine work end-to-end with the placeholder contact form.
 *
 * T1.4 will expand this into a full validation suite (schema validator,
 * quality validator, etc.). For now this is a basic sanity check.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  getTemplate,
  getTemplateSync,
  searchTemplates,
  getFeaturedTemplates,
  getPublishedTemplateCount,
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  TEMPLATE_USE_CASES,
  TEMPLATE_AUDIENCES,
  resolveIndustryFromText,
  getCategoryLabel,
  getIndustryLabel,
} from './index';
import {
  validateAllTemplates,
  validateTemplateSchema,
  scoreTemplateQuality,
  scoreTemplateSeo,
} from './validation';
import {
  generateIndustryVariant,
  generateAllVariants,
  getPossibleVariantCount,
} from './generators/industry';
import {
  generateUseCaseVariant,
  generateAudienceVariant,
} from './generators/use-case-audience';

describe('T1.1 — Template registry foundation', () => {
  it('has taxonomy constants populated', () => {
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(TEMPLATE_INDUSTRIES.length).toBeGreaterThanOrEqual(40);
    expect(TEMPLATE_USE_CASES.length).toBeGreaterThanOrEqual(10);
    expect(TEMPLATE_AUDIENCES.length).toBeGreaterThanOrEqual(5);
  });

  it('lookup helpers return labels', () => {
    expect(getCategoryLabel('contact')).toBe('Contact Forms');
    expect(getIndustryLabel('dental')).toBe('Dental');
    expect(getIndustryLabel('unknown_id')).toBe('unknown_id'); // fallback
  });

  it('resolveIndustryFromText maps aliases to ids', () => {
    expect(resolveIndustryFromText('dentist')).toBe('dental');
    expect(resolveIndustryFromText('HVAC')).toBe('hvac');
    expect(resolveIndustryFromText('plumber')).toBe('plumbing');
    expect(resolveIndustryFromText('nonsense')).toBeUndefined();
  });

  it('placeholder contact form is registered', async () => {
    const t = await getTemplate('contact-form');
    expect(t).toBeDefined();
    expect(t?.name).toBe('Contact Form');
    expect(t?.categories).toContain('contact');
    expect(t?.status).toBe('published');
    expect(t?.isPublic).toBe(true);
  });

  it('getTemplateSync finds the contact form synchronously', () => {
    const t = getTemplateSync('contact-form');
    expect(t).toBeDefined();
    expect(t?.id).toBe('contact-form');
  });

  it('searchTemplates returns the contact form for "contact" query', async () => {
    const results = await searchTemplates({ query: 'contact' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe('contact-form');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].matchedFields.length).toBeGreaterThan(0);
  });

  it('searchTemplates filters by category', async () => {
    const results = await searchTemplates({ category: 'contact' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.template.categories.includes('contact' as never))).toBe(true);
  });

  it('searchTemplates filters by industry', async () => {
    const results = await searchTemplates({ industry: 'general' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('searchTemplates with no query returns all published (sorted popular)', async () => {
    const results = await searchTemplates({});
    expect(results.length).toBeGreaterThan(0);
    // No query → score 0 for all
    expect(results[0].score).toBe(0);
  });

  it('getFeaturedTemplates returns featured templates', async () => {
    const featured = await getFeaturedTemplates(10);
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((t) => t.isFeatured)).toBe(true);
  });

  it('getPublishedTemplateCount returns a positive number', () => {
    expect(getPublishedTemplateCount()).toBeGreaterThan(0);
  });

  it('publishedOnly=true (default) excludes non-published templates', async () => {
    const results = await searchTemplates({});
    expect(results.every((r) => r.template.status === 'published')).toBe(true);
    expect(results.every((r) => r.template.isPublic)).toBe(true);
  });

  // ─── T1.2 — 50 canonical templates registered ───────────────────────────

  it('T1.2: has at least 50 curated templates registered', () => {
    const all = getAllTemplates();
    expect(all.length).toBeGreaterThanOrEqual(50);
  });

  it('T1.2: every template has a unique id (no duplicates)', () => {
    const all = getAllTemplates();
    const ids = all.map((t) => t.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate template IDs: ${dupes.join(', ')}`).toEqual([]);
  });

  it('T1.2: every template has at least 5 fields and a valid schema', () => {
    const all = getAllTemplates();
    for (const t of all) {
      expect(t.schema.fields.length, `${t.id} must have ≥5 fields`).toBeGreaterThanOrEqual(5);
      expect(t.schema.fields.every((f) => f.id && f.label && f.type)).toBe(true);
      // theme + settings are optional in the older schema shape (12 templates
      // added during the 20K expansion use a flat {fields} shape without
      // theme/settings). The validator catches these as warnings, not errors.
      if (t.schema.theme) {
        expect(t.schema.theme.primaryColor, `${t.id} theme.primaryColor`).toBeTruthy();
      }
      if (t.schema.settings) {
        expect(t.schema.settings.submitButtonText, `${t.id} settings.submitButtonText`).toBeTruthy();
      }
    }
  });

  it('T1.2: every template has multi-dimensional classification', () => {
    const all = getAllTemplates();
    for (const t of all) {
      expect(t.categories.length, `${t.id} needs ≥1 category`).toBeGreaterThanOrEqual(1);
      expect(t.industries.length, `${t.id} needs ≥1 industry`).toBeGreaterThanOrEqual(1);
      expect(t.useCases.length, `${t.id} needs ≥1 useCase`).toBeGreaterThanOrEqual(1);
      expect(t.audiences.length, `${t.id} needs ≥1 audience`).toBeGreaterThanOrEqual(1);
      expect(t.tags.length, `${t.id} needs ≥3 tags`).toBeGreaterThanOrEqual(3);
    }
  });

  it('T1.2: every template has SEO metadata', () => {
    const all = getAllTemplates();
    for (const t of all) {
      expect(t.seo.seoKeywords.length, `${t.id} needs ≥3 SEO keywords`).toBeGreaterThanOrEqual(3);
      expect(t.shortDescription.length, `${t.id} needs a shortDescription`).toBeGreaterThan(10);
    }
  });

  it('T1.2: has at least 10 featured templates', () => {
    const all = getAllTemplates();
    const featured = all.filter((t) => t.isFeatured);
    expect(featured.length).toBeGreaterThanOrEqual(10);
  });

  it('T1.2: search finds dental templates for "dental" query', async () => {
    const results = await searchTemplates({ query: 'dental' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.template.industries.includes('dental' as never))).toBe(true);
  });

  it('T1.2: search finds HVAC templates for "hvac" query', async () => {
    const results = await searchTemplates({ query: 'hvac' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('T1.2: search finds donation templates for "donation" query', async () => {
    const results = await searchTemplates({ query: 'donation' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe('donation-form');
  });

  // ─── T1.4 — Validation engine ──────────────────────────────────────────

  it('T1.4: every curated template passes schema validation (no errors)', () => {
    const all = getAllTemplates();
    const reports = validateAllTemplates(all);
    const failing = reports.filter((r) => !r.valid);
    expect(
      failing,
      `${failing.length} templates have schema errors: ${failing.map((r) => `${r.templateId} (${r.schemaErrors.length} errors)`).join(', ')}`,
    ).toEqual([]);
  });

  it('T1.4: every curated template is publishable (valid + quality ≥ 50 + seo ≥ 40)', () => {
    const all = getAllTemplates();
    const reports = validateAllTemplates(all);
    const unpublishable = reports.filter((r) => !r.publishable);
    expect(
      unpublishable,
      `${unpublishable.length} templates are not publishable: ${unpublishable.map((r) => `${r.templateId} (q=${r.qualityScore}, seo=${r.seoScore})`).join(', ')}`,
    ).toEqual([]);
  });

  it('T1.4: schema validator catches a malformed template', () => {
    const badTemplate = {
      id: 'BAD', // not kebab-case
      name: 'X', // too short
      shortDescription: 'short', // too short
      schema: { version: 1, steps: [], fields: [], rules: [], theme: {}, settings: {} },
      categories: [], industries: [], useCases: [], audiences: [], tags: [],
      source: 'curated', status: 'published', isPublic: true, isFeatured: false,
      seo: { seoKeywords: [] },
    } as never;
    const result = validateTemplateSchema(badTemplate);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.code === 'INVALID_ID_FORMAT')).toBe(true);
  });

  it('T1.4: quality validator scores a good template ≥ 50', () => {
    const contactForm = getTemplateSync('contact-form')!;
    const result = scoreTemplateQuality(contactForm);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('T1.4: SEO validator scores a good template ≥ 40', () => {
    const contactForm = getTemplateSync('contact-form')!;
    const result = scoreTemplateSeo(contactForm);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  // ─── T3.1+T3.2 — Variation engine ───────────────────────────────────────

  it('T3.1: industry generator produces a valid variant for dental', () => {
    const base = getTemplateSync('contact-form')!;
    const variant = generateIndustryVariant(base, 'dental' as never);
    expect(variant).not.toBeNull();
    expect(variant!.id).toBe('contact-form-dental');
    expect(variant!.name).toContain('Dental');
    expect(variant!.industries).toContain('dental');
    expect(variant!.schema.fields.length).toBeGreaterThan(base.schema.fields.length);
    expect(variant!.source).toBe('ai_generated');
    expect(variant!.isFeatured).toBe(false);
  });

  it('T3.1: industry generator returns null for industries without transforms', () => {
    const base = getTemplateSync('contact-form')!;
    // 'agriculture' has no transform — should return null
    const variant = generateIndustryVariant(base, 'agriculture' as never);
    expect(variant).toBeNull();
  });

  it('T3.1: generateAllVariants produces hundreds of combinations', () => {
    const all = getAllTemplates();
    const variants = generateAllVariants(all);
    const expected = getPossibleVariantCount(all.length);
    expect(variants.length).toBe(expected);
    expect(variants.length).toBeGreaterThan(100);
  });

  it('T3.2: use-case generator produces a valid variant', () => {
    const base = getTemplateSync('contact-form')!;
    const variant = generateUseCaseVariant(base, 'lead_generation' as never);
    expect(variant).not.toBeNull();
    expect(variant!.id).toBe('contact-form--lead-generation');
    expect(variant!.name).toContain('Lead Generation');
    expect(variant!.useCases).toContain('lead_generation');
  });

  it('T3.2: audience generator adapts labels for B2C', () => {
    const base = getTemplateSync('contact-form')!;
    const variant = generateAudienceVariant(base, 'b2c' as never);
    expect(variant).not.toBeNull();
    expect(variant!.audiences).toContain('b2c');
  });

  it('T3.2: audience generator adds company fields for B2B', () => {
    const base = getTemplateSync('contact-form')!;
    const variant = generateAudienceVariant(base, 'b2b' as never);
    expect(variant).not.toBeNull();
    const hasCompanyField = variant!.schema.fields.some((f: { id: string }) => f.id === 'company_name');
    expect(hasCompanyField).toBe(true);
  });

  // ─── T4.1 — AI template generator (unit test of wrapAsTemplate logic) ────

  it('T4.1: AI generator module loads and exports generateTemplateFromPrompt', async () => {
    const mod = await import('./generators/ai-template-generator');
    expect(typeof mod.generateTemplateFromPrompt).toBe('function');
  });

  it('T4.1: generateTemplateFromPrompt returns error result on fetch failure', async () => {
    const { generateTemplateFromPrompt } = await import('./generators/ai-template-generator');
    // Mock fetch to return a failure
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as never;
    const result = await generateTemplateFromPrompt({ prompt: 'test prompt' });
    expect(result.template).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.source).toBe('ai_generated');
    global.fetch = originalFetch;
  });
});
