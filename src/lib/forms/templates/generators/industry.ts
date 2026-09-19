/**
 * Industry Variation Engine — generates industry-specific template variants.
 *
 * Takes a base template (e.g. "Contact Form") + an industry tag (e.g. "dental")
 * and produces an industry-specific variant (e.g. "Dental Contact Form") with
 * adapted field labels, options, and copy.
 *
 * This is the CORE of the "20,000+ templates" strategy. Instead of hand-coding
 * 50 base × 48 industries = 2,400 templates, we generate them on-demand from
 * 50 base templates + industry transformation rules.
 *
 * How it works:
 *   1. Clone the base template (deep copy)
 *   2. Apply industry-specific field transformations:
 *      - Prefix labels with industry context (e.g. "Patient Full Name" for dental)
 *      - Inject industry-specific fields (e.g. "Insurance Provider" for healthcare)
 *      - Adapt dropdown options (e.g. "AC Repair / Heating / Maintenance" for HVAC)
 *      - Adjust theme color to match industry conventions
 *   3. Update SEO metadata (title, description, keywords)
 *   4. Update classification (add industry to industries[] if not present)
 *
 * The generated variant is cached after first generation (Release 3.3 will
 * persist popular variants to the DB after ≥3 uses).
 */
import type {
  FormTemplate,
  TemplateIndustryId,
  TemplateCategoryId,
} from '../types';
import type { FormField, FormSchema } from '../../form-schema-types';

// ─── Industry transformation rules ────────────────────────────────────────

interface IndustryTransform {
  /** Label prefix for person-type fields (e.g. "Patient", "Customer", "Client"). */
  personLabel: string;
  /** Label for the business/service provider (e.g. "Clinic", "Company"). */
  businessLabel: string;
  /** Fields to inject at the start (after name/email). */
  injectFields?: Array<Partial<FormField> & { id: string; label: string; type: string }>;
  /** Theme color override (hex). */
  primaryColor?: string;
  /** Service-type options for dropdowns (replaces generic options). */
  serviceOptions?: string[];
  /** Keywords to add to SEO. */
  seoKeywords: string[];
}

