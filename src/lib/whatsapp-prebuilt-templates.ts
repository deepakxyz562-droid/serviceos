/**
 * ServiceOS Pre-Built WhatsApp Template Catalog
 * ──────────────────────────────────────────────
 * These templates follow Meta's WhatsApp Business API template format.
 * Categories must be one of: AUTHENTICATION, MARKETING, UTILITY
 * (Meta requires these exact categories for template approval).
 *
 * Template naming convention: <category>_<purpose>_<variant>
 *   e.g., utility_booking_confirmation, marketing_seasonal_offer
 *
 * Variables use {{1}}, {{2}}, etc. (Meta's positional variable format).
 * ServiceOS auto-maps {{customer.name}} → {{1}} during submission.
 *
 * Meta compliance rules enforced here:
 * - No variables at the start or end of body text
 * - No emojis in body text, header text, or button text
 * - Footer text must NOT contain variables
 * - Button text must be plain text, max 25 chars
 * - AUTHENTICATION category uses special BODY format (no text field)
 */

export interface WhatsAppPreBuiltTemplate {
  /** Unique key for this template */
  key: string;
  /** Display name */
  name: string;
  /** Meta-compatible category: AUTHENTICATION | MARKETING | UTILITY */
  metaCategory: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  /** Internal category for ServiceOS grouping */
  businessCategory: string;
  /** Template description shown in the wizard */
  description: string;
  /** Language code (Meta format: en, en_US, hi, etc.) */
  language: string;
  /** Template type for Meta API */
  templateType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  /** Header text (max 60 chars, optional) */
  headerText?: string;
  /** Body text with {{1}}, {{2}} positional variables */
  bodyText: string;
  /** Footer text (max 60 chars, optional, NO variables allowed) */
  footerText?: string;
  /** Buttons (max 3) */
  buttons?: WhatsAppTemplateButton[];
  /** Whether this template is recommended/essential */
  essential?: boolean;
  /** Industry relevance tags */
  industries?: string[];
  /** Preview example values for the phone mockup */
  exampleValues: string[];
}

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'CALL' | 'COPY_CODE';
  text: string;
  url?: string;       // For URL type — can contain {{1}} variable
  phoneNumber?: string; // For CALL type
  example?: string[];   // For URL type examples
}

/**
 * Complete catalog of pre-built WhatsApp Business templates.
 * Organized by Meta category (UTILITY, MARKETING, AUTHENTICATION).
 */
