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
  example?: string[];
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
  supportsCustomNote?: boolean;
}

/**
 * BGOS WABA (WhatsApp Business Account) metadata used for display surfaces.
 * Brand name follows the BGOS product; IDs are the provisioned Cloud API account.
 */
export const META_ACCOUNT_CONFIG = {
  verifiedName: 'BGOS',
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
    defaultExampleValues: ['Priya Sharma', 'BGOS Services', 'tomorrow', '10:00 AM', 'AC Deep Cleaning', 'https://fieseros.com/portal'],
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
    defaultExampleValues: ['Priya Sharma', 'BGOS Services', 'tomorrow', '10:00 AM', 'AC Inspection', 'https://fieseros.com/portal'],
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
    defaultExampleValues: ['Priya Sharma', 'AC Servicing #ORD-1042', 'Amit Singh', 'BGOS Services', 'https://fieseros.com/portal/receipt'],
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
    defaultExampleValues: ['Priya Sharma', 'EST-2026-08', 'BGOS Services', '₹2,499', 'Oct 28', 'https://fieseros.com/pay/EST-2026-08'],
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
    bodyText: 'Hello {{1}}, your service visit for {{2}} is confirmed for {{3}} at {{4}}. Technician: {{5}}. Service completion code: {{6}}. Live tracking link: {{7}} . Thank you for choosing BGOS.',
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
    bodyText: 'Hello {{1}}, your technician {{2}} has started traveling to your address. Estimated arrival: {{3}}. Live tracking link: {{4}} . Thank you for choosing BGOS.',
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
    bodyText: 'Hello {{1}}, you have an update regarding {{2}} for {{3}}. Details: {{4}} . Action: {{5}} . Thank you for choosing BGOS.',
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
    defaultExampleValues: ['Priya Sharma', 'BGOS Services', 'AC Installation & Repair'],
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
    defaultExampleValues: ['Priya Sharma', 'BGOS Services', 'your recent service'],
    serviceTouchpoint: 'completion',
    buttons: [
      {
        type: 'URL',
        text: 'Leave Google Review',
        url: 'https://fieseros.com/r/{{1}}',
        example: ['https://fieseros.com/r/sample-business'],
      },
      { type: 'QUICK_REPLY', text: 'Contact Manager' },
    ],
  },
  {
    name: 'bgos_review_invite_en',
    displayName: 'Google Review Invite (Friendly)',
    category: 'MARKETING',
    language: 'en_US',
    status: 'PENDING',
    bodyText: 'Hi {{1}}, thank you for choosing {{2}}! Could you take 30 seconds to share your experience on Google? Your review helps local customers find us.',
    variableDescriptions: ['Customer Name', 'Business Name'],
    defaultExampleValues: ['Priya Sharma', 'BGOS Services'],
    serviceTouchpoint: 'completion',
    buttons: [
      {
        type: 'URL',
        text: 'Leave Google Review',
        url: 'https://fieseros.com/r/{{1}}',
        example: ['https://fieseros.com/r/sample-business'],
      },
    ],
  },
  {
    name: 'bgos_review_invite_hi',
    displayName: 'Google Review Invite (Hindi)',
    category: 'MARKETING',
    language: 'hi',
    status: 'PENDING',
    bodyText: 'नमस्ते {{1}}, {{2}} को सेवा का अवसर देने के लिए धन्यवाद! कृपया 30 सेकंड निकालकर Google पर अपना अनुभव शेयर करें। आपका रिव्यू हमारे लिए बहुत महत्वपूर्ण है।',
    variableDescriptions: ['Customer Name', 'Business Name'],
    defaultExampleValues: ['Priya Sharma', 'BGOS Services'],
    serviceTouchpoint: 'completion',
    buttons: [
      {
        type: 'URL',
        text: 'Google Review Likhen',
        url: 'https://fieseros.com/r/{{1}}',
        example: ['https://fieseros.com/r/sample-business'],
      },
    ],
  },
  {
    name: 'bgos_review_invite_note',
    displayName: 'Google Review Invite + Note',
    category: 'MARKETING',
    language: 'en_US',
    status: 'PENDING',
    bodyText: 'Hi {{1}}, thank you for choosing {{2}}! {{3}} Tap below whenever you have a moment to leave us a quick Google review.',
    variableDescriptions: ['Customer Name', 'Business Name', 'Personal Closing Note (1-line, optional)'],
    defaultExampleValues: [
      'Priya Sharma',
      'BGOS Services',
      'We truly appreciated serving you today and hope everything went smoothly.',
    ],
    serviceTouchpoint: 'completion',
    supportsCustomNote: true,
    buttons: [
      {
        type: 'URL',
        text: 'Leave Google Review',
        url: 'https://fieseros.com/r/{{1}}',
        example: ['https://fieseros.com/r/sample-business'],
      },
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
    defaultExampleValues: ['Priya Sharma', 'BGOS Services', '20% OFF', 'Home AC Maintenance', 'FIESTA20'],
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

export const REVIEW_INVITE_TEMPLATE_NAMES = [
  'bgos_review_invite_en',
  'bgos_review_invite_hi',
  'bgos_review_invite_note',
  'bgos_review_request',
] as const;

export const DEFAULT_REVIEW_PERSONAL_NOTE =
  'We truly appreciated serving you today and hope everything went smoothly.';

/**
 * Meta Cloud API rejects template parameter text containing newlines (`\n`/`\r`),
 * tabs (`\t`), or 4+ consecutive spaces (error #132018 / #132000), as well as empty strings.
 */
export function sanitizeMetaTemplateParam(
  raw: unknown,
  fallback: string,
  maxLen = 180,
): string {
  const input = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  const cleaned = input
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLen ? `${cleaned.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…` : cleaned;
}

/**
 * Sanitize optional user-supplied closing note for Meta review invite templates.
 * Removes URLs (preventing unapproved link spoofing inside template text), newlines, tabs,
 * and excessive whitespace, and bounds to 120 chars.
 */
export function sanitizeReviewPersonalNote(raw: unknown, maxLen = 120): string {
  const input = typeof raw === 'string' ? raw : '';
  const withoutUrls = input
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '');
  return sanitizeMetaTemplateParam(withoutUrls, DEFAULT_REVIEW_PERSONAL_NOTE, maxLen);
}

export function isReviewInviteTemplateName(name: string): boolean {
  const clean = name.trim().toLowerCase();
  return (
    (REVIEW_INVITE_TEMPLATE_NAMES as readonly string[]).includes(clean) ||
    clean.includes('review')
  );
}

/**
 * Checks if a template button array contains a dynamic URL suffix placeholder (`{{1}}`).
 */
export function hasDynamicUrlButton(
  buttons?: Array<{ type?: string; url?: string }>,
): boolean {
  if (!Array.isArray(buttons)) return false;
  return buttons.some(
    (b) => String(b?.type || '').toUpperCase() === 'URL' && typeof b?.url === 'string' && /\{\{\d+\}\}/.test(b.url),
  );
}

/**
 * Builds deterministic parameter array and optional dynamic URL button suffix
 * for sending an official Meta review invite template.
 */
export function buildReviewInviteTemplateParams(options: {
  templateName: string;
  customerName?: string | null;
  businessName: string;
  serviceName?: string | null;
  customNote?: string | null;
  shortRedirectCode?: string | null;
  reviewLink?: string | null;
  bodyText?: string | null;
  buttons?: Array<{ type?: string; url?: string }>;
}): {
  parameters: string[];
  buttonUrlParam?: string;
} {
  const firstName = sanitizeMetaTemplateParam(
    (options.customerName || '').trim().split(/\s+/)[0] || '',
    'there',
    60,
  );
  const business = sanitizeMetaTemplateParam(options.businessName, 'our team', 80);
  const service = sanitizeMetaTemplateParam(options.serviceName, 'your recent visit', 80);
  const note = sanitizeReviewPersonalNote(options.customNote, 120);
  const shortCode = sanitizeMetaTemplateParam(options.shortRedirectCode, '', 120);

  const tplName = options.templateName.trim();
  const canonical = BGOS_CANONICAL_META_TEMPLATES.find((t) => t.name === tplName);
  const effectiveBody = options.bodyText || canonical?.bodyText || '';
  const effectiveButtons = options.buttons ?? canonical?.buttons;
  const usesDynamicUrlButton = hasDynamicUrlButton(effectiveButtons);

  let parameters: string[];
  if (tplName === 'bgos_review_invite_en' || tplName === 'bgos_review_invite_hi') {
    parameters = [firstName, business];
  } else if (tplName === 'bgos_review_invite_note') {
    parameters = [firstName, business, note];
  } else if (tplName === 'bgos_review_request') {
    parameters = [firstName, business, service];
  } else {
    // Custom BYO approved review template: detect {{1}}..{{N}} slots
    const matches = effectiveBody.match(/\{\{(\d+)\}\}/g) || [];
    const maxVar = matches.reduce((max, tok) => {
      const n = Number.parseInt(tok.replace(/[{}]/g, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    const reviewUrlFallback = sanitizeMetaTemplateParam(
      options.reviewLink || (shortCode ? `https://fieseros.com/r/${shortCode}` : ''),
      'https://fieseros.com',
      240,
    );

    if (maxVar <= 0) {
      parameters = [];
    } else if (maxVar === 1) {
      parameters = [firstName];
    } else if (maxVar === 2) {
      parameters = [firstName, business];
    } else {
      const defaults = [firstName, business, options.customNote?.trim() ? note : reviewUrlFallback, service];
      parameters = Array.from({ length: maxVar }, (_, idx) => defaults[idx] || service);
    }
  }

  return {
    parameters,
    buttonUrlParam: usesDynamicUrlButton && shortCode ? shortCode : undefined,
  };
}

/**
 * Builds Meta Cloud API template component payload for /api/whatsapp/send.
 */
export function buildMetaTemplateSendPayload(
  templateName: string,
  parameters: string[],
  language = 'en_US',
  buttonUrlParam?: string,
) {
  const sanitizedParams = parameters.map((param) =>
    sanitizeMetaTemplateParam(param, '-', 500),
  );
  const components: Array<Record<string, unknown>> = [];

  if (sanitizedParams.length > 0) {
    components.push({
      type: 'body',
      parameters: sanitizedParams.map((param) => ({
        type: 'text',
        text: param,
      })),
    });
  }

  const cleanButtonSuffix = typeof buttonUrlParam === 'string'
    ? sanitizeMetaTemplateParam(buttonUrlParam, '', 512)
    : '';
  if (cleanButtonSuffix) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: cleanButtonSuffix }],
    });
  }

  return {
    type: 'template' as const,
    templateName,
    templateLanguage: language,
    templateComponents: components,
  };
}

