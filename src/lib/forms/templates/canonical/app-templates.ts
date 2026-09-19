/**
 * AI App Canonical Templates (Jotform App Parity).
 *
 * Turnkey, multi-screen PWA Business Applications that bundle:
 * - App Shell, Branding & 1-Click Installable PWA Settings
 * - Pinned 24/7 AI Concierge Assistant
 * - Multi-Form Workflows (Intakes, Quotes, Inspections, Reviews)
 * - Action Tiles & Navigation Dock
 * - Customer Equipment / Service Passports
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

const NOW = new Date().toISOString();

// ─── 1. Field Service Contractor Hub App ──────────────────────────────────────
const FIELD_SERVICE_APP: FormTemplate = {
  id: 'field-service-contractor-app',
  name: 'Field Service Contractor Hub App',
  shortDescription: 'Complete mobile contractor PWA bundling emergency dispatch, instant quote calculator, AI technician bot, and equipment passport.',
  description:
    'A turnkey progressive web app for HVAC, plumbing, electrical, and roofing companies. Gives homeowners a branded mobile app on their phone with 1-tap emergency booking, equipment health tracking, service history, and instant billing.',
  templateType: 'app',
  appConfig: {
    appIcon: 'Wrench',
    primaryColor: '#059669',
    navigationTabs: [
      { id: 'home', label: 'Home Hub', icon: 'Home' },
      { id: 'services', label: 'Book Service', icon: 'Calendar' },
      { id: 'ai-concierge', label: '24/7 AI Tech', icon: 'Bot' },
      { id: 'passport', label: 'My Equipment', icon: 'ShieldCheck' },
      { id: 'invoices', label: 'Pay Bills', icon: 'CreditCard' },
    ],
    bundledForms: [
      { title: 'Emergency Service Dispatch', fieldCount: 7, type: 'emergency_dispatch' },
      { title: 'Instant Replacement Quote Calculator', fieldCount: 6, type: 'quote_calculator' },
      { title: 'Annual Maintenance Tune-Up Booking', fieldCount: 5, type: 'booking' },
      { title: 'Customer CSAT & Review Form', fieldCount: 4, type: 'review' },
    ],
    pinnedAgentName: 'Apex Air 24/7 AI Master Tech',
    features: [
      'Installable PWA to iOS & Android home screens',
      'Live Equipment Health & Warranty Passport',
      'Real-time technician GPS tracking status',
      'Integrated Stripe 1-tap Apple Pay / Google Pay',
    ],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#059669', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Service Request' }],
    fields: [
      { id: 'customer_name', type: 'short_answer', label: 'Customer Name', placeholder: 'Alex Morgan', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'property_address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      {
        id: 'trade_type',
        type: 'dropdown',
        label: 'Select Service Department',
        required: true,
        width: 'half',
        options: [
          { label: 'HVAC (Heating & Cooling)', value: 'hvac' },
          { label: 'Plumbing & Drain Cleaning', value: 'plumbing' },
          { label: 'Electrical & Panels', value: 'electrical' },
          { label: 'Roofing & Gutters', value: 'roofing' },
        ],
      },
      {
        id: 'service_speed',
        type: 'radio',
        label: 'Priority Level',
        required: true,
        width: 'half',
        options: [
          { label: '🚨 Emergency Dispatch (Within 2 Hours)', value: 'emergency' },
          { label: '📅 Same-Day Scheduled Visit', value: 'same_day' },
          { label: '🗓️ Future Scheduled Maintenance', value: 'scheduled' },
        ],
      },
      { id: 'issue_notes', type: 'long_answer', label: 'Describe the Issue or Request', placeholder: 'Water heater leaking, AC blowing warm, etc...', required: true, width: 'full' },
    ],
  },
  categories: ['customer_service', 'booking', 'quote', 'internal_operations'],
  industries: ['hvac', 'plumbing', 'electrical', 'home_services'],
  useCases: ['service_request', 'appointment_booking', 'customer_onboarding'],
  audiences: ['b2c', 'b2b'],
  tags: ['pwa app', 'app template', 'field service', 'contractor', 'equipment passport', 'hvac app'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 5120,
  ratingAverage: 4.99,
  ratingCount: 230,
  seo: {
    seoTitle: 'Field Service Contractor Mobile PWA App Template',
    seoDescription: 'Deploy an installable mobile app for HVAC and trades contractors with booking, AI diagnostics, and equipment passports.',
    seoKeywords: ['field service app template', 'contractor pwa', 'hvac customer portal app', 'plumbing app template'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 2. Medical Clinic Patient Portal App ─────────────────────────────────────
const MEDICAL_CLINIC_APP: FormTemplate = {
  id: 'medical-clinic-patient-portal-app',
  name: 'Medical Clinic Patient Portal App',
  shortDescription: 'HIPAA-ready patient portal app bundling digital intake, pinned AI triage nurse, telehealth booking, and lab results access.',
  description:
    'A modern healthcare mobile web app designed for medical practices, pediatricians, and wellness centers. Allows patients to self-check-in, review treatment plans, converse with an AI clinical assistant, and pay co-pays.',
  templateType: 'app',
  appConfig: {
    appIcon: 'HeartPulse',
    primaryColor: '#0284c7',
    navigationTabs: [
      { id: 'home', label: 'My Health', icon: 'Home' },
      { id: 'appointments', label: 'Book Visit', icon: 'Calendar' },
      { id: 'ai-nurse', label: 'AI Health Triage', icon: 'Bot' },
      { id: 'records', label: 'Lab Results', icon: 'FileText' },
      { id: 'billing', label: 'Co-Pay & Bills', icon: 'CreditCard' },
    ],
    bundledForms: [
      { title: 'New Patient Medical History Intake', fieldCount: 9, type: 'intake' },
      { title: 'Telehealth Video Consultation Booking', fieldCount: 5, type: 'telehealth' },
      { title: 'Prescription Refill Request', fieldCount: 4, type: 'refill' },
      { title: 'HIPAA Consent & Medical Release Form', fieldCount: 3, type: 'consent' },
    ],
    pinnedAgentName: 'Dr. Clara Medical AI Concierge',
    features: [
      'Encrypted HIPAA-ready patient data workflows',
      'Interactive symptom assessment & triage scoring',
      'One-click Telehealth video conference launcher',
      'Direct pharmacy prescription routing',
    ],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#0284c7', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Patient Registration' }],
    fields: [
      { id: 'patient_full_name', type: 'short_answer', label: 'Patient Legal Name', placeholder: 'Emily Watson', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'emily@example.com', required: true, width: 'half' },
      {
        id: 'visit_type',
        type: 'dropdown',
        label: 'Type of Consultation',
        required: true,
        width: 'half',
        options: [
          { label: 'In-Clinic Physical Examination', value: 'in_clinic' },
          { label: 'Secure Video Telehealth Visit', value: 'telehealth' },
          { label: 'Prescription Refill Review', value: 'refill' },
          { label: 'Annual Preventive Wellness Exam', value: 'wellness' },
        ],
      },
      { id: 'symptoms', type: 'long_answer', label: 'Current Symptoms & Reason for Visit', placeholder: 'Fever, cough, joint ache, prescription review...', required: true, width: 'full' },
    ],
  },
  categories: ['healthcare', 'customer_service', 'booking', 'consent'],
  industries: ['healthcare', 'dental'],
  useCases: ['intake', 'appointment_booking'],
  audiences: ['b2c'],
  tags: ['pwa app', 'medical app', 'patient portal', 'hipaa', 'telehealth', 'clinic app'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 4890,
  ratingAverage: 4.97,
  ratingCount: 195,
  seo: {
    seoTitle: 'Medical Clinic Patient Portal PWA App Template',
    seoDescription: 'Deploy a branded medical patient portal app with digital check-in, AI triage, and telehealth appointments.',
    seoKeywords: ['medical app template', 'patient portal pwa', 'clinic mobile app', 'healthcare booking app'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 3. Auto Repair Customer Experience App ──────────────────────────────────
const AUTO_REPAIR_APP: FormTemplate = {
  id: 'auto-repair-customer-hub-app',
  name: 'Auto Repair & Fleet Experience App',
  shortDescription: 'Customer vehicle hub bundling digital service passport, drop-off intake, AI estimate advisor, and live repair tracker.',
  description:
    'An all-in-one automotive customer companion app. Customers can look up their vehicle maintenance history, approve digital inspection photo estimates, chat with an AI service advisor, and pay their invoice remotely.',
  templateType: 'app',
  appConfig: {
    appIcon: 'Car',
    primaryColor: '#dc2626',
    navigationTabs: [
      { id: 'garage', label: 'My Garage', icon: 'Car' },
      { id: 'book', label: 'Schedule Repair', icon: 'Calendar' },
      { id: 'ai-advisor', label: 'AI Advisor', icon: 'Bot' },
      { id: 'inspections', label: 'Digital Inspection', icon: 'Camera' },
      { id: 'pay', label: 'Approve & Pay', icon: 'CreditCard' },
    ],
    bundledForms: [
      { title: 'Vehicle Drop-Off & Key Drop Form', fieldCount: 7, type: 'intake' },
      { title: 'Multi-Point Digital Inspection Sheet', fieldCount: 8, type: 'inspection' },
      { title: 'Estimate Approval & Authorization', fieldCount: 4, type: 'authorization' },
      { title: 'Loaner Car Agreement & Waiver', fieldCount: 5, type: 'waiver' },
    ],
    pinnedAgentName: 'Apex Auto AI Service Advisor',
    features: [
      'Digital Vehicle Passport & Lifetime Maintenance Log',
      'Photo & Video Inspection report viewer with 1-click approvals',
      'Real-time repair stage tracker (Inspecting -> Parts -> In-Bay -> Done)',
      'Contactless pickup & after-hours key locker code generator',
    ],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#dc2626', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Vehicle Check-In' }],
    fields: [
      { id: 'owner_name', type: 'short_answer', label: 'Vehicle Owner Name', placeholder: 'Carlos Mendez', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      { id: 'vin_plate', type: 'short_answer', label: 'License Plate / VIN', placeholder: '7ABC123', required: true, width: 'half' },
      { id: 'vehicle_model', type: 'short_answer', label: 'Year, Make & Model', placeholder: '2020 Honda Accord', required: true, width: 'half' },
      {
        id: 'requested_service',
        type: 'dropdown',
        label: 'Primary Service Requested',
        required: true,
        width: 'half',
        options: [
          { label: 'Synthetic Oil Change & Filter', value: 'oil_change' },
          { label: 'Brake Pad & Rotor Replacement', value: 'brakes' },
          { label: 'Check Engine Diagnostics', value: 'check_engine' },
          { label: 'Air Conditioning Recharge & Repair', value: 'ac' },
          { label: 'Transmission Fluid & Filter', value: 'transmission' },
        ],
      },
      { id: 'notes', type: 'long_answer', label: 'Special Instructions / Symptom Details', placeholder: 'Vibration at 60mph, check tire pressure...', required: false, width: 'full' },
    ],
  },
  categories: ['customer_service', 'booking', 'quote', 'inspection'],
  industries: ['automotive', 'transportation'],
  useCases: ['service_request', 'appointment_booking'],
  audiences: ['b2c', 'b2b'],
  tags: ['pwa app', 'auto repair app', 'mechanic app', 'vehicle passport', 'digital inspection'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 3740,
  ratingAverage: 4.95,
  ratingCount: 162,
  seo: {
    seoTitle: 'Auto Repair Customer Portal PWA App Template',
    seoDescription: 'Empower automotive shops with an installable customer app for digital inspections, approvals, and vehicle passports.',
    seoKeywords: ['auto repair app template', 'mechanic shop pwa', 'vehicle inspection app', 'car service portal'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 4. Property Management Resident Portal App ──────────────────────────────
const PROPERTY_MANAGEMENT_APP: FormTemplate = {
  id: 'property-management-resident-app',
  name: 'Property Management Resident App',
  shortDescription: 'Tenant portal PWA bundling maintenance work orders, rent payment calculator, AI lease assistant, and move-in inspection.',
  description:
    'A complete resident experience mobile app for apartment communities and property managers. Handles urgent maintenance tickets with photo uploads, rent payment schedules, amenity reservations, and lease renewal questions.',
  templateType: 'app',
  appConfig: {
    appIcon: 'Building',
    primaryColor: '#7c3aed',
    navigationTabs: [
      { id: 'home', label: 'My Home', icon: 'Home' },
      { id: 'maintenance', label: 'Fix It', icon: 'Wrench' },
      { id: 'ai-lease', label: 'Lease Assistant', icon: 'Bot' },
      { id: 'amenities', label: 'Amenities', icon: 'Calendar' },
      { id: 'pay', label: 'Pay Rent', icon: 'CreditCard' },
    ],
    bundledForms: [
      { title: 'Urgent Maintenance Work Order', fieldCount: 6, type: 'maintenance' },
      { title: 'Move-In / Move-Out Condition Checklist', fieldCount: 8, type: 'inspection' },
      { title: 'Clubhouse & Pool Reservation Form', fieldCount: 4, type: 'booking' },
      { title: 'Pet Registration & Vaccination Form', fieldCount: 5, type: 'registration' },
    ],
    pinnedAgentName: 'Apex Resident AI Concierge',
    features: [
      'Photo-attached work order submission with real-time status updates',
      'Instant answers to complex lease clause & pet policy questions',
      'Automated rent autopay & split-bill payment integration',
      'Digital key & gate guest pass generation',
    ],
  },
  schema: {
    version: 1,
    theme: { primaryColor: '#7c3aed', backgroundColor: '#ffffff' },
    steps: [{ id: 'step-1', title: 'Work Order' }],
    fields: [
      { id: 'resident_name', type: 'short_answer', label: 'Resident Name', placeholder: 'Jordan Lee', required: true, width: 'half' },
      { id: 'unit_number', type: 'short_answer', label: 'Building & Unit #', placeholder: 'Bldg 4, Apt 302', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000', required: true, width: 'half' },
      {
        id: 'category',
        type: 'dropdown',
        label: 'Issue Category',
        required: true,
        width: 'half',
        options: [
          { label: 'Plumbing (Leak, Toilet, Sink)', value: 'plumbing' },
          { label: 'HVAC (No AC / No Heat)', value: 'hvac' },
          { label: 'Appliance (Dishwasher, Oven, Refrigerator)', value: 'appliance' },
          { label: 'Electrical & Lighting', value: 'electrical' },
          { label: 'Door Lock / Window Security', value: 'security' },
        ],
      },
      {
        id: 'entry_permission',
        type: 'radio',
        label: 'Permission to Enter if Not Home?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes, maintenance has permission to enter', value: 'yes' },
          { label: 'No, call me to schedule a specific window', value: 'no' },
        ],
      },
      { id: 'issue_details', type: 'long_answer', label: 'Detailed Description of Problem', placeholder: 'Kitchen sink is leaking under the basin...', required: true, width: 'full' },
    ],
  },
  categories: ['real_estate', 'customer_service', 'internal_operations'],
  industries: ['real_estate', 'home_services'],
  useCases: ['service_request', 'intake', 'customer_feedback'],
  audiences: ['b2c'],
  tags: ['pwa app', 'property management', 'resident app', 'tenant portal', 'maintenance app'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 3290,
  ratingAverage: 4.92,
  ratingCount: 140,
  seo: {
    seoTitle: 'Property Management Resident Portal App Template',
    seoDescription: 'Deploy a resident portal PWA with maintenance work orders, rent payment, and AI lease assistance.',
    seoKeywords: ['property management app', 'tenant portal template', 'resident app pwa', 'apartment maintenance bot'],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── Export & Register AI App Templates ─────────────────────────────────────
export const APP_TEMPLATES: FormTemplate[] = [
  FIELD_SERVICE_APP,
  MEDICAL_CLINIC_APP,
  AUTO_REPAIR_APP,
  PROPERTY_MANAGEMENT_APP,
];

// Register all AI App templates into the shared registry
for (const t of APP_TEMPLATES) {
  registerTemplate(t);
}
