/**
 * Use-Case + Audience Transformation Generators.
 *
 * Takes a base template + a use-case or audience tag and produces a variant
 * adapted to that business purpose or target audience.
 *
 * Combined with the industry generator, this produces the full matrix:
 *   51 base × 12 industries × 12 use-cases × 7 audiences = 51,408 combinations
 *
 * In practice, most combinations don't make sense (e.g. "B2B Nonprofit Job
 * Application for Dental"). The search engine ranks by relevance, so only
 * sensible combinations surface to users.
 */

import type { FormTemplate, TemplateUseCaseId, TemplateAudienceId, TemplateIndustryId } from '../types';
import type { FormSchema } from '../../form-schema-types';
import { generateIndustryVariant } from './industry';

// ─── Use-case transforms ───────────────────────────────────────────────────

interface UseCaseTransform {
  /** Fields to inject based on the use case. */
  injectFields?: Array<Partial<{ id: string; label: string; type: string; required?: boolean; width?: string; options?: string[] }> & { id: string; label: string; type: string }>;
  /** Suffix to append to the template name. */
  nameSuffix: string;
  /** SEO keywords to add. */
  seoKeywords: string[];
  /** Submit button text override. */
  submitButtonText?: string;
}

const USE_CASE_TRANSFORMS: Record<TemplateUseCaseId, UseCaseTransform> = {
  lead_generation: {
    nameSuffix: 'for Lead Generation',
    injectFields: [
      { id: 'lead_source', label: 'How did you hear about us?', type: 'dropdown', required: false, width: 'half',
        options: ['Google Search', 'Social Media', 'Referral', 'Advertisement', 'Word of Mouth', 'Other'] },
      { id: 'best_time', label: 'Best Time to Contact', type: 'dropdown', required: false, width: 'half',
        options: ['Morning', 'Afternoon', 'Evening', 'Anytime'] },
    ],
    seoKeywords: ['lead generation', 'lead capture', 'sales lead', 'inquiry'],
  },
  customer_onboarding: {
    nameSuffix: '— Customer Onboarding',
    injectFields: [
      { id: 'company_name', label: 'Company Name', type: 'short_answer', required: false, width: 'half' },
      { id: 'role', label: 'Your Role/Title', type: 'short_answer', required: false, width: 'half' },
    ],
    submitButtonText: 'Complete Onboarding',
    seoKeywords: ['onboarding', 'customer setup', 'new customer', 'getting started'],
  },
  internal_request: {
    nameSuffix: '— Internal Request',
    injectFields: [
      { id: 'department', label: 'Your Department', type: 'dropdown', required: true, width: 'half',
        options: ['Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'IT', 'Other'] },
      { id: 'priority', label: 'Priority', type: 'dropdown', required: true, width: 'half',
        options: ['Low', 'Medium', 'High', 'Urgent'] },
    ],
    submitButtonText: 'Submit Request',
    seoKeywords: ['internal request', 'employee request', 'work request', 'internal form'],
  },
  quote_request: {
    nameSuffix: '— Quote Request',
    injectFields: [
      { id: 'project_timeline', label: 'Project Timeline', type: 'dropdown', required: false, width: 'half',
        options: ['ASAP', '1-2 weeks', '1 month', '2-3 months', 'Just exploring'] },
      { id: 'budget_range', label: 'Budget Range', type: 'dropdown', required: false, width: 'half',
        options: ['Under $500', '$500-$2k', '$2k-$5k', '$5k-$10k', 'Over $10k', 'Not sure'] },
    ],
    submitButtonText: 'Get My Quote',
    seoKeywords: ['quote', 'estimate', 'pricing', 'price quote'],
  },
  employee_application: {
    nameSuffix: '— Job Application',
    injectFields: [
      { id: 'position', label: 'Position Applied For', type: 'short_answer', required: true, width: 'half' },
      { id: 'experience', label: 'Years of Experience', type: 'dropdown', required: true, width: 'half',
        options: ['0-1 years', '2-4 years', '5-7 years', '8-10 years', '10+ years'] },
    ],
    submitButtonText: 'Submit Application',
    seoKeywords: ['job application', 'employment', 'career', 'hiring'],
  },
  customer_feedback: {
    nameSuffix: '— Feedback Form',
    injectFields: [
      { id: 'satisfaction', label: 'Overall Satisfaction', type: 'rating', required: true, width: 'full' },
      { id: 'recommend', label: 'Would you recommend us?', type: 'radio', required: true, width: 'full',
        options: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'] },
    ],
    submitButtonText: 'Submit Feedback',
    seoKeywords: ['feedback', 'review', 'satisfaction', 'rating'],
  },
  event_registration: {
    nameSuffix: '— Event Registration',
    injectFields: [
      { id: 'attendee_count', label: 'Number of Attendees', type: 'numerical', required: true, width: 'half' },
      { id: 'dietary_needs', label: 'Dietary Requirements', type: 'dropdown', required: false, width: 'half',
        options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Other'] },
    ],
    submitButtonText: 'Register Now',
    seoKeywords: ['event registration', 'event signup', 'rsvp', 'event booking'],
  },
  appointment_booking: {
    nameSuffix: '— Appointment Booking',
    injectFields: [
      { id: 'preferred_date', label: 'Preferred Date', type: 'date', required: true, width: 'half' },
      { id: 'preferred_time', label: 'Preferred Time', type: 'dropdown', required: true, width: 'half',
        options: ['Early Morning', 'Morning', 'Afternoon', 'Late Afternoon', 'Anytime'] },
    ],
    submitButtonText: 'Book Appointment',
    seoKeywords: ['appointment', 'booking', 'schedule', 'reservation'],
  },
  service_request: {
    nameSuffix: '— Service Request',
    injectFields: [
      { id: 'urgency', label: 'Urgency', type: 'dropdown', required: true, width: 'half',
        options: ['Emergency (within 24h)', 'This week', 'Next 2 weeks', 'Flexible'] },
      { id: 'preferred_date', label: 'Preferred Service Date', type: 'date', required: false, width: 'half' },
    ],
    submitButtonText: 'Request Service',
    seoKeywords: ['service request', 'service call', 'repair request', 'maintenance'],
  },
  intake: {
    nameSuffix: '— Intake Form',
    injectFields: [
      { id: 'referral_source', label: 'How did you find us?', type: 'dropdown', required: false, width: 'full',
        options: ['Google', 'Referral', 'Social Media', 'Insurance', 'Advertisement', 'Other'] },
    ],
    submitButtonText: 'Complete Intake',
    seoKeywords: ['intake', 'onboarding', 'new client', 'intake form'],
  },
  assessment: {
    nameSuffix: '— Assessment',
    injectFields: [
      { id: 'assessment_type', label: 'Assessment Type', type: 'dropdown', required: true, width: 'full',
        options: ['Skills Assessment', 'Eligibility Check', 'Pre-screening', 'Evaluation'] },
    ],
    submitButtonText: 'Submit Assessment',
    seoKeywords: ['assessment', 'evaluation', 'screening', 'eligibility'],
  },
  compliance: {
    nameSuffix: '— Compliance Form',
    injectFields: [
      { id: 'acknowledgment', label: 'I acknowledge the above information is accurate', type: 'checkbox', required: true, width: 'full' },
      { id: 'signature', label: 'Signature', type: 'signature', required: true, width: 'half' },
      { id: 'date_signed', label: 'Date', type: 'date', required: true, width: 'half' },
    ],
    submitButtonText: 'Sign & Submit',
    seoKeywords: ['compliance', 'consent', 'waiver', 'agreement', 'acknowledgment'],
  },
};

// ─── Audience transforms ──────────────────────────────────────────────────

interface AudienceTransform {
  /** Field adjustments for this audience. */
  fieldAdjustments: {
    /** Fields to add (B2B tends to need company info). */
    addFields?: Array<{ id: string; label: string; type: string; required?: boolean; width?: string }>;
    /** Label replacements (e.g. "Name" → "Full Name" for B2C). */
    labelReplacements?: Array<{ from: string; to: string }>;
  };
  /** SEO keywords for this audience. */
  seoKeywords: string[];
}

const AUDIENCE_TRANSFORMS: Record<TemplateAudienceId, AudienceTransform> = {
  b2b: {
    fieldAdjustments: {
      addFields: [
        { id: 'company_name', label: 'Company Name', type: 'short_answer', required: true, width: 'half' },
        { id: 'company_size', label: 'Company Size', type: 'dropdown', required: false, width: 'half' },
      ],
    },
    seoKeywords: ['b2b', 'business', 'enterprise', 'corporate'],
  },
  b2c: {
    fieldAdjustments: {
      labelReplacements: [
        { from: 'Company Name', to: 'Full Name' },
        { from: 'Company', to: 'Household' },
      ],
    },
    seoKeywords: ['personal', 'consumer', 'individual', 'home'],
  },
  internal: {
    fieldAdjustments: {
      addFields: [
        { id: 'employee_id', label: 'Employee ID', type: 'short_answer', required: true, width: 'half' },
        { id: 'department', label: 'Department', type: 'dropdown', required: true, width: 'half' },
      ],
    },
    seoKeywords: ['internal', 'employee', 'staff', 'intranet'],
  },
  nonprofit: {
    fieldAdjustments: {
      addFields: [
        { id: 'organization', label: 'Organization Name', type: 'short_answer', required: false, width: 'full' },
      ],
    },
    seoKeywords: ['nonprofit', 'charity', 'volunteer', 'cause'],
  },
  government: {
    fieldAdjustments: {
      addFields: [
        { id: 'agency', label: 'Agency/Department', type: 'short_answer', required: true, width: 'full' },
      ],
    },
    seoKeywords: ['government', 'public sector', 'municipal', 'civic'],
  },
  education: {
    fieldAdjustments: {
      addFields: [
        { id: 'school', label: 'School/Institution', type: 'short_answer', required: false, width: 'half' },
        { id: 'grade', label: 'Grade/Year', type: 'short_answer', required: false, width: 'half' },
      ],
    },
    seoKeywords: ['education', 'school', 'student', 'university'],
  },
  consumer: {
    fieldAdjustments: {},
    seoKeywords: ['consumer', 'personal', 'general public'],
  },
};

// ─── Main generator functions ──────────────────────────────────────────────

export function generateUseCaseVariant(
  base: FormTemplate,
  useCase: TemplateUseCaseId,
): FormTemplate | null {
  const transform = USE_CASE_TRANSFORMS[useCase];
  if (!transform) return null;

  const newSchema: FormSchema = JSON.parse(JSON.stringify(base.schema));

  // Inject fields
  if (transform.injectFields && transform.injectFields.length > 0) {
    const insertIdx = Math.max(2, newSchema.fields.length - 1); // before last field
    newSchema.fields.splice(insertIdx, 0, ...transform.injectFields as never[]);
  }

  // Override submit button
  if (transform.submitButtonText) {
    newSchema.settings.submitButtonText = transform.submitButtonText;
  }

  const variantId = `${base.id}--${useCase.replace(/_/g, '-')}`;
  const variantName = `${base.name} ${transform.nameSuffix}`;

  return {
    ...base,
    id: variantId,
    name: variantName,
    shortDescription: `${base.shortDescription} ${transform.nameSuffix}.`,
    schema: newSchema,
    useCases: Array.from(new Set([...base.useCases, useCase])) as TemplateUseCaseId[],
    tags: Array.from(new Set([...base.tags, ...transform.seoKeywords])),
    source: 'ai_generated',
    isFeatured: false,
    usageCount: 0,
    viewCount: 0,
    cloneCount: 0,
    seo: {
      ...base.seo,
      seoTitle: `${variantName} — Free Template | Fieseros`,
      seoDescription: `${base.shortDescription} ${transform.nameSuffix}.` .slice(0, 160),
      seoKeywords: Array.from(new Set([...base.seo.seoKeywords, ...transform.seoKeywords])),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateAudienceVariant(
  base: FormTemplate,
  audience: TemplateAudienceId,
): FormTemplate | null {
  const transform = AUDIENCE_TRANSFORMS[audience];
  if (!transform) return null;

  const newSchema: FormSchema = JSON.parse(JSON.stringify(base.schema));

  // Apply label replacements
  if (transform.fieldAdjustments.labelReplacements) {
    for (const field of newSchema.fields) {
      for (const repl of transform.fieldAdjustments.labelReplacements) {
        if (field.label === repl.from) {
          field.label = repl.to;
        }
      }
    }
  }

  // Add fields
  if (transform.fieldAdjustments.addFields && transform.fieldAdjustments.addFields.length > 0) {
    const insertIdx = Math.min(2, newSchema.fields.length);
    newSchema.fields.splice(insertIdx, 0, ...transform.fieldAdjustments.addFields as never[]);
  }

  const variantId = `${base.id}--${audience}`;
  const audienceLabel = audience.toUpperCase();
  const variantName = `${base.name} (${audienceLabel})`;

  return {
    ...base,
    id: variantId,
    name: variantName,
    shortDescription: `${base.shortDescription} Tailored for ${audienceLabel} audiences.`,
    schema: newSchema,
    audiences: Array.from(new Set([...base.audiences, audience])) as TemplateAudienceId[],
    tags: Array.from(new Set([...base.tags, ...transform.seoKeywords])),
    source: 'ai_generated',
    isFeatured: false,
    usageCount: 0,
    viewCount: 0,
    cloneCount: 0,
    seo: {
      ...base.seo,
      seoTitle: `${variantName} — Free Template | Fieseros`,
      seoKeywords: Array.from(new Set([...base.seo.seoKeywords, ...transform.seoKeywords])),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compose a variant: base × industry × useCase (most common combination).
 * Used by the search engine to generate on-demand variants for specific queries.
 */
export function generateComposedVariant(
  base: FormTemplate,
  industry: TemplateIndustryId | null,
  useCase: TemplateUseCaseId | null,
): FormTemplate | null {
  let variant: FormTemplate | null = { ...base };

  if (industry) {
    const v = generateIndustryVariant(variant, industry);
    if (v) variant = v;
  }

  if (useCase) {
    variant = generateUseCaseVariant(variant, useCase);
  }

  return variant;
}
