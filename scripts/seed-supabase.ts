#!/usr/bin/env bun
/**
 * ServiceOS Supabase Seed Script
 *
 * Seeds the missing tables (CommunicationProvider, Contact, Form, FormResponse,
 * WorkflowAutomation, TriggerExecution) in Supabase via the REST API, and
 * creates demo user accounts.
 *
 * Usage:
 *   bun run scripts/seed-supabase.ts           # Seed all tables + users
 *   bun run scripts/seed-supabase.ts --data     # Seed only data tables
 *   bun run scripts/seed-supabase.ts --users    # Create only user accounts
 *   bun run scripts/seed-supabase.ts --sql      # Print the SQL migration script
 */

// ── Configuration ──────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://rmzaxqxzultxetlgsgic.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtemF4cXh6dWx0eGV0bGdzZ2ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3ODA4OCwiZXhwIjoyMDk2NzU0MDg4fQ._CKVNrLfp0cvUKpIs8AgkJLjqngdiApfHfaPwMeKWvg';

const REST_URL = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function supabaseFetch(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  query?: string
): Promise<{ data: unknown; error: string | null }> {
  const url = `${REST_URL}/${table}${query ? `?${query}` : ''}`;
  try {
    const response = await fetch(url, {
      method,
      headers: HEADERS,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkTableExists(table: string): Promise<boolean> {
  const { error } = await supabaseFetch(table, 'GET', undefined, 'select=id&limit=1');
  if (error && (
    error.includes('does not exist') ||
    error.includes('42P01') ||
    error.includes('relation') ||
    error.includes('schema cache') ||
    error.includes('Could not find')
  )) {
    return false;
  }
  return true;
}

function log(section: string, message: string, success = true) {
  const icon = success ? '✅' : '❌';
  console.log(`  ${icon} [${section}] ${message}`);
}

function logSection(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ── Get existing data ──────────────────────────────────────────────────────

async function getFirstTenant(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseFetch('Tenant', 'GET', undefined, 'select=id,name&limit=1');
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0] as { id: string; name: string };
}

async function getFirstWorkspace(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseFetch('Workspace', 'GET', undefined, `select=id&tenantId=eq.${tenantId}&limit=1`);
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return (data[0] as { id: string }).id;
}

async function getFirstUser(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseFetch('User', 'GET', undefined, `select=id&tenantId=eq.${tenantId}&limit=1`);
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return (data[0] as { id: string }).id;
}

// ── 1. Seed CommunicationProvider ──────────────────────────────────────────

async function seedCommunicationProviders(tenantId: string, workspaceId: string | null): Promise<number> {
  logSection('1. CommunicationProvider (5 providers)');

  const providers = [
    {
      id: crypto.randomUUID(),
      name: 'WhatsApp (Meta Cloud API)',
      type: 'whatsapp',
      provider: 'meta_cloud_api',
      status: 'active',
      configJson: JSON.stringify({ phoneNumberId: 'demo_phone_id', businessAccountId: 'demo_biz_id', accessToken: 'demo_token' }),
      isDefault: true,
      sendingEnabled: true,
      dailyLimit: 1000,
      monthlyLimit: 30000,
      sentToday: 42,
      sentThisMonth: 856,
      totalSent: 12450,
      totalDelivered: 11982,
      totalFailed: 468,
      lastUsedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'SMS (Twilio)',
      type: 'sms',
      provider: 'twilio',
      status: 'active',
      configJson: JSON.stringify({ accountSid: 'ACdemo_sid_xxxxxxxxxxxxx', authToken: 'demo_auth_token', fromNumber: '+14155551234' }),
      isDefault: false,
      sendingEnabled: true,
      dailyLimit: 500,
      monthlyLimit: 15000,
      sentToday: 15,
      sentThisMonth: 342,
      totalSent: 5670,
      totalDelivered: 5412,
      totalFailed: 258,
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Email (Amazon SES)',
      type: 'email',
      provider: 'amazon_ses',
      status: 'active',
      configJson: JSON.stringify({ region: 'us-east-1', accessKey: 'AKIAIOSFODNN7EXAMPLE', secretKey: 'demo_secret_key', fromEmail: 'noreply@serviceos.demo', fromName: 'ServiceOS Notifications' }),
      isDefault: false,
      sendingEnabled: true,
      dailyLimit: 5000,
      monthlyLimit: 100000,
      sentToday: 128,
      sentThisMonth: 2847,
      totalSent: 45230,
      totalDelivered: 43890,
      totalFailed: 1340,
      lastUsedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Email (SendGrid)',
      type: 'email',
      provider: 'sendgrid',
      status: 'inactive',
      configJson: JSON.stringify({ apiKey: 'SG.demo_api_key_xxxxxxxxx', fromEmail: 'noreply@serviceos.demo', fromName: 'ServiceOS' }),
      isDefault: false,
      sendingEnabled: false,
      dailyLimit: 1000,
      monthlyLimit: 40000,
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'WhatsApp (360Dialog)',
      type: 'whatsapp',
      provider: '360dialog',
      status: 'inactive',
      configJson: JSON.stringify({ apiKey: 'demo_360dialog_key', namespace: 'demo_namespace' }),
      isDefault: false,
      sendingEnabled: false,
      dailyLimit: 500,
      monthlyLimit: 15000,
      tenantId,
      workspaceId,
    },
  ];

  let count = 0;
  for (const provider of providers) {
    const { data, error } = await supabaseFetch('CommunicationProvider', 'POST', provider);
    if (error) {
      log('Provider', `${provider.name}: ${error}`, false);
    } else {
      log('Provider', provider.name);
      count++;
    }
  }

  return count;
}

// ── 2. Seed Contact ────────────────────────────────────────────────────────

async function seedContacts(tenantId: string, workspaceId: string | null): Promise<number> {
  logSection('2. Contact (15 contacts)');

  const contacts = [
    { id: crypto.randomUUID(), name: 'John Smith', email: 'john.smith@acmecorp.com', phone: '+14155551001', company: 'Acme Corp', tags: 'vip,business', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Sarah Johnson', email: 'sarah.j@gmail.com', phone: '+14155551002', company: 'TechStart Inc', tags: 'lead,tech', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Michael Chen', email: 'm.chen@dragonind.com', phone: '+14155551003', company: 'Dragon Industries', tags: 'business,enterprise', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Emily Davis', email: 'emily.davis@homerenov.com', phone: '+14155551004', company: 'Home Renovations LLC', tags: 'customer,repeat', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Robert Wilson', email: 'rwilson@globalfreight.com', phone: '+14155551005', company: 'Global Freight Co', tags: 'business,logistics', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Lisa Anderson', email: 'lisa.a@propertyplus.com', phone: '+14155551006', company: 'Property Plus', tags: 'customer,property', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'David Martinez', email: 'david.m@cleanpro.com', phone: '+14155551007', company: 'CleanPro Services', tags: 'vendor,cleaning', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Jennifer Lee', email: 'j.lee@startuphub.io', phone: '+14155551008', company: 'StartupHub', tags: 'lead,tech', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'James Brown', email: 'jbrown@blueocean.net', phone: '+14155551009', company: 'Blue Ocean Ventures', tags: 'investor,vip', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Amanda Taylor', email: 'amanda.t@healthfirst.org', phone: '+14155551010', company: 'HealthFirst Org', tags: 'healthcare,business', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Chris Nguyen', email: 'chris.n@cloud9solutions.com', phone: '+14155551011', company: 'Cloud9 Solutions', tags: 'tech,partner', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Patricia White', email: 'pwhite@greenearth.com', phone: '+14155551012', company: 'Green Earth', tags: 'sustainability,customer', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Daniel Harris', email: 'dharris@apexlogistics.com', phone: '+14155551013', company: 'Apex Logistics', tags: 'logistics,business', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Maria Garcia', email: 'maria.g@fiestacatering.com', phone: '+14155551014', company: 'Fiesta Catering', tags: 'food,vendor', tenantId, workspaceId },
    { id: crypto.randomUUID(), name: 'Kevin Thompson', email: 'k.thompson@urbandev.com', phone: '+14155551015', company: 'Urban Development Corp', tags: 'real-estate,enterprise', tenantId, workspaceId },
  ];

  let count = 0;
  for (const contact of contacts) {
    const { data, error } = await supabaseFetch('Contact', 'POST', contact);
    if (error) {
      log('Contact', `${contact.name}: ${error}`, false);
    } else {
      log('Contact', contact.name);
      count++;
    }
  }

  return count;
}

// ── 3. Seed Form ───────────────────────────────────────────────────────────

async function seedForms(tenantId: string, workspaceId: string | null, userId: string | null): Promise<{ id: string; name: string }[]> {
  logSection('3. Form (5 forms)');

  const forms = [
    {
      id: crypto.randomUUID(),
      name: 'Lead Capture Form',
      description: 'Capture new leads from website visitors with contact details and service interest',
      type: 'lead_capture',
      status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', name: 'email', label: 'Email', type: 'email', required: true },
        { id: 'f3', name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'f4', name: 'service', label: 'Service Interested In', type: 'select', options: ['Plumbing', 'Electrical', 'Cleaning', 'HVAC', 'Other'] },
        { id: 'f5', name: 'message', label: 'Message', type: 'textarea' },
      ]),
      submissionActions: JSON.stringify(['create_lead', 'send_whatsapp']),
      fieldMappingJson: JSON.stringify({ fullName: 'name', email: 'email', phone: 'phone', message: 'description' }),
      welcomeMessage: 'Welcome! Tell us how we can help you today.',
      completionMessage: 'Thank you! We\'ll get back to you shortly.',
      slug: 'lead-capture',
      submissions: 47,
      conversionRate: 0.23,
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Booking Form',
      description: 'Book appointments and schedule service visits',
      type: 'booking',
      status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'f3', name: 'date', label: 'Preferred Date', type: 'date', required: true },
        { id: 'f4', name: 'time', label: 'Preferred Time', type: 'time', required: true },
        { id: 'f5', name: 'address', label: 'Service Address', type: 'text', required: true },
        { id: 'f6', name: 'service', label: 'Service Type', type: 'select', options: ['Plumbing', 'Electrical', 'Cleaning', 'HVAC'] },
      ]),
      submissionActions: JSON.stringify(['create_lead', 'create_booking', 'send_whatsapp']),
      fieldMappingJson: JSON.stringify({ fullName: 'name', phone: 'phone', address: 'address' }),
      welcomeMessage: 'Book your service appointment now!',
      completionMessage: 'Your booking has been received. We\'ll confirm shortly!',
      slug: 'booking',
      submissions: 32,
      conversionRate: 0.38,
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Feedback Form',
      description: 'Collect customer feedback and satisfaction ratings after service completion',
      type: 'feedback',
      status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'name', label: 'Your Name', type: 'text', required: true },
        { id: 'f2', name: 'rating', label: 'How would you rate our service?', type: 'rating', required: true },
        { id: 'f3', name: 'comments', label: 'Additional Comments', type: 'textarea' },
        { id: 'f4', name: 'recommend', label: 'Would you recommend us?', type: 'select', options: ['Yes', 'Maybe', 'No'] },
      ]),
      submissionActions: JSON.stringify(['store_response']),
      fieldMappingJson: JSON.stringify({ name: 'respondentName' }),
      welcomeMessage: 'We value your feedback!',
      completionMessage: 'Thank you for your feedback!',
      slug: 'feedback',
      submissions: 18,
      conversionRate: 0.65,
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Survey Form',
      description: 'Customer satisfaction survey with detailed questions about service quality',
      type: 'survey',
      status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'name', label: 'Your Name', type: 'text', required: true },
        { id: 'f2', name: 'satisfaction', label: 'Overall Satisfaction (1-10)', type: 'number', required: true },
        { id: 'f3', name: 'timeliness', label: 'Was the service timely?', type: 'select', options: ['Very Timely', 'On Time', 'Slightly Late', 'Very Late'] },
        { id: 'f4', name: 'professionalism', label: 'Rate our professionalism (1-10)', type: 'number' },
        { id: 'f5', name: 'suggestions', label: 'Suggestions for improvement', type: 'textarea' },
      ]),
      submissionActions: JSON.stringify(['store_response']),
      fieldMappingJson: JSON.stringify({ name: 'respondentName' }),
      welcomeMessage: 'Help us improve our services!',
      completionMessage: 'Thanks for completing our survey!',
      slug: 'survey',
      submissions: 12,
      conversionRate: 0.42,
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Quote Request Form',
      description: 'Request a detailed quote for services needed',
      type: 'quote_request',
      status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', name: 'email', label: 'Email', type: 'email', required: true },
        { id: 'f3', name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'f4', name: 'serviceType', label: 'Service Needed', type: 'select', options: ['Plumbing', 'Electrical', 'Cleaning', 'HVAC', 'Painting', 'Landscaping', 'Other'], required: true },
        { id: 'f5', name: 'description', label: 'Describe your needs', type: 'textarea', required: true },
        { id: 'f6', name: 'budget', label: 'Estimated Budget', type: 'select', options: ['Under $500', '$500-$1000', '$1000-$5000', '$5000+'] },
        { id: 'f7', name: 'urgency', label: 'How urgent?', type: 'select', options: ['ASAP', 'This Week', 'This Month', 'Flexible'] },
      ]),
      submissionActions: JSON.stringify(['create_lead', 'create_quote', 'send_whatsapp', 'send_email']),
      fieldMappingJson: JSON.stringify({ fullName: 'name', email: 'email', phone: 'phone', description: 'description' }),
      welcomeMessage: 'Get a free quote for your project!',
      completionMessage: 'Your quote request has been submitted. We\'ll respond within 24 hours!',
      slug: 'quote-request',
      submissions: 25,
      conversionRate: 0.31,
      tenantId,
      workspaceId,
      createdById: userId,
    },
  ];

  const results: { id: string; name: string }[] = [];
  for (const form of forms) {
    const { data, error } = await supabaseFetch('Form', 'POST', form);
    if (error) {
      log('Form', `${form.name}: ${error}`, false);
    } else {
      log('Form', form.name);
      results.push({ id: form.id, name: form.name });
    }
  }

  return results;
}

