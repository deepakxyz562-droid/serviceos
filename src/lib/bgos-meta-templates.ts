/**
 * BGOS Canonical Meta & WhatsApp Template Engine
 * ──────────────────────────────────────────────
 * Manages official Meta Cloud API WhatsApp templates, 24-hour customer
 * care window compliance, and parameter interpolation for BGOS.
 */

export interface BgosMetaTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'CALL';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface BgosMetaTemplate {
  id?: string;
  name: string;
  displayName: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons?: BgosMetaTemplateButton[];
  variableDescriptions: string[];
  defaultExampleValues: string[];
  serviceTouchpoint: 'booking' | 'reminder' | 'completion' | 'invoice' | 'dispatch' | 'support' | 'marketing';
}

/**
 * Live verified Meta credentials metadata for the FieserOS WABA.
 */
export const META_ACCOUNT_CONFIG = {
  verifiedName: 'FieserOS',
  displayPhoneNumber: '+91 61279 67087',
  qualityRating: 'GREEN',
  codeVerificationStatus: 'VERIFIED',
  platformType: 'CLOUD_API',
  wabaId: '1507850957401022',
  phoneNumberId: '1350627684805898',
  verifyToken: 'flowforge_verify_token',
  webhookCallbackUrl: 'https://fieseros.com/api/whatsapp/callback',
} as const;

/**
 * Canonical BGOS Meta Templates matching the live WABA templates approved by Meta.
 */