/**
 * Strip ALL emojis and emoji-like characters from a string.
 */
function stripTemplateEmojis(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Ensure body text does not start or end with a variable {{N}}.
 */
function ensureBodyNotStartsOrEndsWithVariable(bodyText: string): string {
  let text = bodyText;
  if (/^\{\{\d+\}\}/.test(text)) {
    text = 'Hello, ' + text;
  }
  if (/\{\{\d+\}\}$/.test(text)) {
    text = text + ' thank you.';
  }
  return text;
}

/**
 * Strip variable patterns {{N}} from footer text (Meta rejects variables in footers).
 */
export function stripVariablesFromMetaFooter(footerText: string): string {
  return footerText.replace(/\{\{\d+\}\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Build Meta Cloud API template creation/submission payload for Graph `/message_templates`.
 */
export function buildMetaTemplatePayload(
  template: {
    name: string;
    content: string;
    headerText: string | null;
    footerText: string | null;
    buttonsJson: string;
    templateType: string;
    language: string;
  },
  metaCategory: string,
): Record<string, unknown> {
  const cleanName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 512);

  const payload: Record<string, unknown> = {
    name: cleanName,
    category: metaCategory,
    language: template.language === 'en' ? 'en_US' : template.language,
  };

  const components: Record<string, unknown>[] = [];

  if (template.headerText) {
    const cleanHeader = stripTemplateEmojis(template.headerText)
      .replace(/[*_~`]/g, '')
      .replace(/\n/g, ' ')
      .trim();
    if (cleanHeader) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: cleanHeader.slice(0, 60),
      });
    }
  }

  if (metaCategory === 'AUTHENTICATION') {
    components.push({
      type: 'BODY',
      add_safety_recommendation: true,
    });
  } else {
    let bodyText = stripTemplateEmojis(template.content);
    bodyText = ensureBodyNotStartsOrEndsWithVariable(bodyText);
    const bodyComp: Record<string, unknown> = {
      type: 'BODY',
      text: bodyText,
    };
    const varMatches = bodyText.match(/\{\{\d+\}\}/g);
    if (varMatches && varMatches.length > 0) {
      const uniqueIndices = Array.from(
        new Set(
          varMatches
            .map((m) => Number.parseInt(m.replace(/[{}]/g, ''), 10))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      ).sort((a, b) => a - b);
      const maxIndex = uniqueIndices[uniqueIndices.length - 1] || uniqueIndices.length;
      const sampleVals = Array.from({ length: maxIndex }, (_, idx) => `Sample ${idx + 1}`);
      bodyComp.example = {
        body_text: [sampleVals],
      };
    }
    components.push(bodyComp);
  }

  if (template.footerText) {
    const cleanFooter = stripTemplateEmojis(stripVariablesFromMetaFooter(template.footerText));
    if (cleanFooter) {
      components.push({
        type: 'FOOTER',
        text: cleanFooter.slice(0, 60),
      });
    }
  }

  try {
    const buttons = JSON.parse(template.buttonsJson) as Array<{
      type: string;
      text: string;
      url?: string;
      example?: string[];
      phoneNumber?: string;
    }>;
    if (buttons.length > 0) {
      const metaButtons = buttons.slice(0, 3).map((btn) => {
        let cleanBtnText = stripTemplateEmojis(btn.text)
          .replace(/[*_~`]/g, '')
          .trim()
          .slice(0, 25);

        if (!cleanBtnText) cleanBtnText = 'Option';

        const btnPayload: Record<string, unknown> = {
          type: btn.type === 'quick_reply' ? 'QUICK_REPLY' : btn.type.toUpperCase(),
          text: cleanBtnText,
        };

        if (btn.type.toUpperCase() === 'URL' && btn.url) {
          btnPayload.url = btn.url;
          if (/\{\{\d+\}\}/.test(btn.url)) {
            const exampleUrls = Array.isArray(btn.example) && btn.example.length > 0
              ? btn.example
              : [btn.url.replace(/\{\{\d+\}\}/g, 'sample-business')];
            btnPayload.example = exampleUrls;
          }
        }
        if (btn.type.toUpperCase() === 'CALL' && btn.phoneNumber) {
          btnPayload.phone_number = btn.phoneNumber;
        }
        if (btn.type.toUpperCase() === 'COPY_CODE') {
          btnPayload.type = 'COPY_CODE';
          btnPayload.otp_type = 'ONE_TIME_AUTH_CODE';
        }

        return btnPayload;
      });
      components.push({ type: 'BUTTONS', buttons: metaButtons });
    }
  } catch { /* no buttons */ }

  payload.components = components;
  return payload;
}
