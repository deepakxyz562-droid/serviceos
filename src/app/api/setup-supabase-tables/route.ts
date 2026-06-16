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

-- 7. OtpVerification
CREATE TABLE IF NOT EXISTS "OtpVerification" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "phone" TEXT NOT NULL,
  "otpCode" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "verifiedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OtpVerification_phone_idx" ON "OtpVerification"("phone");
CREATE INDEX IF NOT EXISTS "OtpVerification_otpCode_idx" ON "OtpVerification"("otpCode");
CREATE INDEX IF NOT EXISTS "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

-- 8. PlatformAuthSettings (singleton)
CREATE TABLE IF NOT EXISTS "PlatformAuthSettings" (
  "id" TEXT PRIMARY KEY DEFAULT 'platform',
  "emailPasswordEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsOtpEnabled" BOOLEAN NOT NULL DEFAULT false,
  "smsOtpProvider" TEXT,
  "smsOtpConfigJson" TEXT NOT NULL DEFAULT '{}',
  "whatsappOtpEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappOtpProvider" TEXT,
  "whatsappOtpAccessToken" TEXT,
  "whatsappOtpPhoneNumberId" TEXT,
  "whatsappOtpBusinessId" TEXT,
  "whatsappOtpTemplate" TEXT,
  "whatsappOtpConfigJson" TEXT NOT NULL DEFAULT '{}',
  "googleEnabled" BOOLEAN NOT NULL DEFAULT false,
  "googleClientId" TEXT,
  "googleClientSecret" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorMethods" TEXT NOT NULL DEFAULT '[]',
  "otpLength" INTEGER NOT NULL DEFAULT 6,
  "otpExpirySeconds" INTEGER NOT NULL DEFAULT 300,
  "maxOtpAttempts" INTEGER NOT NULL DEFAULT 3,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. IntegrationConnection
CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "storeUrl" TEXT,
  "accessToken" TEXT,
  "apiSecret" TEXT,
  "scopesJson" TEXT NOT NULL DEFAULT '[]',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "syncSettingsJson" TEXT NOT NULL DEFAULT '{}',
  "lastSyncAt" TIMESTAMPTZ,
  "lastSyncStatus" TEXT,
  "lastError" TEXT,
  "totalSyncedOrders" INTEGER NOT NULL DEFAULT 0,
  "totalSyncedProducts" INTEGER NOT NULL DEFAULT 0,
  "totalSyncedCustomers" INTEGER NOT NULL DEFAULT 0,
  "webhookUrl" TEXT,
  "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IntegrationConnection_provider_idx" ON "IntegrationConnection"("provider");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_tenantId_idx" ON "IntegrationConnection"("tenantId");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_lastSyncAt_idx" ON "IntegrationConnection"("lastSyncAt");

-- 10. EcommerceOrder
CREATE TABLE IF NOT EXISTS "EcommerceOrder" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "externalOrderId" TEXT NOT NULL,
  "orderNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "financialStatus" TEXT,
  "fulfillmentStatus" TEXT,
  "customerId" TEXT,
  "customerEmail" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippingTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "shippingAddress" TEXT,
  "billingAddress" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "couponCode" TEXT,
  "orderedAt" TIMESTAMPTZ,
  "fulfilledAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "refundedAt" TIMESTAMPTZ,
  "rawDataJson" TEXT NOT NULL DEFAULT '{}',
  "integrationId" TEXT NOT NULL REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "EcommerceOrder_integrationId_externalOrderId_key" ON "EcommerceOrder"("integrationId", "externalOrderId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_status_idx" ON "EcommerceOrder"("status");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_financialStatus_idx" ON "EcommerceOrder"("financialStatus");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_customerId_idx" ON "EcommerceOrder"("customerId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_tenantId_idx" ON "EcommerceOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_orderedAt_idx" ON "EcommerceOrder"("orderedAt");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_integrationId_idx" ON "EcommerceOrder"("integrationId");

-- 11. EcommerceProduct
CREATE TABLE IF NOT EXISTS "EcommerceProduct" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "externalProductId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "productType" TEXT,
  "vendor" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "compareAtPrice" DOUBLE PRECISION,
  "costPrice" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "sku" TEXT,
  "barcode" TEXT,
  "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
  "weight" DOUBLE PRECISION,
  "weightUnit" TEXT NOT NULL DEFAULT 'kg',
  "imagesJson" TEXT NOT NULL DEFAULT '[]',
  "variantsJson" TEXT NOT NULL DEFAULT '[]',
  "optionsJson" TEXT NOT NULL DEFAULT '[]',
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "rawDataJson" TEXT NOT NULL DEFAULT '{}',
  "integrationId" TEXT NOT NULL REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "EcommerceProduct_integrationId_externalProductId_key" ON "EcommerceProduct"("integrationId", "externalProductId");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_status_idx" ON "EcommerceProduct"("status");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_tenantId_idx" ON "EcommerceProduct"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_sku_idx" ON "EcommerceProduct"("sku");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_productType_idx" ON "EcommerceProduct"("productType");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_integrationId_idx" ON "EcommerceProduct"("integrationId");

-- 12. EcommerceSyncLog
CREATE TABLE IF NOT EXISTS "EcommerceSyncLog" (
  "id" TEXT PRIMARY KEY DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 25),
  "syncType" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recordsTotal" INTEGER NOT NULL DEFAULT 0,
  "recordsSynced" INTEGER NOT NULL DEFAULT 0,
  "recordsFailed" INTEGER NOT NULL DEFAULT 0,
  "errorsJson" TEXT NOT NULL DEFAULT '[]',
  "durationMs" INTEGER,
  "integrationId" TEXT NOT NULL REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE,
  "tenantId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_entity_idx" ON "EcommerceSyncLog"("entity");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_status_idx" ON "EcommerceSyncLog"("status");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_tenantId_idx" ON "EcommerceSyncLog"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_integrationId_idx" ON "EcommerceSyncLog"("integrationId");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_createdAt_idx" ON "EcommerceSyncLog"("createdAt");

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
ALTER TABLE "OtpVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformAuthSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EcommerceOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EcommerceProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EcommerceSyncLog" ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (using service role key bypasses RLS, but add policy for clarity)
CREATE POLICY "Service role full access on CommunicationProvider" ON "CommunicationProvider" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Contact" ON "Contact" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Form" ON "Form" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on FormResponse" ON "FormResponse" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on WorkflowAutomation" ON "WorkflowAutomation" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on TriggerExecution" ON "TriggerExecution" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on OtpVerification" ON "OtpVerification" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on PlatformAuthSettings" ON "PlatformAuthSettings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on IntegrationConnection" ON "IntegrationConnection" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on EcommerceOrder" ON "EcommerceOrder" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on EcommerceProduct" ON "EcommerceProduct" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on EcommerceSyncLog" ON "EcommerceSyncLog" FOR ALL USING (true) WITH CHECK (true);

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

DROP TRIGGER IF EXISTS set_IntegrationConnection_updatedAt ON "IntegrationConnection";
CREATE TRIGGER set_IntegrationConnection_updatedAt
  BEFORE UPDATE ON "IntegrationConnection"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_EcommerceOrder_updatedAt ON "EcommerceOrder";
CREATE TRIGGER set_EcommerceOrder_updatedAt
  BEFORE UPDATE ON "EcommerceOrder"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_EcommerceProduct_updatedAt ON "EcommerceProduct";
CREATE TRIGGER set_EcommerceProduct_updatedAt
  BEFORE UPDATE ON "EcommerceProduct"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_PlatformAuthSettings_updatedAt ON "PlatformAuthSettings";
CREATE TRIGGER set_PlatformAuthSettings_updatedAt
  BEFORE UPDATE ON "PlatformAuthSettings"
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
-- ALTER PUBLICATION supabase_realtime ADD TABLE "OtpVerification";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "PlatformAuthSettings";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "IntegrationConnection";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "EcommerceOrder";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "EcommerceProduct";
-- ALTER PUBLICATION supabase_realtime ADD TABLE "EcommerceSyncLog";
`;

// ── Table existence check ──────────────────────────────────────────────────

const TABLES_TO_CHECK = [
  'CommunicationProvider',
  'Contact',
  'Form',
  'FormResponse',
  'WorkflowAutomation',
  'TriggerExecution',
  'OtpVerification',
  'PlatformAuthSettings',
  'IntegrationConnection',
  'EcommerceOrder',
  'EcommerceProduct',
  'EcommerceSyncLog',
  'SubscriptionPlan',
  'PlatformMetric',
  'SecurityEvent',
  'AuditLogEntry',
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

async function seedSubscriptionPlans(): Promise<unknown[]> {
  const client = getAdminClient();
  const plans = [
    {
      id: crypto.randomUUID(),
      name: 'starter',
      displayName: 'Starter',
      description: 'Perfect for small businesses getting started with service management',
      price: 29,
      currency: 'USD',
      billingCycle: 'monthly',
      featuresJson: JSON.stringify({ maxUsers: 3, maxJobs: 100, maxWorkflows: 5, whatsapp: true, email: true, sms: false, ai: false, customDomain: false, whiteLabel: false }),
      limitsJson: JSON.stringify({ seats: 3, aiQuota: 50, whatsappQuota: 500, emailQuota: 2000, smsQuota: 0, storageMb: 512 }),
      isActive: true,
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      name: 'professional',
      displayName: 'Professional',
      description: 'For growing businesses that need advanced automation and AI features',
      price: 79,
      currency: 'USD',
      billingCycle: 'monthly',
      featuresJson: JSON.stringify({ maxUsers: 15, maxJobs: 1000, maxWorkflows: 25, whatsapp: true, email: true, sms: true, ai: true, customDomain: true, whiteLabel: false }),
      limitsJson: JSON.stringify({ seats: 15, aiQuota: 500, whatsappQuota: 2000, emailQuota: 10000, smsQuota: 500, storageMb: 5120 }),
      isActive: true,
      sortOrder: 2,
    },
    {
      id: crypto.randomUUID(),
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For large organizations with custom branding and unlimited scale',
      price: 199,
      currency: 'USD',
      billingCycle: 'monthly',
      featuresJson: JSON.stringify({ maxUsers: -1, maxJobs: -1, maxWorkflows: -1, whatsapp: true, email: true, sms: true, ai: true, customDomain: true, whiteLabel: true, prioritySupport: true, sla: '99.9%' }),
      limitsJson: JSON.stringify({ seats: -1, aiQuota: -1, whatsappQuota: -1, emailQuota: -1, smsQuota: -1, storageMb: -1 }),
      isActive: true,
      sortOrder: 3,
    },
    {
      id: crypto.randomUUID(),
      name: 'trial',
      displayName: 'Free Trial',
      description: '14-day free trial with full Professional features',
      price: 0,
      currency: 'USD',
      billingCycle: 'monthly',
      featuresJson: JSON.stringify({ maxUsers: 5, maxJobs: 50, maxWorkflows: 10, whatsapp: true, email: true, sms: false, ai: true, customDomain: false, whiteLabel: false, trialDays: 14 }),
      limitsJson: JSON.stringify({ seats: 5, aiQuota: 100, whatsappQuota: 200, emailQuota: 500, smsQuota: 0, storageMb: 256, trialDays: 14 }),
      isActive: true,
      sortOrder: 0,
    },
  ];

  const results: unknown[] = [];
  for (const plan of plans) {
    const { data, error } = await client
      .from('SubscriptionPlan')
      .insert(plan)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting SubscriptionPlan "${plan.name}":`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedPlatformMetrics(): Promise<unknown[]> {
  const client = getAdminClient();
  const now = new Date();
  const metrics = [
    { id: crypto.randomUUID(), metric: 'total_tenants', value: 5, dimensionsJson: JSON.stringify({ tier: 'all' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'total_users', value: 21, dimensionsJson: JSON.stringify({ tier: 'all' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'total_leads', value: 10, dimensionsJson: JSON.stringify({ tier: 'all' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'active_subscriptions', value: 4, dimensionsJson: JSON.stringify({ status: 'active' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'mrr', value: 11325, dimensionsJson: JSON.stringify({ currency: 'USD' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'total_tenants', value: 4, dimensionsJson: JSON.stringify({ tier: 'all' }), recordedAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'total_users', value: 18, dimensionsJson: JSON.stringify({ tier: 'all' }), recordedAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'mrr', value: 9800, dimensionsJson: JSON.stringify({ currency: 'USD' }), recordedAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'churn_rate', value: 0.03, dimensionsJson: JSON.stringify({ period: 'monthly' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
    { id: crypto.randomUUID(), metric: 'ai_api_calls', value: 1250, dimensionsJson: JSON.stringify({ provider: 'openai' }), recordedAt: new Date(now.getTime() - 0 * 3600000).toISOString() },
  ];

  const results: unknown[] = [];
  for (const m of metrics) {
    const { data, error } = await client
      .from('PlatformMetric')
      .insert(m)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting PlatformMetric "${m.metric}":`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedSecurityEvents(): Promise<unknown[]> {
  const client = getAdminClient();
  const now = new Date();
  const events = [
    { id: crypto.randomUUID(), eventType: 'login_success', severity: 'info', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ method: 'email' }), createdAt: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'login_failed', severity: 'warning', ip: '10.0.0.55', userAgent: 'curl/7.81.0', metadataJson: JSON.stringify({ method: 'email', reason: 'invalid_password' }), createdAt: new Date(now.getTime() - 4 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'permission_escalation_attempt', severity: 'critical', ip: '203.0.113.42', userAgent: 'Python-urllib/3.9', metadataJson: JSON.stringify({ fromRole: 'viewer', toRole: 'superadmin' }), createdAt: new Date(now.getTime() - 6 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'api_key_created', severity: 'info', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ keyName: 'production-api' }), createdAt: new Date(now.getTime() - 12 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'tenant_suspended', severity: 'warning', metadataJson: JSON.stringify({ reason: 'payment_overdue' }), createdAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'brute_force_detected', severity: 'critical', ip: '198.51.100.77', metadataJson: JSON.stringify({ attempts: 50, window: '5min' }), createdAt: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'data_export', severity: 'info', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ resourceType: 'leads', recordCount: 500 }), createdAt: new Date(now.getTime() - 72 * 3600000).toISOString() },
    { id: crypto.randomUUID(), eventType: 'mfa_enabled', severity: 'info', ip: '192.168.1.101', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ method: 'totp' }), createdAt: new Date(now.getTime() - 96 * 3600000).toISOString() },
  ];

  const results: unknown[] = [];
  for (const event of events) {
    const { data, error } = await client
      .from('SecurityEvent')
      .insert(event)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting SecurityEvent "${event.eventType}":`, error.message);
    } else {
      results.push(data);
    }
  }
  return results;
}

async function seedAuditLogEntries(): Promise<unknown[]> {
  const client = getAdminClient();
  const now = new Date();
  const entries = [
    { id: crypto.randomUUID(), action: 'tenant.create', resourceType: 'Tenant', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ tenantName: 'Acme Services' }), createdAt: new Date(now.getTime() - 1 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'user.promote', resourceType: 'User', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ fromRole: 'viewer', toRole: 'admin' }), createdAt: new Date(now.getTime() - 3 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'feature_flag.toggle', resourceType: 'FeatureFlag', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ flagKey: 'ai_assistant', enabled: true }), createdAt: new Date(now.getTime() - 5 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'subscription.update', resourceType: 'Subscription', ip: '10.0.0.1', userAgent: 'Stripe-Webhook/1.0', metadataJson: JSON.stringify({ plan: 'enterprise', billingCycle: 'annual' }), createdAt: new Date(now.getTime() - 8 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'tenant.suspend', resourceType: 'Tenant', ip: '10.0.0.1', userAgent: 'System/1.0', metadataJson: JSON.stringify({ reason: 'payment_overdue', daysOverdue: 30 }), createdAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'menu_item.reorder', resourceType: 'MenuItemConfig', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ menuKey: 'sidebar', itemsCount: 12 }), createdAt: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'settings.update', resourceType: 'Tenant', ip: '192.168.1.101', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ changedFields: ['whatsappConfig', 'currency'] }), createdAt: new Date(now.getTime() - 72 * 3600000).toISOString() },
    { id: crypto.randomUUID(), action: 'api_key.rotate', resourceType: 'ApiKey', ip: '192.168.1.100', userAgent: 'Mozilla/5.0', metadataJson: JSON.stringify({ keyPrefix: 'sos_prod_' }), createdAt: new Date(now.getTime() - 96 * 3600000).toISOString() },
  ];

  const results: unknown[] = [];
  for (const entry of entries) {
    const { data, error } = await client
      .from('AuditLogEntry')
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.error(`[Seed] Error inserting AuditLogEntry "${entry.action}":`, error.message);
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
      const subscriptionPlans = await seedSubscriptionPlans();
      const platformMetrics = await seedPlatformMetrics();
      const securityEvents = await seedSecurityEvents();
      const auditLogEntries = await seedAuditLogEntries();

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
          subscriptionPlans: subscriptionPlans.length,
          platformMetrics: platformMetrics.length,
          securityEvents: securityEvents.length,
          auditLogEntries: auditLogEntries.length,
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
