/**
 * AI Agent Canonical Templates (Jotform Agent Parity).
 *
 * Pre-trained, interactive conversational AI personas equipped with:
 * - Domain knowledge bases and system guardrails
 * - Tone profiles (friendly, professional, medical, sales, empathetic)
 * - Interactive action triggers (instant calculation, calendar booking, sub-form fast-fill)
 * - Complete working schema for direct editing in the Unified Visual Studio.
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

const NOW = new Date().toISOString();

// ─── 1. HVAC Emergency Diagnostic & Dispatch Agent ───────────────────────────
const HVAC_DIAGNOSTIC_AGENT: FormTemplate = {
  id: 'hvac-emergency-diagnostic-agent',
  name: 'HVAC Emergency Diagnostic & Dispatch Agent',
  shortDescription: '24/7 AI HVAC technician that diagnoses cooling/heating failures, estimates repair costs, and dispatches on-call techs.',
  description:
    'An intelligent conversational agent trained on residential and commercial HVAC diagnostic decision trees. Pre-qualifies system age, refrigerant symptoms, airflow blockage, and thermostat codes before instant booking.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Senior HVAC Triage Specialist',
    avatarIcon: 'Flame',
    voiceTone: 'professional',
    greetingMessage: "Hello! I'm your Apex Air 24/7 HVAC Emergency Assistant. Is your heating or AC system failing, making noise, or blowing warm air?",
    systemPrompt:
      'You are a certified master HVAC diagnostic assistant. Ask clarifying questions regarding equipment type (Heat Pump, Central AC, Gas Furnace), age, error codes, and symptoms. Provide preliminary troubleshooting steps (filter check, breaker check) and seamlessly offer emergency technician dispatch.',
    suggestedPrompts: [
      'My AC is blowing warm air',
      'The outdoor unit is frozen with ice',
      'Furnace is making a loud banging noise',
      'Need emergency same-day repair',
    ],
    knowledgeTopics: [
      'AC Not Cooling Decision Tree',
      'Furnace Error Codes (Carrier, Trane, Lennox)',
      'Emergency Dispatch Fee Schedules',
      'Seasonal Maintenance Checklist',
    ],
    actionForms: ['emergency-repair-dispatch', 'instant-tuneup-booking'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#059669', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'HVAC Diagnostic' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Homeowner Name', placeholder: 'John Smith', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Emergency Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'service_address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      {
        id: 'system_type',
        type: 'dropdown',
        label: 'System Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Central Air Conditioner', value: 'central_ac' },
          { label: 'Heat Pump', value: 'heat_pump' },
          { label: 'Gas / Electric Furnace', value: 'furnace' },
          { label: 'Ductless Mini-Split', value: 'mini_split' },
          { label: 'Commercial Rooftop (RTU)', value: 'commercial_rtu' },
        ],
      },
      {
        id: 'urgency_level',
        type: 'radio',
        label: 'Urgency Level',
        required: true,
        width: 'half',
        options: [
          { label: '🔴 Emergency (No Heat/Cool, Vulnerable Family/Pets)', value: 'emergency' },
          { label: '🟡 Urgent (System Struggling, Need Service Today)', value: 'urgent' },
          { label: '🟢 Standard (Routine Maintenance / Quote)', value: 'standard' },
        ],
      },
      { id: 'symptom_description', type: 'long_answer', label: 'Symptoms / Error Codes', placeholder: 'Describe what happened, any sounds or smells...', required: true, width: 'full' },
    ],
  },
  categories: ['customer_service', 'lead_generation', 'booking', 'quote'],
  industries: ['hvac', 'home_services'],
  useCases: ['intake', 'service_request', 'appointment_booking'],
  audiences: ['b2c', 'b2b'],
  tags: ['hvac', 'ai agent', 'emergency', 'diagnostics', 'dispatch', 'heating', 'cooling'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 3820,
  ratingAverage: 4.96,
  ratingCount: 142,
  seo: {
    seoTitle: 'HVAC AI Diagnostic Agent & Dispatch Bot Template',
    seoDescription: 'Deploy a 24/7 AI HVAC technician bot that troubleshoots AC and furnace breakdowns and books dispatch appointments.',
    seoKeywords: ['hvac ai agent', 'hvac chatbot', 'emergency hvac booking', 'air conditioning triage bot'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 2. Dental Patient Triage & Booking Concierge ────────────────────────────
const DENTAL_TRIAGE_AGENT: FormTemplate = {
  id: 'dental-patient-triage-agent',
  name: 'Dental Patient Triage & Booking Concierge',
  shortDescription: 'Compassionate dental AI agent that evaluates tooth pain, screens insurance, and books emergency or routine dental visits.',
  description:
    'An empathetic patient-facing AI concierge for dental practices. Classifies acute trauma vs routine cleanings, collects dental insurance details, and offers real-time chair-time booking.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Dental Care Coordinator',
    avatarIcon: 'HeartPulse',
    voiceTone: 'medical',
    greetingMessage: 'Welcome to Smile Dental. How can I help you today? If you are experiencing tooth pain or swelling, please let me know right away.',
    suggestedPrompts: [
      'I have severe tooth pain and swelling',
      'Need to book a routine cleaning and exam',
      'Do you accept Delta Dental insurance?',
      'How much does teeth whitening cost?',
    ],
    systemPrompt:
      'You are a warm, clinical dental care coordinator. Screen for acute emergency red flags (facial swelling, fever, bleeding, knocked-out tooth) and direct urgent cases to emergency slots. For general visits, collect insurance and schedule appointments.',
    knowledgeTopics: [
      'Dental Emergency Classification',
      'Accepted In-Network Insurance Providers',
      'Post-Op Extraction Instructions',
      'Sedation Dentistry Options',
    ],
    actionForms: ['dental-new-patient-intake', 'emergency-dental-slot-picker'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#0284c7', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Patient Information' }],
    fields: [
      { id: 'patient_name', type: 'short_answer', label: 'Patient Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      {
        id: 'pain_level',
        type: 'rating',
        label: 'Current Pain Level (0 = None, 10 = Severe)',
        required: true,
        width: 'half',
      },
      { id: 'insurance_provider', type: 'short_answer', label: 'Dental Insurance Carrier', placeholder: 'e.g. Delta Dental, Cigna, Self-Pay', required: true, width: 'full' },
      { id: 'chief_complaint', type: 'long_answer', label: 'Reason for Visit / Symptoms', placeholder: 'Describe any sensitivity to hot/cold, chipped tooth, or swelling...', required: true, width: 'full' },
    ],
  },
  categories: ['healthcare', 'customer_service', 'booking', 'consent'],
  industries: ['dental', 'healthcare'],
  useCases: ['intake', 'appointment_booking'],
  audiences: ['b2c'],
  tags: ['dental', 'ai agent', 'patient intake', 'triage', 'emergency dentist', 'hipaa'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 4210,
  ratingAverage: 4.98,
  ratingCount: 189,
  seo: {
    seoTitle: 'Dental AI Patient Triage & Booking Concierge Template',
    seoDescription: 'Empathetic AI dental agent that qualifies patient pain levels, checks insurance, and books clinic appointments.',
    seoKeywords: ['dental chatbot', 'dental triage agent', 'patient booking bot', 'emergency dental ai'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 3. Legal Intake & Conflict Screener Agent ──────────────────────────────
const LEGAL_CASE_SCREENER_AGENT: FormTemplate = {
  id: 'legal-case-screener-agent',
  name: 'Legal Intake & Case Screener Agent',
  shortDescription: 'Confidential legal assistant that screens potential clients by practice area, conducts preliminary conflict checks, and books consultations.',
  description:
    'A formal legal AI intake specialist configured for law firms. Evaluates statute of limitations timeline, case jurisdiction, adverse parties for conflict checks, and schedules paid or free consultations.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Senior Legal Intake Specialist',
    avatarIcon: 'Scale',
    voiceTone: 'professional',
    greetingMessage: 'Welcome to Sterling Legal Group. All information shared is held in strict legal confidentiality. Which practice area can we assist you with today?',
    suggestedPrompts: [
      'Personal Injury / Car Accident Case',
      'Employment Discrimination or Unpaid Wages',
      'Business Contract Dispute',
      'Family Law / Divorce Consultation',
    ],
    systemPrompt:
      'You are a professional legal intake screener. Do NOT provide binding legal advice. Gather essential factual timeline, jurisdiction, date of incident, adverse parties, and damages. Ensure the user understands that an attorney-client relationship is only formed upon signed retainer.',
    knowledgeTopics: [
      'Practice Area Scope & Jurisdiction',
      'Statute of Limitations General Rules',
      'Consultation Retainer & Fee Policies',
      'Conflict of Interest Check Workflow',
    ],
    actionForms: ['legal-consultation-booking', 'retainer-agreement-sign'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#475569', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Case Overview' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Client Full Name', placeholder: 'Sarah Jenkins', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'sarah@example.com', required: true, width: 'half' },
      {
        id: 'practice_area',
        type: 'dropdown',
        label: 'Practice Area',
        required: true,
        width: 'half',
        options: [
          { label: 'Personal Injury & Accidents', value: 'personal_injury' },
          { label: 'Employment & Labor Law', value: 'employment' },
          { label: 'Corporate & Business Litigation', value: 'business' },
          { label: 'Real Estate & Landlord-Tenant', value: 'real_estate' },
          { label: 'Estate Planning & Probate', value: 'estate' },
        ],
      },
      { id: 'incident_date', type: 'date', label: 'Date of Incident / Occurrence', required: true, width: 'half' },
      { id: 'opposing_party', type: 'short_answer', label: 'Opposing Party / Company Name (for Conflict Check)', required: true, width: 'half' },
      { id: 'case_summary', type: 'long_answer', label: 'Brief Summary of the Situation', placeholder: 'Explain what happened and what outcome you are seeking...', required: true, width: 'full' },
    ],
  },
  categories: ['legal', 'customer_service', 'lead_generation'],
  industries: ['legal', 'consulting'],
  useCases: ['intake', 'compliance', 'appointment_booking'],
  audiences: ['b2c', 'b2b'],
  tags: ['legal', 'ai agent', 'case intake', 'law firm', 'screener', 'confidential'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 2940,
  ratingAverage: 4.95,
  ratingCount: 118,
  seo: {
    seoTitle: 'Legal Intake AI Agent & Case Screener Template',
    seoDescription: 'Pre-qualify legal leads, run conflict checks, and schedule attorney consultations with an AI legal intake assistant.',
    seoKeywords: ['legal ai agent', 'law firm chatbot', 'case screener bot', 'attorney intake assistant'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 4. Real Estate Buyer & Tour Scheduling Agent ────────────────────────────
const REAL_ESTATE_BUYER_AGENT: FormTemplate = {
  id: 'real-estate-buyer-agent',
  name: 'Real Estate Buyer & Tour Scheduling Agent',
  shortDescription: 'AI real estate advisor that matches buyer criteria with active MLS listings and books private showing tours.',
  description:
    'A high-conversion real estate agent bot. Pre-qualifies pre-approval status, desired neighborhood, bedrooms, square footage, budget, and coordinates in-person or virtual home walkthroughs.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Realtor Concierge & Property Matcher',
    avatarIcon: 'Building',
    voiceTone: 'sales',
    greetingMessage: 'Welcome to Haven Real Estate! Looking to buy, sell, or schedule a VIP private walkthrough of a featured property?',
    suggestedPrompts: [
      'Schedule a private showing for 742 Evergreen Terrace',
      'I want to find 3-bedroom homes under $750,000',
      'What is my current home worth in today\'s market?',
      'Get pre-qualified with our preferred lender',
    ],
    systemPrompt:
      'You are a knowledgeable and enthusiastic luxury real estate advisor. Help buyers pinpoint target zip codes, school districts, price ranges, and financing readiness. Facilitate seamless tour scheduling.',
    knowledgeTopics: [
      'Local Neighborhood Market Trends',
      'Mortgage Rates & Pre-Approval Steps',
      'Property Viewing Open House Guidelines',
      'First-Time Homebuyer Assistance Programs',
    ],
    actionForms: ['home-tour-booking', 'instant-property-valuation'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#2563eb', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Property Preferences' }],
    fields: [
      { id: 'buyer_name', type: 'short_answer', label: 'Full Name', placeholder: 'David Miller', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Cell Phone', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'david@example.com', required: true, width: 'half' },
      {
        id: 'budget_range',
        type: 'dropdown',
        label: 'Budget Range',
        required: true,
        width: 'half',
        options: [
          { label: '$300,000 - $500,000', value: '300k-500k' },
          { label: '$500,000 - $750,000', value: '500k-750k' },
          { label: '$750,000 - $1,200,000', value: '750k-1.2m' },
          { label: '$1,200,000+', value: '1.2m-plus' },
        ],
      },
      {
        id: 'timeline',
        type: 'radio',
        label: 'Purchasing Timeline',
        required: true,
        width: 'half',
        options: [
          { label: 'Immediately (< 30 days)', value: 'immediate' },
          { label: '1 - 3 Months', value: '1-3-months' },
          { label: '3 - 6 Months', value: '3-6-months' },
          { label: 'Just Browsing / Researching', value: 'browsing' },
        ],
      },
      {
        id: 'preapproved',
        type: 'radio',
        label: 'Pre-Approved by Lender?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes, have pre-approval letter', value: 'yes' },
          { label: 'No, need lender recommendation', value: 'need_lender' },
          { label: 'Cash buyer', value: 'cash' },
        ],
      },
      { id: 'target_areas', type: 'short_answer', label: 'Target Neighborhoods / Zip Codes', placeholder: 'e.g. Westside, 90210, Downtown', required: true, width: 'full' },
    ],
  },
  categories: ['real_estate', 'lead_generation', 'booking'],
  industries: ['real_estate'],
  useCases: ['lead_generation', 'appointment_booking'],
  audiences: ['b2c', 'b2b'],
  tags: ['real estate', 'ai agent', 'property finder', 'home tour', 'realtor', 'buyer leads'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 3105,
  ratingAverage: 4.94,
  ratingCount: 130,
  seo: {
    seoTitle: 'Real Estate Buyer AI Agent & Home Tour Scheduler',
    seoDescription: 'Capture high-intent home buyers, qualify budgets and mortgage readiness, and schedule property walkthroughs.',
    seoKeywords: ['real estate ai agent', 'realtor chatbot', 'property booking bot', 'home tour scheduling bot'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 5. Auto Repair Advisor & Estimate Qualifier ─────────────────────────────
const AUTO_REPAIR_ADVISOR_AGENT: FormTemplate = {
  id: 'auto-repair-advisor-agent',
  name: 'Auto Repair Service Advisor Agent',
  shortDescription: 'AI automotive service advisor that diagnoses vehicle trouble codes, quotes maintenance packages, and schedules drop-offs.',
  description:
    'An automated automotive service advisor. Collects vehicle VIN / Year/Make/Model, checks dashboard warning lights (Check Engine, ABS, Brake), provides estimated labor times, and books loaner vehicle slots.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Certified Service Advisor',
    avatarIcon: 'Wrench',
    voiceTone: 'professional',
    greetingMessage: 'Hi there! Welcome to Precision Auto Works. Are you dropping in for routine maintenance, or is your car showing a check engine light or mechanical issue?',
    suggestedPrompts: [
      'Brake pads are squealing when I stop',
      'Check Engine Light is blinking',
      'Schedule 60,000-mile factory service',
      'Need an oil change and tire rotation today',
    ],
    systemPrompt:
      'You are a certified master automotive service advisor. Identify Year, Make, Model, Mileage, and symptoms. Explain potential root causes in plain language without making absolute diagnostic guarantees prior to physical vehicle inspection.',
    knowledgeTopics: [
      'Common OBD-II Diagnostic Trouble Codes',
      'Factory Scheduled Maintenance Intervals',
      'Warranty & Aftermarket Parts Policy',
      'Complimentary Shuttle & Loaner Vehicle Program',
    ],
    actionForms: ['service-dropoff-booking', 'multipoint-inspection-request'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#dc2626', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Vehicle Information' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Owner Name', placeholder: 'Marcus Vance', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'vehicle_year_make_model', type: 'short_answer', label: 'Vehicle Year, Make & Model', placeholder: '2021 Toyota RAV4', required: true, width: 'half' },
      { id: 'mileage', type: 'numerical', label: 'Current Mileage', placeholder: '45,000', required: true, width: 'half' },
      {
        id: 'primary_service',
        type: 'dropdown',
        label: 'Primary Service Needed',
        required: true,
        width: 'half',
        options: [
          { label: 'Check Engine / Diagnostics', value: 'diagnostics' },
          { label: 'Brake Service (Pads & Rotors)', value: 'brakes' },
          { label: 'Oil Change & Fluid Service', value: 'oil_change' },
          { label: 'Suspension / Alignment', value: 'suspension' },
          { label: 'Air Conditioning & Heating', value: 'ac_heat' },
          { label: 'Major Milestone Service (30k/60k/90k)', value: 'major_service' },
        ],
      },
      {
        id: 'loaner_needed',
        type: 'radio',
        label: 'Need Shuttle or Loaner Car?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes, need loaner car', value: 'loaner' },
          { label: 'Yes, local shuttle ride', value: 'shuttle' },
          { label: 'No, I will wait in lounge / arrange ride', value: 'waiting' },
        ],
      },
      { id: 'symptom_notes', type: 'long_answer', label: 'Describe any sounds, vibrations, or warning lights', placeholder: 'e.g. Squealing noise from front left when braking...', required: false, width: 'full' },
    ],
  },
  categories: ['customer_service', 'booking', 'quote'],
  industries: ['automotive', 'transportation'],
  useCases: ['service_request', 'appointment_booking'],
  audiences: ['b2c', 'b2b'],
  tags: ['auto repair', 'ai agent', 'mechanic bot', 'service advisor', 'car maintenance', 'check engine'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 2650,
  ratingAverage: 4.93,
  ratingCount: 112,
  seo: {
    seoTitle: 'Auto Repair AI Service Advisor & Booking Agent',
    seoDescription: 'Streamline mechanic shop intakes with an AI advisor that quotes maintenance and books repair appointments.',
    seoKeywords: ['auto shop chatbot', 'mechanic ai agent', 'car repair booking bot', 'service advisor ai'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 6. Commercial Cleaning & Facilities Estimator Agent ─────────────────────
const COMMERCIAL_CLEANING_AGENT: FormTemplate = {
  id: 'commercial-cleaning-estimator-agent',
  name: 'Commercial Cleaning & Facilities Estimator Agent',
  shortDescription: 'AI facilities concierge that calculates square footage cleaning rates, supplies disinfection plans, and generates proposals.',
  description:
    'An interactive commercial janitorial quote assistant. Calculates building square footage, frequency (daily, 3x/week, weekly), floor care (carpet extraction, VCT strip/wax), and delivers instant bid proposals.',
  templateType: 'agent',
  agentConfig: {
    personaTitle: 'Facility Services Estimator',
    avatarIcon: 'Sparkles',
    voiceTone: 'professional',
    greetingMessage: 'Welcome to CleanCorp Facilities. Looking for a commercial cleaning or janitorial proposal for your office, clinic, or warehouse?',
    suggestedPrompts: [
      'Get instant quote for 15,000 sq ft office',
      'Need terminal cleaning for medical clinic',
      'Post-construction deep clean estimate',
      'Nightly janitorial service 5 days/week',
    ],
    systemPrompt:
      'You are an expert commercial janitorial estimator. Gather facility square footage, number of restrooms, floor surfaces, frequency of cleanings, and security access requirements to compute instant estimate ranges.',
    knowledgeTopics: [
      'Janitorial Rate Card per Sq Ft',
      'OSHA & Healthcare Terminal Disinfection Standards',
      'Floor Care Strip/Wax Pricing Schedule',
      'Green Seal Certified Cleaning Products',
    ],
    actionForms: ['commercial-proposal-generator', 'walkthrough-inspection-booking'],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#0d9488', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Facility Specifications' }],
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company / Facility Name', placeholder: 'Acme Corp HQ', required: true, width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Contact Person', placeholder: 'Elena Rostova', required: true, width: 'half' },
      { id: 'contact_email', type: 'email', label: 'Work Email', placeholder: 'elena@acme.com', required: true, width: 'half' },
      { id: 'contact_phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'sqft', type: 'numerical', label: 'Total Facility Square Footage', placeholder: '12,500', required: true, width: 'half' },
      {
        id: 'frequency',
        type: 'dropdown',
        label: 'Cleaning Frequency',
        required: true,
        width: 'half',
        options: [
          { label: '5 Nights / Week (Mon - Fri)', value: '5_nights' },
          { label: '3 Days / Week', value: '3_days' },
          { label: '2 Days / Week', value: '2_days' },
          { label: '1 Day / Week (Weekend)', value: 'weekly' },
          { label: 'One-Time Deep Clean / Post-Construction', value: 'one_time' },
        ],
      },
      {
        id: 'specialty_services',
        type: 'checkbox',
        label: 'Specialty Add-On Services',
        required: false,
        width: 'full',
        options: [
          { label: 'Restroom Paper & Soap Supply Restocking', value: 'restock' },
          { label: 'Commercial Carpet Steam Extraction', value: 'carpet' },
          { label: 'Hard Floor Buffing & Strip/Wax', value: 'floor_wax' },
          { label: 'Interior & Exterior Window Washing', value: 'windows' },
          { label: 'Hospital-Grade Electrostatic Spray Disinfection', value: 'disinfect' },
        ],
      },
    ],
  },
  categories: ['quote', 'customer_service', 'lead_generation'],
  industries: ['cleaning', 'home_services'],
  useCases: ['quote_request', 'service_request'],
  audiences: ['b2b'],
  tags: ['cleaning', 'ai agent', 'janitorial bot', 'commercial cleaning', 'facility quote'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 2180,
  ratingAverage: 4.91,
  ratingCount: 94,
  seo: {
    seoTitle: 'Commercial Cleaning AI Quote Estimator Agent',
    seoDescription: 'Automate janitorial bids, square footage calculations, and facility walkthrough bookings with an AI cleaning agent.',
    seoKeywords: ['commercial cleaning chatbot', 'janitorial estimate bot', 'facility cleaning ai'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── Export & Register AI Agent Templates ───────────────────────────────────
export const AGENT_TEMPLATES: FormTemplate[] = [
  HVAC_DIAGNOSTIC_AGENT,
  DENTAL_TRIAGE_AGENT,
  LEGAL_CASE_SCREENER_AGENT,
  REAL_ESTATE_BUYER_AGENT,
  AUTO_REPAIR_ADVISOR_AGENT,
  COMMERCIAL_CLEANING_AGENT,
];

// Register all AI Agent templates into the shared registry
for (const t of AGENT_TEMPLATES) {
  registerTemplate(t);
}
