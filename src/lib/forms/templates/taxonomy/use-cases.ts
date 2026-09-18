/**
 * Template Use Cases — the third classification axis.
 *
 * Describes the BUSINESS PURPOSE of the form (why someone is filling it out),
 * independent of industry. A "Lead Generation" form can exist for any industry.
 */

export interface UseCaseDefinition {
  id: string;
  label: string;
  description: string;
  iconName: string;
}

export const TEMPLATE_USE_CASES: UseCaseDefinition[] = [
  { id: 'lead_generation', label: 'Lead Generation', description: 'Capture qualified leads for sales follow-up.', iconName: 'TrendingUp' },
  { id: 'customer_onboarding', label: 'Customer Onboarding', description: 'Welcome and set up new customers.', iconName: 'UserPlus' },
  { id: 'internal_request', label: 'Internal Request', description: 'Employee or internal team requests.', iconName: 'Inbox' },
  { id: 'quote_request', label: 'Quote Request', description: 'Customer requests a price quote.', iconName: 'FileText' },
  { id: 'employee_application', label: 'Employee Application', description: 'Job applications and HR intake.', iconName: 'Briefcase' },
  { id: 'customer_feedback', label: 'Customer Feedback', description: 'Collect reviews and satisfaction data.', iconName: 'MessageSquare' },
  { id: 'event_registration', label: 'Event Registration', description: 'Sign up attendees for events.', iconName: 'CalendarHeart' },
  { id: 'appointment_booking', label: 'Appointment Booking', description: 'Schedule appointments and services.', iconName: 'CalendarClock' },
  { id: 'service_request', label: 'Service Request', description: 'Request a service visit or repair.', iconName: 'Wrench' },
  { id: 'intake', label: 'Intake', description: 'Onboard new clients or patients with detailed info.', iconName: 'ClipboardList' },
  { id: 'assessment', label: 'Assessment', description: 'Evaluate skills, eligibility, or status.', iconName: 'ClipboardCheck' },
  { id: 'compliance', label: 'Compliance', description: 'Collect consent, waivers, and legal acknowledgments.', iconName: 'ShieldCheck' },
];

export const USE_CASE_MAP = new Map(TEMPLATE_USE_CASES.map((u) => [u.id, u]));

export function getUseCaseLabel(id: string): string {
  return USE_CASE_MAP.get(id)?.label ?? id;
}
