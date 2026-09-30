/**
 * Form Experience Structures — 100 Professional Form Archetypes
 *
 * Solves template fatigue by providing 100 distinct architectural skeletons
 * across 10 Master Experience Engines, ensuring every template on Fieseros
 * feels like a purpose-built, high-converting application rather than a duplicate form.
 *
 * All structures utilize genuine Fieseros widgets:
 *   - Dates & Appointments: 'appointment', 'date_picker', 'time_picker', 'date_range'
 *   - Maps & Geolocation: 'map_embed', 'service_area_checker', 'interactive_map'
 *   - E-Signatures: 'smooth_signature', 'signature', 'terms_and_conditions'
 *   - Calculators & Sliders: 'form_calculation', 'slider', 'loan_emi'
 *   - Survey & Ratings: 'star_rating', 'nps_slider', 'likert_matrix'
 *   - Media & Uploads: 'image_choice', 'image_upload_with_notes', 'photo'
 *   - Generic Elements: 'heading', 'paragraph', 'badge_widget', 'list_widget'
 */

import type { FormLayout } from '../resolve-form-layout';

export type ExperienceEngineType =
  | 'classic_business'     // Engine 1: Standard Corporate & Operational Forms (1-10)
  | 'milestone_stepper'    // Engine 2: Multi-Step Milestone Stepper & Wizards (11-20)
  | 'card_swipe'           // Engine 3: Conversational One-at-a-Time "Typeform" (21-30)
  | 'split_hero'           // Engine 4: Two-Column Split-Hero Immersive (31-40)
  | 'hero_landing'         // Engine 5: Hero + Form (Landing Page Integrated) (41-50)
  | 'visual_choice_grid'   // Engine 6: Card & Visual Selection Grid (51-60)
  | 'quote_calculator'     // Engine 7: Calculator & Dynamic Price Estimator (61-70)
  | 'field_inspection'     // Engine 8: Operational, Checklist & Field Workspaces (71-80)
  | 'booking_scheduler'    // Engine 9: Booking & Calendar First (81-90)
  | 'ai_dynamic_concierge' // Engine 10: AI Dynamic, Triage & Conversational Concierge (91-100)
  // Legacy aliases for backward compatibility:
  | 'compact_drawer'
  | 'diagnostic_quiz'
  | 'contract_signature';

export interface FormExperienceStructure {
  id: string;
  name: string;
  engine: ExperienceEngineType;
  layout: FormLayout;
  description: string;
  recommendedStepCount: number;
  highlightedFeatures: string[];
  keyWidgets: string[];
  bestForIndustries: string[];
  conversionRationale: string;
}

export const FORM_EXPERIENCE_ENGINES: Record<
  string,
  { title: string; subtitle: string; defaultLayout: FormLayout; count: number; icon: string }
> = {
  classic_business: {
    title: 'Classic Business & Corporate',
    subtitle: 'Streamlined corporate intake, RFP procurement, vendor compliance, and executive requests.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'Briefcase',
  },
  milestone_stepper: {
    title: 'Multi-Step Milestone Stepper',
    subtitle: 'Segmented chapters with clear progress indicators, conditional branching, and breadcrumbs.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'Layers',
  },
  card_swipe: {
    title: 'Conversational Card-by-Card Swipe',
    subtitle: 'Single question per viewport with smooth keyboard navigation and minimal cognitive load.',
    defaultLayout: 'card',
    count: 10,
    icon: 'MessageSquare',
  },
  split_hero: {
    title: 'Two-Column Split-Hero',
    subtitle: '50/50 dual column with persistent social proof, imagery, or map dispatch alongside inputs.',
    defaultLayout: 'split_media',
    count: 10,
    icon: 'LayoutTemplate',
  },
  hero_landing: {
    title: 'Hero + Form Landing Page',
    subtitle: 'Prominent marketing banner with floating embedded lead capture card.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'Sparkles',
  },
  visual_choice_grid: {
    title: 'Visual Choice & Card Grid',
    subtitle: 'Rich card selections with photography, icons, badges, and pricing pills instead of plain text.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'LayoutGrid',
  },
  quote_calculator: {
    title: 'Calculator & Price Estimator',
    subtitle: 'Real-time dynamic cost calculation with sliders, tier selectors, and instant breakdown.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'Calculator',
  },
  field_inspection: {
    title: 'Operational & Field Checklist',
    subtitle: 'Multi-point verification with pass/fail toggles, photo evidence, and technician sign-off.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'ClipboardCheck',
  },
  booking_scheduler: {
    title: 'Booking & Calendar First',
    subtitle: 'Live interactive date & time-slot picker, service duration choices, and calendar sync.',
    defaultLayout: 'classic',
    count: 10,
    icon: 'CalendarCheck',
  },
  ai_dynamic_concierge: {
    title: 'AI Dynamic & Smart Concierge',
    subtitle: 'Adaptive triage, document parsing, decision trees, and intelligent AI prompt intake.',
    defaultLayout: 'card',
    count: 10,
    icon: 'Bot',
  },
  // Aliases for backward compatibility:
  compact_drawer: {
    title: 'Compact Lead Capture',
    subtitle: 'Ultra-low friction micro-forms for rapid mobile conversion.',
    defaultLayout: 'classic',
    count: 5,
    icon: 'Zap',
  },
  diagnostic_quiz: {
    title: 'Diagnostic & Triage Funnel',
    subtitle: 'Symptom checker and recommendation quiz.',
    defaultLayout: 'card',
    count: 5,
    icon: 'HelpCircle',
  },
  contract_signature: {
    title: 'E-Signature Contract & Waiver',
    subtitle: 'Legal clauses with digital signature pad.',
    defaultLayout: 'classic',
    count: 5,
    icon: 'PenTool',
  },
};