export const BGOS_CANONICAL_META_TEMPLATES: BgosMetaTemplate[] = [
  {
    id: '1497037195808595',
    name: 'utility_booking_confirmation',
    displayName: 'Appointment Confirmation',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, your booking with {{2}} is confirmed for {{3}} at {{4}}. Service requested: {{5}}. If you need to make changes or contact our support team, please visit {{6}} . Thank you for choosing us.',
    variableDescriptions: ['Customer Name', 'Business Name', 'Date', 'Time', 'Service Name', 'Portal Link'],
    defaultExampleValues: ['Priya Sharma', 'FieserOS Services', 'tomorrow', '10:00 AM', 'AC Deep Cleaning', 'https://fieseros.com/portal'],
    serviceTouchpoint: 'booking',
    buttons: [
      { type: 'URL', text: 'View Booking', url: 'https://fieseros.com/portal' },
      { type: 'QUICK_REPLY', text: 'Need Reschedule' },
    ],
  },
  {
    id: '1149747481343156',
    name: 'utility_booking_reminder',
    displayName: 'Appointment Reminder',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, this is a reminder of your upcoming service appointment with {{2}} scheduled for {{3}} at {{4}}. Service: {{5}}. If you need assistance, please visit {{6}} . Thank you for choosing us.',
    variableDescriptions: ['Customer Name', 'Business Name', 'Date', 'Time', 'Service Name', 'Support Link'],
    defaultExampleValues: ['Priya Sharma', 'FieserOS Services', 'tomorrow', '10:00 AM', 'AC Inspection', 'https://fieseros.com/portal'],
    serviceTouchpoint: 'reminder',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm Arrival' },
      { type: 'QUICK_REPLY', text: 'Reschedule Slot' },
    ],
  },
  {
    id: '2051012682247163',
    name: 'utility_job_completed',
    displayName: 'Service Completed & Review',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, your service order {{2}} has been completed by technician {{3}}. Thank you for choosing {{4}}! You can access your completion summary and receipt at {{5}} . We appreciate your feedback and hope to serve you again soon.',
    variableDescriptions: ['Customer Name', 'Service Name / Order ID', 'Technician Name', 'Business Name', 'Receipt Link'],
    defaultExampleValues: ['Priya Sharma', 'AC Servicing #ORD-1042', 'Amit Singh', 'FieserOS Services', 'https://fieseros.com/portal/receipt'],
    serviceTouchpoint: 'completion',
    buttons: [
      { type: 'URL', text: 'View Receipt', url: 'https://fieseros.com/portal/receipt' },
      { type: 'QUICK_REPLY', text: 'Rate Service 5★' },
    ],
  },
  {
    id: '4616641265324771',
    name: 'invoice_payment_link',
    displayName: 'Service Estimate & Invoice',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, your invoice {{2}} from {{3}} for amount {{4}} is ready. Due date: {{5}}. You can view and pay your invoice securely at {{6}} . Thank you for your business.',
    variableDescriptions: ['Customer Name', 'Invoice / Estimate ID', 'Business Name', 'Amount', 'Due Date', 'Payment Link'],
    defaultExampleValues: ['Priya Sharma', 'EST-2026-08', 'FieserOS Services', '₹2,499', 'Oct 28', 'https://fieseros.com/pay/EST-2026-08'],
    serviceTouchpoint: 'invoice',
    buttons: [
      { type: 'URL', text: 'Pay Online', url: 'https://fieseros.com/pay' },
      { type: 'QUICK_REPLY', text: 'Approve Quote' },
    ],
  },
  {
    id: '2594413460983762',
    name: 'utility_visit_scheduled',
    displayName: 'Technician Dispatched',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, your service visit for {{2}} is confirmed for {{3}} at {{4}}. Technician: {{5}}. Service completion code: {{6}}. Live tracking link: {{7}} . Thank you for choosing FieserOS.',
    variableDescriptions: ['Customer Name', 'Service Name', 'Date', 'Time', 'Technician Name', 'Security PIN', 'Live Tracking Link'],
    defaultExampleValues: ['Priya Sharma', 'AC Repair', 'Today', '10:00 AM', 'Amit Singh', '8421', 'https://fieseros.com/track/live'],
    serviceTouchpoint: 'dispatch',
    buttons: [
      { type: 'URL', text: 'Track Live Arrival', url: 'https://fieseros.com/track/live' },
    ],
  },
  {
    id: '1379567511908257',
    name: 'job_travel_update',
    displayName: 'Technician On The Way',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, your technician {{2}} has started traveling to your address. Estimated arrival: {{3}}. Live tracking link: {{4}} . Thank you for choosing FieserOS.',
    variableDescriptions: ['Customer Name', 'Technician Name', 'ETA', 'Live Link'],
    defaultExampleValues: ['Priya Sharma', 'Amit Singh', '15 mins', 'https://fieseros.com/track/live'],
    serviceTouchpoint: 'dispatch',
    buttons: [
      { type: 'URL', text: 'View Map', url: 'https://fieseros.com/track/live' },
      { type: 'CALL', text: 'Call Technician', phoneNumber: '+919876543210' },
    ],
  },
  {
    id: '2322597838501292',
    name: 'fieseros_job_assignment',
    displayName: 'Service Status Update',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, you have an update regarding {{2}} for {{3}}. Details: {{4}} . Action: {{5}} . Thank you for choosing FieserOS.',
    variableDescriptions: ['Customer Name', 'Service Title', 'Category', 'Update Details', 'Recommended Action'],
    defaultExampleValues: ['Priya Sharma', 'AC Deep Sanitization', 'Annual Maintenance', 'Inspection complete and filter replaced', 'Review completion details'],
    serviceTouchpoint: 'support',
  },
  {
    id: '1880204519501323',
    name: 'hello_world',
    displayName: 'Cloud API Test Ping',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerText: 'Hello World',
    bodyText: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
    footerText: 'WhatsApp Business Platform sample message',
    variableDescriptions: [],
    defaultExampleValues: [],
    serviceTouchpoint: 'support',
  },
  {
    id: '2300395097460492',
    name: 'service_notification',
    displayName: 'Customer Service Status Notice',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    bodyText: 'Hello {{1}}, you have an update regarding your service request {{2}}: {{3}}. Details: {{4}} . Thank you.',
    variableDescriptions: ['Customer Name', 'Job / Request ID', 'Headline / Status', 'Details / Link'],
    defaultExampleValues: ['Priya Sharma', 'SRV-1049', 'Inquiry Received & Reviewing', 'Our team will contact you shortly'],
    serviceTouchpoint: 'support',
  },
  {
    id: '2135833040359025',
    name: 'bgos_lead_received',
    displayName: 'Lead Inquiry Acknowledgement',
    category: 'UTILITY',
    language: 'en_US',
    status: 'PENDING',
    bodyText: 'Hi {{1}}, thank you for contacting {{2}}. We have received your inquiry regarding {{3}} and our team will get in touch shortly.',
    variableDescriptions: ['Customer Name', 'Business Name', 'Inquiry Service'],
    defaultExampleValues: ['Priya Sharma', 'FieserOS Services', 'AC Installation & Repair'],
    serviceTouchpoint: 'booking',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Chat with Specialist' },
      { type: 'URL', text: 'View Service Catalog', url: 'https://fieseros.com' },
    ],
  },
  {
    id: '3008253376177549',
    name: 'bgos_ticket_update',
    displayName: 'Support Ticket Status Update',
    category: 'UTILITY',
    language: 'en_US',
    status: 'PENDING',
    bodyText: 'Update on Ticket #{{1}}: Your support request status is now {{2}}. Update notes: {{3}}. Our team is actively working on your request.',
    variableDescriptions: ['Ticket Number', 'Status', 'Resolution Notes'],
    defaultExampleValues: ['1245', 'In Progress', 'Technician dispatched to inspect compressor cooling'],
    serviceTouchpoint: 'support',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Reply to Ticket' },
      { type: 'URL', text: 'Track Ticket Online', url: 'https://fieseros.com/portal/tickets' },
    ],
  },
  {
    id: '2817293205355325',
    name: 'bgos_review_request',
    displayName: 'Google Review & Feedback Request',
    category: 'MARKETING',
    language: 'en_US',
    status: 'PENDING',
    bodyText: 'Hi {{1}}, thank you for choosing {{2}}! How was your service experience with {{3}}? Tap below to share a quick Google review and help us improve.',
    variableDescriptions: ['Customer Name', 'Business Name', 'Service Name'],
    defaultExampleValues: ['Priya Sharma', 'FieserOS Services', 'AC Deep Cleaning'],
    serviceTouchpoint: 'completion',
    buttons: [
      { type: 'URL', text: 'Leave Google Review ★★★★★', url: 'https://g.page/r/fieseros/review' },
      { type: 'QUICK_REPLY', text: 'Contact Manager' },
    ],
  },
  {
    id: '1861023794889568',
    name: 'bgos_special_offer',
    displayName: 'Seasonal Promotional Broadcast',
    category: 'MARKETING',
    language: 'en_US',
    status: 'PENDING',
    headerText: 'Exclusive Seasonal Offer',
    bodyText: 'Hi {{1}}, celebrate this season with {{2}}! Enjoy an exclusive discount of {{3}} on all {{4}} bookings this week. Use code {{5}} at checkout.',
    footerText: 'Reply STOP to unsubscribe',
    variableDescriptions: ['Customer Name', 'Business Name', 'Discount Value', 'Service Category', 'Promo Code'],
    defaultExampleValues: ['Priya Sharma', 'FieserOS Services', '20% OFF', 'Home AC Maintenance', 'FIESTA20'],
    serviceTouchpoint: 'marketing',
    buttons: [
      { type: 'URL', text: 'Claim Offer Now', url: 'https://fieseros.com/offers' },
      { type: 'QUICK_REPLY', text: 'Book Consultation' },
    ],
  },
];

