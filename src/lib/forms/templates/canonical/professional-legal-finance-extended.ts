/**
 * Canonical Form Templates — Legal, Real Estate, Finance & Advisory Extended (2026 Edition)
 *
 * Curated, high-value professional services templates:
 * - Personal Injury & Accident Legal Intake
 * - Estate Planning, Will & Trust Questionnaire
 * - Residential Home Buyer Property Search Brief
 * - Commercial Real Estate Tenant Lease Inquiry
 * - Mortgage Pre-Approval Financial Verification
 * - Small Business Bookkeeping & Forensic Tax Organizer
 * - Management Consulting Discovery RFP
 * - Business Incorporation & Corporate Formation Intake
 * - Commercial Property Insurance Loss Claim
 * - Marketing Agency Retainer Strategy Brief
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeProfTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
  category: string,
  industry: string,
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
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Client Details' }],
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
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
          badgeText: '💼 Confidential Client Intake & Advisory Discovery',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Privileged & confidential preliminary consultation evaluation',
            'Direct assignment to senior practice directors & attorneys',
            'Same-day conflict check & response',
          ],
        },
      },
      settings: {
        submitButtonText: 'Submit Discovery Intake ⚖️',
        successTitle: 'Consultation Request Logged!',
        successMessage: 'Our senior practice group has received your confidential submission and will review it promptly.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `prof_${id}` },
        },
      },
    },
    categories: [category as any, 'lead_generation', 'request'],
    industries: [industry as any, 'legal', 'finance'],
    useCases: ['lead_capture', 'client_onboarding', 'consultation'],
    audiences: ['b2b', 'b2c'],
    tags: [industry, category, 'professional-services', 'consulting', '2026-ui'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.96,
    ratingCount: 104,
    usageCount: 1680,
    estimatedMinutes: 3,
    seo: {
      seoTitle: `${name} | Confidential Advisory & Intake Form`,
      seoDescription: `${shortDescription} Secure multi-step consultation intake for legal, real estate, and financial advisory practices.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. Personal Injury Legal Intake
const PERSONAL_INJURY = makeProfTemplate(
  'personal-injury-accident-intake',
  'Personal Injury Case Evaluation & Accident Intake',
  'Confidential legal intake capturing motor vehicle, slip & fall, or workplace accident specifics.',
  'Structured for litigation law firms. Collects accident date, location, injury treatment records, police report numbers, and insurance carrier info.',
  'application',
  'legal',
  '#0f766e',
  [
    { id: 'client_name', type: 'short_answer', label: 'Injured Party Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Primary Contact Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'accident_date', type: 'date', label: 'Date of Incident', required: true, width: 'half', stepId: 'step-2' },
    { id: 'incident_type', type: 'dropdown', label: 'Accident Category', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Car / Truck / Motorcycle Collision', value: 'auto' }, { label: 'Rideshare (Uber/Lyft) Passenger/Driver', value: 'rideshare' }, { label: 'Slip, Trip & Fall on Commercial Property', value: 'premises' }, { label: 'Construction / Workplace Injury', value: 'workplace' }, { label: 'Bicycle / Pedestrian Struck', value: 'pedestrian' }] },
    { id: 'medical_care_received', type: 'checkbox', label: 'Medical Treatment Received So Far', width: 'full', stepId: 'step-2',
      options: [{ label: 'Emergency Room / Ambulance Transport', value: 'er' }, { label: 'Hospitalization / Surgery Required', value: 'hospital' }, { label: 'Physical Therapy / Chiropractic Care', value: 'pt' }, { label: 'Missed Work / Lost Wages', value: 'lost_wages' }] },
    { id: 'accident_description', type: 'long_answer', label: 'Brief Summary of How the Incident Occurred', required: true, width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Client Contact' }, { id: 'step-2', title: 'Accident Facts' }],
  ['personal injury intake form', 'accident case evaluation', 'car accident lawyer intake', 'injury claim questionnaire'],
  [{ question: 'Is there a consultation fee?', answer: 'Personal injury case evaluations are 100% free with contingency fee representation (no fee unless we win).' }],
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80'
);

// 2. Real Estate Home Buyer Search
const REAL_ESTATE_BUYER = makeProfTemplate(
  'real-estate-home-buyer-brief',
  'Exclusive Home Buyer Dream Property Questionnaire',
  'VIP buyer representation brief collecting target neighborhoods, budget range, and essential amenities.',
  'Designed for luxury realtors and buyer agents. Gathers pre-approval status, target school districts, and timeline.',
  'request',
  'real_estate',
  '#0369a1',
  [
    { id: 'buyer_name', type: 'short_answer', label: 'Buyer Name(s)', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'target_budget', type: 'dropdown', label: 'Target Purchase Price Range', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: '$400k – $650k', value: '400_650' }, { label: '$650k – $1M', value: '650_1m' }, { label: '$1M – $2M (Luxury)', value: '1m_2m' }, { label: '$2M+ (Ultra Luxury)', value: '2m_plus' }] },
    { id: 'pre_approval_status', type: 'dropdown', label: 'Mortgage Pre-Approval Status', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Pre-Approved with Lender Letter in Hand', value: 'preapproved' }, { label: 'All-Cash Buyer (Proof of Funds Ready)', value: 'cash' }, { label: 'Need Lender Recommendations', value: 'need_lender' }, { label: 'Browsing / Early Stages', value: 'early' }] },
    { id: 'bedrooms_bathrooms', type: 'dropdown', label: 'Desired Layout', width: 'half', stepId: 'step-2',
      options: [{ label: '3+ Beds / 2+ Baths', value: '3_2' }, { label: '4+ Beds / 3+ Baths', value: '4_3' }, { label: '5+ Beds / 4+ Baths (Estate)', value: '5_4' }] },
    { id: 'must_have_features', type: 'checkbox', label: 'Must-Have Features', width: 'full', stepId: 'step-2',
      options: [{ label: 'Private Swimming Pool', value: 'pool' }, { label: 'Dedicated Home Office', value: 'office' }, { label: 'Large Fenced Yard / Acreage', value: 'yard' }, { label: 'Top-Rated School District', value: 'schools' }] },
  ],
  [{ id: 'step-1', title: 'Buyer Profile' }, { id: 'step-2', title: 'Property Criteria' }],
  ['home buyer questionnaire', 'real estate buyer intake', 'realtor property search form', 'luxury home buyer brief'],
  [{ question: 'How quickly do you set up MLS automated alerts?', answer: 'We configure custom instant MLS alert feeds within 2 hours of receiving your brief.' }],
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
);

// 3. Small Business Bookkeeping & Tax Organizer
const BUSINESS_TAX = makeProfTemplate(
  'business-tax-bookkeeping-organizer',
  'Small Business Bookkeeping & Annual Tax Organizer',
  'Corporate entity tax preparation discovery capturing revenue, payroll, 1099s, and bookkeeping platform.',
  'For CPAs and accounting firms. Gathers entity structure (LLC, S-Corp, C-Corp, Sole Prop), software (QuickBooks/Xero), and tax filing deadlines.',
  'request',
  'accounting',
  '#15803d',
  [
    { id: 'company_name', type: 'short_answer', label: 'Legal Company Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'owner_name', type: 'short_answer', label: 'Primary Owner / Officer', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Accounting Email', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'entity_structure', type: 'dropdown', label: 'Entity Classification', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'S-Corporation (Form 1120-S)', value: 's_corp' }, { label: 'Limited Liability Company (LLC)', value: 'llc' }, { label: 'C-Corporation (Form 1120)', value: 'c_corp' }, { label: 'Partnership (Form 1065)', value: 'partnership' }, { label: 'Sole Proprietor / Schedule C', value: 'sole_prop' }] },
    { id: 'annual_revenue', type: 'dropdown', label: 'Gross Annual Revenue', width: 'half', stepId: 'step-2',
      options: [{ label: 'Under $250,000', value: 'under_250k' }, { label: '$250,000 – $1,000,000', value: '250k_1m' }, { label: '$1,000,000 – $5,000,000', value: '1m_5m' }, { label: '$5M+ Mid-Market', value: '5m_plus' }] },
    { id: 'accounting_software', type: 'dropdown', label: 'Current Accounting System', width: 'full', stepId: 'step-2',
      options: [{ label: 'QuickBooks Online (QBO)', value: 'qbo' }, { label: 'Xero Cloud Accounting', value: 'xero' }, { label: 'QuickBooks Desktop / Enterprise', value: 'qb_desktop' }, { label: 'Spreadsheets / Need Cleanup', value: 'cleanup' }] },
  ],
  [{ id: 'step-1', title: 'Business Info' }, { id: 'step-2', title: 'Financial Profile' }],
  ['business tax organizer', 'cpa bookkeeping intake', 's-corp tax preparation form', 'accounting discovery questionnaire'],
  [{ question: 'Can you help with multi-year back taxes and cleanup?', answer: 'Yes, our forensic accounting team specializes in rapid bookkeeping cleanup and multi-year back filing.' }],
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80'
);

export function registerProfessionalExtendedTemplates(): void {
  registerTemplate(PERSONAL_INJURY);
  registerTemplate(REAL_ESTATE_BUYER);
  registerTemplate(BUSINESS_TAX);
}

// Auto-register
registerProfessionalExtendedTemplates();