export const FORM_STRUCTURES_100: FormExperienceStructure[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 1: Classic Business & Corporate (1 – 10)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'classic_standard_contact',
    name: 'Classic Business Inquiry',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Header → Contact Info → Request Details → Additional Info → Submit.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Clean linear layout', 'Floating labels', 'Instant submission response'],
    keyWidgets: ['full_name', 'email', 'phone', 'dropdown', 'long_answer'],
    bestForIndustries: ['General', 'Accounting', 'Consulting', 'Legal'],
    conversionRationale: 'Zero cognitive friction for straightforward B2B and B2C queries.',
  },
  {
    id: 'classic_procurement_rfp',
    name: 'Corporate Procurement & RFP',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Company Profile → Procurement Specs → Compliance Checkbox → RFP Attachment.',
    recommendedStepCount: 1,
    highlightedFeatures: ['DUNS/Tax ID input', 'File dropzone', 'Compliance declarations'],
    keyWidgets: ['company', 'email', 'file_upload', 'checkbox', 'terms_and_conditions'],
    bestForIndustries: ['Manufacturing', 'Enterprise Tech', 'Construction', 'Government'],
    conversionRationale: 'Collects all required vendor bidding criteria upfront without back-and-forth emails.',
  },
  {
    id: 'classic_consent_signature',
    name: 'Consent & Electronic Signature',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Agreement Clauses → Identity Verification → Checkbox Declarations → E-Signature Canvas.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Smooth canvas signature', 'Scrollable legal terms', 'Date timestamping'],
    keyWidgets: ['full_name', 'smooth_signature', 'terms_and_conditions', 'date_picker'],
    bestForIndustries: ['Legal', 'Healthcare', 'Fitness', 'Real Estate'],
    conversionRationale: 'Legally binding document execution right inside the web browser.',
  },
  {
    id: 'classic_employment_application',
    name: 'Employment & Career Application',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Personal Data → Position Desired → Work Experience → Resume Upload → EEO Disclosure.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Resume file upload', 'Employment history repeater', 'Salary expectation slider'],
    keyWidgets: ['full_name', 'email', 'phone', 'file_upload', 'dropdown'],
    bestForIndustries: ['Hospitality', 'Retail', 'Healthcare', 'Technology'],
    conversionRationale: 'Structured applicant intake feeding directly into HR candidate pipelines.',
  },
  {
    id: 'classic_partnership_affiliate',
    name: 'Partnership & Affiliate Intake',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Business Details → Audience Size & Reach → Proposal Pitch → Target Timeline.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Social reach metrics', 'Website URL validation', 'Partnership tier selector'],
    keyWidgets: ['company', 'email', 'short_answer', 'dropdown', 'long_answer'],
    bestForIndustries: ['E-Commerce', 'SaaS', 'Marketing Agencies', 'Publishing'],
    conversionRationale: 'Filters high-leverage brand ambassadors and co-marketing affiliates quickly.',
  },
  {
    id: 'classic_wholesale_bulk_order',
    name: 'Wholesale & Bulk Order Intake',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Tax ID / Reseller Cert → SKU Selector Matrix → Volume Tier Radio → Delivery Dock Requirements.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Resale permit upload', 'Pallet count selector', 'Loading dock toggles'],
    keyWidgets: ['company', 'file_upload', 'dropdown', 'numerical', 'checkbox'],
    bestForIndustries: ['Food & Beverage', 'Industrial Supplies', 'Apparel Distribution'],
    conversionRationale: 'Separates wholesale bulk buyers from retail shoppers for custom invoice pricing.',
  },
  {
    id: 'classic_executive_briefing',
    name: 'Executive Briefing Request',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Company Stage → Key Strategic Challenges → Attendee Roster → Executive Schedule.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Confidentiality disclaimer', 'Board member attendee list', 'Agenda focus tags'],
    keyWidgets: ['full_name', 'company', 'email', 'phone', 'appointment'],
    bestForIndustries: ['Management Consulting', 'Investment Banking', 'Cybersecurity'],
    conversionRationale: 'Signals high prestige and seriousness to C-level prospective clients.',
  },
  {
    id: 'classic_vendor_security_audit',
    name: 'Vendor Security & Compliance Audit',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Vendor Profile → Data Hosting Location → Encryption Checklists → DPA Signature.',
    recommendedStepCount: 1,
    highlightedFeatures: ['SOC2/ISO cert upload', 'Data residency radio', 'Compliance officer sign-off'],
    keyWidgets: ['company', 'checkbox', 'file_upload', 'smooth_signature', 'terms_and_conditions'],
    bestForIndustries: ['SaaS', 'Fintech', 'Healthcare IT', 'Insurance'],
    conversionRationale: 'Accelerates vendor approval by packaging InfoSec inquiries into one form.',
  },
  {
    id: 'classic_support_ticket_sla',
    name: 'Customer Support Ticket & SLA',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Account ID → Priority Severity Matrix → Issue Reproduction Steps → Attachment Dropzone.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Severity level pill selector', 'Screenshot upload', 'Error code input'],
    keyWidgets: ['full_name', 'email', 'dropdown', 'long_answer', 'file_upload'],
    bestForIndustries: ['Software', 'Hardware Support', 'Telecommunications', 'Managed IT'],
    conversionRationale: 'Captures full diagnostic information on the first touch, slashing resolution time.',
  },
  {
    id: 'classic_vip_concierge',
    name: 'VIP Concierge & Member Request',
    engine: 'classic_business',
    layout: 'classic',
    description: 'Member Card ID → Preferred Experience → Luxury Preferences → Special Access Requirements.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Member ID validation', 'Discrete encrypted submission', 'Dedicated agent routing'],
    keyWidgets: ['full_name', 'phone', 'email', 'dropdown', 'long_answer'],
    bestForIndustries: ['Private Aviation', 'Luxury Hospitality', 'Private Banking', 'Yachting'],
    conversionRationale: 'Provides high-net-worth clients an exclusive, white-glove digital request channel.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 2: Multi-Step Milestone Stepper & Wizards (11 – 20)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'milestone_application_wizard',
    name: 'Milestone Application Wizard',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Personal → Step 2: Financials → Step 3: Documentation → Step 4: Review & Submit.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Segmented progress bar', 'Resume draft anytime', 'Summary review screen'],
    keyWidgets: ['full_name', 'email', 'numerical', 'file_upload', 'smooth_signature'],
    bestForIndustries: ['Mortgages', 'Grants', 'University Admissions', 'Immigration'],
    conversionRationale: 'Breaks intimidating multi-page applications into bite-sized achievable milestones.',
  },
  {
    id: 'milestone_client_onboarding',
    name: 'Client Onboarding Odyssey',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Company Profile → Step 2: Tool Integrations → Step 3: Goals & KPIs → Step 4: First Milestone.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Tech stack multi-choice', 'Target KPI inputs', 'Kickoff scheduler'],
    keyWidgets: ['company', 'checkbox', 'numerical', 'appointment', 'short_answer'],
    bestForIndustries: ['Digital Marketing', 'SaaS Implementation', 'HR Consulting'],
    conversionRationale: 'Collects crucial client kickoff parameters without overwhelming the client on day 1.',
  },
  {
    id: 'milestone_patient_medical_history',
    name: 'Patient Health & Medical Intake',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Vitals & Identity → Step 2: Medical History → Step 3: Insurance Card Upload → Step 4: Consent.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Insurance card photo capture', 'Allergy chips', 'HIPAA electronic signature'],
    keyWidgets: ['full_name', 'birth_date', 'file_upload', 'smooth_signature', 'terms_and_conditions'],
    bestForIndustries: ['Dental', 'Clinics', 'Telehealth', 'Physical Therapy'],
    conversionRationale: 'Ensures clinical compliance and eliminates waiting room clipboards entirely.',
  },
  {
    id: 'milestone_event_host_venue',
    name: 'Event Host & Venue Setup',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Date & Guests → Step 2: Catering & AV → Step 3: Floorplan & Staging → Step 4: Deposit.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Date picker', 'Headcount slider', 'Floorplan upload', 'Payment deposit'],
    keyWidgets: ['date_picker', 'numerical', 'checkbox', 'file_upload', 'dropdown'],
    bestForIndustries: ['Wedding Venues', 'Conference Centers', 'Catering Companies'],
    conversionRationale: 'Progressively scopes complex celebrations and corporate events step-by-step.',
  },
  {
    id: 'milestone_franchise_opportunity',
    name: 'Franchise Opportunity Intake',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Liquid Capital → Step 2: Target Territory → Step 3: Management Background → Step 4: Consent.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Capital verification brackets', 'Territory ZIP selection', 'Credit authorization'],
    keyWidgets: ['dropdown', 'address', 'file_upload', 'smooth_signature'],
    bestForIndustries: ['Fast Food Franchises', 'Fitness Franchises', 'Automotive Franchises'],
    conversionRationale: 'Screens for qualified capital before releasing confidential franchise disclosure documents.',
  },
  {
    id: 'milestone_real_estate_tenant_screening',
    name: 'Tenant Screening & Rental Application',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Applicant Profile → Step 2: Employment & Income → Step 3: References → Step 4: Credit Pull Auth.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Paystub file upload', 'Landlord reference table', 'Credit check authorization'],
    keyWidgets: ['full_name', 'email', 'phone', 'file_upload', 'smooth_signature'],
    bestForIndustries: ['Property Management', 'Apartment Communities', 'Realtors'],
    conversionRationale: 'Complete tenant qualification package gathered digitally in under 5 minutes.',
  },
  {
    id: 'milestone_wealth_financial_assessment',
    name: 'Comprehensive Financial Assessment',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Assets & Income → Step 2: Liabilities & Debts → Step 3: Risk Tolerance → Step 4: Advisory Goal.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Asset classification rows', 'Risk tolerance scale', 'Retirement timeline slider'],
    keyWidgets: ['numerical', 'slider', 'dropdown', 'short_answer'],
    bestForIndustries: ['Wealth Management', 'Financial Planning', 'Debt Consolidation'],
    conversionRationale: 'Establishes fiduciary trust by systematically mapping the client’s balance sheet.',
  },
  {
    id: 'milestone_immigration_visa_points',
    name: 'Immigration & Visa Eligibility Check',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Origin & Passport → Step 2: Education & Skills → Step 3: Dependents → Step 4: Points Evaluation.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Language score input', 'Occupation NOC code selector', 'Instant qualification badge'],
    keyWidgets: ['dropdown', 'short_answer', 'numerical', 'email'],
    bestForIndustries: ['Immigration Law', 'Study Abroad Agencies', 'Global Mobility'],
    conversionRationale: 'Pre-qualifies immigrant applicants and books high-conversion legal strategy consultations.',
  },
  {
    id: 'milestone_custom_fabrication_specs',
    name: 'Custom Fabrication & Engineering Specs',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Dimensions & Tolerances → Step 2: Material Specs → Step 3: CAD/Blueprint File → Step 4: Batch Size.',
    recommendedStepCount: 4,
    highlightedFeatures: ['CAD/DXF file upload', 'Tolerance precision inputs', 'Batch volume estimator'],
    keyWidgets: ['numerical', 'dropdown', 'file_upload', 'date_picker'],
    bestForIndustries: ['CNC Machining', 'Sheet Metal Fabrication', 'Carpentry', '3D Printing'],
    conversionRationale: 'Eliminates incomplete quote requests by enforcing rigorous engineering parameters.',
  },
  {
    id: 'milestone_clinical_trial_screener',
    name: 'Clinical Trial Patient Screener',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Step 1: Inclusion Criteria → Step 2: Health Background → Step 3: Consent Protocol → Step 4: Visit Schedule.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Strict inclusion/exclusion logic', 'Investigator brochure consent', 'Lab visit scheduler'],
    keyWidgets: ['checkbox', 'dropdown', 'smooth_signature', 'appointment'],
    bestForIndustries: ['Pharmaceuticals', 'Biotech Research', 'Academic Medical Centers'],
    conversionRationale: 'Ensures only study-eligible subjects advance to in-person clinic visits.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 3: Conversational / One-at-a-Time "Typeform" (21 – 30)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'card_one_question_intake',
    name: 'One Question at a Time Intake',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Screen 1: Goal → Screen 2: Location → Screen 3: Contact → Instant confirmation.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Full-screen immersion', 'Enter key auto-advance', 'Smooth card transitions'],
    keyWidgets: ['short_answer', 'address', 'email', 'phone'],
    bestForIndustries: ['Creative Agencies', 'Fitness Coaches', 'High-growth Startups'],
    conversionRationale: 'Achieves up to 3x higher mobile completion rates by showing exactly one input at a time.',
  },
  {
    id: 'card_chatgpt_interactive_flow',
    name: 'ChatGPT-Style Conversational Flow',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Conversational chat bubble prompt → User response chips → Adaptive follow-up → Instant AI summary.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Chat bubble UI', 'Quick-reply pills', 'AI response typing animation'],
    keyWidgets: ['short_answer', 'radio', 'long_answer', 'email'],
    bestForIndustries: ['AI Agencies', 'Digital Consultancies', 'E-Learning'],
    conversionRationale: 'Feels like chatting with an intelligent assistant rather than filling a cold web form.',
  },
  {
    id: 'card_micro_quiz_lead_magnet',
    name: 'Micro-Quiz Lead Magnet Funnel',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Q1: Level → Q2: Time Commitment → Q3: Primary Roadblock → Email Gate → Instant Result.',
    recommendedStepCount: 5,
    highlightedFeatures: ['Visual option cards', 'Email-gated personalized score', 'Dynamic result cards'],
    keyWidgets: ['radio', 'image_choice', 'email', 'full_name'],
    bestForIndustries: ['Life Coaching', 'Nutritional Coaching', 'Course Creators'],
    conversionRationale: 'Drives viral social traffic into qualified email leads with irresistible quiz results.',
  },
  {
    id: 'card_interactive_nps_survey',
    name: 'Interactive NPS & Client Feedback',
    engine: 'card_swipe',
    layout: 'card',
    description: '0–10 Rating Scale → "What made you choose this score?" → Tag selection chips → Video/audio review.',
    recommendedStepCount: 3,
    highlightedFeatures: ['0–10 NPS slider', 'Dynamic sentiment follow-up', 'Voice note feedback option'],
    keyWidgets: ['nps_slider', 'star_rating', 'long_answer', 'voice_recorder'],
    bestForIndustries: ['E-Commerce Brands', 'Hospitality', 'SaaS Products', 'Salons'],
    conversionRationale: 'Separates happy promoters (redirect to Google Reviews) from detractors (internal alert).',
  },
  {
    id: 'card_brand_style_discovery',
    name: 'Brand Style & Vibe Discovery',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Card 1: Vibe moodboard choice → Card 2: Color palette selector → Card 3: Tone of voice chips.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Visual moodboard cards', 'Color swatch selectors', 'Brand keyword pills'],
    keyWidgets: ['image_choice', 'radio', 'short_answer', 'email'],
    bestForIndustries: ['Branding Agencies', 'Web Design Studios', 'Interior Designers'],
    conversionRationale: 'Engages prospective clients visually, demonstrating aesthetic expertise instantly.',
  },
  {
    id: 'card_rapid_60sec_audit',
    name: 'Rapid-Fire 60-Second Audit',
    engine: 'card_swipe',
    layout: 'card',
    description: '4 quick yes/no toggles → Monthly budget slider → Instant performance breakdown.',
    recommendedStepCount: 5,
    highlightedFeatures: ['One-tap binary toggles', 'Live score tallying', 'Urgency timer bar'],
    keyWidgets: ['checkbox', 'slider', 'numerical', 'email'],
    bestForIndustries: ['SEO Agencies', 'Cybersecurity', 'Financial Auditing'],
    conversionRationale: 'Micro-commitments keep users tapping forward until submission is completed.',
  },
  {
    id: 'card_culture_fit_talent_screen',
    name: 'Culture-Fit Talent Screen',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Scenario prompt → 3 situational response choices → Work philosophy rating → LinkedIn link.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Situational judgment questions', 'LinkedIn profile auto-fetch', 'Audio intro capture'],
    keyWidgets: ['radio', 'short_answer', 'email', 'voice_recorder'],
    bestForIndustries: ['Remote Companies', 'Fast-Growing Startups', 'Creative Boutiques'],
    conversionRationale: 'Filters for cultural alignment and problem-solving aptitude before live interviews.',
  },
  {
    id: 'card_product_recommendation_finder',
    name: 'Product Recommendation Finder',
    engine: 'card_swipe',
    layout: 'card',
    description: '"My primary goal is..." → "My skin/hair type is..." → "My routine is..." → Curated Bundle.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Visual trait cards', 'Dynamic bundle calculation', '1-click add to cart'],
    keyWidgets: ['image_choice', 'radio', 'email'],
    bestForIndustries: ['Skincare & Cosmetics', 'Supplements', 'Pet Nutrition', 'Mattresses'],
    conversionRationale: 'Guides uncertain shoppers to the exact product match, cutting return rates significantly.',
  },
  {
    id: 'card_founder_pitch_intake',
    name: 'Founder Pitch & Accelerator Intake',
    engine: 'card_swipe',
    layout: 'card',
    description: '"What problem are you solving?" → "What is your traction?" → Pitch deck link → Founder contact.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Traction metrics input', 'Loom/YouTube demo embed', 'Pitch deck upload'],
    keyWidgets: ['short_answer', 'numerical', 'file_upload', 'email', 'phone'],
    bestForIndustries: ['Venture Capital', 'Startup Incubators', 'Angel Syndicates'],
    conversionRationale: 'Lets venture partners review 100+ inbound pitches efficiently in standardized cards.',
  },
  {
    id: 'card_exit_interview_churn',
    name: 'Exit Interview & Churn Prevention',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Multiple-choice departure reason → "What could we improve?" → Discount offer → Final feedback.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Primary cancel reason chips', 'Retention offer trigger modal', 'Honest exit notes'],
    keyWidgets: ['radio', 'long_answer', 'email'],
    bestForIndustries: ['SaaS', 'Gym Memberships', 'Subscription Boxes', 'HR Offboarding'],
    conversionRationale: 'Saves at-risk customers with targeted retention incentives or captures actionable exit data.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 4: Two-Column Split-Hero (31 – 40)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'split_hero_social_proof',
    name: 'Social Proof & Testimonial Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: 5-star ratings, client logo grid, verified badge | Right: 4-field ultra-clean lead capture.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Sticky left social proof', 'Verified customer badges', 'Instant callback input'],
    keyWidgets: ['badge_widget', 'heading', 'paragraph', 'list_widget', 'full_name', 'email', 'phone'],
    bestForIndustries: ['SaaS', 'Agencies', 'Roofing', 'Solar Installation'],
    conversionRationale: 'Destroys buyer skepticism by pairing every field with real verified customer outcomes.',
  },
  {
    id: 'split_hero_live_map',
    name: 'Live Service Area Map Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Live Google Map with service radius & arrival time | Right: Address, problem, dispatch now.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Interactive Google Maps embed', 'Live dispatch arrival badge', 'ZIP radius verification'],
    keyWidgets: ['map_embed', 'service_area_checker', 'address', 'phone', 'dropdown'],
    bestForIndustries: ['Emergency Plumbing', 'Locksmiths', 'Towing', 'Mobile Mechanics'],
    conversionRationale: 'Proves immediate local presence to customers in distress, driving urgent bookings.',
  },
  {
    id: 'split_hero_before_after',
    name: 'Before & After Visual Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Interactive Before/After slider showcase | Right: Treatment selector, budget bracket, photo upload.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Before/after visual proof', 'High-res gallery preview', 'Customer photo upload'],
    keyWidgets: ['image_widget', 'heading', 'dropdown', 'numerical', 'file_upload'],
    bestForIndustries: ['Home Remodeling', 'Cosmetic Dentistry', 'Landscaping', 'Auto Detailing'],
    conversionRationale: 'Seeing undeniable visual transformation inspires immediate desire for a quote.',
  },
  {
    id: 'split_hero_video_explainer',
    name: 'Video Explainer Pro Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Embedded video teaser / founder introduction | Right: Application questions & booking schedule.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Autoplay muted video embed', 'Founder signature badge', 'Calendar schedule picker'],
    keyWidgets: ['video_widget', 'heading', 'appointment', 'email', 'phone'],
    bestForIndustries: ['High-Ticket Coaching', 'Executive Recruiting', 'Private Wealth'],
    conversionRationale: 'Video builds human connection and authority while the prospect completes their details.',
  },
  {
    id: 'split_hero_product_mockup',
    name: 'Product Mockup & Feature Showcase',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: High-res device render with 3 feature callouts | Right: Variant selection, shipping tier, preorder.',
    recommendedStepCount: 1,
    highlightedFeatures: ['3D device render', 'Feature bullet callouts', 'Color/storage variant selector'],
    keyWidgets: ['image_widget', 'list_widget', 'radio', 'address', 'email'],
    bestForIndustries: ['Hardware Preorders', 'Consumer Electronics', 'Fashion Launches'],
    conversionRationale: 'Showcases product craftsmanship persistently beside preorder reservation options.',
  },
  {
    id: 'split_hero_trust_guarantees',
    name: 'Trust & Security Guarantees Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Escrow badges, SSL seals, insurance certifications | Right: Confidential claim / case intake.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Security seals & escrow badge', 'Attorney-client privilege disclaimer', 'Encrypted file drop'],
    keyWidgets: ['badge_widget', 'list_widget', 'full_name', 'phone', 'file_upload'],
    bestForIndustries: ['Personal Injury Law', 'Escrow Services', 'Cyber Insurance'],
    conversionRationale: 'Reassures vulnerable clients that their sensitive claims remain 100% confidential.',
  },
  {
    id: 'split_hero_team_availability',
    name: 'Live Team Availability Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Staff bio photos & "Next available: Today at 2 PM" | Right: Service picker, staff preference, contact.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Practitioner avatar list', 'Real-time next opening badge', 'Service duration pills'],
    keyWidgets: ['image_widget', 'badge_widget', 'dropdown', 'appointment', 'phone'],
    bestForIndustries: ['Salons & Spas', 'Therapy Practices', 'Chiropractors', 'Veterinary'],
    conversionRationale: 'Highlights immediate appointment openings, reducing abandonment from uncertain scheduling.',
  },
  {
    id: 'split_hero_portfolio_showcase',
    name: 'Portfolio Showcase Pro Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Curated masonry gallery of recent client work | Right: Event date, venue, guest count, vision.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Masonry image collage', 'Instagram handle badge', 'Event date picker'],
    keyWidgets: ['image_widget', 'heading', 'date_picker', 'numerical', 'long_answer'],
    bestForIndustries: ['Wedding Photographers', 'Florists', 'Event Planners', 'Interior Architects'],
    conversionRationale: 'Lets the portfolio do the heavy selling right alongside the inquiry form.',
  },
  {
    id: 'split_hero_property_listing',
    name: 'Property Listing Showcase Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: Property photography & amenities list | Right: Check-in/out dates, guest count, viewing request.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Hero architectural photo', 'Amenities checklist tags', 'Date range picker'],
    keyWidgets: ['image_widget', 'list_widget', 'date_range', 'numerical', 'email'],
    bestForIndustries: ['Vacation Villas', 'Commercial Real Estate', 'Luxury Brokerages'],
    conversionRationale: 'Gives prospective buyers or vacationers complete property context while booking.',
  },
  {
    id: 'split_hero_case_study_roi',
    name: 'Case Study ROI & Metrics Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left: "How Acme Corp grew 310% with ServiceOS" | Right: Company size, primary challenge, demo booker.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Stat callout (+310% Growth)', 'Client CEO quote', 'Calendar meeting booker'],
    keyWidgets: ['badge_widget', 'heading', 'list_widget', 'company', 'appointment', 'email'],
    bestForIndustries: ['B2B Enterprise SaaS', 'Revenue Operations', 'Logistics Platforms'],
    conversionRationale: 'Proves tangible financial returns directly beside the demo booking request.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 5: Hero + Form (Landing Page Integrated) (41 – 50)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'hero_landing_bold_banner',
    name: 'Bold Hero Banner with Embedded Box',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Hero Title + Trust Banner above → Compact 3-field floating card overlapping bottom.',
    recommendedStepCount: 1,
    highlightedFeatures: ['High-contrast hero banner', 'Floating card overlap shadow', 'Instant submission CTA'],
    keyWidgets: ['heading', 'paragraph', 'full_name', 'phone', 'address'],
    bestForIndustries: ['PPC Campaigns', 'Local Trade Contractors', 'Auto Repair'],
    conversionRationale: 'The classic top-converting Google Ads landing page formula with zero visual distractions.',
  },
  {
    id: 'hero_landing_event_countdown',
    name: 'Event Countdown & RSVP Banner',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Top: Live countdown timer & speaker avatars → Bottom: 1-click RSVP + calendar add.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Live countdown timer widget', 'Speaker avatars', 'One-click Google/Outlook calendar add'],
    keyWidgets: ['countdown_timer', 'heading', 'full_name', 'email', 'dropdown'],
    bestForIndustries: ['Tech Webinars', 'Product Launches', 'Charity Galas', 'Concerts'],
    conversionRationale: 'Creates genuine urgency with a ticking timer, boosting immediate attendance confirmations.',
  },
  {
    id: 'hero_landing_emergency_callout',
    name: 'Emergency Rapid Callout Banner',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Giant "Under 30 Min Response" banner → 2 fields: Phone + ZIP code → "Dispatch Tech Now".',
    recommendedStepCount: 1,
    highlightedFeatures: ['Flashing emergency badge', 'One-touch phone dialer', '2-field hyper-fast capture'],
    keyWidgets: ['badge_widget', 'heading', 'phone', 'address'],
    bestForIndustries: ['24/7 Locksmiths', 'Flood Restoration', 'Emergency Electricians', 'Towing'],
    conversionRationale: 'Zero friction when a customer is locked out or has flooded floors at 2:00 AM.',
  },
  {
    id: 'hero_landing_free_ebook_gate',
    name: 'Free Resource & E-Book Gate',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Hero mock-up of 3D guide → "Where should we send your PDF?" → Email + Role → Download.',
    recommendedStepCount: 1,
    highlightedFeatures: ['3D book cover preview', 'Instant PDF download link', 'Work email validation'],
    keyWidgets: ['image_widget', 'heading', 'email', 'dropdown'],
    bestForIndustries: ['B2B Marketing', 'Financial Advisory', 'Real Estate Investing'],
    conversionRationale: 'Trades high-value proprietary market research for qualified executive email addresses.',
  },
  {
    id: 'hero_landing_vip_waitlist',
    name: 'Limited Waitlist & Beta Access',
    engine: 'hero_landing',
    layout: 'classic',
    description: '"Join 4,812 founders in line" → Social proof avatar stack → Single email input + Referral code.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Live counter of people in line', 'Avatar stack', 'Unique referral link generator'],
    keyWidgets: ['heading', 'email', 'short_answer'],
    bestForIndustries: ['Fintech Apps', 'Consumer Social', 'AI Tools', 'Hardware Startups'],
    conversionRationale: 'Harnesses FOMO (fear of missing out) to build anticipation before public launches.',
  },
  {
    id: 'hero_landing_webinar_seat_reserve',
    name: 'Live Masterclass Seat Reservation',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Date & Time badges + "Only 14 seats left" badge → Name + Email + Work Title.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Scarcity badge ("14 seats left")', 'Timezone auto-detect', 'Calendar invite sync'],
    keyWidgets: ['badge_widget', 'date_picker', 'full_name', 'email', 'company'],
    bestForIndustries: ['Executive Coaching', 'B2B Sales Training', 'Real Estate Seminars'],
    conversionRationale: 'Limited seat scarcity drives commitment from serious professional attendees.',
  },
  {
    id: 'hero_landing_discount_voucher',
    name: 'First-Visit Discount Voucher Unlock',
    engine: 'hero_landing',
    layout: 'classic',
    description: '"Unlock 20% Off Your First Visit" coupon graphic → Mobile number input for SMS coupon code.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Dotted coupon border graphic', 'SMS code verification', 'Instant barcode generation'],
    keyWidgets: ['heading', 'phone', 'full_name'],
    bestForIndustries: ['Restaurants', 'Barbershops', 'Car Washes', 'Boutique Retail'],
    conversionRationale: 'Builds an SMS marketing list while incentivizing immediate foot traffic into the store.',
  },
  {
    id: 'hero_landing_job_alert_sub',
    name: 'Job Alert & Talent Network Subscription',
    engine: 'hero_landing',
    layout: 'classic',
    description: '"Get notified of senior engineering roles" → Department dropdown + Email.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Role frequency toggle', 'Department tag chips', '1-click unsubscribe notice'],
    keyWidgets: ['dropdown', 'email', 'short_answer'],
    bestForIndustries: ['Recruitment Agencies', 'Tech Employers', 'Healthcare Systems'],
    conversionRationale: 'Builds a warm pool of passive candidates ready for direct outreach upon new openings.',
  },
  {
    id: 'hero_landing_community_invite',
    name: 'Private Community & Member Invite',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Community guidelines summary → LinkedIn profile → Motivation statement → Submit.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Community values badge', 'LinkedIn URL check', 'Vetting status tracker'],
    keyWidgets: ['full_name', 'email', 'short_answer', 'long_answer'],
    bestForIndustries: ['Private Masterminds', 'Investor Networks', 'Industry Guilds'],
    conversionRationale: 'Maintains high member caliber by requiring a thoughtful application statement.',
  },
  {
    id: 'hero_landing_press_kit_download',
    name: 'Press Kit & Media Asset Download',
    engine: 'hero_landing',
    layout: 'classic',
    description: 'Press kit contents preview → Outlet name → Press credentials upload → Instant ZIP download.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Media asset list preview', 'Journalist credential upload', 'Direct ZIP download'],
    keyWidgets: ['company', 'full_name', 'email', 'file_upload'],
    bestForIndustries: ['Public Relations', 'Entertainment', 'Automotive Brands'],
    conversionRationale: 'Provides journalists instant high-res assets while tracking who covered the story.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 6: Card & Visual Selection Grid (51 – 60)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'visual_service_tier_cards',
    name: 'Service Tier Card Selector',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: '3 visual cards (Basic, Pro, Supreme) with feature checklists → Selected card expands details → Book.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Interactive package cards', 'Recommended tier highlight badge', 'Feature comparison bullets'],
    keyWidgets: ['image_choice', 'radio', 'appointment', 'email', 'phone'],
    bestForIndustries: ['House Cleaning', 'Car Detailing', 'Lawn Care', 'Subscriptions'],
    conversionRationale: 'Visual tier contrast gently guides 60%+ of customers into high-margin Pro packages.',
  },
  {
    id: 'visual_problem_diagnosis',
    name: 'Visual Problem Diagnosis Cards',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Photo cards of common issues (termites, rodents, leaks) → User taps photo → Urgency level → Contact.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Photo problem cards', 'Multi-select issue tagging', 'Urgency status pills'],
    keyWidgets: ['image_choice', 'radio', 'address', 'phone'],
    bestForIndustries: ['Pest Control', 'Roofing Repair', 'Plumbing', 'Tree Services'],
    conversionRationale: 'Customers rarely know technical terms; photo cards allow effortless visual identification.',
  },
  {
    id: 'visual_apparel_merch_customizer',
    name: 'Apparel & Merch Customizer',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Color swatches → Garment cards (Hoodie, Tee, Polo) → Quantity matrix → Artwork upload.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Garment photography cards', 'Color swatch selectors', 'Vector logo dropzone'],
    keyWidgets: ['image_choice', 'dropdown', 'numerical', 'file_upload'],
    bestForIndustries: ['Screen Printing', 'Corporate Swag', 'Embroidery', 'Athletic Uniforms'],
    conversionRationale: 'Visualizes the finished merchandise clearly before entering production quantities.',
  },
  {
    id: 'visual_room_space_selector',
    name: 'Room & Space Remodeling Selector',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Visual room tiles (Kitchen, Living Room, Master Bath) with square footage input per tile.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Architectural room tiles', 'Tile toggle state', 'Sq ft input per selected room'],
    keyWidgets: ['image_choice', 'numerical', 'address', 'phone'],
    bestForIndustries: ['Interior Painting', 'Hardwood Flooring', 'Drywall', 'Tile Contractors'],
    conversionRationale: 'Lets homeowners specify multi-room projects with simple visual clicks.',
  },
  {
    id: 'visual_vehicle_model_picker',
    name: 'Vehicle Model & Styling Picker',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Vehicle type cards (Sedan, SUV, Truck, Van) → Make/Model/Year → Service selection cards.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Vehicle silhouette cards', 'Year/Make/Model dropdowns', 'Tint shade percentage cards'],
    keyWidgets: ['image_choice', 'dropdown', 'appointment', 'phone'],
    bestForIndustries: ['Window Tinting', 'Auto Body Wrapping', 'Mechanics', 'Tire Shops'],
    conversionRationale: 'Instant visual vehicle classification speeds up labor and material estimates.',
  },
  {
    id: 'visual_catering_menu_builder',
    name: 'Catering Menu Visual Builder',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Appetizer grid → Main course grid → Dietary restriction toggles → Headcount.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Delicious food photography cards', 'Vegan/GF filter badges', 'Headcount multiplier'],
    keyWidgets: ['image_choice', 'checkbox', 'numerical', 'date_picker'],
    bestForIndustries: ['Corporate Catering', 'Wedding Caterers', 'Private Chefs', 'Bakeries'],
    conversionRationale: 'Appetizing food imagery whets the appetite, encouraging larger orders and upsells.',
  },
  {
    id: 'visual_fitness_equipment_selector',
    name: 'Fitness Equipment & Goal Selector',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Equipment icon cards (Weights, Cardio, Boxing, Yoga) → Fitness goal selector → Schedule intro.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Stylized workout category tiles', 'Goal chips (Weight loss, Muscle)', 'Free trial booker'],
    keyWidgets: ['image_choice', 'radio', 'appointment', 'email'],
    bestForIndustries: ['CrossFit Gyms', 'Boutique Pilates', 'Personal Training Studios', 'Martial Arts'],
    conversionRationale: 'Allows prospective members to align their personal goals with gym offerings instantly.',
  },
  {
    id: 'visual_software_package_builder',
    name: 'Software Feature Package Builder',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Feature checklist tiles with live estimated cost badges (Auth, Payments, Admin, Mobile App).',
    recommendedStepCount: 1,
    highlightedFeatures: ['Feature module tiles', 'Cost badge per module', 'Live running total price ticker'],
    keyWidgets: ['image_choice', 'checkbox', 'form_calculation', 'email'],
    bestForIndustries: ['Web Agencies', 'Mobile App Developers', 'No-Code Studios'],
    conversionRationale: 'Educates clients on real software development scopes and filters out unrealistic budgets.',
  },
  {
    id: 'visual_pet_care_service_grid',
    name: 'Pet Care Service Visual Grid',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Pet photo upload → Service cards (Grooming, Boarding, Daycare, Walking) → Temperament notes.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Pet avatar upload', 'Service duration pills', 'Temperament check toggles'],
    keyWidgets: ['file_upload', 'image_choice', 'date_picker', 'phone'],
    bestForIndustries: ['Dog Grooming', 'Pet Resorts', 'Veterinary Clinics', 'Dog Walkers'],
    conversionRationale: 'Pet parents love uploading photos of their pets, boosting form completion sentiment.',
  },
  {
    id: 'visual_landscaping_project_scope',
    name: 'Landscaping & Outdoor Project Scope',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Outdoor feature cards (Paver Patio, Retaining Wall, Turf, Fire Pit) → Lot size selector → Timeline.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Photo project cards', 'Lot size bracket radio', 'Timeline urgency chips'],
    keyWidgets: ['image_choice', 'dropdown', 'address', 'phone'],
    bestForIndustries: ['Landscape Design', 'Pool Builders', 'Hardscaping Contractors', 'Fencing'],
    conversionRationale: 'Transforms abstract yard ideas into clear, actionable project estimates.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 7: Calculator & Dynamic Price Estimator (61 – 70)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'quote_slider_matrix',
    name: 'Dynamic Slider Cost Estimator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Interactive sliders (Square Footage, Material Grade) → Real-time price range badge → Book estimate.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Smooth interactive sliders', 'Live formula calculation', 'Estimated price range display'],
    keyWidgets: ['slider', 'form_calculation', 'dropdown', 'address', 'phone'],
    bestForIndustries: ['Interior Painting', 'Roofing', 'Carpet Cleaning', 'Paving'],
    conversionRationale: 'Satisfies the user’s #1 question ("How much will it cost?") instantly on the page.',
  },
  {
    id: 'quote_volume_tier_pricing',
    name: 'Volume Tier Pricing Matrix',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Quantity tier slider (10, 50, 100, 500+) → Unit discount indicator → Instant quote breakdown.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Quantity tier slider', 'Discount % callout badge', 'Itemized cost calculation'],
    keyWidgets: ['slider', 'form_calculation', 'numerical', 'company', 'email'],
    bestForIndustries: ['B2B SaaS Subscriptions', 'Custom Printing', 'Manufacturing Wholesalers'],
    conversionRationale: 'Incentivizes higher order volumes by showing unit cost dropping in real time.',
  },
  {
    id: 'quote_solar_roi_savings',
    name: 'Solar & Energy Savings ROI Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Current monthly electric bill input → Calculated 10-year savings graph → Claim tax credits form.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Monthly bill slider', 'Federal tax credit auto-math', '25-year net savings calculation'],
    keyWidgets: ['slider', 'form_calculation', 'address', 'phone'],
    bestForIndustries: ['Solar Energy', 'Heat Pump HVAC', 'Commercial LED Retrofits', 'Insulation'],
    conversionRationale: 'Turns an expensive upfront cost into an irresistible long-term financial investment.',
  },
  {
    id: 'quote_mortgage_loan_payment',
    name: 'Mortgage & Monthly Loan Estimator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Home price slider + Down payment % + Term selector → Monthly payment pill → Pre-approval intake.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Loan term toggle (15 vs 30 yrs)', 'P&I monthly payment math', 'Pre-qualification trigger'],
    keyWidgets: ['slider', 'loan_emi', 'numerical', 'full_name', 'email'],
    bestForIndustries: ['Mortgage Brokers', 'Auto Dealerships', 'Commercial Equipment Financing'],
    conversionRationale: 'Lets borrowers visualize realistic monthly payments before submitting credit details.',
  },
  {
    id: 'quote_event_budget_estimator',
    name: 'Event Budget & Headcount Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Guest count slider + Catering tier ($50/$100/$150) + Bar package toggle → Total budget summary.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Guest headcount slider', 'Per-person catering multiplier', 'Bar package checkbox sum'],
    keyWidgets: ['slider', 'radio', 'checkbox', 'form_calculation', 'email'],
    bestForIndustries: ['Wedding Venues', 'Gala Organizers', 'Corporate Event Spaces', 'Catering'],
    conversionRationale: 'Assists event planners in sizing budgets accurately with transparent per-person rates.',
  },
  {
    id: 'quote_freelance_scope_rate',
    name: 'Creative Project Scope & Rate Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Deliverable type radio + Video length slider + Turnaround urgency toggle → Price estimate → Lock in date.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Minutes of footage slider', 'Rush delivery fee formula', 'Instant deposit amount'],
    keyWidgets: ['radio', 'slider', 'form_calculation', 'date_picker', 'email'],
    bestForIndustries: ['Video Production', 'Copywriting Studios', 'Podcast Editing', 'Animation'],
    conversionRationale: 'Stops undercharging and aligns client expectations before discovery calls.',
  },
  {
    id: 'quote_freight_shipping_matrix',
    name: 'Freight & Logistics Shipping Matrix',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Origin ZIP + Destination ZIP + Weight slider + Freight class → Calculated rate → Book shipment.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Origin & Destination ZIP inputs', 'Pallet weight slider', 'Liftgate service toggle'],
    keyWidgets: ['address', 'slider', 'checkbox', 'form_calculation', 'phone'],
    bestForIndustries: ['LTL Freight', 'Heavy Equipment Moving', 'Cargo Haulers', 'Cross-Country Movers'],
    conversionRationale: 'Automates logistics quoting that otherwise takes dispatchers hours to calculate.',
  },
  {
    id: 'quote_tax_deduction_estimator',
    name: 'Tax Deduction & Write-Off Estimator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Income range slider + Expense category chips → Potential deduction savings preview → Book consultation.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Revenue bracket slider', 'Deduction category toggles', 'Estimated tax savings preview'],
    keyWidgets: ['slider', 'checkbox', 'form_calculation', 'appointment', 'email'],
    bestForIndustries: ['CPAs', 'Tax Relief Counsel', 'Fractional CFOs', 'Bookkeeping'],
    conversionRationale: 'Highlights money left on the table, creating immediate demand for CPA advisory calls.',
  },
  {
    id: 'quote_storage_unit_size_calc',
    name: 'Self-Storage Unit Size Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: '"How much are you storing?" visual room cards → Recommended unit size (10x10) → Reserve unit.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Home size visual selector', 'Unit dimensions recommendation', 'Hold deposit reservation'],
    keyWidgets: ['image_choice', 'form_calculation', 'date_picker', 'phone'],
    bestForIndustries: ['Self-Storage Facilities', 'RV & Boat Storage', 'Mobile Pod Moving'],
    conversionRationale: 'Eliminates sizing confusion for movers, allowing 1-click storage unit reservations.',
  },
  {
    id: 'quote_insurance_premium_calc',
    name: 'Insurance Premium & Coverage Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Coverage amount slider + Deductible toggle + Age bracket → Estimated monthly premium → Apply.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Coverage limit slider', 'Deductible bracket radio', 'Monthly vs annual payment toggle'],
    keyWidgets: ['slider', 'radio', 'form_calculation', 'full_name', 'email'],
    bestForIndustries: ['Term Life Insurance', 'Pet Insurance', 'Commercial Liability', 'Renters Insurance'],
    conversionRationale: 'Empowers insurance buyers to customize their own balance of deductible vs premium.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 8: Operational, Checklist & Field Workspaces (71 – 80)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'inspection_multipoint_vehicle',
    name: 'Multi-Point Vehicle Inspection',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Categorized pass/fail/warn checklist (Brakes, Fluids, Tires) → Photo evidence → Sign-off.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Green/Yellow/Red condition toggles', 'Photo evidence capture', 'Technician signature pad'],
    keyWidgets: ['checkbox', 'image_upload_with_notes', 'smooth_signature', 'date_picker'],
    bestForIndustries: ['Auto Repair Shops', 'Fleet Maintenance', 'Car Dealerships', 'Tire Centers'],
    conversionRationale: 'Builds customer trust by attaching verifiable photo proof to necessary repair recommendations.',
  },
  {
    id: 'inspection_hvac_seasonal_tuneup',
    name: 'HVAC Seasonal Maintenance Checklist',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'System specs → Filter check toggle → Pressure readings input → Blower check → Customer sign-off.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Subcooling/Superheat number inputs', 'Filter size dropdown', 'Customer digital sign-off'],
    keyWidgets: ['numerical', 'checkbox', 'image_upload_with_notes', 'smooth_signature'],
    bestForIndustries: ['HVAC Contractors', 'Refrigeration Techs', 'Facilities Maintenance'],
    conversionRationale: 'Standardizes technician tune-ups across trucks and proves job completion to the customer.',
  },
  {
    id: 'inspection_workplace_safety_osha',
    name: 'Workplace Safety & OSHA Compliance Audit',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Safety hazards checklist → Incident risk severity → Remediation action plan → Inspector signature.',
    recommendedStepCount: 3,
    highlightedFeatures: ['OSHA compliance categories', 'Severity severity matrix', 'Corrective action plan notes'],
    keyWidgets: ['checkbox', 'dropdown', 'long_answer', 'smooth_signature'],
    bestForIndustries: ['Construction Sites', 'Manufacturing Plants', 'Warehousing', 'Chemical Facilities'],
    conversionRationale: 'Shields companies from OSHA liability with rigorous, timestamped digital inspection logs.',
  },
  {
    id: 'inspection_property_move_in_out',
    name: 'Property Move-In / Move-Out Condition Audit',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Room-by-room condition rating (Clean, Scratched, Damaged) → Timestamped photos → Tenant signature.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Room-by-room condition chips', 'Photo upload with annotations', 'Dual landlord & tenant signature'],
    keyWidgets: ['checkbox', 'image_upload_with_notes', 'smooth_signature', 'date_picker'],
    bestForIndustries: ['Property Managers', 'Landlords', 'Student Housing', 'Short-Term Rentals'],
    conversionRationale: 'Eliminates security deposit disputes by creating an objective digital condition record.',
  },
  {
    id: 'inspection_kitchen_health_sanitation',
    name: 'Commercial Kitchen Sanitation & Health Audit',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Temperature logs matrix (Freezer, Line, Dishwasher) → Sanitizer PPM reading → Cleanliness checklist.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Thermometer temperature inputs', 'Sanitizer PPM chemical checks', 'Shift manager sign-off'],
    keyWidgets: ['numerical', 'checkbox', 'short_answer', 'smooth_signature'],
    bestForIndustries: ['Restaurants', 'Hotel Kitchens', 'Food Processing', 'Hospital Cafeterias'],
    conversionRationale: 'Guarantees compliance with municipal health codes and avoids costly shutdown infractions.',
  },
  {
    id: 'inspection_construction_daily_report',
    name: 'Construction Daily Field Report',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Weather conditions radio → Subcontractor headcounts table → Work completed log → Delay notes.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Weather condition picker', 'Subcontractor crew headcount table', 'Daily site progress photo'],
    keyWidgets: ['radio', 'numerical', 'image_upload_with_notes', 'long_answer'],
    bestForIndustries: ['General Contractors', 'Commercial Builders', 'Civil Engineering', 'Roofing'],
    conversionRationale: 'Protects contractors in delay disputes with verifiable daily manpower and weather records.',
  },
  {
    id: 'inspection_it_hardware_provisioning',
    name: 'IT Hardware & Asset Provisioning Form',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Employee role → Laptop spec choice (Mac/PC) → Monitor/Peripherals checklist → Shipping address.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Hardware asset serial tracking', 'Accessories checkbox grid', 'Employee receipt confirmation'],
    keyWidgets: ['dropdown', 'checkbox', 'address', 'smooth_signature'],
    bestForIndustries: ['Enterprise IT Departments', 'Managed Service Providers (MSP)', 'Remote Tech Companies'],
    conversionRationale: 'Ensures remote hires receive the exact equipment needed on day 1 with full asset tracking.',
  },
  {
    id: 'inspection_qa_software_release',
    name: 'QA & Software Release Sign-Off Checklist',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'QA test suite status toggles → Known blockers textarea → Sign-off checkbox → Deployment authorization.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Pass/Fail/Skip toggles', 'Build commit hash input', 'Engineering lead digital signature'],
    keyWidgets: ['checkbox', 'short_answer', 'long_answer', 'smooth_signature'],
    bestForIndustries: ['SaaS Engineering', 'DevOps Agencies', 'Medical Device Software'],
    conversionRationale: 'Prevents buggy code deployments by enforcing strict sign-off checklists before production releases.',
  },
  {
    id: 'inspection_field_work_order',
    name: 'Field Service Work Order Completion',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Parts used table with prices → Labor hours input → Before/after photo uploads → Customer signature.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Parts line item pricing', 'Labor hours counter', 'Before/after work photos', 'Signature'],
    keyWidgets: ['numerical', 'image_upload_with_notes', 'smooth_signature', 'appointment'],
    bestForIndustries: ['Plumbers', 'Electricians', 'Appliance Repair', 'Glass Replacement'],
    conversionRationale: 'Captures on-site customer approval and invoice sign-off before the truck leaves the driveway.',
  },
  {
    id: 'inspection_incident_accident_report',
    name: 'Workplace Incident & Injury Report',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Incident timestamp & location → Person involved details → Narrative description → Witness statements.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Incident exact time/date picker', 'Injury severity chips', 'Witness statement repeater'],
    keyWidgets: ['date_picker', 'time_picker', 'address', 'long_answer', 'file_upload'],
    bestForIndustries: ['Security Companies', 'Logistics Warehouses', 'Retail Stores', 'Schools'],
    conversionRationale: 'Provides structured, unalterable documentation required for workers’ comp and insurance claims.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 9: Booking & Calendar First (81 – 90)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'booking_calendar_inline',
    name: 'Calendar & Time-Slot First',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Prominent month calendar + Available time slots column → Service selector → Contact details → Confirmation.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Interactive monthly calendar', 'Real-time available time slot pills', 'Timezone indicator'],
    keyWidgets: ['appointment', 'date_picker', 'time_picker', 'dropdown', 'full_name', 'email', 'phone'],
    bestForIndustries: ['Barbers & Hair Stylists', 'Therapists', 'Executive Coaches', 'Consultants'],
    conversionRationale: 'Removes the barrier of "when are you free?" by letting clients lock in their preferred time instantly.',
  },
  {
    id: 'booking_service_then_slot',
    name: 'Service Menu First, Then Slot',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Step 1: Visual service menu with durations → Step 2: Staff preference → Step 3: Calendar date/slot.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Service duration & price cards', 'Staff practitioner avatars', 'Dynamic slot filter by duration'],
    keyWidgets: ['image_choice', 'dropdown', 'appointment', 'phone'],
    bestForIndustries: ['Day Spas', 'Med Spas', 'Acupuncture Clinics', 'Auto Detailers'],
    conversionRationale: 'Matches the client’s requested treatments with the right technician’s schedule automatically.',
  },
  {
    id: 'booking_multi_day_retreat',
    name: 'Multi-Day Retreat & Room Booking',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Check-in/Check-out date range picker → Room type cards → Meal plan selector → Deposit payment.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Date range selector', 'Room photo cards', 'Dietary preference toggles'],
    keyWidgets: ['date_range', 'image_choice', 'checkbox', 'email', 'phone'],
    bestForIndustries: ['Yoga Retreats', 'Wellness Sanctuaries', 'Boutique Lodges', 'Glamping'],
    conversionRationale: 'Handles complex multi-night accommodations and dietary requirements seamlessly.',
  },
  {
    id: 'booking_group_class_roster',
    name: 'Group Class & Workshop Roster',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Upcoming class schedule list with available spots remaining ("3 spots left") → 1-click reserve.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Available seats counter ("3 left")', 'Instructor headshot badge', '1-click reservation CTA'],
    keyWidgets: ['dropdown', 'appointment', 'full_name', 'phone'],
    bestForIndustries: ['Spin Studios', 'Cooking Schools', 'Ceramics Workshops', 'Dance Academies'],
    conversionRationale: 'Live seat counts create social proof and urgency to book before classes sell out.',
  },
  {
    id: 'booking_consultation_duration',
    name: 'Consultation Duration Chooser',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: '15-min Discovery (Free) / 45-min Deep Dive ($150) / 90-min Strategy ($300) cards → Calendar sync.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Tiered session duration cards', 'Automatic calendar duration sync', 'Paid deposit checkout'],
    keyWidgets: ['image_choice', 'appointment', 'full_name', 'email'],
    bestForIndustries: ['Legal Advisors', 'Financial Planners', 'Architects', 'Fractional Executives'],
    conversionRationale: 'Lets prospects choose their own level of commitment while screening tire-kickers.',
  },
  {
    id: 'booking_equipment_rental_dates',
    name: 'Equipment Rental Date Reservation',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Rental start & end datetime pickers → Pickup vs Delivery radio → ID verification upload → Deposit.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Start and end datetime pickers', 'Driver’s license photo dropzone', 'Security deposit authorization'],
    keyWidgets: ['date_range', 'radio', 'file_upload', 'smooth_signature', 'phone'],
    bestForIndustries: ['Camera Gear Rental', 'Heavy Machinery Rental', 'Party & Tent Rental', 'Trailers'],
    conversionRationale: 'Eliminates double-booking of physical gear by syncing equipment rental calendars.',
  },
  {
    id: 'booking_recurring_service_freq',
    name: 'Recurring Service Frequency Picker',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Weekly (Save 20%) / Bi-weekly (Save 15%) / Monthly / One-time chips → Preferred day → Address.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Frequency discount chips', 'Preferred day-of-week checkboxes', 'Service address checker'],
    keyWidgets: ['radio', 'service_area_checker', 'address', 'appointment', 'phone'],
    bestForIndustries: ['House Cleaning', 'Lawn Mowing', 'Pool Maintenance', 'Commercial Janitorial'],
    conversionRationale: 'Converts one-time inquiries into recurring high-lifetime-value subscription contracts.',
  },
  {
    id: 'booking_multi_staff_matrix',
    name: 'Multi-Staff Practitioner Matrix',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Practitioner selection bar with profile photos → Dynamic practitioner availability grid → Reserve slot.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Staff profile photo avatars', 'Dynamic per-staff calendar slots', 'Next available fallback'],
    keyWidgets: ['image_choice', 'appointment', 'full_name', 'phone'],
    bestForIndustries: ['Group Medical Practices', 'Dental Centers', 'Multi-Chair Barbershops', 'Veterinary Clinics'],
    conversionRationale: 'Empowers clients to book their favorite provider directly without calling the front desk.',
  },
  {
    id: 'booking_virtual_video_meeting',
    name: 'Virtual Video Meeting Scheduler',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Timezone auto-detector dropdown → Zoom/Google Meet link preference → Available slots → Pre-meeting agenda.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Timezone auto-detector', 'Meeting platform toggle (Zoom vs Meet)', 'Preparation agenda notes'],
    keyWidgets: ['timezone_picker', 'appointment', 'short_answer', 'long_answer', 'email'],
    bestForIndustries: ['Remote Sales Calls', 'Tech Recruiters', 'International Consulting', 'Product Demos'],
    conversionRationale: 'Eliminates international timezone confusion and automatically generates video meeting links.',
  },
  {
    id: 'booking_onsite_time_window',
    name: 'On-Site Assessment Time Window',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Morning (8am–12pm) / Afternoon (12pm–4pm) / Evening window chips → Property access notes → Confirm.',
    recommendedStepCount: 1,
    highlightedFeatures: ['4-hour arrival window chips', 'Gate code / parking notes', 'SMS dispatch notification opt-in'],
    keyWidgets: ['date_picker', 'radio', 'address', 'long_answer', 'phone'],
    bestForIndustries: ['Pest Control', 'Appliance Delivery', 'Home Appraisers', 'Cable & Fiber Installers'],
    conversionRationale: 'Aligns customer expectations with realistic technician arrival windows, reducing missed visits.',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGINE 10: AI Dynamic & Smart Adaptive (91 – 100)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'ai_concierge_smart_intake',
    name: 'AI Smart Concierge Intake',
    engine: 'ai_dynamic_concierge',
    layout: 'card',
    description: '"Tell us what you want to achieve" open textarea → AI parses needs and auto-populates structured follow-ups.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Natural language prompt input', 'AI auto-extraction pills', 'Adaptive dynamic questions'],
    keyWidgets: ['long_answer', 'short_answer', 'dropdown', 'email', 'phone'],
    bestForIndustries: ['Full-Service Creative Agencies', 'Luxury Travel Planning', 'Custom Software'],
    conversionRationale: 'Allows clients to explain requirements naturally without struggling through rigid dropdowns.',
  },
  {
    id: 'ai_adaptive_medical_triage',
    name: 'Adaptive Medical & Symptom Triage',
    engine: 'ai_dynamic_concierge',
    layout: 'card',
    description: 'Primary symptom input → Conditional branching triage questions based on severity → Priority routing.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Symptom severity logic branch', 'Red-flag emergency warning banner', 'Priority clinical routing'],
    keyWidgets: ['dropdown', 'checkbox', 'short_answer', 'smooth_signature', 'phone'],
    bestForIndustries: ['Urgent Care Centers', 'Telehealth Apps', 'Pediatric Advice Lines'],
    conversionRationale: 'Triages critical cases immediately while capturing detailed intake for non-urgent patients.',
  },
  {
    id: 'ai_document_parsing_autofill',
    name: 'Document Parsing & Auto-Fill',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Drag-and-drop document upload (PDF/Image) → AI extracts data into editable fields → Review & Submit.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Drag-and-drop PDF dropzone', 'OCR data extraction animation', 'Editable field verification review'],
    keyWidgets: ['file_upload', 'short_answer', 'numerical', 'date_picker', 'smooth_signature'],
    bestForIndustries: ['Insurance Claims', 'Tax Filing Intake', 'Mortgage Document Collection'],
    conversionRationale: 'Saves users from re-typing data already printed on their physical documents or bills.',
  },
  {
    id: 'ai_interactive_decision_tree',
    name: 'Interactive Troubleshooting Decision Tree',
    engine: 'ai_dynamic_concierge',
    layout: 'card',
    description: 'Step-by-step branching pathway: "What OS?" → "What version?" → "What error code?" → Resolution.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Branching path visualization', 'Knowledge-base article suggestions', 'Escalate to human ticket'],
    keyWidgets: ['radio', 'short_answer', 'file_upload', 'email'],
    bestForIndustries: ['SaaS Technical Support', 'Appliance Diagnostics', 'IT Helpdesks'],
    conversionRationale: 'Deflects 40%+ of repetitive support tickets by offering instant guided self-service.',
  },
  {
    id: 'ai_brand_voice_copywriting_brief',
    name: 'Brand Voice & Creative Brief Generator',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Tone of voice sliders (Playful ↔ Formal) → Target persona description → Topic keywords → Generate brief.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Tone of voice spectrum sliders', 'Persona description area', 'Instant brief preview'],
    keyWidgets: ['slider', 'short_answer', 'long_answer', 'email'],
    bestForIndustries: ['Copywriting Agencies', 'Advertising Studios', 'Social Media Management'],
    conversionRationale: 'Extracts exact stylistic guidelines from clients so the creative team nails the first draft.',
  },
  {
    id: 'ai_warranty_damage_photo_triage',
    name: 'Warranty Claim & Damage Photo Triage',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Serial number input → Damage photo dropzone → Warranty lookup status badge → Resolution preference.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Serial number barcode scanner', 'Damage photo upload', 'Replacement vs refund selection'],
    keyWidgets: ['short_answer', 'image_upload_with_notes', 'radio', 'address', 'email'],
    bestForIndustries: ['Electronics Manufacturers', 'Luggage Brands', 'Power Tools', 'Furniture'],
    conversionRationale: 'Automates warranty verification and damage validation without phone call hold times.',
  },
  {
    id: 'ai_performance_review_360',
    name: 'Performance Review & 360 Feedback',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Competency rating matrix (1–5) → Strengths narrative → Areas for growth → Peer nomination.',
    recommendedStepCount: 2,
    highlightedFeatures: ['1–5 Likert competency matrix', 'Confidential peer nomination', 'Developmental goal builder'],
    keyWidgets: ['likert_matrix', 'star_rating', 'long_answer', 'dropdown'],
    bestForIndustries: ['Enterprise HR', 'Talent Development', 'Executive Coaching'],
    conversionRationale: 'Provides a structured, objective framework for quarterly and annual employee evaluations.',
  },
  {
    id: 'ai_website_seo_audit_intake',
    name: 'Website & SEO Audit Intake',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Website URL input → Automated preliminary score teaser → Target competitors input → Full audit request.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Website URL validation', 'Top 3 competitor URL inputs', 'Preliminary score teaser'],
    keyWidgets: ['short_answer', 'long_answer', 'full_name', 'email', 'phone'],
    bestForIndustries: ['SEO Agencies', 'Web Design Agencies', 'Conversion Rate Optimization (CRO)'],
    conversionRationale: 'Captures prospective clients actively looking to outrank their specific competitors.',
  },
  {
    id: 'ai_event_speaker_abstract',
    name: 'Conference Speaker Abstract Submission',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Talk title & abstract textarea → Speaker bio & headshot upload → Session track radio → AV requirements.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Abstract word count monitor', 'Headshot photo dropzone', 'Session track categorization'],
    keyWidgets: ['short_answer', 'long_answer', 'file_upload', 'radio', 'email'],
    bestForIndustries: ['Tech Conferences', 'Academic Symposiums', 'Industry Summits'],
    conversionRationale: 'Collects speaker proposals in a standardized format ready for peer review committees.',
  },
  {
    id: 'ai_creative_revision_workspace',
    name: 'Creative Revision & Feedback Workspace',
    engine: 'ai_dynamic_concierge',
    layout: 'classic',
    description: 'Project link input → Timestamp / asset reference table → Change request list with urgency pill → Submit.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Timestamp/frame reference inputs', 'Urgency severity badges', 'File attachment dropzone'],
    keyWidgets: ['short_answer', 'long_answer', 'dropdown', 'file_upload'],
    bestForIndustries: ['Video Post-Production', 'Graphic Design Boutiques', 'Web Developers', 'Architects'],
    conversionRationale: 'Replaces messy email chains with organized, timestamp-referenced client revision requests.',
  },
];

