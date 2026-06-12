-- ============================================
-- ServiceOS: Missing Tables Migration for Supabase
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rmzaxqxzultxetlgsgic/sql
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
  "tenantId" TEXT,
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
  "tenantId" TEXT NOT NULL,
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
  "tenantId" TEXT,
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
  "tenantId" TEXT,
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
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE "CommunicationProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAutomation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TriggerExecution" ENABLE ROW LEVEL SECURITY;

-- Allow full access via service role and anon
CREATE POLICY "Allow all on CommunicationProvider" ON "CommunicationProvider" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Contact" ON "Contact" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Form" ON "Form" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on FormResponse" ON "FormResponse" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on WorkflowAutomation" ON "WorkflowAutomation" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on TriggerExecution" ON "TriggerExecution" FOR ALL USING (true) WITH CHECK (true);

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
CREATE TRIGGER set_CommunicationProvider_updatedAt BEFORE UPDATE ON "CommunicationProvider" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_Contact_updatedAt ON "Contact";
CREATE TRIGGER set_Contact_updatedAt BEFORE UPDATE ON "Contact" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_Form_updatedAt ON "Form";
CREATE TRIGGER set_Form_updatedAt BEFORE UPDATE ON "Form" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_WorkflowAutomation_updatedAt ON "WorkflowAutomation";
CREATE TRIGGER set_WorkflowAutomation_updatedAt BEFORE UPDATE ON "WorkflowAutomation" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
