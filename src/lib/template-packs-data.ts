/**
 * Template Pack Definitions
 * -------------------------
 * Defines the 8 built-in Business Packs shipped with Template Studio.
 * Each pack contains email + WhatsApp templates for a specific business workflow.
 *
 * Structure: array of pack definitions, each with an array of template specs.
 * A template spec has: channel ('email'|'whatsapp'), name, category, and channel-specific fields.
 *
 * This is the single source of truth used by:
 *   - prisma/seed-template-packs.ts (seeds TemplatePack rows)
 *   - /api/template-packs/install (creates actual EmailTemplate/CampaignTemplate rows)
 */

export interface PackTemplateSpec {
  channel: 'email' | 'whatsapp'
  name: string
  category: string // transactional, marketing, reminder, follow_up, etc.
  // Email fields
  subject?: string
  htmlBody?: string
  // WhatsApp fields
  content?: string // body text
  templateType?: 'text' | 'image' | 'document' | 'video'
  headerText?: string
  footerText?: string
  buttons?: { type: 'quick_reply' | 'call' | 'website' | 'copy_coupon'; text: string; value?: string }[]
}

export interface TemplatePackDef {
  slug: string
  name: string
  description: string
  category: 'business'
  industry?: string
  icon: string // Lucide icon name
  color: string
  templates: PackTemplateSpec[]
}

