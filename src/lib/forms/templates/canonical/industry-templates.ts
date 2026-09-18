/**
 * Industry canonical form templates (T1.2-c).
 *
 * 16 curated templates covering REAL ESTATE, LEGAL, EDUCATION,
 * ECOMMERCE / RETAIL, RESTAURANT, FITNESS, NONPROFIT, and AUTOMOTIVE.
 * Each template is a real, production-usable form — not a stub.
 *
 * All templates are registered with the in-memory registry at module
 * load time via `registerTemplate()`. Importing this file populates the
 * registry so `searchTemplates()` and `getTemplate()` can return them.
 *
 * Style conventions (inherited from `_placeholder.ts`):
 *   - kebab-case ids, used as URL slugs
 *   - 6-12 fields per schema
 *   - `type: 'signature'` for waivers/consent
 *   - `type: 'photo'` for property/damage photos
 *   - `type: 'control_widget'` + widgetType 'payment_gateway' + widgetConfig.gatewayId 'stripe' for payments
 *   - emerald theme by default (overridden per-template where appropriate)
 *   - createdAt/updatedAt set to "now" at module load
 */
import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

const NOW = new Date().toISOString();

// ─── Shared theme palettes ────────────────────────────────────────────────
const THEME_EMERALD = {
  primaryColor: '#059669',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderRadius: '0.75rem',
  layout: 'card' as const,
};
const THEME_INDIGO = {
  primaryColor: '#4f46e5',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderRadius: '0.75rem',
  layout: 'card' as const,
};
const THEME_AMBER = {
  primaryColor: '#d97706',
  backgroundColor: '#fffbeb',
  textColor: '#1c1917',
  borderRadius: '0.75rem',
  layout: 'card' as const,
};
const THEME_ROSE = {
  primaryColor: '#e11d48',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: '0.75rem',
  layout: 'card' as const,
};
const THEME_SKY = {
  primaryColor: '#0284c7',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderRadius: '0.75rem',
  layout: 'card' as const,
};