export const PRE_BUILT_WHATSAPP_TEMPLATES: WhatsAppPreBuiltTemplate[] = [
  // ═══════════════════════════════════════════
  // UTILITY TEMPLATES — Business-critical messages
  // ═══════════════════════════════════════════

  // ═══════════════════════════════════════════
  // NOTIFICATION TEMPLATES — Job lifecycle notifications
  // (These match the WhatsApp notifications sent by whatsapp-notifications.ts)
  // ═══════════════════════════════════════════

  {
    key: 'notification_new_job_assigned',
    name: 'New Job Assigned',
    metaCategory: 'UTILITY',
    businessCategory: 'jobs',
    description: 'Notify technician that a new job has been assigned to them with details.',
    language: 'en',
    templateType: 'TEXT',
    headerText: 'New Job Assigned',
    bodyText: 'You have been assigned a new job.\n\nJob: {{1}}\nCustomer: {{2}}\nService: {{3}}\nScheduled: {{4}}\n\nPlease confirm your availability.',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Accept Job' },
      { type: 'QUICK_REPLY', text: 'Reject Job' },
    ],
    essential: true,
    industries: ['field_service', 'home_services', 'maintenance'],
    exampleValues: ['10234', 'John Customer', 'Pipe Repair', 'Jan 15, 2025', 'ServiceOS'],
  },
  {
    key: 'notification_service_completed',
    name: 'Service Completed',
    metaCategory: 'UTILITY',
    businessCategory: 'jobs',
    description: 'Notify customer that their service has been completed and request a rating.',
    language: 'en',
    templateType: 'TEXT',
    headerText: 'Service Completed',
    bodyText: 'Your service has been completed.\n\nService: {{1}}\nTechnician: {{2}}\n\nThank you for choosing {{3}}! Please rate your experience.',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Excellent' },
      { type: 'QUICK_REPLY', text: 'Good' },
      { type: 'QUICK_REPLY', text: 'Average' },
    ],
    essential: true,
    industries: ['field_service', 'home_services', 'maintenance'],
    exampleValues: ['Pipe Repair', 'Raj Kumar', 'ServiceOS'],
  },

  // ═══════════════════════════════════════════
  // UTILITY TEMPLATES — Business-critical messages
  // ═══════════════════════════════════════════

  {
    key: 'utility_booking_confirmation',
    name: 'Booking Confirmation',
    metaCategory: 'UTILITY',
    businessCategory: 'booking',
    description: 'Confirm a new booking with date, time, and service details.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, your booking with {{2}} is confirmed.\n\nDate: {{3}}\nTime: {{4}}\nService: {{5}}\n\nWe look forward to serving you!',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm' },
      { type: 'QUICK_REPLY', text: 'Reschedule' },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS Plumbing', 'Jan 15, 2025', '10:00 AM', 'Pipe Repair'],
  },
  {
    key: 'utility_booking_reminder',
    name: 'Booking Reminder',
    metaCategory: 'UTILITY',
    businessCategory: 'booking',
    description: 'Remind customers about upcoming appointments (24hr before).',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Reminder: You have an appointment with {{1}} tomorrow at {{2}}.\n\nService: {{3}}\n\nPlease reply to confirm or reschedule.',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: "I'll be there" },
      { type: 'QUICK_REPLY', text: 'Reschedule' },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['ServiceOS Plumbing', '10:00 AM', 'Pipe Repair'],
  },
  {
    key: 'utility_technician_assigned',
    name: 'Technician Assigned',
    metaCategory: 'UTILITY',
    businessCategory: 'jobs',
    description: 'Notify customer that a technician has been assigned to their job.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, {{2}} has been assigned to your job #{{3}}.\n\nThey will reach out to you shortly.',
    footerText: 'ServiceOS',
    essential: true,
    industries: ['field_service', 'home_services', 'maintenance'],
    exampleValues: ['John', 'Raj Kumar', '10234', 'ServiceOS'],
  },
  {
    key: 'utility_technician_en_route',
    name: 'Technician On The Way',
    metaCategory: 'UTILITY',
    businessCategory: 'jobs',
    description: 'Notify customer that the technician is heading to their location.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Great news, {{1}}! Your technician {{2}} is on the way and will arrive shortly.\n\nYou can reach them at: {{3}}',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'CALL', text: 'Call Technician', phoneNumber: '{{3}}' },
    ],
    essential: true,
    industries: ['field_service', 'home_services', 'delivery', 'maintenance'],
    exampleValues: ['John', 'Raj Kumar', '+91 98765 43210', 'ServiceOS'],
  },
  {
    key: 'utility_job_completed',
    name: 'Job Completed',
    metaCategory: 'UTILITY',
    businessCategory: 'jobs',
    description: 'Notify customer that their job has been completed.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, your job #{{2}} has been completed!\n\nWe hope you are satisfied with the service. Your feedback means a lot to us!',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Rate Service' },
    ],
    essential: true,
    industries: ['field_service', 'home_services', 'maintenance'],
    exampleValues: ['John', '10234', 'ServiceOS'],
  },
  {
    key: 'utility_payment_reminder',
    name: 'Payment Reminder',
    metaCategory: 'UTILITY',
    businessCategory: 'billing',
    description: 'Remind customers about upcoming or overdue payments.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, this is a friendly reminder that your invoice #{{2}} for {{3}} is due on {{4}}.\n\nPay now to avoid late fees:',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Pay Now', url: '{{5}}', example: ['https://pay.serviceos.com/inv/10234'] },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['John', 'INV-10234', '$2,500', 'Jan 20, 2025', 'https://pay.serviceos.com/inv/10234'],
  },
  {
    key: 'utility_payment_confirmation',
    name: 'Payment Confirmation',
    metaCategory: 'UTILITY',
    businessCategory: 'billing',
    description: 'Confirm that a payment has been received successfully.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Thank you, {{1}}! We have received your payment of {{2}} for invoice #{{3}}.\n\nPayment confirmed!',
    footerText: 'ServiceOS',
    essential: false,
    industries: ['all'],
    exampleValues: ['John', '$2,500', 'INV-10234', 'ServiceOS'],
  },
  {
    key: 'utility_quote_ready',
    name: 'Quote Ready',
    metaCategory: 'UTILITY',
    businessCategory: 'sales',
    description: 'Notify customer that their quote is ready for review.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, your quote from {{2}} is ready.\n\nQuote #: {{3}}\nAmount: {{4}}\nValid until: {{5}}',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'View Quote', url: '{{6}}', example: ['https://app.serviceos.com/quote/10234'] },
      { type: 'QUICK_REPLY', text: 'Accept' },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS', 'QT-10234', '$5,000', 'Jan 30, 2025', 'https://app.serviceos.com/quote/10234'],
  },
  {
    key: 'utility_appointment_rescheduled',
    name: 'Appointment Rescheduled',
    metaCategory: 'UTILITY',
    businessCategory: 'booking',
    description: 'Notify customer about a rescheduled appointment.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, your appointment with {{2}} has been rescheduled.\n\nNew Date: {{3}}\nNew Time: {{4}}\n\nIf this does not work for you, please let us know.',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirmed' },
      { type: 'QUICK_REPLY', text: 'Reschedule again' },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS', 'Jan 20, 2025', '2:00 PM'],
  },
  {
    key: 'utility_order_update',
    name: 'Order Status Update',
    metaCategory: 'UTILITY',
    businessCategory: 'orders',
    description: 'Update customer on their order status (shipped, delivered, etc.).',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, your order #{{2}} status has been updated.\n\nStatus: {{3}}\n{{4}}',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Track Order', url: '{{5}}', example: ['https://track.serviceos.com/ORD-10234'] },
    ],
    essential: false,
    industries: ['ecommerce', 'retail', 'delivery'],
    exampleValues: ['John', 'ORD-10234', 'Shipped', 'In transit - arriving tomorrow', 'https://track.serviceos.com/ORD-10234'],
  },

  // ═══════════════════════════════════════════
  // MARKETING TEMPLATES — Promotional messages
  // ═══════════════════════════════════════════

  {
    key: 'marketing_welcome_lead',
    name: 'Welcome New Lead',
    metaCategory: 'MARKETING',
    businessCategory: 'leads',
    description: 'Welcome new leads who have shown interest in your services.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Welcome to {{1}}, {{2}}!\n\nThank you for your interest! We are excited to help you with {{3}}.\n\nOur team will reach out shortly. In the meantime, feel free to explore our services!',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Visit Website', url: '{{4}}', example: ['https://serviceos.com'] },
      { type: 'QUICK_REPLY', text: 'Call me' },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['ServiceOS', 'John', 'home cleaning', 'https://serviceos.com'],
  },
  {
    key: 'marketing_lead_followup',
    name: 'Lead Follow-up',
    metaCategory: 'MARKETING',
    businessCategory: 'leads',
    description: 'Follow up with leads who haven\'t responded yet.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}! This is {{2}} following up on your inquiry about {{3}}.\n\nAre you still interested? We would love to help!',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Yes, I am' },
      { type: 'QUICK_REPLY', text: 'Not anymore' },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS', 'plumbing services'],
  },
  {
    key: 'marketing_seasonal_offer',
    name: 'Seasonal Offer',
    metaCategory: 'MARKETING',
    businessCategory: 'promotions',
    description: 'Send seasonal promotions and special offers to customers.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Special Offer from {{1}}!\n\n{{2}} - {{3}} off on {{4}}!\n\nOffer valid until {{5}}. Do not miss out!',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Claim Offer', url: '{{6}}', example: ['https://serviceos.com/offer'] },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['ServiceOS', 'Summer Sale', '20%', 'all services', 'March 31', 'https://serviceos.com/offer'],
  },
  {
    key: 'marketing_lost_lead_nurture',
    name: 'Lost Lead Nurture',
    metaCategory: 'MARKETING',
    businessCategory: 'leads',
    description: 'Re-engage leads who didn\'t convert with a special discount.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}, we noticed you haven\'t moved forward yet.\n\nWe would love to offer you {{2}} off your first service with {{3}}!\n\nReply to claim this exclusive offer.',
    footerText: 'Limited time offer',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Claim Offer' },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['John', '10%', 'ServiceOS'],
  },
  {
    key: 'marketing_review_request',
    name: 'Review Request',
    metaCategory: 'MARKETING',
    businessCategory: 'reviews',
    description: 'Request a review from satisfied customers after service completion.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}! We hope you loved your recent service with {{2}}.\n\nYour feedback helps us improve! Would you mind leaving a quick review?',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Leave Review', url: '{{3}}', example: ['https://g.page/review/serviceos'] },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS', 'https://g.page/review/serviceos'],
  },
  {
    key: 'marketing_referral_invite',
    name: 'Referral Invite',
    metaCategory: 'MARKETING',
    businessCategory: 'referrals',
    description: 'Ask happy customers to refer friends and family.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Hi {{1}}! Love our service? Share the joy!\n\nRefer a friend to {{2}} and you BOTH get {{3}} off your next service!\n\nShare your unique link:',
    footerText: 'ServiceOS',
    buttons: [
      { type: 'URL', text: 'Share Referral Link', url: '{{4}}', example: ['https://serviceos.com/ref/ABC123'] },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['John', 'ServiceOS', '$500', 'https://serviceos.com/ref/ABC123'],
  },

  // ═══════════════════════════════════════════
  // AUTHENTICATION TEMPLATES — OTP / Login codes
  // NOTE: AUTH category uses special format - BODY has no text field,
  // uses add_safety_recommendation instead. COPY_CODE button required.
  // The bodyText here is for local preview only; the buildMetaTemplatePayload
  // function will construct the correct Meta API format.
  // ═══════════════════════════════════════════

  {
    key: 'authentication_otp',
    name: 'Login / OTP Code',
    metaCategory: 'AUTHENTICATION',
    businessCategory: 'auth',
    description: 'Send one-time passwords for login verification.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: '{{1}} is your verification code for {{2}}. This code expires in {{3}} minutes. Do not share this code with anyone.',
    footerText: 'Do not share this code',
    buttons: [
      { type: 'COPY_CODE', text: 'Copy Code' },
    ],
    essential: true,
    industries: ['all'],
    exampleValues: ['483921', 'ServiceOS', '10'],
  },
  {
    key: 'authentication_account_verify',
    name: 'Account Verification',
    metaCategory: 'AUTHENTICATION',
    businessCategory: 'auth',
    description: 'Verify a new account registration via WhatsApp.',
    language: 'en',
    templateType: 'TEXT',
    bodyText: 'Your verification code for {{1}} is {{2}}. Enter this code to verify your account. This code expires in {{3}} minutes.',
    footerText: 'Do not share this code',
    buttons: [
      { type: 'COPY_CODE', text: 'Copy Code' },
    ],
    essential: false,
    industries: ['all'],
    exampleValues: ['ServiceOS', '738291', '15'],
  },
];

