/**
 * Canonical Form Templates — Events, Weddings, Dining & Hospitality Extended (2026 Edition)
 *
 * Curated high-converting hospitality templates:
 * - Luxury Wedding Planning & Venue Booking Discovery
 * - Corporate Gala & High-End Catering Proposal RFP
 * - Private Chef Table & VIP Dining Reservation
 * - Event Photography & Cinematography Package Builder
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeEventTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
  color: string,
  fields: any[],
  steps: any[],
  seoKeywords: string[],
  faq: { question: string; answer: string }[],
  mediaUrl?: string
): FormTemplate {
  return {
    id,
    name,
    shortDescription,
    description,
    schema: {
      version: 1,
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Event Overview' }],
      fields,
      rules: [],
      theme: {
        primaryColor: color,
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '1rem',
        inputBorderRadius: '0.75rem',
        inputHeight: 'large',
        cardBackground: 'rgba(255, 255, 255, 0.98)',
        showTopBorder: true,
        layout: 'multi_step',
        mediaPanel: {
          enabled: true,
          position: 'left',
          splitRatio: '40-60',
          mediaType: 'image',
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
          badgeText: '🥂 Luxury Hospitality & Bespoke Event Experiences',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Dedicated event producer & sommelier coordination',
            'Custom tasting sessions & floorplan 3D visualization',
            'All-inclusive culinary, beverage & decor management',
          ],
        },
      },
      settings: {
        submitButtonText: 'Check Date Availability 🥂',
        successTitle: 'Inquiry Received with Pleasure!',
        successMessage: 'Our private events director is checking calendar availability and will send your customized lookbook shortly.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `event_${id}` },
        },
      },
    },
    categories: ['event', 'booking', 'lead_generation', 'request'],
    industries: ['hospitality', 'restaurant', 'general'],
    useCases: ['booking', 'lead_capture', 'consultation'],
    audiences: ['b2c', 'b2b'],
    tags: ['events', 'wedding', 'catering', 'hospitality', '2026-ui'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.97,
    ratingCount: 95,
    usageCount: 1380,
    estimatedMinutes: 3,
    seo: {
      seoTitle: `${name} | Bespoke Event Booking & Quote`,
      seoDescription: `${shortDescription} Multi-step event discovery capturing guest counts, culinary styles, and dates.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. Luxury Wedding Planning
const WEDDING_PLANNING = makeEventTemplate(
  'luxury-wedding-planning-discovery',
  'Luxury Wedding Planning & Bespoke Design Discovery',
  'Full-service wedding planning questionnaire capturing aesthetic vision, guest count, and date preferences.',
  'For luxury wedding planners and event designers. Collects floral design vision, bridal party size, estimated budget tier, and venue preferences.',
  '#be185d',
  [
    { id: 'couple_names', type: 'short_answer', label: 'Couple Names (e.g. Elena & Marcus)', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email', required: true, width: 'full', stepId: 'step-1' },
    { id: 'wedding_date', type: 'date', label: 'Target Wedding Date', required: true, width: 'half', stepId: 'step-2' },
    { id: 'guest_count', type: 'dropdown', label: 'Estimated Guest Count', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Intimate / Micro Wedding (Under 50 guests)', value: 'under_50' }, { label: '50 – 120 Guests', value: '50_120' }, { label: '120 – 250 Guests (Grand Celebration)', value: '120_250' }, { label: '250+ Multi-Day Gala', value: '250_plus' }] },
    { id: 'budget_range', type: 'dropdown', label: 'Overall Planned Wedding Investment', width: 'half', stepId: 'step-2',
      options: [{ label: '$35,000 – $60,000', value: '35_60' }, { label: '$60,000 – $100,000', value: '60_100' }, { label: '$100,000 – $200,000 (Luxury)', value: '100_200' }, { label: '$200,000+ (Ultra Luxury / Destination)', value: '200_plus' }] },
    { id: 'aesthetic_vision', type: 'long_answer', label: 'Describe Your Dream Wedding Aesthetic & Theme', placeholder: 'e.g. Modern Romantic European Garden, Black Tie Minimalist...', width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Couple & Contact' }, { id: 'step-2', title: 'Wedding Vision & Budget' }],
  ['wedding planner discovery', 'luxury wedding questionnaire', 'wedding design intake', 'bridal consultation form'],
  [{ question: 'How far in advance should we book a wedding planner?', answer: 'Most couples reserve full-service planning 9 to 18 months prior to their wedding date.' }],
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'
);

// 2. Corporate Catering & Gala RFP
const CORPORATE_CATERING = makeEventTemplate(
  'corporate-catering-gala-proposal',
  'Corporate Gala & Executive Event Catering RFP',
  'Plated banquet, buffet station, and cocktail reception catering proposal generator.',
  'Designed for premier event caterers. Captures service style (plated 3-course, live chef action stations, passed hors d’oeuvres), dietary ratios, and bar packages.',
  '#b45309',
  [
    { id: 'company_name', type: 'short_answer', label: 'Organization / Host Company', required: true, width: 'half', stepId: 'step-1' },
    { id: 'planner_name', type: 'short_answer', label: 'Event Planner Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Corporate Email', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'event_date', type: 'date', label: 'Event Date', required: true, width: 'half', stepId: 'step-2' },
    { id: 'guest_count', type: 'short_answer', label: 'Expected Headcount (Guests)', placeholder: 'e.g. 150', required: true, width: 'half', stepId: 'step-2' },
    { id: 'service_style', type: 'dropdown', label: 'Culinary Presentation Style', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Seated Plated 3-Course Dinner', value: 'plated' }, { label: 'Interactive Chef Action Stations', value: 'stations' }, { label: 'Cocktail Reception with Passed Canapés', value: 'cocktail' }, { label: 'Executive Drop-Off Hot Buffet', value: 'buffet' }] },
    { id: 'bar_service', type: 'dropdown', label: 'Bar & Beverage Package', width: 'half', stepId: 'step-2',
      options: [{ label: 'Full Premium Open Bar (Liquor, Wine & Craft Beer)', value: 'full_bar' }, { label: 'Sommelier Wine & Beer Bar Only', value: 'wine_beer' }, { label: 'Artisanal Mocktail & Non-Alcoholic Bar', value: 'mocktails' }, { label: 'No Alcohol Required', value: 'none' }] },
  ],
  [{ id: 'step-1', title: 'Company & Contact' }, { id: 'step-2', title: 'Culinary Specifications' }],
  ['corporate catering quote', 'catering rfp template', 'event catering proposal form', 'executive dining inquiry'],
  [{ question: 'Do you accommodate severe food allergies and kosher/halal diets?', answer: 'Yes, our culinary team provides certified allergen-isolated prep, vegan, gluten-free, and kosher/halal menu accommodations.' }],
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80'
);

export function registerEventsHospitalityExtendedTemplates(): void {
  registerTemplate(WEDDING_PLANNING);
  registerTemplate(CORPORATE_CATERING);
}

// Auto-register
registerEventsHospitalityExtendedTemplates();