// ─── 1. Property Tour Request Form (REAL ESTATE) ──────────────────────────
const PROPERTY_TOUR_REQUEST_FORM: FormTemplate = {
  id: 'property-tour-request-form',
  name: 'Property Tour Request Form',
  shortDescription: 'Let buyers request an in-person or virtual property tour with preferred times.',
  description:
    'A real estate tour request form that captures buyer contact details, the property they want to see, and their preferred date/time. Designed for listing pages and agent websites to convert casual browsers into booked showings.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Tour Request' }],
    fields: [
      { id: 'buyer_name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'buyer_email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'buyer_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'property_address', type: 'short_answer', label: 'Property of Interest', placeholder: '123 Main St, Springfield, IL', required: true, width: 'half' },
      { id: 'mls_id', type: 'short_answer', label: 'MLS / Listing ID', placeholder: 'e.g. MLS-12345678', helpText: 'Optional — helps us locate the exact listing.', width: 'half' },
      { id: 'tour_type', type: 'radio', label: 'Tour Type', required: true, width: 'half', options: [
        { label: 'In-Person Tour', value: 'in_person' },
        { label: 'Virtual Tour (Video Call)', value: 'virtual' },
        { label: 'Self-Guided Tour', value: 'self_guided' },
      ] },
      { id: 'preferred_date', type: 'date', label: 'Preferred Tour Date', required: true, width: 'half' },
      { id: 'preferred_time', type: 'time', label: 'Preferred Tour Time', required: true, width: 'half' },
      { id: 'alternate_date', type: 'date', label: 'Alternate Date', width: 'half' },
      { id: 'alternate_time', type: 'time', label: 'Alternate Time', width: 'half' },
      { id: 'additional_notes', type: 'long_answer', label: 'Additional Notes', placeholder: 'Any questions about the property, accessibility needs, etc.', width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Request Tour',
      successTitle: 'Tour Request Received!',
      successMessage: 'Your agent will reach out within 2 business hours to confirm the tour time.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'property_tour_request', pipelineStage: 'tour_requested' },
      },
    },
  },
  categories: ['booking', 'real_estate'],
  industries: ['real_estate'],
  useCases: ['appointment_booking', 'lead_generation'],
  audiences: ['b2c'],
  tags: ['real-estate', 'property-tour', 'showing', 'buyer', 'listing'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Property Tour Request Form Template — Free & Mobile-Friendly',
    seoDescription:
      'Let home buyers request in-person or virtual property tours with preferred dates and times. A clean, mobile-friendly real estate form template. Free to use.',
    seoKeywords: ['property tour form', 'real estate showing form', 'house tour request', 'agent tour booking'],
    faq: [
      { question: 'How does the property tour request form work?', answer: 'Buyers fill out the form on your listing page with their contact details and preferred tour date/time. You receive an email notification and a CRM lead is created so you can follow up to confirm the appointment.' },
      { question: 'Can buyers request a virtual tour?', answer: 'Yes. The form includes a tour type selector for in-person, virtual (video call), or self-guided tours.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 2. Real Estate Lead Capture Form (REAL ESTATE) ───────────────────────
const REAL_ESTATE_LEAD_CAPTURE_FORM: FormTemplate = {
  id: 'real-estate-lead-capture-form',
  name: 'Real Estate Lead Capture Form',
  shortDescription: 'Qualify buyer leads with property type, budget range, timeline, and location.',
  description:
    'A lead capture form that asks the right qualifying questions upfront: property type, budget range, timeline, and location. Helps agents prioritize follow-up and route hot leads first. Drop it on landing pages, Facebook ads, or your homepage.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Tell Us What You\u2019re Looking For' }],
    fields: [
      { id: 'lead_name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'lead_email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'lead_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'lead_zip', type: 'short_answer', label: 'Target ZIP / City', placeholder: 'e.g. 90210 or Austin, TX', required: true, width: 'half' },
      { id: 'property_type', type: 'dropdown', label: 'Property Type', required: true, width: 'half', options: [
        { label: 'Single Family Home', value: 'single_family' },
        { label: 'Condo / Apartment', value: 'condo' },
        { label: 'Townhouse', value: 'townhouse' },
        { label: 'Multi-Family', value: 'multi_family' },
        { label: 'Land / Lot', value: 'land' },
        { label: 'Commercial', value: 'commercial' },
      ] },
      { id: 'budget_range', type: 'dropdown', label: 'Budget Range', required: true, width: 'half', options: [
        { label: 'Under $200K', value: 'under_200k' },
        { label: '$200K \u2013 $400K', value: '200k_400k' },
        { label: '$400K \u2013 $750K', value: '400k_750k' },
        { label: '$750K \u2013 $1M', value: '750k_1m' },
        { label: '$1M \u2013 $2M', value: '1m_2m' },
        { label: '$2M+', value: 'over_2m' },
      ] },
      { id: 'timeline', type: 'dropdown', label: 'Purchase Timeline', required: true, width: 'half', options: [
        { label: 'ASAP (0\u201330 days)', value: 'asap' },
        { label: '1\u20133 months', value: '1_3_months' },
        { label: '3\u20136 months', value: '3_6_months' },
        { label: '6\u201312 months', value: '6_12_months' },
        { label: 'Just researching', value: 'researching' },
      ] },
      { id: 'bedrooms', type: 'numerical', label: 'Min. Bedrooms', width: 'half', validation: { min: 0, max: 20 } },
      { id: 'bathrooms', type: 'numerical', label: 'Min. Bathrooms', width: 'half', validation: { min: 0, max: 20 } },
      { id: 'preferred_contact', type: 'radio', label: 'Preferred Contact Method', required: true, width: 'full', options: [
        { label: 'Phone Call', value: 'phone' },
        { label: 'Text Message', value: 'text' },
        { label: 'Email', value: 'email' },
      ] },
      { id: 'message', type: 'long_answer', label: 'Anything specific you\u2019re looking for?', placeholder: 'Must-have features, neighborhoods, schools, etc.', width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Get Matched',
      successTitle: 'Thanks! We\u2019ll Be In Touch',
      successMessage: 'A local agent will reach out within 1 business hour with matching properties.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'real_estate_lead_capture', pipelineStage: 'new_lead' },
      },
    },
  },
  categories: ['lead_generation', 'real_estate'],
  industries: ['real_estate'],
  useCases: ['lead_generation'],
  audiences: ['b2c'],
  tags: ['real-estate', 'lead-capture', 'buyer', 'budget', 'qualification'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Real Estate Lead Capture Form Template — Free',
    seoDescription:
      'Capture and qualify buyer leads with property type, budget range, timeline, and location fields. Free real estate lead form template for agents and brokerages.',
    seoKeywords: ['real estate lead form', 'buyer lead capture', 'realtor lead form', 'property lead template'],
    faq: [
      { question: 'What makes a good real estate lead form?', answer: 'A good lead form asks only the qualifying questions an agent needs to prioritize follow-up: property type, budget range, timeline, and location. Avoid asking for too much info upfront \u2014 each extra field lowers conversion.' },
      { question: 'Does this form create a CRM lead automatically?', answer: 'Yes. The submission action createCrmLead is enabled by default with source "real_estate_lead_capture" and pipeline stage "new_lead", so submissions flow straight into your sales pipeline.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 3. Tenant Application Form (REAL ESTATE) ─────────────────────────────
const TENANT_APPLICATION_FORM: FormTemplate = {
  id: 'tenant-application-form',
  name: 'Tenant Application Form',
  shortDescription: 'Collect rental history, employment, income, and references for tenant screening.',
  description:
    'A complete rental application that captures employment, income, rental history, and references. Includes a background check consent and signature field so landlords can move straight to screening.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Rental Application' }],
    fields: [
      { id: 'applicant_name', type: 'short_answer', label: 'Full Legal Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'applicant_email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'applicant_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'current_address', type: 'address', label: 'Current Address', required: true, width: 'full' },
      { id: 'employment_status', type: 'dropdown', label: 'Employment Status', required: true, width: 'half', options: [
        { label: 'Employed Full-Time', value: 'employed_ft' },
        { label: 'Employed Part-Time', value: 'employed_pt' },
        { label: 'Self-Employed', value: 'self_employed' },
        { label: 'Retired', value: 'retired' },
        { label: 'Student', value: 'student' },
        { label: 'Unemployed', value: 'unemployed' },
      ] },
      { id: 'employer', type: 'short_answer', label: 'Employer / Business Name', placeholder: 'Acme Corp.', width: 'half' },
      { id: 'monthly_income', type: 'currency', label: 'Gross Monthly Income (USD)', required: true, width: 'half' },
      { id: 'rental_history', type: 'long_answer', label: 'Rental History (last 3 years)', placeholder: 'Address, landlord name & phone, dates, monthly rent, reason for leaving.', required: true, width: 'full' },
      { id: 'reference_1_name', type: 'short_answer', label: 'Reference 1 \u2014 Name', required: true, width: 'third' },
      { id: 'reference_1_phone', type: 'phone', label: 'Reference 1 \u2014 Phone', required: true, width: 'third' },
      { id: 'reference_1_relationship', type: 'short_answer', label: 'Reference 1 \u2014 Relationship', placeholder: 'e.g. Previous landlord', width: 'third' },
      { id: 'background_check_consent', type: 'checkbox', label: 'I authorize a credit and background check.', required: true, width: 'full' },
      { id: 'signature', type: 'signature', label: 'Applicant Signature', required: true, width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Submit Application',
      successTitle: 'Application Received',
      successMessage: 'Your application has been submitted. We\u2019ll review and respond within 48 hours.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'tenant_application', pipelineStage: 'application_received' },
      },
    },
  },
  categories: ['application', 'real_estate'],
  industries: ['real_estate'],
  useCases: ['customer_onboarding'],
  audiences: ['b2c'],
  tags: ['tenant', 'rental', 'application', 'screening', 'lease'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Tenant Application Form Template — Free Rental Form',
    seoDescription:
      'Collect employment, income, rental history, and references from rental applicants. Includes background check consent and e-signature. Free landlord template.',
    seoKeywords: ['tenant application', 'rental application form', 'lease application', 'landlord form'],
    faq: [
      { question: 'Is the signature legally binding?', answer: 'The signature field captures an e-signature that signals the applicant\u2019s intent to consent to the background check. Pair with your local jurisdiction\u2019s e-signature laws for full compliance.' },
      { question: 'Can I add a co-applicant?', answer: 'Yes \u2014 once you use this template, you can duplicate the applicant fields in the builder to capture a co-applicant or guarantor.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 4. Legal Client Intake Form (LEGAL) ──────────────────────────────────
const LEGAL_CLIENT_INTAKE_FORM: FormTemplate = {
  id: 'legal-client-intake-form',
  name: 'Legal Client Intake Form',
  shortDescription: 'Capture case type, parties, brief description, and run a conflict check.',
  description:
    'A comprehensive legal client intake form covering case type, opposing party details, brief case description, desired outcome, and a conflict-check acknowledgment. Designed for law firms to screen new clients before opening a matter.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'New Client Intake' }],
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Full Legal Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'client_email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'client_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'client_address', type: 'address', label: 'Mailing Address', required: true, width: 'full' },
      { id: 'case_type', type: 'dropdown', label: 'Case Type / Practice Area', required: true, width: 'half', options: [
        { label: 'Personal Injury', value: 'personal_injury' },
        { label: 'Family Law', value: 'family' },
        { label: 'Criminal Defense', value: 'criminal' },
        { label: 'Bankruptcy', value: 'bankruptcy' },
        { label: 'Immigration', value: 'immigration' },
        { label: 'Estate Planning', value: 'estate' },
        { label: 'Business / Commercial', value: 'business' },
        { label: 'Employment', value: 'employment' },
        { label: 'Real Estate', value: 'real_estate' },
        { label: 'Other', value: 'other' },
      ] },
      { id: 'opposing_party_name', type: 'short_answer', label: 'Opposing Party Name', placeholder: 'John Smith (or business)', required: true, width: 'half', helpText: 'Required for conflict-of-interest screening.' },
      { id: 'opposing_party_address', type: 'address', label: 'Opposing Party Address (if known)', width: 'full' },
      { id: 'brief_description', type: 'long_answer', label: 'Brief Description of the Matter', required: true, placeholder: 'Describe what happened, key dates, and any upcoming deadlines.', width: 'full' },
      { id: 'desired_outcome', type: 'long_answer', label: 'Desired Outcome', placeholder: 'What do you want to achieve?', required: true, width: 'full' },
      { id: 'prior_attorney', type: 'short_answer', label: 'Have you consulted another attorney?', placeholder: 'Name / firm, or "none"', width: 'half' },
      { id: 'how_did_you_hear', type: 'short_answer', label: 'How did you hear about us?', placeholder: 'Google, referral, etc.', width: 'half' },
      { id: 'conflict_check_ack', type: 'checkbox', label: 'I acknowledge the firm will run a conflict-of-interest check before opening my matter.', required: true, width: 'full' },
    ],
    rules: [],
    theme: THEME_INDIGO,
    settings: {
      submitButtonText: 'Submit Intake',
      successTitle: 'Intake Received',
      successMessage: 'A member of our team will review your information and contact you within 1 business day.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'legal_intake', pipelineStage: 'intake_received' },
      },
    },
  },
  categories: ['legal', 'intake'],
  industries: ['legal'],
  useCases: ['intake', 'lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['legal', 'law-firm', 'intake', 'conflict-check', 'attorney'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Legal Client Intake Form Template — Free for Law Firms',
    seoDescription:
      'Capture case type, parties, brief description, and run a conflict check before opening a matter. Free lawyer intake form template for any practice area.',
    seoKeywords: ['legal intake form', 'lawyer intake', 'attorney client intake', 'law firm intake template'],
    faq: [
      { question: 'Why does this form ask for the opposing party?', answer: 'Law firms are ethically required to check for conflicts of interest before taking a new client. Capturing the opposing party name and address lets the firm run a conflict check before opening the matter.' },
      { question: 'Can I customize the case types?', answer: 'Yes. The dropdown options for case type are fully editable in the form builder \u2014 add or remove practice areas to match what your firm handles.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 5. Legal Consultation Request Form (LEGAL) ───────────────────────────
const LEGAL_CONSULTATION_REQUEST_FORM: FormTemplate = {
  id: 'legal-consultation-request-form',
  name: 'Legal Consultation Request Form',
  shortDescription: 'Book a paid or free legal consultation by practice area and preferred time.',
  description:
    'A lighter-weight consultation request form for prospective clients to schedule a call or meeting. Captures practice area, preferred consultation mode (phone, video, in-person), and a brief description of the issue so the attorney can prepare.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Consultation Request' }],
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'client_email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'client_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'practice_area', type: 'dropdown', label: 'Practice Area', required: true, width: 'half', options: [
        { label: 'Personal Injury', value: 'personal_injury' },
        { label: 'Family Law / Divorce', value: 'family' },
        { label: 'Criminal Defense', value: 'criminal' },
        { label: 'Immigration', value: 'immigration' },
        { label: 'Business / Contracts', value: 'business' },
        { label: 'Estate Planning', value: 'estate' },
        { label: 'Real Estate', value: 'real_estate' },
        { label: 'Other', value: 'other' },
      ] },
      { id: 'consultation_type', type: 'radio', label: 'Consultation Mode', required: true, width: 'half', options: [
        { label: 'Phone Call', value: 'phone' },
        { label: 'Video (Zoom)', value: 'video' },
        { label: 'In-Person', value: 'in_person' },
      ] },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, width: 'half' },
      { id: 'preferred_time', type: 'time', label: 'Preferred Time', required: true, width: 'half' },
      { id: 'brief_description', type: 'long_answer', label: 'Brief Description of Your Situation', placeholder: 'A few sentences so the attorney can prepare.', required: true, width: 'full' },
    ],
    rules: [],
    theme: THEME_INDIGO,
    settings: {
      submitButtonText: 'Request Consultation',
      successTitle: 'Request Received',
      successMessage: 'Our scheduling team will confirm your appointment within 1 business day.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'legal_consultation_request', pipelineStage: 'consultation_requested' },
      },
    },
  },
  categories: ['booking', 'legal'],
  industries: ['legal'],
  useCases: ['appointment_booking', 'lead_generation'],
  audiences: ['b2c'],
  tags: ['legal', 'consultation', 'booking', 'attorney', 'appointment'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Legal Consultation Request Form — Free Template',
    seoDescription:
      'Let prospective clients book a phone, video, or in-person consultation by practice area and preferred time. Free lawyer consultation form template.',
    seoKeywords: ['legal consultation form', 'lawyer appointment', 'attorney consultation request', 'law firm booking'],
    faq: [
      { question: 'What\u2019s the difference between this and the full legal intake?', answer: 'This consultation request form is short \u2014 just enough to book the meeting. Use the full legal-client-intake-form AFTER the prospect agrees to retain the firm, to collect conflict-check data, opposing party info, and full case details.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 6. Course Registration Form (EDUCATION) ──────────────────────────────
const COURSE_REGISTRATION_FORM: FormTemplate = {
  id: 'course-registration-form',
  name: 'Course Registration Form',
  shortDescription: 'Register students for courses with prerequisites check and payment.',
  description:
    'A course registration form for schools, tutoring centers, and online academies. Captures student info, course selection, prerequisite verification, and a signed acknowledgment. Add a payment widget for paid courses.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Course Registration' }],
    fields: [
      { id: 'student_name', type: 'short_answer', label: 'Student Full Name', required: true, width: 'half' },
      { id: 'student_email', type: 'email', label: 'Student Email', required: true, width: 'half' },
      { id: 'student_phone', type: 'phone', label: 'Student Phone', width: 'half' },
      { id: 'student_id', type: 'short_answer', label: 'Student ID', placeholder: 'e.g. STU-2025-001', width: 'half' },
      { id: 'course_selection', type: 'dropdown', label: 'Course', required: true, width: 'half', options: [
        { label: 'Introduction to Computer Science (CS101)', value: 'cs101' },
        { label: 'Calculus I (MATH201)', value: 'math201' },
        { label: 'English Composition (ENG101)', value: 'eng101' },
        { label: 'Biology Fundamentals (BIO110)', value: 'bio110' },
        { label: 'Spanish I (SPA101)', value: 'spa101' },
        { label: 'Business Statistics (BUS220)', value: 'bus220' },
      ] },
      { id: 'term', type: 'dropdown', label: 'Term', required: true, width: 'half', options: [
        { label: 'Fall 2025', value: 'fall_2025' },
        { label: 'Spring 2026', value: 'spring_2026' },
        { label: 'Summer 2026', value: 'summer_2026' },
      ] },
      { id: 'prerequisites_completed', type: 'checkbox', label: 'I confirm I have completed the listed prerequisites for this course.', required: true, width: 'full' },
      { id: 'prerequisites_list', type: 'long_answer', label: 'List completed prerequisite courses', placeholder: 'e.g. CS100, MATH150', width: 'full' },
      { id: 'payment_method', type: 'radio', label: 'Payment Method', required: true, width: 'full', options: [
        { label: 'Credit Card (Stripe)', value: 'stripe' },
        { label: 'Invoice / Bursar Account', value: 'invoice' },
        { label: 'Financial Aid', value: 'financial_aid' },
        { label: 'Free / No Charge', value: 'free' },
      ] },
      { id: 'acknowledgment_signature', type: 'signature', label: 'Student Acknowledgment', required: true, width: 'full', helpText: 'I confirm the information above is accurate and I agree to the course policies.' },
    ],
    rules: [],
    theme: THEME_SKY,
    settings: {
      submitButtonText: 'Register',
      successTitle: 'Registration Confirmed!',
      successMessage: 'You\u2019re registered. A confirmation email is on its way with course details.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'course_registration' },
      },
    },
  },
  categories: ['registration', 'education'],
  industries: ['education'],
  useCases: ['customer_onboarding', 'event_registration'],
  audiences: ['b2c', 'education'],
  tags: ['education', 'course', 'registration', 'student', 'enrollment'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Course Registration Form Template — Free School Form',
    seoDescription:
      'Register students for courses with prerequisite verification and e-signature. Free course registration form template for schools, academies, and online courses.',
    seoKeywords: ['course registration form', 'student enrollment', 'school registration', 'online course form'],
    faq: [
      { question: 'Can I collect course fees with this form?', answer: 'Yes. The form includes a payment method selector. To accept credit cards, swap the "Credit Card (Stripe)" radio option for a payment_gateway widget in the builder.' },
      { question: 'How do I handle prerequisites?', answer: 'A checkbox asks students to confirm they have completed prerequisites, and a long-answer field lets them list which courses. You can add conditional logic to require this only when a course with prerequisites is selected.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 7. Student Feedback Form (EDUCATION) ─────────────────────────────────
const STUDENT_FEEDBACK_FORM: FormTemplate = {
  id: 'student-feedback-form',
  name: 'Student Feedback Form',
  shortDescription: 'Collect course evaluations, instructor ratings, and improvement ideas.',
  description:
    'An end-of-course feedback form for students to rate the course, instructor, materials, and pace. Open-ended questions surface what students loved and what to improve. Anonymous-friendly.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Course Feedback' }],
    fields: [
      { id: 'course_name', type: 'short_answer', label: 'Course Name', required: true, width: 'half' },
      { id: 'instructor_name', type: 'short_answer', label: 'Instructor Name', required: true, width: 'half' },
      { id: 'term', type: 'dropdown', label: 'Term', required: true, width: 'half', options: [
        { label: 'Fall 2025', value: 'fall_2025' },
        { label: 'Spring 2026', value: 'spring_2026' },
        { label: 'Summer 2026', value: 'summer_2026' },
      ] },
      { id: 'overall_rating', type: 'rating', label: 'Overall Course Rating', required: true, width: 'half' },
      { id: 'instructor_rating', type: 'rating', label: 'Instructor Effectiveness', required: true, width: 'half' },
      { id: 'materials_rating', type: 'rating', label: 'Quality of Course Materials', required: true, width: 'half' },
      { id: 'course_pace', type: 'radio', label: 'Course Pace', required: true, width: 'full', options: [
        { label: 'Too Slow', value: 'too_slow' },
        { label: 'Just Right', value: 'just_right' },
        { label: 'Too Fast', value: 'too_fast' },
      ] },
      { id: 'what_you_liked', type: 'long_answer', label: 'What did you like most about the course?', width: 'full' },
      { id: 'what_to_improve', type: 'long_answer', label: 'What could be improved?', width: 'full' },
      { id: 'would_recommend', type: 'radio', label: 'Would you recommend this course to a peer?', required: true, width: 'full', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'No', value: 'no' },
      ] },
      { id: 'additional_comments', type: 'long_answer', label: 'Additional Comments', width: 'full' },
    ],
    rules: [],
    theme: THEME_SKY,
    settings: {
      submitButtonText: 'Submit Feedback',
      successTitle: 'Thanks for Your Feedback!',
      successMessage: 'Your responses will help us improve this course for future students.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
      },
    },
  },
  categories: ['feedback', 'survey'],
  industries: ['education'],
  useCases: ['customer_feedback', 'assessment'],
  audiences: ['education', 'b2c'],
  tags: ['education', 'feedback', 'course-evaluation', 'student', 'survey'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Student Feedback Form Template — Free Course Evaluation',
    seoDescription:
      'Collect end-of-course feedback with instructor ratings, pace feedback, and improvement ideas. Free student feedback form template for schools and online courses.',
    seoKeywords: ['student feedback form', 'course evaluation', 'student survey', 'instructor rating'],
    faq: [
      { question: 'Can responses be anonymous?', answer: 'Yes. The form does not require a student name or email by default. If you need identifiable responses, add a name/email field in the builder.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 8. Product Order Form (ECOMMERCE / RETAIL) ────────────────────────────
const PRODUCT_ORDER_FORM: FormTemplate = {
  id: 'product-order-form',
  name: 'Product Order Form',
  shortDescription: 'Take product orders online with quantity, variants, shipping, and payment.',
  description:
    'A ready-to-use product order form for small e-commerce sites, pop-ups, and direct sales. Captures product selection, quantity, size/color variants, shipping address, and processes payment via Stripe.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Place Your Order' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'customer_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'customer_phone', type: 'phone', label: 'Phone Number', width: 'half' },
      { id: 'shipping_address', type: 'address', label: 'Shipping Address', required: true, width: 'full' },
      { id: 'product', type: 'dropdown', label: 'Product', required: true, width: 'half', options: [
        { label: 'Classic T-Shirt', value: 'tshirt', price: 25 },
        { label: 'Hoodie', value: 'hoodie', price: 55 },
        { label: 'Tote Bag', value: 'tote', price: 18 },
        { label: 'Coffee Mug', value: 'mug', price: 14 },
        { label: 'Sticker Pack (10 pcs)', value: 'stickers', price: 9 },
      ] },
      { id: 'quantity', type: 'numerical', label: 'Quantity', required: true, width: 'half', defaultValue: 1, validation: { min: 1, max: 999 } },
      { id: 'size', type: 'dropdown', label: 'Size (apparel)', width: 'half', options: [
        { label: 'XS', value: 'xs' },
        { label: 'S', value: 's' },
        { label: 'M', value: 'm' },
        { label: 'L', value: 'l' },
        { label: 'XL', value: 'xl' },
        { label: 'XXL', value: 'xxl' },
        { label: 'N/A', value: 'na' },
      ] },
      { id: 'color', type: 'dropdown', label: 'Color', width: 'half', options: [
        { label: 'Black', value: 'black' },
        { label: 'White', value: 'white' },
        { label: 'Navy', value: 'navy' },
        { label: 'Heather Gray', value: 'gray' },
        { label: 'Forest Green', value: 'green' },
      ] },
      { id: 'shipping_method', type: 'radio', label: 'Shipping Method', required: true, width: 'full', options: [
        { label: 'Standard (5\u20137 days) \u2014 $5.95', value: 'standard', price: 5.95 },
        { label: 'Express (2\u20133 days) \u2014 $12.95', value: 'express', price: 12.95 },
        { label: 'Local Pickup \u2014 Free', value: 'pickup', price: 0 },
      ] },
      { id: 'payment', type: 'control_widget', label: 'Payment', required: true, width: 'full', widgetType: 'payment_gateway', widgetConfig: { gatewayId: 'stripe' } },
      { id: 'order_notes', type: 'long_answer', label: 'Order Notes', placeholder: 'Gift message, special instructions, etc.', width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Place Order',
      successTitle: 'Order Placed!',
      successMessage: 'A confirmation email with tracking info will be sent shortly.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'product_order' },
      },
    },
  },
  categories: ['order', 'payment'],
  industries: ['ecommerce', 'retail'],
  useCases: ['customer_onboarding'],
  audiences: ['b2c'],
  tags: ['ecommerce', 'order', 'product', 'stripe', 'checkout'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Product Order Form Template with Stripe Payment',
    seoDescription:
      'Take product orders online with quantity, size/color variants, shipping, and Stripe payment. Free e-commerce order form template.',
    seoKeywords: ['product order form', 'online order form', 'ecommerce form', 'stripe order form'],
    faq: [
      { question: 'How does the Stripe payment work?', answer: 'The form uses a payment_gateway widget wired to Stripe. You\u2019ll need to connect your Stripe account in the builder settings before publishing \u2014 then charges process automatically on submit.' },
      { question: 'Can I add more products?', answer: 'Yes. The product dropdown is fully editable in the builder \u2014 add as many products as you want, each with an optional price.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 9. Return Request Form (ECOMMERCE / RETAIL) ──────────────────────────
const RETURN_REQUEST_FORM: FormTemplate = {
  id: 'return-request-form',
  name: 'Return Request Form',
  shortDescription: 'Process product returns with order number, reason, photos, and refund method.',
  description:
    'A customer-friendly return request form that captures the order number, item, reason for return, photos of the item (for damaged/wrong items), preferred resolution, and refund method. Speeds up your returns team.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Return Request' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'customer_email', type: 'email', label: 'Email Used for Order', required: true, width: 'half' },
      { id: 'order_number', type: 'short_answer', label: 'Order Number', placeholder: 'e.g. ORD-12345', required: true, width: 'half' },
      { id: 'order_date', type: 'date', label: 'Order Date', width: 'half' },
      { id: 'item_name', type: 'short_answer', label: 'Item to Return', required: true, width: 'half' },
      { id: 'item_sku', type: 'short_answer', label: 'SKU / Item ID', width: 'half' },
      { id: 'reason', type: 'dropdown', label: 'Reason for Return', required: true, width: 'half', options: [
        { label: 'Defective / Damaged', value: 'defective' },
        { label: 'Wrong Item Received', value: 'wrong_item' },
        { label: 'Item Not as Described', value: 'not_as_described' },
        { label: 'Arrived Late', value: 'late' },
        { label: 'Changed My Mind', value: 'changed_mind' },
        { label: 'No Longer Needed', value: 'not_needed' },
        { label: 'Other', value: 'other' },
      ] },
      { id: 'reason_details', type: 'long_answer', label: 'Details', required: true, placeholder: 'Tell us what went wrong so we can fix it.', width: 'full' },
      { id: 'preferred_resolution', type: 'radio', label: 'Preferred Resolution', required: true, width: 'full', options: [
        { label: 'Refund', value: 'refund' },
        { label: 'Exchange for Same Item', value: 'exchange_same' },
        { label: 'Exchange for Different Item', value: 'exchange_diff' },
        { label: 'Store Credit', value: 'store_credit' },
      ] },
      { id: 'refund_method', type: 'dropdown', label: 'Refund Method', width: 'half', options: [
        { label: 'Original Payment Method', value: 'original' },
        { label: 'Store Credit', value: 'store_credit' },
        { label: 'Bank Transfer', value: 'bank' },
      ] },
      { id: 'item_photos', type: 'photo', label: 'Photo(s) of Item', helpText: 'Required for damaged/wrong-item claims. Helps us process faster.', width: 'full' },
      { id: 'signature', type: 'signature', label: 'Customer Signature', required: true, helpText: 'Confirms the return request is accurate.', width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Submit Return Request',
      successTitle: 'Return Request Submitted',
      successMessage: 'Your RMA number and return shipping label will be emailed within 1 business day.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
      },
    },
  },
  categories: ['customer_service', 'order'],
  industries: ['ecommerce', 'retail'],
  useCases: ['service_request', 'customer_feedback'],
  audiences: ['b2c'],
  tags: ['ecommerce', 'returns', 'refund', 'rma', 'customer-service'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Return Request Form Template — Free E-commerce Form',
    seoDescription:
      'Process product returns with order number, reason, photo upload, preferred resolution, and refund method. Free return request form for online stores.',
    seoKeywords: ['return request form', 'refund form', 'rma form', 'ecommerce return'],
    faq: [
      { question: 'Why does this form ask for a photo?', answer: 'For damaged or wrong-item claims, a photo lets your team verify the issue before authorizing a refund or exchange. The photo field is optional by default \u2014 make it required in the builder if you prefer.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 10. Restaurant Reservation Form (RESTAURANT) ─────────────────────────
const RESTAURANT_RESERVATION_FORM: FormTemplate = {
  id: 'restaurant-reservation-form',
  name: 'Restaurant Reservation Form',
  shortDescription: 'Take table reservations online with date, time, party size, and special requests.',
  description:
    'A restaurant reservation form that captures party size, date, time, seating preference, occasion, and special requests. Perfect for restaurant websites and Google Business profiles.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Reserve a Table' }],
    fields: [
      { id: 'guest_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'guest_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'guest_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'party_size', type: 'numerical', label: 'Party Size', required: true, width: 'half', defaultValue: 2, validation: { min: 1, max: 50 } },
      { id: 'reservation_date', type: 'date', label: 'Date', required: true, width: 'half' },
      { id: 'reservation_time', type: 'time', label: 'Time', required: true, width: 'half' },
      { id: 'seating_preference', type: 'dropdown', label: 'Seating Preference', width: 'half', options: [
        { label: 'Indoor', value: 'indoor' },
        { label: 'Outdoor / Patio', value: 'outdoor' },
        { label: 'Bar', value: 'bar' },
        { label: 'Private Room', value: 'private' },
        { label: 'No Preference', value: 'no_preference' },
      ] },
      { id: 'occasion', type: 'dropdown', label: 'Occasion', width: 'half', options: [
        { label: 'Casual Dining', value: 'casual' },
        { label: 'Birthday', value: 'birthday' },
        { label: 'Anniversary', value: 'anniversary' },
        { label: 'Date Night', value: 'date' },
        { label: 'Business Meal', value: 'business' },
        { label: 'Celebration', value: 'celebration' },
      ] },
      { id: 'special_requests', type: 'long_answer', label: 'Special Requests', placeholder: 'High chair, wheelchair access, dietary restrictions, surprise cake, etc.', width: 'full' },
    ],
    rules: [],
    theme: THEME_AMBER,
    settings: {
      submitButtonText: 'Reserve Table',
      successTitle: 'Reservation Received!',
      successMessage: 'We\u2019ll send a confirmation email shortly. For parties of 8+ please call the restaurant.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'restaurant_reservation' },
      },
    },
  },
  categories: ['booking'],
  industries: ['restaurant'],
  useCases: ['appointment_booking', 'lead_generation'],
  audiences: ['b2c'],
  tags: ['restaurant', 'reservation', 'booking', 'dining', 'table'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Restaurant Reservation Form Template — Free',
    seoDescription:
      'Take table reservations online with date, time, party size, seating preference, and special requests. Free restaurant booking form template.',
    seoKeywords: ['restaurant reservation form', 'table booking', 'dining reservation', 'restaurant form'],
    faq: [
      { question: 'How do I handle large parties?', answer: 'The form defaults to a max party size of 50. For very large parties or private events, use the catering-order-form template instead, or add a note that parties over a certain size must call the restaurant.' },
      { question: 'Can I limit reservations to my opening hours?', answer: 'Yes \u2014 add field validation in the builder, or pair this form with a booking-calendar widget that only shows available time slots during your hours of operation.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 11. Catering Order Form (RESTAURANT) ─────────────────────────────────
const CATERING_ORDER_FORM: FormTemplate = {
  id: 'catering-order-form',
  name: 'Catering Order Form',
  shortDescription: 'Book catering for events with date, guest count, menu, dietary needs, and payment.',
  description:
    'A catering order form for restaurants and caterers. Captures event date, time, location, guest count, menu selection, dietary restrictions, special requests, and collects a deposit via Stripe.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Catering Order' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'customer_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'customer_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'event_date', type: 'date', label: 'Event Date', required: true, width: 'half' },
      { id: 'event_time', type: 'time', label: 'Event Time', required: true, width: 'half' },
      { id: 'guest_count', type: 'numerical', label: 'Number of Guests', required: true, width: 'half', validation: { min: 10, max: 2000 } },
      { id: 'event_location', type: 'address', label: 'Event Location / Delivery Address', required: true, width: 'full' },
      { id: 'menu_selection', type: 'dropdown', label: 'Menu / Package', required: true, width: 'half', options: [
        { label: 'Continental Breakfast \u2014 $18/guest', value: 'continental_breakfast', price: 18 },
        { label: 'Buffet Lunch \u2014 $28/guest', value: 'buffet_lunch', price: 28 },
        { label: 'Plated Lunch \u2014 $35/guest', value: 'plated_lunch', price: 35 },
        { label: 'BBQ Package \u2014 $32/guest', value: 'bbq', price: 32 },
        { label: 'Cocktail Appetizers \u2014 $22/guest', value: 'cocktail', price: 22 },
        { label: 'Formal Dinner \u2014 $55/guest', value: 'formal_dinner', price: 55 },
      ] },
      { id: 'service_style', type: 'radio', label: 'Service Style', required: true, width: 'half', options: [
        { label: 'Drop-Off Only', value: 'dropoff' },
        { label: 'Drop-Off + Setup', value: 'setup' },
        { label: 'Full Service (staff on-site)', value: 'full_service' },
      ] },
      { id: 'dietary_restrictions', type: 'checkbox', label: 'Dietary Restrictions to Accommodate', width: 'full', options: [
        { label: 'Vegetarian', value: 'vegetarian' },
        { label: 'Vegan', value: 'vegan' },
        { label: 'Gluten-Free', value: 'gluten_free' },
        { label: 'Nut Allergy', value: 'nut_allergy' },
        { label: 'Dairy-Free', value: 'dairy_free' },
        { label: 'Halal', value: 'halal' },
        { label: 'Kosher', value: 'kosher' },
        { label: 'None', value: 'none' },
      ] },
      { id: 'special_requests', type: 'long_answer', label: 'Special Requests', placeholder: 'Theme, decor, specific dishes, branded napkins, etc.', width: 'full' },
      { id: 'deposit_payment', type: 'control_widget', label: 'Deposit Payment (50%)', required: true, width: 'full', widgetType: 'payment_gateway', widgetConfig: { gatewayId: 'stripe' } },
    ],
    rules: [],
    theme: THEME_AMBER,
    settings: {
      submitButtonText: 'Submit Catering Order',
      successTitle: 'Catering Request Received!',
      successMessage: 'Our catering manager will email a confirmed quote and contract within 24 hours.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'catering_order', pipelineStage: 'order_received' },
      },
    },
  },
  categories: ['order', 'event'],
  industries: ['restaurant', 'events'],
  useCases: ['customer_onboarding', 'lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['catering', 'restaurant', 'event', 'food', 'stripe'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Catering Order Form Template — Free for Caterers',
    seoDescription:
      'Book catering with event date, guest count, menu selection, dietary restrictions, and Stripe deposit. Free catering order form for restaurants and event caterers.',
    seoKeywords: ['catering order form', 'catering booking', 'event catering', 'restaurant catering'],
    faq: [
      { question: 'How does the deposit payment work?', answer: 'The Stripe payment widget collects a deposit at submission. The full balance is typically due closer to the event \u2014 your catering manager can send a separate invoice for the remaining amount.' },
      { question: 'Can I require a minimum guest count?', answer: 'Yes. The guest-count field defaults to a minimum of 10 (validation: min 10, max 2000). Adjust in the builder to match your kitchen\u2019s minimum.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 12. Gym Membership Signup Form (FITNESS) ─────────────────────────────
const GYM_MEMBERSHIP_SIGNUP_FORM: FormTemplate = {
  id: 'gym-membership-signup-form',
  name: 'Gym Membership Signup Form',
  shortDescription: 'Sign up new members with plan selection, health questionnaire, and signed waiver.',
  description:
    'A complete gym membership signup form with plan selection, personal info, emergency contact, a health questionnaire, and a liability waiver with signature. Designed for studios, gyms, and boutique fitness clubs.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Membership Signup' }],
    fields: [
      { id: 'member_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'member_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'member_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Home Address', required: true, width: 'full' },
      { id: 'membership_type', type: 'dropdown', label: 'Membership Plan', required: true, width: 'half', options: [
        { label: 'Basic \u2014 $29/mo', value: 'basic', price: 29 },
        { label: 'Standard \u2014 $49/mo', value: 'standard', price: 49 },
        { label: 'Premium \u2014 $79/mo', value: 'premium', price: 79 },
        { label: 'Family (up to 4) \u2014 $129/mo', value: 'family', price: 129 },
        { label: 'Student \u2014 $25/mo', value: 'student', price: 25 },
        { label: 'Senior (65+) \u2014 $25/mo', value: 'senior', price: 25 },
      ] },
      { id: 'billing_cycle', type: 'radio', label: 'Billing Cycle', required: true, width: 'half', options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Annual (10% off)', value: 'annual' },
      ] },
      { id: 'emergency_contact_name', type: 'short_answer', label: 'Emergency Contact Name', required: true, width: 'half' },
      { id: 'emergency_contact_phone', type: 'phone', label: 'Emergency Contact Phone', required: true, width: 'half' },
      { id: 'health_questionnaire', type: 'long_answer', label: 'Health Conditions / Injuries', required: true, placeholder: 'List any conditions, recent surgeries, or injuries we should know about. Write "none" if applicable.', width: 'full' },
      { id: 'medications', type: 'long_answer', label: 'Current Medications', placeholder: 'Optional but recommended for your safety.', width: 'full' },
      { id: 'waiver_acknowledgment', type: 'checkbox', label: 'I have read and agree to the gym\u2019s Liability Waiver and Member Agreement.', required: true, width: 'full' },
      { id: 'waiver_signature', type: 'signature', label: 'Member Signature', required: true, width: 'full' },
    ],
    rules: [],
    theme: THEME_ROSE,
    settings: {
      submitButtonText: 'Complete Signup',
      successTitle: 'Welcome to the Family!',
      successMessage: 'Your membership is active. Check your email for a welcome packet and check-in barcode.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'gym_membership', pipelineStage: 'member_signed_up' },
      },
    },
  },
  categories: ['membership', 'waiver'],
  industries: ['fitness'],
  useCases: ['customer_onboarding', 'lead_generation'],
  audiences: ['b2c'],
  tags: ['fitness', 'gym', 'membership', 'waiver', 'signup'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Gym Membership Signup Form Template — Free',
    seoDescription:
      'Sign up new gym members with plan selection, emergency contact, health questionnaire, and signed liability waiver. Free fitness membership form template.',
    seoKeywords: ['gym membership form', 'fitness signup', 'gym waiver', 'health club signup'],
    faq: [
      { question: 'Is the liability waiver legally binding?', answer: 'The signature field captures the member\u2019s agreement to your waiver text. You should link to or embed your actual waiver language in the form description or a paragraph field. Consult a local attorney to ensure your waiver complies with state/country laws.' },
      { question: 'How do I collect the first payment?', answer: 'Add a Stripe payment_gateway widget before the signature field to charge the first month (or annual fee) at submission. The widget config supports recurring billing if your Stripe account is set up for subscriptions.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 13. Personal Training Intake Form (FITNESS) ──────────────────────────
const PERSONAL_TRAINING_INTAKE_FORM: FormTemplate = {
  id: 'personal-training-intake-form',
  name: 'Personal Training Intake Form',
  shortDescription: 'Capture fitness goals, medical history, and availability for new PT clients.',
  description:
    'An onboarding form for personal training clients. Captures goals, current fitness level, medical history, injuries, medications, and availability so the trainer can build a safe and effective program.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Client Intake' }],
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'client_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'client_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'fitness_goals', type: 'long_answer', label: 'Fitness Goals', required: true, placeholder: 'e.g. Lose 15 lbs, run a 5K, build muscle, improve mobility.', width: 'full' },
      { id: 'current_fitness_level', type: 'dropdown', label: 'Current Fitness Level', required: true, width: 'half', options: [
        { label: 'Beginner \u2014 Little/no exercise in 6 months', value: 'beginner' },
        { label: 'Intermediate \u2014 Exercise 1\u20133x/week', value: 'intermediate' },
        { label: 'Advanced \u2014 Exercise 4+ times/week', value: 'advanced' },
        { label: 'Athlete \u2014 Competitive training', value: 'athlete' },
      ] },
      { id: 'preferred_training_frequency', type: 'radio', label: 'Sessions Per Week', required: true, width: 'half', options: [
        { label: '1\u20132 sessions/week', value: '1_2' },
        { label: '3 sessions/week', value: '3' },
        { label: '4+ sessions/week', value: '4_plus' },
      ] },
      { id: 'preferred_training_days', type: 'checkbox', label: 'Preferred Training Days', required: true, width: 'full', options: [
        { label: 'Monday', value: 'mon' },
        { label: 'Tuesday', value: 'tue' },
        { label: 'Wednesday', value: 'wed' },
        { label: 'Thursday', value: 'thu' },
        { label: 'Friday', value: 'fri' },
        { label: 'Saturday', value: 'sat' },
        { label: 'Sunday', value: 'sun' },
      ] },
      { id: 'preferred_time', type: 'dropdown', label: 'Preferred Time of Day', required: true, width: 'half', options: [
        { label: 'Early Morning (5\u20138am)', value: 'early_morning' },
        { label: 'Morning (8\u201311am)', value: 'morning' },
        { label: 'Midday (11am\u20131pm)', value: 'midday' },
        { label: 'Afternoon (1\u20135pm)', value: 'afternoon' },
        { label: 'Evening (5\u20139pm)', value: 'evening' },
      ] },
      { id: 'medical_history', type: 'long_answer', label: 'Medical History', required: true, placeholder: 'Heart conditions, diabetes, high blood pressure, etc. Write "none" if applicable.', width: 'full' },
      { id: 'injuries', type: 'long_answer', label: 'Current or Past Injuries', required: true, placeholder: 'Knee, back, shoulder, etc. Write "none" if applicable.', width: 'full' },
      { id: 'medications', type: 'long_answer', label: 'Current Medications', placeholder: 'Optional but recommended.', width: 'full' },
      { id: 'signature', type: 'signature', label: 'Client Signature', required: true, helpText: 'I confirm the above is accurate to the best of my knowledge.', width: 'full' },
    ],
    rules: [],
    theme: THEME_ROSE,
    settings: {
      submitButtonText: 'Submit Intake',
      successTitle: 'Intake Received!',
      successMessage: 'Your trainer will review your goals and reach out within 24 hours to schedule your first session.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'personal_training_intake', pipelineStage: 'intake_received' },
      },
    },
  },
  categories: ['intake', 'assessment'],
  industries: ['fitness'],
  useCases: ['intake', 'customer_onboarding'],
  audiences: ['b2c'],
  tags: ['fitness', 'personal-training', 'intake', 'goals', 'health'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Personal Training Intake Form Template — Free',
    seoDescription:
      'Capture fitness goals, medical history, injuries, medications, and availability for new personal training clients. Free PT intake form template.',
    seoKeywords: ['personal training intake', 'pt intake form', 'fitness intake', 'trainer onboarding'],
    faq: [
      { question: 'Why is the medical history required?', answer: 'Trainers need to know about heart conditions, injuries, and other medical issues to design a safe program. The field is required \u2014 clients can write "none" if they have no relevant history.' },
      { question: 'How do I match clients with the right trainer?', answer: 'Use the "Preferred Training Days" and "Preferred Time" fields in your CRM to filter trainers by availability. Add a hidden trainer_id field once a match is made.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 14. Donation Form (NONPROFIT) ────────────────────────────────────────
const DONATION_FORM: FormTemplate = {
  id: 'donation-form',
  name: 'Donation Form',
  shortDescription: 'Accept one-time or recurring donations with tribute option and Stripe payment.',
  description:
    'A donation form for nonprofits and charities. Lets donors pick an amount, choose one-time or recurring, dedicate the gift in honor of someone, opt to stay anonymous, and pay via Stripe. Optimized for high conversion.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Make a Donation' }],
    fields: [
      { id: 'donor_name', type: 'short_answer', label: 'Donor Name', required: true, width: 'half' },
      { id: 'donor_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'donor_phone', type: 'phone', label: 'Phone Number', width: 'half' },
      { id: 'donation_amount', type: 'dropdown', label: 'Donation Amount', required: true, width: 'half', options: [
        { label: '$25', value: '25', price: 25 },
        { label: '$50', value: '50', price: 50 },
        { label: '$100', value: '100', price: 100 },
        { label: '$250', value: '250', price: 250 },
        { label: '$500', value: '500', price: 500 },
        { label: '$1,000', value: '1000', price: 1000 },
        { label: 'Other Amount (enter below)', value: 'other' },
      ] },
      { id: 'custom_amount', type: 'currency', label: 'Custom Amount', width: 'half', helpText: 'Only fill in if you selected "Other Amount" above.' },
      { id: 'donation_frequency', type: 'radio', label: 'Frequency', required: true, width: 'half', options: [
        { label: 'One-Time', value: 'one_time' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annually', value: 'annually' },
      ] },
      { id: 'tribute', type: 'checkbox', label: 'Make this donation in honor or memory of someone.', width: 'half' },
      { id: 'tribute_name', type: 'short_answer', label: 'Honoree Name', placeholder: 'In honor/memory of...', width: 'half' },
      { id: 'tribute_message', type: 'long_answer', label: 'Tribute Message', placeholder: 'Optional personal message.', width: 'full' },
      { id: 'anonymous', type: 'checkbox', label: 'Make my donation anonymous (do not display my name publicly).', width: 'full' },
      { id: 'message', type: 'long_answer', label: 'Message for the Organization', placeholder: 'Why you donated, words of support, etc.', width: 'full' },
      { id: 'payment', type: 'control_widget', label: 'Payment', required: true, width: 'full', widgetType: 'payment_gateway', widgetConfig: { gatewayId: 'stripe' } },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Donate Now',
      successTitle: 'Thank You for Your Gift!',
      successMessage: 'Your donation makes a real difference. A receipt has been emailed to you.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Thank you for your donation!',
          messageBody: 'Dear donor, thank you for your generous gift. Your support helps us continue our mission. A tax-deductible receipt is attached.',
        },
      },
    },
  },
  categories: ['donation', 'payment'],
  industries: ['nonprofit'],
  useCases: ['customer_onboarding', 'lead_generation'],
  audiences: ['b2c', 'nonprofit'],
  tags: ['donation', 'nonprofit', 'stripe', 'recurring', 'tribute'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Donation Form Template — One-Time & Recurring',
    seoDescription:
      'Accept donations online with amount selection, one-time or recurring giving, tribute option, and Stripe payment. Free donation form template for nonprofits.',
    seoKeywords: ['donation form', 'nonprofit donation', 'recurring donation', 'stripe donation form'],
    faq: [
      { question: 'How do recurring donations work?', answer: 'When a donor selects monthly/quarterly/annually and pays via the Stripe widget, Stripe creates a subscription that auto-charges on the same day each cycle. You\u2019ll need to set up a recurring product in your Stripe dashboard first.' },
      { question: 'Are donations tax-deductible?', answer: 'Tax-deductibility depends on your nonprofit\u2019s 501(c)(3) or local equivalent status. The auto-response email mentions a receipt \u2014 make sure to attach or generate a proper tax receipt in your workflow.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 15. Volunteer Application Form (NONPROFIT) ───────────────────────────
const VOLUNTEER_APPLICATION_FORM: FormTemplate = {
  id: 'volunteer-application-form',
  name: 'Volunteer Application Form',
  shortDescription: 'Recruit volunteers with interests, availability, skills, and emergency contact.',
  description:
    'A volunteer application form for nonprofits, charities, and community organizations. Captures interests, availability, relevant skills, prior experience, and emergency contact info. Includes a signature for the volunteer agreement.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Volunteer Application' }],
    fields: [
      { id: 'volunteer_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'volunteer_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'volunteer_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, helpText: 'Some roles require volunteers to be 18+.', width: 'half' },
      { id: 'address', type: 'address', label: 'Home Address', required: true, width: 'full' },
      { id: 'interests', type: 'checkbox', label: 'Areas of Interest', required: true, width: 'full', options: [
        { label: 'Event Volunteering', value: 'events' },
        { label: 'Fundraising', value: 'fundraising' },
        { label: 'Office / Admin', value: 'admin' },
        { label: 'Marketing / Social Media', value: 'marketing' },
        { label: 'Direct Service / Programs', value: 'programs' },
        { label: 'Mentoring / Tutoring', value: 'mentoring' },
        { label: 'Driving / Deliveries', value: 'driving' },
        { label: 'Skilled Pro Bono (Legal, IT, Design)', value: 'pro_bono' },
      ] },
      { id: 'availability', type: 'checkbox', label: 'Availability', required: true, width: 'full', options: [
        { label: 'Weekday Mornings', value: 'weekday_morning' },
        { label: 'Weekday Afternoons', value: 'weekday_afternoon' },
        { label: 'Weekday Evenings', value: 'weekday_evening' },
        { label: 'Weekend Mornings', value: 'weekend_morning' },
        { label: 'Weekend Afternoons', value: 'weekend_afternoon' },
        { label: 'Weekend Evenings', value: 'weekend_evening' },
        { label: 'One-Time Events Only', value: 'events_only' },
      ] },
      { id: 'skills', type: 'long_answer', label: 'Relevant Skills / Certifications', placeholder: 'First aid, languages, software, trade skills, etc.', width: 'full' },
      { id: 'experience', type: 'long_answer', label: 'Prior Volunteer Experience', placeholder: 'Organization, role, dates.', width: 'full' },
      { id: 'emergency_contact_name', type: 'short_answer', label: 'Emergency Contact Name', required: true, width: 'half' },
      { id: 'emergency_contact_phone', type: 'phone', label: 'Emergency Contact Phone', required: true, width: 'half' },
      { id: 'emergency_contact_relationship', type: 'short_answer', label: 'Relationship', placeholder: 'Parent, spouse, friend, etc.', width: 'half' },
      { id: 'agreement_signature', type: 'signature', label: 'Volunteer Agreement Signature', required: true, helpText: 'I agree to follow the organization\u2019s volunteer code of conduct and policies.', width: 'full' },
    ],
    rules: [],
    theme: THEME_EMERALD,
    settings: {
      submitButtonText: 'Submit Application',
      successTitle: 'Application Received!',
      successMessage: 'Our volunteer coordinator will reach out within 5 business days to match you with a role.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'volunteer_application', pipelineStage: 'application_received' },
      },
    },
  },
  categories: ['application', 'onboarding'],
  industries: ['nonprofit'],
  useCases: ['customer_onboarding', 'employee_application'],
  audiences: ['b2c', 'nonprofit'],
  tags: ['volunteer', 'nonprofit', 'application', 'onboarding', 'community'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Volunteer Application Form Template — Free',
    seoDescription:
      'Recruit volunteers with interests, availability, skills, prior experience, emergency contact, and signed agreement. Free volunteer application form for nonprofits.',
    seoKeywords: ['volunteer application form', 'nonprofit volunteer', 'volunteer signup', 'community form'],
    faq: [
      { question: 'Can minors apply to volunteer?', answer: 'Yes \u2014 the form asks for date of birth so coordinators can route under-18 applicants to age-appropriate roles. Some roles may require a parent/guardian signature \u2014 add a second signature field in the builder if needed.' },
      { question: 'How do I run a background check on volunteers?', answer: 'Add a checkbox asking applicants to consent to a background check (like the tenant application does). Then export the submitted data to your background-check vendor (Checkr, Sterling, etc.).' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 16. Auto Service Appointment Form (AUTOMOTIVE) ───────────────────────
const AUTO_SERVICE_APPOINTMENT_FORM: FormTemplate = {
  id: 'auto-service-appointment-form',
  name: 'Auto Service Appointment Form',
  shortDescription: 'Book vehicle service with vehicle info, service type, date, and symptoms.',
  description:
    'An auto service appointment form for repair shops, dealerships, and tire centers. Captures vehicle details (year/make/model/VIN/mileage), service type, preferred date/time, and a description of symptoms so the technician can prepare.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Service Appointment' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'customer_email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'customer_phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'vehicle_year', type: 'numerical', label: 'Vehicle Year', required: true, width: 'half', validation: { min: 1900, max: 2030 } },
      { id: 'vehicle_make', type: 'short_answer', label: 'Make', required: true, placeholder: 'Toyota, Ford, etc.', width: 'third' },
      { id: 'vehicle_model', type: 'short_answer', label: 'Model', required: true, placeholder: 'Camry, F-150, etc.', width: 'third' },
      { id: 'vehicle_trim', type: 'short_answer', label: 'Trim (optional)', width: 'third' },
      { id: 'vin', type: 'short_answer', label: 'VIN', placeholder: '17-character VIN', helpText: 'Found on registration or driver-side dashboard.', width: 'half' },
      { id: 'mileage', type: 'numerical', label: 'Current Mileage', required: true, width: 'half', validation: { min: 0, max: 999999 } },
      { id: 'service_type', type: 'dropdown', label: 'Service Type', required: true, width: 'half', options: [
        { label: 'Oil Change', value: 'oil_change' },
        { label: 'Tire Rotation / Replacement', value: 'tires' },
        { label: 'Brake Service', value: 'brakes' },
        { label: 'Engine Diagnostic', value: 'diagnostic' },
        { label: 'Transmission Service', value: 'transmission' },
        { label: 'Battery / Electrical', value: 'battery' },
        { label: 'AC / Heating', value: 'ac' },
        { label: 'State Inspection', value: 'inspection' },
        { label: 'Other', value: 'other' },
      ] },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, width: 'half' },
      { id: 'preferred_time', type: 'time', label: 'Preferred Time', required: true, width: 'half' },
      { id: 'alternate_date', type: 'date', label: 'Alternate Date', width: 'half' },
      { id: 'alternate_time', type: 'time', label: 'Alternate Time', width: 'half' },
      { id: 'symptoms', type: 'long_answer', label: 'Describe Symptoms / Concerns', required: true, placeholder: 'e.g. Squeaking noise when braking, check engine light is on, AC blowing warm.', width: 'full' },
      { id: 'additional_notes', type: 'long_answer', label: 'Additional Notes', placeholder: 'Anything else the technician should know.', width: 'full' },
    ],
    rules: [],
    theme: THEME_SKY,
    settings: {
      submitButtonText: 'Book Appointment',
      successTitle: 'Appointment Requested!',
      successMessage: 'We\u2019ll confirm your appointment by phone or email within 1 business hour.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'auto_service_appointment', pipelineStage: 'appointment_requested' },
      },
    },
  },
  categories: ['booking', 'request'],
  industries: ['automotive'],
  useCases: ['appointment_booking', 'service_request'],
  audiences: ['b2c'],
  tags: ['automotive', 'auto-service', 'mechanic', 'appointment', 'vehicle'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Auto Service Appointment Form Template — Free',
    seoDescription:
      'Book vehicle service appointments with vehicle info, service type, preferred date/time, and symptoms. Free auto repair shop appointment form template.',
    seoKeywords: ['auto service appointment', 'mechanic booking form', 'car repair form', 'auto shop form'],
    faq: [
      { question: 'Why do you need the VIN?', answer: 'The VIN lets the shop pull up exact OEM parts and service bulletins for your vehicle. It\u2019s optional on this form \u2014 remove it in the builder if your shop doesn\u2019t need it.' },
      { question: 'Can customers upload a photo of the issue?', answer: 'Yes \u2014 add a photo field (type: photo) in the builder so customers can attach a picture of a warning light, leak, or damage.' },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── Register all templates ────────────────────────────────────────────────
registerTemplate(PROPERTY_TOUR_REQUEST_FORM);
registerTemplate(REAL_ESTATE_LEAD_CAPTURE_FORM);
registerTemplate(TENANT_APPLICATION_FORM);
registerTemplate(LEGAL_CLIENT_INTAKE_FORM);
registerTemplate(LEGAL_CONSULTATION_REQUEST_FORM);
registerTemplate(COURSE_REGISTRATION_FORM);
registerTemplate(STUDENT_FEEDBACK_FORM);
registerTemplate(PRODUCT_ORDER_FORM);
registerTemplate(RETURN_REQUEST_FORM);
registerTemplate(RESTAURANT_RESERVATION_FORM);
registerTemplate(CATERING_ORDER_FORM);
registerTemplate(GYM_MEMBERSHIP_SIGNUP_FORM);
registerTemplate(PERSONAL_TRAINING_INTAKE_FORM);
registerTemplate(DONATION_FORM);
registerTemplate(VOLUNTEER_APPLICATION_FORM);
registerTemplate(AUTO_SERVICE_APPOINTMENT_FORM);