// ── 4. Seed FormResponse ──────────────────────────────────────────────────

async function seedFormResponses(forms: { id: string; name: string }[], tenantId: string): Promise<number> {
  logSection('4. FormResponse (10 responses)');

  const leadCaptureId = forms.find(f => f.name === 'Lead Capture Form')?.id;
  const bookingId = forms.find(f => f.name === 'Booking Form')?.id;
  const feedbackId = forms.find(f => f.name === 'Feedback Form')?.id;
  const surveyId = forms.find(f => f.name === 'Survey Form')?.id;
  const quoteRequestId = forms.find(f => f.name === 'Quote Request Form')?.id;

  const responses = [
    {
      id: crypto.randomUUID(),
      formId: leadCaptureId,
      dataJson: JSON.stringify({ fullName: 'Alice Cooper', email: 'alice@example.com', phone: '+15550001', service: 'Plumbing', message: 'Leaky faucet in kitchen' }),
      respondent: 'alice@example.com',
      respondentName: 'Alice Cooper',
      source: 'direct',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: leadCaptureId,
      dataJson: JSON.stringify({ fullName: 'Bob Builder', email: 'bob@example.com', phone: '+15550002', service: 'Electrical', message: 'Need outlet installation in garage' }),
      respondent: '+15550002',
      respondentName: 'Bob Builder',
      source: 'whatsapp',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: bookingId,
      dataJson: JSON.stringify({ fullName: 'Carol Danvers', phone: '+15550003', date: '2025-02-15', time: '10:00', address: '123 Main St, Springfield', service: 'Cleaning' }),
      respondent: '+15550003',
      respondentName: 'Carol Danvers',
      source: 'embed',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: bookingId,
      dataJson: JSON.stringify({ fullName: 'Dave Wilson', phone: '+15550004', date: '2025-02-16', time: '14:00', address: '456 Oak Ave, Shelbyville', service: 'HVAC' }),
      respondent: '+15550004',
      respondentName: 'Dave Wilson',
      source: 'direct',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: feedbackId,
      dataJson: JSON.stringify({ name: 'Eve Taylor', rating: 5, comments: 'Excellent service! The technician was very professional and thorough.', recommend: 'Yes' }),
      respondent: 'eve@example.com',
      respondentName: 'Eve Taylor',
      source: 'direct',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: feedbackId,
      dataJson: JSON.stringify({ name: 'Frank Miller', rating: 4, comments: 'Good work overall, but arrived slightly late.', recommend: 'Yes' }),
      respondent: '+15550006',
      respondentName: 'Frank Miller',
      source: 'whatsapp',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: surveyId,
      dataJson: JSON.stringify({ name: 'Grace Lee', satisfaction: 9, timeliness: 'On Time', professionalism: 8, suggestions: 'Better communication about estimated arrival times' }),
      respondent: 'grace@example.com',
      respondentName: 'Grace Lee',
      source: 'embed',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: quoteRequestId,
      dataJson: JSON.stringify({ fullName: 'Henry Ford', email: 'henry@example.com', phone: '+15550008', serviceType: 'Landscaping', description: 'Full backyard redesign with patio and garden', budget: '$5000+', urgency: 'This Month' }),
      respondent: 'henry@example.com',
      respondentName: 'Henry Ford',
      source: 'wordpress',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: quoteRequestId,
      dataJson: JSON.stringify({ fullName: 'Ivy Chen', email: 'ivy@example.com', phone: '+15550009', serviceType: 'Plumbing', description: 'Bathroom renovation - need full pipe replacement', budget: '$1000-$5000', urgency: 'This Week' }),
      respondent: '+15550009',
      respondentName: 'Ivy Chen',
      source: 'webhook',
      tenantId,
    },
    {
      id: crypto.randomUUID(),
      formId: leadCaptureId,
      dataJson: JSON.stringify({ fullName: 'Jack Brown', email: 'jack@example.com', phone: '+15550010', service: 'HVAC', message: 'AC unit not cooling properly - need diagnosis' }),
      respondent: '+15550010',
      respondentName: 'Jack Brown',
      source: 'direct',
      tenantId,
    },
  ];

  let count = 0;
  for (const response of responses) {
    if (!response.formId) {
      log('FormResponse', `Skipped (no form ID): ${response.respondentName}`, false);
      continue;
    }
    const { data, error } = await supabaseFetch('FormResponse', 'POST', response);
    if (error) {
      log('FormResponse', `${response.respondentName}: ${error}`, false);
    } else {
      log('FormResponse', `${response.respondentName} (${response.source})`);
      count++;
    }
  }

  return count;
}