export const BUSINESS_PACKS: TemplatePackDef[] = [
  {
    slug: 'lead-pack',
    name: 'Lead Pack',
    description: 'Welcome new leads, follow up, send quotes, and close or nurture lost leads.',
    category: 'business',
    icon: 'UserPlus',
    color: '#0f766e',
    templates: [
      {
        channel: 'email',
        name: 'Welcome Lead',
        category: 'transactional',
        subject: 'Welcome to {{company.name}}, {{customer.name}}!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Thank you for reaching out to {{company.name}}! We\'ve received your inquiry and our team will get back to you within 24 hours.</p><p>In the meantime, feel free to explore our services on our website: {{company.website}}</p><p>Best regards,<br/>The {{company.name}} Team</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Lead Follow-up',
        category: 'follow_up',
        content:
          'Hi {{customer.name}}! This is {{company.name}} following up on your inquiry. Are you still interested in our services? Reply YES to continue or NO to opt out.',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'quick_reply', text: 'Yes, I am' }, { type: 'quick_reply', text: 'Not anymore' }],
      },
      {
        channel: 'email',
        name: 'Quote Ready',
        category: 'transactional',
        subject: 'Your quote from {{company.name}} is ready',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your quote is ready! Please review the attached document and let us know if you have any questions.</p><p>You can also view and accept your quote online.</p><p>Best regards,<br/>{{company.name}}</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Lost Lead Nurture',
        category: 'follow_up',
        content:
          'Hi {{customer.name}}, we noticed you haven\'t moved forward yet. We\'d love to offer you a 10% discount on your first service. Reply to claim this offer!',
        templateType: 'text',
        footerText: 'Limited time offer',
        buttons: [{ type: 'quick_reply', text: 'Claim 10% off' }],
      },
    ],
  },
  {
    slug: 'booking-pack',
    name: 'Booking Pack',
    description: 'Confirm bookings, send reminders, handle reschedules and cancellations.',
    category: 'business',
    icon: 'CalendarCheck',
    color: '#0891b2',
    templates: [
      {
        channel: 'email',
        name: 'Booking Confirmation',
        category: 'transactional',
        subject: 'Booking confirmed: {{booking.number}}',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your booking is confirmed!</p><p><strong>Booking #:</strong> {{booking.number}}<br/><strong>Date:</strong> {{booking.date}}<br/><strong>Time:</strong> {{booking.time}}</p><p>We look forward to serving you. If you need to reschedule, please contact us.</p><p>Best regards,<br/>{{company.name}}</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Booking Reminder',
        category: 'reminder',
        content:
          'Hi {{customer.name}}! This is a reminder for your appointment with {{company.name}} on {{booking.date}} at {{booking.time}}. See you soon!',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'call', text: 'Call us', value: '{{company.phone}}' }],
      },
      {
        channel: 'whatsapp',
        name: 'Booking Rescheduled',
        category: 'reminder',
        content:
          'Hi {{customer.name}}, your appointment has been rescheduled to {{booking.date}} at {{booking.time}}. If this doesn\'t work for you, please let us know.',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'quick_reply', text: 'Confirm' }, { type: 'quick_reply', text: 'Reschedule again' }],
      },
      {
        channel: 'email',
        name: 'Booking Cancelled',
        category: 'transactional',
        subject: 'Booking {{booking.number}} has been cancelled',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your booking {{booking.number}} scheduled for {{booking.date}} has been cancelled as requested.</p><p>If you\'d like to rebook, please visit {{company.website}} or call us.</p><p>{{company.name}}</p>',
      },
    ],
  },
  {
    slug: 'job-pack',
    name: 'Job Pack',
    description: 'Notify customers when a technician is assigned, en route, and when the job is done.',
    category: 'business',
    icon: 'Wrench',
    color: '#16a34a',
    templates: [
      {
        channel: 'whatsapp',
        name: 'Technician Assigned',
        category: 'reminder',
        content:
          'Hi {{customer.name}}! {{employee.assigned_technician}} has been assigned to your job {{job.number}}. They will reach out shortly.',
        templateType: 'text',
        footerText: '{{company.name}}',
      },
      {
        channel: 'whatsapp',
        name: 'Technician On The Way',
        category: 'reminder',
        content:
          'Hi {{customer.name}}! Your technician {{employee.assigned_technician}} is on the way and will arrive shortly. Phone: {{employee.phone}}',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'call', text: 'Call technician', value: '{{employee.phone}}' }],
      },
      {
        channel: 'email',
        name: 'Job Started',
        category: 'transactional',
        subject: 'Job {{job.number}} has started',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your service job {{job.number}} for {{job.service_name}} has started. Your technician {{job.technician_name}} is on site.</p><p>{{company.name}}</p>',
      },
      {
        channel: 'email',
        name: 'Job Completed',
        category: 'transactional',
        subject: 'Job {{job.number}} completed — thank you!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your job {{job.number}} has been completed. We hope you\'re satisfied with the service!</p><p>Please consider leaving us a review — it helps us a lot.</p><p>Best regards,<br/>{{company.name}}</p>',
      },
    ],
  },
  {
    slug: 'invoice-pack',
    name: 'Invoice Pack',
    description: 'Send invoices, remind about payments, confirm receipt, and chase overdue invoices.',
    category: 'business',
    icon: 'FileText',
    color: '#d97706',
    templates: [
      {
        channel: 'email',
        name: 'Invoice Created',
        category: 'transactional',
        subject: 'Invoice {{invoice.number}} from {{company.name}}',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your invoice {{invoice.number}} for {{invoice.amount}} is ready. Due date: {{invoice.due_date}}.</p><p><a href="{{invoice.payment_link}}">Pay Now</a></p><p>{{company.name}}</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Payment Reminder',
        category: 'reminder',
        content:
          'Hi {{customer.name}}, this is a friendly reminder that invoice {{invoice.number}} for {{invoice.amount}} is due on {{invoice.due_date}}. Pay now: {{invoice.payment_link}}',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'website', text: 'Pay Now', value: '{{invoice.payment_link}}' }],
      },
      {
        channel: 'email',
        name: 'Payment Received',
        category: 'transactional',
        subject: 'Payment received — thank you!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>We\'ve received your payment of {{invoice.amount}} for invoice {{invoice.number}}. Thank you!</p><p>A receipt is attached for your records.</p><p>{{company.name}}</p>',
      },
      {
        channel: 'email',
        name: 'Overdue Reminder',
        category: 'transactional',
        subject: 'Invoice {{invoice.number}} is overdue',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your invoice {{invoice.number}} for {{invoice.amount}} was due on {{invoice.due_date}} and is now overdue.</p><p>Please complete payment as soon as possible: <a href="{{invoice.payment_link}}">Pay Now</a></p><p>If you\'ve already paid, please disregard this message.</p><p>{{company.name}}</p>',
      },
    ],
  },
  {
    slug: 'marketing-pack',
    name: 'Marketing Pack',
    description: 'Festival offers, seasonal promotions, referral campaigns, and discount offers.',
    category: 'business',
    icon: 'Megaphone',
    color: '#db2777',
    templates: [
      {
        channel: 'whatsapp',
        name: 'Festival Offer',
        category: 'seasonal',
        content:
          'Hi {{customer.name}}! 🎉 Celebrate with {{company.name}}! Get 20% off all services this festival season. Use code FESTIVE20 at booking.',
        templateType: 'text',
        footerText: 'Limited time only',
        buttons: [{ type: 'copy_coupon', text: 'Copy code', value: 'FESTIVE20' }, { type: 'website', text: 'Book now', value: '{{company.website}}' }],
      },
      {
        channel: 'email',
        name: 'Seasonal Promotion',
        category: 'seasonal',
        subject: 'Seasonal savings from {{company.name}}!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>This season, give your home the care it deserves. Book any service with {{company.name}} and enjoy 15% off!</p><p>Offer ends soon — book today.</p><p>{{company.name}}</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Referral Campaign',
        category: 'promotional',
        content:
          'Hi {{customer.name}}! Refer a friend to {{company.name}} and you BOTH get $25 off your next service. Share your unique link now!',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'website', text: 'Get my referral link', value: '{{company.website}}/refer' }],
      },
      {
        channel: 'email',
        name: 'Discount Offer',
        category: 'marketing',
        subject: 'Special discount just for you, {{customer.name}}',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>As a valued customer, we\'re offering you an exclusive 10% discount on your next booking.</p><p>Use code <strong>VALUED10</strong> at checkout.</p><p>{{company.name}}</p>',
      },
    ],
  },
  {
    slug: 'support-pack',
    name: 'Support Pack',
    description: 'Ticket created, updated, and closed notifications for customer support.',
    category: 'business',
    icon: 'LifeBuoy',
    color: '#7c3aed',
    templates: [
      {
        channel: 'email',
        name: 'Ticket Created',
        category: 'transactional',
        subject: 'Support ticket #{{ticket.number}} created',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>We\'ve received your support request and created ticket #{{ticket.number}}. Our team will respond within 24 hours.</p><p>{{company.name}} Support</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Ticket Updated',
        category: 'follow_up',
        content:
          'Hi {{customer.name}}, your support ticket #{{ticket.number}} has been updated. Please check your email for details or reply here.',
        templateType: 'text',
        footerText: '{{company.name}} Support',
      },
      {
        channel: 'email',
        name: 'Ticket Closed',
        category: 'transactional',
        subject: 'Ticket #{{ticket.number}} has been closed',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your support ticket #{{ticket.number}} has been resolved and closed. If you\'re still experiencing issues, please let us know.</p><p>Thank you for choosing {{company.name}}.</p>',
      },
    ],
  },
  {
    slug: 'review-pack',
    name: 'Review Pack',
    description: 'Request Google and Facebook reviews from satisfied customers.',
    category: 'business',
    icon: 'Star',
    color: '#eab308',
    templates: [
      {
        channel: 'whatsapp',
        name: 'Google Review Request',
        category: 'follow_up',
        content:
          'Hi {{customer.name}}! We hope you loved our service. Would you mind leaving us a quick review on Google? It takes 30 seconds and means the world to us! ⭐',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'website', text: 'Leave Google Review', value: '{{company.website}}/review' }],
      },
      {
        channel: 'whatsapp',
        name: 'Facebook Review Request',
        category: 'follow_up',
        content:
          'Hi {{customer.name}}! Enjoyed your experience with {{company.name}}? We\'d be thrilled if you could share your feedback on our Facebook page! 🙏',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'website', text: 'Review on Facebook', value: '{{company.website}}/fb-review' }],
      },
    ],
  },
  {
    slug: 'subscription-pack',
    name: 'Subscription Pack',
    description: 'Welcome subscribers, remind about renewals, trial expiry, and failed payments.',
    category: 'business',
    icon: 'CreditCard',
    color: '#059669',
    templates: [
      {
        channel: 'email',
        name: 'Subscription Welcome',
        category: 'transactional',
        subject: 'Welcome to your {{company.name}} subscription!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Welcome aboard! Your subscription with {{company.name}} is now active.</p><p>You can manage your subscription anytime from your account dashboard.</p><p>{{company.name}}</p>',
      },
      {
        channel: 'whatsapp',
        name: 'Renewal Reminder',
        category: 'reminder',
        content:
          'Hi {{customer.name}}, your subscription with {{company.name}} renews on {{subscription.renewal_date}}. To manage your plan, visit your account.',
        templateType: 'text',
        footerText: '{{company.name}}',
        buttons: [{ type: 'website', text: 'Manage subscription', value: '{{company.website}}/account' }],
      },
      {
        channel: 'email',
        name: 'Trial Expiry',
        category: 'transactional',
        subject: 'Your trial ends soon — don\'t miss out!',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your free trial with {{company.name}} expires in 3 days. Upgrade now to keep enjoying all features without interruption.</p><p>{{company.name}}</p>',
      },
      {
        channel: 'email',
        name: 'Payment Failed',
        category: 'transactional',
        subject: 'Action needed: payment failed',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>We were unable to process your last payment. Please update your payment method to avoid service interruption.</p><p>{{company.name}}</p>',
      },
    ],
  },
]

