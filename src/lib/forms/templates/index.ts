/**
 * Template Library — public entry point.
 *
 * Importing this module populates the in-memory registry with all curated
 * canonical templates. Call sites should import from HERE, not from
 * individual canonical/*.ts files:
 *
 *   import { searchTemplates, getTemplate, getFeaturedTemplates } from '@/lib/forms/templates';
 *
 * Architecture:
 *   - types.ts        → FormTemplate interface + taxonomy unions
 *   - taxonomy/*.ts   → category/industry/useCase/audience/tag definitions
 *   - canonical/*.ts  → 50 curated template files (T1.2)
 *   - registry.ts     → in-memory store + search engine
 *   - generators/*.ts → industry/useCase variation engine (Release 3)
 *   - validation/*.ts → schema + quality + seo validators (T1.4)
 *
 * The registry's search interface is async so Release 3 can swap the
 * in-memory Map for a database query without changing call sites.
 */

// Re-export all types
export * from './types';

// Re-export taxonomy
export * from './taxonomy/categories';
export * from './taxonomy/industries';
export * from './taxonomy/use-cases';
export * from './taxonomy/audiences';
export * from './taxonomy/tags';

// Re-export registry (the primary access point)
export {
  registerTemplate,
  registerTemplates,
  getAllTemplates,
  getTemplateSync,
  getTemplate,
  searchTemplates,
  searchTemplatesPaginated,
  getTemplatesByCategory,
  getTemplatesByIndustry,
  getFeaturedTemplates,
  getPublishedTemplateCount,
  getCatalogIndex,
} from './registry';
export type { PaginatedTemplateSearchResult, TemplateIndexEntry } from './registry';

// ─── Import all canonical templates (populates the registry) ────────────────
// Each canonical file calls registerTemplate() at module load time.
// The 50 curated templates are split across 3 domain files + the original
// placeholder contact-form. Importing them here (rather than lazily) ensures
// the registry is fully populated before any search runs. For the public
// SEO pages (Release 2), the server will fetch from the DB instead — but
// for the in-builder palette, we need the curated set available synchronously.

import './canonical/_placeholder'; // contact-form (foundational)
import './canonical/business-templates'; // 17 business/general templates
import './canonical/healthcare-home-templates'; // 17 healthcare + home services
import './canonical/industry-templates'; // 16 industry templates
import './canonical/order-payment-templates'; // Order, payment, donation templates
import './canonical/registration-application-templates'; // Job application, rental, event registration
import './canonical/inspection-checklist-templates'; // Multi-point inspection, HVAC tuneup
import './canonical/waiver-consent-templates'; // Liability waivers, media release
import './canonical/survey-feedback-templates'; // CSAT, performance review, NPS
import './canonical/split-media-templates'; // 2-Part Split Hero (Elementor-Style)

