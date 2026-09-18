/**
 * Business & General-purpose canonical form templates.
 *
 * File scope (T1.2-a): 17 NEW business / general-purpose templates.
 * The existing `contact-form` template lives in `_placeholder.ts`
 * and is intentionally NOT duplicated here.
 *
 * Each template calls `registerTemplate()` at module load time so the
 * registry is populated once the parent `index.ts` imports this file.
 *
 * Template inventory (17):
 *   1.  customer-feedback-survey        (featured)
 *   2.  net-promoter-score-nps          (featured)
 *   3.  event-registration-form         (featured)
 *   4.  event-rsvp-form
 *   5.  job-application-form            (featured)
 *   6.  vendor-application-form
 *   7.  membership-application-form
 *   8.  volunteer-signup-form
 *   9.  newsletter-signup-form
 *   10. contest-entry-form
 *   11. product-feedback-form
 *   12. customer-satisfaction-survey-csat
 *   13. general-inquiry-form
 *   14. partnership-inquiry-form
 *   15. sponsorship-application-form
 *   16. refund-request-form
 *   17. testimonial-request-form
 */
import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

const NOW = new Date().toISOString();

// ─── 1. Customer Feedback Survey ───────────────────────────────────────────
const CUSTOMER_FEEDBACK_SURVEY: FormTemplate = {
  id: 'customer-feedback-survey',
  name: 'Customer Feedback Survey',
  shortDescription: 'Collect actionable feedback on your product, service, or overall experience.',
  description:
    'A versatile feedback survey that captures what customers loved, what could be improved, and whether they would recommend you. Works for any product or service business and exports cleanly to your CRM.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Your Feedback' }],
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'product_service', type: 'short_answer', label: 'Product or Service Used', placeholder: 'e.g. Pro Plan subscription', required: true, width: 'full' },
      { id: 'experience_date', type: 'date', label: 'Date of Experience', width: 'half' },
      { id: 'overall_rating', type: 'rating', label: 'Overall Rating', helpText: 'How would you rate your overall experience?', required: true, width: 'half' },
      {
        id: 'recommend',
        type: 'radio',
        label: 'Would you recommend us to a friend?',
        required: true,
        width: 'full',
        options: [
          { label: 'Definitely', value: 'definitely' },
          { label: 'Probably', value: 'probably' },
          { label: 'Not sure', value: 'not_sure' },
          { label: 'Probably not', value: 'probably_not' },
          { label: 'Definitely not', value: 'definitely_not' },
        ],
      },
      { id: 'what_went_well', type: 'long_answer', label: 'What went well?', placeholder: 'Tell us what you enjoyed...', width: 'full' },
      { id: 'improvements', type: 'long_answer', label: 'What could we improve?', placeholder: 'How can we serve you better?', width: 'full' },
      { id: 'follow_up', type: 'checkbox', label: 'A team member may follow up with me about this feedback', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#4f46e5',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Feedback',
      successTitle: 'Thanks for your feedback!',
      successMessage: 'We appreciate you taking the time to share your thoughts. Your input helps us improve.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'feedback_survey' },
      },
    },
  },
  categories: ['feedback', 'survey'],
  industries: ['general'],
  useCases: ['customer_feedback'],
  audiences: ['b2c', 'b2b'],
  tags: ['feedback', 'survey', 'customer-experience', 'cx', 'mobile-friendly'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Customer Feedback Survey Template — Free & Customizable',
    seoDescription:
      'A ready-to-use customer feedback survey that captures what customers loved, what to improve, and whether they would recommend you. Free, mobile-friendly.',
    seoKeywords: ['customer feedback survey', 'feedback form', 'cx survey', 'product feedback'],
    faq: [
      {
        question: 'What should a customer feedback survey include?',
        answer:
          'A good feedback survey includes the customer\u2019s name and contact info, the product or service they used, a satisfaction rating, an open-ended question about what went well, a question on improvements, and permission to follow up.',
      },
      {
        question: 'How long should a feedback survey be?',
        answer:
          'Keep it under 10 questions. Most customers spend less than 3 minutes on a survey, so focus on the questions that drive real decisions.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 2. Net Promoter Score (NPS) ────────────────────────────────────────────
const NET_PROMOTER_SCORE_NPS: FormTemplate = {
  id: 'net-promoter-score-nps',
  name: 'Net Promoter Score (NPS) Survey',
  shortDescription: 'Measure customer loyalty with the classic 0\u201310 NPS question.',
  description:
    'The industry-standard Net Promoter Score survey. Asks the iconic likelihood-to-recommend question on a 0\u201310 scale and follows up with a reason for the score. Ideal for SaaS, retail, services, and recurring revenue businesses.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'NPS Survey' }],
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'company', type: 'short_answer', label: 'Company (optional)', placeholder: 'Acme Inc.', width: 'full' },
      {
        id: 'nps_score',
        type: 'numerical',
        label: 'How likely are you to recommend us to a friend or colleague?',
        helpText: 'Enter a number from 0 (not at all likely) to 10 (extremely likely).',
        required: true,
        width: 'full',
        validation: { min: 0, max: 10 },
      },
      {
        id: 'score_reason',
        type: 'long_answer',
        label: 'What is the primary reason for your score?',
        placeholder: 'Tell us why you chose this score...',
        required: true,
        width: 'full',
      },
      {
        id: 'follow_up_permission',
        type: 'radio',
        label: 'May we contact you to learn more?',
        width: 'full',
        options: [
          { label: 'Yes, please reach out', value: 'yes' },
          { label: 'No, please do not contact me', value: 'no' },
        ],
      },
      { id: 'additional_comments', type: 'long_answer', label: 'Anything else you would like to share?', placeholder: 'Optional comments', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#0d9488',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Survey',
      successTitle: 'Thank you!',
      successMessage: 'Your response has been recorded. We use this feedback to keep improving.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'nps_survey' },
      },
    },
  },
  categories: ['survey', 'feedback'],
  industries: ['general', 'saas'],
  useCases: ['customer_feedback', 'assessment'],
  audiences: ['b2c', 'b2b'],
  tags: ['nps', 'net-promoter-score', 'loyalty', 'survey', 'saas'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'NPS Survey Template — Net Promoter Score Form',
    seoDescription:
      'Free Net Promoter Score (NPS) survey template with the classic 0\u201310 recommend question and follow-up reason. Mobile-friendly and customizable.',
    seoKeywords: ['nps survey', 'net promoter score', 'customer loyalty survey', 'nps form'],
    faq: [
      {
        question: 'What is a Net Promoter Score (NPS)?',
        answer:
          'NPS is a customer loyalty metric that asks respondents how likely they are to recommend your company on a 0\u201310 scale. Scores 9\u201310 are Promoters, 7\u20138 are Passives, and 0\u20136 are Detractors. NPS = %Promoters \u2212 %Detractors.',
      },
      {
        question: 'How often should I send an NPS survey?',
        answer:
          'Transaction-based NPS is sent shortly after a key interaction; relationship NPS is typically sent quarterly or twice a year to avoid survey fatigue.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 3. Event Registration Form ────────────────────────────────────────────
const EVENT_REGISTRATION_FORM: FormTemplate = {
  id: 'event-registration-form',
  name: 'Event Registration Form',
  shortDescription: 'Register attendees for conferences, workshops, webinars, and paid events.',
  description:
    'A complete event registration form that collects attendee details, ticket type, dietary and accessibility needs, and payment intent. Suitable for in-person, hybrid, or virtual events of any size.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Event Registration' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'organization', type: 'short_answer', label: 'Organization / Company', placeholder: 'Acme Inc.', width: 'half' },
      { id: 'job_title', type: 'short_answer', label: 'Job Title', placeholder: 'Product Manager', width: 'half' },
      {
        id: 'ticket_type',
        type: 'radio',
        label: 'Ticket Type',
        required: true,
        width: 'full',
        options: [
          { label: 'General Admission', value: 'general', price: 49 },
          { label: 'VIP Pass', value: 'vip', price: 149 },
          { label: 'Student / Nonprofit', value: 'student', price: 19 },
          { label: 'Virtual Live Stream', value: 'virtual', price: 0 },
        ],
      },
      { id: 'num_attendees', type: 'numerical', label: 'Number of Attendees (if registering a group)', width: 'half', validation: { min: 1, max: 20 } },
      {
        id: 'dietary_restrictions',
        type: 'checkbox',
        label: 'Dietary Restrictions (select all that apply)',
        width: 'full',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Vegetarian', value: 'vegetarian' },
          { label: 'Vegan', value: 'vegan' },
          { label: 'Gluten-free', value: 'gluten_free' },
          { label: 'Halal', value: 'halal' },
          { label: 'Kosher', value: 'kosher' },
          { label: 'Nut allergy', value: 'nut_allergy' },
          { label: 'Other (specify in notes)', value: 'other' },
        ],
      },
      { id: 'accessibility_needs', type: 'long_answer', label: 'Accessibility or Special Accommodations', placeholder: 'Tell us how we can make the event accessible for you.', width: 'full' },
      {
        id: 'how_heard',
        type: 'dropdown',
        label: 'How did you hear about this event?',
        width: 'full',
        options: [
          { label: 'Email newsletter', value: 'email' },
          { label: 'Social media', value: 'social' },
          { label: 'Friend or colleague', value: 'referral' },
          { label: 'Search engine', value: 'search' },
          { label: 'Press or media', value: 'press' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'agree_terms', type: 'checkbox', label: 'I agree to the event terms, cancellation policy, and photo/video release.', required: true, width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#e11d48',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Complete Registration',
      successTitle: 'You are registered!',
      successMessage: 'A confirmation email is on its way. We cannot wait to see you at the event.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'You are registered for the event',
          messageBody: 'Thanks for registering! We will email your ticket and event details shortly.',
        },
        createCrmLead: { enabled: true, source: 'event_registration' },
      },
    },
  },
  categories: ['event', 'registration'],
  industries: ['general', 'events'],
  useCases: ['event_registration', 'lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['event', 'registration', 'conference', 'tickets', 'rsvp'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Event Registration Form Template — Free & Mobile-Friendly',
    seoDescription:
      'Collect event registrations online with this free template. Captures attendee info, ticket type, dietary and accessibility needs. Works for any event.',
    seoKeywords: ['event registration form', 'conference registration', 'ticket form', 'event signup'],
    faq: [
      {
        question: 'Can I sell tickets with this form?',
        answer:
          'Yes. The Ticket Type field carries optional price values. Connect a payment gateway after publishing to collect payment at checkout.',
      },
      {
        question: 'Does this work for virtual events?',
        answer:
          'Yes. The Virtual Live Stream ticket option is included by default. You can also collect attendee time zones and email confirmations automatically.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 4. Event RSVP Form ────────────────────────────────────────────────────
const EVENT_RSVP_FORM: FormTemplate = {
  id: 'event-rsvp-form',
  name: 'Event RSVP Form',
  shortDescription: 'Simple RSVP form for weddings, parties, dinners, and private gatherings.',
  description:
    'A friendly RSVP form that captures attendance status, guest count, dietary needs, and a personal message. Perfect for weddings, holiday parties, fundraisers, and intimate gatherings.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'RSVP' }],
    fields: [
      { id: 'full_name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 'full' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number (optional)', placeholder: '+1 (555) 000-0000', width: 'half' },
      {
        id: 'attending',
        type: 'radio',
        label: 'Will you be attending?',
        required: true,
        width: 'full',
        options: [
          { label: 'Yes, joyfully accepts!', value: 'yes' },
          { label: 'No, regrets \u2014 cannot attend', value: 'no' },
          { label: 'Maybe \u2014 not sure yet', value: 'maybe' },
        ],
      },
      { id: 'guest_count', type: 'numerical', label: 'Number of Guests (including yourself)', helpText: 'Enter 1 if attending alone.', required: true, width: 'half', validation: { min: 1, max: 10 } },
      { id: 'guest_names', type: 'long_answer', label: 'Names of Additional Guests', placeholder: 'List the names of everyone in your party.', width: 'full' },
      {
        id: 'meal_preference',
        type: 'radio',
        label: 'Meal Preference',
        width: 'full',
        options: [
          { label: 'Chicken', value: 'chicken' },
          { label: 'Beef', value: 'beef' },
          { label: 'Fish', value: 'fish' },
          { label: 'Vegetarian', value: 'vegetarian' },
          { label: 'Vegan', value: 'vegan' },
        ],
      },
      { id: 'dietary_notes', type: 'long_answer', label: 'Allergies or Dietary Restrictions', placeholder: 'Tell us about any allergies or special needs.', width: 'full' },
      { id: 'song_requests', type: 'long_answer', label: 'Song Requests for the Dance Floor', placeholder: 'What songs will get you on your feet?', width: 'full' },
      { id: 'message', type: 'long_answer', label: 'A Message for the Host (optional)', placeholder: 'Send your well wishes or notes to the host.', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#be185d',
      backgroundColor: '#fff7fb',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Send RSVP',
      successTitle: 'RSVP received!',
      successMessage: 'Thank you for responding. We look forward to celebrating with you!',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Your RSVP has been received',
          messageBody: 'Thank you for your RSVP! We will reach out closer to the event with more details.',
        },
      },
    },
  },
  categories: ['rsvp', 'event'],
  industries: ['general', 'events', 'wedding'],
  useCases: ['event_registration'],
  audiences: ['b2c'],
  tags: ['rsvp', 'wedding', 'party', 'invitation', 'guest-list'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'RSVP Form Template — Free for Weddings & Parties',
    seoDescription:
      'A free RSVP form template for weddings, parties, and private gatherings. Captures attendance, meal choice, dietary needs, and guest names.',
    seoKeywords: ['rsvp form', 'wedding rsvp', 'party rsvp', 'event rsvp template'],
    faq: [
      {
        question: 'How do I share an RSVP form with guests?',
        answer:
          'Publish the form and share the link on your invitation, save-the-date email, or wedding website. Guests can fill it out from any device.',
      },
      {
        question: 'Can guests add plus-ones?',
        answer:
          'Yes. The form includes a guest count field and a long-answer field to collect the names of additional guests in their party.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 5. Job Application Form ────────────────────────────────────────────────
const JOB_APPLICATION_FORM: FormTemplate = {
  id: 'job-application-form',
  name: 'Job Application Form',
  shortDescription: 'Collect structured job applications with resume upload and EEO disclosures.',
  description:
    'A complete employment application form that captures candidate details, work eligibility, position preferences, resume, and cover letter. Includes EEO self-identification and consent fields for compliant hiring.',
  schema: {
    version: 1,
    steps: [
      { id: 'step-1', title: 'Applicant Information' },
      { id: 'step-2', title: 'Position & Experience' },
      { id: 'step-3', title: 'Documents & Consent' },
    ],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half', stepId: 'step-1' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half', stepId: 'step-1' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half', stepId: 'step-1' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half', stepId: 'step-1' },
      { id: 'address', type: 'address', label: 'Current Address', width: 'full', stepId: 'step-1' },
      { id: 'linkedin_url', type: 'short_answer', label: 'LinkedIn Profile URL', placeholder: 'https://linkedin.com/in/janedoe', width: 'half', stepId: 'step-1' },
      { id: 'portfolio_url', type: 'short_answer', label: 'Portfolio / Website URL (optional)', placeholder: 'https://janedoe.com', width: 'half', stepId: 'step-1' },
      { id: 'position', type: 'short_answer', label: 'Position Applied For', placeholder: 'e.g. Senior Product Designer', required: true, width: 'half', stepId: 'step-2' },
      { id: 'years_experience', type: 'numerical', label: 'Years of Relevant Experience', required: true, width: 'half', stepId: 'step-2', validation: { min: 0, max: 50 } },
      {
        id: 'employment_type',
        type: 'checkbox',
        label: 'Employment Types Considered',
        required: true,
        width: 'full',
        stepId: 'step-2',
        options: [
          { label: 'Full-time', value: 'full_time' },
          { label: 'Part-time', value: 'part_time' },
          { label: 'Contract', value: 'contract' },
          { label: 'Temporary', value: 'temporary' },
          { label: 'Internship', value: 'internship' },
        ],
      },
      { id: 'current_employer', type: 'short_answer', label: 'Current Employer', placeholder: 'Acme Inc.', width: 'half', stepId: 'step-2' },
      { id: 'available_start', type: 'date', label: 'Earliest Available Start Date', required: true, width: 'half', stepId: 'step-2' },
      {
        id: 'work_authorization',
        type: 'radio',
        label: 'Work Authorization Status',
        required: true,
        width: 'full',
        stepId: 'step-2',
        options: [
          { label: 'Authorized to work in this country (no sponsorship needed)', value: 'authorized' },
          { label: 'Require visa sponsorship', value: 'sponsorship' },
          { label: 'Unsure / prefer to discuss', value: 'unsure' },
        ],
      },
      { id: 'resume', type: 'file', label: 'Resume / CV', helpText: 'PDF or DOCX, max 5MB.', required: true, width: 'full', stepId: 'step-3', validation: { allowedExtensions: ['pdf', 'doc', 'docx'] } },
      { id: 'cover_letter', type: 'long_answer', label: 'Cover Letter', placeholder: 'Tell us why you are a great fit for this role.', width: 'full', stepId: 'step-3' },
      {
        id: 'how_heard',
        type: 'dropdown',
        label: 'How did you hear about us?',
        width: 'full',
        stepId: 'step-3',
        options: [
          { label: 'Company website', value: 'website' },
          { label: 'Job board (LinkedIn, Indeed, etc.)', value: 'job_board' },
          { label: 'Employee referral', value: 'referral' },
          { label: 'Social media', value: 'social' },
          { label: 'Recruiter', value: 'recruiter' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'consent_background', type: 'checkbox', label: 'I consent to a background check if offered the position.', required: true, width: 'full', stepId: 'step-3' },
      { id: 'consent_eeo', type: 'checkbox', label: 'I voluntarily self-identify for Equal Employment Opportunity reporting (optional).', width: 'full', stepId: 'step-3' },
    ],
    rules: [],
    theme: {
      primaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.5rem',
      layout: 'multi_step',
    },
    settings: {
      submitButtonText: 'Submit Application',
      successTitle: 'Application received',
      successMessage: 'Thank you for applying. Our recruiting team will review your application and reach out within 5 business days.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'We received your application',
          messageBody: 'Thanks for applying. A recruiter will be in touch if your profile matches the role.',
        },
      },
    },
  },
  categories: ['employment', 'application'],
  industries: ['general', 'human_resources'],
  useCases: ['employee_application'],
  audiences: ['b2c', 'internal'],
  tags: ['job-application', 'hiring', 'recruitment', 'hr', 'careers'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Job Application Form Template — Free, EEO-Compliant',
    seoDescription:
      'Free job application form template with resume upload, work authorization, EEO consent, and reference fields. Multi-step and mobile-friendly.',
    seoKeywords: ['job application form', 'employment application', 'careers form', 'hiring form'],
    faq: [
      {
        question: 'Can candidates upload a resume with this form?',
        answer:
          'Yes. The form includes a file upload field configured for PDF and DOCX. You can adjust the allowed file types and size limit in the builder.',
      },
      {
        question: 'Is this form EEO-compliant?',
        answer:
          'The form includes an optional EEO self-identification consent field. Confirm with your HR team that the fields and language meet your jurisdiction\u2019s requirements.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 6. Vendor Application Form ────────────────────────────────────────────
const VENDOR_APPLICATION_FORM: FormTemplate = {
  id: 'vendor-application-form',
  name: 'Vendor Application Form',
  shortDescription: 'Onboard suppliers, contractors, and B2B vendors with structured intake.',
  description:
    'A B2B vendor application that captures company details, business type, certifications, service areas, payment terms, and references. Used by procurement teams, event organizers, and marketplace operators to qualify new suppliers.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Vendor Application' }],
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Legal Company Name', placeholder: 'Acme Suppliers LLC', required: true, width: 'full' },
      { id: 'dba_name', type: 'short_answer', label: 'Doing Business As (DBA)', placeholder: 'Optional', width: 'full' },
      { id: 'contact_name', type: 'short_answer', label: 'Primary Contact Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'contact_title', type: 'short_answer', label: 'Title', placeholder: 'Head of Sales', width: 'half' },
      { id: 'email', type: 'email', label: 'Business Email', placeholder: 'sales@acme.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'website', type: 'short_answer', label: 'Website', placeholder: 'https://acme.com', width: 'full' },
      { id: 'business_address', type: 'address', label: 'Business Address', required: true, width: 'full' },
      {
        id: 'business_type',
        type: 'dropdown',
        label: 'Business Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Sole Proprietorship', value: 'sole_proprietor' },
          { label: 'Partnership', value: 'partnership' },
          { label: 'LLC', value: 'llc' },
          { label: 'Corporation (C-Corp)', value: 'c_corp' },
          { label: 'Corporation (S-Corp)', value: 's_corp' },
          { label: 'Nonprofit', value: 'nonprofit' },
          { label: 'Government', value: 'government' },
        ],
      },
      { id: 'years_in_business', type: 'numerical', label: 'Years in Business', required: true, width: 'half', validation: { min: 0, max: 200 } },
      { id: 'products_services', type: 'long_answer', label: 'Products or Services Offered', placeholder: 'Describe what you sell and your core capabilities.', required: true, width: 'full' },
      {
        id: 'certifications',
        type: 'checkbox',
        label: 'Certifications Held',
        width: 'full',
        options: [
          { label: 'ISO 9001', value: 'iso_9001' },
          { label: 'ISO 27001', value: 'iso_27001' },
          { label: 'SOC 2', value: 'soc_2' },
          { label: 'Minority-owned (MBE)', value: 'mbe' },
          { label: 'Woman-owned (WBE)', value: 'wbe' },
          { label: 'Veteran-owned (VBE)', value: 'vbe' },
          { label: 'B Corp', value: 'b_corp' },
          { label: 'None', value: 'none' },
        ],
      },
      { id: 'service_area', type: 'long_answer', label: 'Geographic Service Area', placeholder: 'Regions, states, or countries you serve.', width: 'full' },
      {
        id: 'payment_terms',
        type: 'radio',
        label: 'Preferred Payment Terms',
        required: true,
        width: 'full',
        options: [
          { label: 'Net 15', value: 'net_15' },
          { label: 'Net 30', value: 'net_30' },
          { label: 'Net 45', value: 'net_45' },
          { label: 'Net 60', value: 'net_60' },
          { label: 'Prepay / Deposit required', value: 'prepay' },
        ],
      },
      { id: 'references', type: 'long_answer', label: 'Client References', placeholder: 'List 2\u20133 current clients we may contact (name, company, email).', required: true, width: 'full' },
      { id: 'w9_upload', type: 'file', label: 'Upload W-9 or Tax ID Document', helpText: 'PDF only.', width: 'full', validation: { allowedExtensions: ['pdf'] } },
      { id: 'agree_terms', type: 'checkbox', label: 'I certify the information above is accurate and agree to the vendor terms of service.', required: true, width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#0284c7',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.5rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Application',
      successTitle: 'Application received',
      successMessage: 'Thank you for your interest in becoming a vendor. Our procurement team will review your application within 10 business days.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Vendor application received',
          messageBody: 'Thanks for your application. Our procurement team will reach out if your profile matches our needs.',
        },
      },
    },
  },
  categories: ['application', 'onboarding'],
  industries: ['general'],
  useCases: ['customer_onboarding', 'internal_request'],
  audiences: ['b2b', 'internal'],
  tags: ['vendor', 'supplier', 'procurement', 'b2b', 'onboarding'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Vendor Application Form Template — Free B2B Onboarding',
    seoDescription:
      'Free vendor application form template for onboarding suppliers and contractors. Captures company info, certifications, payment terms, and references.',
    seoKeywords: ['vendor application form', 'supplier onboarding', 'procurement form', 'b2b intake'],
    faq: [
      {
        question: 'What information should a vendor application collect?',
        answer:
          'At minimum: legal company name, primary contact, business email, address, business type, products/services, certifications, payment terms, and 2\u20133 client references.',
      },
      {
        question: 'Can vendors upload a W-9 or tax document?',
        answer:
          'Yes. The form includes a file upload field for tax documents. Allowed file types and size limits are fully customizable in the builder.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 7. Membership Application Form ────────────────────────────────────────
const MEMBERSHIP_APPLICATION_FORM: FormTemplate = {
  id: 'membership-application-form',
  name: 'Membership Application Form',
  shortDescription: 'Sign up new members for clubs, gyms, associations, and nonprofits.',
  description:
    'A membership application form for clubs, gyms, professional associations, and nonprofits. Captures contact details, membership tier, interests, referral source, and consent to bylaws. Suitable for monthly or annual memberships.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Membership Application' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'date_of_birth', type: 'date', label: 'Date of Birth', helpText: 'Required to verify age-restricted memberships.', width: 'half' },
      { id: 'address', type: 'address', label: 'Mailing Address', required: true, width: 'full' },
      {
        id: 'membership_tier',
        type: 'radio',
        label: 'Membership Tier',
        required: true,
        width: 'full',
        options: [
          { label: 'Individual \u2014 $120 / year', value: 'individual', price: 120 },
          { label: 'Family \u2014 $200 / year', value: 'family', price: 200 },
          { label: 'Student \u2014 $60 / year', value: 'student', price: 60 },
          { label: 'Lifetime \u2014 $1,500 one-time', value: 'lifetime', price: 1500 },
        ],
      },
      {
        id: 'interests',
        type: 'checkbox',
        label: 'Areas of Interest',
        width: 'full',
        options: [
          { label: 'Networking events', value: 'networking' },
          { label: 'Workshops & training', value: 'workshops' },
          { label: 'Volunteering', value: 'volunteering' },
          { label: 'Advocacy', value: 'advocacy' },
          { label: 'Mentorship', value: 'mentorship' },
          { label: 'Social activities', value: 'social' },
        ],
      },
      { id: 'referrer', type: 'short_answer', label: 'Referred By (optional)', placeholder: 'Member name or referral code', width: 'half' },
      {
        id: 'how_heard',
        type: 'dropdown',
        label: 'How did you hear about us?',
        width: 'half',
        options: [
          { label: 'Friend or family', value: 'referral' },
          { label: 'Social media', value: 'social' },
          { label: 'Search engine', value: 'search' },
          { label: 'Event', value: 'event' },
          { label: 'Press or media', value: 'press' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'additional_info', type: 'long_answer', label: 'Anything else we should know?', placeholder: 'Optional', width: 'full' },
      { id: 'agree_bylaws', type: 'checkbox', label: 'I have read and agree to the membership bylaws and code of conduct.', required: true, width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#7c3aed',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Become a Member',
      successTitle: 'Welcome to the community!',
      successMessage: 'Your membership application has been received. Watch your inbox for next steps and a welcome packet.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Welcome \u2014 your membership is being processed',
          messageBody: 'Thanks for joining! Your membership will be activated once payment is confirmed.',
        },
      },
    },
  },
  categories: ['membership', 'application'],
  industries: ['general', 'nonprofit', 'fitness'],
  useCases: ['customer_onboarding'],
  audiences: ['b2c', 'nonprofit'],
  tags: ['membership', 'club', 'association', 'signup', 'nonprofit'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Membership Application Form Template — Free & Mobile',
    seoDescription:
      'Free membership application form template for clubs, gyms, and associations. Captures tier choice, interests, referral source, and bylaws consent.',
    seoKeywords: ['membership application', 'club signup form', 'association form', 'member onboarding'],
    faq: [
      {
        question: 'Can I collect membership fees with this form?',
        answer:
          'Yes. Each membership tier carries an optional price. Connect a payment gateway in the builder to charge applicants at checkout.',
      },
      {
        question: 'Can members choose their interests during signup?',
        answer:
          'Yes. The form includes a checkbox list of interest areas that helps you segment members for targeted communications and events.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 8. Volunteer Signup Form ──────────────────────────────────────────────
const VOLUNTEER_SIGNUP_FORM: FormTemplate = {
  id: 'volunteer-signup-form',
  name: 'Volunteer Signup Form',
  shortDescription: 'Recruit and onboard volunteers for nonprofits, schools, and community events.',
  description:
    'A volunteer signup form for nonprofits, schools, religious organizations, and community events. Captures availability, skills, role preferences, emergency contacts, and consent for background checks. Designed for both one-time events and ongoing programs.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Volunteer Signup' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'date_of_birth', type: 'date', label: 'Date of Birth', helpText: 'Required for age-verified volunteer roles.', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Home Address', width: 'full' },
      {
        id: 'availability',
        type: 'checkbox',
        label: 'Availability',
        required: true,
        width: 'full',
        options: [
          { label: 'Weekday mornings', value: 'weekday_morning' },
          { label: 'Weekday afternoons', value: 'weekday_afternoon' },
          { label: 'Weekday evenings', value: 'weekday_evening' },
          { label: 'Weekend mornings', value: 'weekend_morning' },
          { label: 'Weekend afternoons', value: 'weekend_afternoon' },
          { label: 'Weekend evenings', value: 'weekend_evening' },
          { label: 'One-time events only', value: 'one_time' },
        ],
      },
      {
        id: 'preferred_roles',
        type: 'checkbox',
        label: 'Preferred Volunteer Roles',
        width: 'full',
        options: [
          { label: 'Event setup / teardown', value: 'setup' },
          { label: 'Registration & greeting', value: 'registration' },
          { label: 'Food service', value: 'food_service' },
          { label: 'Tutoring / mentoring', value: 'tutoring' },
          { label: 'Fundraising', value: 'fundraising' },
          { label: 'Social media / marketing', value: 'marketing' },
          { label: 'Driving / delivery', value: 'driving' },
          { label: 'Translation', value: 'translation' },
        ],
      },
      { id: 'skills', type: 'long_answer', label: 'Special Skills or Certifications', placeholder: 'CPR, first aid, languages, technical skills, etc.', width: 'full' },
      { id: 'emergency_contact_name', type: 'short_answer', label: 'Emergency Contact Name', required: true, width: 'half' },
      { id: 'emergency_contact_phone', type: 'phone', label: 'Emergency Contact Phone', required: true, width: 'half' },
      {
        id: 'tshirt_size',
        type: 'dropdown',
        label: 'Volunteer T-Shirt Size (if applicable)',
        width: 'half',
        options: [
          { label: 'Youth', value: 'youth' },
          { label: 'Small', value: 's' },
          { label: 'Medium', value: 'm' },
          { label: 'Large', value: 'l' },
          { label: 'X-Large', value: 'xl' },
          { label: 'XX-Large', value: 'xxl' },
        ],
      },
      { id: 'motivation', type: 'long_answer', label: 'Why are you interested in volunteering with us?', placeholder: 'Tell us your motivation.', width: 'full' },
      { id: 'consent_background', type: 'checkbox', label: 'I consent to a background check if required for my role.', width: 'full' },
      { id: 'consent_photo', type: 'checkbox', label: 'I consent to being photographed for promotional materials.', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#16a34a',
      backgroundColor: '#f8faf9',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Sign Up to Volunteer',
      successTitle: 'Welcome aboard!',
      successMessage: 'Thank you for volunteering! Our coordinator will be in touch within 3 business days.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Volunteer application received',
          messageBody: 'Thanks for offering your time! We will reach out shortly with available opportunities.',
        },
      },
    },
  },
  categories: ['application', 'onboarding'],
  industries: ['general', 'nonprofit', 'church'],
  useCases: ['customer_onboarding'],
  audiences: ['b2c', 'nonprofit'],
  tags: ['volunteer', 'nonprofit', 'signup', 'community', 'onboarding'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Volunteer Signup Form Template — Free for Nonprofits',
    seoDescription:
      'Free volunteer signup form template for nonprofits and community events. Captures availability, skills, role preferences, and emergency contacts.',
    seoKeywords: ['volunteer signup form', 'volunteer application', 'nonprofit form', 'community service'],
    faq: [
      {
        question: 'Can volunteers pick their preferred roles?',
        answer:
          'Yes. The form includes a checkbox list of common volunteer roles. You can edit these in the builder to match your organization\u2019s needs.',
      },
      {
        question: 'Can this form be used for one-time events?',
        answer:
          'Yes. Availability options include \u2018one-time events only\u2019. The form works for both recurring programs and single-day volunteer events.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 9. Newsletter Signup Form ──────────────────────────────────────────────
const NEWSLETTER_SIGNUP_FORM: FormTemplate = {
  id: 'newsletter-signup-form',
  name: 'Newsletter Signup Form',
  shortDescription: 'Grow your email list with a clean, fast, single-screen signup form.',
  description:
    'A minimal, mobile-friendly newsletter signup form that captures email, name, and interest preferences. Built for high conversion with optional double opt-in consent and clear GDPR-compliant consent language.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Join Our Newsletter' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      {
        id: 'interests',
        type: 'checkbox',
        label: 'Topics you care about',
        width: 'full',
        options: [
          { label: 'Product updates', value: 'product_updates' },
          { label: 'How-to guides & tutorials', value: 'guides' },
          { label: 'Industry news', value: 'news' },
          { label: 'Special offers & discounts', value: 'offers' },
          { label: 'Event invitations', value: 'events' },
        ],
      },
      {
        id: 'frequency',
        type: 'radio',
        label: 'Email Frequency',
        width: 'full',
        options: [
          { label: 'Weekly digest', value: 'weekly' },
          { label: 'Monthly digest', value: 'monthly' },
          { label: 'Only major announcements', value: 'major_only' },
        ],
      },
      { id: 'company', type: 'short_answer', label: 'Company (optional)', placeholder: 'Acme Inc.', width: 'full' },
      { id: 'consent', type: 'checkbox', label: 'I agree to receive marketing emails and accept the privacy policy. I can unsubscribe at any time.', required: true, width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#ea580c',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'classic',
    },
    settings: {
      submitButtonText: 'Subscribe',
      successTitle: 'You are subscribed!',
      successMessage: 'Check your inbox to confirm your subscription and receive your first newsletter.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Please confirm your subscription',
          messageBody: 'Welcome! Click the link in this email to confirm your subscription.',
        },
        createCrmLead: { enabled: true, source: 'newsletter_signup' },
      },
    },
  },
  categories: ['marketing', 'lead_generation'],
  industries: ['general'],
  useCases: ['lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['newsletter', 'email-list', 'signup', 'marketing', 'lead-gen'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Newsletter Signup Form Template — Free & Mobile',
    seoDescription:
      'Free newsletter signup form template with topic preferences, frequency choice, and GDPR consent. Mobile-friendly and high-converting.',
    seoKeywords: ['newsletter signup form', 'email signup', 'subscribe form', 'email list form'],
    faq: [
      {
        question: 'Does this form support GDPR consent?',
        answer:
          'Yes. The form includes an explicit consent checkbox that subscribers must check before submitting. You can customize the consent language to match your privacy policy.',
      },
      {
        question: 'Can I send a confirmation (double opt-in) email?',
        answer:
          'Yes. The customer autoresponse action is enabled by default with a confirmation subject line. Connect your email provider in the builder to send the confirmation link.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 10. Contest Entry Form ─────────────────────────────────────────────────
const CONTEST_ENTRY_FORM: FormTemplate = {
  id: 'contest-entry-form',
  name: 'Contest Entry Form',
  shortDescription: 'Run giveaways, photo contests, and competitions with branded entries.',
  description:
    'A contest entry form that captures contestant details, the entry itself (text, photo, or video upload), and explicit agreement to official rules. Includes optional opt-in for marketing follow-up.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Contest Entry' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', width: 'half' },
      { id: 'contest_name', type: 'short_answer', label: 'Contest Name', helpText: 'If submitting for a specific contest.', placeholder: 'e.g. Summer Photo Contest', width: 'full' },
      { id: 'entry_title', type: 'short_answer', label: 'Entry Title', placeholder: 'A short title for your submission', required: true, width: 'full' },
      { id: 'entry_description', type: 'long_answer', label: 'Entry Description', placeholder: 'Tell us the story behind your entry (max 500 words).', required: true, width: 'full' },
      { id: 'entry_upload', type: 'file', label: 'Upload Your Entry', helpText: 'Photo (JPG/PNG) or video (MP4). Max 50MB.', required: true, width: 'full', validation: { allowedExtensions: ['jpg', 'jpeg', 'png', 'mp4', 'mov'] } },
      {
        id: 'age_confirmation',
        type: 'radio',
        label: 'I confirm that I am 18 years of age or older.',
        required: true,
        width: 'full',
        options: [
          { label: 'Yes, I am 18 or older', value: 'yes' },
          { label: 'No, I am under 18 (parental consent required)', value: 'no' },
        ],
      },
      { id: 'agree_rules', type: 'checkbox', label: 'I have read and agree to the official contest rules.', required: true, width: 'full' },
      { id: 'agree_publication', type: 'checkbox', label: 'I grant permission for my entry to be published and used for promotional purposes.', required: true, width: 'full' },
      { id: 'marketing_optin', type: 'checkbox', label: 'Send me news, future contests, and special offers.', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#c026d3',
      backgroundColor: '#fdf4ff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Entry',
      successTitle: 'Entry submitted!',
      successMessage: 'Good luck! Winners will be notified by email within 5 business days of the contest close.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Your contest entry was received',
          messageBody: 'Thanks for entering! We will email winners after the contest closes.',
        },
      },
    },
  },
  categories: ['marketing', 'application'],
  industries: ['general'],
  useCases: ['lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['contest', 'giveaway', 'photo-contest', 'marketing', 'lead-gen'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Contest Entry Form Template — Free & Mobile',
    seoDescription:
      'Free contest entry form template for giveaways, photo contests, and competitions. Captures entry upload, official rules consent, and marketing opt-in.',
    seoKeywords: ['contest entry form', 'giveaway form', 'photo contest', 'sweepstakes form'],
    faq: [
      {
        question: 'Can contestants upload photos or videos?',
        answer:
          'Yes. The form includes a file upload field configured for JPG, PNG, MP4, and MOV. You can adjust allowed types and size limits in the builder.',
      },
      {
        question: 'Does the form include official rules consent?',
        answer:
          'Yes. Contestants must check a required box confirming they have read and agree to the official rules. You can link to your full rules document.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 11. Product Feedback Form ──────────────────────────────────────────────
const PRODUCT_FEEDBACK_FORM: FormTemplate = {
  id: 'product-feedback-form',
  name: 'Product Feedback Form',
  shortDescription: 'Collect in-depth feedback on a specific product or feature.',
  description:
    'A product-focused feedback form for SaaS, ecommerce, and physical product teams. Captures feature usage, satisfaction scores, what works, what to improve, and likelihood to recommend. Ideal for product managers and CX teams.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Product Feedback' }],
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'company', type: 'short_answer', label: 'Company', placeholder: 'Acme Inc.', width: 'half' },
      { id: 'role', type: 'short_answer', label: 'Your Role', placeholder: 'Product Manager', width: 'half' },
      { id: 'product_name', type: 'short_answer', label: 'Product or Feature Name', placeholder: 'e.g. Mobile App v3.2', required: true, width: 'full' },
      {
        id: 'usage_duration',
        type: 'dropdown',
        label: 'How long have you used this product?',
        required: true,
        width: 'full',
        options: [
          { label: 'Less than 1 month', value: 'lt_1_month' },
          { label: '1\u20133 months', value: '1_3_months' },
          { label: '4\u201312 months', value: '4_12_months' },
          { label: '1\u20132 years', value: '1_2_years' },
          { label: 'More than 2 years', value: 'gt_2_years' },
        ],
      },
      {
        id: 'frequency',
        type: 'radio',
        label: 'How often do you use it?',
        width: 'full',
        options: [
          { label: 'Daily', value: 'daily' },
          { label: 'A few times a week', value: 'weekly' },
          { label: 'A few times a month', value: 'monthly' },
          { label: 'Rarely', value: 'rarely' },
        ],
      },
      { id: 'satisfaction_rating', type: 'rating', label: 'Overall Satisfaction', required: true, width: 'full' },
      { id: 'what_works', type: 'long_answer', label: 'What works well?', placeholder: 'Tell us what you love about the product.', width: 'full' },
      { id: 'what_to_improve', type: 'long_answer', label: 'What should we improve?', placeholder: 'Tell us what is frustrating or missing.', required: true, width: 'full' },
      {
        id: 'feature_requests',
        type: 'long_answer',
        label: 'What new feature would you most like to see?',
        placeholder: 'Describe your most-wanted feature.',
        width: 'full',
      },
      {
        id: 'recommend',
        type: 'radio',
        label: 'Would you recommend this product to a colleague?',
        required: true,
        width: 'full',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'Maybe', value: 'maybe' },
          { label: 'No', value: 'no' },
        ],
      },
      { id: 'screenshot_upload', type: 'file', label: 'Attach a screenshot (optional)', helpText: 'PNG or JPG, max 10MB.', width: 'full', validation: { allowedExtensions: ['png', 'jpg', 'jpeg'] } },
    ],
    rules: [],
    theme: {
      primaryColor: '#0891b2',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Send Feedback',
      successTitle: 'Thanks for your feedback!',
      successMessage: 'Our product team reviews every submission. Your input directly shapes our roadmap.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
      },
    },
  },
  categories: ['feedback'],
  industries: ['general', 'saas', 'ecommerce', 'technology'],
  useCases: ['customer_feedback', 'assessment'],
  audiences: ['b2c', 'b2b'],
  tags: ['product-feedback', 'feature-request', 'saas', 'product-management', 'cx'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Product Feedback Form Template — Free for SaaS & Ecommerce',
    seoDescription:
      'Free product feedback form template with usage frequency, satisfaction rating, what works, what to improve, and feature requests. Mobile-friendly.',
    seoKeywords: ['product feedback form', 'feature request form', 'saas feedback', 'product survey'],
    faq: [
      {
        question: 'How is this different from the customer feedback survey?',
        answer:
          'This form is product-specific: it asks about usage duration, frequency, and feature requests, making it ideal for product teams. The customer feedback survey is more general and focuses on overall experience.',
      },
      {
        question: 'Can users attach screenshots of bugs or issues?',
        answer:
          'Yes. The form includes an optional file upload field configured for PNG and JPG. You can also enable video uploads by editing allowed file types.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 12. Customer Satisfaction Survey (CSAT) ───────────────────────────────
const CUSTOMER_SATISFACTION_SURVEY_CSAT: FormTemplate = {
  id: 'customer-satisfaction-survey-csat',
  name: 'Customer Satisfaction Survey (CSAT)',
  shortDescription: 'Measure satisfaction with a specific interaction, purchase, or support ticket.',
  description:
    'A CSAT (Customer Satisfaction) survey designed to run after a specific touchpoint \u2014 a support ticket, purchase, or onboarding session. Captures satisfaction ratings across multiple dimensions plus a verbatim comment.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Customer Satisfaction Survey' }],
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', placeholder: 'Jane Doe', width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'ticket_or_order', type: 'short_answer', label: 'Ticket / Order Number (optional)', placeholder: 'e.g. #12345', width: 'half' },
      {
        id: 'interaction_type',
        type: 'dropdown',
        label: 'What did you contact us about?',
        required: true,
        width: 'half',
        options: [
          { label: 'Customer support', value: 'support' },
          { label: 'Sales inquiry', value: 'sales' },
          { label: 'Product purchase', value: 'purchase' },
          { label: 'Onboarding', value: 'onboarding' },
          { label: 'Billing', value: 'billing' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'overall_satisfaction', type: 'rating', label: 'How satisfied were you with your experience?', required: true, width: 'full' },
      { id: 'response_time_rating', type: 'rating', label: 'How satisfied were you with our response time?', width: 'full' },
      { id: 'agent_rating', type: 'rating', label: 'How satisfied were you with our team member?', width: 'full' },
      { id: 'value_rating', type: 'rating', label: 'How satisfied were you with the value provided?', width: 'full' },
      {
        id: 'resolved',
        type: 'radio',
        label: 'Was your issue resolved?',
        width: 'full',
        options: [
          { label: 'Yes, fully resolved', value: 'yes' },
          { label: 'Partially resolved', value: 'partial' },
          { label: 'Not resolved', value: 'no' },
        ],
      },
      { id: 'comments', type: 'long_answer', label: 'Additional Comments', placeholder: 'Tell us more about your experience.', width: 'full' },
      { id: 'follow_up', type: 'checkbox', label: 'A manager may follow up with me about this survey', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Survey',
      successTitle: 'Thank you!',
      successMessage: 'Your feedback helps us improve every customer interaction.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
      },
    },
  },
  categories: ['survey', 'feedback'],
  industries: ['general'],
  useCases: ['customer_feedback', 'assessment'],
  audiences: ['b2c', 'b2b'],
  tags: ['csat', 'customer-satisfaction', 'survey', 'support', 'cx'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'CSAT Survey Template — Customer Satisfaction Form',
    seoDescription:
      'Free CSAT survey template for support tickets, purchases, and onboarding. Captures satisfaction ratings across multiple dimensions plus comments.',
    seoKeywords: ['csat survey', 'customer satisfaction survey', 'support feedback', 'csat form'],
    faq: [
      {
        question: 'What is CSAT?',
        answer:
          'CSAT (Customer Satisfaction) is a transactional metric measured right after a customer interaction. It typically asks \u2018How satisfied were you with your experience?\u2019 on a 1\u20135 scale.',
      },
      {
        question: 'How is CSAT different from NPS?',
        answer:
          'CSAT measures satisfaction with a specific interaction; NPS measures long-term loyalty and likelihood to recommend. Use both for a complete picture.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 13. General Inquiry Form ──────────────────────────────────────────────
const GENERAL_INQUIRY_FORM: FormTemplate = {
  id: 'general-inquiry-form',
  name: 'General Inquiry Form',
  shortDescription: 'A flexible inquiry form for any business website or landing page.',
  description:
    'A general-purpose inquiry form that captures the basics \u2014 contact details, topic, urgency, message \u2014 plus routing fields like preferred contact method and best time to reach. Suitable for any business or service.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'General Inquiry' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', width: 'half' },
      { id: 'company', type: 'short_answer', label: 'Company (optional)', placeholder: 'Acme Inc.', width: 'half' },
      {
        id: 'inquiry_type',
        type: 'dropdown',
        label: 'Inquiry Type',
        required: true,
        width: 'half',
        options: [
          { label: 'Sales \u2014 I want to buy', value: 'sales' },
          { label: 'Support \u2014 I need help', value: 'support' },
          { label: 'Partnership \u2014 I want to partner', value: 'partnership' },
          { label: 'Press / Media', value: 'press' },
          { label: 'General question', value: 'general' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'urgency',
        type: 'radio',
        label: 'How urgent is this?',
        width: 'full',
        options: [
          { label: 'Low \u2014 within a week is fine', value: 'low' },
          { label: 'Medium \u2014 within 48 hours', value: 'medium' },
          { label: 'High \u2014 within 24 hours', value: 'high' },
          { label: 'Critical \u2014 needs immediate response', value: 'critical' },
        ],
      },
      { id: 'subject', type: 'short_answer', label: 'Subject', placeholder: 'Brief summary of your inquiry', required: true, width: 'full' },
      { id: 'message', type: 'long_answer', label: 'Message', placeholder: 'Tell us how we can help...', required: true, width: 'full' },
      {
        id: 'preferred_contact',
        type: 'radio',
        label: 'Preferred Contact Method',
        width: 'half',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
          { label: 'No preference', value: 'either' },
        ],
      },
      { id: 'best_time', type: 'short_answer', label: 'Best Time to Reach You', placeholder: 'e.g. Weekdays 9am\u20135pm ET', width: 'half' },
    ],
    rules: [],
    theme: {
      primaryColor: '#475569',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Send Inquiry',
      successTitle: 'Thanks for reaching out!',
      successMessage: 'We received your inquiry and will respond within one business day.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'We received your inquiry',
          messageBody: 'Thanks for getting in touch! Our team will respond within one business day.',
        },
        createCrmLead: { enabled: true, source: 'general_inquiry' },
      },
    },
  },
  categories: ['contact', 'request'],
  industries: ['general'],
  useCases: ['internal_request', 'lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['inquiry', 'contact', 'general', 'website', 'lead-gen'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'General Inquiry Form Template — Free & Mobile',
    seoDescription:
      'Free general inquiry form template for any business website. Captures inquiry type, urgency, message, and preferred contact method. Mobile-friendly.',
    seoKeywords: ['inquiry form', 'contact form', 'general inquiry', 'business form'],
    faq: [
      {
        question: 'How does this differ from a contact form?',
        answer:
          'The general inquiry form adds routing fields \u2014 inquiry type, urgency, preferred contact method, and best time to reach \u2014 making it easier to triage and assign inquiries to the right team.',
      },
      {
        question: 'Can I route inquiries to different teams automatically?',
        answer:
          'Yes. The Inquiry Type field can be used in conditional rules to route submissions to different email addresses or webhook endpoints based on the selected value.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 14. Partnership Inquiry Form ──────────────────────────────────────────
const PARTNERSHIP_INQUIRY_FORM: FormTemplate = {
  id: 'partnership-inquiry-form',
  name: 'Partnership Inquiry Form',
  shortDescription: 'Capture structured partnership proposals from other businesses.',
  description:
    'A B2B partnership inquiry form for businesses interested in co-marketing, distribution, technology, or reseller partnerships. Captures company details, partnership type, proposed value, target timeline, and expected reach.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Partnership Inquiry' }],
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company Name', placeholder: 'Acme Inc.', required: true, width: 'full' },
      { id: 'website', type: 'short_answer', label: 'Company Website', placeholder: 'https://acme.com', required: true, width: 'half' },
      { id: 'headquarters', type: 'short_answer', label: 'Headquarters Location', placeholder: 'City, Country', width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Your Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'contact_title', type: 'short_answer', label: 'Your Title', placeholder: 'Head of Partnerships', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@acme.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', width: 'half' },
      {
        id: 'partnership_type',
        type: 'checkbox',
        label: 'Partnership Type(s) of Interest',
        required: true,
        width: 'full',
        options: [
          { label: 'Co-marketing', value: 'co_marketing' },
          { label: 'Technology / Integration', value: 'technology' },
          { label: 'Reseller / Distribution', value: 'reseller' },
          { label: 'Affiliate / Referral', value: 'affiliate' },
          { label: 'Sponsorship', value: 'sponsorship' },
          { label: 'Strategic alliance', value: 'strategic' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'company_description', type: 'long_answer', label: 'Tell us about your company', placeholder: 'Brief overview \u2014 what you do, who you serve, your market position.', required: true, width: 'full' },
      { id: 'value_proposition', type: 'long_answer', label: 'Proposed Value of the Partnership', placeholder: 'What value would this partnership create for both sides?', required: true, width: 'full' },
      { id: 'audience_reach', type: 'long_answer', label: 'Audience / Customer Reach', placeholder: 'Size and demographics of your audience or customer base.', width: 'full' },
      {
        id: 'timeline',
        type: 'radio',
        label: 'Target Launch Timeline',
        required: true,
        width: 'full',
        options: [
          { label: 'Within 30 days', value: '30_days' },
          { label: '1\u20133 months', value: '1_3_months' },
          { label: '3\u20136 months', value: '3_6_months' },
          { label: 'Exploratory \u2014 no set timeline', value: 'exploratory' },
        ],
      },
      { id: 'additional_info', type: 'long_answer', label: 'Anything else we should know?', placeholder: 'Optional', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#1d4ed8',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.5rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Inquiry',
      successTitle: 'Inquiry received',
      successMessage: 'Thank you for your interest in partnering with us. Our partnerships team reviews inquiries weekly and will be in touch if there is a fit.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Partnership inquiry received',
          messageBody: 'Thanks for reaching out. Our partnerships team will be in touch within 5 business days if there is a fit.',
        },
        createCrmLead: { enabled: true, source: 'partnership_inquiry' },
      },
    },
  },
  categories: ['application', 'lead_generation'],
  industries: ['general', 'agency', 'consulting', 'saas'],
  useCases: ['lead_generation', 'customer_onboarding'],
  audiences: ['b2b'],
  tags: ['partnership', 'b2b', 'business-development', 'alliance', 'lead-gen'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Partnership Inquiry Form Template — Free B2B',
    seoDescription:
      'Free partnership inquiry form template for B2B co-marketing, reseller, and technology partnership proposals. Captures value, reach, and timeline.',
    seoKeywords: ['partnership inquiry form', 'b2b partnership', 'business development', 'alliance form'],
    faq: [
      {
        question: 'What partnership types does this form support?',
        answer:
          'Co-marketing, technology / integration, reseller / distribution, affiliate / referral, sponsorship, strategic alliance, and other. You can edit these in the builder.',
      },
      {
        question: 'How quickly should we respond to partnership inquiries?',
        answer:
          'Within 5 business days. The autoresponse message sets this expectation automatically so applicants are not left in the dark.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 15. Sponsorship Application Form ──────────────────────────────────────
const SPONSORSHIP_APPLICATION_FORM: FormTemplate = {
  id: 'sponsorship-application-form',
  name: 'Sponsorship Application Form',
  shortDescription: 'Receive sponsorship proposals for events, causes, and initiatives.',
  description:
    'A sponsorship application form for organizations seeking financial or in-kind sponsorship for events, conferences, nonprofits, sports teams, and community initiatives. Captures sponsorship level, audience exposure, benefits sought, and budget.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Sponsorship Application' }],
    fields: [
      { id: 'organization_name', type: 'short_answer', label: 'Organization Name', placeholder: 'Acme Community Foundation', required: true, width: 'full' },
      { id: 'organization_type', type: 'short_answer', label: 'Type of Organization', placeholder: 'Nonprofit / School / Sports team / Other', required: true, width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Contact Name', placeholder: 'Jane Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@acme.org', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, width: 'half' },
      { id: 'website', type: 'short_answer', label: 'Website', placeholder: 'https://acme.org', width: 'full' },
      { id: 'event_name', type: 'short_answer', label: 'Event or Initiative Name', placeholder: 'Annual Spring Gala', required: true, width: 'full' },
      { id: 'event_date', type: 'date', label: 'Event Date', width: 'half' },
      { id: 'event_location', type: 'short_answer', label: 'Event Location', placeholder: 'City, Country or Virtual', width: 'half' },
      { id: 'description', type: 'long_answer', label: 'Event / Cause Description', placeholder: 'Describe the event, mission, and audience.', required: true, width: 'full' },
      {
        id: 'sponsorship_level',
        type: 'radio',
        label: 'Sponsorship Level Requested',
        required: true,
        width: 'full',
        options: [
          { label: 'Platinum \u2014 $10,000+', value: 'platinum', price: 10000 },
          { label: 'Gold \u2014 $5,000', value: 'gold', price: 5000 },
          { label: 'Silver \u2014 $2,500', value: 'silver', price: 2500 },
          { label: 'Bronze \u2014 $1,000', value: 'bronze', price: 1000 },
          { label: 'In-kind / product donation', value: 'in_kind' },
        ],
      },
      { id: 'audience_size', type: 'numerical', label: 'Expected Audience Size', helpText: 'Estimated attendees / reach.', width: 'half', validation: { min: 0, max: 1000000 } },
      { id: 'audience_demo', type: 'long_answer', label: 'Audience Demographics', placeholder: 'Age, location, profession, interests.', width: 'full' },
      { id: 'benefits_sought', type: 'long_answer', label: 'Benefits Offered to Sponsors', placeholder: 'Logo placement, speaking slot, booth, social media mentions, etc.', required: true, width: 'full' },
      { id: 'deadline', type: 'date', label: 'Sponsorship Decision Deadline', required: true, width: 'half' },
      { id: 'additional_info', type: 'long_answer', label: 'Anything else we should know?', placeholder: 'Optional', width: 'full' },
      { id: 'sponsorship_packet', type: 'file', label: 'Upload Sponsorship Packet (optional)', helpText: 'PDF, max 10MB.', width: 'full', validation: { allowedExtensions: ['pdf'] } },
    ],
    rules: [],
    theme: {
      primaryColor: '#9333ea',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.5rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Application',
      successTitle: 'Application received',
      successMessage: 'Thank you for your sponsorship request. Our team reviews applications monthly and will reach out if we are able to support your initiative.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Sponsorship application received',
          messageBody: 'Thanks for your request. Our sponsorship committee reviews applications monthly and will be in touch.',
        },
      },
    },
  },
  categories: ['application', 'lead_generation', 'donation'],
  industries: ['general', 'events', 'nonprofit', 'church'],
  useCases: ['lead_generation'],
  audiences: ['b2b', 'nonprofit'],
  tags: ['sponsorship', 'events', 'nonprofit', 'fundraising', 'application'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Sponsorship Application Form Template — Free',
    seoDescription:
      'Free sponsorship application form template for events, nonprofits, and initiatives. Captures sponsorship level, audience exposure, benefits, and deadline.',
    seoKeywords: ['sponsorship application', 'sponsorship form', 'event sponsorship', 'nonprofit sponsorship'],
    faq: [
      {
        question: 'Can sponsors choose their sponsorship level?',
        answer:
          'Yes. The form includes Platinum, Gold, Silver, Bronze, and in-kind options with optional price values. You can adjust the levels and prices in the builder.',
      },
      {
        question: 'Can applicants upload a sponsorship packet?',
        answer:
          'Yes. The form includes an optional file upload field for a PDF sponsorship packet. You can adjust allowed file types and size limits in the builder.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 16. Refund Request Form ───────────────────────────────────────────────
const REFUND_REQUEST_FORM: FormTemplate = {
  id: 'refund-request-form',
  name: 'Refund Request Form',
  shortDescription: 'Process customer refund requests with structured details and evidence.',
  description:
    'A refund request form for ecommerce, SaaS, and service businesses. Captures order details, refund reason, requested amount, supporting documents, and customer contact info. Designed to streamline customer support workflows and reduce back-and-forth emails.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Refund Request' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Used for Purchase', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', width: 'half' },
      { id: 'order_number', type: 'short_answer', label: 'Order / Invoice Number', placeholder: 'e.g. #ORD-12345', required: true, width: 'half' },
      { id: 'purchase_date', type: 'date', label: 'Purchase Date', required: true, width: 'half' },
      { id: 'product_name', type: 'short_answer', label: 'Product or Service Name', placeholder: 'e.g. Pro Plan Annual Subscription', required: true, width: 'full' },
      { id: 'purchase_amount', type: 'currency', label: 'Original Purchase Amount', placeholder: '0.00', required: true, width: 'half' },
      { id: 'refund_amount', type: 'currency', label: 'Refund Amount Requested', placeholder: '0.00', required: true, width: 'half' },
      {
        id: 'refund_reason',
        type: 'dropdown',
        label: 'Reason for Refund',
        required: true,
        width: 'full',
        options: [
          { label: 'Product defective or not as described', value: 'defective' },
          { label: 'Service not delivered', value: 'not_delivered' },
          { label: 'Duplicate charge', value: 'duplicate' },
          { label: 'Cancelled order', value: 'cancelled' },
          { label: 'Not satisfied with product', value: 'unsatisfied' },
          { label: 'Purchased by mistake', value: 'mistake' },
          { label: 'Subscription cancellation', value: 'subscription_cancel' },
          { label: 'Other', value: 'other' },
        ],
      },
      { id: 'reason_details', type: 'long_answer', label: 'Detailed Explanation', placeholder: 'Tell us what happened and why you are requesting a refund.', required: true, width: 'full' },
      {
        id: 'refund_method',
        type: 'radio',
        label: 'Preferred Refund Method',
        required: true,
        width: 'full',
        options: [
          { label: 'Original payment method', value: 'original' },
          { label: 'Store credit', value: 'store_credit' },
          { label: 'Bank transfer', value: 'bank_transfer' },
        ],
      },
      { id: 'evidence_upload', type: 'file', label: 'Attach Evidence (optional)', helpText: 'Photos, screenshots, or receipts. PNG, JPG, or PDF.', width: 'full', validation: { allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf'] } },
      { id: 'additional_info', type: 'long_answer', label: 'Anything else we should know?', placeholder: 'Optional', width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#dc2626',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.5rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Refund Request',
      successTitle: 'Refund request received',
      successMessage: 'Your refund request has been submitted. Our team will review it and respond within 3 business days.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Refund request received',
          messageBody: 'We received your refund request and will respond within 3 business days with next steps.',
        },
      },
    },
  },
  categories: ['request', 'customer_service'],
  industries: ['general', 'ecommerce', 'retail', 'saas'],
  useCases: ['service_request'],
  audiences: ['b2c', 'b2b'],
  tags: ['refund', 'returns', 'customer-service', 'ecommerce', 'support'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Refund Request Form Template — Free for Ecommerce',
    seoDescription:
      'Free refund request form template for ecommerce and SaaS. Captures order details, refund reason, amount, method, and supporting evidence.',
    seoKeywords: ['refund request form', 'return form', 'ecommerce refund', 'money back form'],
    faq: [
      {
        question: 'What information should a refund request form collect?',
        answer:
          'Order number, purchase date, product name, original amount, refund amount requested, reason, detailed explanation, preferred refund method, and any supporting evidence (photos, receipts).',
      },
      {
        question: 'How long does it take to process a refund?',
        answer:
          'Most refunds are reviewed within 3 business days. The form\u2019s autoresponse sets this expectation automatically so customers are not left wondering.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── 17. Testimonial Request Form ──────────────────────────────────────────
const TESTIMONIAL_REQUEST_FORM: FormTemplate = {
  id: 'testimonial-request-form',
  name: 'Testimonial Request Form',
  shortDescription: 'Collect customer testimonials with permissions for marketing use.',
  description:
    'A testimonial request form that captures a written testimonial, customer rating, optional photo upload, and explicit permission to publish. Ideal for building social proof on landing pages, case studies, and marketing materials.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Share Your Testimonial' }],
    fields: [
      { id: 'first_name', type: 'short_answer', label: 'First Name', placeholder: 'Jane', required: true, width: 'half' },
      { id: 'last_name', type: 'short_answer', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number (optional)', placeholder: '+1 (555) 000-0000', width: 'half' },
      { id: 'company', type: 'short_answer', label: 'Company', placeholder: 'Acme Inc.', width: 'half' },
      { id: 'role', type: 'short_answer', label: 'Your Title / Role', placeholder: 'Head of Marketing', width: 'half' },
      { id: 'product_used', type: 'short_answer', label: 'Product or Service You Used', placeholder: 'e.g. Pro Plan', required: true, width: 'full' },
      { id: 'rating', type: 'rating', label: 'Overall Rating', required: true, width: 'full' },
      { id: 'testimonial', type: 'long_answer', label: 'Your Testimonial', placeholder: 'Tell us about your experience. What did you love? What results did you get?', required: true, width: 'full' },
      { id: 'results', type: 'long_answer', label: 'Specific Results or Outcomes (optional)', placeholder: 'Any metrics, numbers, or specific wins you can share?', width: 'full' },
      { id: 'photo_upload', type: 'photo', label: 'Upload Your Headshot (optional)', helpText: 'JPG or PNG, max 5MB. Used alongside your testimonial.', width: 'full' },
      {
        id: 'display_name_as',
        type: 'radio',
        label: 'How should we display your name?',
        required: true,
        width: 'full',
        options: [
          { label: 'Full name (Jane Doe)', value: 'full_name' },
          { label: 'First name + last initial (Jane D.)', value: 'first_last_initial' },
          { label: 'First name only (Jane)', value: 'first_only' },
          { label: 'Anonymous', value: 'anonymous' },
        ],
      },
      {
        id: 'where_to_publish',
        type: 'checkbox',
        label: 'I give permission for my testimonial to be used on:',
        required: true,
        width: 'full',
        options: [
          { label: 'Company website', value: 'website' },
          { label: 'Marketing emails', value: 'email' },
          { label: 'Social media posts', value: 'social' },
          { label: 'Case studies & PDFs', value: 'case_studies' },
          { label: 'Paid advertising', value: 'ads' },
        ],
      },
      { id: 'consent_photo', type: 'checkbox', label: 'I consent to my photo being used alongside the testimonial.', width: 'full' },
      { id: 'consent_edit', type: 'checkbox', label: 'I understand my testimonial may be lightly edited for length or clarity without changing the meaning.', required: true, width: 'full' },
    ],
    rules: [],
    theme: {
      primaryColor: '#d97706',
      backgroundColor: '#fffbeb',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Submit Testimonial',
      successTitle: 'Thank you for sharing!',
      successMessage: 'Your testimonial means the world to us. We will review it and may feature it on our website and marketing materials.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        sendCustomerAutoresponse: {
          enabled: true,
          subject: 'Thank you for your testimonial!',
          messageBody: 'We appreciate you taking the time to share your experience. We may reach out if we feature your testimonial.',
        },
      },
    },
  },
  categories: ['feedback', 'marketing'],
  industries: ['general'],
  useCases: ['customer_feedback'],
  audiences: ['b2c', 'b2b'],
  tags: ['testimonial', 'review', 'social-proof', 'marketing', 'customer-story'],
  source: 'curated',
  status: 'published',
  isFeatured: false,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Testimonial Request Form Template — Free & Mobile',
    seoDescription:
      'Free testimonial request form template that captures customer stories, ratings, photos, and explicit permission to publish. Mobile-friendly and customizable.',
    seoKeywords: ['testimonial form', 'customer review form', 'social proof', 'testimonial request'],
    faq: [
      {
        question: 'Do I need permission to publish a customer testimonial?',
        answer:
          'Yes. Always collect explicit written permission specifying where the testimonial may be published (website, email, social, ads). This form includes a required consent checkbox for legal compliance.',
      },
      {
        question: 'Can customers upload a headshot?',
        answer:
          'Yes. The form includes an optional photo upload field. The photo is only used if the customer explicitly consents via the photo consent checkbox.',
      },
    ],
  },
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── Register all 17 templates ─────────────────────────────────────────────
registerTemplate(CUSTOMER_FEEDBACK_SURVEY);
registerTemplate(NET_PROMOTER_SCORE_NPS);
registerTemplate(EVENT_REGISTRATION_FORM);
registerTemplate(EVENT_RSVP_FORM);
registerTemplate(JOB_APPLICATION_FORM);
registerTemplate(VENDOR_APPLICATION_FORM);
registerTemplate(MEMBERSHIP_APPLICATION_FORM);
registerTemplate(VOLUNTEER_SIGNUP_FORM);
registerTemplate(NEWSLETTER_SIGNUP_FORM);
registerTemplate(CONTEST_ENTRY_FORM);
registerTemplate(PRODUCT_FEEDBACK_FORM);
registerTemplate(CUSTOMER_SATISFACTION_SURVEY_CSAT);
registerTemplate(GENERAL_INQUIRY_FORM);
registerTemplate(PARTNERSHIP_INQUIRY_FORM);
registerTemplate(SPONSORSHIP_APPLICATION_FORM);
registerTemplate(REFUND_REQUEST_FORM);
registerTemplate(TESTIMONIAL_REQUEST_FORM);
