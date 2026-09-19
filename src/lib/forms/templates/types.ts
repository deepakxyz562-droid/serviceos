/**
 * Template Types — multi-dimensional classification model.
 *
 * Architecture (Jotform-parity): a template is NOT assigned to one category.
 * It is discoverable through multiple paths:
 *
 *   Template
 *    ├── categories[]      (Contact, Booking, Survey, Order, ...)
 *    ├── industries[]      (Dental, HVAC, Plumbing, Real Estate, ...)
 *    ├── useCases[]        (Lead Generation, Onboarding, Quote Request, ...)
 *    ├── audiences[]       (B2B, B2C, Internal, Nonprofit, ...)
 *    ├── tags[]            (free-text descriptors)
 *    └── fieldTypes[]      (the FormFieldType values used by this template)
 *
 * This file is the single source of truth for the template domain model.
 * It is imported by the registry, generators, validators, and UI.
 *
 * Design notes:
 *   - `schema` holds the actual FormSchema (fields, steps, rules, theme).
 *   - `source` distinguishes hand-curated templates from AI-generated ones
 *     and from community submissions (Release 5).
 *   - `status` controls visibility: only PUBLISHED templates are public.
 *   - All classification arrays use string IDs that map to the taxonomy
 *     constants in `taxonomy/*.ts` — this keeps them queryable without
 *     duplicating label text.
 */
import type { FormSchema, FormField } from '../../form-schema-types';

// ─── Taxonomy value types (string unions for type-safety) ──────────────────

export type TemplateCategoryId =
  | 'contact'
  | 'registration'
  | 'application'
  | 'booking'
  | 'appointment'
  | 'order'
  | 'payment'
  | 'survey'
  | 'questionnaire'
  | 'feedback'
  | 'lead_generation'
  | 'quote'
  | 'estimate'
  | 'request'
  | 'inspection'
  | 'checklist'
  | 'report'
  | 'consent'
  | 'waiver'
  | 'onboarding'
  | 'evaluation'
  | 'assessment'
  | 'event'
  | 'rsvp'
  | 'membership'
  | 'donation'
  | 'employment'
  | 'education'
  | 'healthcare'
  | 'real_estate'
  | 'customer_service'
  | 'marketing'
  | 'finance'
  | 'legal'
  | 'internal_operations';

export type TemplateIndustryId =
  | 'general'
  | 'healthcare'
  | 'dental'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'construction'
  | 'real_estate'
  | 'legal'
  | 'accounting'
  | 'insurance'
  | 'automotive'
  | 'restaurant'
  | 'hospitality'
  | 'beauty'
  | 'salon'
  | 'fitness'
  | 'education'
  | 'nonprofit'
  | 'church'
  | 'marketing'
  | 'agency'
  | 'consulting'
  | 'saas'
  | 'technology'
  | 'ecommerce'
  | 'retail'
  | 'manufacturing'
  | 'logistics'
  | 'transportation'
  | 'cleaning'
  | 'home_services'
  | 'photography'
  | 'events'
  | 'travel'
  | 'veterinary'
  | 'pet_services'
  | 'financial_services'
  | 'human_resources'
  | 'agriculture'
  | 'solar'
  | 'roofing'
  | 'landscaping'
  | 'pest_control'
  | 'security'
  | 'music'
  | 'wedding'
  | 'government';

export type TemplateUseCaseId =
  | 'lead_generation'
  | 'customer_onboarding'
  | 'internal_request'
  | 'quote_request'
  | 'employee_application'
  | 'customer_feedback'
  | 'event_registration'
  | 'appointment_booking'
  | 'service_request'
  | 'intake'
  | 'assessment'
  | 'compliance';

export type TemplateAudienceId =
  | 'b2b'
  | 'b2c'
  | 'internal'
  | 'nonprofit'
  | 'government'
  | 'education'
  | 'consumer';

export type TemplateSource = 'curated' | 'ai_generated' | 'synthesized' | 'community';

export type TemplateStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived';

// ─── Template metadata interfaces ───────────────────────────────────────────

/**
 * SEO metadata for a template. Used on the public `/templates/[slug]` page
 * (Release 2) to generate per-page <title>, meta description, OG tags, and
 * the FAQ section.
 */