// ── 5. Seed WorkflowAutomation ─────────────────────────────────────────────

async function seedWorkflowAutomations(tenantId: string, workspaceId: string | null, userId: string | null): Promise<{ id: string; name: string }[]> {
  logSection('5. WorkflowAutomation (5 automations)');

  const automations = [
    {
      id: crypto.randomUUID(),
      name: 'New Lead WhatsApp Notification',
      description: 'Send a WhatsApp notification to the owner whenever a new lead is created',
      triggerType: 'lead.created',
      triggerConfigJson: JSON.stringify({ immediate: true }),
      conditionsJson: JSON.stringify([]),
      actionsJson: JSON.stringify([{ type: 'send_whatsapp', config: { template: 'new_lead_alert', to: 'owner' } }]),
      active: true,
      executionCount: 156,
      lastExecutedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastExecutionStatus: 'success',
      tagsJson: JSON.stringify(['notification', 'whatsapp', 'leads']),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Auto-assign High Priority Leads',
      description: 'Automatically assign leads marked as high priority to the best available technician',
      triggerType: 'lead.created',
      triggerConfigJson: JSON.stringify({ immediate: true }),
      conditionsJson: JSON.stringify([{ field: 'priority', operator: 'equals', value: 'high' }]),
      actionsJson: JSON.stringify([
        { type: 'assign_lead', config: { strategy: 'best_match' } },
        { type: 'send_whatsapp', config: { template: 'lead_assigned', to: 'assignee' } },
      ]),
      active: true,
      executionCount: 43,
      lastExecutedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      lastExecutionStatus: 'success',
      tagsJson: JSON.stringify(['automation', 'assignment', 'priority']),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Invoice Overdue Reminder',
      description: 'Send a reminder when an invoice is overdue by more than 3 days',
      triggerType: 'invoice.overdue',
      triggerConfigJson: JSON.stringify({ delayDays: 3 }),
      conditionsJson: JSON.stringify([{ field: 'status', operator: 'equals', value: 'overdue' }]),
      actionsJson: JSON.stringify([
        { type: 'send_email', config: { template: 'invoice_overdue_reminder' } },
        { type: 'send_whatsapp', config: { template: 'payment_reminder', to: 'customer' } },
      ]),
      active: true,
      executionCount: 28,
      lastExecutedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastExecutionStatus: 'success',
      tagsJson: JSON.stringify(['invoice', 'reminder', 'payment']),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Job Completion Follow-up',
      description: 'Send a follow-up message and review request 24 hours after job completion',
      triggerType: 'job.completed',
      triggerConfigJson: JSON.stringify({ delayHours: 24 }),
      conditionsJson: JSON.stringify([]),
      actionsJson: JSON.stringify([
        { type: 'send_whatsapp', config: { template: 'job_completion_followup', to: 'customer' } },
        { type: 'send_email', config: { template: 'review_request' } },
      ]),
      active: true,
      executionCount: 89,
      lastExecutedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      lastExecutionStatus: 'success',
      tagsJson: JSON.stringify(['follow-up', 'review', 'completion']),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      id: crypto.randomUUID(),
      name: 'New Customer Welcome Message',
      description: 'Send a welcome WhatsApp message when a new customer is created',
      triggerType: 'customer.created',
      triggerConfigJson: JSON.stringify({ immediate: true }),
      conditionsJson: JSON.stringify([]),
      actionsJson: JSON.stringify([{ type: 'send_whatsapp', config: { template: 'welcome_customer', to: 'customer' } }]),
      active: true,
      executionCount: 67,
      lastExecutedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      lastExecutionStatus: 'success',
      tagsJson: JSON.stringify(['welcome', 'onboarding', 'whatsapp']),
      tenantId,
      workspaceId,
      createdById: userId,
    },
  ];

  const results: { id: string; name: string }[] = [];
  for (const automation of automations) {
    const { data, error } = await supabaseFetch('WorkflowAutomation', 'POST', automation);
    if (error) {
      log('Automation', `${automation.name}: ${error}`, false);
    } else {
      log('Automation', automation.name);
      results.push({ id: automation.id, name: automation.name });
    }
  }

  return results;
}

