-- ==========================================
-- Enterprise SuperAdmin Platform - Supabase Migration
-- ==========================================
-- This SQL creates the new tables and adds new columns to existing tables.
-- Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- for safe idempotent execution.
-- ==========================================

-- ==========================================
-- NEW TABLES
-- ==========================================

-- SubscriptionPlan: Defines available subscription plans for tenants
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL DEFAULT '',
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "featuresJson" TEXT NOT NULL DEFAULT '{}',
  "limitsJson" TEXT NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_name_idx" ON "SubscriptionPlan"("name");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

-- PlatformMetric: Stores time-series platform metrics for the superadmin dashboard
CREATE TABLE IF NOT EXISTS "PlatformMetric" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dimensionsJson" TEXT NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PlatformMetric_metric_idx" ON "PlatformMetric"("metric");
CREATE INDEX IF NOT EXISTS "PlatformMetric_recordedAt_idx" ON "PlatformMetric"("recordedAt");

-- SecurityEvent: Logs security-related events for audit and monitoring
CREATE TABLE IF NOT EXISTS "SecurityEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "userId" TEXT,
  "tenantId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");
CREATE INDEX IF NOT EXISTS "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");
CREATE INDEX IF NOT EXISTS "SecurityEvent_tenantId_idx" ON "SecurityEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- AuditLogEntry: Detailed audit log entries for the superadmin
CREATE TABLE IF NOT EXISTS "AuditLogEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "tenantId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AuditLogEntry_userId_idx" ON "AuditLogEntry"("userId");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_action_idx" ON "AuditLogEntry"("action");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_tenantId_idx" ON "AuditLogEntry"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");

-- ==========================================
-- ADD COLUMNS TO EXISTING TABLES
-- ==========================================

-- Tenant: Add enterprise columns
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whiteLabelJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'us-east-1';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "arr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Subscription: Add quota and usage columns
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "aiQuota" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "whatsappQuota" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "emailQuota" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "smsQuota" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "storageQuotaMb" INTEGER NOT NULL DEFAULT 1024;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "aiUsageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "whatsappUsageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "emailUsageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "smsUsageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "storageUsageMb" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- SubscriptionPlan: Add missing columns (for tables created before this migration)
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
