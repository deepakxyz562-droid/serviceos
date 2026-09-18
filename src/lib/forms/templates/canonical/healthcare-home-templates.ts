/**
 * Canonical Form Templates — Healthcare & Home Services (T1.2-b).
 *
 * This file registers 17 curated, production-ready form templates:
 *   • 8 healthcare templates (dental, medical, telehealth, COVID-19,
 *     medical-history, patient-consent, veterinary)
 *   • 9 home-services templates (HVAC ×2, plumbing ×2, electrical,
 *     roofing, home-inspection, cleaning, landscaping)
 *
 * Each template ships with a COMPLETE FormSchema — fields, steps, theme,
 * and submission settings — not a stub. Five high-value templates
 * (dental intake, medical intake, HVAC service, plumbing service, and
 * home inspection checklist) are marked `isFeatured: true`.
 *
 * Importing this module (via `index.ts`) populates the registry.
 */
import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

// ════════════════════════════════════════════════════════════════════════════
// HEALTHCARE TEMPLATES (8)
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. Dental Patient Intake Form (FEATURED) ───────────────────────────────
const DENTAL_PATIENT_INTAKE_TEMPLATE: FormTemplate = {
  id: 'dental-patient-intake-form',
  name: 'Dental Patient Intake Form',
  shortDescription:
    'HIPAA-ready dental intake capturing medical history, insurance, and signed consent.',
  description:
    'Comprehensive new-patient intake for dental practices. Collects demographics, medical history, current medications, allergies, emergency contact, insurance details, and a signed consent for treatment — across three short steps. Designed around HIPAA minimum-necessary principles.',
  schema: {
    version: 1,
    steps: [
      { id: 'step-1', title: 'Patient Information' },
      { id: 'step-2', title: 'Medical & Dental History' },
      { id: 'step-3', title: 'Insurance & Consent' },
    ],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half', stepId: 'step-1' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half', stepId: 'step-1' },
      { id: 'address', type: 'address', label: 'Home Address', required: true, width: 'full', stepId: 'step-1' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half', stepId: 'step-1' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half', stepId: 'step-1' },
      { id: 'reason_for_visit', type: 'long_answer', label: 'Reason for Today\'s Visit', placeholder: 'Cleaning, tooth pain, cosmetic consultation, ...', required: true, width: 'full', stepId: 'step-2' },
      {
        id: 'medical_conditions',
        type: 'checkbox',
        label: 'Medical History (check all that apply)',
        required: true,
        width: 'full',
        stepId: 'step-2',
        options: [
          { label: 'Heart condition', value: 'heart' },
          { label: 'Diabetes', value: 'diabetes' },
          { label: 'High blood pressure', value: 'hypertension' },
          { label: 'Asthma', value: 'asthma' },
          { label: 'Known allergies', value: 'allergies' },
          { label: 'Pregnant / nursing', value: 'pregnant' },
          { label: 'Bleeding disorder', value: 'bleeding' },
          { label: 'None of the above', value: 'none' },
        ],
      },
      { id: 'medications', type: 'long_answer', label: 'Current Medications', placeholder: 'List prescription and over-the-counter medications you take regularly.', width: 'full', stepId: 'step-2' },
      { id: 'allergies', type: 'long_answer', label: 'Known Allergies', placeholder: 'Penicillin, latex, local anesthetic, ...', width: 'full', stepId: 'step-2' },
      { id: 'emergency_contact_name', type: 'short_answer', label: 'Emergency Contact Name', required: true, width: 'half', stepId: 'step-2' },
      { id: 'emergency_contact_phone', type: 'phone', label: 'Emergency Contact Phone', required: true, width: 'half', stepId: 'step-2' },
      { id: 'insurance_provider', type: 'short_answer', label: 'Insurance Provider', placeholder: 'Delta Dental, Cigna, MetLife, ...', width: 'half', stepId: 'step-3' },
      { id: 'insurance_member_id', type: 'short_answer', label: 'Member ID', placeholder: 'Found on your insurance card', width: 'half', stepId: 'step-3' },
      { id: 'consent_signature', type: 'signature', label: 'Patient / Guardian Signature', required: true, width: 'full', stepId: 'step-3', helpText: 'By signing, I certify the above information is accurate and consent to treatment.' },
    ],
    rules: [],
    theme: { primaryColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'multi_step' },
    settings: {
      submitButtonText: 'Submit Intake',
      successTitle: 'Thank you!',
      successMessage: 'Your intake form has been received. Our office will confirm your appointment shortly.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'dental_intake' },
      },
    },
  },
  categories: ['healthcare', 'onboarding'],
  industries: ['dental', 'healthcare'],
  useCases: ['intake', 'compliance'],
  audiences: ['b2c'],
  tags: ['hipaa', 'dental', 'intake', 'insurance', 'medical-history', 'consent'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Dental Patient Intake Form Template (HIPAA)',
    seoDescription:
      'HIPAA-ready dental patient intake form with medical history, insurance, and signed consent. Free, mobile-friendly, customizable.',
    seoKeywords: ['dental intake form', 'hipaa form', 'dental patient registration', 'medical history form'],
    faq: [
      {
        question: 'Is this dental intake form HIPAA compliant?',
        answer:
          'The template collects only minimum-necessary PHI and includes a signed consent field. HIPAA compliance also depends on how you store and transmit submissions — use encrypted email or a HIPAA-secure form backend.',
      },
      {
        question: 'Can I add my own medical history questions?',
        answer:
          'Yes. After applying the template, you can add, remove, or edit any field in the form builder, including the medical history checkbox options.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 2. Medical Patient Intake Form (FEATURED) ──────────────────────────────
const MEDICAL_PATIENT_INTAKE_TEMPLATE: FormTemplate = {
  id: 'medical-patient-intake-form',
  name: 'Medical Patient Intake Form',
  shortDescription:
    'General medical intake capturing demographics, history, and emergency contact.',
  description:
    'Standard intake form for primary care, urgent care, and specialty clinics. Captures patient demographics, chief complaint, current medications, allergies, lifestyle factors, and emergency contact — all in one mobile-friendly form.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Patient Information' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      {
        id: 'sex',
        type: 'dropdown',
        label: 'Sex Assigned at Birth',
        required: true,
        width: 'half',
        options: [
          { label: 'Female', value: 'female' },
          { label: 'Male', value: 'male' },
          { label: 'Intersex', value: 'intersex' },
          { label: 'Prefer not to say', value: 'prefer_not_to_say' },
        ],
      },
      { id: 'address', type: 'address', label: 'Home Address', required: true, width: 'full' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'primary_care_physician', type: 'short_answer', label: 'Primary Care Physician', placeholder: 'Dr. Smith', width: 'half' },
      { id: 'physician_phone', type: 'phone', label: 'Physician Phone', placeholder: '+1 (555) 000-0000', width: 'half' },
      { id: 'chief_complaint', type: 'long_answer', label: 'Chief Complaint / Reason for Visit', placeholder: 'Describe your symptoms or reason for today\'s visit.', required: true, width: 'full' },
      { id: 'current_medications', type: 'long_answer', label: 'Current Medications', placeholder: 'List prescription, OTC, supplements, ...', width: 'full' },
      { id: 'allergies', type: 'long_answer', label: 'Known Allergies', placeholder: 'Penicillin, latex, peanuts, ...', width: 'full' },
      {
        id: 'smoking_status',
        type: 'radio',
        label: 'Smoking Status',
        required: true,
        width: 'full',
        options: [
          { label: 'Never smoked', value: 'never' },
          { label: 'Former smoker', value: 'former' },
          { label: 'Current smoker', value: 'current' },
        ],
      },
      { id: 'emergency_contact_name', type: 'short_answer', label: 'Emergency Contact Name', required: true, width: 'half' },
      { id: 'emergency_contact_phone', type: 'phone', label: 'Emergency Contact Phone', required: true, width: 'half' },
    ],
    rules: [],
    theme: { primaryColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Submit Intake',
      successTitle: 'Thank you!',
      successMessage: 'Your intake has been received. Please arrive 10 minutes before your appointment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'medical_intake' },
      },
    },
  },
  categories: ['healthcare', 'onboarding'],
  industries: ['healthcare'],
  useCases: ['intake', 'compliance'],
  audiences: ['b2c'],
  tags: ['hipaa', 'medical', 'intake', 'patient-registration', 'insurance'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Medical Patient Intake Form Template',
    seoDescription:
      'General medical patient intake template with chief complaint, medications, allergies, and emergency contact. Mobile-friendly.',
    seoKeywords: ['patient intake form', 'medical intake', 'new patient form', 'clinic registration'],
    faq: [
      {
        question: 'What information does a medical patient intake form collect?',
        answer:
          'Demographics (name, DOB, sex, address, contact), chief complaint, current medications, allergies, lifestyle factors, and emergency contact. This template collects all of the above.',
      },
      {
        question: 'Is this template suitable for an urgent care clinic?',
        answer:
          'Yes. The fields are appropriate for primary care, urgent care, and specialty clinics. You can remove or add fields in the form builder as needed for your workflow.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 3. Patient Appointment Request Form ────────────────────────────────────
const PATIENT_APPOINTMENT_REQUEST_TEMPLATE: FormTemplate = {
  id: 'patient-appointment-request-form',
  name: 'Patient Appointment Request Form',
  shortDescription: 'Patient-facing form to request a new appointment with date, time, and reason.',
  description:
    'Self-service appointment request form for clinics and practices. Patients choose a preferred provider, date, and time window and describe their reason for visit. Submissions can be reviewed and confirmed by staff or routed directly to a calendar-booking workflow.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Appointment Request' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      {
        id: 'preferred_provider',
        type: 'dropdown',
        label: 'Preferred Provider',
        required: true,
        width: 'half',
        options: [
          { label: 'No preference', value: 'no_preference' },
          { label: 'Dr. Smith', value: 'dr_smith' },
          { label: 'Dr. Patel', value: 'dr_patel' },
          { label: 'Dr. Johnson', value: 'dr_johnson' },
          { label: 'Dr. Lee', value: 'dr_lee' },
        ],
      },
      {
        id: 'preferred_time_window',
        type: 'dropdown',
        label: 'Preferred Time of Day',
        required: true,
        width: 'half',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
        ],
      },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, width: 'half' },
      {
        id: 'is_urgent',
        type: 'radio',
        label: 'Is this urgent?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes — please call within 24 hours', value: 'urgent' },
          { label: 'No — routine appointment', value: 'routine' },
        ],
      },
      { id: 'reason_for_visit', type: 'long_answer', label: 'Reason for Visit', placeholder: 'Briefly describe your symptoms or reason for the appointment.', required: true, width: 'full' },
    ],
    rules: [],
    theme: { primaryColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Appointment',
      successTitle: 'Request received!',
      successMessage: 'We will call or email you within one business day to confirm your appointment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCalendarBooking: { enabled: true },
      },
    },
  },
  categories: ['appointment', 'healthcare'],
  industries: ['healthcare'],
  useCases: ['appointment_booking'],
  audiences: ['b2c'],
  tags: ['appointment', 'scheduling', 'patient', 'self-service'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Patient Appointment Request Form Template',
    seoDescription:
      'Patient appointment request form capturing preferred provider, date, time, and urgency. Free, customizable, mobile-friendly.',
    seoKeywords: ['appointment request form', 'patient scheduling', 'doctor appointment', 'booking form'],
    faq: [
      {
        question: 'Does this form book the appointment automatically?',
        answer:
          'No — it sends a request to your staff who then confirm. You can enable the calendar-booking action to integrate with your scheduling system.',
      },
      {
        question: 'Can I add my providers\' names to the dropdown?',
        answer:
          'Yes. After applying the template, edit the Preferred Provider dropdown to list your actual providers.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 4. Telehealth Consultation Request Form ────────────────────────────────
const TELEHEALTH_CONSULTATION_REQUEST_TEMPLATE: FormTemplate = {
  id: 'telehealth-consultation-request-form',
  name: 'Telehealth Consultation Request Form',
  shortDescription: 'Request a virtual visit with state-licensure check and consent.',
  description:
    'Telehealth-specific request form that captures patient location (for state-licensure compliance), confirms access to a video-capable device, and records telehealth consent. Suitable for primary care, mental health, and specialty telehealth services.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Telehealth Consultation Request' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'state_of_residence', type: 'short_answer', label: 'State of Residence', placeholder: 'California', required: true, width: 'half', helpText: 'Required for provider licensure verification.' },
      {
        id: 'provider_preference',
        type: 'dropdown',
        label: 'Preferred Provider',
        width: 'half',
        options: [
          { label: 'No preference', value: 'no_preference' },
          { label: 'Dr. Smith (Family Medicine)', value: 'dr_smith' },
          { label: 'Dr. Patel (Psychiatry)', value: 'dr_patel' },
          { label: 'Dr. Johnson (Pediatrics)', value: 'dr_johnson' },
        ],
      },
      { id: 'reason_for_visit', type: 'long_answer', label: 'Reason for Telehealth Visit', required: true, placeholder: 'Describe your symptoms or reason for the virtual visit.', width: 'full' },
      { id: 'current_medications', type: 'long_answer', label: 'Current Medications', placeholder: 'List any prescription or OTC medications.', width: 'full' },
      {
        id: 'has_video_device',
        type: 'radio',
        label: 'Do you have a smartphone or computer with a camera?',
        required: true,
        width: 'full',
        options: [
          { label: 'Yes — smartphone with camera', value: 'smartphone' },
          { label: 'Yes — computer with webcam', value: 'computer' },
          { label: 'No — I need a phone-only consultation', value: 'phone_only' },
        ],
      },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, width: 'half' },
      {
        id: 'preferred_time_window',
        type: 'dropdown',
        label: 'Preferred Time',
        required: true,
        width: 'half',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
        ],
      },
      {
        id: 'telehealth_consent',
        type: 'checkbox',
        label: 'Telehealth Consent',
        required: true,
        width: 'full',
        options: [
          { label: 'I understand this is a telehealth visit and consent to receive care virtually.', value: 'consent' },
          { label: 'I confirm I am physically located in the state listed above at the time of the visit.', value: 'location' },
        ],
      },
    ],
    rules: [],
    theme: { primaryColor: '#6366f1', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Telehealth Visit',
      successTitle: 'Request received!',
      successMessage: 'We will email you a video link and confirm your appointment time within one business day.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCalendarBooking: { enabled: true },
      },
    },
  },
  categories: ['appointment', 'healthcare'],
  industries: ['healthcare'],
  useCases: ['appointment_booking', 'intake'],
  audiences: ['b2c'],
  tags: ['telehealth', 'virtual-care', 'consent', 'appointment', 'licensure'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Telehealth Consultation Request Form',
    seoDescription:
      'Telehealth consultation request form with state licensure check, video device verification, and patient consent. Free template.',
    seoKeywords: ['telehealth form', 'virtual visit', 'telemedicine intake', 'video consultation'],
    faq: [
      {
        question: 'Why does this form ask for the patient\'s state of residence?',
        answer:
          'Telehealth providers must be licensed in the state where the patient is physically located at the time of the visit. Collecting this upfront prevents scheduling conflicts.',
      },
      {
        question: 'Can this form integrate with Zoom or Doxy.me?',
        answer:
          'The form sends a request — your staff confirms and sends the video link manually. For automated video-link generation, configure a webhook to your scheduling integration.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 5. COVID-19 Screening Form ─────────────────────────────────────────────
const COVID_19_SCREENING_TEMPLATE: FormTemplate = {
  id: 'covid-19-screening-form',
  name: 'COVID-19 Screening Form',
  shortDescription: 'Pre-visit screening for symptoms, exposure, and vaccination status.',
  description:
    'Screening questionnaire used at facility entrances, prior to appointments, or for workplace screening. Captures symptoms, exposure history, recent travel, temperature reading, and vaccination status. Designed for daily or per-visit use.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'COVID-19 Screening' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      {
        id: 'experiencing_symptoms',
        type: 'radio',
        label: 'Are you currently experiencing any COVID-19 symptoms?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        id: 'symptom_checklist',
        type: 'checkbox',
        label: 'Symptoms (check all that apply)',
        width: 'full',
        options: [
          { label: 'Fever or chills', value: 'fever' },
          { label: 'Cough', value: 'cough' },
          { label: 'Shortness of breath', value: 'breath' },
          { label: 'Loss of taste or smell', value: 'taste_smell' },
          { label: 'Fatigue', value: 'fatigue' },
          { label: 'Sore throat', value: 'sore_throat' },
          { label: 'Muscle or body aches', value: 'aches' },
          { label: 'Headache', value: 'headache' },
          { label: 'Congestion or runny nose', value: 'congestion' },
        ],
      },
      {
        id: 'tested_positive_14d',
        type: 'radio',
        label: 'Have you tested positive for COVID-19 in the last 14 days?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        id: 'exposed_to_confirmed',
        type: 'radio',
        label: 'Have you been in close contact with a confirmed COVID-19 case in the last 14 days?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        id: 'temperature',
        type: 'numerical',
        label: 'Temperature (°F)',
        width: 'half',
        validation: { min: 90, max: 110 },
        placeholder: '98.6',
      },
      {
        id: 'travel_history',
        type: 'radio',
        label: 'Have you traveled internationally in the last 14 days?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        id: 'vaccination_status',
        type: 'dropdown',
        label: 'Vaccination Status',
        required: true,
        width: 'half',
        options: [
          { label: 'Not vaccinated', value: 'none' },
          { label: 'Partially vaccinated (1 dose)', value: 'partial' },
          { label: 'Fully vaccinated', value: 'full' },
          { label: 'Fully vaccinated + booster', value: 'boosted' },
        ],
      },
      { id: 'last_vaccine_date', type: 'date', label: 'Date of Most Recent Vaccine', width: 'half' },
    ],
    rules: [],
    theme: { primaryColor: '#dc2626', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Submit Screening',
      successTitle: 'Screening submitted',
      successMessage: 'Please show this confirmation to the screening attendant before entering.',
      actions: { sendEmailNotification: { enabled: true, toEmails: [] } },
    },
  },
  categories: ['healthcare', 'assessment'],
  industries: ['healthcare'],
  useCases: ['assessment', 'compliance'],
  audiences: ['b2c', 'internal'],
  tags: ['covid-19', 'screening', 'symptom-check', 'vaccination', 'workplace-safety'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'COVID-19 Screening Form Template',
    seoDescription:
      'COVID-19 screening form template with symptom checklist, exposure history, temperature, and vaccination status. Free to use.',
    seoKeywords: ['covid screening form', 'symptom check', 'health screening', 'workplace safety form'],
    faq: [
      {
        question: 'Can this form be used for daily workplace screening?',
        answer:
          'Yes. The form is short enough to complete in under a minute. For daily use, remove the vaccination fields or move them to a one-time intake form.',
      },
      {
        question: 'Does this template comply with current CDC guidance?',
        answer:
          'The symptom list mirrors CDC\'s published COVID-19 symptoms. Public-health guidance evolves — review the form periodically and update fields as needed.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 6. Medical History Questionnaire ───────────────────────────────────────
const MEDICAL_HISTORY_QUESTIONNAIRE_TEMPLATE: FormTemplate = {
  id: 'medical-history-questionnaire',
  name: 'Medical History Questionnaire',
  shortDescription: 'Detailed health history covering conditions, surgeries, family history, and lifestyle.',
  description:
    'In-depth medical history questionnaire for new-patient onboarding or pre-procedure screening. Captures chronic conditions, surgical history, hospitalizations, family history, lifestyle factors, and key vitals like blood type. Suitable for specialty clinics, surgical pre-op, and comprehensive primary care.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Medical History' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      {
        id: 'chronic_conditions',
        type: 'checkbox',
        label: 'Chronic Conditions (check all that apply)',
        width: 'full',
        options: [
          { label: 'Hypertension', value: 'hypertension' },
          { label: 'Diabetes Type 1', value: 'diabetes_1' },
          { label: 'Diabetes Type 2', value: 'diabetes_2' },
          { label: 'Heart disease', value: 'heart' },
          { label: 'Asthma / COPD', value: 'respiratory' },
          { label: 'Thyroid disorder', value: 'thyroid' },
          { label: 'Kidney disease', value: 'kidney' },
          { label: 'Cancer (in remission or active)', value: 'cancer' },
          { label: 'Autoimmune disorder', value: 'autoimmune' },
          { label: 'Mental health condition', value: 'mental' },
          { label: 'None', value: 'none' },
        ],
      },
      { id: 'past_surgeries', type: 'long_answer', label: 'Past Surgeries', placeholder: 'List any surgeries with approximate dates.', width: 'full' },
      { id: 'hospitalizations', type: 'long_answer', label: 'Past Hospitalizations', placeholder: 'List any hospitalizations with reason and year.', width: 'full' },
      { id: 'family_history', type: 'long_answer', label: 'Family Medical History', placeholder: 'Conditions that run in your family (parents, siblings).', width: 'full' },
      { id: 'current_medications', type: 'long_answer', label: 'Current Medications & Supplements', width: 'full' },
      { id: 'allergies', type: 'long_answer', label: 'Allergies (medications, foods, environmental)', width: 'full' },
      {
        id: 'smoking_status',
        type: 'radio',
        label: 'Smoking Status',
        required: true,
        width: 'half',
        options: [
          { label: 'Never', value: 'never' },
          { label: 'Former', value: 'former' },
          { label: 'Current', value: 'current' },
        ],
      },
      {
        id: 'alcohol_consumption',
        type: 'dropdown',
        label: 'Alcohol Consumption',
        required: true,
        width: 'half',
        options: [
          { label: 'Do not drink', value: 'none' },
          { label: 'Occasional (1-2 drinks/week)', value: 'occasional' },
          { label: 'Moderate (3-7 drinks/week)', value: 'moderate' },
          { label: 'Heavy (8+ drinks/week)', value: 'heavy' },
        ],
      },
      {
        id: 'exercise_frequency',
        type: 'dropdown',
        label: 'Exercise Frequency',
        required: true,
        width: 'half',
        options: [
          { label: 'Rarely / never', value: 'rarely' },
          { label: '1-2 times per week', value: 'light' },
          { label: '3-4 times per week', value: 'moderate' },
          { label: '5+ times per week', value: 'frequent' },
        ],
      },
      {
        id: 'blood_type',
        type: 'dropdown',
        label: 'Blood Type (if known)',
        width: 'half',
        options: [
          { label: 'Unknown', value: 'unknown' },
          { label: 'A+', value: 'a_pos' },
          { label: 'A-', value: 'a_neg' },
          { label: 'B+', value: 'b_pos' },
          { label: 'B-', value: 'b_neg' },
          { label: 'AB+', value: 'ab_pos' },
          { label: 'AB-', value: 'ab_neg' },
          { label: 'O+', value: 'o_pos' },
          { label: 'O-', value: 'o_neg' },
        ],
      },
    ],
    rules: [],
    theme: { primaryColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Submit Questionnaire',
      successTitle: 'Thank you!',
      successMessage: 'Your medical history has been recorded and will be reviewed by your care team.',
      actions: { sendEmailNotification: { enabled: true, toEmails: [] } },
    },
  },
  categories: ['healthcare', 'questionnaire'],
  industries: ['healthcare'],
  useCases: ['intake', 'assessment'],
  audiences: ['b2c'],
  tags: ['medical-history', 'health-questionnaire', 'pre-op', 'intake', 'patient-onboarding'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Medical History Questionnaire Template',
    seoDescription:
      'Medical history questionnaire covering chronic conditions, surgeries, family history, lifestyle, and blood type. Free template.',
    seoKeywords: ['medical history form', 'health questionnaire', 'patient history', 'pre-op questionnaire'],
    faq: [
      {
        question: 'How is this different from a patient intake form?',
        answer:
          'The medical history questionnaire focuses on clinical history — conditions, surgeries, family history, lifestyle. A patient intake form also captures demographics, insurance, and consent. The two are often used together.',
      },
      {
        question: 'Is this form HIPAA compliant?',
        answer:
          'The template collects minimum-necessary PHI. HIPAA compliance also depends on how you store and transmit submissions — use encrypted email or a HIPAA-secure form backend.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 7. Patient Consent Form ────────────────────────────────────────────────
const PATIENT_CONSENT_TEMPLATE: FormTemplate = {
  id: 'patient-consent-form',
  name: 'Patient Consent Form',
  shortDescription: 'Informed-consent template with treatment acknowledgments and signature.',
  description:
    'Informed-consent template for procedures, treatments, or participation in care. Documents that risks were explained, alternatives were discussed, and the patient (or guardian) signed. Includes signature capture and date of signature for medical-record compliance.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Patient Consent' }],
    fields: [
      { id: 'patient_name', type: 'short_answer', label: 'Patient Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'dob', type: 'date', label: 'Patient Date of Birth', required: true, width: 'half' },
      { id: 'procedure_or_treatment', type: 'long_answer', label: 'Procedure / Treatment', placeholder: 'Describe the procedure or treatment being consented to.', required: true, width: 'full' },
      { id: 'provider_name', type: 'short_answer', label: 'Treating Provider', placeholder: 'Dr. Smith', required: true, width: 'half' },
      { id: 'procedure_date', type: 'date', label: 'Scheduled Procedure Date', required: true, width: 'half' },
      {
        id: 'acknowledgments',
        type: 'checkbox',
        label: 'Acknowledgments (check all that apply)',
        required: true,
        width: 'full',
        options: [
          { label: 'The nature and purpose of the treatment have been explained to me.', value: 'nature' },
          { label: 'The risks and possible complications have been explained.', value: 'risks' },
          { label: 'Alternative treatments and their risks have been discussed.', value: 'alternatives' },
          { label: 'I have had the opportunity to ask questions and all were answered.', value: 'questions' },
          { label: 'I understand I may withdraw consent at any time.', value: 'withdraw' },
        ],
      },
      {
        id: 'interpreter_needed',
        type: 'radio',
        label: 'Was a language interpreter used?',
        width: 'full',
        options: [
          { label: 'No', value: 'no' },
          { label: 'Yes — interpreter present', value: 'yes' },
        ],
      },
      { id: 'consent_signature', type: 'signature', label: 'Patient / Guardian Signature', required: true, width: 'half', helpText: 'Sign on the line above.' },
      { id: 'date_signed', type: 'date', label: 'Date Signed', required: true, width: 'half' },
    ],
    rules: [],
    theme: { primaryColor: '#0ea5e9', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.5rem', layout: 'card' },
    settings: {
      submitButtonText: 'Submit Consent',
      successTitle: 'Consent recorded',
      successMessage: 'Your signed consent has been added to your medical record.',
      actions: { sendEmailNotification: { enabled: true, toEmails: [] } },
    },
  },
  categories: ['consent', 'healthcare'],
  industries: ['healthcare'],
  useCases: ['compliance'],
  audiences: ['b2c'],
  tags: ['consent', 'informed-consent', 'hipaa', 'signature', 'medical-records'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Patient Consent Form Template',
    seoDescription:
      'Patient consent form template with treatment acknowledgment checkboxes and signature capture. Free, customizable, HIPAA-ready.',
    seoKeywords: ['patient consent form', 'informed consent', 'medical consent', 'procedure consent'],
    faq: [
      {
        question: 'Does this template satisfy informed-consent legal requirements?',
        answer:
          'The template captures the essential elements — disclosure, understanding, voluntariness, and signature. Specific procedures and jurisdictions may require additional language; review with your malpractice carrier or counsel.',
      },
      {
        question: 'Can the signature field be used on mobile devices?',
        answer:
          'Yes. The signature field renders a touch-friendly signature pad on mobile and a mouse-draw pad on desktop.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 8. Veterinary Patient Intake Form ──────────────────────────────────────
const VETERINARY_PATIENT_INTAKE_TEMPLATE: FormTemplate = {
  id: 'veterinary-patient-intake-form',
  name: 'Veterinary Patient Intake Form',
  shortDescription: 'New-patient intake for veterinary clinics capturing pet and owner info.',
  description:
    'New-pet intake form for veterinary practices. Collects pet identification (species, breed, sex, age), owner contact details, reason for visit, current diet and medications, vaccination record, behavior notes, and a photo of the pet. Designed for both routine and emergency visits.',
  schema: {
    version: 1,
    steps: [
      { id: 'step-1', title: 'Pet Information' },
      { id: 'step-2', title: 'Owner & Visit' },
    ],
    fields: [
      { id: 'pet_name', type: 'short_answer', label: 'Pet Name', placeholder: 'Buddy', required: true, width: 'half', stepId: 'step-1' },
      {
        id: 'species',
        type: 'dropdown',
        label: 'Species',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'Dog', value: 'dog' },
          { label: 'Cat', value: 'cat' },
          { label: 'Bird', value: 'bird' },
          { label: 'Rabbit', value: 'rabbit' },
          { label: 'Reptile', value: 'reptile' },
          { label: 'Small mammal', value: 'small_mammal' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'breed', type: 'short_answer', label: 'Breed', placeholder: 'Golden Retriever, Domestic Shorthair, ...', width: 'half', stepId: 'step-1' },
      {
        id: 'pet_sex',
        type: 'dropdown',
        label: 'Sex',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'Male — neutered', value: 'm_neutered' },
          { label: 'Male — intact', value: 'm_intact' },
          { label: 'Female — spayed', value: 'f_spayed' },
          { label: 'Female — intact', value: 'f_intact' },
        ],
      },
      {
        id: 'pet_age_years',
        type: 'numerical',
        label: 'Age (years)',
        required: true,
        width: 'half',
        stepId: 'step-1',
        validation: { min: 0, max: 40 },
        placeholder: '3',
      },
      { id: 'pet_photo', type: 'photo', label: 'Photo of Pet', width: 'half', stepId: 'step-1', helpText: 'Optional — helps our team recognize your pet.' },
      { id: 'owner_name', type: 'short_answer', label: 'Owner Full Name', placeholder: 'Jane Doe', required: true, width: 'half', stepId: 'step-2' },
      { id: 'owner_phone', type: 'phone', label: 'Owner Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half', stepId: 'step-2' },
      { id: 'owner_email', type: 'email', label: 'Owner Email', placeholder: 'jane@example.com', required: true, width: 'half', stepId: 'step-2' },
      { id: 'owner_address', type: 'address', label: 'Owner Address', required: true, width: 'full', stepId: 'step-2' },
      { id: 'reason_for_visit', type: 'long_answer', label: 'Reason for Visit', placeholder: 'Annual exam, vaccinations, sick visit, ...', required: true, width: 'full', stepId: 'step-2' },
      { id: 'current_medications_diet', type: 'long_answer', label: 'Current Medications & Diet', placeholder: 'Flea/tick prevention, food brand, supplements, ...', width: 'full', stepId: 'step-2' },
      {
        id: 'vaccination_status',
        type: 'checkbox',
        label: 'Vaccination Record (check all that apply)',
        width: 'full',
        stepId: 'step-2',
        options: [
          { label: 'Rabies — current', value: 'rabies' },
          { label: 'DHPP / FVRCP — current', value: 'core' },
          { label: 'Bordetella — current', value: 'bordetella' },
          { label: 'Leptospirosis — current', value: 'lepto' },
          { label: 'Not up to date / unsure', value: 'not_current' },
        ],
      },
      {
        id: 'aggressive_behavior',
        type: 'radio',
        label: 'Does your pet show aggressive behavior at the vet?',
        required: true,
        width: 'full',
        stepId: 'step-2',
        options: [
          { label: 'No — friendly with people and pets', value: 'friendly' },
          { label: 'Sometimes — nervous but manageable', value: 'nervous' },
          { label: 'Yes — muzzle recommended', value: 'muzzle' },
        ],
      },
    ],
    rules: [],
    theme: { primaryColor: '#16a34a', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'multi_step' },
    settings: {
      submitButtonText: 'Submit Intake',
      successTitle: 'Welcome!',
      successMessage: 'Your pet\'s intake has been received. We look forward to seeing you both at your appointment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'vet_intake' },
      },
    },
  },
  categories: ['healthcare', 'onboarding'],
  industries: ['veterinary', 'pet_services', 'healthcare'],
  useCases: ['intake'],
  audiences: ['b2c'],
  tags: ['veterinary', 'pet-intake', 'vaccination', 'animal-clinic', 'new-patient'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Veterinary Patient Intake Form Template',
    seoDescription:
      'Veterinary patient intake form with pet info, vaccination record, behavior notes, and photo. Free, mobile-friendly template.',
    seoKeywords: ['veterinary intake form', 'vet new patient form', 'pet intake', 'animal clinic form'],
    faq: [
      {
        question: 'Can I customize the species and breed options?',
        answer:
          'Yes. After applying the template, edit the Species dropdown and Breed field to match the animals your clinic treats.',
      },
      {
        question: 'Does the photo upload work on mobile?',
        answer:
          'Yes. The photo field opens the camera or photo gallery on mobile devices and accepts standard image formats on desktop.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ════════════════════════════════════════════════════════════════════════════
// HOME SERVICES TEMPLATES (9)
// ════════════════════════════════════════════════════════════════════════════

// ─── 9. HVAC Service Request Form (FEATURED) ────────────────────────────────
const HVAC_SERVICE_REQUEST_TEMPLATE: FormTemplate = {
  id: 'hvac-service-request-form',
  name: 'HVAC Service Request Form',
  shortDescription: 'Homeowner HVAC repair request with equipment details, urgency, and photos.',
  description:
    'Service request form for HVAC contractors. Captures equipment type and age, problem description, urgency level (emergency through scheduled maintenance), preferred appointment window, warranty status, and equipment photos — everything a dispatcher needs to triage and route the call.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'HVAC Service Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      {
        id: 'equipment_type',
        type: 'dropdown',
        label: 'Equipment Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Central Air Conditioner', value: 'central_ac' },
          { label: 'Furnace (gas)', value: 'furnace_gas' },
          { label: 'Furnace (electric)', value: 'furnace_elec' },
          { label: 'Heat Pump', value: 'heat_pump' },
          { label: 'Mini-Split / Ductless', value: 'mini_split' },
          { label: 'Boiler', value: 'boiler' },
          { label: 'Other / not sure', value: 'other' },
        ],
      },
      {
        id: 'equipment_age_years',
        type: 'numerical',
        label: 'Equipment Age (years)',
        width: 'half',
        validation: { min: 0, max: 50 },
        placeholder: '8',
      },
      { id: 'brand_model', type: 'short_answer', label: 'Brand & Model', placeholder: 'Carrier 24ABC6', width: 'full' },
      { id: 'problem_description', type: 'long_answer', label: 'Problem Description', placeholder: 'Describe what\'s happening — no cooling, strange noise, error code, ...', required: true, width: 'full' },
      {
        id: 'urgency',
        type: 'radio',
        label: 'How urgent is this?',
        required: true,
        width: 'full',
        options: [
          { label: 'Emergency — no heat/AC, vulnerable household', value: 'emergency' },
          { label: 'Same-day — uncomfortable but habitable', value: 'same_day' },
          { label: 'This week — can wait a few days', value: 'this_week' },
          { label: 'Scheduled maintenance', value: 'maintenance' },
        ],
      },
      { id: 'preferred_date', type: 'date', label: 'Preferred Appointment Date', required: true, width: 'half' },
      {
        id: 'preferred_time_window',
        type: 'dropdown',
        label: 'Preferred Time Window',
        required: true,
        width: 'half',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
          { label: 'Any time', value: 'any' },
        ],
      },
      {
        id: 'has_warranty',
        type: 'radio',
        label: 'Is the equipment under warranty?',
        required: true,
        width: 'full',
        options: [
          { label: 'Yes — parts and labor', value: 'full' },
          { label: 'Yes — parts only', value: 'parts' },
          { label: 'No / not sure', value: 'none' },
        ],
      },
      { id: 'equipment_photos', type: 'photo', label: 'Photos of Equipment / Nameplate', width: 'full', helpText: 'Optional — helps our technician prepare. Photos of the unit and the nameplate rating label are most useful.' },
    ],
    rules: [],
    theme: { primaryColor: '#ea580c', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Service',
      successTitle: 'Request received!',
      successMessage: 'Our dispatcher will call you within the hour during business hours to confirm your appointment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'hvac_service_request' },
      },
    },
  },
  categories: ['request', 'inspection'],
  industries: ['hvac', 'home_services'],
  useCases: ['service_request'],
  audiences: ['b2c'],
  tags: ['hvac', 'service-request', 'emergency', 'warranty', 'appointment', 'home-services'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'HVAC Service Request Form Template',
    seoDescription:
      'HVAC service request form with equipment type, age, urgency, and photo upload. Free, mobile-friendly, customizable.',
    seoKeywords: ['hvac service form', 'ac repair request', 'heating repair', 'hvac intake form'],
    faq: [
      {
        question: 'Can I route emergency requests to an on-call technician?',
        answer:
          'Yes. Configure the form\'s webhook or email action to send urgent submissions to your on-call phone or dispatch queue. You can also use conditional logic to alert based on the urgency field.',
      },
      {
        question: 'Why does the form ask for equipment age and brand?',
        answer:
          'Knowing the equipment age helps determine if repair or replacement is more cost-effective, and the brand/model helps the technician bring the right parts on the first visit.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 10. HVAC Installation Quote Form ───────────────────────────────────────
const HVAC_INSTALLATION_QUOTE_TEMPLATE: FormTemplate = {
  id: 'hvac-installation-quote-form',
  name: 'HVAC Installation Quote Form',
  shortDescription: 'Homeowner quote request for new HVAC installation with property and budget details.',
  description:
    'Quote-request form for HVAC installation contractors. Captures property type, square footage, existing system, desired system type, budget range, and preferred installation timeline — enough detail for an estimator to prepare a meaningful first quote before the on-site visit.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'HVAC Installation Quote' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      {
        id: 'property_type',
        type: 'dropdown',
        label: 'Property Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Single-family home', value: 'single_family' },
          { label: 'Townhouse', value: 'townhouse' },
          { label: 'Condo / apartment', value: 'condo' },
          { label: 'Multi-family (2-4 units)', value: 'multifamily' },
          { label: 'Commercial', value: 'commercial' },
        ],
      },
      {
        id: 'square_footage',
        type: 'numerical',
        label: 'Conditioned Square Footage',
        required: true,
        width: 'half',
        validation: { min: 200, max: 50000 },
        placeholder: '2200',
      },
      {
        id: 'existing_system',
        type: 'dropdown',
        label: 'Existing System',
        required: true,
        width: 'half',
        options: [
          { label: 'Central AC + Furnace', value: 'central_furnace' },
          { label: 'Heat Pump', value: 'heat_pump' },
          { label: 'Mini-Split / Ductless', value: 'mini_split' },
          { label: 'Boiler / Radiator', value: 'boiler' },
          { label: 'No system / new construction', value: 'none' },
        ],
      },
      {
        id: 'desired_system',
        type: 'radio',
        label: 'Desired New System',
        required: true,
        width: 'half',
        options: [
          { label: 'Central AC + Furnace', value: 'central_furnace' },
          { label: 'Heat Pump', value: 'heat_pump' },
          { label: 'Mini-Split / Ductless', value: 'mini_split' },
          { label: 'Not sure — recommend', value: 'recommend' },
        ],
      },
      {
        id: 'budget_range',
        type: 'dropdown',
        label: 'Budget Range',
        required: true,
        width: 'half',
        options: [
          { label: 'Under $5,000', value: 'under_5k' },
          { label: '$5,000 – $8,000', value: '5k_8k' },
          { label: '$8,000 – $12,000', value: '8k_12k' },
          { label: '$12,000 – $20,000', value: '12k_20k' },
          { label: 'Over $20,000', value: 'over_20k' },
          { label: 'Not sure', value: 'unsure' },
        ],
      },
      { id: 'preferred_install_date', type: 'date', label: 'Preferred Installation Date', width: 'half' },
      { id: 'additional_notes', type: 'long_answer', label: 'Additional Notes', placeholder: 'Special access, financing needed, rebate/efficiency goals, ...', width: 'full' },
      { id: 'photos', type: 'photo', label: 'Photos of Current Equipment / Mechanical Room', width: 'full', helpText: 'Optional — helps our estimator prepare a more accurate initial quote.' },
    ],
    rules: [],
    theme: { primaryColor: '#ea580c', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Quote',
      successTitle: 'Quote request received!',
      successMessage: 'Our estimator will contact you within one business day to schedule a free on-site assessment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'hvac_install_quote', pipelineStage: 'quote_requested' },
      },
    },
  },
  categories: ['quote', 'request'],
  industries: ['hvac', 'home_services'],
  useCases: ['quote_request'],
  audiences: ['b2c'],
  tags: ['hvac', 'installation', 'quote-request', 'budget', 'home-services'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'HVAC Installation Quote Form Template',
    seoDescription:
      'HVAC installation quote form capturing property details, system preferences, budget, and timeline. Free, customizable template.',
    seoKeywords: ['hvac quote form', 'ac installation estimate', 'furnace installation', 'hvac estimate'],
    faq: [
      {
        question: 'Can I customize the budget ranges?',
        answer:
          'Yes. After applying the template, edit the Budget Range dropdown to match your typical project sizes and pricing.',
      },
      {
        question: 'Does this form replace an on-site estimate?',
        answer:
          'No — it captures enough detail to prepare a preliminary quote and triage leads. A final firm quote still requires an on-site load calculation and inspection.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 11. Plumbing Service Request Form (FEATURED) ───────────────────────────
const PLUMBING_SERVICE_REQUEST_TEMPLATE: FormTemplate = {
  id: 'plumbing-service-request-form',
  name: 'Plumbing Service Request Form',
  shortDescription: 'Plumbing service request with leak location, water-shutoff status, and emergency flag.',
  description:
    'Service-request form for plumbing contractors. Captures issue type, leak location, whether water has been shut off, emergency status, when the issue started, and photos — the exact information a dispatcher needs to prioritize emergencies and prepare the technician.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Plumbing Service Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      {
        id: 'issue_type',
        type: 'dropdown',
        label: 'Issue Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Leak', value: 'leak' },
          { label: 'Clog / slow drain', value: 'clog' },
          { label: 'Water heater', value: 'water_heater' },
          { label: 'Fixture (faucet, toilet)', value: 'fixture' },
          { label: 'Pipe (frozen, burst, noisy)', value: 'pipe' },
          { label: 'Sewer / septic backup', value: 'sewer' },
          { label: 'Gas line', value: 'gas' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'leak_location',
        type: 'dropdown',
        label: 'Location of Issue',
        required: true,
        width: 'half',
        options: [
          { label: 'Kitchen', value: 'kitchen' },
          { label: 'Bathroom', value: 'bathroom' },
          { label: 'Basement', value: 'basement' },
          { label: 'Laundry / utility', value: 'laundry' },
          { label: 'Outdoors / hose bib', value: 'outdoors' },
          { label: 'Whole house / main', value: 'whole_house' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'water_shut_off',
        type: 'radio',
        label: 'Has the water been shut off at the main?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes — water is off', value: 'yes' },
          { label: 'No — water still running', value: 'no' },
          { label: 'I don\'t know how', value: 'dont_know' },
        ],
      },
      {
        id: 'is_emergency',
        type: 'radio',
        label: 'Is this an emergency?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes — active flooding or sewage backup', value: 'emergency' },
          { label: 'No — can wait for scheduled visit', value: 'routine' },
        ],
      },
      { id: 'problem_description', type: 'long_answer', label: 'Problem Description', placeholder: 'Describe what you see, hear, or smell. Include any error codes on water heaters.', required: true, width: 'full' },
      { id: 'issue_start_date', type: 'date', label: 'When did the issue start?', required: true, width: 'half' },
      { id: 'preferred_date', type: 'date', label: 'Preferred Appointment Date', required: true, width: 'half' },
      {
        id: 'preferred_time_window',
        type: 'dropdown',
        label: 'Preferred Time Window',
        required: true,
        width: 'full',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
          { label: 'Any time', value: 'any' },
        ],
      },
      { id: 'photos', type: 'photo', label: 'Photos of the Issue', width: 'full', helpText: 'Optional but very helpful — photos of the leak, fixture, or water-damage area help the technician prepare.' },
    ],
    rules: [],
    theme: { primaryColor: '#0284c7', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Service',
      successTitle: 'Request received!',
      successMessage: 'For emergencies, call our dispatch line directly. Otherwise, we will call within one business hour to confirm your appointment.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'plumbing_service_request' },
      },
    },
  },
  categories: ['request', 'inspection'],
  industries: ['plumbing', 'home_services'],
  useCases: ['service_request'],
  audiences: ['b2c'],
  tags: ['plumbing', 'service-request', 'emergency', 'leak', 'water-shutoff', 'home-services'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Plumbing Service Request Form Template',
    seoDescription:
      'Plumbing service request form with leak location, water shutoff status, emergency flag, and photo. Free, customizable template.',
    seoKeywords: ['plumbing service form', 'plumber request', 'leak repair', 'emergency plumber'],
    faq: [
      {
        question: 'How do I route emergency submissions differently?',
        answer:
          'Use conditional logic or webhook filtering on the is_emergency field. Emergency submissions can page an on-call technician while routine requests flow to your normal scheduling queue.',
      },
      {
        question: 'Why does the form ask if water has been shut off?',
        answer:
          'If the homeowner hasn\'t shut off the water, the dispatcher can coach them through it over the phone to limit damage before the technician arrives.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 12. Plumbing Estimate Request Form ─────────────────────────────────────
const PLUMBING_ESTIMATE_REQUEST_TEMPLATE: FormTemplate = {
  id: 'plumbing-estimate-request-form',
  name: 'Plumbing Estimate Request Form',
  shortDescription: 'Non-urgent plumbing estimate request with project type and preferred contact method.',
  description:
    'Quote-request form for non-emergency plumbing work — remodels, repipes, fixture upgrades, water heater replacements. Captures project scope, system age, and preferred contact method so the estimator can prepare a meaningful first quote and reach the homeowner efficiently.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Plumbing Estimate Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      {
        id: 'project_type',
        type: 'dropdown',
        label: 'Project Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Repair', value: 'repair' },
          { label: 'Replace fixture', value: 'replace_fixture' },
          { label: 'New installation', value: 'new_install' },
          { label: 'Remodel / renovation', value: 'remodel' },
          { label: 'Repipe', value: 'repipe' },
          { label: 'Water heater replacement', value: 'water_heater' },
          { label: 'Sewer / drain line', value: 'sewer' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'fixture_system',
        type: 'dropdown',
        label: 'Fixture / System',
        required: true,
        width: 'half',
        options: [
          { label: 'Faucet', value: 'faucet' },
          { label: 'Toilet', value: 'toilet' },
          { label: 'Sink', value: 'sink' },
          { label: 'Shower / tub', value: 'shower' },
          { label: 'Water heater', value: 'water_heater' },
          { label: 'Garbage disposal', value: 'disposal' },
          { label: 'Whole-home system', value: 'whole_home' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'system_age_years',
        type: 'numerical',
        label: 'Age of Existing System (years)',
        width: 'half',
        validation: { min: 0, max: 100 },
        placeholder: '12',
      },
      { id: 'project_description', type: 'long_answer', label: 'Project Description', placeholder: 'Describe the scope of work, materials preferences, and any timing constraints.', required: true, width: 'full' },
      {
        id: 'preferred_contact_method',
        type: 'radio',
        label: 'Preferred Contact Method',
        required: true,
        width: 'half',
        options: [
          { label: 'Phone call', value: 'phone' },
          { label: 'Text message', value: 'text' },
          { label: 'Email', value: 'email' },
        ],
      },
      {
        id: 'best_time_to_contact',
        type: 'dropdown',
        label: 'Best Time to Contact',
        required: true,
        width: 'half',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
          { label: 'Anytime', value: 'any' },
        ],
      },
      { id: 'photos', type: 'photo', label: 'Photos of Project Area', width: 'full', helpText: 'Optional — photos of the existing fixture or project area help us prepare a more accurate estimate.' },
    ],
    rules: [],
    theme: { primaryColor: '#0284c7', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Estimate',
      successTitle: 'Estimate request received!',
      successMessage: 'Our estimator will contact you within one business day using your preferred method.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'plumbing_estimate_request', pipelineStage: 'estimate_requested' },
      },
    },
  },
  categories: ['estimate', 'request'],
  industries: ['plumbing', 'home_services'],
  useCases: ['quote_request'],
  audiences: ['b2c'],
  tags: ['plumbing', 'estimate-request', 'quote', 'home-services', 'remodel'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Plumbing Estimate Request Form Template',
    seoDescription:
      'Plumbing estimate request form with project type, system details, and preferred contact method. Free, customizable template.',
    seoKeywords: ['plumbing estimate form', 'plumbing quote', 'plumber estimate', 'remodel plumbing'],
    faq: [
      {
        question: 'How is this different from the plumbing service request form?',
        answer:
          'The service request form is for active issues (leaks, clogs, emergencies). This estimate form is for planned work — remodels, replacements, upgrades — where the homeowner is shopping for a quote.',
      },
      {
        question: 'Can I customize the project types?',
        answer:
          'Yes. Edit the Project Type dropdown in the builder to match the services your shop offers.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 13. Electrical Service Request Form ────────────────────────────────────
const ELECTRICAL_SERVICE_REQUEST_TEMPLATE: FormTemplate = {
  id: 'electrical-service-request-form',
  name: 'Electrical Service Request Form',
  shortDescription: 'Electrical service request with service type, urgency, and power-status safety check.',
  description:
    'Service-request form for electrical contractors. Captures service type (outlet, panel, lighting, wiring, inspection), location of the issue, urgency, whether power is currently on, problem description, preferred appointment, and photos. Includes built-in safety acknowledgment to discourage DIY attempts on live circuits.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Electrical Service Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      {
        id: 'service_type',
        type: 'dropdown',
        label: 'Service Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Outlet / switch repair', value: 'outlet' },
          { label: 'Panel / breaker', value: 'panel' },
          { label: 'Lighting / fixture', value: 'lighting' },
          { label: 'Wiring', value: 'wiring' },
          { label: 'Whole-home inspection', value: 'inspection' },
          { label: 'EV charger install', value: 'ev_charger' },
          { label: 'Generator', value: 'generator' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'issue_location', type: 'short_answer', label: 'Location of Issue', placeholder: 'Kitchen, master bedroom, garage, ...', required: true, width: 'half' },
      {
        id: 'urgency',
        type: 'radio',
        label: 'How urgent is this?',
        required: true,
        width: 'full',
        options: [
          { label: 'Emergency — sparking, burning smell, or no power', value: 'emergency' },
          { label: 'Same-day — tripping breaker or hot outlet', value: 'same_day' },
          { label: 'This week — non-critical', value: 'this_week' },
          { label: 'Scheduled — inspection or install', value: 'scheduled' },
        ],
      },
      {
        id: 'power_currently_on',
        type: 'radio',
        label: 'Is power currently on at the panel?',
        required: true,
        width: 'half',
        options: [
          { label: 'Yes — power is on', value: 'on' },
          { label: 'No — main breaker off', value: 'off' },
          { label: 'Partial — some circuits out', value: 'partial' },
        ],
      },
      {
        id: 'safety_acknowledgment',
        type: 'checkbox',
        label: 'Safety Acknowledgment',
        required: true,
        width: 'full',
        options: [
          { label: 'I have NOT attempted to open the panel or repair live wiring myself.', value: 'no_diy' },
          { label: 'I understand electrical work requires a licensed electrician.', value: 'licensed_only' },
        ],
      },
      { id: 'problem_description', type: 'long_answer', label: 'Problem Description', placeholder: 'Describe what\'s happening — flickering, tripping, burning smell, error indicators, ...', required: true, width: 'full' },
      { id: 'preferred_date', type: 'date', label: 'Preferred Appointment Date', required: true, width: 'half' },
      {
        id: 'preferred_time_window',
        type: 'dropdown',
        label: 'Preferred Time Window',
        required: true,
        width: 'half',
        options: [
          { label: 'Morning (8am–12pm)', value: 'morning' },
          { label: 'Afternoon (12pm–5pm)', value: 'afternoon' },
          { label: 'Evening (5pm–8pm)', value: 'evening' },
          { label: 'Any time', value: 'any' },
        ],
      },
      { id: 'photos', type: 'photo', label: 'Photos of Issue / Panel', width: 'full', helpText: 'Optional — photos of the outlet, fixture, or panel (door closed) help the technician prepare.' },
    ],
    rules: [],
    theme: { primaryColor: '#ca8a04', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Service',
      successTitle: 'Request received!',
      successMessage: 'For emergencies (sparking, burning smell), call 911 first then our dispatch line. Otherwise we will contact you within one business hour.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'electrical_service_request' },
      },
    },
  },
  categories: ['request', 'inspection'],
  industries: ['electrical', 'home_services'],
  useCases: ['service_request'],
  audiences: ['b2c'],
  tags: ['electrical', 'service-request', 'emergency', 'safety', 'home-services'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Electrical Service Request Form Template',
    seoDescription:
      'Electrical service request form with service type, urgency, power status, and photos. Free, mobile-friendly, customizable.',
    seoKeywords: ['electrician service form', 'electrical repair request', 'panel upgrade', 'electrical intake'],
    faq: [
      {
        question: 'Why does the form include a safety acknowledgment?',
        answer:
          'Electrical DIY attempts cause injuries and home fires. The acknowledgment reminds homeowners to wait for a licensed electrician and protects your business from liability if a homeowner later claims you encouraged DIY.',
      },
      {
        question: 'How should emergencies be routed?',
        answer:
          'For sparking or burning smells, redirect homeowners to call 911 — this is communicated in the success message. Configure your webhook to alert the on-call electrician for true electrical emergencies.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 14. Roofing Inspection Form ────────────────────────────────────────────
const ROOFING_INSPECTION_TEMPLATE: FormTemplate = {
  id: 'roofing-inspection-form',
  name: 'Roofing Inspection Form',
  shortDescription: 'Homeowner request for a roofing inspection with roof type, age, and damage description.',
  description:
    'Inspection-request form for roofing contractors. Captures roof type, age, last inspection, reason for inspection (storm damage, leak, age, selling, maintenance), visible-damage description, preferred inspection date, and homeowner photos. Designed to support both post-storm triage and routine maintenance intake.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Roofing Inspection Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      {
        id: 'roof_type',
        type: 'dropdown',
        label: 'Roof Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Asphalt shingle', value: 'asphalt' },
          { label: 'Metal', value: 'metal' },
          { label: 'Tile (clay / concrete)', value: 'tile' },
          { label: 'Flat / low-slope', value: 'flat' },
          { label: 'Slate', value: 'slate' },
          { label: 'Wood shake', value: 'shake' },
          { label: 'Other / not sure', value: 'other' },
        ],
      },
      {
        id: 'roof_age_years',
        type: 'numerical',
        label: 'Roof Age (years)',
        required: true,
        width: 'half',
        validation: { min: 0, max: 100 },
        placeholder: '15',
      },
      { id: 'last_inspection_date', type: 'date', label: 'Last Inspection Date', width: 'half' },
      {
        id: 'inspection_reason',
        type: 'checkbox',
        label: 'Reason for Inspection (check all that apply)',
        required: true,
        width: 'full',
        options: [
          { label: 'Recent storm / hail damage', value: 'storm' },
          { label: 'Active leak', value: 'leak' },
          { label: 'Roof is aging (15+ years)', value: 'age' },
          { label: 'Selling / buying the home', value: 'real_estate' },
          { label: 'Insurance claim', value: 'insurance' },
          { label: 'Routine maintenance', value: 'maintenance' },
        ],
      },
      { id: 'visible_damage_description', type: 'long_answer', label: 'Visible Damage Description', placeholder: 'Missing shingles, water stain on ceiling, granules in gutter, ...', width: 'full' },
      { id: 'preferred_inspection_date', type: 'date', label: 'Preferred Inspection Date', required: true, width: 'half' },
      { id: 'photos', type: 'photo', label: 'Photos of Roof / Damage', width: 'full', helpText: 'Optional — photos from the ground showing the roof and any interior water damage are helpful.' },
    ],
    rules: [],
    theme: { primaryColor: '#9f1239', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Inspection',
      successTitle: 'Inspection request received!',
      successMessage: 'We will contact you within one business day to schedule your roof inspection.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'roofing_inspection_request' },
      },
    },
  },
  categories: ['inspection', 'request'],
  industries: ['roofing', 'home_services'],
  useCases: ['service_request', 'assessment'],
  audiences: ['b2c'],
  tags: ['roofing', 'inspection', 'storm-damage', 'leak', 'home-services', 'insurance'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Roofing Inspection Form Template',
    seoDescription:
      'Roofing inspection form template with roof type, age, damage description, and photo upload. Free, customizable, mobile-friendly.',
    seoKeywords: ['roof inspection form', 'roofing estimate', 'storm damage', 'roof leak inspection'],
    faq: [
      {
        question: 'Can this form be used for insurance-claim inspections?',
        answer:
          'Yes. The form includes an "Insurance claim" reason in the checklist. Add a field for the claim number and adjuster contact if you handle insurance work frequently.',
      },
      {
        question: 'Why ask for roof age if the inspector will assess it?',
        answer:
          'Homeowner-provided age helps the dispatcher prioritize urgent cases (e.g. 25-year-old shingle roof after a hailstorm) and helps the inspector bring the right samples and materials.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 15. Home Inspection Checklist Form (FEATURED) ──────────────────────────
const HOME_INSPECTION_CHECKLIST_TEMPLATE: FormTemplate = {
  id: 'home-inspection-checklist-form',
  name: 'Home Inspection Checklist Form',
  shortDescription: 'Comprehensive home-inspection report with rating scales, photos, and signature.',
  description:
    'Full home-inspection checklist used by licensed home inspectors for buyer/seller pre-purchase inspections. Covers all major systems (exterior, roof, plumbing, electrical, HVAC, foundation) with rating scales, captures issues found, photos, and a signed summary. Suitable for ASHI/InterNACHI-compliant inspection reports.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Inspection Report' }],
    fields: [
      { id: 'inspector_name', type: 'short_answer', label: 'Inspector Name', placeholder: 'John Smith, ACI', required: true, width: 'half' },
      { id: 'inspection_date', type: 'date', label: 'Inspection Date', required: true, width: 'half' },
      { id: 'property_address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      { id: 'client_name', type: 'short_answer', label: 'Client Name', placeholder: 'Buyer or seller name', required: true, width: 'half' },
      {
        id: 'inspection_type',
        type: 'dropdown',
        label: 'Inspection Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Pre-purchase (buyer)', value: 'pre_purchase' },
          { label: 'Pre-listing (seller)', value: 'pre_listing' },
          { label: 'Annual maintenance', value: 'maintenance' },
          { label: 'Warranty / 11th-month', value: 'warranty' },
          { label: 'New construction', value: 'new_construction' },
        ],
      },
      {
        id: 'exterior_condition',
        type: 'rating',
        label: 'Exterior Condition',
        required: true,
        width: 'half',
      },
      {
        id: 'roof_condition',
        type: 'rating',
        label: 'Roof Condition',
        required: true,
        width: 'half',
      },
      {
        id: 'plumbing_condition',
        type: 'rating',
        label: 'Plumbing Condition',
        required: true,
        width: 'half',
      },
      {
        id: 'electrical_condition',
        type: 'rating',
        label: 'Electrical Condition',
        required: true,
        width: 'half',
      },
      {
        id: 'hvac_condition',
        type: 'rating',
        label: 'HVAC Condition',
        required: true,
        width: 'half',
      },
      {
        id: 'foundation_condition',
        type: 'rating',
        label: 'Foundation Condition',
        required: true,
        width: 'half',
      },
      { id: 'issues_found', type: 'long_answer', label: 'Issues Found', placeholder: 'Document safety concerns, major defects, and minor defects separately. Reference photos by number.', required: true, width: 'full' },
      { id: 'photos', type: 'photo', label: 'Inspection Photos', width: 'full', helpText: 'Attach photos of any defects, with photo numbers referenced in the Issues Found field.' },
      { id: 'recommendation_summary', type: 'long_answer', label: 'Recommendation Summary', placeholder: 'Summary of recommended further evaluation, repairs, and monitoring items.', required: true, width: 'full' },
      { id: 'inspector_signature', type: 'signature', label: 'Inspector Signature', required: true, width: 'half', helpText: 'Sign on the line above.' },
      { id: 'date_signed', type: 'date', label: 'Date Signed', required: true, width: 'half' },
    ],
    rules: [],
    theme: { primaryColor: '#9f1239', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.5rem', layout: 'card' },
    settings: {
      submitButtonText: 'Finalize Report',
      successTitle: 'Inspection report submitted',
      successMessage: 'A copy of the report will be emailed to the client and saved to your inspection archive.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
      },
    },
  },
  categories: ['checklist', 'inspection'],
  industries: ['home_services', 'real_estate'],
  useCases: ['assessment', 'service_request'],
  audiences: ['b2b', 'b2c'],
  tags: ['home-inspection', 'checklist', 'real-estate', 'inspection-report', 'ashi', 'internachi'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  seo: {
    seoTitle: 'Home Inspection Checklist Form Template',
    seoDescription:
      'Home inspection checklist form with rating scales for every system, photo upload, and signature. Free, customizable template.',
    seoKeywords: ['home inspection form', 'inspection checklist', 'home inspector report', 'real estate inspection'],
    faq: [
      {
        question: 'Is this template ASHI / InterNACHI compliant?',
        answer:
          'The template covers the major systems required by ASHI Standards of Practice and InterNACHI. Specific state requirements vary — verify that all required sections are present for your jurisdiction.',
      },
      {
        question: 'Can I add more rating categories (e.g. attic, insulation)?',
        answer:
          'Yes. Duplicate any of the rating fields in the builder and rename for additional systems. The rating field is reusable across categories.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 16. Cleaning Service Quote Form ─────────────────────────────────────────
const CLEANING_SERVICE_QUOTE_TEMPLATE: FormTemplate = {
  id: 'cleaning-service-quote-form',
  name: 'Cleaning Service Quote Form',
  shortDescription: 'Quote request for residential cleaning with property size and add-on services.',
  description:
    'Quote-request form for residential and small-office cleaning services. Captures service type (one-time, recurring, move-in/out, post-construction), property details (type, square footage, bedrooms, bathrooms), preferred date, and add-on services (windows, carpet, oven, fridge, baseboards). The cleaner can prepare an accurate quote before the walkthrough.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Cleaning Service Quote' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      {
        id: 'service_type',
        type: 'dropdown',
        label: 'Service Type',
        required: true,
        width: 'half',
        options: [
          { label: 'One-time deep clean', value: 'deep' },
          { label: 'Recurring (weekly / bi-weekly / monthly)', value: 'recurring' },
          { label: 'Move-in / move-out', value: 'move' },
          { label: 'Post-construction', value: 'post_construction' },
          { label: 'Office / commercial', value: 'commercial' },
        ],
      },
      {
        id: 'property_type',
        type: 'dropdown',
        label: 'Property Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Single-family home', value: 'house' },
          { label: 'Apartment', value: 'apartment' },
          { label: 'Condo / townhouse', value: 'condo' },
          { label: 'Office / commercial', value: 'office' },
        ],
      },
      {
        id: 'square_footage',
        type: 'numerical',
        label: 'Square Footage',
        required: true,
        width: 'half',
        validation: { min: 100, max: 20000 },
        placeholder: '1800',
      },
      {
        id: 'bedrooms',
        type: 'numerical',
        label: 'Bedrooms',
        required: true,
        width: 'quarter',
        validation: { min: 0, max: 15 },
        placeholder: '3',
      },
      {
        id: 'bathrooms',
        type: 'numerical',
        label: 'Bathrooms',
        required: true,
        width: 'quarter',
        validation: { min: 0, max: 15 },
        placeholder: '2',
      },
      { id: 'preferred_date', type: 'date', label: 'Preferred Service Date', required: true, width: 'half' },
      {
        id: 'additional_services',
        type: 'checkbox',
        label: 'Add-on Services (check all that apply)',
        width: 'full',
        options: [
          { label: 'Interior windows', value: 'windows' },
          { label: 'Carpet shampoo', value: 'carpet' },
          { label: 'Oven cleaning', value: 'oven' },
          { label: 'Refrigerator interior', value: 'fridge' },
          { label: 'Baseboards & blinds', value: 'baseboards' },
          { label: 'Garage / basement', value: 'garage' },
          { label: 'Laundry fold', value: 'laundry' },
        ],
      },
      { id: 'photos', type: 'photo', label: 'Photos of Property (optional)', width: 'full', helpText: 'Optional — photos of the kitchen, bathrooms, and main living areas help us prepare a more accurate quote.' },
    ],
    rules: [],
    theme: { primaryColor: '#0d9488', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Quote',
      successTitle: 'Quote request received!',
      successMessage: 'We will email your quote within one business day. For same-day service, please call us directly.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'cleaning_quote_request', pipelineStage: 'quote_requested' },
      },
    },
  },
  categories: ['quote', 'request'],
  industries: ['cleaning', 'home_services'],
  useCases: ['quote_request'],
  audiences: ['b2c'],
  tags: ['cleaning', 'quote-request', 'house-cleaning', 'add-ons', 'home-services', 'recurring'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Cleaning Service Quote Form Template',
    seoDescription:
      'Cleaning service quote form with property size, bedrooms, bathrooms, and add-on services. Free, mobile-friendly, customizable.',
    seoKeywords: ['cleaning quote form', 'house cleaning estimate', 'maid service form', 'cleaning intake'],
    faq: [
      {
        question: 'How do I price recurring vs. one-time cleaning?',
        answer:
          'You can configure the form\'s calculation widget to multiply square footage and bedrooms by your per-unit rates, with different multipliers for one-time vs. recurring. Or simply review submissions and quote manually.',
      },
      {
        question: 'Can customers book a specific time slot?',
        answer:
          'This template captures a preferred date. Add a time-slot dropdown or connect the form to your calendar-booking system to allow specific time-slot selection.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 17. Landscaping Service Request Form ────────────────────────────────────
const LANDSCAPING_SERVICE_REQUEST_TEMPLATE: FormTemplate = {
  id: 'landscaping-service-request-form',
  name: 'Landscaping Service Request Form',
  shortDescription: 'Landscaping service request with service type, property size, and frequency.',
  description:
    'Service-request form for landscaping contractors. Captures service type (lawn care, garden design, tree removal, mulching, irrigation, hardscape), property size in acres, desired service description, service frequency (one-time through monthly), preferred start date, budget range, and photos of the property. Designed to support both one-time jobs and recurring maintenance contracts.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Landscaping Service Request' }],
    fields: [
      { id: 'homeowner_name', type: 'short_answer', label: 'Homeowner Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      {
        id: 'service_type',
        type: 'dropdown',
        label: 'Service Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Lawn mowing / maintenance', value: 'lawn' },
          { label: 'Garden design / planting', value: 'garden' },
          { label: 'Tree trimming / removal', value: 'tree' },
          { label: 'Mulching / bed cleanup', value: 'mulching' },
          { label: 'Irrigation / sprinkler', value: 'irrigation' },
          { label: 'Hardscape (patio, walkway, retaining wall)', value: 'hardscape' },
          { label: 'Landscape lighting', value: 'lighting' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'property_size_acres',
        type: 'numerical',
        label: 'Property Size (acres)',
        required: true,
        width: 'half',
        validation: { min: 0.05, max: 50 },
        placeholder: '0.25',
      },
      { id: 'service_description', type: 'long_answer', label: 'Service Description', placeholder: 'Describe the work you want done. Include any specific plants, materials, or design preferences.', required: true, width: 'full' },
      {
        id: 'frequency',
        type: 'radio',
        label: 'Service Frequency',
        required: true,
        width: 'full',
        options: [
          { label: 'One-time job', value: 'one_time' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Bi-weekly', value: 'biweekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Seasonal', value: 'seasonal' },
        ],
      },
      { id: 'preferred_start_date', type: 'date', label: 'Preferred Start Date', required: true, width: 'half' },
      {
        id: 'budget_range',
        type: 'dropdown',
        label: 'Budget Range',
        width: 'half',
        options: [
          { label: 'Under $500', value: 'under_500' },
          { label: '$500 – $1,500', value: '500_1500' },
          { label: '$1,500 – $5,000', value: '1500_5000' },
          { label: '$5,000 – $15,000', value: '5000_15000' },
          { label: 'Over $15,000', value: 'over_15000' },
          { label: 'Not sure', value: 'unsure' },
        ],
      },
      { id: 'photos', type: 'photo', label: 'Photos of Property', width: 'full', helpText: 'Optional — photos of the area to be landscaped and any inspiration images help us prepare an accurate quote.' },
    ],
    rules: [],
    theme: { primaryColor: '#16a34a', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.75rem', layout: 'card' },
    settings: {
      submitButtonText: 'Request Service',
      successTitle: 'Request received!',
      successMessage: 'We will contact you within one business day to schedule a site visit and provide a detailed quote.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'landscaping_service_request' },
      },
    },
  },
  categories: ['request', 'quote'],
  industries: ['landscaping', 'home_services'],
  useCases: ['service_request', 'quote_request'],
  audiences: ['b2c'],
  tags: ['landscaping', 'lawn-care', 'service-request', 'recurring', 'home-services', 'hardscape'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  seo: {
    seoTitle: 'Landscaping Service Request Form Template',
    seoDescription:
      'Landscaping service request form with service type, property size, frequency, and budget. Free, mobile-friendly, customizable.',
    seoKeywords: ['landscaping form', 'lawn care request', 'landscaping estimate', 'lawn service intake'],
    faq: [
      {
        question: 'How do I handle recurring maintenance contracts?',
        answer:
          'The frequency field captures the desired cadence. Use the form\'s CRM-lead action to add recurring jobs to your scheduling system, with the frequency driving the recurring schedule.',
      },
      {
        question: 'Why ask for property size in acres?',
        answer:
          'Acres is the standard unit landscapers use for estimating time, materials, and equipment. For small urban lots, homeowners can enter fractional acres (0.25 = ~11,000 sq ft).',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION — every template above is registered at module load time.
// Importing this file populates the registry.
// ════════════════════════════════════════════════════════════════════════════

registerTemplate(DENTAL_PATIENT_INTAKE_TEMPLATE);
registerTemplate(MEDICAL_PATIENT_INTAKE_TEMPLATE);
registerTemplate(PATIENT_APPOINTMENT_REQUEST_TEMPLATE);
registerTemplate(TELEHEALTH_CONSULTATION_REQUEST_TEMPLATE);
registerTemplate(COVID_19_SCREENING_TEMPLATE);
registerTemplate(MEDICAL_HISTORY_QUESTIONNAIRE_TEMPLATE);
registerTemplate(PATIENT_CONSENT_TEMPLATE);
registerTemplate(VETERINARY_PATIENT_INTAKE_TEMPLATE);
registerTemplate(HVAC_SERVICE_REQUEST_TEMPLATE);
registerTemplate(HVAC_INSTALLATION_QUOTE_TEMPLATE);
registerTemplate(PLUMBING_SERVICE_REQUEST_TEMPLATE);
registerTemplate(PLUMBING_ESTIMATE_REQUEST_TEMPLATE);
registerTemplate(ELECTRICAL_SERVICE_REQUEST_TEMPLATE);
registerTemplate(ROOFING_INSPECTION_TEMPLATE);
registerTemplate(HOME_INSPECTION_CHECKLIST_TEMPLATE);
registerTemplate(CLEANING_SERVICE_QUOTE_TEMPLATE);
registerTemplate(LANDSCAPING_SERVICE_REQUEST_TEMPLATE);