// Backwards compatibility alias
export const FORM_STRUCTURES_50: FormExperienceStructure[] = FORM_STRUCTURES_100;

export function getFormStructureById(id: string): FormExperienceStructure | undefined {
  return FORM_STRUCTURES_100.find((s) => s.id === id);
}

export function getStructuresByEngine(engine: ExperienceEngineType): FormExperienceStructure[] {
  return FORM_STRUCTURES_100.filter((s) => s.engine === engine);
}

/**
 * Intelligently recommends one of the 100 Form Experience Structures based on
 * the template's category, industry, and variant index.
 */
export function recommendStructureForTemplate(
  category?: string,
  industry?: string,
  variantIndex = 0
): FormExperienceStructure {
  const c = (category || '').toLowerCase();
  const i = (industry || '').toLowerCase();

  // 1. Quote / Estimation / Calculation / Solar / Roof / Loan -> Engine 7 (61-70)
  if (c.includes('estimate') || c.includes('quote') || c.includes('calculator') || c.includes('loan') || i.includes('roof') || i.includes('solar') || i.includes('paint')) {
    const quoteStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'quote_calculator');
    return quoteStructures[variantIndex % quoteStructures.length]!;
  }

  // 2. Booking / Appointment / Calendar / Schedule / Spa / Clinic -> Engine 9 (81-90)
  if (c.includes('booking') || c.includes('appointment') || c.includes('schedule') || i.includes('salon') || i.includes('spa') || i.includes('clinic') || i.includes('barber')) {
    const bookingStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'booking_scheduler');
    return bookingStructures[variantIndex % bookingStructures.length]!;
  }

  // 3. Inspection / Checklist / Audit / Maintenance / Safety -> Engine 8 (71-80)
  if (c.includes('inspection') || c.includes('checklist') || c.includes('audit') || c.includes('maintenance') || c.includes('safety') || i.includes('hvac') || i.includes('mechanic')) {
    const inspectionStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'field_inspection');
    return inspectionStructures[variantIndex % inspectionStructures.length]!;
  }

  // 4. Survey / Feedback / Quiz / NPS / Review / Rating -> Engine 3 (21-30)
  if (c.includes('feedback') || c.includes('survey') || c.includes('quiz') || c.includes('review') || c.includes('nps')) {
    const cardStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'card_swipe');
    return cardStructures[variantIndex % cardStructures.length]!;
  }

  // 5. Multi-Step Wizard / Application / Registration / Mortgage / Admission -> Engine 2 (11-20)
  if (c.includes('application') || c.includes('wizard') || c.includes('registration') || c.includes('onboarding') || c.includes('rental') || c.includes('screening')) {
    const wizardStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'milestone_stepper');
    return wizardStructures[variantIndex % wizardStructures.length]!;
  }

  // 6. Visual Choice / Tier Picker / Menu / Room / Garment -> Engine 6 (51-60)
  if (c.includes('package') || c.includes('tier') || c.includes('menu') || c.includes('customizer') || i.includes('cleaning') || i.includes('detail') || i.includes('catering') || i.includes('florist')) {
    const visualStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'visual_choice_grid');
    return visualStructures[variantIndex % visualStructures.length]!;
  }

  // 7. Split-Hero / Storytelling / Real Estate / Luxury / High Ticket -> Engine 4 (31-40)
  if (c.includes('split') || i.includes('real_estate') || i.includes('luxury') || i.includes('architecture') || i.includes('interior') || i.includes('saas')) {
    const splitStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'split_hero');
    return splitStructures[variantIndex % splitStructures.length]!;
  }

  // 8. Hero Landing Banner / Emergency / Lead Magnet / Waitlist -> Engine 5 (41-50)
  if (c.includes('landing') || c.includes('lead') || c.includes('waitlist') || c.includes('emergency') || i.includes('locksmith') || i.includes('towing')) {
    const landingStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'hero_landing');
    return landingStructures[variantIndex % landingStructures.length]!;
  }

  // 9. AI Dynamic / Triage / Decision Tree / Revision -> Engine 10 (91-100)
  if (c.includes('ai') || c.includes('triage') || c.includes('diagnostic') || c.includes('revision') || c.includes('brief')) {
    const aiStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'ai_dynamic_concierge');
    return aiStructures[variantIndex % aiStructures.length]!;
  }

  // 10. Consent / Waiver / Legal / Contract -> Engine 5 (hero_landing with signature focus)
  if (c.includes('consent') || c.includes('waiver') || c.includes('legal')) {
    const landingStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'hero_landing');
    return landingStructures[variantIndex % landingStructures.length]!;
  }

  // 11. Order / Payment / Donation / Membership -> Engine 6 (visual_choice_grid for pricing tiers)
  if (c.includes('order') || c.includes('payment') || c.includes('donation') || c.includes('membership')) {
    const visualStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'visual_choice_grid');
    return visualStructures[variantIndex % visualStructures.length]!;
  }

  // 12. Intake / Healthcare / Education / Employment -> Engine 2 (milestone_stepper)
  if (c.includes('intake') || c.includes('healthcare') || c.includes('education') || c.includes('employment') || c.includes('report')) {
    const wizardStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'milestone_stepper');
    return wizardStructures[variantIndex % wizardStructures.length]!;
  }

  // 13. Contact / Request / Lead / Marketing / Customer Service -> Engine 5 (hero_landing)
  if (c.includes('contact') || c.includes('request') || c.includes('lead') || c.includes('marketing') || c.includes('customer_service')) {
    const landingStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'hero_landing');
    return landingStructures[variantIndex % landingStructures.length]!;
  }

  // 14. Assessment / Finance / Internal Operations -> Engine 2 (milestone_stepper)
  if (c.includes('assessment') || c.includes('finance') || c.includes('internal_operations')) {
    const wizardStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'milestone_stepper');
    return wizardStructures[variantIndex % wizardStructures.length]!;
  }

  // 15. Event -> Engine 9 (booking_scheduler)
  if (c.includes('event')) {
    const bookingStructures = FORM_STRUCTURES_100.filter((s) => s.engine === 'booking_scheduler');
    return bookingStructures[variantIndex % bookingStructures.length]!;
  }

  // 16. Default — rotate across multiple engines by variantIndex to avoid sameness
  // Previously 53% of combos fell here. Now only truly unmatched categories reach
  // this branch, and we rotate them across 4 engines for visual diversity.
  const fallbackEngines = ['classic_business', 'hero_landing', 'milestone_stepper', 'split_hero'] as const;
  const fallbackEngine = fallbackEngines[variantIndex % fallbackEngines.length]!;
  const fallbackStructures = FORM_STRUCTURES_100.filter((s) => s.engine === fallbackEngine);
  return fallbackStructures[variantIndex % fallbackStructures.length]!;
}