const INDUSTRY_TRANSFORMS: Record<string, IndustryTransform> = {
  dental: {
    personLabel: 'Patient',
    businessLabel: 'Dental Clinic',
    injectFields: [
      { id: 'reason_for_visit', label: 'Reason for Visit', type: 'dropdown', required: true, width: 'full',
        options: ['Routine Cleaning', 'Emergency Toothache', 'Cosmetic Consultation', 'Root Canal', 'Wisdom Teeth', 'Orthodontics'] },
    ],
    primaryColor: '#0ea5e9',
    seoKeywords: ['dental', 'dentist', 'patient', 'oral health', 'dental clinic'],
  },
  healthcare: {
    personLabel: 'Patient',
    businessLabel: 'Medical Clinic',
    injectFields: [
      { id: 'chief_complaint', label: 'Chief Complaint', type: 'long_answer', required: true, width: 'full' },
    ],
    primaryColor: '#059669',
    seoKeywords: ['medical', 'healthcare', 'patient', 'clinic', 'health'],
  },
  hvac: {
    personLabel: 'Customer',
    businessLabel: 'HVAC Company',
    injectFields: [
      { id: 'service_type', label: 'Service Type', type: 'dropdown', required: true, width: 'half',
        options: ['AC Repair', 'AC Installation', 'Heating Repair', 'Furnace Installation', 'Maintenance', 'Inspection'] },
      { id: 'equipment_type', label: 'Equipment Type', type: 'dropdown', required: false, width: 'half',
        options: ['Central AC', 'Heat Pump', 'Furnace', 'Mini-Split', 'Packaged Unit', 'Not Sure'] },
    ],
    primaryColor: '#f97316',
    seoKeywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac repair'],
  },
  plumbing: {
    personLabel: 'Customer',
    businessLabel: 'Plumbing Company',
    injectFields: [
      { id: 'plumbing_issue', label: 'Plumbing Issue', type: 'dropdown', required: true, width: 'half',
        options: ['Leak Repair', 'Drain Cleaning', 'Water Heater', 'Fixture Install', 'Sewer Line', 'Emergency'] },
      { id: 'water_shutoff', label: 'Do you know where the main water shutoff is?', type: 'radio', required: false, width: 'half',
        options: ['Yes', 'No', 'Not sure'] },
    ],
    primaryColor: '#0284c7',
    seoKeywords: ['plumbing', 'plumber', 'leak', 'pipe', 'water heater'],
  },
  electrical: {
    personLabel: 'Customer',
    businessLabel: 'Electrical Company',
    injectFields: [
      { id: 'service_type', label: 'Service Type', type: 'dropdown', required: true, width: 'full',
        options: ['Outlet Repair', 'Panel Upgrade', 'Lighting Install', 'Wiring', 'Inspection', 'Emergency'] },
    ],
    primaryColor: '#eab308',
    seoKeywords: ['electrical', 'electrician', 'wiring', 'panel', 'outlet'],
  },
  real_estate: {
    personLabel: 'Client',
    businessLabel: 'Real Estate Agency',
    injectFields: [
      { id: 'property_type', label: 'Property Type', type: 'dropdown', required: true, width: 'half',
        options: ['Single Family Home', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'] },
      { id: 'budget_range', label: 'Budget Range', type: 'dropdown', required: false, width: 'half',
        options: ['Under $250k', '$250k-$500k', '$500k-$750k', '$750k-$1M', 'Over $1M'] },
    ],
    primaryColor: '#7c3aed',
    seoKeywords: ['real estate', 'property', 'realtor', 'housing', 'home buying'],
  },
  legal: {
    personLabel: 'Client',
    businessLabel: 'Law Firm',
    injectFields: [
      { id: 'case_type', label: 'Case Type', type: 'dropdown', required: true, width: 'full',
        options: ['Personal Injury', 'Family Law', 'Criminal Defense', 'Business/Corporate', 'Estate Planning', 'Immigration', 'Employment'] },
    ],
    primaryColor: '#1e293b',
    seoKeywords: ['legal', 'lawyer', 'attorney', 'law firm', 'legal services'],
  },
  automotive: {
    personLabel: 'Customer',
    businessLabel: 'Auto Repair Shop',
    injectFields: [
      { id: 'vehicle_info', label: 'Vehicle (Year/Make/Model)', type: 'short_answer', required: true, width: 'full', placeholder: 'e.g. 2020 Toyota Camry' },
      { id: 'service_type', label: 'Service Needed', type: 'dropdown', required: true, width: 'full',
        options: ['Oil Change', 'Brake Repair', 'Engine Diagnostic', 'Tire Service', 'Transmission', 'Inspection', 'Other'] },
    ],
    primaryColor: '#dc2626',
    seoKeywords: ['automotive', 'auto repair', 'mechanic', 'car', 'vehicle'],
  },
  restaurant: {
    personLabel: 'Guest',
    businessLabel: 'Restaurant',
    injectFields: [
      { id: 'party_size', label: 'Party Size', type: 'dropdown', required: true, width: 'half',
        options: ['1', '2', '3', '4', '5', '6', '7', '8+'] },
      { id: 'occasion', label: 'Occasion', type: 'dropdown', required: false, width: 'half',
        options: ['Casual Dining', 'Birthday', 'Anniversary', 'Business', 'Date Night', 'Other'] },
    ],
    primaryColor: '#ea580c',
    seoKeywords: ['restaurant', 'dining', 'reservation', 'food', 'cafe'],
  },
  fitness: {
    personLabel: 'Member',
    businessLabel: 'Fitness Center',
    injectFields: [
      { id: 'fitness_goal', label: 'Primary Fitness Goal', type: 'dropdown', required: true, width: 'full',
        options: ['Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility', 'General Fitness', 'Sports Performance'] },
    ],
    primaryColor: '#16a34a',
    seoKeywords: ['fitness', 'gym', 'workout', 'health', 'wellness'],
  },
  nonprofit: {
    personLabel: 'Supporter',
    businessLabel: 'Organization',
    injectFields: [
      { id: 'involvement_type', label: 'How would you like to help?', type: 'dropdown', required: true, width: 'full',
        options: ['One-time Donation', 'Monthly Giving', 'Volunteer', 'Spread the Word', 'Corporate Sponsorship'] },
    ],
    primaryColor: '#0891b2',
    seoKeywords: ['nonprofit', 'charity', 'donation', 'volunteer', 'cause'],
  },
};

// ─── Main generator function ──────────────────────────────────────────────

/**
 * Generate an industry-specific variant of a base template.
 *
 * @param base The canonical template to transform.
 * @param industry The target industry.
 * @returns A new FormTemplate with industry-adapted fields + SEO, or null
 *          if no transform exists for the given industry.
 */
export function generateIndustryVariant(
  base: FormTemplate,
  industry: TemplateIndustryId,
): FormTemplate | null {
  const transform = INDUSTRY_TRANSFORMS[industry];
  if (!transform) return null; // No transform for this industry

  // Deep clone the base schema
  const newSchema: FormSchema = JSON.parse(JSON.stringify(base.schema));

  // 1. Apply theme color
  if (transform.primaryColor) {
    newSchema.theme = newSchema.theme || { primaryColor: transform.primaryColor, backgroundColor: '#ffffff' };
    newSchema.theme.primaryColor = transform.primaryColor;
  }

  // 2. Adapt field labels (person-type fields get industry-specific labels)
  for (const field of newSchema.fields) {
    // Replace generic "Name" / "Full Name" with "{Person} Name"
    if (field.type === 'short_answer' && /name/i.test(field.label) && !field.label.includes(':')) {
      field.label = field.label.replace(/name/i, `${transform.personLabel} Name`);
    }
    // Replace "Email" with "{Person} Email" only if label is exactly "Email"
    if (field.type === 'email' && field.label === 'Email') {
      field.label = `${transform.personLabel} Email`;
    }
    // Replace "Phone" with "{Person} Phone"
    if (field.type === 'phone' && field.label === 'Phone') {
      field.label = `${transform.personLabel} Phone`;
    }
  }

  // 3. Inject industry-specific fields (after email/phone, before message)
  if (transform.injectFields && transform.injectFields.length > 0) {
    const insertIdx = Math.min(
      newSchema.fields.findIndex((f) => f.type === 'long_answer' || f.type === 'dropdown'),
      newSchema.fields.length,
    );
    const injectAt = insertIdx === -1 ? newSchema.fields.length : insertIdx;
    newSchema.fields.splice(injectAt, 0, ...transform.injectFields as FormField[]);
  }

  // 4. Build the new template
  const industryLabel = industry.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const variantId = `${base.id}-${industry}`;
  const variantName = `${industryLabel} ${base.name}`;

  const variant: FormTemplate = {
    ...base,
    id: variantId,
    name: variantName,
    shortDescription: adaptShortDescription(base.shortDescription, industry, transform.personLabel),
    description: base.description
      ? `${base.description} Adapted for the ${industryLabel.toLowerCase()} industry.`
      : `A ${base.name.toLowerCase()} tailored for ${industryLabel.toLowerCase()} businesses.`,
    schema: newSchema,
    industries: Array.from(new Set([...base.industries, industry])) as TemplateIndustryId[],
    tags: Array.from(new Set([...base.tags, industry, ...transform.seoKeywords])),
    source: 'ai_generated', // variants are generated, not hand-curated
    isFeatured: false, // only curated templates are featured
    usageCount: 0,
    viewCount: 0,
    cloneCount: 0,
    seo: {
      seoTitle: `${variantName} — Free Template | Fieseros`,
      seoDescription: adaptShortDescription(base.shortDescription, industry, transform.personLabel).slice(0, 155),
      seoKeywords: Array.from(new Set([...base.seo.seoKeywords, ...transform.seoKeywords])),
      faq: base.seo.faq,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return variant;
}

function adaptShortDescription(
  original: string,
  industry: string,
  personLabel: string,
): string {
  // Replace "customer"/"user"/"client" with the industry-specific person label
  const adapted = original.replace(/\b(customer|user|client|respondent)\b/gi, personLabel.toLowerCase());
  return `${adapted} Designed for the ${industry.replace(/_/g, ' ')} industry.`;
}

// ─── Batch generation + search ────────────────────────────────────────────

/**
 * Generate variants for ALL base templates × ALL transformable industries.
 * Returns the full list of generated variants (not registered — caller decides).
 *
 * With 51 base templates × 12 industry transforms = 612 variants.
 * Not all combinations make sense (e.g. "Dental Job Application" is odd),
 * but the generator produces them all — the search engine ranks by relevance.
 */
export function generateAllVariants(baseTemplates: FormTemplate[]): FormTemplate[] {
  const variants: FormTemplate[] = [];
  for (const base of baseTemplates) {
    for (const industry of Object.keys(INDUSTRY_TRANSFORMS) as TemplateIndustryId[]) {
      const variant = generateIndustryVariant(base, industry);
      if (variant) variants.push(variant);
    }
  }
  return variants;
}

/**
 * Count of possible variants (base × industries with transforms).
 */
export function getPossibleVariantCount(baseCount: number): number {
  return baseCount * Object.keys(INDUSTRY_TRANSFORMS).length;
}
