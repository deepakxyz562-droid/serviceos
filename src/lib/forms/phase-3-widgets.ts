/**
 * Phase 3 Widget Definitions — 110 industry widgets.
 *
 * Uses the same compact data-driven tuple format as phase-2-widgets.ts.
 *
 * Categories:
 *   - survey-advanced (20)  - healthcare (12)  - real-estate (8)
 *   - education (8)         - legal (8)         - ecommerce (10)
 *   - finance (8)           - marketing (8)     - analytics (10)  - industry (18)
 */
import type { FieldDefinition, SettingField } from './field-settings-types';

type WidgetSpec = [
  id: string,
  name: string,
  category: FieldDefinition['category'],
  iconName: string,
  description: string,
  badge: FieldDefinition['badge'] | '',
  tier: FieldDefinition['tier'],
  extraSettings?: SettingField[],
  backendHandler?: FieldDefinition['backendHandler'],
];

const WIDGET_SPECS: WidgetSpec[] = [
  // ─── Survey Advanced (20) ──────────────────────────────────────────────────
  ['survey_question_bank', 'Survey Question Bank', 'survey', 'Library', 'Pre-built survey questions', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['ab_test_split', 'A/B Test Split', 'survey', 'Split', 'Show variant A or B', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['sentiment_analysis_ai', 'AI Sentiment Analysis', 'survey', 'Sparkles', 'AI sentiment of textarea', 'AI', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['emotion_picker', 'Emotion Picker', 'survey', 'Smile', 'Emoji emotion picker', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['feedback_360', '360° Feedback', 'survey', 'Users', 'Multi-peer feedback', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['peer_review', 'Peer Review', 'survey', 'UserCheck', 'Single peer review', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['mood_tracker', 'Mood Tracker', 'survey', 'Heart', 'Daily mood with calendar', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['daily_check_in', 'Daily Check-In', 'survey', 'CalendarCheck', 'Wellness daily check-in', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['wellness_pulse', 'Wellness Pulse', 'survey', 'Activity', 'Wellness 1-10 over time', 'NEW', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['employee_engagement', 'Employee Engagement', 'survey', 'Users', '5 dimensions × Likert', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['satisfaction_emoji', 'Satisfaction Emoji', 'survey', 'Smile', '3-emoji satisfaction', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['survey_slider', 'Survey Slider', 'survey', 'SlidersHorizontal', '0-100 slider with labels', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['thumbs_up_down', 'Thumbs Up/Down (v2)', 'survey', 'ThumbsUp', 'Improved thumb rating', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['matrix_question', 'Matrix Question', 'survey', 'Grid3x3', 'Single matrix × 5-point', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['ranking_question', 'Ranking Question', 'survey', 'ArrowUpDown', 'Rank items 1-N', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['open_ended_question', 'Open-Ended Question', 'survey', 'FileText', 'Textarea + word count', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['multi_select_question', 'Multi-Select Question', 'survey', 'CheckSquare', 'Select all that apply', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['net_promoter_score', 'NPS Survey', 'survey', 'Gauge', 'NPS + follow-up comment', 'POPULAR', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],
  ['customer_effort_score', 'Customer Effort Score', 'survey', 'Gauge', 'CES "how easy" 1-7', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'randomOrder', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle answer choices on each form load.' },
  ]],

  // ─── Healthcare / HIPAA (12) ───────────────────────────────────────────────
  ['hipaa_consent', 'HIPAA Consent', 'security', 'ShieldCheck', 'HIPAA consent checkbox', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['medical_history', 'Medical History', 'security', 'ClipboardList', 'Conditions, meds, allergies', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['insurance_card_scanner', 'Insurance Card Scanner', 'media', 'ScanLine', 'OCR insurance card', 'AI', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ], 'ocr'],
  ['prescription_upload', 'Prescription Upload', 'file', 'FilePlus', 'Rx upload + pharmacy', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['symptom_checker', 'Symptom Checker', 'survey', 'Stethoscope', 'Interactive symptom checker', 'AI', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['vital_signs_input', 'Vital Signs Input', 'survey', 'HeartPulse', 'BP, HR, Temp, RR, O2', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['telehealth_consent', 'Telehealth Consent', 'security', 'Video', 'Telehealth-specific consent', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['hipaa_phi_field', 'HIPAA PHI Field (Encrypted)', 'security', 'Lock', 'Encrypted PHI input', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['medical_release_form', 'Medical Release Form', 'security', 'FileText', 'Records release auth', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['patient_intake', 'Patient Intake', 'security', 'ClipboardList', 'Demographics + insurance + history', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],
  ['allergy_checklist', 'Allergy Checklist', 'security', 'AlertTriangle', 'Common allergies checklist', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'encrypted', label: 'Encrypt response at rest', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Store this field value encrypted (PHI-safe).' },
  ]],

  // ─── Real Estate (8) ────────────────────────────────────────────────────────
  ['property_search', 'Property Search', 'maps', 'Search', 'Search properties by address', 'NEW', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['mls_listing_display', 'MLS Listing Display', 'embed', 'Home', 'Display MLS listing', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['mortgage_calculator', 'Mortgage Calculator', 'calculation', 'Calculator', 'Mortgage monthly payment', 'POPULAR', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['closing_cost_estimator', 'Closing Cost Estimator', 'calculation', 'Receipt', 'Closing costs breakdown', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['property_inspection_checklist', 'Property Inspection', 'productivity', 'ClipboardCheck', 'Inspection checklist', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['tenant_application', 'Tenant Application', 'contact', 'FileUser', 'Tenant app with references', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['lease_agreement_sign', 'Lease Agreement Sign', 'signature', 'FileSignature', 'Lease + signature', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['move_in_checklist', 'Move-In Checklist', 'productivity', 'ClipboardList', 'Room-by-room condition', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],

  // ─── Education (8) ──────────────────────────────────────────────────────────
  ['course_registration', 'Course Registration', 'productivity', 'GraduationCap', 'Course + section + credits', 'POPULAR', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['student_info_card', 'Student Info Card', 'contact', 'IdCard', 'Student info bundle', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['assignment_submission', 'Assignment Submission', 'file', 'FileUp', 'File upload + comments', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['quiz_builder', 'Quiz Builder', 'productivity', 'HelpCircle', 'Question + options + answer', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['grade_input', 'Grade Input', 'productivity', 'GraduationCap', 'Student list × grades', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['attendance_tracker', 'Attendance Tracker', 'productivity', 'ClipboardCheck', 'Present/absent/late', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['parent_consent', 'Parent Consent', 'security', 'ShieldCheck', 'Parent name + signature', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['scholarship_application', 'Scholarship Application', 'contact', 'Award', 'Essays + achievements', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],

  // ─── Legal (8) ──────────────────────────────────────────────────────────────
  ['gdpr_consent', 'GDPR Consent (v2)', 'security', 'ScrollText', 'Granular GDPR consent', 'POPULAR', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'legalText', label: 'Legal / consent text', type: 'textarea', group: 'field_specific', placeholder: 'Paste the full legal or consent text respondents must accept...' },
  ]],
  ['privacy_policy_accept', 'Privacy Policy Accept (v2)', 'security', 'FileText', 'Versioned privacy policy', '', 'free', [
    { key: 'policyTitle', label: 'Policy Title', type: 'text', group: 'field_specific', default: 'Privacy Policy' },
    { key: 'policyUrl', label: 'Policy URL', type: 'text', group: 'field_specific', default: '/privacy-policy' },
    { key: 'policyBody', label: 'Policy Text / Summary', type: 'textarea', group: 'field_specific', default: 'Please review and accept our Privacy Policy regarding personal data handling.' },
    { key: 'version', label: 'Policy Version', type: 'text', group: 'field_specific', default: '2.0.0' },
    { key: 'requireScroll', label: 'Require Scroll to Bottom', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Require user to review text before accepting.' },
    { key: 'agreeLabel', label: 'Consent Checkbox Label', type: 'text', group: 'field_specific', default: 'I have read and agree to the Privacy Policy' },
  ]],
  ['nda_sign', 'NDA Sign', 'signature', 'FileSignature', 'NDA + party + signature', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'legalText', label: 'Legal / consent text', type: 'textarea', group: 'field_specific', placeholder: 'Paste the full legal or consent text respondents must accept...' },
  ]],
  ['waiver_release', 'Waiver / Release', 'signature', 'FileText', 'Liability waiver', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'legalText', label: 'Legal / consent text', type: 'textarea', group: 'field_specific', placeholder: 'Paste the full legal or consent text respondents must accept...' },
  ]],
  ['terms_of_service', 'Terms of Service', 'security', 'ScrollText', 'ToS acceptance', 'POPULAR', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'legalText', label: 'Legal / consent text', type: 'textarea', group: 'field_specific', placeholder: 'Paste the full legal or consent text respondents must accept...' },
  ]],
  ['cookie_consent_banner', 'Cookie Consent Banner', 'security', 'Cookie', 'Cookie categories', 'NEW', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
    { key: 'legalText', label: 'Legal / consent text', type: 'textarea', group: 'field_specific', placeholder: 'Paste the full legal or consent text respondents must accept...' },
  ]],
  ['age_verification', 'Age Verification (v2)', 'security', 'CalendarClock', 'DOB + ID upload', '', 'free', [
    { key: 'minimumAge', label: 'Minimum Age', type: 'number', group: 'field_specific', default: 21, min: 13, max: 100 },
    { key: 'requireDateOfBirth', label: 'Require Date of Birth', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'requireIdUpload', label: 'Require Government ID Photo Upload', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'confirmationText', label: 'Confirmation Statement', type: 'textarea', group: 'field_specific', default: 'I confirm that I meet the minimum age requirement and all information provided is accurate.' },
  ]],
  ['digital_witness', 'Digital Witness (v2)', 'signature', 'Eye', 'Witness signature + statement', 'NEW', 'business', [
    { key: 'documentTitle', label: 'Document / Agreement Title', type: 'text', group: 'field_specific', default: 'Service Agreement' },
    { key: 'requireSignature', label: 'Require Witness Signature', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'requireName', label: 'Require Witness Full Name', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'statementPreset', label: 'Witness Attestation Statement', type: 'textarea', group: 'field_specific', default: 'I, the undersigned, hereby attest that to the best of my knowledge the events described above are true and accurate, and that I witnessed them personally.' },
  ]],

  // ─── E-commerce (10) ────────────────────────────────────────────────────────
  ['product_configurator', 'Product Configurator', 'payment', 'SlidersHorizontal', 'Step-by-step product config', 'NEW', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['variant_selector', 'Variant Selector', 'payment', 'Grid2x2', 'Color × size matrix', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['cart_summary', 'Cart Summary', 'payment', 'ShoppingCart', 'Read-only cart display', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['shipping_estimator', 'Shipping Estimator', 'payment', 'Truck', 'Zip → rate + free-over', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['gift_card_input', 'Gift Card Input', 'payment', 'Gift', 'Gift card + apply', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['loyalty_points_display', 'Loyalty Points Display', 'payment', 'Star', 'Points + redemption', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['wishlist_add', 'Wishlist Add', 'payment', 'Heart', 'Add to wishlist button', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['abandoned_cart_recovery', 'Abandoned Cart Recovery', 'marketing', 'ShoppingCart', 'Email capture for recovery', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['upsell_modal', 'Upsell Modal', 'payment', 'TrendingUp', 'One-click upsell', 'NEW', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['cross_sell', 'Cross-Sell', 'payment', 'Layers', 'Cross-sell suggestions', '', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],

  // ─── Finance (8) ────────────────────────────────────────────────────────────
  ['bank_account_validator', 'Bank Account Validator', 'finance', 'Landmark', 'Account + routing validation', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['routing_number_lookup', 'Routing Number Lookup', 'finance', 'Search', 'ABA routing → bank name', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['credit_card_scanner', 'Credit Card Scanner', 'finance', 'CreditCard', 'Camera scan card', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['crypto_wallet_input', 'Crypto Wallet Input', 'finance', 'Wallet', 'BTC/ETH address + checksum', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['stock_ticker_display', 'Stock Ticker Display', 'finance', 'TrendingUp', 'Read-only stock ticker', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['expense_input', 'Expense Input', 'finance', 'Receipt', 'Category + amount + date', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['budget_calculator', 'Budget Calculator', 'calculation', 'Calculator', 'Income - expenses', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['tax_form_w9', 'Tax Form W-9', 'finance', 'FileText', 'W-9 with SSN/EIN', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],

  // ─── Marketing (8) ───────────────────────────────────────────────────────────
  ['utm_capture', 'UTM Capture', 'marketing', 'Link', 'Auto-capture UTM from URL', 'NEW', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['lead_scoring_display', 'Lead Scoring Display', 'marketing', 'Trophy', 'Read-only lead score', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['referral_code_input', 'Referral Code Input', 'marketing', 'Ticket', 'Referral + validate', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['campaign_source_tracker', 'Campaign Source Tracker', 'marketing', 'Megaphone', 'Hidden campaign tracker', '', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['social_share_buttons', 'Social Share Buttons (v2)', 'marketing', 'Share2', 'Share + custom URL + title', 'POPULAR', 'free', [
    { key: 'url', label: 'Share URL (leave blank for current page)', type: 'text', group: 'field_specific', placeholder: 'https://example.com' },
    { key: 'title', label: 'Share Title / Message', type: 'text', group: 'field_specific', default: 'Check this out' },
    { key: 'showLabels', label: 'Show Platform Labels', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'allowEdit', label: 'Allow Respondent to Edit URL', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['email_signup_segment', 'Email Signup + Segment', 'marketing', 'Mail', 'Newsletter/promo/both', 'NEW', 'free', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['promo_code_unlock', 'Promo Code Unlock', 'marketing', 'TicketPercent', 'Promo + unlock offer', 'POPULAR', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['viral_waitlist', 'Viral Waitlist', 'marketing', 'Users', 'Waitlist + referral position', 'NEW', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],

  // ─── Analytics (10) ─────────────────────────────────────────────────────────
  ['google_analytics_4_widget', 'Google Analytics 4', 'analytics', 'BarChart3', 'GA4 event tracker', 'POPULAR', 'pro', [
    { key: 'measurementId', label: 'Google Analytics Measurement ID', type: 'text', group: 'field_specific', default: 'G-XXXXXXXXXX', placeholder: 'G-XXXXXXXXXX' },
    { key: 'eventName', label: 'Event Name on Submit', type: 'text', group: 'field_specific', default: 'form_submit' },
    { key: 'debug', label: 'Debug Mode', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Log GA4 event payloads to console.' },
  ]],
  ['facebook_pixel_widget', 'Facebook Pixel', 'analytics', 'Activity', 'FB pixel tracker', '', 'pro', [
    { key: 'pixelId', label: 'Facebook Pixel ID', type: 'text', group: 'field_specific', default: '000000000000000', placeholder: '123456789012345' },
    { key: 'eventName', label: 'Event Name on Submit', type: 'text', group: 'field_specific', default: 'Lead' },
    { key: 'debug', label: 'Debug Mode', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['mixpanel_event_widget', 'Mixpanel Event', 'analytics', 'Activity', 'Mixpanel tracker', '', 'pro', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['hotjar_heatmap_widget', 'Hotjar Heatmap', 'analytics', 'MousePointerClick', 'Hotjar integration', '', 'business', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['form_abandonment_tracker', 'Form Abandonment Tracker', 'analytics', 'Timer', 'Time + fields before abandon', 'NEW', 'pro', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['conversion_goal_tracker', 'Conversion Goal Tracker', 'analytics', 'Target', 'Fire conversion on submit', '', 'pro', [
    { key: 'goalId', label: 'Goal ID', type: 'text', group: 'field_specific', default: 'goal_primary' },
    { key: 'goalName', label: 'Goal Name', type: 'text', group: 'field_specific', default: 'Form Submission' },
    { key: 'value', label: 'Goal Conversion Value ($)', type: 'number', group: 'field_specific', default: 10 },
    { key: 'currency', label: 'Currency Code', type: 'text', group: 'field_specific', default: 'USD' },
  ]],
  ['time_on_field', 'Time on Field', 'analytics', 'Clock', 'Read-only per-field timings', '', 'pro', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['scroll_depth_tracker', 'Scroll Depth Tracker', 'analytics', 'MoveVertical', 'How far user scrolled', '', 'pro', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['submission_source_attribution', 'Submission Source Attribution', 'analytics', 'Link', 'Referrer + UTM hidden', 'NEW', 'free', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],
  ['ab_test_winner', 'A/B Test Winner Display', 'analytics', 'Trophy', 'Read-only A/B winner', 'PRO', 'business', [
    { key: 'measurementId', label: 'Measurement / Tracking ID', type: 'text', group: 'field_specific', placeholder: 'G-XXXXXXXXXX, MP-XXX, HJ-XXXXXXX…' },
  ]],

  // ─── Industry Verticals (18) ───────────────────────────────────────────────
  ['construction_site_inspection', 'Construction Site Inspection', 'productivity', 'HardHat', 'Categories × items × status', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['hvac_service_report', 'HVAC Service Report', 'productivity', 'Fan', 'System + diagnosis + parts', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['plumbing_job_card', 'Plumbing Job Card', 'productivity', 'Droplet', 'Issue + parts + time', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['electrical_safety_check', 'Electrical Safety Check', 'productivity', 'Zap', 'Panels + outlets + breakers', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['automotive_inspection', 'Automotive Inspection', 'productivity', 'Car', 'Exterior + interior + mechanical', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['restaurant_health_audit', 'Restaurant Health Audit', 'productivity', 'UtensilsCrossed', 'Food + hygiene + equipment', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['retail_inventory_audit', 'Retail Inventory Audit', 'productivity', 'Boxes', 'SKU + count + discrepancy', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['event_catering_order', 'Event Catering Order', 'productivity', 'UtensilsCrossed', 'Menu + guests + dietary', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['field_service_report', 'Field Service Report', 'productivity', 'ClipboardList', 'Job type + work done', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['inspection_checklist_generic', 'Generic Inspection Checklist', 'productivity', 'ClipboardCheck', 'Template checklist', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['delivery_confirmation', 'Delivery Confirmation', 'productivity', 'Truck', 'Signature + photo + timestamp', 'POPULAR', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['work_order_form', 'Work Order Form', 'productivity', 'ClipboardList', 'Description + priority + assignee', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['maintenance_request', 'Maintenance Request', 'productivity', 'Wrench', 'Location + issue + urgency', '', 'pro', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['incident_report', 'Incident Report', 'productivity', 'AlertTriangle', 'Date + location + witnesses', '', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['safety_incident_report', 'Safety Incident Report', 'productivity', 'ShieldAlert', 'OSHA-style fields', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['quality_control_checklist', 'Quality Control Checklist', 'productivity', 'CheckCircle', 'Item × pass/fail/notes', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['equipment_inspection', 'Equipment Inspection', 'productivity', 'Wrench', 'Asset + condition + status', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
  ['compliance_audit', 'Compliance Audit', 'productivity', 'ShieldCheck', 'Regulation × status × notes', 'PRO', 'business', [
    { key: 'required', label: 'Required', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent submission if this field is empty.' },
  ]],
];

export const PHASE_3_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
  ([id, name, category, iconName, description, badge, tier, extraSettings, backendHandler]) => ({
    id,
    name,
    category,
    iconName,
    description,
    badge: (badge || undefined) as FieldDefinition['badge'],
    tier: tier as FieldDefinition['tier'],
    backendHandler: backendHandler as FieldDefinition['backendHandler'],
    createField: (label?: string) => ({
      label: label ?? name,
      type: 'short_answer',
      widgetType: id,
      widgetConfig: (extraSettings || []).reduce<Record<string, unknown>>((acc, s) => {
        if (s.default !== undefined) acc[s.key] = s.default;
        return acc;
      }, {}),
      required: false,
    }),
    settingsSchema: extraSettings ?? [],
  }),
);
