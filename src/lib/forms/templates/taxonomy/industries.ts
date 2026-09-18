/**
 * Template Industries — the second classification axis.
 *
 * A template can target multiple industries. The variation engine (Release 3)
 * takes a base template + an industry tag and produces an industry-specific
 * variant (e.g. "Contact Form" + "dental" → "Dental Contact Form" with
 * HIPAA-relevant fields).
 *
 * Keep this list aligned with `src/lib/industry-catalog.ts` if it exists —
 * that file is the broader business-wide industry catalog used by the CRM
 * and marketing features. This file is the form-template-specific subset.
 */

export interface IndustryDefinition {
  id: string;
  label: string;
  /** Icon name from lucide-react. */
  iconName: string;
  /** Common synonyms/aliases for search matching (lowercase). */
  aliases: string[];
  /** Default category pairing for this industry (suggested, not enforced). */
  defaultCategories: string[];
}

export const TEMPLATE_INDUSTRIES: IndustryDefinition[] = [
  { id: 'general', label: 'General / All Industries', iconName: 'LayoutGrid', aliases: ['generic', 'universal'], defaultCategories: ['contact', 'feedback'] },
  { id: 'healthcare', label: 'Healthcare', iconName: 'HeartPulse', aliases: ['medical', 'clinic', 'doctor', 'hospital'], defaultCategories: ['intake', 'consent', 'appointment'] },
  { id: 'dental', label: 'Dental', iconName: 'Smile', aliases: ['dentist', 'orthodontist', 'oral'], defaultCategories: ['intake', 'consent', 'appointment'] },
  { id: 'hvac', label: 'HVAC', iconName: 'Wind', aliases: ['heating', 'cooling', 'air conditioning', 'furnace'], defaultCategories: ['request', 'quote', 'inspection'] },
  { id: 'plumbing', label: 'Plumbing', iconName: 'Wrench', aliases: ['plumber', 'pipe', 'leak'], defaultCategories: ['request', 'quote', 'inspection'] },
  { id: 'electrical', label: 'Electrical', iconName: 'Zap', aliases: ['electrician', 'wiring', 'panel'], defaultCategories: ['request', 'quote', 'inspection'] },
  { id: 'construction', label: 'Construction', iconName: 'HardHat', aliases: ['contractor', 'builder', 'remodel'], defaultCategories: ['quote', 'inspection', 'checklist'] },
  { id: 'roofing', label: 'Roofing', iconName: 'Home', aliases: ['roof', 'shingle', 'gutter'], defaultCategories: ['quote', 'inspection'] },
  { id: 'landscaping', label: 'Landscaping', iconName: 'Trees', aliases: ['lawn', 'garden', 'yard'], defaultCategories: ['quote', 'request'] },
  { id: 'cleaning', label: 'Cleaning', iconName: 'Sparkles', aliases: ['janitorial', 'maid', 'sanitation'], defaultCategories: ['quote', 'request', 'checklist'] },
  { id: 'pest_control', label: 'Pest Control', iconName: 'Bug', aliases: ['exterminator', 'pest'], defaultCategories: ['quote', 'request', 'inspection'] },
  { id: 'solar', label: 'Solar', iconName: 'Sun', aliases: ['solar panel', 'photovoltaic', 'renewable'], defaultCategories: ['quote', 'request', 'inspection'] },
  { id: 'home_services', label: 'Home Services', iconName: 'Home', aliases: ['home repair', 'handyman', 'property maintenance'], defaultCategories: ['request', 'quote'] },
  { id: 'real_estate', label: 'Real Estate', iconName: 'Building2', aliases: ['realtor', 'property', 'housing', 'agent'], defaultCategories: ['lead_generation', 'application'] },
  { id: 'legal', label: 'Legal', iconName: 'Scale', aliases: ['lawyer', 'attorney', 'law firm'], defaultCategories: ['intake', 'consent', 'application'] },
  { id: 'accounting', label: 'Accounting', iconName: 'Calculator', aliases: ['accountant', 'cpa', 'bookkeeping', 'tax'], defaultCategories: ['intake', 'onboarding'] },
  { id: 'insurance', label: 'Insurance', iconName: 'Shield', aliases: ['broker', 'agent', 'policy', 'claim'], defaultCategories: ['application', 'quote', 'intake'] },
  { id: 'automotive', label: 'Automotive', iconName: 'Car', aliases: ['auto', 'mechanic', 'car', 'vehicle', 'repair shop'], defaultCategories: ['request', 'quote', 'inspection'] },
  { id: 'restaurant', label: 'Restaurant', iconName: 'UtensilsCrossed', aliases: ['food', 'cafe', 'dining', 'catering'], defaultCategories: ['order', 'application', 'feedback'] },
  { id: 'hospitality', label: 'Hospitality', iconName: 'BedDouble', aliases: ['hotel', 'motel', 'lodging', 'travel'], defaultCategories: ['booking', 'feedback'] },
  { id: 'beauty', label: 'Beauty & Salon', iconName: 'Scissors', aliases: ['salon', 'spa', 'barber', 'cosmetology'], defaultCategories: ['booking', 'intake'] },
  { id: 'fitness', label: 'Fitness', iconName: 'Dumbbell', aliases: ['gym', 'personal trainer', 'wellness'], defaultCategories: ['intake', 'registration', 'waiver'] },
  { id: 'education', label: 'Education', iconName: 'GraduationCap', aliases: ['school', 'university', 'college', 'course', 'training'], defaultCategories: ['registration', 'application', 'feedback'] },
  { id: 'nonprofit', label: 'Nonprofit', iconName: 'HeartHandshake', aliases: ['charity', 'ngo', 'foundation'], defaultCategories: ['donation', 'registration', 'volunteer'] },
  { id: 'church', label: 'Church', iconName: 'Church', aliases: ['religious', 'ministry', 'faith'], defaultCategories: ['event', 'donation', 'registration'] },
  { id: 'marketing', label: 'Marketing', iconName: 'Megaphone', aliases: ['advertising', 'seo', 'content'], defaultCategories: ['lead_generation', 'onboarding'] },
  { id: 'agency', label: 'Agency', iconName: 'Briefcase', aliases: ['creative agency', 'digital agency', 'consultancy'], defaultCategories: ['lead_generation', 'intake', 'onboarding'] },
  { id: 'consulting', label: 'Consulting', iconName: 'Lightbulb', aliases: ['consultant', 'advisor', 'professional services'], defaultCategories: ['intake', 'lead_generation'] },
  { id: 'saas', label: 'SaaS', iconName: 'Cloud', aliases: ['software', 'app', 'platform', 'startup'], defaultCategories: ['registration', 'feedback', 'lead_generation'] },
  { id: 'technology', label: 'Technology', iconName: 'Cpu', aliases: ['tech', 'it', 'developer'], defaultCategories: ['request', 'application'] },
  { id: 'ecommerce', label: 'E-commerce', iconName: 'ShoppingBag', aliases: ['online store', 'shop', 'retail online'], defaultCategories: ['order', 'feedback', 'customer_service'] },
  { id: 'retail', label: 'Retail', iconName: 'ShoppingCart', aliases: ['store', 'shop', 'brick and mortar'], defaultCategories: ['feedback', 'application', 'customer_service'] },
  { id: 'manufacturing', label: 'Manufacturing', iconName: 'Factory', aliases: ['factory', 'production', 'industrial'], defaultCategories: ['request', 'order', 'inspection'] },
  { id: 'logistics', label: 'Logistics', iconName: 'Truck', aliases: ['shipping', 'freight', 'warehouse', 'supply chain'], defaultCategories: ['request', 'order', 'report'] },
  { id: 'transportation', label: 'Transportation', iconName: 'Bus', aliases: ['transport', 'transit', 'fleet'], defaultCategories: ['booking', 'request'] },
  { id: 'photography', label: 'Photography', iconName: 'Camera', aliases: ['photographer', 'photo', 'studio'], defaultCategories: ['booking', 'quote', 'intake'] },
  { id: 'events', label: 'Events', iconName: 'PartyPopper', aliases: ['event planning', 'wedding planner', 'party'], defaultCategories: ['event', 'booking', 'quote'] },
  { id: 'travel', label: 'Travel', iconName: 'Plane', aliases: ['tour', 'vacation', 'trip'], defaultCategories: ['booking', 'feedback'] },
  { id: 'veterinary', label: 'Veterinary', iconName: 'PawPrint', aliases: ['vet', 'animal', 'pet clinic'], defaultCategories: ['intake', 'appointment', 'consent'] },
  { id: 'pet_services', label: 'Pet Services', iconName: 'Dog', aliases: ['grooming', 'pet sitting', 'dog walker'], defaultCategories: ['booking', 'intake', 'waiver'] },
  { id: 'financial_services', label: 'Financial Services', iconName: 'DollarSign', aliases: ['finance', 'banking', 'investment', 'wealth'], defaultCategories: ['intake', 'application', 'consent'] },
  { id: 'human_resources', label: 'Human Resources', iconName: 'Users', aliases: ['hr', 'people ops'], defaultCategories: ['onboarding', 'application', 'assessment'] },
  { id: 'agriculture', label: 'Agriculture', iconName: 'Wheat', aliases: ['farm', 'farming', 'agribusiness'], defaultCategories: ['quote', 'request', 'inspection'] },
  { id: 'security', label: 'Security', iconName: 'ShieldCheck', aliases: ['guard', 'security services', 'surveillance'], defaultCategories: ['application', 'request', 'report'] },
  { id: 'music', label: 'Music', iconName: 'Music', aliases: ['band', 'musician', 'dj', 'audio'], defaultCategories: ['booking', 'event'] },
  { id: 'wedding', label: 'Wedding', iconName: 'Heart', aliases: ['marriage', 'bridal', 'wedding planner'], defaultCategories: ['event', 'booking', 'rsvp'] },
  { id: 'government', label: 'Government', iconName: 'Landmark', aliases: ['public sector', 'municipal', 'civic'], defaultCategories: ['request', 'application', 'report'] },
  { id: 'salon', label: 'Salon', iconName: 'Scissors', aliases: ['hair', 'beauty salon', 'barber'], defaultCategories: ['booking', 'intake'] },
];

/** Quick lookup: industry id → definition. */
export const INDUSTRY_MAP = new Map(TEMPLATE_INDUSTRIES.map((i) => [i.id, i]));

/** Get an industry's label by id. */
export function getIndustryLabel(id: string): string {
  return INDUSTRY_MAP.get(id)?.label ?? id;
}

/**
 * Resolve a free-text search term to an industry id using aliases.
 * Returns undefined if no match. Used by the search engine to map
 * "dentist" → 'dental' etc.
 */
export function resolveIndustryFromText(term: string): string | undefined {
  const t = term.toLowerCase().trim();
  for (const industry of TEMPLATE_INDUSTRIES) {
    if (industry.id === t || industry.label.toLowerCase().includes(t)) return industry.id;
    if (industry.aliases.some((a) => a.includes(t) || t.includes(a))) return industry.id;
  }
  return undefined;
}
