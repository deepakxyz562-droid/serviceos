import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Configuration ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── SQL Migration Script ───────────────────────────────────────────────────

const SQL_MIGRATION = `-- ============================================
-- ServiceOS: Missing Tables Migration for Supabase
-- Generated: ${new Date().toISOString()}
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

-- Enable RLS on all new tables
ALTER TABLE "CommunicationProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAutomation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TriggerExecution" ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (using service role key bypasses RLS, but add policy for clarity)
CREATE POLICY "Service role full access on CommunicationProvider" ON "CommunicationProvider" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Contact" ON "Contact" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Form" ON "Form" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on FormResponse" ON "FormResponse" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on WorkflowAutomation" ON "WorkflowAutomation" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on TriggerExecution" ON "TriggerExecution" FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updatedAt triggers
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

-- ============================================
-- Realtime subscriptions (optional)
-- ============================================
-- Uncomment to enable realtime for these tables:
-- ALTER PUBLICATION supabase_realtime ADD TABLE "CommunicationProvider";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "Contact";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "Form";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "FormResponse";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "WorkflowAutomation";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "TriggerExecution";
`;

// ── Table existence check ──────────────────────────────────────────────────

const TABLES_TO_CHECK = [
  'CommunicationProvider',
  'Contact',
  'Form',
  'FormResponse',
  'WorkflowAutomation',
  'TriggerExecution',
];

async function checkTableExists(tableName: string): Promise<boolean> {
  const client = getAdminClient();
  const { error } = await client.from(tableName).select('id').limit(1);
  if (error) {
    const msg = error.message || '';
    // PostgREST errors that indicate the table doesn't exist:
    // - "does not exist" (PostgreSQL standard)
    // - "Could not find the table ... in the schema cache" (PostgREST cache miss)
    // - error code 42P01 (undefined_table)
    if (
      msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('Could not find') ||
      error.code === '42P01'
    ) {
      return false;
    }
    // Other errors (e.g., RLS, empty result) mean table exists
    return true;
  }
  return true;
}

// ── Seed data helpers (reused from seed script) ───────────────────────────

async function getFirstTenant(): Promise<{ id: string; name: string } | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('Tenant')
    .select('id, name')
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as { id: string; name: string };
}

async function getFirstWorkspace(tenantId: string): Promise<string | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('Workspace')
    .select('id')
    .eq('tenantId', tenantId)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

async function getFirstUser(tenantId: string): Promise<string | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('User')
    .select('id')
    .eq('tenantId', tenantId)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

