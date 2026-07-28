/**
 * seed-tenant-defaults.ts
 * ──────────────────────
 * Auto-seeds a newly-onboarded tenant with a starter set of WorkflowAutomations
 * and Forms so the workspace is immediately useful (not empty) on first login.
 *
 * WHEN IT RUNS
 *   Hooked into the PUT /api/tenants/[id] handler — fires exactly once, when
 *   `onboardingCompleted` flips from false → true (right next to the existing
 *   `applyHubDefaultsToTenant` call).
 *
 * IDEMPOTENT
 *   Before each insert we check `findFirst({ where: { tenantId, name } })`.
 *   If a record with that name already exists for the tenant, we skip it.
 *   Safe to run multiple times. Never deletes or overwrites existing records.
 *
 * NON-DESTRUCTIVE
 *   Only inserts. Never updates or deletes. A user who customizes a seeded
 *   workflow/form will never have their edits clobbered by a re-seed.
 *
 * NON-BLOCKING
 *   The caller wraps this in try/catch — a seeding failure never blocks the
 *   onboarding completion response. Errors are logged but the tenant is still
 *   marked as onboarded.
 *
 * ACTION VOCABULARY
 *   Workflow actions use the exact `type` strings from `src/lib/trigger-catalog.ts`
 *   ACTION_TYPES so the trigger-engine executor switch recognizes them.
 *   Form submissionActions use the exact strings from `form-builder-view.tsx`
 *   PRIMARY_ACTIONS so the form-submission pipeline recognizes them.
 */

import { db } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────
interface SeedWorkflow {
  name: string;
  description: string;
  triggerType: string;
  triggerConfigJson: string;
  conditionsJson: string;
  actionsJson: string;
  active: boolean;
  tagsJson: string;
}

interface SeedForm {
  name: string;
  description: string;
  type: string;
  status: string;
  fieldsJson: string;
  submissionActions: string;
  fieldMappingJson: string;
  welcomeMessage: string;
  completionMessage: string;
  whatsappOwnerTemplate: string;
  whatsappUserTemplate: string;
  whatsappAiGenerated: boolean;
}