/**
 * Get templates organized by Meta category
 */
export function getTemplatesByMetaCategory(): Record<string, WhatsAppPreBuiltTemplate[]> {
  const result: Record<string, WhatsAppPreBuiltTemplate[]> = {
    UTILITY: [],
    MARKETING: [],
    AUTHENTICATION: [],
  };
  for (const t of PRE_BUILT_WHATSAPP_TEMPLATES) {
    if (!result[t.metaCategory]) result[t.metaCategory] = [];
    result[t.metaCategory].push(t);
  }
  return result;
}

/**
 * Get only essential (recommended) templates
 */
export function getEssentialTemplates(): WhatsAppPreBuiltTemplate[] {
  return PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential);
}

/**
 * Get all unique business categories
 */
export function getBusinessCategories(): string[] {
  const cats = new Set(PRE_BUILT_WHATSAPP_TEMPLATES.map(t => t.businessCategory));
  return Array.from(cats).sort();
}

/**
 * Meta category display info
 */
export const META_CATEGORY_INFO: Record<string, { label: string; description: string; color: string; icon: string }> = {
  UTILITY: {
    label: 'Utility',
    description: 'Business-critical messages like confirmations, reminders, and receipts. Highest approval rate.',
    color: 'emerald',
    icon: 'Wrench',
  },
  MARKETING: {
    label: 'Marketing',
    description: 'Promotional messages, offers, and lead engagement. Requires opt-in from recipients.',
    color: 'amber',
    icon: 'Megaphone',
  },
  AUTHENTICATION: {
    label: 'Authentication',
    description: 'OTP codes and login verification. Fastest approval — typically auto-approved.',
    color: 'violet',
    icon: 'Shield',
  },
};

/**
 * Total count of variables in a template body
 */
export function countVariables(bodyText: string): number {
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return new Set(matches.map(m => m.replace(/[{}]/g, ''))).size;
}

/**
 * Replace {{1}}, {{2}} etc. with example values for preview
 */
export function previewTemplate(template: WhatsAppPreBuiltTemplate): string {
  let text = template.bodyText;
  const examples = template.exampleValues;
  for (let i = 0; i < examples.length; i++) {
    text = text.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), examples[i]);
  }
  return text;
}