// ── 6. Seed TriggerExecution ───────────────────────────────────────────────

async function seedTriggerExecutions(automations: { id: string; name: string }[], tenantId: string): Promise<number> {
  logSection('6. TriggerExecution (8 executions)');

  const leadNotification = automations.find(a => a.name === 'New Lead WhatsApp Notification')?.id;
  const autoAssign = automations.find(a => a.name === 'Auto-assign High Priority Leads')?.id;
  const invoiceReminder = automations.find(a => a.name === 'Invoice Overdue Reminder')?.id;
  const jobFollowup = automations.find(a => a.name === 'Job Completion Follow-up')?.id;
  const welcomeMsg = automations.find(a => a.name === 'New Customer Welcome Message')?.id;

  const executions = [
    {
      id: crypto.randomUUID(),
      automationId: leadNotification,
      triggerEvent: 'lead.created',
      triggerPayload: JSON.stringify({ leadId: 'demo_lead_1', leadName: 'Alice Cooper', source: 'website' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_1' }]),
      status: 'success',
      durationMs: 245,
      tenantId,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: leadNotification,
      triggerEvent: 'lead.created',
      triggerPayload: JSON.stringify({ leadId: 'demo_lead_2', leadName: 'Bob Builder', source: 'whatsapp' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_2' }]),
      status: 'success',
      durationMs: 189,
      tenantId,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: autoAssign,
      triggerEvent: 'lead.created',
      triggerPayload: JSON.stringify({ leadId: 'demo_lead_3', leadName: 'Urgent Client', priority: 'high' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([
        { type: 'assign_lead', status: 'assigned', assigneeId: 'demo_emp_1', assigneeName: 'Mike Technician' },
        { type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_3' },
      ]),
      status: 'success',
      durationMs: 412,
      tenantId,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: autoAssign,
      triggerEvent: 'lead.created',
      triggerPayload: JSON.stringify({ leadId: 'demo_lead_4', leadName: 'Medium Priority Client', priority: 'medium' }),
      conditionsMet: false,
      actionsResultsJson: JSON.stringify([]),
      status: 'success',
      durationMs: 15,
      tenantId,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: invoiceReminder,
      triggerEvent: 'invoice.overdue',
      triggerPayload: JSON.stringify({ invoiceId: 'demo_inv_1', invoiceNumber: 'INV-001', amount: 1500, daysOverdue: 5, customerEmail: 'customer@example.com' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([
        { type: 'send_email', status: 'sent', messageId: 'msg_email_1' },
        { type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_4' },
      ]),
      status: 'success',
      durationMs: 678,
      tenantId,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: invoiceReminder,
      triggerEvent: 'invoice.overdue',
      triggerPayload: JSON.stringify({ invoiceId: 'demo_inv_2', invoiceNumber: 'INV-002', amount: 750, daysOverdue: 7, customerEmail: 'other@example.com' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([
        { type: 'send_email', status: 'sent', messageId: 'msg_email_2' },
        { type: 'send_whatsapp', status: 'failed', error: 'Number not on WhatsApp' },
      ]),
      status: 'partial',
      durationMs: 834,
      tenantId,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: jobFollowup,
      triggerEvent: 'job.completed',
      triggerPayload: JSON.stringify({ jobId: 'demo_job_1', jobTitle: 'Plumbing Repair', customerName: 'Carol Danvers', completedAt: new Date().toISOString() }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([
        { type: 'send_whatsapp', status: 'delivered', messageId: 'wamid_demo_5' },
        { type: 'send_email', status: 'sent', messageId: 'msg_email_3' },
      ]),
      status: 'success',
      durationMs: 356,
      tenantId,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      automationId: welcomeMsg,
      triggerEvent: 'customer.created',
      triggerPayload: JSON.stringify({ customerId: 'demo_cust_1', customerName: 'Dave Wilson', phone: '+15550004' }),
      conditionsMet: true,
      actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'delivered', messageId: 'wamid_demo_welcome' }]),
      status: 'success',
      durationMs: 198,
      tenantId,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
  ];

  let count = 0;
  for (const execution of executions) {
    if (!execution.automationId) {
      log('Execution', `Skipped (no automation ID): ${execution.triggerEvent}`, false);
      continue;
    }
    const { data, error } = await supabaseFetch('TriggerExecution', 'POST', execution);
    if (error) {
      log('Execution', `${execution.triggerEvent}: ${error}`, false);
    } else {
      log('Execution', `${execution.triggerEvent} → ${execution.status} (${execution.durationMs}ms)`);
      count++;
    }
  }

  return count;
}

// ── 7. Create User Accounts ───────────────────────────────────────────────

const USER_PASSWORD = '$Mahadev@123#';

async function createSupabaseAuthUser(email: string, password: string, name: string, role: string): Promise<string | null> {
  // Use Supabase Auth Admin API to create an auth user
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        },
      }),
    });

    const text = await response.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      console.log(`    ⚠️  Auth user creation failed for ${email}: ${JSON.stringify(data)}`);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.log(`    ⚠️  Auth user creation error for ${email}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function createUserAccounts(tenantId: string, workspaceId: string | null): Promise<number> {
  logSection('7. User Accounts (12 accounts - 2 per role)');

  // We need bcryptjs - use dynamic import since this is a bun script
  const bcrypt = await import('bcryptjs');

  const roles = ['owner', 'admin', 'manager', 'technician', 'dispatcher', 'viewer'] as const;
  let count = 0;

  console.log('\n  📧 User Credentials (Password for all: $Mahadev@123#):');
  console.log('  ┌────────────────────────────────────────────────────────────────────┐');

  for (const role of roles) {
    for (const num of [1, 2] as const) {
      const email = `${role}${num}@serviceos-demo.com`;
      const plainPassword = USER_PASSWORD;
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const name = `${role.charAt(0).toUpperCase() + role.slice(1)} User ${num}`;

      // Step 1: Create auth user in Supabase Auth
      const authUserId = await createSupabaseAuthUser(email, plainPassword, name, role);

      // Step 2: Use auth user ID if available, otherwise generate a new one
      const userId = authUserId || crypto.randomUUID();

      if (authUserId) {
        log('Auth', `Created auth user for ${email} (id: ${authUserId})`);
      } else {
        log('Auth', `Skipped auth user for ${email} (will create User table record only)`, false);
      }

      // Step 3: Try to insert user record; if email already exists, update it
      const { data, error } = await supabaseFetch('User', 'POST', {
        id: userId,
        email,
        name,
        passwordHash,
        role,
        authProvider: 'email',
        isActive: true,
        tenantId,
        workspaceId,
        updatedAt: new Date().toISOString(),
      });

      if (error && error.includes('23505') && error.includes('already exists')) {
        // User record already exists - update it with new passwordHash and auth ID
        const { data: updateData, error: updateError } = await supabaseFetch(
          'User',
          'PATCH',
          {
            passwordHash,
            name,
            role,
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
          `email=eq.${encodeURIComponent(email)}`
        );

        if (updateError) {
          log('User', `${email} update failed: ${updateError}`, false);
        } else {
          log('User', `${name} <${email}> [${role}] (updated existing)`);
          console.log(`  │  ${email.padEnd(35)} ${plainPassword.padEnd(18)} [${role}]`);
          count++;
        }
      } else if (error) {
        log('User', `${email}: ${error}`, false);
      } else {
        log('User', `${name} <${email}> [${role}]`);
        console.log(`  │  ${email.padEnd(35)} ${plainPassword.padEnd(18)} [${role}]`);
        count++;
      }
    }
  }

  console.log('  └────────────────────────────────────────────────────────────────────┘');

  return count;
}

// ── SQL Migration Output ───────────────────────────────────────────────────

function printSQLMigration() {
  const sql = `-- ============================================
-- ServiceOS: Missing Tables Migration for Supabase
-- ============================================

-- 1. CommunicationProvider
CREATE TABLE IF NOT EXISTS "CommunicationProvider" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sendingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
  "monthlyLimit" INTEGER NOT NULL DEFAULT 30000,
  "sentToday" INTEGER NOT NULL DEFAULT 0,
  "sentThisMonth" INTEGER NOT NULL DEFAULT 0,
  "totalSent" INTEGER NOT NULL DEFAULT 0,
  "totalDelivered" INTEGER NOT NULL DEFAULT 0,
  "totalFailed" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "tenantId" TEXT REFERENCES "Tenant"("id"),
  "workspaceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CommunicationProvider_type_idx" ON "CommunicationProvider"("type");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_provider_idx" ON "CommunicationProvider"("provider");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_status_idx" ON "CommunicationProvider"("status");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_tenantId_idx" ON "CommunicationProvider"("tenantId");

-- 2. Contact
CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "tags" TEXT,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id"),
  "workspaceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX IF NOT EXISTS "Contact_email_idx" ON "Contact"("email");
CREATE INDEX IF NOT EXISTS "Contact_phone_idx" ON "Contact"("phone");
CREATE INDEX IF NOT EXISTS "Contact_createdAt_idx" ON "Contact"("createdAt");

-- 3. Form
CREATE TABLE IF NOT EXISTS "Form" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'lead_capture',
  "status" TEXT NOT NULL DEFAULT 'active',
  "fieldsJson" TEXT NOT NULL DEFAULT '[]',
  "submissionActions" TEXT NOT NULL DEFAULT '[]',
  "fieldMappingJson" TEXT NOT NULL DEFAULT '{}',
  "welcomeMessage" TEXT NOT NULL DEFAULT '',
  "completionMessage" TEXT NOT NULL DEFAULT '',
  "whatsappOwnerTemplate" TEXT NOT NULL DEFAULT '',
  "whatsappUserTemplate" TEXT NOT NULL DEFAULT '',
  "whatsappAiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "embedScriptEnabled" BOOLEAN NOT NULL DEFAULT false,
  "embedIframeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "slug" TEXT UNIQUE,
  "submissions" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tenantId" TEXT REFERENCES "Tenant"("id"),
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Form_tenantId_idx" ON "Form"("tenantId");
CREATE INDEX IF NOT EXISTS "Form_type_idx" ON "Form"("type");
CREATE INDEX IF NOT EXISTS "Form_status_idx" ON "Form"("status");
CREATE INDEX IF NOT EXISTS "Form_slug_idx" ON "Form"("slug");

-- 4. FormResponse
CREATE TABLE IF NOT EXISTS "FormResponse" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "formId" TEXT NOT NULL REFERENCES "Form"("id") ON DELETE CASCADE,
  "dataJson" TEXT NOT NULL DEFAULT '{}',
  "respondent" TEXT,
  "respondentName" TEXT,
  "source" TEXT NOT NULL DEFAULT 'direct',
  "leadId" TEXT,
  "customerId" TEXT,
  "jobId" TEXT,
  "quoteId" TEXT,
  "bookingId" TEXT,
  "actionsResultsJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "FormResponse_formId_idx" ON "FormResponse"("formId");
CREATE INDEX IF NOT EXISTS "FormResponse_source_idx" ON "FormResponse"("source");
CREATE INDEX IF NOT EXISTS "FormResponse_tenantId_idx" ON "FormResponse"("tenantId");
CREATE INDEX IF NOT EXISTS "FormResponse_createdAt_idx" ON "FormResponse"("createdAt");

-- 5. WorkflowAutomation
CREATE TABLE IF NOT EXISTS "WorkflowAutomation" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "triggerType" TEXT NOT NULL,
  "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
  "conditionsJson" TEXT NOT NULL DEFAULT '[]',
  "actionsJson" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMPTZ,
  "lastExecutionStatus" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT REFERENCES "Tenant"("id"),
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WorkflowAutomation_tenantId_idx" ON "WorkflowAutomation"("tenantId");
CREATE INDEX IF NOT EXISTS "WorkflowAutomation_triggerType_idx" ON "WorkflowAutomation"("triggerType");
CREATE INDEX IF NOT EXISTS "WorkflowAutomation_active_idx" ON "WorkflowAutomation"("active");

-- 6. TriggerExecution
CREATE TABLE IF NOT EXISTS "TriggerExecution" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "automationId" TEXT NOT NULL REFERENCES "WorkflowAutomation"("id") ON DELETE CASCADE,
  "triggerEvent" TEXT NOT NULL,
  "triggerPayload" TEXT NOT NULL DEFAULT '{}',
  "conditionsMet" BOOLEAN NOT NULL DEFAULT true,
  "actionsResultsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'success',
  "error" TEXT,
  "durationMs" INTEGER,
  "tenantId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "TriggerExecution_automationId_idx" ON "TriggerExecution"("automationId");
CREATE INDEX IF NOT EXISTS "TriggerExecution_triggerEvent_idx" ON "TriggerExecution"("triggerEvent");
CREATE INDEX IF NOT EXISTS "TriggerExecution_status_idx" ON "TriggerExecution"("status");
CREATE INDEX IF NOT EXISTS "TriggerExecution_tenantId_idx" ON "TriggerExecution"("tenantId");
CREATE INDEX IF NOT EXISTS "TriggerExecution_createdAt_idx" ON "TriggerExecution"("createdAt");

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE "CommunicationProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAutomation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TriggerExecution" ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on CommunicationProvider" ON "CommunicationProvider" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Contact" ON "Contact" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Form" ON "Form" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on FormResponse" ON "FormResponse" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on WorkflowAutomation" ON "WorkflowAutomation" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on TriggerExecution" ON "TriggerExecution" FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Auto-update updatedAt trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_CommunicationProvider_updatedAt ON "CommunicationProvider";
CREATE TRIGGER set_CommunicationProvider_updatedAt
  BEFORE UPDATE ON "CommunicationProvider"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_Contact_updatedAt ON "Contact";
CREATE TRIGGER set_Contact_updatedAt
  BEFORE UPDATE ON "Contact"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_Form_updatedAt ON "Form";
CREATE TRIGGER set_Form_updatedAt
  BEFORE UPDATE ON "Form"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_WorkflowAutomation_updatedAt ON "WorkflowAutomation";
CREATE TRIGGER set_WorkflowAutomation_updatedAt
  BEFORE UPDATE ON "WorkflowAutomation"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

  console.log(sql);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';

  console.log('\n🚀 ServiceOS Supabase Seed Script');
  console.log(`   Mode: ${mode}`);
  console.log(`   Target: ${SUPABASE_URL}`);

  // Print SQL migration
  if (mode === '--sql') {
    printSQLMigration();
    return;
  }

  // Check table existence first
  logSection('0. Pre-flight Checks');

  const tables = ['CommunicationProvider', 'Contact', 'Form', 'FormResponse', 'WorkflowAutomation', 'TriggerExecution'];
  const tableStatus: Record<string, boolean> = {};

  for (const table of tables) {
    const exists = await checkTableExists(table);
    tableStatus[table] = exists;
    log('Check', `${table}: ${exists ? 'EXISTS' : 'MISSING'}`, exists);
  }

  const missingTables = Object.entries(tableStatus)
    .filter(([, exists]) => !exists)
    .map(([name]) => name);

  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    console.log('   Run with --sql flag to get the migration script:');
    console.log('   bun run scripts/seed-supabase.ts --sql');
    console.log('\n   Then paste the SQL into the Supabase SQL Editor.');
    console.log('   After tables are created, re-run this script.\n');

    if (mode !== 'all') {
      return;
    }
    // Still try to proceed - some tables might exist
  }

  // Get tenant info
  const tenant = await getFirstTenant();
  if (!tenant) {
    console.error('\n❌ No tenant found in Supabase. Please create a tenant first.');
    return;
  }
  log('Tenant', `${tenant.name} (${tenant.id})`);

  const workspaceId = await getFirstWorkspace(tenant.id);
  const userId = await getFirstUser(tenant.id);
  log('Workspace', workspaceId || 'None found');
  log('User', userId || 'None found');

  // Seed data tables
  if (mode === 'all' || mode === '--data') {
    const providerCount = await seedCommunicationProviders(tenant.id, workspaceId);
    const contactCount = await seedContacts(tenant.id, workspaceId);
    const forms = await seedForms(tenant.id, workspaceId, userId);
    const responseCount = await seedFormResponses(forms, tenant.id);
    const automations = await seedWorkflowAutomations(tenant.id, workspaceId, userId);
    const executionCount = await seedTriggerExecutions(automations, tenant.id);

    console.log('\n📊 Seed Summary:');
    console.log(`   CommunicationProvider: ${providerCount}/5`);
    console.log(`   Contact: ${contactCount}/15`);
    console.log(`   Form: ${forms.length}/5`);
    console.log(`   FormResponse: ${responseCount}/10`);
    console.log(`   WorkflowAutomation: ${automations.length}/5`);
    console.log(`   TriggerExecution: ${executionCount}/8`);
  }

  // Create user accounts
  if (mode === 'all' || mode === '--users') {
    const userCount = await createUserAccounts(tenant.id, workspaceId);
    console.log(`\n👥 User Accounts: ${userCount}/12 created`);
  }

  console.log('\n✨ Done!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