// ── Workflow definitions (6) ────────────────────────────────────────────
// Each action uses the canonical type strings from trigger-catalog.ts
// ACTION_TYPES: send_whatsapp, send_email, send_notification, assign_user,
// create_task, delay, etc.
const WORKFLOWS: SeedWorkflow[] = [
  {
    name: 'New Lead WhatsApp Welcome',
    description:
      'Automatically send a WhatsApp welcome message to the customer when a new lead is created. Sets the tone for fast, friendly follow-up.',
    triggerType: 'lead.created',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and' }),
    conditionsJson: JSON.stringify([]),
    actionsJson: JSON.stringify([
      {
        id: 'act_welcome_wa',
        type: 'send_whatsapp',
        config: {
          recipient: 'customer',
          template:
            'Hi {{name}}! 👋 Thanks for reaching out to {{tenant_name}}. We have received your request and a team member will contact you shortly.',
        },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['welcome', 'whatsapp', 'leads']),
  },
  {
    name: 'High-Value Lead Alert',
    description:
      'Notify the team and assign the lead round-robin when a high-value lead (value > 500) is created, so valuable opportunities never slip through.',
    triggerType: 'lead.created',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and' }),
    conditionsJson: JSON.stringify([
      { id: 'cond_value_high', field: 'Lead Value', operator: 'greater_than', value: '500' },
    ]),
    actionsJson: JSON.stringify([
      {
        id: 'act_notify_high',
        type: 'send_notification',
        config: {
          title: 'High-value lead 🎯',
          message: 'A lead valued at {{value}} was just created. Follow up ASAP!',
          channel: 'sales',
        },
      },
      {
        id: 'act_assign_rr',
        type: 'assign_user',
        config: { assignTo: 'round_robin' },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['leads', 'alerts', 'round-robin']),
  },
  {
    name: 'Job Completion Review Request',
    description:
      'After a job is marked complete, automatically ask the customer for a review. Drives 5-star social proof on autopilot.',
    triggerType: 'job.completed',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and' }),
    conditionsJson: JSON.stringify([]),
    actionsJson: JSON.stringify([
      {
        id: 'act_review_wa',
        type: 'send_whatsapp',
        config: {
          recipient: 'customer',
          template:
            'Hi {{name}}! We hope you are happy with the service from {{tenant_name}}. Would you take 30 seconds to leave us a review? {{review_link}}',
        },
      },
      {
        id: 'act_review_email',
        type: 'send_email',
        config: {
          subject: 'How did we do? ⭐',
          body: 'Hi {{name}}, thanks for choosing {{tenant_name}}! We would love your feedback. Please leave us a review here: {{review_link}}',
        },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['reviews', 'jobs', 'whatsapp']),
  },
  {
    name: 'Invoice Overdue Reminder',
    description:
      'When an invoice becomes overdue, send both an email and a WhatsApp reminder to the customer. Reduces chasing time and improves cash flow.',
    triggerType: 'invoice.overdue',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and', daysOverdue: 3 }),
    conditionsJson: JSON.stringify([
      { id: 'cond_not_paid', field: 'Invoice Status', operator: 'not_equals', value: 'paid' },
    ]),
    actionsJson: JSON.stringify([
      {
        id: 'act_inv_email',
        type: 'send_email',
        config: {
          subject: 'Reminder: Invoice #{{invoice_number}} is overdue',
          body: 'Hi {{name}}, this is a friendly reminder that invoice #{{invoice_number}} for {{amount}} is now overdue. Please arrange payment at your earliest convenience. Thank you!',
        },
      },
      {
        id: 'act_inv_wa',
        type: 'send_whatsapp',
        config: {
          recipient: 'customer',
          template:
            'Hi {{name}}, just a friendly reminder that invoice #{{invoice_number}} ({{amount}}) is now overdue. Please let us know if you have any questions. Thank you!',
        },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['billing', 'reminders', 'invoices']),
  },
  {
    name: 'Booking Confirmation WhatsApp',
    description:
      'When a booking is confirmed, instantly WhatsApp the customer with the details. Reduces no-shows and builds confidence.',
    triggerType: 'booking.confirmed',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and' }),
    conditionsJson: JSON.stringify([]),
    actionsJson: JSON.stringify([
      {
        id: 'act_book_wa',
        type: 'send_whatsapp',
        config: {
          recipient: 'customer',
          template:
            '✅ Your booking with {{tenant_name}} is confirmed for {{date}} at {{time}}. We look forward to seeing you! Reply to this message if you need to reschedule.',
        },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['bookings', 'whatsapp', 'confirmations']),
  },
  {
    name: 'Quote Follow-Up',
    description:
      'One day after a quote is sent, automatically follow up with the customer via WhatsApp. Nudges undecided prospects without being pushy.',
    triggerType: 'time.1d_after_quote',
    triggerConfigJson: JSON.stringify({ conditionLogic: 'and', delayMinutes: 1440 }),
    conditionsJson: JSON.stringify([
      { id: 'cond_quote_sent', field: 'Quote Status', operator: 'equals', value: 'sent' },
    ]),
    actionsJson: JSON.stringify([
      {
        id: 'act_quote_fu',
        type: 'send_whatsapp',
        config: {
          recipient: 'customer',
          template:
            'Hi {{name}}! Just checking in on the quote we sent for {{service}}. Do you have any questions, or would you like to proceed? We are here to help. 😊',
        },
      },
    ]),
    active: true,
    tagsJson: JSON.stringify(['quotes', 'follow-up', 'whatsapp']),
  },
];

// ── Form definitions (4) ────────────────────────────────────────────────
// submissionActions use the canonical strings from form-builder-view.tsx
// PRIMARY_ACTIONS: create_lead, create_customer, create_booking, create_job,
// create_quote, trigger_workflow, store_response.
const FORMS: SeedForm[] = [
  {
    name: 'Lead Capture Form',
    description: 'General-purpose lead capture form for all services. Embed on your website.',
    type: 'lead_capture',
    status: 'active',
    fieldsJson: JSON.stringify([
      { id: 'f_name', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'f_phone', name: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+1 555 000 0000' },
      { id: 'f_email', name: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'you@example.com' },
      {
        id: 'f_service',
        name: 'service',
        label: 'Service Needed',
        type: 'select',
        options: ['Plumbing', 'Cleaning', 'HVAC', 'Electrical', 'Painting', 'Pest Control', 'Other'],
        required: true,
      },
      { id: 'f_msg', name: 'message', label: 'Describe Your Issue', type: 'textarea', required: false, placeholder: 'Briefly describe what you need…' },
    ]),
    submissionActions: JSON.stringify(['create_lead']),
    fieldMappingJson: JSON.stringify({
      name: 'name',
      phone: 'phone',
      email: 'email',
      service: 'serviceType',
      message: 'description',
    }),
    welcomeMessage: 'Welcome! Tell us a bit about what you need and we will get back to you fast.',
    completionMessage: 'Thank you! 🎉 We have received your request and will contact you shortly.',
    whatsappOwnerTemplate: '🔔 New lead from {{name}} ({{phone}}) for {{service}}. Message: {{message}}',
    whatsappUserTemplate: 'Hi {{name}}! Thanks for reaching out. We have received your request and will contact you shortly.',
    whatsappAiGenerated: false,
  },
  {
    name: 'Booking Request Form',
    description: 'Quick booking request form with date/time preferences. Auto-creates a lead + booking.',
    type: 'booking',
    status: 'active',
    fieldsJson: JSON.stringify([
      { id: 'f_name', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'f_phone', name: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+1 555 000 0000' },
      { id: 'f_date', name: 'date', label: 'Preferred Date', type: 'date', required: true },
      { id: 'f_time', name: 'time', label: 'Preferred Time', type: 'time', required: true },
      {
        id: 'f_service',
        name: 'service',
        label: 'Service',
        type: 'select',
        options: ['Plumbing', 'Cleaning', 'HVAC', 'Electrical', 'Painting', 'Other'],
        required: true,
      },
      { id: 'f_addr', name: 'address', label: 'Service Address', type: 'text', required: false, placeholder: '123 Main St, City' },
    ]),
    submissionActions: JSON.stringify(['create_lead', 'create_booking']),
    fieldMappingJson: JSON.stringify({
      name: 'name',
      phone: 'phone',
      date: 'scheduledDate',
      time: 'scheduledTime',
      service: 'serviceType',
      address: 'address',
    }),
    welcomeMessage: 'Book a service appointment in under a minute!',
    completionMessage: '🎉 Your booking request has been received! We will confirm the slot shortly.',
    whatsappOwnerTemplate: '📅 New booking request from {{name}} ({{phone}}) for {{service}} on {{date}} at {{time}}.',
    whatsappUserTemplate: 'Hi {{name}}! We received your booking request for {{date}} at {{time}}. We will confirm shortly.',
    whatsappAiGenerated: false,
  },
  {
    name: 'Service Feedback Form',
    description: 'Collect feedback after a service visit. Stores the response for review and NPS tracking.',
    type: 'feedback',
    status: 'active',
    fieldsJson: JSON.stringify([
      { id: 'f_name', name: 'name', label: 'Your Name', type: 'text', required: true, placeholder: 'John Doe' },
      {
        id: 'f_rating',
        name: 'rating',
        label: 'How would you rate our service?',
        type: 'select',
        options: ['⭐⭐⭐⭐⭐ Excellent', '⭐⭐⭐⭐ Good', '⭐⭐⭐ Average', '⭐⭐ Poor', '⭐ Very Poor'],
        required: true,
      },
      { id: 'f_comments', name: 'comments', label: 'Your Comments', type: 'textarea', required: false, placeholder: 'Tell us about your experience…' },
      { id: 'f_recommend', name: 'recommend', label: 'Would you recommend us to a friend?', type: 'select', options: ['Yes, definitely', 'Maybe', 'No'], required: false },
    ]),
    submissionActions: JSON.stringify(['store_response']),
    fieldMappingJson: JSON.stringify({}),
    welcomeMessage: 'We would love to hear how we did!',
    completionMessage: 'Thank you for your feedback! 💚 It helps us serve you better.',
    whatsappOwnerTemplate: '',
    whatsappUserTemplate: '',
    whatsappAiGenerated: false,
  },
  {
    name: 'Quote Request Form',
    description: 'Detailed quote request form for customers who want a price estimate. Auto-generates a quote draft.',
    type: 'quote_request',
    status: 'active',
    fieldsJson: JSON.stringify([
      { id: 'f_name', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'f_phone', name: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+1 555 000 0000' },
      { id: 'f_email', name: 'email', label: 'Email Address', type: 'email', required: false, placeholder: 'you@example.com' },
      {
        id: 'f_service',
        name: 'service',
        label: 'Service Needed',
        type: 'select',
        options: ['Plumbing', 'Cleaning', 'HVAC', 'Electrical', 'Painting', 'Pest Control', 'Landscaping', 'Other'],
        required: true,
      },
      {
        id: 'f_budget',
        name: 'budget',
        label: 'Estimated Budget',
        type: 'select',
        options: ['Under $100', '$100 - $500', '$500 - $1,000', '$1,000 - $5,000', 'Over $5,000', 'Not sure'],
        required: false,
      },
      { id: 'f_details', name: 'details', label: 'Project Details', type: 'textarea', required: true, placeholder: 'Describe the scope of work, location, timeline, etc.' },
    ]),
    submissionActions: JSON.stringify(['create_quote']),
    fieldMappingJson: JSON.stringify({
      name: 'name',
      phone: 'phone',
      email: 'email',
      service: 'serviceType',
      budget: 'estimatedBudget',
      details: 'description',
    }),
    welcomeMessage: 'Tell us about your project and we will send you a quote.',
    completionMessage: '✅ Thank you! We will prepare a quote and send it to you shortly.',
    whatsappOwnerTemplate: '💰 New quote request from {{name}} ({{phone}}) for {{service}}. Budget: {{budget}}.',
    whatsappUserTemplate: 'Hi {{name}}! We received your quote request for {{service}}. We will send you a detailed quote shortly.',
    whatsappAiGenerated: false,
  },
];

// ── Slug helper (mirrors src/app/api/forms/route.ts slugify) ────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Generate a tenant-unique slug for a form. The Form.slug column has a GLOBAL
 * unique constraint, so we suffix with a short tenant hash to avoid collisions
 * across tenants that all seed a "Lead Capture Form" with slug "lead-capture-form".
 */
async function generateTenantUniqueSlug(baseName: string, tenantId: string): Promise<string> {
  const base = slugify(baseName) || 'form';
  // 6-char suffix from tenant id — enough entropy to avoid collisions for
  // thousands of tenants without making the URL ugly.
  const suffix = tenantId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-6);
  let slug = `${base}-${suffix}`;
  let counter = 1;
  while (await db.form.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}-${counter}`;
    counter++;
  }
  return slug;
}

/**
 * Seed a tenant with default workflows and forms.
 *
 * @returns counts of records actually created (skips existing by name).
 */
export async function seedTenantDefaults(
  tenantId: string,
  workspaceId: string | null,
  ownerId: string | null
): Promise<{ workflowsCreated: number; formsCreated: number }> {
  let workflowsCreated = 0;
  let formsCreated = 0;

  // ── Workflows ──────────────────────────────────────────────────────────
  for (const wf of WORKFLOWS) {
    // Idempotency: skip if a workflow with this exact name already exists
    // for this tenant. We match on name (not triggerType) so a user who
    // customized a seeded workflow keeps their version.
    const existing = await db.workflowAutomation.findFirst({
      where: { tenantId, name: wf.name },
      select: { id: true },
    });
    if (existing) continue;

    await db.workflowAutomation.create({
      data: {
        name: wf.name,
        description: wf.description,
        triggerType: wf.triggerType,
        triggerConfigJson: wf.triggerConfigJson,
        conditionsJson: wf.conditionsJson,
        actionsJson: wf.actionsJson,
        active: wf.active,
        tagsJson: wf.tagsJson,
        executionCount: 0,
        tenantId,
        workspaceId,
        createdById: ownerId,
      },
    });
    workflowsCreated++;
  }

  // ── Forms ──────────────────────────────────────────────────────────────
  for (const fm of FORMS) {
    // Idempotency: skip if a form with this exact name already exists.
    const existing = await db.form.findFirst({
      where: { tenantId, name: fm.name },
      select: { id: true },
    });
    if (existing) continue;

    const slug = await generateTenantUniqueSlug(fm.name, tenantId);

    await db.form.create({
      data: {
        name: fm.name,
        description: fm.description,
        type: fm.type,
        status: fm.status,
        slug,
        fieldsJson: fm.fieldsJson,
        submissionActions: fm.submissionActions,
        fieldMappingJson: fm.fieldMappingJson,
        welcomeMessage: fm.welcomeMessage,
        completionMessage: fm.completionMessage,
        whatsappOwnerTemplate: fm.whatsappOwnerTemplate,
        whatsappUserTemplate: fm.whatsappUserTemplate,
        whatsappAiGenerated: fm.whatsappAiGenerated,
        embedScriptEnabled: false,
        embedIframeEnabled: false,
        submissions: 0,
        conversionRate: 0,
        tenantId,
        workspaceId,
        createdById: ownerId,
      },
    });
    formsCreated++;
  }

  return { workflowsCreated, formsCreated };
}
