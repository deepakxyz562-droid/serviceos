/**
 * Template Categories — the primary classification axis.
 *
 * Mirrors Jotform's top-level taxonomy (Contact, Registration, Application,
 * Booking, Order, Survey, etc.) with subcategories for drill-down.
 *
 * A template can belong to multiple categories — e.g. a "Dental Patient
 * Intake Form" is in both 'healthcare' and 'consent'.
 */

export interface CategoryDefinition {
  id: string;
  label: string;
  /** Short blurb shown on the category listing page. */
  description: string;
  /** Lucide icon name (resolved via resolveIcon in the builder). */
  iconName: string;
  subcategories: Array<{ id: string; label: string }>;
}

export const TEMPLATE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'contact',
    label: 'Contact Forms',
    description: 'Capture inquiries, messages, and communication from customers.',
    iconName: 'Mail',
    subcategories: [
      { id: 'general_contact', label: 'General Contact' },
      { id: 'business_inquiry', label: 'Business Inquiry' },
      { id: 'support_request', label: 'Support Request' },
      { id: 'feedback_contact', label: 'Feedback' },
    ],
  },
  {
    id: 'registration',
    label: 'Registration Forms',
    description: 'Sign users up for accounts, events, programs, and memberships.',
    iconName: 'UserPlus',
    subcategories: [
      { id: 'account', label: 'Account Registration' },
      { id: 'event', label: 'Event Registration' },
      { id: 'program', label: 'Program Registration' },
      { id: 'membership', label: 'Membership' },
    ],
  },
  {
    id: 'application',
    label: 'Application Forms',
    description: 'Collect applications for jobs, loans, scholarships, rentals, and more.',
    iconName: 'FileText',
    subcategories: [
      { id: 'job', label: 'Job Application' },
      { id: 'loan', label: 'Loan Application' },
      { id: 'scholarship', label: 'Scholarship Application' },
      { id: 'rental', label: 'Rental Application' },
      { id: 'membership', label: 'Membership Application' },
      { id: 'volunteer', label: 'Volunteer Application' },
    ],
  },
  {
    id: 'booking',
    label: 'Booking Forms',
    description: 'Schedule appointments, reservations, and service visits.',
    iconName: 'Calendar',
    subcategories: [
      { id: 'appointment', label: 'Appointment Booking' },
      { id: 'hotel', label: 'Hotel Reservation' },
      { id: 'restaurant', label: 'Restaurant Booking' },
      { id: 'service', label: 'Service Booking' },
    ],
  },
  {
    id: 'order',
    label: 'Order Forms',
    description: 'Accept product, food, supply, and service orders online.',
    iconName: 'ShoppingCart',
    subcategories: [
      { id: 'product', label: 'Product Order' },
      { id: 'food_beverage', label: 'Food & Beverage Order' },
      { id: 'work_request', label: 'Work Request' },
      { id: 'purchase_order', label: 'Purchase Order' },
      { id: 'catering', label: 'Catering Order' },
    ],
  },
  {
    id: 'payment',
    label: 'Payment Forms',
    description: 'Collect payments, donations, and deposits securely.',
    iconName: 'CreditCard',
    subcategories: [
      { id: 'invoice', label: 'Invoice Payment' },
      { id: 'donation', label: 'Donation' },
      { id: 'deposit', label: 'Deposit' },
      { id: 'subscription', label: 'Subscription' },
    ],
  },
  {
    id: 'survey',
    label: 'Survey Forms',
    description: 'Gather feedback, opinions, and research data.',
    iconName: 'BarChart3',
    subcategories: [
      { id: 'customer_satisfaction', label: 'Customer Satisfaction' },
      { id: 'market_research', label: 'Market Research' },
      { id: 'employee', label: 'Employee Survey' },
      { id: 'event_feedback', label: 'Event Feedback' },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback Forms',
    description: 'Collect reviews, ratings, and customer opinions.',
    iconName: 'MessageSquare',
    subcategories: [
      { id: 'product_feedback', label: 'Product Feedback' },
      { id: 'service_review', label: 'Service Review' },
      { id: 'nps', label: 'Net Promoter Score' },
      { id: 'testimonial', label: 'Testimonial Request' },
    ],
  },
  {
    id: 'lead_generation',
    label: 'Lead Generation Forms',
    description: 'Capture qualified leads for sales follow-up.',
    iconName: 'TrendingUp',
    subcategories: [
      { id: 'sales_lead', label: 'Sales Lead' },
      { id: 'b2b_lead', label: 'B2B Lead' },
      { id: 'inquiry', label: 'Product Inquiry' },
      { id: 'quote_request', label: 'Quote Request' },
    ],
  },
  {
    id: 'quote',
    label: 'Quote Forms',
    description: 'Provide price estimates and project quotes.',
    iconName: 'FileText',
    subcategories: [
      { id: 'service_quote', label: 'Service Quote' },
      { id: 'project_quote', label: 'Project Quote' },
      { id: 'price_estimate', label: 'Price Estimate' },
    ],
  },
  {
    id: 'request',
    label: 'Request Forms',
    description: 'Handle service, support, and information requests.',
    iconName: 'Inbox',
    subcategories: [
      { id: 'service_request', label: 'Service Request' },
      { id: 'support_ticket', label: 'Support Ticket' },
      { id: 'info_request', label: 'Information Request' },
      { id: 'maintenance', label: 'Maintenance Request' },
    ],
  },
  {
    id: 'inspection',
    label: 'Inspection Forms',
    description: 'Document property, equipment, and safety inspections.',
    iconName: 'Search',
    subcategories: [
      { id: 'property', label: 'Property Inspection' },
      { id: 'vehicle', label: 'Vehicle Inspection' },
      { id: 'safety', label: 'Safety Inspection' },
      { id: 'equipment', label: 'Equipment Inspection' },
    ],
  },
  {
    id: 'checklist',
    label: 'Checklist Forms',
    description: 'Standardize tasks, audits, and quality checks.',
    iconName: 'ListChecks',
    subcategories: [
      { id: 'audit', label: 'Audit Checklist' },
      { id: 'quality', label: 'Quality Checklist' },
      { id: 'task', label: 'Task Checklist' },
    ],
  },
  {
    id: 'consent',
    label: 'Consent Forms',
    description: 'Obtain legal, medical, and parental consent.',
    iconName: 'FileCheck',
    subcategories: [
      { id: 'medical_consent', label: 'Medical Consent' },
      { id: 'parental_consent', label: 'Parental Consent' },
      { id: 'photo_consent', label: 'Photo/Media Consent' },
      { id: 'treatment_consent', label: 'Treatment Consent' },
    ],
  },
  {
    id: 'waiver',
    label: 'Waiver Forms',
    description: 'Liability waivers and release agreements.',
    iconName: 'ShieldCheck',
    subcategories: [
      { id: 'liability', label: 'Liability Waiver' },
      { id: 'activity', label: 'Activity Waiver' },
      { id: 'release', label: 'Release of Liability' },
    ],
  },
  {
    id: 'intake',
    label: 'Intake Forms',
    description: 'Onboard new clients, patients, and students.',
    iconName: 'ClipboardList',
    subcategories: [
      { id: 'client_intake', label: 'Client Intake' },
      { id: 'patient_intake', label: 'Patient Intake' },
      { id: 'student_intake', label: 'Student Intake' },
    ],
  },
  {
    id: 'onboarding',
    label: 'Onboarding Forms',
    description: 'Welcome and orient new employees, customers, and members.',
    iconName: 'Users',
    subcategories: [
      { id: 'employee_onboarding', label: 'Employee Onboarding' },
      { id: 'customer_onboarding', label: 'Customer Onboarding' },
      { id: 'member_onboarding', label: 'Member Onboarding' },
    ],
  },
  {
    id: 'event',
    label: 'Event Forms',
    description: 'Manage event registration, RSVPs, and logistics.',
    iconName: 'CalendarHeart',
    subcategories: [
      { id: 'rsvp', label: 'RSVP' },
      { id: 'event_registration', label: 'Event Registration' },
      { id: 'vendor_signup', label: 'Vendor Signup' },
      { id: 'speaker', label: 'Speaker Proposal' },
    ],
  },
  {
    id: 'employment',
    label: 'Employment Forms',
    description: 'Job applications, references, and HR documents.',
    iconName: 'Briefcase',
    subcategories: [
      { id: 'job_application', label: 'Job Application' },
      { id: 'reference', label: 'Reference Check' },
      { id: 'exit_interview', label: 'Exit Interview' },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare Forms',
    description: 'Medical, dental, and patient-facing forms.',
    iconName: 'HeartPulse',
    subcategories: [
      { id: 'patient_intake', label: 'Patient Intake' },
      { id: 'medical_history', label: 'Medical History' },
      { id: 'appointment', label: 'Appointment Request' },
      { id: 'insurance', label: 'Insurance Information' },
    ],
  },
  {
    id: 'real_estate',
    label: 'Real Estate Forms',
    description: 'Property listings, inquiries, and tenant forms.',
    iconName: 'Home',
    subcategories: [
      { id: 'property_inquiry', label: 'Property Inquiry' },
      { id: 'tour_request', label: 'Tour Request' },
      { id: 'tenant_application', label: 'Tenant Application' },
      { id: 'listing', label: 'Listing Form' },
    ],
  },
  {
    id: 'education',
    label: 'Education Forms',
    description: 'School, university, and course forms.',
    iconName: 'GraduationCap',
    subcategories: [
      { id: 'enrollment', label: 'Enrollment' },
      { id: 'course_eval', label: 'Course Evaluation' },
      { id: 'permission_slip', label: 'Permission Slip' },
    ],
  },
  {
    id: 'donation',
    label: 'Donation Forms',
    description: 'Accept charitable contributions and pledges.',
    iconName: 'Gift',
    subcategories: [
      { id: 'one_time', label: 'One-Time Donation' },
      { id: 'recurring', label: 'Recurring Donation' },
      { id: 'pledge', label: 'Pledge' },
    ],
  },
  {
    id: 'assessment',
    label: 'Assessment Forms',
    description: 'Evaluate skills, performance, and qualifications.',
    iconName: 'ClipboardCheck',
    subcategories: [
      { id: 'skill', label: 'Skill Assessment' },
      { id: 'performance', label: 'Performance Review' },
      { id: 'quiz', label: 'Quiz / Test' },
    ],
  },
  {
    id: 'report',
    label: 'Report Forms',
    description: 'Incident, damage, and status reports.',
    iconName: 'FileWarning',
    subcategories: [
      { id: 'incident', label: 'Incident Report' },
      { id: 'damage', label: 'Damage Report' },
      { id: 'status', label: 'Status Report' },
    ],
  },
  {
    id: 'membership',
    label: 'Membership Forms',
    description: 'Sign up and manage organization members.',
    iconName: 'BadgeCheck',
    subcategories: [
      { id: 'signup', label: 'Membership Signup' },
      { id: 'renewal', label: 'Membership Renewal' },
      { id: 'application', label: 'Membership Application' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance Forms',
    description: 'Budgets, expenses, and financial requests.',
    iconName: 'DollarSign',
    subcategories: [
      { id: 'expense', label: 'Expense Report' },
      { id: 'budget', label: 'Budget Request' },
      { id: 'reimbursement', label: 'Reimbursement' },
    ],
  },
  {
    id: 'legal',
    label: 'Legal Forms',
    description: 'Contracts, intake, and legal questionnaires.',
    iconName: 'Scale',
    subcategories: [
      { id: 'client_intake', label: 'Client Intake' },
      { id: 'questionnaire', label: 'Legal Questionnaire' },
      { id: 'consultation', label: 'Consultation Request' },
    ],
  },
  {
    id: 'internal_operations',
    label: 'Internal Operations',
    description: 'IT, HR, and internal business requests.',
    iconName: 'Settings',
    subcategories: [
      { id: 'it_request', label: 'IT Request' },
      { id: 'hr_request', label: 'HR Request' },
      { id: 'facility', label: 'Facility Request' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing Forms',
    description: 'Contests, giveaways, and campaign landing pages.',
    iconName: 'Megaphone',
    subcategories: [
      { id: 'contest', label: 'Contest Entry' },
      { id: 'giveaway', label: 'Giveaway' },
      { id: 'newsletter', label: 'Newsletter Signup' },
    ],
  },
  {
    id: 'customer_service',
    label: 'Customer Service Forms',
    description: 'Complaints, returns, and support tickets.',
    iconName: 'Headphones',
    subcategories: [
      { id: 'complaint', label: 'Complaint' },
      { id: 'return', label: 'Return Request' },
      { id: 'warranty', label: 'Warranty Claim' },
    ],
  },
];

/** Quick lookup: category id → definition. */
export const CATEGORY_MAP = new Map(TEMPLATE_CATEGORIES.map((c) => [c.id, c]));

/** Get a category's label by id (falls back to the id itself). */
export function getCategoryLabel(id: string): string {
  return CATEGORY_MAP.get(id)?.label ?? id;
}

/** Flatten all category + subcategory ids (for search/filter dropdowns). */
export function getAllCategoryIds(): string[] {
  const ids: string[] = [];
  for (const c of TEMPLATE_CATEGORIES) {
    ids.push(c.id);
    for (const s of c.subcategories) ids.push(`${c.id}.${s.id}`);
  }
  return ids;
}
