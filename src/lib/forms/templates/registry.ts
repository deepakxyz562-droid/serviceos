/**
 * Template Registry — the single access point for all template data.
 *
 * This module exposes BOTH a synchronous in-memory registry (for the ~50
 * curated templates shipped in the bundle) AND an async search interface
 * (designed to be swapped for a DB-backed implementation in Release 3
 * without changing call sites).
 *
 * Call sites should prefer the async `searchTemplates()` / `getTemplate()`
 * helpers. The sync `getTemplateSync()` is only for cases where the bundle
 * in-memory templates are sufficient (e.g. the builder's palette tab).
 *
 * Architecture:
 *   - `registerTemplate(t)` adds a template to the in-memory store.
 *   - `canonical/*.ts` files each call `registerTemplate` at import time.
 *   - `index.ts` imports all canonical files, populating the store.
 *   - Release 3 will add a DB-backed async backend that delegates to the same
 *     interface — call sites won't change.
 */

import type {
  FormTemplate,
  TemplateSearchQuery,
  TemplateSearchResult,
  TemplateCategoryId,
  TemplateIndustryId,
  TemplateUseCaseId,
} from './types';
import { resolveIndustryFromText } from './taxonomy/industries';

// ─── In-memory store ────────────────────────────────────────────────────────

const REGISTRY = new Map<string, FormTemplate>();

/**
 * Register a template. Called by each `canonical/*.ts` file at import time.
 * Idempotent — re-registering the same id overwrites (useful for HMR).
 */
export function registerTemplate(template: FormTemplate): void {
  REGISTRY.set(template.id, template);
}

/**
 * Register multiple templates at once (convenience for batch files).
 */
export function registerTemplates(templates: FormTemplate[]): void {
  for (const t of templates) registerTemplate(t);
}

import { synthesizeTemplate, generateTemplateBatch } from './generators/mass-template-synthesizer';
import { TEMPLATE_INDUSTRIES } from './taxonomy/industries';
import { TEMPLATE_CATEGORIES } from './taxonomy/categories';

let isCatalogPopulated = false;

function ensureCatalogPopulated() {
  if (isCatalogPopulated) return;
  isCatalogPopulated = true;
  try {
    const batch = generateTemplateBatch(1000);
    for (const t of batch) {
      if (!REGISTRY.has(t.id)) {
        REGISTRY.set(t.id, t);
      }
    }
  } catch (e) {
    console.error('[registry] Failed to populate mass templates:', e);
  }
}

/**
 * Get ALL registered templates (sorted by name). Prefer `searchTemplates`
 * for any user-facing call — this is mainly for tooling/tests.
 */