async function seedCommunicationProviders(tenantId: string, workspaceId: string | null): Promise<unknown[]> {
  const client = getAdminClient();
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
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'SMS (Twilio)',
      type: 'sms',
      provider: 'twilio',
      status: 'active',
      configJson: JSON.stringify({ accountSid: 'demo_sid', authToken: 'demo_token', fromNumber: '+1234567890' }),
      isDefault: false,
      sendingEnabled: true,
      dailyLimit: 500,
      monthlyLimit: 15000,
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Email (Amazon SES)',
      type: 'email',
      provider: 'amazon_ses',
      status: 'active',
      configJson: JSON.stringify({ region: 'us-east-1', accessKey: 'demo_key', secretKey: 'demo_secret', fromEmail: 'noreply@serviceos.demo' }),
      isDefault: false,
      sendingEnabled: true,
      dailyLimit: 5000,
      monthlyLimit: 100000,
      tenantId,
      workspaceId,
    },
    {
      id: crypto.randomUUID(),
      name: 'Email (SendGrid)',
      type: 'email',
      provider: 'sendgrid',
      status: 'inactive',
      configJson: JSON.stringify({ apiKey: 'demo_key', fromEmail: 'noreply@serviceos.demo', fromName: 'ServiceOS' }),
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
      configJson: JSON.stringify({ apiKey: 'demo_key', namespace: 'demo_ns' }),
      isDefault: false,
      sendingEnabled: false,
      dailyLimit: 500,
      monthlyLimit: 15000,
      tenantId,
      workspaceId,
    },
  ];

  const results: unknown[] = [];
  for (const provider of providers) {
    const { data, error } = await client
      .from('CommunicationProvider')
      .insert(provider)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting CommunicationProvider "${provider.name}":`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedContacts(tenantId: string, workspaceId: string | null): Promise<unknown[]> {
  const client = getAdminClient();
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

  const results: unknown[] = [];
  for (const contact of contacts) {
    const { data, error } = await client
      .from('Contact')
      .insert(contact)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting Contact "${contact.name}":`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedForms(tenantId: string, workspaceId: string | null, userId: string | null): Promise<{ id: string }[]> {
  const client = getAdminClient();
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

  const results: { id: string }[] = [];
  for (const form of forms) {
    const { data, error } = await client
      .from('Form')
      .insert(form)
      .select('id')
      .single();
    if (error) {
      console.error(`[Seed] Error inserting Form "${form.name}":`, error.message);
    } else {
      results.push(data as { id: string });
    }
  }
  return results;
}

async function seedFormResponses(forms: { id: string }[], tenantId: string): Promise<unknown[]> {
  const client = getAdminClient();
  const sources = ['direct', 'whatsapp', 'embed', 'wordpress', 'webhook'];
  const responses = [
    { formId: forms[0]?.id, dataJson: JSON.stringify({ fullName: 'Alice Cooper', email: 'alice@example.com', phone: '+15550001', service: 'Plumbing', message: 'Leaky faucet in kitchen' }), respondent: 'alice@example.com', respondentName: 'Alice Cooper', source: 'direct', tenantId },
    { formId: forms[0]?.id, dataJson: JSON.stringify({ fullName: 'Bob Builder', email: 'bob@example.com', phone: '+15550002', service: 'Electrical', message: 'Need outlet installation' }), respondent: '+15550002', respondentName: 'Bob Builder', source: 'whatsapp', tenantId },
    { formId: forms[1]?.id, dataJson: JSON.stringify({ fullName: 'Carol Danvers', phone: '+15550003', date: '2025-02-15', time: '10:00', address: '123 Main St', service: 'Cleaning' }), respondent: '+15550003', respondentName: 'Carol Danvers', source: 'embed', tenantId },
    { formId: forms[1]?.id, dataJson: JSON.stringify({ fullName: 'Dave Wilson', phone: '+15550004', date: '2025-02-16', time: '14:00', address: '456 Oak Ave', service: 'HVAC' }), respondent: '+15550004', respondentName: 'Dave Wilson', source: 'direct', tenantId },
    { formId: forms[2]?.id, dataJson: JSON.stringify({ name: 'Eve Taylor', rating: 5, comments: 'Excellent service!', recommend: 'Yes' }), respondent: 'eve@example.com', respondentName: 'Eve Taylor', source: 'direct', tenantId },
    { formId: forms[2]?.id, dataJson: JSON.stringify({ name: 'Frank Miller', rating: 4, comments: 'Good work, slightly late', recommend: 'Yes' }), respondent: '+15550006', respondentName: 'Frank Miller', source: 'whatsapp', tenantId },
    { formId: forms[3]?.id, dataJson: JSON.stringify({ name: 'Grace Lee', satisfaction: 9, timeliness: 'On Time', professionalism: 8, suggestions: 'Better communication about arrival times' }), respondent: 'grace@example.com', respondentName: 'Grace Lee', source: 'embed', tenantId },
    { formId: forms[4]?.id, dataJson: JSON.stringify({ fullName: 'Henry Ford', email: 'henry@example.com', phone: '+15550008', serviceType: 'Landscaping', description: 'Full backyard redesign', budget: '$5000+', urgency: 'This Month' }), respondent: 'henry@example.com', respondentName: 'Henry Ford', source: 'wordpress', tenantId },
    { formId: forms[4]?.id, dataJson: JSON.stringify({ fullName: 'Ivy Chen', email: 'ivy@example.com', phone: '+15550009', serviceType: 'Plumbing', description: 'Bathroom renovation - need full pipe replacement', budget: '$1000-$5000', urgency: 'This Week' }), respondent: '+15550009', respondentName: 'Ivy Chen', source: 'webhook', tenantId },
    { formId: forms[0]?.id, dataJson: JSON.stringify({ fullName: 'Jack Brown', email: 'jack@example.com', phone: '+15550010', service: 'HVAC', message: 'AC not cooling properly' }), respondent: '+15550010', respondentName: 'Jack Brown', source: 'direct', tenantId },
  ];

  const results: unknown[] = [];
  for (const response of responses) {
    if (!response.formId) continue;
    const { data, error } = await client
      .from('FormResponse')
      .insert({ id: crypto.randomUUID(), ...response })
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting FormResponse:`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedWorkflowAutomations(tenantId: string, workspaceId: string | null, userId: string | null): Promise<{ id: string }[]> {
  const client = getAdminClient();
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
      actionsJson: JSON.stringify([{ type: 'assign_lead', config: { strategy: 'best_match' } }, { type: 'send_whatsapp', config: { template: 'lead_assigned', to: 'assignee' } }]),
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
      actionsJson: JSON.stringify([{ type: 'send_email', config: { template: 'invoice_overdue_reminder' } }, { type: 'send_whatsapp', config: { template: 'payment_reminder', to: 'customer' } }]),
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
      actionsJson: JSON.stringify([{ type: 'send_whatsapp', config: { template: 'job_completion_followup', to: 'customer' } }, { type: 'send_email', config: { template: 'review_request' } }]),
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

  const results: { id: string }[] = [];
  for (const automation of automations) {
    const { data, error } = await client
      .from('WorkflowAutomation')
      .insert(automation)
      .select('id')
      .single();
    if (error) {
      console.error(`[Seed] Error inserting WorkflowAutomation "${automation.name}":`, error.message);
    } else {
      results.push(data as { id: string });
    }
  }
  return results;
}

async function seedTriggerExecutions(automations: { id: string }[], tenantId: string): Promise<unknown[]> {
  const client = getAdminClient();
  const executions = [
    { id: crypto.randomUUID(), automationId: automations[0]?.id, triggerEvent: 'lead.created', triggerPayload: JSON.stringify({ leadId: 'demo_lead_1', leadName: 'Alice Cooper', source: 'website' }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_1' }]), status: 'success', durationMs: 245, tenantId, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[0]?.id, triggerEvent: 'lead.created', triggerPayload: JSON.stringify({ leadId: 'demo_lead_2', leadName: 'Bob Builder', source: 'whatsapp' }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'sent', messageId: 'wamid_demo_2' }]), status: 'success', durationMs: 189, tenantId, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[1]?.id, triggerEvent: 'lead.created', triggerPayload: JSON.stringify({ leadId: 'demo_lead_3', leadName: 'Urgent Client', priority: 'high' }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'assign_lead', status: 'assigned', assigneeId: 'demo_emp_1' }, { type: 'send_whatsapp', status: 'sent' }]), status: 'success', durationMs: 412, tenantId, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[1]?.id, triggerEvent: 'lead.created', triggerPayload: JSON.stringify({ leadId: 'demo_lead_4', leadName: 'Medium Priority Client', priority: 'medium' }), conditionsMet: false, actionsResultsJson: JSON.stringify([]), status: 'success', durationMs: 15, tenantId, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[2]?.id, triggerEvent: 'invoice.overdue', triggerPayload: JSON.stringify({ invoiceId: 'demo_inv_1', invoiceNumber: 'INV-001', amount: 1500, daysOverdue: 5 }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_email', status: 'sent' }, { type: 'send_whatsapp', status: 'sent' }]), status: 'success', durationMs: 678, tenantId, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[2]?.id, triggerEvent: 'invoice.overdue', triggerPayload: JSON.stringify({ invoiceId: 'demo_inv_2', invoiceNumber: 'INV-002', amount: 750, daysOverdue: 7 }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_email', status: 'sent' }, { type: 'send_whatsapp', status: 'failed', error: 'Number not on WhatsApp' }]), status: 'partial', durationMs: 834, tenantId, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[3]?.id, triggerEvent: 'job.completed', triggerPayload: JSON.stringify({ jobId: 'demo_job_1', jobTitle: 'Plumbing Repair', customerName: 'Carol Danvers' }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'delivered' }, { type: 'send_email', status: 'sent' }]), status: 'success', durationMs: 356, tenantId, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    { id: crypto.randomUUID(), automationId: automations[4]?.id, triggerEvent: 'customer.created', triggerPayload: JSON.stringify({ customerId: 'demo_cust_1', customerName: 'Dave Wilson', phone: '+15550004' }), conditionsMet: true, actionsResultsJson: JSON.stringify([{ type: 'send_whatsapp', status: 'delivered', messageId: 'wamid_demo_welcome' }]), status: 'success', durationMs: 198, tenantId, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  ];

  const results: unknown[] = [];
  for (const execution of executions) {
    if (!execution.automationId) continue;
    const { data, error } = await client
      .from('TriggerExecution')
      .insert(execution)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting TriggerExecution:`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function createUserAccounts(tenantId: string, workspaceId: string | null): Promise<unknown[]> {
  // Dynamic import for bcryptjs (server-side only)
  const bcrypt = await import('bcryptjs');
  const client = getAdminClient();

  const roles = ['owner', 'admin', 'manager', 'technician', 'dispatcher', 'viewer'];
  const results: unknown[] = [];

  for (const role of roles) {
    for (const num of [1, 2]) {
      const email = `${role}${num}@serviceos-demo.com`;
      const plainPassword = `${role.charAt(0).toUpperCase() + role.slice(1)}${num}@123`;
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const name = `${role.charAt(0).toUpperCase() + role.slice(1)} User ${num}`;

      const { data, error } = await client
        .from('User')
        .insert({
          id: crypto.randomUUID(),
          email,
          name,
          passwordHash,
          role,
          authProvider: 'email',
          isActive: true,
          tenantId,
          workspaceId,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error(`[Seed] Error inserting User "${email}":`, error.message);
      } else {
        results.push(data);
      }
    }
  }

  return results;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'create';

    // ── CREATE action: Check tables & return SQL ──────────────────────────
    if (action === 'create') {
      const tableStatus: Record<string, boolean> = {};
      for (const table of TABLES_TO_CHECK) {
        tableStatus[table] = await checkTableExists(table);
      }

      const allExist = Object.values(tableStatus).every(Boolean);
      const missingTables = Object.entries(tableStatus)
        .filter(([, exists]) => !exists)
        .map(([name]) => name);

      return NextResponse.json({
        success: true,
        allTablesExist: allExist,
        tableStatus,
        missingTables,
        message: allExist
          ? 'All required tables exist in Supabase!'
          : `Missing tables: ${missingTables.join(', ')}. Run the SQL migration script in the Supabase SQL Editor.`,
        sqlMigration: allExist ? null : SQL_MIGRATION,
      });
    }

    // ── SEED action: Seed all tables ──────────────────────────────────────
    if (action === 'seed') {
      const tenant = await getFirstTenant();
      if (!tenant) {
        return NextResponse.json(
          { error: 'No tenant found in Supabase. Please create a tenant first.' },
          { status: 400 }
        );
      }

      const workspaceId = await getFirstWorkspace(tenant.id);
      const userId = await getFirstUser(tenant.id);

      // Verify all tables exist before seeding
      for (const table of TABLES_TO_CHECK) {
        const exists = await checkTableExists(table);
        if (!exists) {
          return NextResponse.json(
            { error: `Table "${table}" does not exist. Run the 'create' action first to get the SQL migration.` },
            { status: 400 }
          );
        }
      }

      const communicationProviders = await seedCommunicationProviders(tenant.id, workspaceId);
      const contacts = await seedContacts(tenant.id, workspaceId);
      const forms = await seedForms(tenant.id, workspaceId, userId);
      const formResponses = await seedFormResponses(forms, tenant.id);
      const automations = await seedWorkflowAutomations(tenant.id, workspaceId, userId);
      const triggerExecutions = await seedTriggerExecutions(automations, tenant.id);

      return NextResponse.json({
        success: true,
        message: 'Seed data inserted successfully!',
        tenant: { id: tenant.id, name: tenant.name },
        counts: {
          communicationProviders: communicationProviders.length,
          contacts: contacts.length,
          forms: forms.length,
          formResponses: formResponses.length,
          workflowAutomations: automations.length,
          triggerExecutions: triggerExecutions.length,
        },
      });
    }

    // ── CREATE-USERS action: Create user accounts ─────────────────────────
    if (action === 'create-users') {
      const tenant = await getFirstTenant();
      if (!tenant) {
        return NextResponse.json(
          { error: 'No tenant found in Supabase. Please create a tenant first.' },
          { status: 400 }
        );
      }

      const workspaceId = await getFirstWorkspace(tenant.id);
      const users = await createUserAccounts(tenant.id, workspaceId);

      const roles = ['owner', 'admin', 'manager', 'technician', 'dispatcher', 'viewer'];
      const credentials = roles.flatMap(role => [1, 2].map(num => ({
        email: `${role}${num}@serviceos-demo.com`,
        password: `${role.charAt(0).toUpperCase() + role.slice(1)}${num}@123`,
        role,
      })));

      return NextResponse.json({
        success: true,
        message: `${users.length} user accounts created!`,
        tenant: { id: tenant.id, name: tenant.name },
        userCount: users.length,
        credentials,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create", "seed", or "create-users".' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[SetupSupabaseTables] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ── GET handler: Return the SQL migration script ───────────────────────────

export async function GET() {
  return NextResponse.json({
    message: 'Use POST with action: "create" | "seed" | "create-users"',
    tables: TABLES_TO_CHECK,
    sqlMigrationPreview: SQL_MIGRATION.substring(0, 500) + '... (use POST action=create for full SQL)',
  });
}