/**
 * Returns all canonical templates, with optional category filtering.
 */
export function getBgosMetaTemplates(categoryFilter?: string): BgosMetaTemplate[] {
  if (!categoryFilter || categoryFilter === 'ALL' || categoryFilter === 'all') {
    return BGOS_CANONICAL_META_TEMPLATES;
  }
  const upper = categoryFilter.toUpperCase();
  return BGOS_CANONICAL_META_TEMPLATES.filter((t) => t.category === upper);
}

/**
 * Formats template body with provided variable values (replacing {{1}}, {{2}}).
 */
export function formatBgosMetaTemplateBody(template: BgosMetaTemplate, values?: string[]): string {
  let result = template.bodyText;
  const vals = values && values.length > 0 ? values : template.defaultExampleValues;
  vals.forEach((val, idx) => {
    const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g');
    result = result.replace(placeholder, val);
  });
  return result;
}

/**
 * Checks whether a conversation is within Meta's 24-hour Customer Care window.
 * Within 24h of customer's last inbound message, businesses can send freeform replies.
 * Outside 24h, Meta mandates sending an APPROVED template to re-engage.
 */
export function isInsideMeta24HourWindow(lastInboundTimestamp?: string | Date | null): {
  isInside: boolean;
  hoursRemaining: number;
  formattedRemaining: string;
} {
  if (!lastInboundTimestamp) {
    return { isInside: false, hoursRemaining: 0, formattedRemaining: 'Expired (Requires Template)' };
  }

  const lastInbound = typeof lastInboundTimestamp === 'string'
    ? new Date(lastInboundTimestamp).getTime()
    : lastInboundTimestamp.getTime();

  if (isNaN(lastInbound)) {
    return { isInside: false, hoursRemaining: 0, formattedRemaining: 'Expired (Requires Template)' };
  }

  const now = Date.now();
  const elapsedMs = now - lastInbound;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  if (elapsedMs > twentyFourHoursMs) {
    return { isInside: false, hoursRemaining: 0, formattedRemaining: 'Expired (Requires Template)' };
  }

  const remainingMs = twentyFourHoursMs - elapsedMs;
  const hoursRemaining = Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
  const minutesRemaining = Math.max(0, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)));

  return {
    isInside: true,
    hoursRemaining,
    formattedRemaining: `${hoursRemaining}h ${minutesRemaining}m left`,
  };
}

/**
 * Builds Meta Cloud API template component payload for /api/whatsapp/send.
 */
export function buildMetaTemplateSendPayload(
  templateName: string,
  parameters: string[],
  language = 'en_US',
) {
  return {
    type: 'template',
    templateName,
    templateLanguage: language,
    templateComponents: [
      {
        type: 'body',
        parameters: parameters.map((param) => ({
          type: 'text',
          text: param,
        })),
      },
    ],
  };
}