export function getAllTemplates(): FormTemplate[] {
  ensureCatalogPopulated();
  return Array.from(REGISTRY.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Synchronous lookup by id. Returns curated template or synthesizes on-demand.
 */
export function getTemplateSync(id: string): FormTemplate | undefined {
  if (REGISTRY.has(id)) {
    return REGISTRY.get(id);
  }
  ensureCatalogPopulated();
  if (REGISTRY.has(id)) {
    return REGISTRY.get(id);
  }

  // Attempt dynamic synthesis for long-tail template slug
  const parts = id.split('-');
  const matchedIndustry = TEMPLATE_INDUSTRIES.find((ind) => id.startsWith(ind.id));
  
  if (matchedIndustry) {
    const remainder = id.substring(matchedIndustry.id.length + 1);
    const matchedCategory =
      TEMPLATE_CATEGORIES.find((c) => remainder.includes(c.id) || c.subcategories.some((s) => remainder.includes(s.id))) ||
      TEMPLATE_CATEGORIES[0];

    const synthesized = synthesizeTemplate(matchedCategory.id as any, matchedIndustry.id as any);
    synthesized.id = id; // Match requested slug
    REGISTRY.set(id, synthesized);
    return synthesized;
  }

  return undefined;
}

/**
 * Async lookup by id. Checks in-memory registry, then falls back to dynamic synthesis.
 */
export async function getTemplate(id: string): Promise<FormTemplate | undefined> {
  return getTemplateSync(id);
}

// ─── Search ────────────────────────────────────────────────────────────────

/**
 * Search templates with multi-dimensional filtering + relevance scoring.
 *
 * Scoring (when `query` is present):
 *   +100  exact id match
 *   +60   exact name match
 *   +40   name contains query
 *   +30   shortDescription contains query
 *   +20   description contains query
 *   +15   tag match
 *   +10   industry alias match
 *   +5    category/useCase match
 *
 * Results are sorted by score (desc) when query is present, else by the
 * requested `sort` (default: popular by usageCount).
 */
export async function searchTemplates(
  query: TemplateSearchQuery,
): Promise<TemplateSearchResult[]> {
  ensureCatalogPopulated();
  let candidates = Array.from(REGISTRY.values());

  // Filter by status
  const publishedOnly = query.publishedOnly !== false; // default true
  if (publishedOnly) {
    candidates = candidates.filter((t) => t.isPublic && t.status === 'published');
  }

  // Filter by category
  if (query.category) {
    candidates = candidates.filter((t) => t.categories.includes(query.category as TemplateCategoryId));
  }

  // Filter by industry
  if (query.industry) {
    candidates = candidates.filter((t) => t.industries.includes(query.industry as TemplateIndustryId));
  }

  // Filter by use case
  if (query.useCase) {
    candidates = candidates.filter((t) => t.useCases.includes(query.useCase as TemplateUseCaseId));
  }

  // Filter by tags (AND — all tags must match)
  if (query.tags && query.tags.length > 0) {
    candidates = candidates.filter((t) =>
      query.tags!.every((tag) => t.tags.includes(tag.toLowerCase())),
    );
  }

  // Score by query
  const q = (query.query || '').toLowerCase().trim();
  let results: TemplateSearchResult[];

  if (q) {
    results = candidates
      .map((template) => {
        const { score, matchedFields } = scoreTemplate(template, q);
        return { template, score, matchedFields };
      })
      .filter((r) => r.score > 0);
  } else {
    // No query — assign score 0 and rely on sort
    results = candidates.map((template) => ({
      template,
      score: 0,
      matchedFields: [],
    }));
  }

  // Sort
  const sort = query.sort || (q ? 'relevance' : 'popular');
  sortResults(results, sort);

  // Paginate
  const offset = query.offset || 0;
  const limit = query.limit || 50;
  return results.slice(offset, offset + limit);
}

// ─── Convenience accessors ─────────────────────────────────────────────────

/** Get templates by category (published only by default). */
export async function getTemplatesByCategory(
  category: TemplateCategoryId,
  opts?: { limit?: number; publishedOnly?: boolean },
): Promise<FormTemplate[]> {
  const results = await searchTemplates({
    category,
    publishedOnly: opts?.publishedOnly,
    sort: 'popular',
    limit: opts?.limit || 50,
  });
  return results.map((r) => r.template);
}

/** Get templates by industry. */
export async function getTemplatesByIndustry(
  industry: TemplateIndustryId,
  opts?: { limit?: number; publishedOnly?: boolean },
): Promise<FormTemplate[]> {
  const results = await searchTemplates({
    industry,
    publishedOnly: opts?.publishedOnly,
    sort: 'popular',
    limit: opts?.limit || 50,
  });
  return results.map((r) => r.template);
}

/** Get featured templates (for the homepage / dashboard). */
export async function getFeaturedTemplates(limit = 8): Promise<FormTemplate[]> {
  const all = Array.from(REGISTRY.values()).filter(
    (t) => t.isFeatured && t.isPublic && t.status === 'published',
  );
  return all
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
}

/** Count of published templates (for "500+ templates" marketing copy). */
export function getPublishedTemplateCount(): number {
  let n = 0;
  for (const t of REGISTRY.values()) {
    if (t.isPublic && t.status === 'published') n++;
  }
  return n;
}

// ─── Internal scoring + sorting ────────────────────────────────────────────

function scoreTemplate(template: FormTemplate, q: string): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];

  // Exact id match
  if (template.id === q) {
    score += 100;
    matchedFields.push('id');
  }

  // Name matches
  const nameLower = template.name.toLowerCase();
  if (nameLower === q) {
    score += 60;
    matchedFields.push('name-exact');
  } else if (nameLower.includes(q)) {
    score += 40;
    matchedFields.push('name-partial');
  }

  // Short description
  const shortDescLower = template.shortDescription.toLowerCase();
  if (shortDescLower.includes(q)) {
    score += 30;
    matchedFields.push('shortDescription');
  }

  // Long description
  const descLower = (template.description || '').toLowerCase();
  if (descLower.includes(q)) {
    score += 20;
    matchedFields.push('description');
  }

  // Tag matches (each matching tag adds 15)
  for (const tag of template.tags) {
    if (tag.toLowerCase().includes(q) || q.includes(tag.toLowerCase())) {
      score += 15;
      matchedFields.push(`tag:${tag}`);
    }
  }

  // Industry alias match (e.g. "dentist" → dental industry)
  const industryMatch = resolveIndustryFromText(q);
  if (industryMatch && template.industries.includes(industryMatch as TemplateIndustryId)) {
    score += 10;
    matchedFields.push(`industry:${industryMatch}`);
  }

  // Category/useCase keyword match
  for (const cat of template.categories) {
    if (q.includes(cat) || cat.includes(q)) {
      score += 5;
      matchedFields.push(`category:${cat}`);
    }
  }

  // Multi-word: check if any word in the query matches
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    if (nameLower.includes(word) && !matchedFields.includes('name-partial')) {
      score += 8;
      matchedFields.push(`name-word:${word}`);
    }
    if (shortDescLower.includes(word)) {
      score += 4;
      matchedFields.push(`shortDesc-word:${word}`);
    }
  }

  return { score, matchedFields };
}

function sortResults(results: TemplateSearchResult[], sort: string): void {
  switch (sort) {
    case 'relevance':
      results.sort((a, b) => b.score - a.score);
      break;
    case 'popular':
      results.sort((a, b) => (b.template.usageCount || 0) - (a.template.usageCount || 0));
      break;
    case 'recent':
      results.sort(
        (a, b) =>
          new Date(b.template.updatedAt || b.template.createdAt || 0).getTime() -
          new Date(a.template.updatedAt || a.template.createdAt || 0).getTime(),
      );
      break;
    case 'featured':
      results.sort((a, b) => {
        if (a.template.isFeatured !== b.template.isFeatured) {
          return a.template.isFeatured ? -1 : 1;
        }
        return (b.template.usageCount || 0) - (a.template.usageCount || 0);
      });
      break;
    case 'rating':
      results.sort((a, b) => (b.template.ratingAverage || 0) - (a.template.ratingAverage || 0));
      break;
    default:
      results.sort((a, b) => b.score - a.score);
  }
}