/** Industry packs — subset for demo. Full set can be expanded later. */
export const INDUSTRY_PACKS: TemplatePackDef[] = [
  {
    slug: 'plumbing-pack',
    name: 'Plumbing Industry Pack',
    description: 'Templates tailored for plumbing businesses — drain cleaning, leak repair, installations.',
    category: 'business',
    industry: 'plumbing',
    icon: 'Droplets',
    color: '#0284c7',
    templates: [
      {
        channel: 'whatsapp',
        name: 'Plumbing Appointment Reminder',
        category: 'reminder',
        content:
          'Hi {{customer.name}}! Our plumber is scheduled to visit you on {{booking.date}} at {{booking.time}} for your plumbing service. Please ensure clear access to the work area.',
        templateType: 'text',
        footerText: '{{company.name}} Plumbing',
      },
      {
        channel: 'email',
        name: 'Plumbing Service Complete',
        category: 'transactional',
        subject: 'Your plumbing service is complete',
        htmlBody:
          '<p>Hi {{customer.name}},</p><p>Your plumbing service has been completed. If you experience any issues, we offer a 90-day warranty on all repairs.</p><p>{{company.name}}</p>',
      },
    ],
  },
  {
    slug: 'hvac-pack',
    name: 'HVAC Industry Pack',
    description: 'Templates for heating, ventilation, and air conditioning service businesses.',
    category: 'business',
    industry: 'hvac',
    icon: 'Wind',
    color: '#0d9488',
    templates: [
      {
        channel: 'whatsapp',
        name: 'HVAC Maintenance Reminder',
        category: 'reminder',
        content:
          'Hi {{customer.name}}! It\'s time for your seasonal HVAC maintenance. Book now to keep your system running efficiently and avoid costly repairs.',
        templateType: 'text',
        footerText: '{{company.name}} HVAC',
        buttons: [{ type: 'website', text: 'Schedule maintenance', value: '{{company.website}}' }],
      },
    ],
  },
]

export const ALL_PACKS: TemplatePackDef[] = [...BUSINESS_PACKS, ...INDUSTRY_PACKS]