export interface TemplateSeoMeta {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  /** FAQ entries shown on the template detail page. */
  faq?: Array<{ question: string; answer: string }>;
}

/**
 * A single canonical template definition.
 *
 * This is the in-memory shape used by the registry and generators. The
 * Prisma `FormTemplate` model (T1.3) stores a serialized version of this
 * in `schemaJson` + the classification arrays as separate columns/JSON.
 */
export interface FormTemplate {
  /** Stable unique ID, kebab-case. Used as the URL slug. */
  id: string;
  /** Human-readable display name, e.g. "Dental Patient Intake Form". */
  name: string;
  /** One-line summary for cards and search results. */
  shortDescription: string;
  /** Longer description for the detail page (supports plain text). */
  description?: string;

  /** The actual form schema — fields, steps, rules, theme, settings. */
  schema: FormSchema;

  // ─── Multi-dimensional classification ──────────────────────────────────
  /** Primary categories this template belongs to (e.g. ['healthcare', 'consent']). */
  categories: TemplateCategoryId[];
  /** Industries this template is relevant to (e.g. ['dental', 'healthcare']). */
  industries: TemplateIndustryId[];
  /** Use cases (e.g. ['intake', 'lead_generation']). */
  useCases: TemplateUseCaseId[];
  /** Target audiences (e.g. ['b2c']). */
  audiences: TemplateAudienceId[];
  /** Free-text tags for search (e.g. ['hipaa', 'insurance', 'appointment']). */
  tags: string[];

  // ─── Universal Project Type (Forms, AI Agents, AI Apps) ───────────────
  /** Template modality: 'form' (default), 'agent' (interactive persona), or 'app' (turnkey PWA). */
  templateType?: 'form' | 'agent' | 'app';

  /** Metadata specific to AI Agent templates */
  agentConfig?: {
    personaTitle: string;
    avatarIcon?: string;
    voiceTone: 'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic';
    greetingMessage: string;
    systemPrompt: string;
    suggestedPrompts: string[];
    knowledgeTopics: string[];
    actionForms?: string[];
  };

  /** Metadata specific to AI App templates */
  appConfig?: {
    appIcon: string;
    primaryColor: string;
    navigationTabs: Array<{ id: string; label: string; icon: string }>;
    bundledForms: Array<{ title: string; fieldCount: number; type: string }>;
    pinnedAgentName?: string;
    features: string[];
  };

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  source: TemplateSource;
  status: TemplateStatus;
  isFeatured: boolean;
  isPublic: boolean;

  // ─── Discovery / analytics (populated at runtime, not in source files) ──
  usageCount?: number;
  viewCount?: number;
  cloneCount?: number;
  ratingAverage?: number;
  ratingCount?: number;

  // ─── SEO ────────────────────────────────────────────────────────────────
  seo: TemplateSeoMeta;

  /** For community templates (Release 5). null for curated/AI. */
  authorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Registry helper types ─────────────────────────────────────────────────

export interface TemplateSearchQuery {
  query?: string;
  category?: TemplateCategoryId;
  industry?: TemplateIndustryId;
  useCase?: TemplateUseCaseId;
  audience?: TemplateAudienceId;
  tags?: string[];
  templateType?: 'form' | 'agent' | 'app' | 'all';
  /** Only return templates with status 'published'. Defaults to true. */
  publishedOnly?: boolean;
  /** Sort key. Defaults to 'relevance' when a query is present, else 'popular'. */
  sort?: 'relevance' | 'popular' | 'recent' | 'featured' | 'rating';
  limit?: number;
  offset?: number;
}

export interface TemplateSearchResult {
  template: FormTemplate;
  /** 0-1 relevance score for the query that produced this result. */
  score: number;
  /** Why this template matched (which field hit the query). */
  matchedFields: string[];
}

// ─── Convenience derived types ─────────────────────────────────────────────

/** Fields extracted from a template's schema, flattened. */
export function getTemplateFields(template: FormTemplate): FormField[] {
  return template.schema.fields;
}

/** Count of fields in a template (shown on cards). */
export function getTemplateFieldCount(template: FormTemplate): number {
  return template.schema.fields.length;
}

/** Count of steps/pages in a template (multi-step forms). */
export function getTemplateStepCount(template: FormTemplate): number {
  return template.schema.steps.length;
}
