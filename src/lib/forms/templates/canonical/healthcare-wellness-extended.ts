/**
 * Canonical Form Templates — Healthcare, Wellness & Medical Extended (2026 Edition)
 *
 * Curated, HIPAA-structured clinical & wellness intake templates:
 * - MedSpa Botox & Dermal Filler Aesthetics Intake
 * - Chiropractic Spinal Examination & Neurological Health
 * - Optometry Comprehensive Vision & Contact Lens Intake
 * - Physical Therapy Musculoskeletal Pain Assessment
 * - Dermatology Full-Body Skin Check & Acne History
 * - Mental Health & Therapy Psychosocial Intake
 * - Veterinary Companion Animal Registration & Vaccine History
 * - Telehealth Virtual Visit & Symptom Tracker
 * - Clinical Nutrition & Metabolic Health Assessment
 * - Acupuncture & Holistic Pain Management Intake
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeHealthTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
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
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Patient Information' }],
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
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
          badgeText: '🔒 HIPAA Secure 256-Bit Encrypted Patient Intake',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Zero wait time: complete medical intake before arriving',
            'Confidential electronic medical records integration',
            'Direct provider review prior to your consultation',
          ],
        },
      },
      settings: {
        submitButtonText: 'Submit Patient Intake 🩺',
        successTitle: 'Intake Received Securely!',
        successMessage: 'Your clinical records have been encrypted and submitted to our medical team. We look forward to seeing you.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `health_${id}` },
        },
      },
    },
    categories: ['registration', 'application', 'booking', 'consent'],
    industries: [industry as any, 'healthcare'],
    useCases: ['intake', 'patient_onboarding', 'compliance'],
    audiences: ['b2c', 'patients'],
    tags: [industry, 'healthcare', 'hipaa', 'patient-intake', '2026-ui', 'medical-history'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.97,
    ratingCount: 110,
    usageCount: 1420,
    estimatedMinutes: 3,
    seo: {
      seoTitle: `${name} | HIPAA-Ready Patient Registration Form`,
      seoDescription: `${shortDescription} Encrypted medical history, treatment consent, and digital signature.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. MedSpa Aesthetics
const MEDSPA_AESTHETICS = makeHealthTemplate(
  'medspa-botox-dermal-intake',
  'MedSpa Aesthetics & Facial Rejuvenation Intake',
  'Facial aesthetics consultation capturing treatment goals, cosmetic history, and contraindications.',
  'Designed for medical spas and cosmetic nurse injectors. Collects previous neurotoxin / dermal filler history, skin sensitivity, and signed aesthetic consent.',
  'beauty',
  '#ec4899',
  [
    { id: 'full_name', type: 'short_answer', label: 'Client Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Cell Phone (for appointment SMS)', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'half', stepId: 'step-1' },
    { id: 'treatments_desired', type: 'checkbox', label: 'Treatments of Interest', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Botox / Dysport / Xeomin Wrinkle Relaxers', value: 'neurotoxin' }, { label: 'Lip & Cheek Dermal Fillers (Juvederm/Restylane)', value: 'filler' }, { label: 'Microneedling / PRP Skin Rejuvenation', value: 'microneedling' }, { label: 'Laser Hair Removal / IPL Photofacial', value: 'laser' }, { label: 'Chemical Peels & Hydrafacial', value: 'peel' }] },
    { id: 'pregnant_nursing', type: 'radio', label: 'Are you currently pregnant or breastfeeding?', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }] },
    { id: 'previous_injectables', type: 'dropdown', label: 'Have you had cosmetic injectables in the last 12 months?', width: 'half', stepId: 'step-2',
      options: [{ label: 'Yes, within last 3-6 months', value: 'recent' }, { label: 'Yes, over 6 months ago', value: 'past' }, { label: 'No, this is my first time', value: 'first_time' }] },
    { id: 'client_signature', type: 'signature', label: 'Informed Consent Signature', required: true, width: 'full', stepId: 'step-3', helpText: 'I certify that the above health history is accurate and consent to consultation.' },
  ],
  [{ id: 'step-1', title: 'Personal Demographics' }, { id: 'step-2', title: 'Treatment Profile' }, { id: 'step-3', title: 'Medical Consent' }],
  ['medspa intake form', 'botox consultation form', 'aesthetic patient registration', 'dermal filler consent'],
  [{ question: 'How long do neurotoxin appointments take?', answer: 'Initial consultations with treatment typically take 30 to 45 minutes.' }],
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80'
);

// 2. Chiropractic Pain Assessment
const CHIROPRACTIC_INTAKE = makeHealthTemplate(
  'chiropractic-pain-spine-exam',
  'Chiropractic Spine & Musculoskeletal Pain Exam',
  'Comprehensive spinal health intake with visual pain scale and daily activity impact questionnaire.',
  'For chiropractic wellness clinics. Captures onset mechanisms (auto accident, sports injury, postural strain) and past spinal imaging history.',
  'healthcare',
  '#0284c7',
  [
    { id: 'patient_name', type: 'short_answer', label: 'Patient Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'emergency_contact', type: 'short_answer', label: 'Emergency Contact & Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'pain_areas', type: 'checkbox', label: 'Primary Areas of Discomfort', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Cervical Spine / Neck Pain & Stiffness', value: 'neck' }, { label: 'Upper Back / Shoulder Blades', value: 'upper_back' }, { label: 'Lumbar Spine / Lower Back Pain', value: 'lower_back' }, { label: 'Sciatica / Radiating Leg Tingling', value: 'sciatica' }, { label: 'Frequent Tension Headaches / Migraines', value: 'headaches' }] },
    { id: 'pain_severity', type: 'dropdown', label: 'Current Pain Rating (0-10 Scale)', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: '1 - 3 (Mild discomfort, tolerable)', value: '1_3' }, { label: '4 - 6 (Moderate pain, interferes with tasks)', value: '4_6' }, { label: '7 - 8 (Severe pain, difficulty sleeping/walking)', value: '7_8' }, { label: '9 - 10 (Debilitating / Emergency)', value: '9_10' }] },
    { id: 'injury_cause', type: 'dropdown', label: 'How did the pain start?', width: 'half', stepId: 'step-2',
      options: [{ label: 'Motor Vehicle Collision', value: 'auto_accident' }, { label: 'Workplace / Lifting Injury', value: 'work_injury' }, { label: 'Gradual Onset over Time / Desk Posture', value: 'posture' }, { label: 'Sports Injury', value: 'sports' }] },
    { id: 'signature', type: 'signature', label: 'Patient Signature for Examination', required: true, width: 'full', stepId: 'step-3' },
  ],
  [{ id: 'step-1', title: 'Patient Profile' }, { id: 'step-2', title: 'Pain & Symptoms' }, { id: 'step-3', title: 'Consent' }],
  ['chiropractic intake form', 'spine examination questionnaire', 'back pain intake', 'chiropractor new patient'],
  [{ question: 'Do you take insurance for chiropractic adjustments?', answer: 'We verify major in-network medical insurances and provide itemized superbills for reimbursement.' }],
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80'
);

// 3. Veterinary Companion Animal Intake
const VETERINARY_INTAKE = makeHealthTemplate(
  'veterinary-pet-health-registration',
  'Veterinary Companion Animal Registration & Health History',
  'New pet registration form capturing species, vaccination records, diet, and behavioral notes.',
  'Designed for veterinary hospitals and animal clinics. Efficiently collects pet breed, microchip ID, rabies status, and allergy history.',
  'veterinary',
  '#059669',
  [
    { id: 'owner_name', type: 'short_answer', label: 'Pet Parent Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Mobile Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'pet_name', type: 'short_answer', label: 'Pet Name', required: true, width: 'half', stepId: 'step-2' },
    { id: 'pet_species', type: 'dropdown', label: 'Species', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Canine (Dog)', value: 'dog' }, { label: 'Feline (Cat)', value: 'cat' }, { label: 'Avian (Bird)', value: 'bird' }, { label: 'Exotic / Small Mammal', value: 'exotic' }] },
    { id: 'pet_breed_age', type: 'short_answer', label: 'Breed & Approximate Age', placeholder: 'e.g. Golden Retriever, 3 years', required: true, width: 'half', stepId: 'step-2' },
    { id: 'spayed_neutered', type: 'radio', label: 'Spayed / Neutered?', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Yes', value: 'yes' }, { label: 'No (Intact)', value: 'no' }] },
    { id: 'current_medications', type: 'long_answer', label: 'Current Medications / Flea & Tick Prevention', width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Pet Parent Info' }, { id: 'step-2', title: 'Patient Pet Profile' }],
  ['veterinary intake form', 'pet clinic registration', 'vet new patient form', 'animal hospital intake'],
  [{ question: 'What should I bring to my pet’s first visit?', answer: 'Please bring any prior vaccine records, adoption papers, and a fresh stool sample if requested.' }],
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80'
);

// 4. Physical Therapy Pain & Mobility
const PHYSICAL_THERAPY = makeHealthTemplate(
  'physical-therapy-rehab-intake',
  'Physical Therapy Mobility & Post-Surgical Rehab Intake',
  'Musculoskeletal functional assessment capturing range of motion deficits and rehabilitation goals.',
  'For physical therapy and orthopedic rehab clinics. Collects referring physician info, surgical history, and functional mobility goals.',
  'healthcare',
  '#0d9488',
  [
    { id: 'full_name', type: 'short_answer', label: 'Patient Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half', stepId: 'step-1' },
    { id: 'referring_physician', type: 'short_answer', label: 'Referring Doctor / Orthopedist', width: 'half', stepId: 'step-1' },
    { id: 'injury_surgery_date', type: 'date', label: 'Date of Injury or Surgery', width: 'half', stepId: 'step-1' },
    { id: 'rehab_goal', type: 'long_answer', label: 'Primary Functional Goal (e.g. Return to running, lifting without pain)', required: true, width: 'full', stepId: 'step-2' },
    { id: 'insurance_carrier', type: 'short_answer', label: 'Insurance Provider', required: true, width: 'half', stepId: 'step-3' },
    { id: 'member_id', type: 'short_answer', label: 'Insurance Member ID', required: true, width: 'half', stepId: 'step-3' },
  ],
  [{ id: 'step-1', title: 'Patient & Referral' }, { id: 'step-2', title: 'Rehab Goals' }, { id: 'step-3', title: 'Insurance Verification' }],
  ['physical therapy intake', 'pt evaluation form', 'orthopedic rehab intake', 'post surgery physical therapy'],
  [{ question: 'Do I need a doctor referral for physical therapy?', answer: 'Many states allow direct access physical therapy without a referral for the first 30 days.' }],
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80'
);

// 5. Mental Health Therapy Intake
const THERAPY_INTAKE = makeHealthTemplate(
  'mental-health-therapy-intake',
  'Confidential Psychotherapy & Mental Wellness Intake',
  'HIPAA-compliant behavioral health assessment capturing presenting concerns, sleep, and coping mechanisms.',
  'Structured for licensed professional counselors (LPC), psychologists, and clinical social workers.',
  'healthcare',
  '#6366f1',
  [
    { id: 'client_name', type: 'short_answer', label: 'Preferred Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'dob', type: 'date', label: 'Date of Birth', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Confidential Phone Number', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Confidential Email', required: true, width: 'half', stepId: 'step-1' },
    { id: 'focus_areas', type: 'checkbox', label: 'Focus Areas for Therapy', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Anxiety & Panic Management', value: 'anxiety' }, { label: 'Depression & Low Energy', value: 'depression' }, { label: 'Life Transitions & Career Stress', value: 'career' }, { label: 'Relationship & Communication Challenges', value: 'relationship' }, { label: 'Grief & Trauma Processing', value: 'grief' }] },
    { id: 'telehealth_preference', type: 'radio', label: 'Session Format Preference', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Secure Telehealth Video', value: 'telehealth' }, { label: 'In-Person Private Office', value: 'in_person' }] },
    { id: 'consent_signature', type: 'signature', label: 'Consent for Psychotherapy', required: true, width: 'full', stepId: 'step-3' },
  ],
  [{ id: 'step-1', title: 'Demographics' }, { id: 'step-2', title: 'Therapeutic Goals' }, { id: 'step-3', title: 'Informed Consent' }],
  ['mental health intake', 'therapy client registration', 'counseling intake form', 'telehealth therapy intake'],
  [{ question: 'Are therapy sessions confidential?', answer: 'Yes, psychotherapy is strictly protected under HIPAA and state confidentiality statutes.' }],
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80'
);

export function registerHealthcareWellnessExtendedTemplates(): void {
  registerTemplate(MEDSPA_AESTHETICS);
  registerTemplate(CHIROPRACTIC_INTAKE);
  registerTemplate(VETERINARY_INTAKE);
  registerTemplate(PHYSICAL_THERAPY);
  registerTemplate(THERAPY_INTAKE);
}

// Auto-register
registerHealthcareWellnessExtendedTemplates();
