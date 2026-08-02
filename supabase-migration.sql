-- ====================================================================
-- FIESEROS — SUPABASE MIGRATION (AUTO-GENERATED)
-- Generated from prisma/schema.prisma
--
-- This migration is FULLY IDEMPOTENT and SELF-HEALING:
--   • Every table uses CREATE TABLE IF NOT EXISTS
--   • Every column is ALSO backported via ALTER TABLE ADD COLUMN IF NOT EXISTS
--     (so pre-existing tables missing new columns get fixed automatically)
--   • Every unique constraint drops orphaned indexes first (avoids
--     "relation already exists" errors from partial prior runs)
--   • Every foreign key uses a DO block guard
--   • Every index uses CREATE INDEX IF NOT EXISTS
--
-- Safe to re-run any number of times. Safe to run on fresh DBs AND on
-- DBs that have partial prior migrations.
-- ====================================================================

-- ##########################################
-- PHASE 0: HELPER FUNCTIONS
-- ##########################################

-- Check if a foreign key constraint exists
CREATE OR REPLACE FUNCTION _fk_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1 AND contype = 'f')
$$ LANGUAGE sql;

-- Check if any constraint exists by name (and optional type)
-- type: 'p' (primary key), 'u' (unique), 'f' (foreign key), 'c' (check)
CREATE OR REPLACE FUNCTION _constraint_exists(text, text DEFAULT NULL) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = $1
    AND ($2 IS NULL OR contype = $2)
  )
$$ LANGUAGE sql;

-- Check if an index exists by name
CREATE OR REPLACE FUNCTION _index_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = $1 AND relkind = 'i')
$$ LANGUAGE sql;

-- Check if a column exists on a table
CREATE OR REPLACE FUNCTION _column_exists(text, text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  )
$$ LANGUAGE sql;


-- ##########################################
-- PHASE 1: CREATE TABLES
-- ##########################################


CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "industry" TEXT,
  "logo" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "country" TEXT NOT NULL DEFAULT 'US',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "whatsappPhone" TEXT,
  "whatsappConfigJson" TEXT NOT NULL DEFAULT '{}',
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "planStatus" TEXT NOT NULL DEFAULT 'trial',
  "trialEndsAt" TIMESTAMP(3),
  "planStartedAt" TIMESTAMP(3),
  "planEndsAt" TIMESTAMP(3),
  "settingsJson" TEXT NOT NULL DEFAULT '{}',
  "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  "suspendedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "whiteLabelJson" TEXT NOT NULL DEFAULT '{}',
  "region" TEXT NOT NULL DEFAULT 'us-east-1',
  "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "arr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "businessVerified" BOOLEAN NOT NULL DEFAULT false,
  "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
  "stripeConnected" BOOLEAN NOT NULL DEFAULT false,
  "stripeAccountId" TEXT,
  "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "profileCompletionPct" INTEGER NOT NULL DEFAULT 0,
  "marketplaceOptIn" BOOLEAN NOT NULL DEFAULT false,
  "marketplaceTermsAcceptedAt" TIMESTAMP(3),
  "pricingType" TEXT,
  "callOutFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "travelFeePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emergencySurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weekendSurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emergencyServiceAvailable" BOOLEAN NOT NULL DEFAULT false,
  "vatNumber" TEXT,
  "licenceNumber" TEXT,
  "insuranceProvider" TEXT,
  "insurancePolicyNumber" TEXT,
  "insuranceExpiryDate" TIMESTAMP(3),
  "languagesJson" TEXT NOT NULL DEFAULT '[]',
  "employeesCount" INTEGER NOT NULL DEFAULT 1,
  "businessCategoriesJson" TEXT NOT NULL DEFAULT '[]',
  "publicProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
  "publicSlug" TEXT UNIQUE,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "listingTier" TEXT NOT NULL DEFAULT 'none',
  "claimed" BOOLEAN NOT NULL DEFAULT false,
  "claimedAt" TIMESTAMP(3),
  "tagline" TEXT,
  "description" TEXT,
  "coverImage" TEXT,
  "galleryJson" TEXT NOT NULL DEFAULT '[]',
  "businessHoursJson" TEXT NOT NULL DEFAULT '{}',
  "serviceAreasJson" TEXT NOT NULL DEFAULT '[]',
  "socialLinksJson" TEXT NOT NULL DEFAULT '{}',
  "faqsJson" TEXT NOT NULL DEFAULT '[]',
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "paypalSubscriptionId" TEXT,
  "paypalPlanId" TEXT,
  "paypalOrderId" TEXT,
  "paypalPayerEmail" TEXT,
  "paymentProvider" TEXT NOT NULL DEFAULT 'none',
  "maxUsers" INTEGER NOT NULL DEFAULT 1,
  "maxJobs" INTEGER NOT NULL DEFAULT 100,
  "maxWorkflows" INTEGER NOT NULL DEFAULT 10,
  "featuresJson" TEXT NOT NULL DEFAULT '{}',
  "pausedAt" TIMESTAMP(3),
  "pauseReason" TEXT,
  "pausedById" TEXT,
  "pendingDowngradePlan" TEXT,
  "pendingDowngradeAt" TIMESTAMP(3),
  "pendingDowngradeCycle" TEXT,
  "lastProrationAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastProrationAt" TIMESTAMP(3),
  "seatCount" INTEGER NOT NULL DEFAULT 1,
  "aiQuota" INTEGER NOT NULL DEFAULT 100,
  "whatsappQuota" INTEGER NOT NULL DEFAULT 1000,
  "emailQuota" INTEGER NOT NULL DEFAULT 500,
  "smsQuota" INTEGER NOT NULL DEFAULT 500,
  "storageQuotaMb" INTEGER NOT NULL DEFAULT 1024,
  "aiUsageCount" INTEGER NOT NULL DEFAULT 0,
  "whatsappUsageCount" INTEGER NOT NULL DEFAULT 0,
  "emailUsageCount" INTEGER NOT NULL DEFAULT 0,
  "smsUsageCount" INTEGER NOT NULL DEFAULT 0,
  "storageUsageMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "trialWhatsappCredits" INTEGER NOT NULL DEFAULT 10,
  "trialWhatsappUsed" INTEGER NOT NULL DEFAULT 0,
  "platformWhatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
  "ownWhatsappConnected" BOOLEAN NOT NULL DEFAULT false,
  "ownEmailProviderConnected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "invoiceNumber" TEXT UNIQUE,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'paid',
  "description" TEXT,
  "plan" TEXT NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "paymentProvider" TEXT NOT NULL DEFAULT 'paypal',
  "paypalOrderId" TEXT,
  "paypalCaptureId" TEXT,
  "payerEmail" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'success',
  "description" TEXT,
  "providerResponse" TEXT NOT NULL DEFAULT '{}',
  "paymentProvider" TEXT NOT NULL DEFAULT 'paypal',
  "paypalOrderId" TEXT,
  "paypalCaptureId" TEXT,
  "payerEmail" TEXT,
  "invoiceNumber" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "yearlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "originalMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "originalYearlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountBadge" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "maxUsers" INTEGER NOT NULL DEFAULT 1,
  "maxJobs" INTEGER NOT NULL DEFAULT 100,
  "maxWorkflows" INTEGER NOT NULL DEFAULT 10,
  "aiQuota" INTEGER NOT NULL DEFAULT 100,
  "whatsappQuota" INTEGER NOT NULL DEFAULT 1000,
  "emailQuota" INTEGER NOT NULL DEFAULT 5000,
  "smsQuota" INTEGER NOT NULL DEFAULT 500,
  "storageQuotaMb" INTEGER NOT NULL DEFAULT 1024,
  "featuresJson" TEXT NOT NULL DEFAULT '{}',
  "limitsJson" TEXT NOT NULL DEFAULT '{}',
  "isAddon" BOOLEAN NOT NULL DEFAULT false,
  "parentPlanCode" TEXT,
  "marketplaceAccess" TEXT NOT NULL DEFAULT 'none',
  "popular" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PlanFeatureMatrix" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "planCode" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AddonSubscription" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "addonCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "paymentProvider" TEXT NOT NULL DEFAULT 'none',
  "providerSubscriptionId" TEXT,
  "providerProductId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "nextBillingAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "RecurringJobSchedule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT,
  "templateJobId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "frequency" TEXT NOT NULL DEFAULT 'weekly',
  "dayOfWeek" INTEGER,
  "dayOfMonth" INTEGER,
  "weekOfMonth" INTEGER,
  "timeOfDay" TEXT,
  "durationMins" INTEGER NOT NULL DEFAULT 60,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "lastRunAt" TIMESTAMP(3),
  "lastJobId" TEXT,
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "assigneeIdsJson" TEXT NOT NULL DEFAULT '[]',
  "serviceId" TEXT,
  "branchId" TEXT,
  "visitInstructions" TEXT,
  "checklistIdsJson" TEXT NOT NULL DEFAULT '[]',
  "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ScheduledMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT,
  "jobId" TEXT,
  "invoiceId" TEXT,
  "quoteId" TEXT,
  "bookingId" TEXT,
  "conversationId" TEXT,
  "messageType" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "subject" TEXT,
  "bodyText" TEXT,
  "bodyHtml" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ScheduledExecution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "automationId" TEXT,
  "triggerEvent" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "executedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "actionsJson" TEXT NOT NULL DEFAULT '[]',
  "contextJson" TEXT NOT NULL DEFAULT '{}',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "passwordHash" TEXT,
  "avatar" TEXT,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "authProvider" TEXT NOT NULL DEFAULT 'email',
  "authProviderId" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  "lastLoginAt" TIMESTAMP(3),
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "lastActivityAt" TIMESTAMP(3),
  "loginCount" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "longDescription" TEXT,
  "slug" TEXT,
  "image" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "duration" INTEGER NOT NULL DEFAULT 60,
  "icon" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "checklistId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'new',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "description" TEXT,
  "address" TEXT,
  "serviceType" TEXT,
  "serviceId" TEXT,
  "assignedToId" TEXT,
  "tenantId" TEXT,
  "customerId" TEXT,
  "jobId" TEXT UNIQUE,
  "notesJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
  "imagesJson" TEXT NOT NULL DEFAULT '[]',
  "assessmentImagesJson" TEXT NOT NULL DEFAULT '[]',
  "followUpAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT,
  "jobId" TEXT,
  "bookingId" TEXT,
  "customerId" TEXT,
  "employeeId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "invoiceType" TEXT NOT NULL DEFAULT 'standard',
  "milestoneIndex" INTEGER,
  "parentInvoiceId" TEXT,
  "recurrenceId" TEXT,
  "dueDate" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "RecurringInvoice" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "tenantId" TEXT,
  "customerId" TEXT,
  "jobId" TEXT,
  "frequency" TEXT NOT NULL DEFAULT 'monthly',
  "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "lastRunAt" TIMESTAMP(3),
  "lastInvoiceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "autoChargeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "paymentMethodId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "submittedById" TEXT,
  "submittedByName" TEXT,
  "jobId" TEXT,
  "jobTitle" TEXT,
  "category" TEXT NOT NULL DEFAULT 'General',
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "receiptUrl" TEXT,
  "notes" TEXT,
  "approvedById" TEXT,
  "approvedByName" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "rating" INTEGER NOT NULL DEFAULT 5,
  "comment" TEXT,
  "authorName" TEXT,
  "source" TEXT NOT NULL DEFAULT 'internal',
  "status" TEXT NOT NULL DEFAULT 'published',
  "responseJson" TEXT NOT NULL DEFAULT '{}',
  "externalUrl" TEXT,
  "npsScore" INTEGER,
  "googleReviewId" TEXT,
  "reviewUrl" TEXT,
  "jobId" TEXT UNIQUE,
  "customerId" TEXT,
  "employeeId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "userId" TEXT,
  "tenantId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "addOnsJson" TEXT NOT NULL DEFAULT '[]',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountType" TEXT NOT NULL DEFAULT 'fixed',
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "tenantId" TEXT,
  "customerId" TEXT,
  "leadId" TEXT,
  "dealId" TEXT,
  "jobRequestId" TEXT,
  "jobId" TEXT,
  "validUntil" TIMESTAMP(3),
  "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
  "whatsappSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Form" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "FormResponse" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "formId" TEXT NOT NULL,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "WorkflowAutomation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "triggerType" TEXT NOT NULL,
  "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
  "conditionsJson" TEXT NOT NULL DEFAULT '[]',
  "actionsJson" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMP(3),
  "lastExecutionStatus" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "industry" TEXT,
  "logo" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "planExpiresAt" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  "tenantId" TEXT,
  "settingsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Checklist" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL DEFAULT 'New checklist',
  "category" TEXT NOT NULL DEFAULT 'General',
  "autoAttachJobs" BOOLEAN NOT NULL DEFAULT false,
  "autoAttachAssessments" BOOLEAN NOT NULL DEFAULT false,
  "sectionsJson" TEXT NOT NULL DEFAULT '[]',
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Workflow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "nodesJson" TEXT NOT NULL DEFAULT '[]',
  "edgesJson" TEXT NOT NULL DEFAULT '[]',
  "settingsJson" TEXT NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "folderId" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WorkflowVersion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "message" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Credential" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "encryptedData" TEXT NOT NULL,
  "workspaceId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Execution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "mode" TEXT NOT NULL DEFAULT 'manual',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "finishedAt" TIMESTAMP(3),
  "dataJson" TEXT NOT NULL DEFAULT '{}',
  "errorJson" TEXT,
  "durationMs" INTEGER
);


CREATE TABLE IF NOT EXISTS "ExecutionNodeData" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "executionId" TEXT NOT NULL,
  "nodeName" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "inputJson" TEXT NOT NULL DEFAULT '[]',
  "outputJson" TEXT NOT NULL DEFAULT '[]',
  "errorJson" TEXT,
  "durationMs" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'success'
);


CREATE TABLE IF NOT EXISTS "WebhookRegistration" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'POST',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "ip" TEXT,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scopes" TEXT NOT NULL DEFAULT '[]',
  "lastUsed" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Variable" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "valueEncrypted" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Folder" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Template" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "workflowJson" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "icon" TEXT,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Employee" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'technician',
  "skills" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'available',
  "avatar" TEXT,
  "whatsappId" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completedJobs" INTEGER NOT NULL DEFAULT 0,
  "location" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "workspaceId" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "currentJobId" TEXT UNIQUE,
  "userId" TEXT UNIQUE,
  "lastLocationAt" TIMESTAMP(3),
  "onLeaveUntil" TIMESTAMP(3),
  "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "invitationStatus" TEXT NOT NULL DEFAULT 'none'
);


CREATE TABLE IF NOT EXISTS "EmployeeStatusLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "changedById" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL DEFAULT 'whatsapp',
  "recipient" TEXT NOT NULL,
  "recipientName" TEXT,
  "recipientRole" TEXT,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "externalId" TEXT,
  "jobId" TEXT,
  "employeeId" TEXT,
  "customerId" TEXT,
  "tenantId" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "whatsappId" TEXT,
  "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "passwordHash" TEXT,
  "activationToken" TEXT,
  "activationTokenExpiresAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "invitationSentAt" TIMESTAMP(3),
  "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
  "invitationStatus" TEXT NOT NULL DEFAULT 'none'
);


CREATE TABLE IF NOT EXISTS "Resource" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'driver',
  "status" TEXT NOT NULL DEFAULT 'available',
  "skills" TEXT NOT NULL DEFAULT '[]',
  "location" TEXT,
  "avatar" TEXT,
  "whatsappId" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completedJobs" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobNumber" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "type" TEXT NOT NULL DEFAULT 'service',
  "address" TEXT,
  "pickup" TEXT,
  "dropoff" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "scheduledTime" TEXT,
  "estimatedDuration" INTEGER,
  "quotedAmount" DOUBLE PRECISION,
  "actualStartTime" TIMESTAMP(3),
  "actualEndTime" TIMESTAMP(3),
  "notes" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "assigneeId" TEXT,
  "assigneeName" TEXT,
  "assigneePhone" TEXT,
  "resourceId" TEXT,
  "serviceId" TEXT,
  "checkInLat" DOUBLE PRECISION,
  "checkInLng" DOUBLE PRECISION,
  "checkOutLat" DOUBLE PRECISION,
  "checkOutLng" DOUBLE PRECISION,
  "customerRating" INTEGER,
  "employeeRating" INTEGER,
  "externalId" TEXT,
  "externalSource" TEXT,
  "whatsappMessageId" TEXT,
  "whatsappSessionId" TEXT,
  "assignmentStatus" TEXT,
  "notificationLogJson" TEXT NOT NULL DEFAULT '[]',
  "completionNotes" TEXT,
  "completionPhotosJson" TEXT NOT NULL DEFAULT '[]',
  "completionSignatureData" TEXT,
  "completedAt" TIMESTAMP(3),
  "paymentMethod" TEXT,
  "paymentStatus" TEXT,
  "amountCollected" DOUBLE PRECISION,
  "collectedAt" TIMESTAMP(3),
  "collectedById" TEXT,
  "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
  "visitInstructions" TEXT,
  "customFieldsJson" TEXT NOT NULL DEFAULT '[]',
  "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
  "linkedChecklistsJson" TEXT NOT NULL DEFAULT '[]',
  "linkToRelatedJson" TEXT NOT NULL DEFAULT '[]',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "workspaceId" TEXT,
  "recurringScheduleId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ContactList" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'custom',
  "roleFilter" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ContactListEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactListId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT,
  "employeeId" TEXT,
  "customerId" TEXT,
  "whatsappId" TEXT,
  "avatar" TEXT,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WebhookSource" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL UNIQUE,
  "apiKeyHash" TEXT NOT NULL,
  "apiKeyPrefix" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'universal',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "leadSource" TEXT NOT NULL DEFAULT 'webhook',
  "fieldMapping" TEXT NOT NULL DEFAULT '{}',
  "autoCreateCustomer" BOOLEAN NOT NULL DEFAULT true,
  "sendWhatsApp" BOOLEAN NOT NULL DEFAULT true,
  "whatsappOwnerPhone" TEXT NOT NULL DEFAULT '',
  "whatsappOwnerTemplate" TEXT NOT NULL DEFAULT '',
  "whatsappUserTemplate" TEXT NOT NULL DEFAULT '',
  "whatsappAiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "whatsappTemplate" TEXT NOT NULL DEFAULT 'new_lead',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "totalReceived" INTEGER NOT NULL DEFAULT 0,
  "lastReceived" TIMESTAMP(3),
  "lastError" TEXT,
  "allowedOrigins" TEXT,
  "rateLimitPerMin" INTEGER NOT NULL DEFAULT 30,
  "rateLimitPerHour" INTEGER NOT NULL DEFAULT 200,
  "honeypotEnabled" BOOLEAN NOT NULL DEFAULT true,
  "spamBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WebhookEndpointLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhookEndpointId" TEXT NOT NULL,
  "sourceIp" TEXT,
  "source" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "leadId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'received',
  "error" TEXT,
  "processingMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "WebhookTestRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "path" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "headersJson" TEXT NOT NULL DEFAULT '{}',
  "queryParamsJson" TEXT NOT NULL DEFAULT '{}',
  "bodyJson" TEXT,
  "contentType" TEXT NOT NULL DEFAULT '',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "WhatsAppMessageAction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsappMessageId" TEXT NOT NULL UNIQUE,
  "workflowId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "onSelectWebhookUrl" TEXT,
  "onSelectWorkflowId" TEXT,
  "nodeConfigJson" TEXT NOT NULL DEFAULT '{}',
  "phoneRecipient" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "EventWebhook" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'POST',
  "headersJson" TEXT NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "retryOnFail" BOOLEAN NOT NULL DEFAULT true,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
  "lastTriggered" TIMESTAMP(3),
  "lastStatus" TEXT,
  "lastError" TEXT,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "workspaceId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EventWebhookLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventWebhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "jobId" TEXT,
  "payloadJson" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "error" TEXT,
  "durationMs" INTEGER,
  "retried" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL UNIQUE,
  "customerPhone" TEXT NOT NULL,
  "customerName" TEXT,
  "customerWhatsappId" TEXT,
  "customerId" TEXT,
  "leadId" TEXT UNIQUE,
  "jobId" TEXT UNIQUE,
  "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  "status" TEXT NOT NULL DEFAULT 'active',
  "currentStage" TEXT NOT NULL DEFAULT 'greeting',
  "intentDetected" TEXT,
  "intentConfidence" DOUBLE PRECISION,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "lastMessageBody" TEXT,
  "lastDirection" TEXT,
  "messagesJson" TEXT NOT NULL DEFAULT '[]',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ChannelConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "autoCreateLead" BOOLEAN NOT NULL DEFAULT true,
  "autoReply" BOOLEAN NOT NULL DEFAULT false,
  "autoReplyMessage" TEXT NOT NULL DEFAULT '',
  "webhookUrl" TEXT,
  "leadSourceTag" TEXT NOT NULL DEFAULT '',
  "totalLeads" INTEGER NOT NULL DEFAULT 0,
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3),
  "lastError" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CustomerJourney" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT,
  "jobId" TEXT UNIQUE,
  "leadId" TEXT UNIQUE,
  "currentStage" TEXT NOT NULL DEFAULT 'lead',
  "previousStage" TEXT,
  "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "nextActionAt" TIMESTAMP(3),
  "nextActionType" TEXT,
  "nextActionData" TEXT,
  "automationActive" BOOLEAN NOT NULL DEFAULT true,
  "completedStagesJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CustomerPortalSession" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" TEXT NOT NULL UNIQUE,
  "customerId" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "OtpVerification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" TEXT NOT NULL,
  "otpCode" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "IntegrationConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "workspaceId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "storeUrl" TEXT,
  "accessToken" TEXT,
  "apiSecret" TEXT,
  "scopesJson" TEXT NOT NULL DEFAULT '[]',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "syncSettingsJson" TEXT NOT NULL DEFAULT '{}',
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastError" TEXT,
  "totalSyncedOrders" INTEGER NOT NULL DEFAULT 0,
  "totalSyncedProducts" INTEGER NOT NULL DEFAULT 0,
  "totalSyncedCustomers" INTEGER NOT NULL DEFAULT 0,
  "webhookUrl" TEXT,
  "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EcommerceOrder" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "orderedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "rawDataJson" TEXT NOT NULL DEFAULT '{}',
  "integrationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EcommerceProduct" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "integrationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EcommerceSyncLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "syncType" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recordsTotal" INTEGER NOT NULL DEFAULT 0,
  "recordsSynced" INTEGER NOT NULL DEFAULT 0,
  "recordsFailed" INTEGER NOT NULL DEFAULT 0,
  "errorsJson" TEXT NOT NULL DEFAULT '[]',
  "durationMs" INTEGER,
  "integrationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "dimensionsJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "InboxMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL DEFAULT 'customer',
  "senderId" TEXT,
  "senderName" TEXT,
  "content" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "mediaUrl" TEXT,
  "mediaCaption" TEXT,
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "status" TEXT NOT NULL DEFAULT 'sent',
  "externalId" TEXT,
  "replyToId" TEXT,
  "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
  "mentionsJson" TEXT NOT NULL DEFAULT '[]',
  "reactionsJson" TEXT NOT NULL DEFAULT '[]',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ChatLabel" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "icon" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "ConversationLabel" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  "labelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "ConversationAssignment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "agentName" TEXT,
  "assignedById" TEXT,
  "type" TEXT NOT NULL DEFAULT 'primary',
  "status" TEXT NOT NULL DEFAULT 'active',
  "transferredFrom" TEXT,
  "transferReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TimelineEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorType" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'promotional',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "audienceType" TEXT NOT NULL DEFAULT 'all',
  "audienceId" TEXT,
  "audienceFiltersJson" TEXT NOT NULL DEFAULT '{}',
  "templateId" TEXT,
  "messageContent" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "mediaType" TEXT,
  "ctaText" TEXT,
  "ctaUrl" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "readCount" INTEGER NOT NULL DEFAULT 0,
  "clickedCount" INTEGER NOT NULL DEFAULT 0,
  "repliedCount" INTEGER NOT NULL DEFAULT 0,
  "convertedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  "followUpSequenceJson" TEXT NOT NULL DEFAULT '[]',
  "cloneFromId" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CampaignMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaignId" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "recipientName" TEXT,
  "recipientId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "externalId" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "repliedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "error" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "CampaignTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "content" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "mediaType" TEXT,
  "ctaText" TEXT,
  "ctaUrl" TEXT,
  "variablesJson" TEXT NOT NULL DEFAULT '[]',
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "externalId" TEXT,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "templateType" TEXT NOT NULL DEFAULT 'text',
  "headerText" TEXT,
  "headerMediaUrl" TEXT,
  "headerMediaType" TEXT,
  "footerText" TEXT,
  "buttonsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'published',
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Segment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'dynamic',
  "rulesJson" TEXT NOT NULL DEFAULT '[]',
  "matchLogic" TEXT NOT NULL DEFAULT 'and',
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "lastCalculated" TIMESTAMP(3),
  "color" TEXT,
  "icon" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "SegmentMember" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "segmentId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "RetargetingRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "triggerType" TEXT NOT NULL,
  "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
  "actionType" TEXT NOT NULL,
  "actionConfigJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "cooldownHours" INTEGER NOT NULL DEFAULT 24,
  "maxTriggers" INTEGER NOT NULL DEFAULT 3,
  "triggersToday" INTEGER NOT NULL DEFAULT 0,
  "totalTriggers" INTEGER NOT NULL DEFAULT 0,
  "lastTriggered" TIMESTAMP(3),
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "RetargetingLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ruleId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "actionResult" TEXT,
  "messageContent" TEXT,
  "error" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Chatbot" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "triggerType" TEXT NOT NULL DEFAULT 'keyword',
  "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
  "nodesJson" TEXT NOT NULL DEFAULT '[]',
  "edgesJson" TEXT NOT NULL DEFAULT '[]',
  "startNodeId" TEXT,
  "fallbackNodeId" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "totalSessions" INTEGER NOT NULL DEFAULT 0,
  "activeSessions" INTEGER NOT NULL DEFAULT 0,
  "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ChatbotSession" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "chatbotId" TEXT NOT NULL,
  "customerId" TEXT,
  "customerPhone" TEXT NOT NULL,
  "customerName" TEXT,
  "conversationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "currentNodeId" TEXT,
  "collectedDataJson" TEXT NOT NULL DEFAULT '{}',
  "messagesJson" TEXT NOT NULL DEFAULT '[]',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP(3),
  "tenantId" TEXT
);


CREATE TABLE IF NOT EXISTS "WAForm" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'lead',
  "fieldsJson" TEXT NOT NULL DEFAULT '[]',
  "welcomeMessage" TEXT,
  "completionMessage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WAFormResponse" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "formId" TEXT NOT NULL,
  "respondentPhone" TEXT NOT NULL,
  "respondentName" TEXT,
  "respondentId" TEXT,
  "responsesJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP(3),
  "tenantId" TEXT
);


CREATE TABLE IF NOT EXISTS "WAWebview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'booking',
  "url" TEXT NOT NULL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  "views" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AdCampaign" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'meta',
  "adId" TEXT,
  "adsetName" TEXT,
  "campaignName" TEXT,
  "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'active',
  "leadCount" INTEGER NOT NULL DEFAULT 0,
  "costPerLead" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "conversionCount" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AdConversion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "adCampaignId" TEXT NOT NULL,
  "customerId" TEXT,
  "leadId" TEXT,
  "phone" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'click_to_whatsapp',
  "convertedTo" TEXT,
  "convertedAt" TIMESTAMP(3),
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "JourneyWorkflow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "triggerType" TEXT NOT NULL,
  "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
  "nodesJson" TEXT NOT NULL DEFAULT '[]',
  "edgesJson" TEXT NOT NULL DEFAULT '[]',
  "totalEnrolled" INTEGER NOT NULL DEFAULT 0,
  "activeCount" INTEGER NOT NULL DEFAULT 0,
  "completedCount" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "JourneyExecution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "journeyId" TEXT NOT NULL,
  "customerId" TEXT,
  "customerPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "currentNodeId" TEXT,
  "executedStepsJson" TEXT NOT NULL DEFAULT '[]',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP(3),
  "nextActionAt" TIMESTAMP(3),
  "error" TEXT,
  "tenantId" TEXT
);


CREATE TABLE IF NOT EXISTS "Deal" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "stage" TEXT NOT NULL DEFAULT 'new_lead',
  "probability" INTEGER NOT NULL DEFAULT 10,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "assigneeId" TEXT,
  "assigneeName" TEXT,
  "leadId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'whatsapp',
  "notesJson" TEXT NOT NULL DEFAULT '[]',
  "expectedCloseDate" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "lossReason" TEXT,
  "convertedJobId" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PipelineStage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'request',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isClosedWon" BOOLEAN NOT NULL DEFAULT false,
  "isClosedLost" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PipelineTask" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "dealId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT
);


CREATE TABLE IF NOT EXISTS "DealStageHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "dealId" TEXT NOT NULL,
  "fromStage" TEXT,
  "toStage" TEXT NOT NULL,
  "changedById" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "UnifiedMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "senderId" TEXT,
  "senderName" TEXT,
  "recipientId" TEXT,
  "recipientName" TEXT,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'text',
  "mediaUrl" TEXT,
  "externalId" TEXT,
  "threadId" TEXT,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "MarketplaceTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "workflowJson" TEXT NOT NULL DEFAULT '{}',
  "icon" TEXT,
  "color" TEXT,
  "author" TEXT,
  "authorAvatar" TEXT,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "premium" BOOLEAN NOT NULL DEFAULT false,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "screenshotsJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "role" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "actionsJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AgentMonitor" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentId" TEXT NOT NULL,
  "agentName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'online',
  "activeChats" INTEGER NOT NULL DEFAULT 0,
  "resolvedToday" INTEGER NOT NULL DEFAULT 0,
  "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgResolutionTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerSatisfaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "shiftStart" TEXT,
  "shiftEnd" TEXT,
  "tenantId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL DEFAULT 365,
  "autoDelete" BOOLEAN NOT NULL DEFAULT false,
  "archiveFirst" BOOLEAN NOT NULL DEFAULT true,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ConversationExport" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestedById" TEXT,
  "format" TEXT NOT NULL DEFAULT 'json',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "filtersJson" TEXT NOT NULL DEFAULT '{}',
  "fileUrl" TEXT,
  "recordCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP(3)
);


CREATE TABLE IF NOT EXISTS "CommunicationProvider" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "credentialId" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isPlatform" BOOLEAN NOT NULL DEFAULT false,
  "sendingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
  "monthlyLimit" INTEGER NOT NULL DEFAULT 30000,
  "sentToday" INTEGER NOT NULL DEFAULT 0,
  "sentThisMonth" INTEGER NOT NULL DEFAULT 0,
  "totalSent" INTEGER NOT NULL DEFAULT 0,
  "totalDelivered" INTEGER NOT NULL DEFAULT 0,
  "totalFailed" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "zip" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "customFieldsJson" TEXT NOT NULL DEFAULT '{}',
  "avatarUrl" TEXT,
  "lastActivityAt" TIMESTAMP(3),
  "tags" TEXT,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "description" TEXT,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ContactTag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "appliedById" TEXT
);


CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "type" TEXT NOT NULL DEFAULT 'manual',
  "parentGroupId" TEXT,
  "smartRulesJson" TEXT NOT NULL DEFAULT '{}',
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ContactGroup" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "addedById" TEXT
);


CREATE TABLE IF NOT EXISTS "ContactImport" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "fileName" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'csv',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorJson" TEXT NOT NULL DEFAULT '[]',
  "mappingJson" TEXT NOT NULL DEFAULT '{}',
  "autoGroupId" TEXT,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP(3)
);


CREATE TABLE IF NOT EXISTS "ContactExport" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "format" TEXT NOT NULL DEFAULT 'csv',
  "filterJson" TEXT NOT NULL DEFAULT '{}',
  "totalExported" INTEGER NOT NULL DEFAULT 0,
  "fileUrl" TEXT,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "EmailProvider" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "fromName" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "replyTo" TEXT,
  "usageType" TEXT NOT NULL DEFAULT 'both',
  "isDefaultTransactional" BOOLEAN NOT NULL DEFAULT false,
  "isDefaultMarketing" BOOLEAN NOT NULL DEFAULT false,
  "isPlatform" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastTestAt" TIMESTAMP(3),
  "lastTestStatus" TEXT,
  "lastTestError" TEXT,
  "totalSent" INTEGER NOT NULL DEFAULT 0,
  "totalDelivered" INTEGER NOT NULL DEFAULT 0,
  "totalFailed" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'transactional',
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "variablesJson" TEXT NOT NULL DEFAULT '[]',
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "status" TEXT NOT NULL DEFAULT 'published',
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
  "brandKitId" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TriggerExecution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "automationId" TEXT NOT NULL,
  "triggerEvent" TEXT NOT NULL,
  "triggerPayload" TEXT NOT NULL DEFAULT '{}',
  "conditionsMet" BOOLEAN NOT NULL DEFAULT true,
  "actionsResultsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'success',
  "error" TEXT,
  "durationMs" INTEGER,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "MenuItemConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "menuKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "label" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "section" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "featuresJson" TEXT NOT NULL DEFAULT '{}',
  "limitsJson" TEXT NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PlatformMetric" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dimensionsJson" TEXT NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


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


CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "bookingType" TEXT NOT NULL DEFAULT 'instant',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "employeeId" TEXT,
  "serviceId" TEXT,
  "branchId" TEXT,
  "address" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "scheduledEndTime" TIMESTAMP(3),
  "duration" INTEGER NOT NULL DEFAULT 60,
  "notes" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "rescheduledFrom" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "KnowledgeArticle" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
  "authorId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'general',
  "category" TEXT NOT NULL DEFAULT 'general',
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT,
  "fileSize" INTEGER,
  "accessLevel" TEXT NOT NULL DEFAULT 'admin',
  "customerId" TEXT,
  "jobId" TEXT,
  "employeeId" TEXT,
  "uploadedById" TEXT,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "sharedWithJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "invitedById" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "employeeId" TEXT UNIQUE,
  "customerId" TEXT UNIQUE,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'card',
  "brand" TEXT,
  "last4" TEXT,
  "expMonth" INTEGER,
  "expYear" INTEGER,
  "holderName" TEXT,
  "upiId" TEXT,
  "bankName" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "tokenJson" TEXT NOT NULL DEFAULT '{}',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "HubIntegrationConnection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "integrationKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "credentialsJson" TEXT NOT NULL DEFAULT '{}',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "connectedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "MetaLeadConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL UNIQUE,
  "appId" TEXT,
  "appSecret" TEXT,
  "verifyToken" TEXT,
  "pageId" TEXT,
  "pageName" TEXT,
  "pageAccessToken" TEXT,
  "subscriptionVerified" BOOLEAN NOT NULL DEFAULT false,
  "autoCreateLeads" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "MetaLead" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "leadgenId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "formName" TEXT,
  "pageId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'facebook',
  "adId" TEXT,
  "adName" TEXT,
  "adsetId" TEXT,
  "campaignId" TEXT,
  "campaignName" TEXT,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "city" TEXT,
  "country" TEXT,
  "customFieldsJson" TEXT NOT NULL DEFAULT '{}',
  "rawDataJson" TEXT NOT NULL DEFAULT '{}',
  "leadStatus" TEXT NOT NULL DEFAULT 'new',
  "convertedContactId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "GoogleAdsLeadConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL UNIQUE,
  "clientId" TEXT,
  "clientSecret" TEXT,
  "developerToken" TEXT,
  "refreshToken" TEXT,
  "loginCustomerId" TEXT,
  "accountName" TEXT,
  "autoCreateLeads" BOOLEAN NOT NULL DEFAULT true,
  "lastPollAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "GoogleAdsLead" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "formId" TEXT,
  "formName" TEXT,
  "campaignId" TEXT,
  "campaignName" TEXT,
  "adGroupId" TEXT,
  "resourceName" TEXT,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "postalCode" TEXT,
  "customFieldsJson" TEXT NOT NULL DEFAULT '{}',
  "rawDataJson" TEXT NOT NULL DEFAULT '{}',
  "leadStatus" TEXT NOT NULL DEFAULT 'new',
  "convertedContactId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "BrandKit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL UNIQUE,
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0f766e',
  "secondaryColor" TEXT NOT NULL DEFAULT '#1f2937',
  "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
  "fontFamily" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
  "footerHtml" TEXT,
  "companyName" TEXT,
  "address" TEXT,
  "website" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "socialLinksJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ImageLibrary" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "folder" TEXT NOT NULL DEFAULT 'uploaded',
  "mediaType" TEXT NOT NULL DEFAULT 'image/png',
  "size" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "TemplatePack" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'business',
  "industry" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'Package',
  "color" TEXT NOT NULL DEFAULT '#0f766e',
  "templatesJson" TEXT NOT NULL DEFAULT '[]',
  "isInstalled" BOOLEAN NOT NULL DEFAULT false,
  "installedBy" TEXT,
  "installCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TemplateAsset" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "folder" TEXT NOT NULL DEFAULT 'general',
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "SupportCategory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'FolderOpen',
  "color" TEXT NOT NULL DEFAULT '#0f766e',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "parentId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticketNumber" TEXT NOT NULL UNIQUE,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "categoryId" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "type" TEXT NOT NULL DEFAULT 'general',
  "source" TEXT NOT NULL DEFAULT 'web',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "reporterId" TEXT NOT NULL,
  "reporterEmail" TEXT,
  "reporterName" TEXT,
  "tenantId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "assigneeName" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "satisfactionRating" INTEGER,
  "satisfactionComment" TEXT,
  "firstResponseAt" TIMESTAMP(3),
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticketId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'text',
  "authorId" TEXT NOT NULL,
  "authorName" TEXT,
  "authorRole" TEXT NOT NULL DEFAULT 'user',
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TicketAttachment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" TEXT,
  "ticketId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "mimeType" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "targetRole" TEXT NOT NULL DEFAULT 'all',
  "icon" TEXT NOT NULL DEFAULT 'Bell',
  "color" TEXT NOT NULL DEFAULT '#0f766e',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "tenantId" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AppNotification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "actionUrl" TEXT,
  "actionLabel" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "pushSent" BOOLEAN NOT NULL DEFAULT false,
  "pushSentAt" TIMESTAMP(3),
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "senderId" TEXT,
  "senderType" TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  "typePrefsJson" TEXT NOT NULL DEFAULT '{}',
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "quietHoursTz" TEXT NOT NULL DEFAULT 'Asia/Calcutta',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "keysJson" TEXT NOT NULL DEFAULT '{}',
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'user',
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "entityName" TEXT,
  "description" TEXT NOT NULL,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "CustomerAsset" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "installationDate" TIMESTAMP(3),
  "warrantyStart" TIMESTAMP(3),
  "warrantyEnd" TIMESTAMP(3),
  "warrantyStatus" TEXT NOT NULL DEFAULT 'active',
  "location" TEXT,
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "documentsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "customFieldsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AssetServiceHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "jobId" TEXT,
  "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "serviceType" TEXT,
  "performedBy" TEXT,
  "performedByName" TEXT,
  "notes" TEXT,
  "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "partsReplaced" TEXT,
  "nextServiceDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "JobPhoto" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "customerId" TEXT,
  "photoType" TEXT NOT NULL DEFAULT 'before',
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
  "size" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "capturedBy" TEXT,
  "capturedByName" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "caption" TEXT,
  "notes" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "JobSignature" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "customerId" TEXT,
  "signatoryType" TEXT NOT NULL,
  "signatoryName" TEXT NOT NULL,
  "signatoryRole" TEXT,
  "signatureUrl" TEXT NOT NULL,
  "signatureDataJson" TEXT NOT NULL DEFAULT '{}',
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "JobChecklist" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "customerId" TEXT,
  "templateId" TEXT,
  "name" TEXT NOT NULL,
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "completedByName" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EmployeeShift" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "shiftDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "clockIn" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "clockOut" TIMESTAMP(3),
  "breaksJson" TEXT NOT NULL DEFAULT '[]',
  "totalMinutes" INTEGER NOT NULL DEFAULT 0,
  "workingMinutes" INTEGER NOT NULL DEFAULT 0,
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "travelMinutes" INTEGER NOT NULL DEFAULT 0,
  "clockInLat" DOUBLE PRECISION,
  "clockInLng" DOUBLE PRECISION,
  "clockOutLat" DOUBLE PRECISION,
  "clockOutLng" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'work',
  "jobId" TEXT,
  "isManual" BOOLEAN NOT NULL DEFAULT false,
  "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "editHistoryJson" TEXT NOT NULL DEFAULT '[]'
);


CREATE TABLE IF NOT EXISTS "JobTimeEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endedAt" TIMESTAMP(3),
  "pausesJson" TEXT NOT NULL DEFAULT '[]',
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "pauseMinutes" INTEGER NOT NULL DEFAULT 0,
  "workingMinutes" INTEGER NOT NULL DEFAULT 0,
  "entryType" TEXT NOT NULL DEFAULT 'work',
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "JobVisit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobVisitNumber" INTEGER NOT NULL DEFAULT 1,
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "visitType" TEXT NOT NULL DEFAULT 'visit',
  "instructions" TEXT,
  "scheduledDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "scheduledTime" TEXT,
  "endTime" TEXT,
  "anytime" BOOLEAN NOT NULL DEFAULT true,
  "scheduleLater" BOOLEAN NOT NULL DEFAULT false,
  "repeats" TEXT NOT NULL DEFAULT 'none',
  "repeatInterval" INTEGER NOT NULL DEFAULT 1,
  "repeatWeekdays" TEXT NOT NULL DEFAULT '[]',
  "repeatUntil" TIMESTAMP(3),
  "assigneeIdsJson" TEXT NOT NULL DEFAULT '[]',
  "assigneeNamesJson" TEXT NOT NULL DEFAULT '[]',
  "emailTeam" BOOLEAN NOT NULL DEFAULT false,
  "teamReminder" TEXT NOT NULL DEFAULT 'none',
  "checklistIdsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "GPSLocation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "jobId" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "speed" DOUBLE PRECISION,
  "altitude" DOUBLE PRECISION,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "batteryLevel" DOUBLE PRECISION,
  "isMoving" BOOLEAN NOT NULL DEFAULT false,
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "RouteHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "jobId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endedAt" TIMESTAMP(3),
  "pathJson" TEXT NOT NULL DEFAULT '[]',
  "distanceMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startLat" DOUBLE PRECISION,
  "startLng" DOUBLE PRECISION,
  "endLat" DOUBLE PRECISION,
  "endLng" DOUBLE PRECISION,
  "etaMinutes" INTEGER,
  "arrivedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CustomerTimelineEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "actorId" TEXT,
  "actorName" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'user',
  "eventDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "EmployeePerformance" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "periodType" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
  "jobsAssigned" INTEGER NOT NULL DEFAULT 0,
  "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "travelDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "travelMinutes" INTEGER NOT NULL DEFAULT 0,
  "workingMinutes" INTEGER NOT NULL DEFAULT 0,
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "avgCompletionMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lateArrivals" INTEGER NOT NULL DEFAULT 0,
  "attendanceDays" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "OfflineMutation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "method" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "bodyJson" TEXT NOT NULL DEFAULT '{}',
  "headersJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "responseStatus" INTEGER,
  "responseBodyJson" TEXT,
  "syncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PublicChatSession" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "visitorName" TEXT,
  "visitorPhone" TEXT,
  "visitorEmail" TEXT,
  "visitorFingerprint" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "claimedById" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PublicChatMessage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderId" TEXT,
  "senderName" TEXT,
  "body" TEXT NOT NULL,
  "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "AiAgent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "vapiAssistantId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "totalCalls" INTEGER NOT NULL DEFAULT 0,
  "totalSeconds" INTEGER NOT NULL DEFAULT 0,
  "lastCallAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PhoneNumber" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" TEXT NOT NULL UNIQUE,
  "displayName" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'twilio',
  "capabilities" TEXT NOT NULL DEFAULT 'sms,voice',
  "countryCode" TEXT,
  "type" TEXT NOT NULL DEFAULT 'dedicated',
  "monthlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costCurrency" TEXT NOT NULL DEFAULT 'USD',
  "providerCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentProvider" TEXT,
  "subscriptionId" TEXT,
  "providerSid" TEXT,
  "smsWebhookUrl" TEXT,
  "voiceWebhookUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "releasedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "voiceMode" TEXT,
  "forwardToPhone" TEXT,
  "forwardToVoicemail" TEXT,
  "vapiAssistantId" TEXT,
  "vapiNumberId" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AiPhoneNumber" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "vapiNumberId" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "friendlyName" TEXT,
  "country" TEXT NOT NULL DEFAULT 'US',
  "provider" TEXT NOT NULL DEFAULT 'vapi',
  "assistantId" TEXT,
  "vapiAssistantId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'available',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AiCall" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "vapiCallId" TEXT,
  "callType" TEXT NOT NULL DEFAULT 'inbound',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "phoneNumberId" TEXT,
  "assistantId" TEXT,
  "fromNumber" TEXT,
  "toNumber" TEXT,
  "customerPhone" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "durationSec" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "transcriptJson" TEXT NOT NULL DEFAULT '[]',
  "summary" TEXT,
  "analysisJson" TEXT NOT NULL DEFAULT '{}',
  "customerId" TEXT,
  "leadId" TEXT,
  "functionCallsJson" TEXT NOT NULL DEFAULT '[]',
  "endedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "MarketplaceTransaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "jobId" TEXT,
  "bookingId" TEXT,
  "bookingType" TEXT NOT NULL,
  "serviceDescription" TEXT,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "providerAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paymentIntentId" TEXT,
  "transferId" TEXT,
  "payoutId" TEXT,
  "escrowReleasedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "disputeReason" TEXT,
  "escrowedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "disputedAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "stripeTransferId" TEXT UNIQUE,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "method" TEXT NOT NULL DEFAULT 'stripe_connect',
  "description" TEXT,
  "transactionsJson" TEXT NOT NULL DEFAULT '[]',
  "transactionCount" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failReason" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "FeaturedListing" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'featured',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "amountCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentRef" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AICredit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "totalPurchased" INTEGER NOT NULL DEFAULT 0,
  "totalUsed" INTEGER NOT NULL DEFAULT 0,
  "planQuota" INTEGER NOT NULL DEFAULT 0,
  "planQuotaUsed" INTEGER NOT NULL DEFAULT 0,
  "planQuotaResetAt" TIMESTAMP(3),
  "lastPurchaseAt" TIMESTAMP(3),
  "lastUsageAt" TIMESTAMP(3),
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "UsageCharge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "recipient" TEXT,
  "contentLength" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'charged',
  "providerRef" TEXT,
  "jobId" TEXT,
  "campaignId" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "RevenueFeatureToggle" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "featureKey" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "perTenantOverride" BOOLEAN NOT NULL DEFAULT false,
  "defaultForNewTenants" BOOLEAN NOT NULL DEFAULT true,
  "pricingJson" TEXT NOT NULL DEFAULT '{}',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "AiProviderKey" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "lastError" TEXT,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'US',
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "phone" TEXT,
  "email" TEXT,
  "managerId" TEXT,
  "businessHoursJson" TEXT NOT NULL DEFAULT '{}',
  "serviceAreasJson" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "HolidayCalendar" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "ServiceRegion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'radius',
  "centerLat" DOUBLE PRECISION,
  "centerLng" DOUBLE PRECISION,
  "radiusKm" DOUBLE PRECISION,
  "postcodesJson" TEXT NOT NULL DEFAULT '[]',
  "polygonJson" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "TaxRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'standard',
  "country" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "NumberSequence" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "entity" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT '',
  "suffix" TEXT NOT NULL DEFAULT '',
  "padLength" INTEGER NOT NULL DEFAULT 5,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "resetYearly" BOOLEAN NOT NULL DEFAULT false,
  "includeYear" BOOLEAN NOT NULL DEFAULT true,
  "branchId" TEXT,
  "format" TEXT NOT NULL DEFAULT '{PREFIX}{YEAR}-{SEQ}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CustomField" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "entityType" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "optionsJson" TEXT NOT NULL DEFAULT '[]',
  "defaultValue" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ApprovalFlow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "totalSteps" INTEGER NOT NULL DEFAULT 1,
  "stepsJson" TEXT NOT NULL DEFAULT '[]',
  "initiatedById" TEXT,
  "initiatedByName" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "CommissionRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'technician',
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxAmount" DOUBLE PRECISION,
  "tieredRatesJson" TEXT NOT NULL DEFAULT '[]',
  "appliesTo" TEXT NOT NULL DEFAULT 'all',
  "employeeId" TEXT,
  "branchId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PaymentGatewayConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "gateway" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "isLive" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "supportedCountries" TEXT NOT NULL DEFAULT '[]',
  "supportedCurrencies" TEXT NOT NULL DEFAULT '[]',
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "credentialId" TEXT,
  "featuresJson" TEXT NOT NULL DEFAULT '{}',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PricingRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "serviceId" TEXT,
  "name" TEXT NOT NULL,
  "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pricingType" TEXT NOT NULL DEFAULT 'fixed',
  "callOutFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "travelFeePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emergencySurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weekendSurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "eveningSurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "holidaySurchargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minimumCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maximumCharge" DOUBLE PRECISION,
  "estimatedDurationMins" INTEGER NOT NULL DEFAULT 60,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "conditionsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Assessment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "jobId" TEXT,
  "leadId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "address" TEXT,
  "type" TEXT NOT NULL DEFAULT 'inspection',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "inspectorId" TEXT,
  "inspectorName" TEXT,
  "checklistId" TEXT,
  "checklistResponsesJson" TEXT NOT NULL DEFAULT '{}',
  "measurementsJson" TEXT NOT NULL DEFAULT '{}',
  "findingsJson" TEXT NOT NULL DEFAULT '[]',
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "videosJson" TEXT NOT NULL DEFAULT '[]',
  "droneImagesJson" TEXT NOT NULL DEFAULT '[]',
  "signatureUrl" TEXT,
  "signedAt" TIMESTAMP(3),
  "signedByName" TEXT,
  "generatedQuoteId" TEXT,
  "aiSummary" TEXT,
  "estimatedDurationMins" INTEGER,
  "estimatedCost" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "JobStateTransition" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "jobId" TEXT NOT NULL,
  "fromState" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "transitionReason" TEXT,
  "transitionedById" TEXT,
  "transitionedByName" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "QualityInspection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "jobId" TEXT NOT NULL,
  "inspectorId" TEXT,
  "inspectorName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checklistId" TEXT,
  "responsesJson" TEXT NOT NULL DEFAULT '{}',
  "score" INTEGER,
  "findingsJson" TEXT NOT NULL DEFAULT '[]',
  "reworkNotes" TEXT,
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "customerNotifiedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "resolvedByName" TEXT,
  "resolutionNotes" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "RequestExtraction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "leadId" TEXT,
  "rawText" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'whatsapp',
  "extractedCategory" TEXT,
  "extractedIndustry" TEXT,
  "extractedService" TEXT,
  "extractedUrgency" TEXT,
  "extractedBudget" DOUBLE PRECISION,
  "extractedBudgetCurrency" TEXT,
  "extractedLocation" TEXT,
  "extractedSkillsJson" TEXT NOT NULL DEFAULT '[]',
  "extractedDurationMins" INTEGER,
  "estimatedCostLow" DOUBLE PRECISION,
  "estimatedCostHigh" DOUBLE PRECISION,
  "suggestedBookingMode" TEXT,
  "confidenceScore" DOUBLE PRECISION,
  "aiModel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "branchId" TEXT,
  "sku" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "unit" TEXT NOT NULL DEFAULT 'each',
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "totalStock" INTEGER NOT NULL DEFAULT 0,
  "reservedStock" INTEGER NOT NULL DEFAULT 0,
  "availableStock" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 0,
  "reorderQty" INTEGER NOT NULL DEFAULT 0,
  "supplierId" TEXT,
  "supplierSku" TEXT,
  "barcode" TEXT,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "type" TEXT NOT NULL DEFAULT 'main',
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "StockLocation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "inventoryItemId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "employeeId" TEXT,
  "vehicleId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "locationCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "website" TEXT,
  "paymentTerms" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "poNumber" TEXT,
  "supplierId" TEXT,
  "branchId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "orderDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "expectedDate" TIMESTAMP(3),
  "receivedDate" TIMESTAMP(3),
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "StockTransfer" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "fromWarehouseId" TEXT,
  "toWarehouseId" TEXT,
  "fromEmployeeId" TEXT,
  "toEmployeeId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "transferDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "receivedDate" TIMESTAMP(3),
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "StockTransaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "inventoryItemId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'in',
  "quantity" INTEGER NOT NULL,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reference" TEXT,
  "referenceId" TEXT,
  "notes" TEXT,
  "performedById" TEXT,
  "performedByName" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "LowStockAlert" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "inventoryItemId" TEXT NOT NULL,
  "currentStock" INTEGER NOT NULL,
  "reorderLevel" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "acknowledgedById" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "ServicePlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "industry" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "setupFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "inspectionsPerYear" INTEGER NOT NULL DEFAULT 2,
  "prioritySupport" BOOLEAN NOT NULL DEFAULT true,
  "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "emergencyVisits" INTEGER NOT NULL DEFAULT 0,
  "featuresJson" TEXT NOT NULL DEFAULT '[]',
  "contractLengthMonths" INTEGER,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "cancellationNoticeDays" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ServicePlanSubscription" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "servicePlanId" TEXT NOT NULL,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "nextBillingDate" TIMESTAMP(3),
  "lastBilledDate" TIMESTAMP(3),
  "inspectionsUsed" INTEGER NOT NULL DEFAULT 0,
  "emergencyVisitsUsed" INTEGER NOT NULL DEFAULT 0,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "recurringInvoiceId" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Warranty" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "jobId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'standard',
  "coverage" TEXT NOT NULL DEFAULT 'parts_and_labor',
  "durationMonths" INTEGER NOT NULL DEFAULT 12,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "termsJson" TEXT NOT NULL DEFAULT '{}',
  "maxClaims" INTEGER NOT NULL DEFAULT 1,
  "claimsUsed" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "WarrantyClaim" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "warrantyId" TEXT NOT NULL,
  "jobId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "assignedToId" TEXT,
  "assignedToName" TEXT,
  "resolutionNotes" TEXT,
  "resolutionType" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "resolvedByName" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "JobRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "industry" TEXT,
  "serviceId" TEXT,
  "serviceName" TEXT,
  "urgency" TEXT NOT NULL DEFAULT 'medium',
  "budgetLow" DOUBLE PRECISION,
  "budgetHigh" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "videosJson" TEXT NOT NULL DEFAULT '[]',
  "address" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "aiExtractionId" TEXT,
  "aiSummary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "expiresAt" TIMESTAMP(3),
  "acceptedQuoteId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "quoteCount" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "EmergencyDispatch" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "industry" TEXT,
  "urgency" TEXT NOT NULL DEFAULT 'emergency',
  "address" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'broadcasting',
  "broadcastToIds" TEXT NOT NULL DEFAULT '[]',
  "acceptedById" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "acceptedQuoteId" TEXT,
  "providerEnRouteAt" TIMESTAMP(3),
  "providerOnSiteAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "estimatedArrivalMins" INTEGER,
  "actualArrivalMins" INTEGER,
  "estimatedCost" DOUBLE PRECISION,
  "finalCost" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ProviderPortfolio" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT UNIQUE,
  "itemsJson" TEXT NOT NULL DEFAULT '[]',
  "videosJson" TEXT NOT NULL DEFAULT '[]',
  "awardsJson" TEXT NOT NULL DEFAULT '[]',
  "projectsJson" TEXT NOT NULL DEFAULT '[]',
  "teamJson" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "ProviderCertification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "issuer" TEXT,
  "issueDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "certificateNumber" TEXT,
  "documentUrl" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "name" TEXT NOT NULL,
  "tier" TEXT NOT NULL DEFAULT 'standard',
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "benefitsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "code" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "minSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxDiscount" DOUBLE PRECISION,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "endDate" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "perCustomerLimit" INTEGER NOT NULL DEFAULT 1,
  "applicableServicesJson" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "promotionId" TEXT,
  "code" TEXT NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'percentage',
  "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "usedAt" TIMESTAMP(3),
  "usedOnJobId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "LoyaltyPoint" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "customerId" TEXT,
  "points" INTEGER NOT NULL DEFAULT 0,
  "totalEarned" INTEGER NOT NULL DEFAULT 0,
  "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
  "tier" TEXT NOT NULL DEFAULT 'bronze',
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS "Referral" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "referrerCustomerId" TEXT,
  "referrerName" TEXT,
  "referrerPhone" TEXT,
  "referredName" TEXT,
  "referredPhone" TEXT,
  "referredEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "rewardType" TEXT,
  "rewardValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "convertedAt" TIMESTAMP(3),
  "rewardedAt" TIMESTAMP(3),
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);


-- ##########################################
-- PHASE 2: BACKPORT COLUMNS
-- (ensures pre-existing tables get any missing columns)
-- ##########################################


ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'starter';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "planStatus" TEXT DEFAULT 'trial';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "planEndsAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "settingsJson" TEXT DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whiteLabelJson" TEXT DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "region" TEXT DEFAULT 'us-east-1';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mrr" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "arr" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "churnRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "insuranceVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeConnected" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "profileCompletionPct" INTEGER DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "marketplaceOptIn" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "marketplaceTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "pricingType" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "callOutFee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "travelFeePerKm" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "emergencySurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "weekendSurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "emergencyServiceAvailable" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "licenceNumber" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "insuranceExpiryDate" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "languagesJson" TEXT DEFAULT '[]';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "employeesCount" INTEGER DEFAULT 1;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessCategoriesJson" TEXT DEFAULT '[]';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "publicProfileEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "listingTier" TEXT DEFAULT 'none';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "claimed" BOOLEAN DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "galleryJson" TEXT DEFAULT '[]';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessHoursJson" TEXT DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "serviceAreasJson" TEXT DEFAULT '[]';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "socialLinksJson" TEXT DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "faqsJson" TEXT DEFAULT '[]';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'trial';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paypalSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paypalPlanId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paypalPayerEmail" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'none';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER DEFAULT 1;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "maxJobs" INTEGER DEFAULT 100;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "maxWorkflows" INTEGER DEFAULT 10;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT DEFAULT '{}';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pauseReason" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pausedById" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingDowngradePlan" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingDowngradeAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingDowngradeCycle" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastProrationAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastProrationAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER DEFAULT 1;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "aiQuota" INTEGER DEFAULT 100;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "whatsappQuota" INTEGER DEFAULT 1000;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "emailQuota" INTEGER DEFAULT 500;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "smsQuota" INTEGER DEFAULT 500;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "storageQuotaMb" INTEGER DEFAULT 1024;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "aiUsageCount" INTEGER DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "whatsappUsageCount" INTEGER DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "emailUsageCount" INTEGER DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "smsUsageCount" INTEGER DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "storageUsageMb" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialWhatsappCredits" INTEGER DEFAULT 10;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialWhatsappUsed" INTEGER DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "platformWhatsappEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "ownWhatsappConnected" BOOLEAN DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "ownEmailProviderConnected" BOOLEAN DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'paid';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'paypal';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "payerEmail" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "refundAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'success';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "providerResponse" TEXT DEFAULT '{}';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'paypal';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "payerEmail" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "metadata" TEXT DEFAULT '{}';
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "monthlyPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "yearlyPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "originalMonthlyPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "originalYearlyPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "discountBadge" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER DEFAULT 1;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxJobs" INTEGER DEFAULT 100;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxWorkflows" INTEGER DEFAULT 10;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "aiQuota" INTEGER DEFAULT 100;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappQuota" INTEGER DEFAULT 1000;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "emailQuota" INTEGER DEFAULT 5000;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "smsQuota" INTEGER DEFAULT 500;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "storageQuotaMb" INTEGER DEFAULT 1024;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT DEFAULT '{}';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "limitsJson" TEXT DEFAULT '{}';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isAddon" BOOLEAN DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "parentPlanCode" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "marketplaceAccess" TEXT DEFAULT 'none';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "popular" BOOLEAN DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "planCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "featureKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT false;
ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PlanFeatureMatrix" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "addonCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'none';
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT;
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "providerProductId" TEXT;
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "nextBillingAt" TIMESTAMP(3);
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AddonSubscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "templateJobId" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "frequency" TEXT DEFAULT 'weekly';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "dayOfWeek" INTEGER;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "dayOfMonth" INTEGER;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "weekOfMonth" INTEGER;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "timeOfDay" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "durationMins" INTEGER DEFAULT 60;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "lastJobId" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "executionCount" INTEGER DEFAULT 0;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "assigneeIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "visitInstructions" TEXT;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "checklistIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "lineItemsJson" TEXT DEFAULT '[]';
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringJobSchedule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "messageType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'email';
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "recipientEmail" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "bodyText" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "automationId" TEXT;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "triggerEvent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "delayMinutes" INTEGER DEFAULT 0;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP(3);
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "actionsJson" TEXT DEFAULT '[]';
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "contextJson" TEXT DEFAULT '{}';
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ScheduledExecution" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'owner';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'email';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProviderId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginCount" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "longDescription" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "basePrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 60;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "checklistId" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'new';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "serviceType" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "notesJson" TEXT DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lineItemsJson" TEXT DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "imagesJson" TEXT DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assessmentImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "number" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tax" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "total" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION DEFAULT 1;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "baseAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceType" TEXT DEFAULT 'standard';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "milestoneIndex" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "parentInvoiceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "recurrenceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "frequency" TEXT DEFAULT 'monthly';
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "dayOfMonth" INTEGER DEFAULT 1;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "taxPercent" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "lastInvoiceId" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "executionCount" INTEGER DEFAULT 0;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "autoChargeEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RecurringInvoice" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "number" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "employeeName" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "submittedByName" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'General';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "expenseDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "approvedByName" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "rating" INTEGER DEFAULT 5;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "comment" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'internal';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'published';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseJson" TEXT DEFAULT '{}';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "npsScore" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "googleReviewId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "reviewUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'info';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "read" BOOLEAN DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "addOnsJson" TEXT DEFAULT '[]';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "tax" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discountType" TEXT DEFAULT 'fixed';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "total" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION DEFAULT 1;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "baseAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "jobRequestId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "whatsappSent" BOOLEAN DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "whatsappSentAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'lead_capture';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "fieldsJson" TEXT DEFAULT '[]';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "submissionActions" TEXT DEFAULT '[]';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "fieldMappingJson" TEXT DEFAULT '{}';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT DEFAULT '';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "completionMessage" TEXT DEFAULT '';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "whatsappOwnerTemplate" TEXT DEFAULT '';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "whatsappUserTemplate" TEXT DEFAULT '';
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "whatsappAiGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "embedScriptEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "embedIframeEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "submissions" INTEGER DEFAULT 0;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "conversionRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "formId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "dataJson" TEXT DEFAULT '{}';
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "respondent" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "respondentName" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'direct';
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "actionsResultsJson" TEXT DEFAULT '{}';
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "triggerConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "conditionsJson" TEXT DEFAULT '[]';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "actionsJson" TEXT DEFAULT '[]';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "executionCount" INTEGER DEFAULT 0;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "lastExecutedAt" TIMESTAMP(3);
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "lastExecutionStatus" TEXT;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WorkflowAutomation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'free';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "settingsJson" TEXT DEFAULT '{}';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "title" TEXT DEFAULT 'New checklist';
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'General';
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "autoAttachJobs" BOOLEAN DEFAULT false;
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "autoAttachAssessments" BOOLEAN DEFAULT false;
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "sectionsJson" TEXT DEFAULT '[]';
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Checklist" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "nodesJson" TEXT DEFAULT '[]';
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "edgesJson" TEXT DEFAULT '[]';
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "settingsJson" TEXT DEFAULT '{}';
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT false;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "tags" TEXT DEFAULT '[]';
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "folderId" TEXT;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "workflowId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "snapshotJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "WorkflowVersion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "encryptedData" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "workflowId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'running';
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "mode" TEXT DEFAULT 'manual';
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "dataJson" TEXT DEFAULT '{}';
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "errorJson" TEXT;
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;

ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "executionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "nodeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "nodeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "inputJson" TEXT DEFAULT '[]';
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "outputJson" TEXT DEFAULT '[]';
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "errorJson" TEXT;
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "ExecutionNodeData" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'success';

ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "workflowId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "path" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'POST';
ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "WebhookRegistration" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "resourceType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "resourceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "scopes" TEXT DEFAULT '[]';
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "lastUsed" TIMESTAMP(3);
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "valueEncrypted" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Variable" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "workflowJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN DEFAULT false;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER DEFAULT 0;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'technician';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "skills" TEXT DEFAULT '[]';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'available';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "whatsappId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "completedJobs" INTEGER DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "currentJobId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "onLeaveUntil" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hourlyRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "invitationStatus" TEXT DEFAULT 'none';

ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "fromStatus" TEXT;
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "toStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "changedById" TEXT;
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "EmployeeStatusLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'whatsapp';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "recipient" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "whatsappId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "preferredCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "activationToken" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "activationTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "invitationStatus" TEXT DEFAULT 'none';

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'driver';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'available';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "skills" TEXT DEFAULT '[]';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "whatsappId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "completedJobs" INTEGER DEFAULT 0;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "jobNumber" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'service';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "pickup" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "dropoff" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "scheduledTime" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "estimatedDuration" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "quotedAmount" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "actualStartTime" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "actualEndTime" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "assigneeName" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "assigneePhone" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "resourceId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "checkInLat" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "checkInLng" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "checkOutLat" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "checkOutLng" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerRating" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "employeeRating" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "whatsappMessageId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "whatsappSessionId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "assignmentStatus" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "notificationLogJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "completionNotes" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "completionPhotosJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "completionSignatureData" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "amountCollected" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "collectedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "collectedById" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "lineItemsJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "visitInstructions" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customFieldsJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "attachmentsJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "linkedChecklistsJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "linkToRelatedJson" TEXT DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "recurringScheduleId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'custom';
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "roleFilter" TEXT;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ContactList" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "contactListId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "whatsappId" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT;
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ContactListEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WebhookSource" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "endpointId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "apiKeyHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "apiKeyPrefix" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'universal';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "leadSource" TEXT DEFAULT 'webhook';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "fieldMapping" TEXT DEFAULT '{}';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "autoCreateCustomer" BOOLEAN DEFAULT true;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "sendWhatsApp" BOOLEAN DEFAULT true;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "whatsappOwnerPhone" TEXT DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "whatsappOwnerTemplate" TEXT DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "whatsappUserTemplate" TEXT DEFAULT '';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "whatsappAiGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "whatsappTemplate" TEXT DEFAULT 'new_lead';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "totalReceived" INTEGER DEFAULT 0;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "lastReceived" TIMESTAMP(3);
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "allowedOrigins" TEXT;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "rateLimitPerMin" INTEGER DEFAULT 30;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "rateLimitPerHour" INTEGER DEFAULT 200;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "honeypotEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "spamBlockedCount" INTEGER DEFAULT 0;
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "webhookEndpointId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "sourceIp" TEXT;
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "payloadJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'received';
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "processingMs" INTEGER;
ALTER TABLE "WebhookEndpointLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "path" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "headersJson" TEXT DEFAULT '{}';
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "queryParamsJson" TEXT DEFAULT '{}';
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "bodyJson" TEXT;
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "contentType" TEXT DEFAULT '';
ALTER TABLE "WebhookTestRequest" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "whatsappMessageId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "workflowId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "nodeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "onSelectWebhookUrl" TEXT;
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "onSelectWorkflowId" TEXT;
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "nodeConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "phoneRecipient" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WhatsAppMessageAction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "event" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'POST';
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "headersJson" TEXT DEFAULT '{}';
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "retryOnFail" BOOLEAN DEFAULT true;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "maxRetries" INTEGER DEFAULT 3;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "timeoutMs" INTEGER DEFAULT 10000;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "lastTriggered" TIMESTAMP(3);
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "lastStatus" TEXT;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "failCount" INTEGER DEFAULT 0;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EventWebhook" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "eventWebhookId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "event" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "payloadJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "responseStatus" INTEGER;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "responseBody" TEXT;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "retried" BOOLEAN DEFAULT false;
ALTER TABLE "EventWebhookLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "customerWhatsappId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'whatsapp';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "currentStage" TEXT DEFAULT 'greeting';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "intentDetected" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "intentConfidence" DOUBLE PRECISION;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessageBody" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastDirection" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "messagesJson" TEXT DEFAULT '[]';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "autoCreateLead" BOOLEAN DEFAULT true;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "autoReply" BOOLEAN DEFAULT false;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "autoReplyMessage" TEXT DEFAULT '';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "leadSourceTag" TEXT DEFAULT '';
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "totalLeads" INTEGER DEFAULT 0;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "totalMessages" INTEGER DEFAULT 0;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ChannelConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "currentStage" TEXT DEFAULT 'lead';
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "previousStage" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "stageChangedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "nextActionAt" TIMESTAMP(3);
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "nextActionType" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "nextActionData" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "automationActive" BOOLEAN DEFAULT true;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "completedStagesJson" TEXT DEFAULT '[]';
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomerJourney" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "token" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerPortalSession" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "otpCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'whatsapp';
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "failCount" INTEGER DEFAULT 0;
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "IntegrationConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'disconnected';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "storeUrl" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "apiSecret" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "scopesJson" TEXT DEFAULT '[]';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "syncSettingsJson" TEXT DEFAULT '{}';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "lastSyncStatus" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "totalSyncedOrders" INTEGER DEFAULT 0;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "totalSyncedProducts" INTEGER DEFAULT 0;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "totalSyncedCustomers" INTEGER DEFAULT 0;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "webhookVerified" BOOLEAN DEFAULT false;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "financialStatus" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "total" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "discountTotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "taxTotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "shippingTotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "orderedAt" TIMESTAMP(3);
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "rawDataJson" TEXT DEFAULT '{}';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "integrationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EcommerceOrder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "externalProductId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "productType" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "compareAtPrice" DOUBLE PRECISION;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "inventoryQuantity" INTEGER DEFAULT 0;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "weightUnit" TEXT DEFAULT 'kg';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "imagesJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "variantsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "optionsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "rawDataJson" TEXT DEFAULT '{}';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "integrationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EcommerceProduct" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "syncType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "entity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "recordsTotal" INTEGER DEFAULT 0;
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "recordsSynced" INTEGER DEFAULT 0;
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "recordsFailed" INTEGER DEFAULT 0;
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "errorsJson" TEXT DEFAULT '[]';
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "integrationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EcommerceSyncLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "date" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "metric" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "dimensionsJson" TEXT DEFAULT '{}';
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "senderType" TEXT DEFAULT 'customer';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "messageType" TEXT DEFAULT 'text';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "mediaCaption" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "direction" TEXT DEFAULT 'inbound';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "isInternalNote" BOOLEAN DEFAULT false;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "mentionsJson" TEXT DEFAULT '[]';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "reactionsJson" TEXT DEFAULT '[]';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#10b981';
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ChatLabel" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "ConversationLabel" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ConversationLabel" ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConversationLabel" ADD COLUMN IF NOT EXISTS "labelId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConversationLabel" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "agentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "agentName" TEXT;
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "assignedById" TEXT;
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'primary';
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "transferredFrom" TEXT;
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "transferReason" TEXT;
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ConversationAssignment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "eventType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "actorName" TEXT;
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "actorType" TEXT;
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'promotional';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "audienceType" TEXT DEFAULT 'all';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "audienceId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "audienceFiltersJson" TEXT DEFAULT '{}';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "messageContent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mediaType" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "ctaText" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "ctaUrl" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "totalRecipients" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "sentCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "deliveredCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "readCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "clickedCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "repliedCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "convertedCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "failedCount" INTEGER DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "revenueGenerated" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'whatsapp';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "followUpSequenceJson" TEXT DEFAULT '[]';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "cloneFromId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "campaignId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "CampaignMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "mediaType" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "ctaText" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "ctaUrl" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "variablesJson" TEXT DEFAULT '[]';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT false;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER DEFAULT 0;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "templateType" TEXT DEFAULT 'text';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerText" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerMediaUrl" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerMediaType" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "footerText" TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "buttonsJson" TEXT DEFAULT '[]';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'published';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN DEFAULT false;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'dynamic';
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "rulesJson" TEXT DEFAULT '[]';
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "matchLogic" TEXT DEFAULT 'and';
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "memberCount" INTEGER DEFAULT 0;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "lastCalculated" TIMESTAMP(3);
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS "segmentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS "addedAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "triggerConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "actionType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "actionConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "cooldownHours" INTEGER DEFAULT 24;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "maxTriggers" INTEGER DEFAULT 3;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "triggersToday" INTEGER DEFAULT 0;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "totalTriggers" INTEGER DEFAULT 0;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "lastTriggered" TIMESTAMP(3);
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RetargetingRule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "ruleId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "actionType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "actionResult" TEXT;
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "messageContent" TEXT;
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RetargetingLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "triggerType" TEXT DEFAULT 'keyword';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "triggerConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "nodesJson" TEXT DEFAULT '[]';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "edgesJson" TEXT DEFAULT '[]';
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "startNodeId" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "fallbackNodeId" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "totalSessions" INTEGER DEFAULT 0;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "activeSessions" INTEGER DEFAULT 0;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "completionRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Chatbot" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "chatbotId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "currentNodeId" TEXT;
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "collectedDataJson" TEXT DEFAULT '{}';
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "messagesJson" TEXT DEFAULT '[]';
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "ChatbotSession" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'lead';
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "fieldsJson" TEXT DEFAULT '[]';
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "completionMessage" TEXT;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "totalSubmissions" INTEGER DEFAULT 0;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "conversionRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WAForm" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "formId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "respondentPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "respondentName" TEXT;
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "respondentId" TEXT;
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "responsesJson" TEXT DEFAULT '{}';
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "WAFormResponse" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'booking';
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "clicks" INTEGER DEFAULT 0;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "conversions" INTEGER DEFAULT 0;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WAWebview" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "platform" TEXT DEFAULT 'meta';
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "adId" TEXT;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "adsetName" TEXT;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "campaignName" TEXT;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "budget" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "spent" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "leadCount" INTEGER DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "costPerLead" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "conversionCount" INTEGER DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "conversionRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "adCampaignId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'click_to_whatsapp';
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "convertedTo" TEXT;
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AdConversion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "triggerConfigJson" TEXT DEFAULT '{}';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "nodesJson" TEXT DEFAULT '[]';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "edgesJson" TEXT DEFAULT '[]';
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "totalEnrolled" INTEGER DEFAULT 0;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "activeCount" INTEGER DEFAULT 0;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "completedCount" INTEGER DEFAULT 0;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JourneyWorkflow" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "journeyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "currentNodeId" TEXT;
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "executedStepsJson" TEXT DEFAULT '[]';
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "nextActionAt" TIMESTAMP(3);
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "JourneyExecution" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "stage" TEXT DEFAULT 'new_lead';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "probability" INTEGER DEFAULT 10;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "assigneeName" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'whatsapp';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "notesJson" TEXT DEFAULT '[]';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "expectedCloseDate" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "lossReason" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "convertedJobId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "section" TEXT DEFAULT 'request';
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN DEFAULT false;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "isClosedWon" BOOLEAN DEFAULT false;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "isClosedLost" BOOLEAN DEFAULT false;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "dealId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "PipelineTask" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "dealId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "fromStage" TEXT;
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "toStage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "changedById" TEXT;
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "DealStageHistory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "channelId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'whatsapp';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "direction" TEXT DEFAULT 'inbound';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "contentType" TEXT DEFAULT 'text';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "threadId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "UnifiedMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "workflowJson" TEXT DEFAULT '{}';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "authorAvatar" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "downloads" INTEGER DEFAULT 0;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN DEFAULT false;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "premium" BOOLEAN DEFAULT false;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "screenshotsJson" TEXT DEFAULT '[]';
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "MarketplaceTemplate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "resource" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "actionsJson" TEXT DEFAULT '[]';
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "agentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "agentName" TEXT;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'online';
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "activeChats" INTEGER DEFAULT 0;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "resolvedToday" INTEGER DEFAULT 0;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "avgResponseTime" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "avgResolutionTime" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "customerSatisfaction" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "shiftStart" TEXT;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "shiftEnd" TEXT;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AgentMonitor" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "resourceType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER DEFAULT 365;
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "autoDelete" BOOLEAN DEFAULT false;
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "archiveFirst" BOOLEAN DEFAULT true;
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "DataRetentionPolicy" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "requestedById" TEXT;
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "format" TEXT DEFAULT 'json';
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "filtersJson" TEXT DEFAULT '{}';
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "recordCount" INTEGER DEFAULT 0;
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ConversationExport" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "credentialId" TEXT;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "isPlatform" BOOLEAN DEFAULT false;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "sendingEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "dailyLimit" INTEGER DEFAULT 1000;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "monthlyLimit" INTEGER DEFAULT 30000;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "sentToday" INTEGER DEFAULT 0;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "sentThisMonth" INTEGER DEFAULT 0;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "totalSent" INTEGER DEFAULT 0;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "totalDelivered" INTEGER DEFAULT 0;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "totalFailed" INTEGER DEFAULT 0;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CommunicationProvider" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "zip" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "customFieldsJson" TEXT DEFAULT '{}';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#10b981';
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "contactId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "tagId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ContactTag" ADD COLUMN IF NOT EXISTS "appliedById" TEXT;

ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'manual';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "parentGroupId" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "smartRulesJson" TEXT DEFAULT '{}';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "memberCount" INTEGER DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ContactGroup" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactGroup" ADD COLUMN IF NOT EXISTS "contactId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactGroup" ADD COLUMN IF NOT EXISTS "groupId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactGroup" ADD COLUMN IF NOT EXISTS "addedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ContactGroup" ADD COLUMN IF NOT EXISTS "addedById" TEXT;

ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'csv';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "totalRows" INTEGER DEFAULT 0;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "importedCount" INTEGER DEFAULT 0;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "skippedCount" INTEGER DEFAULT 0;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "errorCount" INTEGER DEFAULT 0;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "errorJson" TEXT DEFAULT '[]';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "mappingJson" TEXT DEFAULT '{}';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "autoGroupId" TEXT;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ContactImport" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "format" TEXT DEFAULT 'csv';
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "filterJson" TEXT DEFAULT '{}';
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "totalExported" INTEGER DEFAULT 0;
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ContactExport" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "providerType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "fromName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "fromEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "replyTo" TEXT;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "usageType" TEXT DEFAULT 'both';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "isDefaultTransactional" BOOLEAN DEFAULT false;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "isDefaultMarketing" BOOLEAN DEFAULT false;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "isPlatform" BOOLEAN DEFAULT false;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "lastTestAt" TIMESTAMP(3);
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "lastTestStatus" TEXT;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "lastTestError" TEXT;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "totalSent" INTEGER DEFAULT 0;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "totalDelivered" INTEGER DEFAULT 0;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "totalFailed" INTEGER DEFAULT 0;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmailProvider" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'transactional';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "htmlBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "textBody" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "variablesJson" TEXT DEFAULT '[]';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "isBuiltIn" BOOLEAN DEFAULT false;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'published';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN DEFAULT false;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "attachmentsJson" TEXT DEFAULT '[]';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "brandKitId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "automationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "triggerEvent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "triggerPayload" TEXT DEFAULT '{}';
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "conditionsMet" BOOLEAN DEFAULT true;
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "actionsResultsJson" TEXT DEFAULT '[]';
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'success';
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TriggerExecution" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "menuKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT true;
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "section" TEXT;
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "MenuItemConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "featureKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT true;
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT DEFAULT '{}';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "limitsJson" TEXT DEFAULT '{}';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "metric" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "dimensionsJson" TEXT DEFAULT '{}';
ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "recordedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PlatformMetric" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "eventType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'info';
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "resourceType" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "resourceId" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "AuditLogEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingType" TEXT DEFAULT 'instant';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "scheduledEndTime" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 60;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "rescheduledFrom" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN DEFAULT false;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER DEFAULT 0;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "notHelpfulCount" INTEGER DEFAULT 0;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "KnowledgeArticle" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'general';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "accessLevel" TEXT DEFAULT 'admin';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN DEFAULT false;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "sharedWithJson" TEXT DEFAULT '[]';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "token" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "invitedById" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'card';
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "last4" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "expMonth" INTEGER;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "expYear" INTEGER;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "holderName" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "tokenJson" TEXT DEFAULT '{}';
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "integrationKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'disconnected';
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "credentialsJson" TEXT DEFAULT '{}';
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3);
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "lastSyncStatus" TEXT;
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "HubIntegrationConnection" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "appId" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "appSecret" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "verifyToken" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "pageId" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "pageName" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "pageAccessToken" TEXT;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "subscriptionVerified" BOOLEAN DEFAULT false;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "autoCreateLeads" BOOLEAN DEFAULT true;
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "MetaLeadConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "leadgenId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "formId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "formName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "pageId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "platform" TEXT DEFAULT 'facebook';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "adId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "adName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "adsetId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "campaignName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "customFieldsJson" TEXT DEFAULT '{}';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "rawDataJson" TEXT DEFAULT '{}';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "leadStatus" TEXT DEFAULT 'new';
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "convertedContactId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "clientSecret" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "developerToken" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "loginCustomerId" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "accountName" TEXT;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "autoCreateLeads" BOOLEAN DEFAULT true;
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "lastPollAt" TIMESTAMP(3);
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "GoogleAdsLeadConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "leadId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "formId" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "formName" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "campaignName" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "adGroupId" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "resourceName" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "customFieldsJson" TEXT DEFAULT '{}';
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "rawDataJson" TEXT DEFAULT '{}';
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "leadStatus" TEXT DEFAULT 'new';
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "convertedContactId" TEXT;
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
ALTER TABLE "GoogleAdsLead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#0f766e';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT DEFAULT '#1f2937';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "accentColor" TEXT DEFAULT '#f59e0b';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "fontFamily" TEXT DEFAULT 'Inter, sans-serif';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "footerHtml" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "socialLinksJson" TEXT DEFAULT '[]';
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "folder" TEXT DEFAULT 'uploaded';
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'image/png';
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "size" INTEGER DEFAULT 0;
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;
ALTER TABLE "ImageLibrary" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'business';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "icon" TEXT DEFAULT 'Package';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#0f766e';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "templatesJson" TEXT DEFAULT '[]';
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "isInstalled" BOOLEAN DEFAULT false;
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "installedBy" TEXT;
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "installCount" INTEGER DEFAULT 0;
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "TemplatePack" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "bucket" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "filePath" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "mimeType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "size" INTEGER DEFAULT 0;
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "folder" TEXT DEFAULT 'general';
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;
ALTER TABLE "TemplateAsset" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "icon" TEXT DEFAULT 'FolderOpen';
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#0f766e';
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN DEFAULT false;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "SupportCategory" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'open';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'general';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'web';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tagsJson" TEXT DEFAULT '[]';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "reporterId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "reporterEmail" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "reporterName" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "assigneeName" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolution" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "satisfactionRating" INTEGER;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "satisfactionComment" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "ticketId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "contentType" TEXT DEFAULT 'text';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "authorId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "authorRole" TEXT DEFAULT 'user';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN DEFAULT false;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "ticketId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "filePath" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER DEFAULT 0;
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "mimeType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TicketAttachment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'info';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'normal';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetRole" TEXT DEFAULT 'all';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "icon" TEXT DEFAULT 'Bell';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#0f766e';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "recipientId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "actionLabel" TEXT;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT false;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "pushSent" BOOLEAN DEFAULT false;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "pushSentAt" TIMESTAMP(3);
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'normal';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "senderType" TEXT DEFAULT 'system';
ALTER TABLE "AppNotification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "typePrefsJson" TEXT DEFAULT '{}';
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "quietHoursStart" TEXT;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "quietHoursEnd" TEXT;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "quietHoursTz" TEXT DEFAULT 'Asia/Calcutta';
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "endpoint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "keysJson" TEXT DEFAULT '{}';
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "actorName" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "actorType" TEXT DEFAULT 'user';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityName" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'info';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "assetType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "installationDate" TIMESTAMP(3);
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "warrantyStart" TIMESTAMP(3);
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "warrantyEnd" TIMESTAMP(3);
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "warrantyStatus" TEXT DEFAULT 'active';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "documentsJson" TEXT DEFAULT '[]';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "customFieldsJson" TEXT DEFAULT '{}';
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomerAsset" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "assetId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "serviceDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "serviceType" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "performedBy" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "performedByName" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "partsReplaced" TEXT;
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "nextServiceDate" TIMESTAMP(3);
ALTER TABLE "AssetServiceHistory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "photoType" TEXT DEFAULT 'before';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "mimeType" TEXT DEFAULT 'image/jpeg';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "size" INTEGER DEFAULT 0;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "capturedBy" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "capturedByName" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "capturedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "caption" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'synced';
ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signatoryType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signatoryName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signatoryRole" TEXT;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signatureDataJson" TEXT DEFAULT '{}';
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "JobSignature" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'in_progress';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "completedBy" TEXT;
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "completedByName" TEXT;
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'synced';
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobChecklist" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "shiftDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockIn" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockOut" TIMESTAMP(3);
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "breaksJson" TEXT DEFAULT '[]';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "totalMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "workingMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "breakMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "travelMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockInLat" DOUBLE PRECISION;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockInLng" DOUBLE PRECISION;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockOutLat" DOUBLE PRECISION;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "clockOutLng" DOUBLE PRECISION;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'work';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "isManual" BOOLEAN DEFAULT false;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT DEFAULT 'pending';
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "EmployeeShift" ADD COLUMN IF NOT EXISTS "editHistoryJson" TEXT DEFAULT '[]';

ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "pausesJson" TEXT DEFAULT '[]';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 0;
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "pauseMinutes" INTEGER DEFAULT 0;
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "workingMinutes" INTEGER DEFAULT 0;
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "entryType" TEXT DEFAULT 'work';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobTimeEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "jobVisitNumber" INTEGER DEFAULT 1;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "title" TEXT DEFAULT '';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "visitType" TEXT DEFAULT 'visit';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "scheduledTime" TEXT;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "anytime" BOOLEAN DEFAULT true;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "scheduleLater" BOOLEAN DEFAULT false;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "repeats" TEXT DEFAULT 'none';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "repeatInterval" INTEGER DEFAULT 1;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "repeatWeekdays" TEXT DEFAULT '[]';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "repeatUntil" TIMESTAMP(3);
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "assigneeIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "assigneeNamesJson" TEXT DEFAULT '[]';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "emailTeam" BOOLEAN DEFAULT false;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "teamReminder" TEXT DEFAULT 'none';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "checklistIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'scheduled';
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobVisit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "heading" DOUBLE PRECISION;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "speed" DOUBLE PRECISION;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "altitude" DOUBLE PRECISION;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "capturedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "batteryLevel" DOUBLE PRECISION;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "isMoving" BOOLEAN DEFAULT false;
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'synced';
ALTER TABLE "GPSLocation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "pathJson" TEXT DEFAULT '[]';
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "distanceMeters" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 0;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "avgSpeedKmh" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "startLat" DOUBLE PRECISION;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "startLng" DOUBLE PRECISION;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "endLat" DOUBLE PRECISION;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "endLng" DOUBLE PRECISION;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "etaMinutes" INTEGER;
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'in_progress';
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RouteHistory" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "entryType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "actorName" TEXT;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "actorType" TEXT DEFAULT 'user';
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "eventDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN DEFAULT false;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false;
ALTER TABLE "CustomerTimelineEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "periodType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "jobsCompleted" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "jobsAssigned" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "hoursWorked" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "travelDistanceKm" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "travelMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "workingMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "breakMinutes" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "avgCompletionMinutes" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "customerRating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "revenueGenerated" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "lateArrivals" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "attendanceDays" INTEGER DEFAULT 0;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "rank" INTEGER;
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmployeePerformance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "bodyJson" TEXT DEFAULT '{}';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "headersJson" TEXT DEFAULT '{}';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "responseStatus" INTEGER;
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "responseBodyJson" TEXT;
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "OfflineMutation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "visitorName" TEXT;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "visitorPhone" TEXT;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "visitorEmail" TEXT;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "visitorFingerprint" TEXT;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "claimedById" TEXT;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "unreadCount" INTEGER DEFAULT 0;
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "senderType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "body" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "attachmentsJson" TEXT DEFAULT '[]';
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "PublicChatMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "vapiAssistantId" TEXT;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT false;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "totalCalls" INTEGER DEFAULT 0;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "totalSeconds" INTEGER DEFAULT 0;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "lastCallAt" TIMESTAMP(3);
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "number" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'twilio';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "capabilities" TEXT DEFAULT 'sms,voice';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'dedicated';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "monthlyCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "costCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "providerCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "providerSid" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "smsWebhookUrl" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "voiceWebhookUrl" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "voiceMode" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "forwardToPhone" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "forwardToVoicemail" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "vapiAssistantId" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "vapiNumberId" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "vapiNumberId" TEXT;
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "friendlyName" TEXT;
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'vapi';
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "assistantId" TEXT;
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "vapiAssistantId" TEXT;
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'available';
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AiPhoneNumber" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "vapiCallId" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "callType" TEXT DEFAULT 'inbound';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'queued';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "phoneNumberId" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "assistantId" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "fromNumber" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "toNumber" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "durationSec" INTEGER DEFAULT 0;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "costUsd" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "transcriptJson" TEXT DEFAULT '[]';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "analysisJson" TEXT DEFAULT '{}';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "functionCallsJson" TEXT DEFAULT '[]';
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "endedReason" TEXT;
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AiCall" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "bookingType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "serviceDescription" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "commissionPct" DOUBLE PRECISION DEFAULT 5;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "commissionAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "providerAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "transferId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "escrowReleasedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "refundAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "disputeReason" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "escrowedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "disputedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER DEFAULT 0;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "stripeTransferId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'stripe_connect';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "transactionsJson" TEXT DEFAULT '[]';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "transactionCount" INTEGER DEFAULT 0;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "failReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'featured';
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "amountCharged" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "FeaturedListing" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "balance" INTEGER DEFAULT 0;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "totalPurchased" INTEGER DEFAULT 0;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "totalUsed" INTEGER DEFAULT 0;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "planQuota" INTEGER DEFAULT 0;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "planQuotaUsed" INTEGER DEFAULT 0;
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "planQuotaResetAt" TIMESTAMP(3);
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "lastPurchaseAt" TIMESTAMP(3);
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "lastUsageAt" TIMESTAMP(3);
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AICredit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "direction" TEXT DEFAULT 'outbound';
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "contentLength" INTEGER DEFAULT 0;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'charged';
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "providerRef" TEXT;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "UsageCharge" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "featureKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT true;
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "perTenantOverride" BOOLEAN DEFAULT false;
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "defaultForNewTenants" BOOLEAN DEFAULT true;
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "pricingJson" TEXT DEFAULT '{}';
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RevenueFeatureToggle" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "encryptedKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "lastErrorAt" TIMESTAMP(3);
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "requestCount" INTEGER DEFAULT 0;
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "AiProviderKey" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "managerId" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "businessHoursJson" TEXT DEFAULT '{}';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "serviceAreasJson" TEXT DEFAULT '[]';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN DEFAULT false;
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "HolidayCalendar" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'radius';
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "centerLat" DOUBLE PRECISION;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "centerLng" DOUBLE PRECISION;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "radiusKm" DOUBLE PRECISION;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "postcodesJson" TEXT DEFAULT '[]';
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "polygonJson" TEXT DEFAULT '[]';
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ServiceRegion" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "rate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'standard';
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "TaxRule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "entity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "prefix" TEXT DEFAULT '';
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "suffix" TEXT DEFAULT '';
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "padLength" INTEGER DEFAULT 5;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "nextNumber" INTEGER DEFAULT 1;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "resetYearly" BOOLEAN DEFAULT false;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "includeYear" BOOLEAN DEFAULT true;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "format" TEXT DEFAULT '{PREFIX}{YEAR}-{SEQ}';
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "NumberSequence" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "fieldName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'text';
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "optionsJson" TEXT DEFAULT '[]';
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "defaultValue" TEXT;
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN DEFAULT false;
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN DEFAULT true;
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CustomField" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "currentStep" INTEGER DEFAULT 0;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "totalSteps" INTEGER DEFAULT 1;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "stepsJson" TEXT DEFAULT '[]';
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "initiatedById" TEXT;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "initiatedByName" TEXT;
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ApprovalFlow" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "scope" TEXT DEFAULT 'technician';
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'percentage';
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "rate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "minAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "maxAmount" DOUBLE PRECISION;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "tieredRatesJson" TEXT DEFAULT '[]';
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "appliesTo" TEXT DEFAULT 'all';
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "gateway" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "supportedCountries" TEXT DEFAULT '[]';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "supportedCurrencies" TEXT DEFAULT '[]';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "configJson" TEXT DEFAULT '{}';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "credentialId" TEXT;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT DEFAULT '{}';
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "basePrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "pricingType" TEXT DEFAULT 'fixed';
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "callOutFee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "travelFeePerKm" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "emergencySurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "weekendSurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "eveningSurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "holidaySurchargePct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "minimumCharge" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "maximumCharge" DOUBLE PRECISION;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "estimatedDurationMins" INTEGER DEFAULT 60;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "conditionsJson" TEXT DEFAULT '{}';
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PricingRule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'inspection';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'scheduled';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "inspectorId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "inspectorName" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "checklistId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "checklistResponsesJson" TEXT DEFAULT '{}';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "measurementsJson" TEXT DEFAULT '{}';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "findingsJson" TEXT DEFAULT '[]';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "videosJson" TEXT DEFAULT '[]';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "droneImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "signedByName" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "generatedQuoteId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "estimatedDurationMins" INTEGER;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "estimatedCost" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "fromState" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "toState" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "transitionReason" TEXT;
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "transitionedById" TEXT;
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "transitionedByName" TEXT;
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "JobStateTransition" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "jobId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "inspectorId" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "inspectorName" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "checklistId" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "responsesJson" TEXT DEFAULT '{}';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "findingsJson" TEXT DEFAULT '[]';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "reworkNotes" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "customerNotifiedAt" TIMESTAMP(3);
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "resolvedById" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "resolvedByName" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "QualityInspection" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "rawText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'whatsapp';
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedCategory" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedIndustry" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedService" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedUrgency" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedBudget" DOUBLE PRECISION;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedBudgetCurrency" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedLocation" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedSkillsJson" TEXT DEFAULT '[]';
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "extractedDurationMins" INTEGER;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "estimatedCostLow" DOUBLE PRECISION;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "estimatedCostHigh" DOUBLE PRECISION;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "suggestedBookingMode" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "aiModel" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "RequestExtraction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'each';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "salePrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "totalStock" INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "availableStock" INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "reorderQty" INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "supplierSku" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'main';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 0;
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "locationCode" TEXT;
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "StockLocation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "orderDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "expectedDate" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "receivedDate" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "fromWarehouseId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "toWarehouseId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "fromEmployeeId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "toEmployeeId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "transferDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "receivedDate" TIMESTAMP(3);
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "direction" TEXT DEFAULT 'in';
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "performedById" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "performedByName" TEXT;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "currentStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "acknowledgedById" TEXT;
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "LowStockAlert" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "setupFee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "inspectionsPerYear" INTEGER DEFAULT 2;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "prioritySupport" BOOLEAN DEFAULT true;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "discountPct" DOUBLE PRECISION DEFAULT 10;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "emergencyVisits" INTEGER DEFAULT 0;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT DEFAULT '[]';
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "contractLengthMonths" INTEGER;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN DEFAULT true;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "cancellationNoticeDays" INTEGER DEFAULT 30;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ServicePlan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "servicePlanId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3);
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "lastBilledDate" TIMESTAMP(3);
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "inspectionsUsed" INTEGER DEFAULT 0;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "emergencyVisitsUsed" INTEGER DEFAULT 0;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "recurringInvoiceId" TEXT;
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ServicePlanSubscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'standard';
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "coverage" TEXT DEFAULT 'parts_and_labor';
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER DEFAULT 12;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "termsJson" TEXT DEFAULT '{}';
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "maxClaims" INTEGER DEFAULT 1;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "claimsUsed" INTEGER DEFAULT 0;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "warrantyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'submitted';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'medium';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "assignedToName" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolutionType" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolvedById" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolvedByName" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "serviceName" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "urgency" TEXT DEFAULT 'medium';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "budgetLow" DOUBLE PRECISION;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "budgetHigh" DOUBLE PRECISION;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "videosJson" TEXT DEFAULT '[]';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "aiExtractionId" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'open';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "acceptedQuoteId" TEXT;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "quoteCount" INTEGER DEFAULT 0;
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "urgency" TEXT DEFAULT 'emergency';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'broadcasting';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "broadcastToIds" TEXT DEFAULT '[]';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "acceptedById" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "acceptedQuoteId" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "providerEnRouteAt" TIMESTAMP(3);
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "providerOnSiteAt" TIMESTAMP(3);
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "estimatedArrivalMins" INTEGER;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "actualArrivalMins" INTEGER;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "estimatedCost" DOUBLE PRECISION;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "finalCost" DOUBLE PRECISION;
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]';
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "videosJson" TEXT DEFAULT '[]';
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "awardsJson" TEXT DEFAULT '[]';
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "projectsJson" TEXT DEFAULT '[]';
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "teamJson" TEXT DEFAULT '[]';
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ProviderPortfolio" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "issuer" TEXT;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "issueDate" TIMESTAMP(3);
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "certificateNumber" TEXT;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "ProviderCertification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "tier" TEXT DEFAULT 'standard';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "benefitsJson" TEXT DEFAULT '[]';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'percentage';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "minSpend" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "maxDiscount" DOUBLE PRECISION;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "usageLimit" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "usedCount" INTEGER DEFAULT 0;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "perCustomerLimit" INTEGER DEFAULT 1;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "applicableServicesJson" TEXT DEFAULT '[]';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "promotionId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountType" TEXT DEFAULT 'percentage';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usedOnJobId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();

ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0;
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "totalEarned" INTEGER DEFAULT 0;
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "totalRedeemed" INTEGER DEFAULT 0;
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "tier" TEXT DEFAULT 'bronze';
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "LoyaltyPoint" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referrerCustomerId" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referrerName" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referrerPhone" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referredName" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referredPhone" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referredEmail" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "rewardType" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "rewardValue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "rewardedAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT DEFAULT '{}';
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT now();
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

-- ##########################################
-- PHASE 3: UNIQUE CONSTRAINTS
-- (drops orphaned indexes first to avoid name collisions)
-- ##########################################


-- Tenant.slug unique
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_slug_key";
DROP INDEX IF EXISTS "Tenant_slug_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Tenant_slug_key', 'u') THEN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- Tenant.publicSlug unique
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_publicSlug_key";
DROP INDEX IF EXISTS "Tenant_publicSlug_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Tenant_publicSlug_key', 'u') THEN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_publicSlug_key" UNIQUE ("publicSlug");
  END IF;
END $$;

-- SubscriptionPayment.invoiceNumber unique
ALTER TABLE "SubscriptionPayment" DROP CONSTRAINT IF EXISTS "SubscriptionPayment_invoiceNumber_key";
DROP INDEX IF EXISTS "SubscriptionPayment_invoiceNumber_key";
DO $$ BEGIN
  IF NOT _constraint_exists('SubscriptionPayment_invoiceNumber_key', 'u') THEN
    ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_invoiceNumber_key" UNIQUE ("invoiceNumber");
  END IF;
END $$;

-- Plan.code unique
ALTER TABLE "Plan" DROP CONSTRAINT IF EXISTS "Plan_code_key";
DROP INDEX IF EXISTS "Plan_code_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Plan_code_key', 'u') THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_code_key" UNIQUE ("code");
  END IF;
END $$;

-- PlanFeatureMatrix @@unique [planCode, featureKey]
ALTER TABLE "PlanFeatureMatrix" DROP CONSTRAINT IF EXISTS "PlanFeatureMatrix_planCode_featureKey_key";
DROP INDEX IF EXISTS "PlanFeatureMatrix_planCode_featureKey_key";
DO $$ BEGIN
  IF NOT _constraint_exists('PlanFeatureMatrix_planCode_featureKey_key', 'u') THEN
    ALTER TABLE "PlanFeatureMatrix" ADD CONSTRAINT "PlanFeatureMatrix_planCode_featureKey_key" UNIQUE ("planCode", "featureKey");
  END IF;
END $$;

-- AddonSubscription @@unique [tenantId, addonCode, status]
ALTER TABLE "AddonSubscription" DROP CONSTRAINT IF EXISTS "AddonSubscription_tenantId_addonCode_status_key";
DROP INDEX IF EXISTS "AddonSubscription_tenantId_addonCode_status_key";
DO $$ BEGIN
  IF NOT _constraint_exists('AddonSubscription_tenantId_addonCode_status_key', 'u') THEN
    ALTER TABLE "AddonSubscription" ADD CONSTRAINT "AddonSubscription_tenantId_addonCode_status_key" UNIQUE ("tenantId", "addonCode", "status");
  END IF;
END $$;

-- User.email unique
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_email_key";
DO $$ BEGIN
  IF NOT _constraint_exists('User_email_key', 'u') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
  END IF;
END $$;

-- Lead.jobId unique
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_jobId_key";
DROP INDEX IF EXISTS "Lead_jobId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Lead_jobId_key', 'u') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_jobId_key" UNIQUE ("jobId");
  END IF;
END $$;

-- Invoice.number unique
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_number_key";
DROP INDEX IF EXISTS "Invoice_number_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Invoice_number_key', 'u') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_number_key" UNIQUE ("number");
  END IF;
END $$;

-- Expense.number unique
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_number_key";
DROP INDEX IF EXISTS "Expense_number_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Expense_number_key', 'u') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_number_key" UNIQUE ("number");
  END IF;
END $$;

-- Review.jobId unique
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_jobId_key";
DROP INDEX IF EXISTS "Review_jobId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Review_jobId_key', 'u') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_key" UNIQUE ("jobId");
  END IF;
END $$;

-- Form.slug unique
ALTER TABLE "Form" DROP CONSTRAINT IF EXISTS "Form_slug_key";
DROP INDEX IF EXISTS "Form_slug_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Form_slug_key', 'u') THEN
    ALTER TABLE "Form" ADD CONSTRAINT "Form_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- Workspace.slug unique
ALTER TABLE "Workspace" DROP CONSTRAINT IF EXISTS "Workspace_slug_key";
DROP INDEX IF EXISTS "Workspace_slug_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Workspace_slug_key', 'u') THEN
    ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- ApiKey @@unique [keyHash]
ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_keyHash_key";
DROP INDEX IF EXISTS "ApiKey_keyHash_key";
DO $$ BEGIN
  IF NOT _constraint_exists('ApiKey_keyHash_key', 'u') THEN
    ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_keyHash_key" UNIQUE ("keyHash");
  END IF;
END $$;

-- Variable @@unique [key, workspaceId]
ALTER TABLE "Variable" DROP CONSTRAINT IF EXISTS "Variable_key_workspaceId_key";
DROP INDEX IF EXISTS "Variable_key_workspaceId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Variable_key_workspaceId_key', 'u') THEN
    ALTER TABLE "Variable" ADD CONSTRAINT "Variable_key_workspaceId_key" UNIQUE ("key", "workspaceId");
  END IF;
END $$;

-- Employee.currentJobId unique
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_currentJobId_key";
DROP INDEX IF EXISTS "Employee_currentJobId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Employee_currentJobId_key', 'u') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentJobId_key" UNIQUE ("currentJobId");
  END IF;
END $$;

-- Employee.userId unique
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_userId_key";
DROP INDEX IF EXISTS "Employee_userId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Employee_userId_key', 'u') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_key" UNIQUE ("userId");
  END IF;
END $$;

-- WebhookEndpoint.endpointId unique
ALTER TABLE "WebhookEndpoint" DROP CONSTRAINT IF EXISTS "WebhookEndpoint_endpointId_key";
DROP INDEX IF EXISTS "WebhookEndpoint_endpointId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('WebhookEndpoint_endpointId_key', 'u') THEN
    ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_endpointId_key" UNIQUE ("endpointId");
  END IF;
END $$;

-- WhatsAppMessageAction.whatsappMessageId unique
ALTER TABLE "WhatsAppMessageAction" DROP CONSTRAINT IF EXISTS "WhatsAppMessageAction_whatsappMessageId_key";
DROP INDEX IF EXISTS "WhatsAppMessageAction_whatsappMessageId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('WhatsAppMessageAction_whatsappMessageId_key', 'u') THEN
    ALTER TABLE "WhatsAppMessageAction" ADD CONSTRAINT "WhatsAppMessageAction_whatsappMessageId_key" UNIQUE ("whatsappMessageId");
  END IF;
END $$;

-- Conversation.conversationId unique
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_conversationId_key";
DROP INDEX IF EXISTS "Conversation_conversationId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Conversation_conversationId_key', 'u') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_conversationId_key" UNIQUE ("conversationId");
  END IF;
END $$;

-- Conversation.leadId unique
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_leadId_key";
DROP INDEX IF EXISTS "Conversation_leadId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Conversation_leadId_key', 'u') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_key" UNIQUE ("leadId");
  END IF;
END $$;

-- Conversation.jobId unique
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_jobId_key";
DROP INDEX IF EXISTS "Conversation_jobId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Conversation_jobId_key', 'u') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_jobId_key" UNIQUE ("jobId");
  END IF;
END $$;

-- CustomerJourney.jobId unique
ALTER TABLE "CustomerJourney" DROP CONSTRAINT IF EXISTS "CustomerJourney_jobId_key";
DROP INDEX IF EXISTS "CustomerJourney_jobId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('CustomerJourney_jobId_key', 'u') THEN
    ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_jobId_key" UNIQUE ("jobId");
  END IF;
END $$;

-- CustomerJourney.leadId unique
ALTER TABLE "CustomerJourney" DROP CONSTRAINT IF EXISTS "CustomerJourney_leadId_key";
DROP INDEX IF EXISTS "CustomerJourney_leadId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('CustomerJourney_leadId_key', 'u') THEN
    ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_leadId_key" UNIQUE ("leadId");
  END IF;
END $$;

-- CustomerPortalSession.token unique
ALTER TABLE "CustomerPortalSession" DROP CONSTRAINT IF EXISTS "CustomerPortalSession_token_key";
DROP INDEX IF EXISTS "CustomerPortalSession_token_key";
DO $$ BEGIN
  IF NOT _constraint_exists('CustomerPortalSession_token_key', 'u') THEN
    ALTER TABLE "CustomerPortalSession" ADD CONSTRAINT "CustomerPortalSession_token_key" UNIQUE ("token");
  END IF;
END $$;

-- EcommerceOrder @@unique [integrationId, externalOrderId]
ALTER TABLE "EcommerceOrder" DROP CONSTRAINT IF EXISTS "EcommerceOrder_integrationId_externalOrderId_key";
DROP INDEX IF EXISTS "EcommerceOrder_integrationId_externalOrderId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('EcommerceOrder_integrationId_externalOrderId_key', 'u') THEN
    ALTER TABLE "EcommerceOrder" ADD CONSTRAINT "EcommerceOrder_integrationId_externalOrderId_key" UNIQUE ("integrationId", "externalOrderId");
  END IF;
END $$;

-- EcommerceProduct @@unique [integrationId, externalProductId]
ALTER TABLE "EcommerceProduct" DROP CONSTRAINT IF EXISTS "EcommerceProduct_integrationId_externalProductId_key";
DROP INDEX IF EXISTS "EcommerceProduct_integrationId_externalProductId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('EcommerceProduct_integrationId_externalProductId_key', 'u') THEN
    ALTER TABLE "EcommerceProduct" ADD CONSTRAINT "EcommerceProduct_integrationId_externalProductId_key" UNIQUE ("integrationId", "externalProductId");
  END IF;
END $$;

-- AnalyticsSnapshot @@unique [date, metric, tenantId]
ALTER TABLE "AnalyticsSnapshot" DROP CONSTRAINT IF EXISTS "AnalyticsSnapshot_date_metric_tenantId_key";
DROP INDEX IF EXISTS "AnalyticsSnapshot_date_metric_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('AnalyticsSnapshot_date_metric_tenantId_key', 'u') THEN
    ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_date_metric_tenantId_key" UNIQUE ("date", "metric", "tenantId");
  END IF;
END $$;

-- ConversationLabel @@unique [conversationId, labelId]
ALTER TABLE "ConversationLabel" DROP CONSTRAINT IF EXISTS "ConversationLabel_conversationId_labelId_key";
DROP INDEX IF EXISTS "ConversationLabel_conversationId_labelId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('ConversationLabel_conversationId_labelId_key', 'u') THEN
    ALTER TABLE "ConversationLabel" ADD CONSTRAINT "ConversationLabel_conversationId_labelId_key" UNIQUE ("conversationId", "labelId");
  END IF;
END $$;

-- SegmentMember @@unique [segmentId, customerId]
ALTER TABLE "SegmentMember" DROP CONSTRAINT IF EXISTS "SegmentMember_segmentId_customerId_key";
DROP INDEX IF EXISTS "SegmentMember_segmentId_customerId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('SegmentMember_segmentId_customerId_key', 'u') THEN
    ALTER TABLE "SegmentMember" ADD CONSTRAINT "SegmentMember_segmentId_customerId_key" UNIQUE ("segmentId", "customerId");
  END IF;
END $$;

-- PipelineStage @@unique [tenantId, key]
ALTER TABLE "PipelineStage" DROP CONSTRAINT IF EXISTS "PipelineStage_tenantId_key_key";
DROP INDEX IF EXISTS "PipelineStage_tenantId_key_key";
DO $$ BEGIN
  IF NOT _constraint_exists('PipelineStage_tenantId_key_key', 'u') THEN
    ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_tenantId_key_key" UNIQUE ("tenantId", "key");
  END IF;
END $$;

-- RolePermission @@unique [role, resource, tenantId]
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_role_resource_tenantId_key";
DROP INDEX IF EXISTS "RolePermission_role_resource_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('RolePermission_role_resource_tenantId_key', 'u') THEN
    ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_resource_tenantId_key" UNIQUE ("role", "resource", "tenantId");
  END IF;
END $$;

-- DataRetentionPolicy @@unique [resourceType, tenantId]
ALTER TABLE "DataRetentionPolicy" DROP CONSTRAINT IF EXISTS "DataRetentionPolicy_resourceType_tenantId_key";
DROP INDEX IF EXISTS "DataRetentionPolicy_resourceType_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('DataRetentionPolicy_resourceType_tenantId_key', 'u') THEN
    ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_resourceType_tenantId_key" UNIQUE ("resourceType", "tenantId");
  END IF;
END $$;

-- Tag @@unique [tenantId, name]
ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_tenantId_name_key";
DROP INDEX IF EXISTS "Tag_tenantId_name_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Tag_tenantId_name_key', 'u') THEN
    ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_name_key" UNIQUE ("tenantId", "name");
  END IF;
END $$;

-- ContactTag @@unique [contactId, tagId]
ALTER TABLE "ContactTag" DROP CONSTRAINT IF EXISTS "ContactTag_contactId_tagId_key";
DROP INDEX IF EXISTS "ContactTag_contactId_tagId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('ContactTag_contactId_tagId_key', 'u') THEN
    ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_contactId_tagId_key" UNIQUE ("contactId", "tagId");
  END IF;
END $$;

-- Group @@unique [tenantId, name, parentGroupId]
ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_tenantId_name_parentGroupId_key";
DROP INDEX IF EXISTS "Group_tenantId_name_parentGroupId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Group_tenantId_name_parentGroupId_key', 'u') THEN
    ALTER TABLE "Group" ADD CONSTRAINT "Group_tenantId_name_parentGroupId_key" UNIQUE ("tenantId", "name", "parentGroupId");
  END IF;
END $$;

-- ContactGroup @@unique [contactId, groupId]
ALTER TABLE "ContactGroup" DROP CONSTRAINT IF EXISTS "ContactGroup_contactId_groupId_key";
DROP INDEX IF EXISTS "ContactGroup_contactId_groupId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('ContactGroup_contactId_groupId_key', 'u') THEN
    ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_contactId_groupId_key" UNIQUE ("contactId", "groupId");
  END IF;
END $$;

-- EmailTemplate @@unique [slug, tenantId]
ALTER TABLE "EmailTemplate" DROP CONSTRAINT IF EXISTS "EmailTemplate_slug_tenantId_key";
DROP INDEX IF EXISTS "EmailTemplate_slug_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('EmailTemplate_slug_tenantId_key', 'u') THEN
    ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_slug_tenantId_key" UNIQUE ("slug", "tenantId");
  END IF;
END $$;

-- MenuItemConfig @@unique [tenantId, menuKey]
ALTER TABLE "MenuItemConfig" DROP CONSTRAINT IF EXISTS "MenuItemConfig_tenantId_menuKey_key";
DROP INDEX IF EXISTS "MenuItemConfig_tenantId_menuKey_key";
DO $$ BEGIN
  IF NOT _constraint_exists('MenuItemConfig_tenantId_menuKey_key', 'u') THEN
    ALTER TABLE "MenuItemConfig" ADD CONSTRAINT "MenuItemConfig_tenantId_menuKey_key" UNIQUE ("tenantId", "menuKey");
  END IF;
END $$;

-- FeatureFlag @@unique [tenantId, featureKey]
ALTER TABLE "FeatureFlag" DROP CONSTRAINT IF EXISTS "FeatureFlag_tenantId_featureKey_key";
DROP INDEX IF EXISTS "FeatureFlag_tenantId_featureKey_key";
DO $$ BEGIN
  IF NOT _constraint_exists('FeatureFlag_tenantId_featureKey_key', 'u') THEN
    ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_tenantId_featureKey_key" UNIQUE ("tenantId", "featureKey");
  END IF;
END $$;

-- SubscriptionPlan.name unique
ALTER TABLE "SubscriptionPlan" DROP CONSTRAINT IF EXISTS "SubscriptionPlan_name_key";
DROP INDEX IF EXISTS "SubscriptionPlan_name_key";
DO $$ BEGIN
  IF NOT _constraint_exists('SubscriptionPlan_name_key', 'u') THEN
    ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_name_key" UNIQUE ("name");
  END IF;
END $$;

-- Invitation.token unique
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_token_key";
DROP INDEX IF EXISTS "Invitation_token_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Invitation_token_key', 'u') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_token_key" UNIQUE ("token");
  END IF;
END $$;

-- Invitation.employeeId unique
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_employeeId_key";
DROP INDEX IF EXISTS "Invitation_employeeId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Invitation_employeeId_key', 'u') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_employeeId_key" UNIQUE ("employeeId");
  END IF;
END $$;

-- Invitation.customerId unique
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_customerId_key";
DROP INDEX IF EXISTS "Invitation_customerId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Invitation_customerId_key', 'u') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_customerId_key" UNIQUE ("customerId");
  END IF;
END $$;

-- HubIntegrationConnection @@unique [tenantId, integrationKey]
ALTER TABLE "HubIntegrationConnection" DROP CONSTRAINT IF EXISTS "HubIntegrationConnection_tenantId_integrationKey_key";
DROP INDEX IF EXISTS "HubIntegrationConnection_tenantId_integrationKey_key";
DO $$ BEGIN
  IF NOT _constraint_exists('HubIntegrationConnection_tenantId_integrationKey_key', 'u') THEN
    ALTER TABLE "HubIntegrationConnection" ADD CONSTRAINT "HubIntegrationConnection_tenantId_integrationKey_key" UNIQUE ("tenantId", "integrationKey");
  END IF;
END $$;

-- MetaLeadConfig.tenantId unique
ALTER TABLE "MetaLeadConfig" DROP CONSTRAINT IF EXISTS "MetaLeadConfig_tenantId_key";
DROP INDEX IF EXISTS "MetaLeadConfig_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('MetaLeadConfig_tenantId_key', 'u') THEN
    ALTER TABLE "MetaLeadConfig" ADD CONSTRAINT "MetaLeadConfig_tenantId_key" UNIQUE ("tenantId");
  END IF;
END $$;

-- MetaLead @@unique [tenantId, leadgenId]
ALTER TABLE "MetaLead" DROP CONSTRAINT IF EXISTS "MetaLead_tenantId_leadgenId_key";
DROP INDEX IF EXISTS "MetaLead_tenantId_leadgenId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('MetaLead_tenantId_leadgenId_key', 'u') THEN
    ALTER TABLE "MetaLead" ADD CONSTRAINT "MetaLead_tenantId_leadgenId_key" UNIQUE ("tenantId", "leadgenId");
  END IF;
END $$;

-- GoogleAdsLeadConfig.tenantId unique
ALTER TABLE "GoogleAdsLeadConfig" DROP CONSTRAINT IF EXISTS "GoogleAdsLeadConfig_tenantId_key";
DROP INDEX IF EXISTS "GoogleAdsLeadConfig_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('GoogleAdsLeadConfig_tenantId_key', 'u') THEN
    ALTER TABLE "GoogleAdsLeadConfig" ADD CONSTRAINT "GoogleAdsLeadConfig_tenantId_key" UNIQUE ("tenantId");
  END IF;
END $$;

-- GoogleAdsLead @@unique [tenantId, leadId]
ALTER TABLE "GoogleAdsLead" DROP CONSTRAINT IF EXISTS "GoogleAdsLead_tenantId_leadId_key";
DROP INDEX IF EXISTS "GoogleAdsLead_tenantId_leadId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('GoogleAdsLead_tenantId_leadId_key', 'u') THEN
    ALTER TABLE "GoogleAdsLead" ADD CONSTRAINT "GoogleAdsLead_tenantId_leadId_key" UNIQUE ("tenantId", "leadId");
  END IF;
END $$;

-- BrandKit.tenantId unique
ALTER TABLE "BrandKit" DROP CONSTRAINT IF EXISTS "BrandKit_tenantId_key";
DROP INDEX IF EXISTS "BrandKit_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('BrandKit_tenantId_key', 'u') THEN
    ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_tenantId_key" UNIQUE ("tenantId");
  END IF;
END $$;

-- TemplatePack.slug unique
ALTER TABLE "TemplatePack" DROP CONSTRAINT IF EXISTS "TemplatePack_slug_key";
DROP INDEX IF EXISTS "TemplatePack_slug_key";
DO $$ BEGIN
  IF NOT _constraint_exists('TemplatePack_slug_key', 'u') THEN
    ALTER TABLE "TemplatePack" ADD CONSTRAINT "TemplatePack_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- SupportCategory @@unique [slug, tenantId]
ALTER TABLE "SupportCategory" DROP CONSTRAINT IF EXISTS "SupportCategory_slug_tenantId_key";
DROP INDEX IF EXISTS "SupportCategory_slug_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('SupportCategory_slug_tenantId_key', 'u') THEN
    ALTER TABLE "SupportCategory" ADD CONSTRAINT "SupportCategory_slug_tenantId_key" UNIQUE ("slug", "tenantId");
  END IF;
END $$;

-- SupportTicket.ticketNumber unique
ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_ticketNumber_key";
DROP INDEX IF EXISTS "SupportTicket_ticketNumber_key";
DO $$ BEGIN
  IF NOT _constraint_exists('SupportTicket_ticketNumber_key', 'u') THEN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_ticketNumber_key" UNIQUE ("ticketNumber");
  END IF;
END $$;

-- NotificationPreference @@unique [tenantId, userId]
ALTER TABLE "NotificationPreference" DROP CONSTRAINT IF EXISTS "NotificationPreference_tenantId_userId_key";
DROP INDEX IF EXISTS "NotificationPreference_tenantId_userId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('NotificationPreference_tenantId_userId_key', 'u') THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_userId_key" UNIQUE ("tenantId", "userId");
  END IF;
END $$;

-- PushSubscription @@unique [userId, endpoint]
ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_userId_endpoint_key";
DROP INDEX IF EXISTS "PushSubscription_userId_endpoint_key";
DO $$ BEGIN
  IF NOT _constraint_exists('PushSubscription_userId_endpoint_key', 'u') THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_endpoint_key" UNIQUE ("userId", "endpoint");
  END IF;
END $$;

-- EmployeePerformance @@unique [tenantId, employeeId, periodType, periodStart]
ALTER TABLE "EmployeePerformance" DROP CONSTRAINT IF EXISTS "EmployeePerformance_tenantId_employeeId_periodType_periodStart_key";
DROP INDEX IF EXISTS "EmployeePerformance_tenantId_employeeId_periodType_periodStart_key";
DO $$ BEGIN
  IF NOT _constraint_exists('EmployeePerformance_tenantId_employeeId_periodType_periodStart_key', 'u') THEN
    ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_tenantId_employeeId_periodType_periodStart_key" UNIQUE ("tenantId", "employeeId", "periodType", "periodStart");
  END IF;
END $$;

-- PhoneNumber.number unique
ALTER TABLE "PhoneNumber" DROP CONSTRAINT IF EXISTS "PhoneNumber_number_key";
DROP INDEX IF EXISTS "PhoneNumber_number_key";
DO $$ BEGIN
  IF NOT _constraint_exists('PhoneNumber_number_key', 'u') THEN
    ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_number_key" UNIQUE ("number");
  END IF;
END $$;

-- AiPhoneNumber @@unique [tenantId, phoneNumber]
ALTER TABLE "AiPhoneNumber" DROP CONSTRAINT IF EXISTS "AiPhoneNumber_tenantId_phoneNumber_key";
DROP INDEX IF EXISTS "AiPhoneNumber_tenantId_phoneNumber_key";
DO $$ BEGIN
  IF NOT _constraint_exists('AiPhoneNumber_tenantId_phoneNumber_key', 'u') THEN
    ALTER TABLE "AiPhoneNumber" ADD CONSTRAINT "AiPhoneNumber_tenantId_phoneNumber_key" UNIQUE ("tenantId", "phoneNumber");
  END IF;
END $$;

-- Payout.stripeTransferId unique
ALTER TABLE "Payout" DROP CONSTRAINT IF EXISTS "Payout_stripeTransferId_key";
DROP INDEX IF EXISTS "Payout_stripeTransferId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Payout_stripeTransferId_key', 'u') THEN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_stripeTransferId_key" UNIQUE ("stripeTransferId");
  END IF;
END $$;

-- RevenueFeatureToggle.featureKey unique
ALTER TABLE "RevenueFeatureToggle" DROP CONSTRAINT IF EXISTS "RevenueFeatureToggle_featureKey_key";
DROP INDEX IF EXISTS "RevenueFeatureToggle_featureKey_key";
DO $$ BEGIN
  IF NOT _constraint_exists('RevenueFeatureToggle_featureKey_key', 'u') THEN
    ALTER TABLE "RevenueFeatureToggle" ADD CONSTRAINT "RevenueFeatureToggle_featureKey_key" UNIQUE ("featureKey");
  END IF;
END $$;

-- Branch @@unique [tenantId, code]
ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_tenantId_code_key";
DROP INDEX IF EXISTS "Branch_tenantId_code_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Branch_tenantId_code_key', 'u') THEN
    ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_code_key" UNIQUE ("tenantId", "code");
  END IF;
END $$;

-- NumberSequence @@unique [tenantId, entity, branchId]
ALTER TABLE "NumberSequence" DROP CONSTRAINT IF EXISTS "NumberSequence_tenantId_entity_branchId_key";
DROP INDEX IF EXISTS "NumberSequence_tenantId_entity_branchId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('NumberSequence_tenantId_entity_branchId_key', 'u') THEN
    ALTER TABLE "NumberSequence" ADD CONSTRAINT "NumberSequence_tenantId_entity_branchId_key" UNIQUE ("tenantId", "entity", "branchId");
  END IF;
END $$;

-- PaymentGatewayConfig @@unique [tenantId, gateway]
ALTER TABLE "PaymentGatewayConfig" DROP CONSTRAINT IF EXISTS "PaymentGatewayConfig_tenantId_gateway_key";
DROP INDEX IF EXISTS "PaymentGatewayConfig_tenantId_gateway_key";
DO $$ BEGIN
  IF NOT _constraint_exists('PaymentGatewayConfig_tenantId_gateway_key', 'u') THEN
    ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_tenantId_gateway_key" UNIQUE ("tenantId", "gateway");
  END IF;
END $$;

-- InventoryItem.sku unique
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_sku_key";
DROP INDEX IF EXISTS "InventoryItem_sku_key";
DO $$ BEGIN
  IF NOT _constraint_exists('InventoryItem_sku_key', 'u') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_sku_key" UNIQUE ("sku");
  END IF;
END $$;

-- ProviderPortfolio.tenantId unique
ALTER TABLE "ProviderPortfolio" DROP CONSTRAINT IF EXISTS "ProviderPortfolio_tenantId_key";
DROP INDEX IF EXISTS "ProviderPortfolio_tenantId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('ProviderPortfolio_tenantId_key', 'u') THEN
    ALTER TABLE "ProviderPortfolio" ADD CONSTRAINT "ProviderPortfolio_tenantId_key" UNIQUE ("tenantId");
  END IF;
END $$;

-- Promotion.code unique
ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_code_key";
DROP INDEX IF EXISTS "Promotion_code_key";
DO $$ BEGIN
  IF NOT _constraint_exists('Promotion_code_key', 'u') THEN
    ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_code_key" UNIQUE ("code");
  END IF;
END $$;

-- LoyaltyPoint @@unique [tenantId, customerId]
ALTER TABLE "LoyaltyPoint" DROP CONSTRAINT IF EXISTS "LoyaltyPoint_tenantId_customerId_key";
DROP INDEX IF EXISTS "LoyaltyPoint_tenantId_customerId_key";
DO $$ BEGIN
  IF NOT _constraint_exists('LoyaltyPoint_tenantId_customerId_key', 'u') THEN
    ALTER TABLE "LoyaltyPoint" ADD CONSTRAINT "LoyaltyPoint_tenantId_customerId_key" UNIQUE ("tenantId", "customerId");
  END IF;
END $$;

-- ##########################################
-- PHASE 4: FOREIGN KEY CONSTRAINTS
-- ##########################################


DO $$ BEGIN
  IF NOT _fk_exists('Subscription_tenantId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('SubscriptionPayment_tenantId_fkey') THEN
    ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('SubscriptionPayment_subscriptionId_fkey') THEN
    ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('BillingEvent_tenantId_fkey') THEN
    ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('BillingEvent_subscriptionId_fkey') THEN
    ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AddonSubscription_tenantId_fkey') THEN
    ALTER TABLE "AddonSubscription" ADD CONSTRAINT "AddonSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RecurringJobSchedule_tenantId_fkey') THEN
    ALTER TABLE "RecurringJobSchedule" ADD CONSTRAINT "RecurringJobSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RecurringJobSchedule_customerId_fkey') THEN
    ALTER TABLE "RecurringJobSchedule" ADD CONSTRAINT "RecurringJobSchedule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ScheduledMessage_tenantId_fkey') THEN
    ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ScheduledMessage_customerId_fkey') THEN
    ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ScheduledMessage_jobId_fkey') THEN
    ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ScheduledExecution_tenantId_fkey') THEN
    ALTER TABLE "ScheduledExecution" ADD CONSTRAINT "ScheduledExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('User_tenantId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('User_workspaceId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Service_tenantId_fkey') THEN
    ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Lead_tenantId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Lead_customerId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Lead_jobId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Lead_assignedToId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_tenantId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_jobId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_customerId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_employeeId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_bookingId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invoice_recurrenceId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "RecurringInvoice"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RecurringInvoice_tenantId_fkey') THEN
    ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RecurringInvoice_customerId_fkey') THEN
    ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RecurringInvoice_jobId_fkey') THEN
    ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Review_tenantId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Notification_tenantId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Quote_tenantId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Quote_customerId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Quote_jobRequestId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Quote_jobId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Form_tenantId_fkey') THEN
    ALTER TABLE "Form" ADD CONSTRAINT "Form_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('FormResponse_formId_fkey') THEN
    ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WorkflowAutomation_tenantId_fkey') THEN
    ALTER TABLE "WorkflowAutomation" ADD CONSTRAINT "WorkflowAutomation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Workspace_tenantId_fkey') THEN
    ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Checklist_workspaceId_fkey') THEN
    ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Workflow_tenantId_fkey') THEN
    ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Workflow_workspaceId_fkey') THEN
    ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Workflow_createdById_fkey') THEN
    ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Workflow_folderId_fkey') THEN
    ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WorkflowVersion_workflowId_fkey') THEN
    ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Credential_workspaceId_fkey') THEN
    ALTER TABLE "Credential" ADD CONSTRAINT "Credential_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Credential_userId_fkey') THEN
    ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Execution_workflowId_fkey') THEN
    ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ExecutionNodeData_executionId_fkey') THEN
    ALTER TABLE "ExecutionNodeData" ADD CONSTRAINT "ExecutionNodeData_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WebhookRegistration_workflowId_fkey') THEN
    ALTER TABLE "WebhookRegistration" ADD CONSTRAINT "WebhookRegistration_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AuditLog_userId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ApiKey_userId_fkey') THEN
    ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Variable_workspaceId_fkey') THEN
    ALTER TABLE "Variable" ADD CONSTRAINT "Variable_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Folder_workspaceId_fkey') THEN
    ALTER TABLE "Folder" ADD CONSTRAINT "Folder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Folder_parentId_fkey') THEN
    ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Employee_workspaceId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Employee_currentJobId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentJobId_fkey" FOREIGN KEY ("currentJobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Employee_userId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EmployeeStatusLog_employeeId_fkey') THEN
    ALTER TABLE "EmployeeStatusLog" ADD CONSTRAINT "EmployeeStatusLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EmployeeStatusLog_changedById_fkey') THEN
    ALTER TABLE "EmployeeStatusLog" ADD CONSTRAINT "EmployeeStatusLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('NotificationLog_jobId_fkey') THEN
    ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('NotificationLog_employeeId_fkey') THEN
    ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('NotificationLog_customerId_fkey') THEN
    ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('NotificationLog_tenantId_fkey') THEN
    ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Customer_workspaceId_fkey') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Resource_workspaceId_fkey') THEN
    ALTER TABLE "Resource" ADD CONSTRAINT "Resource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Job_workspaceId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Job_assigneeId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Job_customerId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Job_resourceId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Job_recurringScheduleId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_recurringScheduleId_fkey" FOREIGN KEY ("recurringScheduleId") REFERENCES "RecurringJobSchedule"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactList_workspaceId_fkey') THEN
    ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactListEntry_contactListId_fkey') THEN
    ALTER TABLE "ContactListEntry" ADD CONSTRAINT "ContactListEntry_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WebhookSource_workspaceId_fkey') THEN
    ALTER TABLE "WebhookSource" ADD CONSTRAINT "WebhookSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WebhookEndpointLog_webhookEndpointId_fkey') THEN
    ALTER TABLE "WebhookEndpointLog" ADD CONSTRAINT "WebhookEndpointLog_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Conversation_customerId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Conversation_leadId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Conversation_jobId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Conversation_tenantId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CustomerJourney_customerId_fkey') THEN
    ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CustomerJourney_jobId_fkey') THEN
    ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CustomerJourney_leadId_fkey') THEN
    ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CustomerPortalSession_customerId_fkey') THEN
    ALTER TABLE "CustomerPortalSession" ADD CONSTRAINT "CustomerPortalSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EcommerceOrder_integrationId_fkey') THEN
    ALTER TABLE "EcommerceOrder" ADD CONSTRAINT "EcommerceOrder_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EcommerceProduct_integrationId_fkey') THEN
    ALTER TABLE "EcommerceProduct" ADD CONSTRAINT "EcommerceProduct_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EcommerceSyncLog_integrationId_fkey') THEN
    ALTER TABLE "EcommerceSyncLog" ADD CONSTRAINT "EcommerceSyncLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CommunicationProvider_credentialId_fkey') THEN
    ALTER TABLE "CommunicationProvider" ADD CONSTRAINT "CommunicationProvider_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactTag_contactId_fkey') THEN
    ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactTag_tagId_fkey') THEN
    ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Group_parentGroupId_fkey') THEN
    ALTER TABLE "Group" ADD CONSTRAINT "Group_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "Group"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactGroup_contactId_fkey') THEN
    ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ContactGroup_groupId_fkey') THEN
    ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('TriggerExecution_automationId_fkey') THEN
    ALTER TABLE "TriggerExecution" ADD CONSTRAINT "TriggerExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "WorkflowAutomation"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('MenuItemConfig_tenantId_fkey') THEN
    ALTER TABLE "MenuItemConfig" ADD CONSTRAINT "MenuItemConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('FeatureFlag_tenantId_fkey') THEN
    ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Booking_employeeId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Document_customerId_fkey') THEN
    ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Document_jobId_fkey') THEN
    ALTER TABLE "Document" ADD CONSTRAINT "Document_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Document_employeeId_fkey') THEN
    ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invitation_invitedById_fkey') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invitation_tenantId_fkey') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invitation_workspaceId_fkey') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invitation_employeeId_fkey') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Invitation_customerId_fkey') THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PaymentMethod_customerId_fkey') THEN
    ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('HubIntegrationConnection_tenantId_fkey') THEN
    ALTER TABLE "HubIntegrationConnection" ADD CONSTRAINT "HubIntegrationConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('MetaLeadConfig_tenantId_fkey') THEN
    ALTER TABLE "MetaLeadConfig" ADD CONSTRAINT "MetaLeadConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('MetaLead_tenantId_fkey') THEN
    ALTER TABLE "MetaLead" ADD CONSTRAINT "MetaLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('GoogleAdsLeadConfig_tenantId_fkey') THEN
    ALTER TABLE "GoogleAdsLeadConfig" ADD CONSTRAINT "GoogleAdsLeadConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('GoogleAdsLead_tenantId_fkey') THEN
    ALTER TABLE "GoogleAdsLead" ADD CONSTRAINT "GoogleAdsLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('SupportCategory_parentId_fkey') THEN
    ALTER TABLE "SupportCategory" ADD CONSTRAINT "SupportCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SupportCategory"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('SupportTicket_categoryId_fkey') THEN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupportCategory"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('TicketMessage_ticketId_fkey') THEN
    ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('TicketAttachment_ticketId_fkey') THEN
    ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('TicketAttachment_messageId_fkey') THEN
    ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PublicChatSession_tenantId_fkey') THEN
    ALTER TABLE "PublicChatSession" ADD CONSTRAINT "PublicChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PublicChatMessage_sessionId_fkey') THEN
    ALTER TABLE "PublicChatMessage" ADD CONSTRAINT "PublicChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicChatSession"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiAgent_tenantId_fkey') THEN
    ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiPhoneNumber_tenantId_fkey') THEN
    ALTER TABLE "AiPhoneNumber" ADD CONSTRAINT "AiPhoneNumber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiPhoneNumber_assistantId_fkey') THEN
    ALTER TABLE "AiPhoneNumber" ADD CONSTRAINT "AiPhoneNumber_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "AiAgent"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiCall_tenantId_fkey') THEN
    ALTER TABLE "AiCall" ADD CONSTRAINT "AiCall_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiCall_assistantId_fkey') THEN
    ALTER TABLE "AiCall" ADD CONSTRAINT "AiCall_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "AiAgent"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AiCall_phoneNumberId_fkey') THEN
    ALTER TABLE "AiCall" ADD CONSTRAINT "AiCall_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "AiPhoneNumber"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('MarketplaceTransaction_tenantId_fkey') THEN
    ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('MarketplaceTransaction_payoutId_fkey') THEN
    ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Payout_tenantId_fkey') THEN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('FeaturedListing_tenantId_fkey') THEN
    ALTER TABLE "FeaturedListing" ADD CONSTRAINT "FeaturedListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('AICredit_tenantId_fkey') THEN
    ALTER TABLE "AICredit" ADD CONSTRAINT "AICredit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('UsageCharge_tenantId_fkey') THEN
    ALTER TABLE "UsageCharge" ADD CONSTRAINT "UsageCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Branch_tenantId_fkey') THEN
    ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('HolidayCalendar_tenantId_fkey') THEN
    ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ServiceRegion_tenantId_fkey') THEN
    ALTER TABLE "ServiceRegion" ADD CONSTRAINT "ServiceRegion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('TaxRule_tenantId_fkey') THEN
    ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('NumberSequence_tenantId_fkey') THEN
    ALTER TABLE "NumberSequence" ADD CONSTRAINT "NumberSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CustomField_tenantId_fkey') THEN
    ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ApprovalFlow_tenantId_fkey') THEN
    ALTER TABLE "ApprovalFlow" ADD CONSTRAINT "ApprovalFlow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('CommissionRule_tenantId_fkey') THEN
    ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PaymentGatewayConfig_tenantId_fkey') THEN
    ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PricingRule_tenantId_fkey') THEN
    ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PricingRule_serviceId_fkey') THEN
    ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Assessment_tenantId_fkey') THEN
    ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('JobStateTransition_tenantId_fkey') THEN
    ALTER TABLE "JobStateTransition" ADD CONSTRAINT "JobStateTransition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('QualityInspection_tenantId_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('RequestExtraction_tenantId_fkey') THEN
    ALTER TABLE "RequestExtraction" ADD CONSTRAINT "RequestExtraction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('InventoryItem_tenantId_fkey') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('InventoryItem_supplierId_fkey') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Warehouse_tenantId_fkey') THEN
    ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Supplier_tenantId_fkey') THEN
    ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('PurchaseOrder_tenantId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('StockTransfer_tenantId_fkey') THEN
    ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('StockTransaction_tenantId_fkey') THEN
    ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('StockTransaction_inventoryItemId_fkey') THEN
    ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ServicePlan_tenantId_fkey') THEN
    ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ServicePlanSubscription_tenantId_fkey') THEN
    ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ServicePlanSubscription_servicePlanId_fkey') THEN
    ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Warranty_tenantId_fkey') THEN
    ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WarrantyClaim_tenantId_fkey') THEN
    ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('WarrantyClaim_warrantyId_fkey') THEN
    ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('JobRequest_tenantId_fkey') THEN
    ALTER TABLE "JobRequest" ADD CONSTRAINT "JobRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('EmergencyDispatch_tenantId_fkey') THEN
    ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ProviderPortfolio_tenantId_fkey') THEN
    ALTER TABLE "ProviderPortfolio" ADD CONSTRAINT "ProviderPortfolio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('ProviderCertification_tenantId_fkey') THEN
    ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Membership_tenantId_fkey') THEN
    ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Promotion_tenantId_fkey') THEN
    ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('LoyaltyPoint_tenantId_fkey') THEN
    ALTER TABLE "LoyaltyPoint" ADD CONSTRAINT "LoyaltyPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _fk_exists('Referral_tenantId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ##########################################
-- PHASE 5: INDEXES
-- ##########################################


CREATE INDEX IF NOT EXISTS "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_plan_idx" ON "Tenant"("plan");
CREATE INDEX IF NOT EXISTS "Tenant_planStatus_idx" ON "Tenant"("planStatus");

CREATE INDEX IF NOT EXISTS "Subscription_tenantId_idx" ON "Subscription"("tenantId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");

CREATE INDEX IF NOT EXISTS "SubscriptionPayment_tenantId_idx" ON "SubscriptionPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_paidAt_idx" ON "SubscriptionPayment"("paidAt");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_paypalOrderId_idx" ON "SubscriptionPayment"("paypalOrderId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_plan_idx" ON "SubscriptionPayment"("plan");

CREATE INDEX IF NOT EXISTS "BillingEvent_tenantId_idx" ON "BillingEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "BillingEvent_type_idx" ON "BillingEvent"("type");
CREATE INDEX IF NOT EXISTS "BillingEvent_status_idx" ON "BillingEvent"("status");
CREATE INDEX IF NOT EXISTS "BillingEvent_createdAt_idx" ON "BillingEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "BillingEvent_paypalOrderId_idx" ON "BillingEvent"("paypalOrderId");

CREATE INDEX IF NOT EXISTS "Plan_code_idx" ON "Plan"("code");
CREATE INDEX IF NOT EXISTS "Plan_isActive_idx" ON "Plan"("isActive");

CREATE INDEX IF NOT EXISTS "PlanFeatureMatrix_planCode_idx" ON "PlanFeatureMatrix"("planCode");

CREATE INDEX IF NOT EXISTS "AddonSubscription_tenantId_idx" ON "AddonSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "AddonSubscription_addonCode_idx" ON "AddonSubscription"("addonCode");
CREATE INDEX IF NOT EXISTS "AddonSubscription_status_idx" ON "AddonSubscription"("status");

CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_tenantId_idx" ON "RecurringJobSchedule"("tenantId");
CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_active_idx" ON "RecurringJobSchedule"("active");
CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_nextRunAt_idx" ON "RecurringJobSchedule"("nextRunAt");
CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_customerId_idx" ON "RecurringJobSchedule"("customerId");

CREATE INDEX IF NOT EXISTS "ScheduledMessage_tenantId_idx" ON "ScheduledMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_status_idx" ON "ScheduledMessage"("status");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_dueAt_idx" ON "ScheduledMessage"("dueAt");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_customerId_idx" ON "ScheduledMessage"("customerId");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_jobId_idx" ON "ScheduledMessage"("jobId");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_invoiceId_idx" ON "ScheduledMessage"("invoiceId");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_quoteId_idx" ON "ScheduledMessage"("quoteId");

CREATE INDEX IF NOT EXISTS "ScheduledExecution_tenantId_idx" ON "ScheduledExecution"("tenantId");
CREATE INDEX IF NOT EXISTS "ScheduledExecution_status_idx" ON "ScheduledExecution"("status");
CREATE INDEX IF NOT EXISTS "ScheduledExecution_dueAt_idx" ON "ScheduledExecution"("dueAt");
CREATE INDEX IF NOT EXISTS "ScheduledExecution_entityType_entityId_idx" ON "ScheduledExecution"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

CREATE INDEX IF NOT EXISTS "Service_tenantId_idx" ON "Service"("tenantId");
CREATE INDEX IF NOT EXISTS "Service_category_idx" ON "Service"("category");
CREATE INDEX IF NOT EXISTS "Service_checklistId_idx" ON "Service"("checklistId");
CREATE INDEX IF NOT EXISTS "Service_isPublic_idx" ON "Service"("isPublic");

CREATE INDEX IF NOT EXISTS "Lead_tenantId_idx" ON "Lead"("tenantId");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead"("source");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_invoiceType_idx" ON "Invoice"("invoiceType");
CREATE INDEX IF NOT EXISTS "Invoice_bookingId_idx" ON "Invoice"("bookingId");
CREATE INDEX IF NOT EXISTS "Invoice_recurrenceId_idx" ON "Invoice"("recurrenceId");
CREATE INDEX IF NOT EXISTS "Invoice_parentInvoiceId_idx" ON "Invoice"("parentInvoiceId");

CREATE INDEX IF NOT EXISTS "RecurringInvoice_tenantId_idx" ON "RecurringInvoice"("tenantId");
CREATE INDEX IF NOT EXISTS "RecurringInvoice_customerId_idx" ON "RecurringInvoice"("customerId");
CREATE INDEX IF NOT EXISTS "RecurringInvoice_active_idx" ON "RecurringInvoice"("active");
CREATE INDEX IF NOT EXISTS "RecurringInvoice_nextRunAt_idx" ON "RecurringInvoice"("nextRunAt");

CREATE INDEX IF NOT EXISTS "Expense_tenantId_idx" ON "Expense"("tenantId");
CREATE INDEX IF NOT EXISTS "Expense_status_idx" ON "Expense"("status");
CREATE INDEX IF NOT EXISTS "Expense_employeeId_idx" ON "Expense"("employeeId");
CREATE INDEX IF NOT EXISTS "Expense_jobId_idx" ON "Expense"("jobId");
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");
CREATE INDEX IF NOT EXISTS "Expense_expenseDate_idx" ON "Expense"("expenseDate");

CREATE INDEX IF NOT EXISTS "Review_tenantId_idx" ON "Review"("tenantId");
CREATE INDEX IF NOT EXISTS "Review_employeeId_idx" ON "Review"("employeeId");
CREATE INDEX IF NOT EXISTS "Review_rating_idx" ON "Review"("rating");
CREATE INDEX IF NOT EXISTS "Review_status_idx" ON "Review"("status");
CREATE INDEX IF NOT EXISTS "Review_source_idx" ON "Review"("source");

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");

CREATE INDEX IF NOT EXISTS "Quote_tenantId_idx" ON "Quote"("tenantId");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");
CREATE INDEX IF NOT EXISTS "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX IF NOT EXISTS "Quote_jobId_idx" ON "Quote"("jobId");
CREATE INDEX IF NOT EXISTS "Quote_dealId_idx" ON "Quote"("dealId");

CREATE INDEX IF NOT EXISTS "Form_tenantId_idx" ON "Form"("tenantId");
CREATE INDEX IF NOT EXISTS "Form_type_idx" ON "Form"("type");
CREATE INDEX IF NOT EXISTS "Form_status_idx" ON "Form"("status");
CREATE INDEX IF NOT EXISTS "Form_slug_idx" ON "Form"("slug");

CREATE INDEX IF NOT EXISTS "FormResponse_formId_idx" ON "FormResponse"("formId");
CREATE INDEX IF NOT EXISTS "FormResponse_source_idx" ON "FormResponse"("source");
CREATE INDEX IF NOT EXISTS "FormResponse_tenantId_idx" ON "FormResponse"("tenantId");
CREATE INDEX IF NOT EXISTS "FormResponse_createdAt_idx" ON "FormResponse"("createdAt");

CREATE INDEX IF NOT EXISTS "WorkflowAutomation_tenantId_idx" ON "WorkflowAutomation"("tenantId");
CREATE INDEX IF NOT EXISTS "WorkflowAutomation_triggerType_idx" ON "WorkflowAutomation"("triggerType");
CREATE INDEX IF NOT EXISTS "WorkflowAutomation_active_idx" ON "WorkflowAutomation"("active");

CREATE INDEX IF NOT EXISTS "Workspace_tenantId_idx" ON "Workspace"("tenantId");

CREATE INDEX IF NOT EXISTS "Checklist_workspaceId_idx" ON "Checklist"("workspaceId");
CREATE INDEX IF NOT EXISTS "Checklist_category_idx" ON "Checklist"("category");

CREATE INDEX IF NOT EXISTS "Workflow_tenantId_idx" ON "Workflow"("tenantId");
CREATE INDEX IF NOT EXISTS "Workflow_workspaceId_idx" ON "Workflow"("workspaceId");
CREATE INDEX IF NOT EXISTS "Workflow_active_idx" ON "Workflow"("active");

CREATE INDEX IF NOT EXISTS "WorkflowVersion_workflowId_idx" ON "WorkflowVersion"("workflowId");

CREATE INDEX IF NOT EXISTS "Credential_workspaceId_idx" ON "Credential"("workspaceId");

CREATE INDEX IF NOT EXISTS "Execution_workflowId_idx" ON "Execution"("workflowId");
CREATE INDEX IF NOT EXISTS "Execution_status_idx" ON "Execution"("status");

CREATE INDEX IF NOT EXISTS "ExecutionNodeData_executionId_idx" ON "ExecutionNodeData"("executionId");

CREATE INDEX IF NOT EXISTS "WebhookRegistration_workflowId_idx" ON "WebhookRegistration"("workflowId");
CREATE INDEX IF NOT EXISTS "WebhookRegistration_path_idx" ON "WebhookRegistration"("path");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");

CREATE INDEX IF NOT EXISTS "Folder_workspaceId_idx" ON "Folder"("workspaceId");

CREATE INDEX IF NOT EXISTS "Template_category_idx" ON "Template"("category");

CREATE INDEX IF NOT EXISTS "Employee_role_idx" ON "Employee"("role");
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");
CREATE INDEX IF NOT EXISTS "Employee_workspaceId_idx" ON "Employee"("workspaceId");
CREATE INDEX IF NOT EXISTS "Employee_lastSeenAt_idx" ON "Employee"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "Employee_currentJobId_idx" ON "Employee"("currentJobId");
CREATE INDEX IF NOT EXISTS "Employee_userId_idx" ON "Employee"("userId");
CREATE INDEX IF NOT EXISTS "Employee_invitationStatus_idx" ON "Employee"("invitationStatus");

CREATE INDEX IF NOT EXISTS "EmployeeStatusLog_employeeId_idx" ON "EmployeeStatusLog"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeStatusLog_toStatus_idx" ON "EmployeeStatusLog"("toStatus");
CREATE INDEX IF NOT EXISTS "EmployeeStatusLog_createdAt_idx" ON "EmployeeStatusLog"("createdAt");

CREATE INDEX IF NOT EXISTS "NotificationLog_type_idx" ON "NotificationLog"("type");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_jobId_idx" ON "NotificationLog"("jobId");
CREATE INDEX IF NOT EXISTS "NotificationLog_employeeId_idx" ON "NotificationLog"("employeeId");
CREATE INDEX IF NOT EXISTS "NotificationLog_customerId_idx" ON "NotificationLog"("customerId");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
CREATE INDEX IF NOT EXISTS "Customer_workspaceId_idx" ON "Customer"("workspaceId");
CREATE INDEX IF NOT EXISTS "Customer_portalEnabled_idx" ON "Customer"("portalEnabled");
CREATE INDEX IF NOT EXISTS "Customer_invitationStatus_idx" ON "Customer"("invitationStatus");

CREATE INDEX IF NOT EXISTS "Resource_type_idx" ON "Resource"("type");
CREATE INDEX IF NOT EXISTS "Resource_status_idx" ON "Resource"("status");

CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status");
CREATE INDEX IF NOT EXISTS "Job_assigneeId_idx" ON "Job"("assigneeId");
CREATE INDEX IF NOT EXISTS "Job_customerId_idx" ON "Job"("customerId");
CREATE INDEX IF NOT EXISTS "Job_scheduledAt_idx" ON "Job"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Job_workspaceId_idx" ON "Job"("workspaceId");
CREATE INDEX IF NOT EXISTS "Job_recurringScheduleId_idx" ON "Job"("recurringScheduleId");

CREATE INDEX IF NOT EXISTS "ContactList_type_idx" ON "ContactList"("type");
CREATE INDEX IF NOT EXISTS "ContactList_workspaceId_idx" ON "ContactList"("workspaceId");

CREATE INDEX IF NOT EXISTS "ContactListEntry_contactListId_idx" ON "ContactListEntry"("contactListId");

CREATE INDEX IF NOT EXISTS "WebhookSource_type_idx" ON "WebhookSource"("type");
CREATE INDEX IF NOT EXISTS "WebhookSource_status_idx" ON "WebhookSource"("status");

CREATE INDEX IF NOT EXISTS "WebhookEndpoint_endpointId_idx" ON "WebhookEndpoint"("endpointId");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_apiKeyHash_idx" ON "WebhookEndpoint"("apiKeyHash");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_tenantId_idx" ON "WebhookEndpoint"("tenantId");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_active_idx" ON "WebhookEndpoint"("active");

CREATE INDEX IF NOT EXISTS "WebhookEndpointLog_webhookEndpointId_idx" ON "WebhookEndpointLog"("webhookEndpointId");
CREATE INDEX IF NOT EXISTS "WebhookEndpointLog_status_idx" ON "WebhookEndpointLog"("status");
CREATE INDEX IF NOT EXISTS "WebhookEndpointLog_createdAt_idx" ON "WebhookEndpointLog"("createdAt");

CREATE INDEX IF NOT EXISTS "WebhookTestRequest_path_idx" ON "WebhookTestRequest"("path");

CREATE INDEX IF NOT EXISTS "WhatsAppMessageAction_whatsappMessageId_idx" ON "WhatsAppMessageAction"("whatsappMessageId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessageAction_workflowId_idx" ON "WhatsAppMessageAction"("workflowId");

CREATE INDEX IF NOT EXISTS "EventWebhook_event_idx" ON "EventWebhook"("event");
CREATE INDEX IF NOT EXISTS "EventWebhook_active_idx" ON "EventWebhook"("active");
CREATE INDEX IF NOT EXISTS "EventWebhook_workspaceId_idx" ON "EventWebhook"("workspaceId");
CREATE INDEX IF NOT EXISTS "EventWebhook_tenantId_idx" ON "EventWebhook"("tenantId");

CREATE INDEX IF NOT EXISTS "EventWebhookLog_eventWebhookId_idx" ON "EventWebhookLog"("eventWebhookId");
CREATE INDEX IF NOT EXISTS "EventWebhookLog_event_idx" ON "EventWebhookLog"("event");
CREATE INDEX IF NOT EXISTS "EventWebhookLog_jobId_idx" ON "EventWebhookLog"("jobId");
CREATE INDEX IF NOT EXISTS "EventWebhookLog_createdAt_idx" ON "EventWebhookLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Conversation_conversationId_idx" ON "Conversation"("conversationId");
CREATE INDEX IF NOT EXISTS "Conversation_customerPhone_idx" ON "Conversation"("customerPhone");
CREATE INDEX IF NOT EXISTS "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_idx" ON "Conversation"("tenantId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_channel_idx" ON "Conversation"("channel");

CREATE INDEX IF NOT EXISTS "ChannelConfig_channel_idx" ON "ChannelConfig"("channel");
CREATE INDEX IF NOT EXISTS "ChannelConfig_status_idx" ON "ChannelConfig"("status");
CREATE INDEX IF NOT EXISTS "ChannelConfig_tenantId_idx" ON "ChannelConfig"("tenantId");

CREATE INDEX IF NOT EXISTS "CustomerJourney_customerId_idx" ON "CustomerJourney"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerJourney_jobId_idx" ON "CustomerJourney"("jobId");
CREATE INDEX IF NOT EXISTS "CustomerJourney_currentStage_idx" ON "CustomerJourney"("currentStage");
CREATE INDEX IF NOT EXISTS "CustomerJourney_nextActionAt_idx" ON "CustomerJourney"("nextActionAt");
CREATE INDEX IF NOT EXISTS "CustomerJourney_tenantId_idx" ON "CustomerJourney"("tenantId");

CREATE INDEX IF NOT EXISTS "CustomerPortalSession_token_idx" ON "CustomerPortalSession"("token");
CREATE INDEX IF NOT EXISTS "CustomerPortalSession_customerId_idx" ON "CustomerPortalSession"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerPortalSession_expiresAt_idx" ON "CustomerPortalSession"("expiresAt");

CREATE INDEX IF NOT EXISTS "OtpVerification_phone_idx" ON "OtpVerification"("phone");
CREATE INDEX IF NOT EXISTS "OtpVerification_otpCode_idx" ON "OtpVerification"("otpCode");
CREATE INDEX IF NOT EXISTS "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

CREATE INDEX IF NOT EXISTS "IntegrationConfig_type_idx" ON "IntegrationConfig"("type");
CREATE INDEX IF NOT EXISTS "IntegrationConfig_active_idx" ON "IntegrationConfig"("active");
CREATE INDEX IF NOT EXISTS "IntegrationConfig_tenantId_idx" ON "IntegrationConfig"("tenantId");

CREATE INDEX IF NOT EXISTS "IntegrationConnection_provider_idx" ON "IntegrationConnection"("provider");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_tenantId_idx" ON "IntegrationConnection"("tenantId");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_lastSyncAt_idx" ON "IntegrationConnection"("lastSyncAt");

CREATE INDEX IF NOT EXISTS "EcommerceOrder_status_idx" ON "EcommerceOrder"("status");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_financialStatus_idx" ON "EcommerceOrder"("financialStatus");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_customerId_idx" ON "EcommerceOrder"("customerId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_tenantId_idx" ON "EcommerceOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_orderedAt_idx" ON "EcommerceOrder"("orderedAt");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_integrationId_idx" ON "EcommerceOrder"("integrationId");

CREATE INDEX IF NOT EXISTS "EcommerceProduct_status_idx" ON "EcommerceProduct"("status");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_tenantId_idx" ON "EcommerceProduct"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_sku_idx" ON "EcommerceProduct"("sku");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_productType_idx" ON "EcommerceProduct"("productType");
CREATE INDEX IF NOT EXISTS "EcommerceProduct_integrationId_idx" ON "EcommerceProduct"("integrationId");

CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_entity_idx" ON "EcommerceSyncLog"("entity");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_status_idx" ON "EcommerceSyncLog"("status");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_tenantId_idx" ON "EcommerceSyncLog"("tenantId");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_integrationId_idx" ON "EcommerceSyncLog"("integrationId");
CREATE INDEX IF NOT EXISTS "EcommerceSyncLog_createdAt_idx" ON "EcommerceSyncLog"("createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");
CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_metric_idx" ON "AnalyticsSnapshot"("metric");
CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_tenantId_idx" ON "AnalyticsSnapshot"("tenantId");

CREATE INDEX IF NOT EXISTS "InboxMessage_conversationId_idx" ON "InboxMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "InboxMessage_senderType_idx" ON "InboxMessage"("senderType");
CREATE INDEX IF NOT EXISTS "InboxMessage_direction_idx" ON "InboxMessage"("direction");
CREATE INDEX IF NOT EXISTS "InboxMessage_status_idx" ON "InboxMessage"("status");
CREATE INDEX IF NOT EXISTS "InboxMessage_tenantId_idx" ON "InboxMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "InboxMessage_createdAt_idx" ON "InboxMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "ChatLabel_tenantId_idx" ON "ChatLabel"("tenantId");

CREATE INDEX IF NOT EXISTS "ConversationLabel_conversationId_idx" ON "ConversationLabel"("conversationId");
CREATE INDEX IF NOT EXISTS "ConversationLabel_labelId_idx" ON "ConversationLabel"("labelId");

CREATE INDEX IF NOT EXISTS "ConversationAssignment_conversationId_idx" ON "ConversationAssignment"("conversationId");
CREATE INDEX IF NOT EXISTS "ConversationAssignment_agentId_idx" ON "ConversationAssignment"("agentId");
CREATE INDEX IF NOT EXISTS "ConversationAssignment_status_idx" ON "ConversationAssignment"("status");

CREATE INDEX IF NOT EXISTS "TimelineEvent_customerId_idx" ON "TimelineEvent"("customerId");
CREATE INDEX IF NOT EXISTS "TimelineEvent_eventType_idx" ON "TimelineEvent"("eventType");
CREATE INDEX IF NOT EXISTS "TimelineEvent_tenantId_idx" ON "TimelineEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "TimelineEvent_createdAt_idx" ON "TimelineEvent"("createdAt");

CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX IF NOT EXISTS "Campaign_type_idx" ON "Campaign"("type");
CREATE INDEX IF NOT EXISTS "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX IF NOT EXISTS "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");

CREATE INDEX IF NOT EXISTS "CampaignMessage_campaignId_idx" ON "CampaignMessage"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignMessage_status_idx" ON "CampaignMessage"("status");
CREATE INDEX IF NOT EXISTS "CampaignMessage_recipientPhone_idx" ON "CampaignMessage"("recipientPhone");

CREATE INDEX IF NOT EXISTS "CampaignTemplate_category_idx" ON "CampaignTemplate"("category");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_tenantId_idx" ON "CampaignTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_templateType_idx" ON "CampaignTemplate"("templateType");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_status_idx" ON "CampaignTemplate"("status");

CREATE INDEX IF NOT EXISTS "Segment_tenantId_idx" ON "Segment"("tenantId");
CREATE INDEX IF NOT EXISTS "Segment_type_idx" ON "Segment"("type");

CREATE INDEX IF NOT EXISTS "SegmentMember_segmentId_idx" ON "SegmentMember"("segmentId");
CREATE INDEX IF NOT EXISTS "SegmentMember_customerId_idx" ON "SegmentMember"("customerId");

CREATE INDEX IF NOT EXISTS "RetargetingRule_triggerType_idx" ON "RetargetingRule"("triggerType");
CREATE INDEX IF NOT EXISTS "RetargetingRule_status_idx" ON "RetargetingRule"("status");
CREATE INDEX IF NOT EXISTS "RetargetingRule_tenantId_idx" ON "RetargetingRule"("tenantId");

CREATE INDEX IF NOT EXISTS "RetargetingLog_ruleId_idx" ON "RetargetingLog"("ruleId");
CREATE INDEX IF NOT EXISTS "RetargetingLog_customerId_idx" ON "RetargetingLog"("customerId");
CREATE INDEX IF NOT EXISTS "RetargetingLog_createdAt_idx" ON "RetargetingLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Chatbot_status_idx" ON "Chatbot"("status");
CREATE INDEX IF NOT EXISTS "Chatbot_tenantId_idx" ON "Chatbot"("tenantId");

CREATE INDEX IF NOT EXISTS "ChatbotSession_chatbotId_idx" ON "ChatbotSession"("chatbotId");
CREATE INDEX IF NOT EXISTS "ChatbotSession_customerId_idx" ON "ChatbotSession"("customerId");
CREATE INDEX IF NOT EXISTS "ChatbotSession_status_idx" ON "ChatbotSession"("status");
CREATE INDEX IF NOT EXISTS "ChatbotSession_startedAt_idx" ON "ChatbotSession"("startedAt");

CREATE INDEX IF NOT EXISTS "WAForm_type_idx" ON "WAForm"("type");
CREATE INDEX IF NOT EXISTS "WAForm_tenantId_idx" ON "WAForm"("tenantId");
CREATE INDEX IF NOT EXISTS "WAForm_status_idx" ON "WAForm"("status");

CREATE INDEX IF NOT EXISTS "WAFormResponse_formId_idx" ON "WAFormResponse"("formId");
CREATE INDEX IF NOT EXISTS "WAFormResponse_respondentPhone_idx" ON "WAFormResponse"("respondentPhone");

CREATE INDEX IF NOT EXISTS "WAWebview_type_idx" ON "WAWebview"("type");
CREATE INDEX IF NOT EXISTS "WAWebview_tenantId_idx" ON "WAWebview"("tenantId");

CREATE INDEX IF NOT EXISTS "AdCampaign_platform_idx" ON "AdCampaign"("platform");
CREATE INDEX IF NOT EXISTS "AdCampaign_status_idx" ON "AdCampaign"("status");
CREATE INDEX IF NOT EXISTS "AdCampaign_tenantId_idx" ON "AdCampaign"("tenantId");

CREATE INDEX IF NOT EXISTS "AdConversion_adCampaignId_idx" ON "AdConversion"("adCampaignId");
CREATE INDEX IF NOT EXISTS "AdConversion_customerId_idx" ON "AdConversion"("customerId");
CREATE INDEX IF NOT EXISTS "AdConversion_leadId_idx" ON "AdConversion"("leadId");
CREATE INDEX IF NOT EXISTS "AdConversion_createdAt_idx" ON "AdConversion"("createdAt");

CREATE INDEX IF NOT EXISTS "JourneyWorkflow_status_idx" ON "JourneyWorkflow"("status");
CREATE INDEX IF NOT EXISTS "JourneyWorkflow_triggerType_idx" ON "JourneyWorkflow"("triggerType");
CREATE INDEX IF NOT EXISTS "JourneyWorkflow_tenantId_idx" ON "JourneyWorkflow"("tenantId");

CREATE INDEX IF NOT EXISTS "JourneyExecution_journeyId_idx" ON "JourneyExecution"("journeyId");
CREATE INDEX IF NOT EXISTS "JourneyExecution_customerId_idx" ON "JourneyExecution"("customerId");
CREATE INDEX IF NOT EXISTS "JourneyExecution_status_idx" ON "JourneyExecution"("status");
CREATE INDEX IF NOT EXISTS "JourneyExecution_nextActionAt_idx" ON "JourneyExecution"("nextActionAt");

CREATE INDEX IF NOT EXISTS "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX IF NOT EXISTS "Deal_assigneeId_idx" ON "Deal"("assigneeId");
CREATE INDEX IF NOT EXISTS "Deal_customerId_idx" ON "Deal"("customerId");
CREATE INDEX IF NOT EXISTS "Deal_tenantId_idx" ON "Deal"("tenantId");
CREATE INDEX IF NOT EXISTS "Deal_convertedJobId_idx" ON "Deal"("convertedJobId");

CREATE INDEX IF NOT EXISTS "PipelineStage_tenantId_sortOrder_idx" ON "PipelineStage"("tenantId", "sortOrder");

CREATE INDEX IF NOT EXISTS "PipelineTask_dealId_completedAt_idx" ON "PipelineTask"("dealId", "completedAt");
CREATE INDEX IF NOT EXISTS "PipelineTask_tenantId_ownerId_idx" ON "PipelineTask"("tenantId", "ownerId");

CREATE INDEX IF NOT EXISTS "DealStageHistory_dealId_idx" ON "DealStageHistory"("dealId");
CREATE INDEX IF NOT EXISTS "DealStageHistory_toStage_idx" ON "DealStageHistory"("toStage");
CREATE INDEX IF NOT EXISTS "DealStageHistory_createdAt_idx" ON "DealStageHistory"("createdAt");

CREATE INDEX IF NOT EXISTS "UnifiedMessage_channel_idx" ON "UnifiedMessage"("channel");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_direction_idx" ON "UnifiedMessage"("direction");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_customerId_idx" ON "UnifiedMessage"("customerId");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_tenantId_idx" ON "UnifiedMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_createdAt_idx" ON "UnifiedMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_category_idx" ON "MarketplaceTemplate"("category");
CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_featured_idx" ON "MarketplaceTemplate"("featured");
CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_downloads_idx" ON "MarketplaceTemplate"("downloads");

CREATE INDEX IF NOT EXISTS "RolePermission_role_idx" ON "RolePermission"("role");
CREATE INDEX IF NOT EXISTS "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");

CREATE INDEX IF NOT EXISTS "AgentMonitor_agentId_idx" ON "AgentMonitor"("agentId");
CREATE INDEX IF NOT EXISTS "AgentMonitor_status_idx" ON "AgentMonitor"("status");
CREATE INDEX IF NOT EXISTS "AgentMonitor_tenantId_idx" ON "AgentMonitor"("tenantId");

CREATE INDEX IF NOT EXISTS "DataRetentionPolicy_tenantId_idx" ON "DataRetentionPolicy"("tenantId");

CREATE INDEX IF NOT EXISTS "ConversationExport_requestedById_idx" ON "ConversationExport"("requestedById");
CREATE INDEX IF NOT EXISTS "ConversationExport_status_idx" ON "ConversationExport"("status");
CREATE INDEX IF NOT EXISTS "ConversationExport_tenantId_idx" ON "ConversationExport"("tenantId");

CREATE INDEX IF NOT EXISTS "CommunicationProvider_type_idx" ON "CommunicationProvider"("type");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_provider_idx" ON "CommunicationProvider"("provider");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_status_idx" ON "CommunicationProvider"("status");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_tenantId_idx" ON "CommunicationProvider"("tenantId");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_credentialId_idx" ON "CommunicationProvider"("credentialId");
CREATE INDEX IF NOT EXISTS "CommunicationProvider_isPlatform_idx" ON "CommunicationProvider"("isPlatform");

CREATE INDEX IF NOT EXISTS "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX IF NOT EXISTS "Contact_email_idx" ON "Contact"("email");
CREATE INDEX IF NOT EXISTS "Contact_phone_idx" ON "Contact"("phone");
CREATE INDEX IF NOT EXISTS "Contact_createdAt_idx" ON "Contact"("createdAt");
CREATE INDEX IF NOT EXISTS "Contact_status_idx" ON "Contact"("status");
CREATE INDEX IF NOT EXISTS "Contact_source_idx" ON "Contact"("source");
CREATE INDEX IF NOT EXISTS "Contact_country_idx" ON "Contact"("country");
CREATE INDEX IF NOT EXISTS "Contact_city_idx" ON "Contact"("city");

CREATE INDEX IF NOT EXISTS "Tag_tenantId_idx" ON "Tag"("tenantId");

CREATE INDEX IF NOT EXISTS "ContactTag_contactId_idx" ON "ContactTag"("contactId");
CREATE INDEX IF NOT EXISTS "ContactTag_tagId_idx" ON "ContactTag"("tagId");

CREATE INDEX IF NOT EXISTS "Group_tenantId_idx" ON "Group"("tenantId");
CREATE INDEX IF NOT EXISTS "Group_parentGroupId_idx" ON "Group"("parentGroupId");
CREATE INDEX IF NOT EXISTS "Group_type_idx" ON "Group"("type");

CREATE INDEX IF NOT EXISTS "ContactGroup_contactId_idx" ON "ContactGroup"("contactId");
CREATE INDEX IF NOT EXISTS "ContactGroup_groupId_idx" ON "ContactGroup"("groupId");

CREATE INDEX IF NOT EXISTS "ContactImport_tenantId_idx" ON "ContactImport"("tenantId");
CREATE INDEX IF NOT EXISTS "ContactImport_status_idx" ON "ContactImport"("status");
CREATE INDEX IF NOT EXISTS "ContactImport_createdAt_idx" ON "ContactImport"("createdAt");

CREATE INDEX IF NOT EXISTS "ContactExport_tenantId_idx" ON "ContactExport"("tenantId");
CREATE INDEX IF NOT EXISTS "ContactExport_createdAt_idx" ON "ContactExport"("createdAt");

CREATE INDEX IF NOT EXISTS "EmailProvider_tenantId_idx" ON "EmailProvider"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailProvider_providerType_idx" ON "EmailProvider"("providerType");
CREATE INDEX IF NOT EXISTS "EmailProvider_usageType_idx" ON "EmailProvider"("usageType");
CREATE INDEX IF NOT EXISTS "EmailProvider_isDefaultTransactional_idx" ON "EmailProvider"("isDefaultTransactional");
CREATE INDEX IF NOT EXISTS "EmailProvider_isDefaultMarketing_idx" ON "EmailProvider"("isDefaultMarketing");

CREATE INDEX IF NOT EXISTS "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailTemplate_category_idx" ON "EmailTemplate"("category");
CREATE INDEX IF NOT EXISTS "EmailTemplate_slug_idx" ON "EmailTemplate"("slug");
CREATE INDEX IF NOT EXISTS "EmailTemplate_status_idx" ON "EmailTemplate"("status");

CREATE INDEX IF NOT EXISTS "TriggerExecution_automationId_idx" ON "TriggerExecution"("automationId");
CREATE INDEX IF NOT EXISTS "TriggerExecution_triggerEvent_idx" ON "TriggerExecution"("triggerEvent");
CREATE INDEX IF NOT EXISTS "TriggerExecution_status_idx" ON "TriggerExecution"("status");
CREATE INDEX IF NOT EXISTS "TriggerExecution_tenantId_idx" ON "TriggerExecution"("tenantId");
CREATE INDEX IF NOT EXISTS "TriggerExecution_createdAt_idx" ON "TriggerExecution"("createdAt");

CREATE INDEX IF NOT EXISTS "MenuItemConfig_tenantId_idx" ON "MenuItemConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "MenuItemConfig_menuKey_idx" ON "MenuItemConfig"("menuKey");
CREATE INDEX IF NOT EXISTS "MenuItemConfig_enabled_idx" ON "MenuItemConfig"("enabled");

CREATE INDEX IF NOT EXISTS "FeatureFlag_tenantId_idx" ON "FeatureFlag"("tenantId");
CREATE INDEX IF NOT EXISTS "FeatureFlag_featureKey_idx" ON "FeatureFlag"("featureKey");
CREATE INDEX IF NOT EXISTS "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_name_idx" ON "SubscriptionPlan"("name");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

CREATE INDEX IF NOT EXISTS "PlatformMetric_metric_idx" ON "PlatformMetric"("metric");
CREATE INDEX IF NOT EXISTS "PlatformMetric_recordedAt_idx" ON "PlatformMetric"("recordedAt");
CREATE INDEX IF NOT EXISTS "PlatformMetric_createdAt_idx" ON "PlatformMetric"("createdAt");

CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");
CREATE INDEX IF NOT EXISTS "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_tenantId_idx" ON "SecurityEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

CREATE INDEX IF NOT EXISTS "AuditLogEntry_userId_idx" ON "AuditLogEntry"("userId");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_tenantId_idx" ON "AuditLogEntry"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_action_idx" ON "AuditLogEntry"("action");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_resourceType_idx" ON "AuditLogEntry"("resourceType");
CREATE INDEX IF NOT EXISTS "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");

CREATE INDEX IF NOT EXISTS "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Booking_employeeId_idx" ON "Booking"("employeeId");
CREATE INDEX IF NOT EXISTS "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId");

CREATE INDEX IF NOT EXISTS "KnowledgeArticle_tenantId_idx" ON "KnowledgeArticle"("tenantId");
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_category_idx" ON "KnowledgeArticle"("category");
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_isActive_idx" ON "KnowledgeArticle"("isActive");
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_isPublic_idx" ON "KnowledgeArticle"("isPublic");

CREATE INDEX IF NOT EXISTS "Document_tenantId_idx" ON "Document"("tenantId");
CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");
CREATE INDEX IF NOT EXISTS "Document_category_idx" ON "Document"("category");
CREATE INDEX IF NOT EXISTS "Document_accessLevel_idx" ON "Document"("accessLevel");
CREATE INDEX IF NOT EXISTS "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

CREATE INDEX IF NOT EXISTS "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX IF NOT EXISTS "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX IF NOT EXISTS "Invitation_status_idx" ON "Invitation"("status");
CREATE INDEX IF NOT EXISTS "Invitation_tenantId_idx" ON "Invitation"("tenantId");
CREATE INDEX IF NOT EXISTS "Invitation_employeeId_idx" ON "Invitation"("employeeId");
CREATE INDEX IF NOT EXISTS "Invitation_customerId_idx" ON "Invitation"("customerId");
CREATE INDEX IF NOT EXISTS "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

CREATE INDEX IF NOT EXISTS "PaymentMethod_customerId_idx" ON "PaymentMethod"("customerId");
CREATE INDEX IF NOT EXISTS "PaymentMethod_tenantId_idx" ON "PaymentMethod"("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentMethod_isDefault_idx" ON "PaymentMethod"("isDefault");

CREATE INDEX IF NOT EXISTS "HubIntegrationConnection_tenantId_idx" ON "HubIntegrationConnection"("tenantId");

CREATE INDEX IF NOT EXISTS "MetaLead_tenantId_leadStatus_idx" ON "MetaLead"("tenantId", "leadStatus");
CREATE INDEX IF NOT EXISTS "MetaLead_tenantId_platform_idx" ON "MetaLead"("tenantId", "platform");

CREATE INDEX IF NOT EXISTS "GoogleAdsLead_tenantId_leadStatus_idx" ON "GoogleAdsLead"("tenantId", "leadStatus");

CREATE INDEX IF NOT EXISTS "ImageLibrary_tenantId_folder_idx" ON "ImageLibrary"("tenantId", "folder");

CREATE INDEX IF NOT EXISTS "TemplatePack_category_idx" ON "TemplatePack"("category");
CREATE INDEX IF NOT EXISTS "TemplatePack_industry_idx" ON "TemplatePack"("industry");

CREATE INDEX IF NOT EXISTS "TemplateAsset_companyId_bucket_idx" ON "TemplateAsset"("companyId", "bucket");
CREATE INDEX IF NOT EXISTS "TemplateAsset_companyId_folder_idx" ON "TemplateAsset"("companyId", "folder");
CREATE INDEX IF NOT EXISTS "TemplateAsset_bucket_idx" ON "TemplateAsset"("bucket");

CREATE INDEX IF NOT EXISTS "SupportCategory_tenantId_idx" ON "SupportCategory"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportCategory_isActive_idx" ON "SupportCategory"("isActive");
CREATE INDEX IF NOT EXISTS "SupportCategory_parentId_idx" ON "SupportCategory"("parentId");

CREATE INDEX IF NOT EXISTS "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportTicket_reporterId_idx" ON "SupportTicket"("reporterId");
CREATE INDEX IF NOT EXISTS "SupportTicket_assigneeId_idx" ON "SupportTicket"("assigneeId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_categoryId_idx" ON "SupportTicket"("categoryId");
CREATE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_idx" ON "SupportTicket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketMessage_authorId_idx" ON "TicketMessage"("authorId");
CREATE INDEX IF NOT EXISTS "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketAttachment_messageId_idx" ON "TicketAttachment"("messageId");

CREATE INDEX IF NOT EXISTS "Announcement_tenantId_idx" ON "Announcement"("tenantId");
CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status");
CREATE INDEX IF NOT EXISTS "Announcement_type_idx" ON "Announcement"("type");
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

CREATE INDEX IF NOT EXISTS "AppNotification_tenantId_recipientId_isRead_idx" ON "AppNotification"("tenantId", "recipientId", "isRead");
CREATE INDEX IF NOT EXISTS "AppNotification_tenantId_recipientId_isArchived_idx" ON "AppNotification"("tenantId", "recipientId", "isArchived");
CREATE INDEX IF NOT EXISTS "AppNotification_tenantId_type_createdAt_idx" ON "AppNotification"("tenantId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "AppNotification_recipientId_createdAt_idx" ON "AppNotification"("recipientId", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationPreference_tenantId_userId_idx" ON "NotificationPreference"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "PushSubscription_tenantId_userId_isActive_idx" ON "PushSubscription"("tenantId", "userId", "isActive");

CREATE INDEX IF NOT EXISTS "ActivityLog_tenantId_entityType_entityId_idx" ON "ActivityLog"("tenantId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ActivityLog_tenantId_actorId_createdAt_idx" ON "ActivityLog"("tenantId", "actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_tenantId_action_createdAt_idx" ON "ActivityLog"("tenantId", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_tenantId_createdAt_idx" ON "ActivityLog"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "CustomerAsset_tenantId_customerId_idx" ON "CustomerAsset"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerAsset_tenantId_assetType_idx" ON "CustomerAsset"("tenantId", "assetType");
CREATE INDEX IF NOT EXISTS "CustomerAsset_tenantId_status_idx" ON "CustomerAsset"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "AssetServiceHistory_tenantId_assetId_serviceDate_idx" ON "AssetServiceHistory"("tenantId", "assetId", "serviceDate");
CREATE INDEX IF NOT EXISTS "AssetServiceHistory_tenantId_jobId_idx" ON "AssetServiceHistory"("tenantId", "jobId");

CREATE INDEX IF NOT EXISTS "JobPhoto_tenantId_jobId_photoType_idx" ON "JobPhoto"("tenantId", "jobId", "photoType");
CREATE INDEX IF NOT EXISTS "JobPhoto_tenantId_customerId_capturedAt_idx" ON "JobPhoto"("tenantId", "customerId", "capturedAt");
CREATE INDEX IF NOT EXISTS "JobPhoto_tenantId_syncStatus_idx" ON "JobPhoto"("tenantId", "syncStatus");

CREATE INDEX IF NOT EXISTS "JobSignature_tenantId_jobId_signatoryType_idx" ON "JobSignature"("tenantId", "jobId", "signatoryType");
CREATE INDEX IF NOT EXISTS "JobSignature_tenantId_customerId_idx" ON "JobSignature"("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "JobChecklist_tenantId_jobId_idx" ON "JobChecklist"("tenantId", "jobId");
CREATE INDEX IF NOT EXISTS "JobChecklist_tenantId_customerId_idx" ON "JobChecklist"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "JobChecklist_tenantId_status_idx" ON "JobChecklist"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "EmployeeShift_tenantId_employeeId_shiftDate_idx" ON "EmployeeShift"("tenantId", "employeeId", "shiftDate");
CREATE INDEX IF NOT EXISTS "EmployeeShift_tenantId_status_idx" ON "EmployeeShift"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "EmployeeShift_tenantId_approvalStatus_idx" ON "EmployeeShift"("tenantId", "approvalStatus");
CREATE INDEX IF NOT EXISTS "EmployeeShift_tenantId_category_idx" ON "EmployeeShift"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "EmployeeShift_jobId_idx" ON "EmployeeShift"("jobId");

CREATE INDEX IF NOT EXISTS "JobTimeEntry_tenantId_jobId_employeeId_idx" ON "JobTimeEntry"("tenantId", "jobId", "employeeId");
CREATE INDEX IF NOT EXISTS "JobTimeEntry_tenantId_employeeId_status_idx" ON "JobTimeEntry"("tenantId", "employeeId", "status");
CREATE INDEX IF NOT EXISTS "JobTimeEntry_tenantId_entryType_idx" ON "JobTimeEntry"("tenantId", "entryType");

CREATE INDEX IF NOT EXISTS "JobVisit_tenantId_jobId_scheduledDate_idx" ON "JobVisit"("tenantId", "jobId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "JobVisit_tenantId_jobId_status_idx" ON "JobVisit"("tenantId", "jobId", "status");
CREATE INDEX IF NOT EXISTS "JobVisit_tenantId_scheduledDate_idx" ON "JobVisit"("tenantId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "JobVisit_tenantId_status_idx" ON "JobVisit"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "GPSLocation_tenantId_employeeId_capturedAt_idx" ON "GPSLocation"("tenantId", "employeeId", "capturedAt");
CREATE INDEX IF NOT EXISTS "GPSLocation_tenantId_jobId_capturedAt_idx" ON "GPSLocation"("tenantId", "jobId", "capturedAt");
CREATE INDEX IF NOT EXISTS "GPSLocation_tenantId_syncStatus_idx" ON "GPSLocation"("tenantId", "syncStatus");

CREATE INDEX IF NOT EXISTS "RouteHistory_tenantId_employeeId_startedAt_idx" ON "RouteHistory"("tenantId", "employeeId", "startedAt");
CREATE INDEX IF NOT EXISTS "RouteHistory_tenantId_jobId_idx" ON "RouteHistory"("tenantId", "jobId");
CREATE INDEX IF NOT EXISTS "RouteHistory_tenantId_status_idx" ON "RouteHistory"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "CustomerTimelineEntry_tenantId_customerId_eventDate_idx" ON "CustomerTimelineEntry"("tenantId", "customerId", "eventDate");
CREATE INDEX IF NOT EXISTS "CustomerTimelineEntry_tenantId_customerId_entryType_idx" ON "CustomerTimelineEntry"("tenantId", "customerId", "entryType");
CREATE INDEX IF NOT EXISTS "CustomerTimelineEntry_tenantId_sourceType_sourceId_idx" ON "CustomerTimelineEntry"("tenantId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "CustomerTimelineEntry_tenantId_actorId_idx" ON "CustomerTimelineEntry"("tenantId", "actorId");

CREATE INDEX IF NOT EXISTS "EmployeePerformance_tenantId_employeeId_periodType_idx" ON "EmployeePerformance"("tenantId", "employeeId", "periodType");
CREATE INDEX IF NOT EXISTS "EmployeePerformance_tenantId_periodType_periodStart_idx" ON "EmployeePerformance"("tenantId", "periodType", "periodStart");
CREATE INDEX IF NOT EXISTS "EmployeePerformance_tenantId_periodType_rank_idx" ON "EmployeePerformance"("tenantId", "periodType", "rank");

CREATE INDEX IF NOT EXISTS "OfflineMutation_tenantId_userId_status_idx" ON "OfflineMutation"("tenantId", "userId", "status");
CREATE INDEX IF NOT EXISTS "OfflineMutation_tenantId_status_createdAt_idx" ON "OfflineMutation"("tenantId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "PublicChatSession_tenantId_status_idx" ON "PublicChatSession"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PublicChatSession_tenantId_createdAt_idx" ON "PublicChatSession"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicChatSession_status_lastMessageAt_idx" ON "PublicChatSession"("status", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "PublicChatMessage_sessionId_createdAt_idx" ON "PublicChatMessage"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicChatMessage_senderType_readAt_idx" ON "PublicChatMessage"("senderType", "readAt");

CREATE INDEX IF NOT EXISTS "AiAgent_tenantId_idx" ON "AiAgent"("tenantId");
CREATE INDEX IF NOT EXISTS "AiAgent_status_idx" ON "AiAgent"("status");

CREATE INDEX IF NOT EXISTS "PhoneNumber_tenantId_status_idx" ON "PhoneNumber"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PhoneNumber_provider_status_idx" ON "PhoneNumber"("provider", "status");

CREATE INDEX IF NOT EXISTS "AiPhoneNumber_tenantId_idx" ON "AiPhoneNumber"("tenantId");

CREATE INDEX IF NOT EXISTS "AiCall_tenantId_createdAt_idx" ON "AiCall"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiCall_assistantId_idx" ON "AiCall"("assistantId");
CREATE INDEX IF NOT EXISTS "AiCall_status_idx" ON "AiCall"("status");
CREATE INDEX IF NOT EXISTS "AiCall_customerPhone_idx" ON "AiCall"("customerPhone");

CREATE INDEX IF NOT EXISTS "MarketplaceTransaction_tenantId_idx" ON "MarketplaceTransaction"("tenantId");
CREATE INDEX IF NOT EXISTS "MarketplaceTransaction_status_idx" ON "MarketplaceTransaction"("status");
CREATE INDEX IF NOT EXISTS "MarketplaceTransaction_bookingType_idx" ON "MarketplaceTransaction"("bookingType");
CREATE INDEX IF NOT EXISTS "MarketplaceTransaction_createdAt_idx" ON "MarketplaceTransaction"("createdAt");

CREATE INDEX IF NOT EXISTS "Payout_tenantId_idx" ON "Payout"("tenantId");
CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status");
CREATE INDEX IF NOT EXISTS "Payout_paidAt_idx" ON "Payout"("paidAt");

CREATE INDEX IF NOT EXISTS "FeaturedListing_tenantId_idx" ON "FeaturedListing"("tenantId");
CREATE INDEX IF NOT EXISTS "FeaturedListing_type_idx" ON "FeaturedListing"("type");
CREATE INDEX IF NOT EXISTS "FeaturedListing_isActive_idx" ON "FeaturedListing"("isActive");
CREATE INDEX IF NOT EXISTS "FeaturedListing_endDate_idx" ON "FeaturedListing"("endDate");

CREATE INDEX IF NOT EXISTS "AICredit_tenantId_idx" ON "AICredit"("tenantId");

CREATE INDEX IF NOT EXISTS "UsageCharge_tenantId_idx" ON "UsageCharge"("tenantId");
CREATE INDEX IF NOT EXISTS "UsageCharge_channel_idx" ON "UsageCharge"("channel");
CREATE INDEX IF NOT EXISTS "UsageCharge_createdAt_idx" ON "UsageCharge"("createdAt");

CREATE INDEX IF NOT EXISTS "RevenueFeatureToggle_featureKey_idx" ON "RevenueFeatureToggle"("featureKey");
CREATE INDEX IF NOT EXISTS "RevenueFeatureToggle_enabled_idx" ON "RevenueFeatureToggle"("enabled");

CREATE INDEX IF NOT EXISTS "AiProviderKey_provider_isActive_priority_idx" ON "AiProviderKey"("provider", "isActive", "priority");
CREATE INDEX IF NOT EXISTS "AiProviderKey_isActive_priority_idx" ON "AiProviderKey"("isActive", "priority");

CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");
CREATE INDEX IF NOT EXISTS "Branch_isActive_idx" ON "Branch"("isActive");

CREATE INDEX IF NOT EXISTS "HolidayCalendar_tenantId_idx" ON "HolidayCalendar"("tenantId");
CREATE INDEX IF NOT EXISTS "HolidayCalendar_date_idx" ON "HolidayCalendar"("date");
CREATE INDEX IF NOT EXISTS "HolidayCalendar_branchId_idx" ON "HolidayCalendar"("branchId");

CREATE INDEX IF NOT EXISTS "ServiceRegion_tenantId_idx" ON "ServiceRegion"("tenantId");
CREATE INDEX IF NOT EXISTS "ServiceRegion_branchId_idx" ON "ServiceRegion"("branchId");
CREATE INDEX IF NOT EXISTS "ServiceRegion_isActive_idx" ON "ServiceRegion"("isActive");

CREATE INDEX IF NOT EXISTS "TaxRule_tenantId_idx" ON "TaxRule"("tenantId");
CREATE INDEX IF NOT EXISTS "TaxRule_country_idx" ON "TaxRule"("country");
CREATE INDEX IF NOT EXISTS "TaxRule_isActive_idx" ON "TaxRule"("isActive");

CREATE INDEX IF NOT EXISTS "NumberSequence_tenantId_idx" ON "NumberSequence"("tenantId");

CREATE INDEX IF NOT EXISTS "CustomField_tenantId_idx" ON "CustomField"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomField_entityType_idx" ON "CustomField"("entityType");

CREATE INDEX IF NOT EXISTS "ApprovalFlow_tenantId_idx" ON "ApprovalFlow"("tenantId");
CREATE INDEX IF NOT EXISTS "ApprovalFlow_entityType_idx" ON "ApprovalFlow"("entityType");
CREATE INDEX IF NOT EXISTS "ApprovalFlow_status_idx" ON "ApprovalFlow"("status");

CREATE INDEX IF NOT EXISTS "CommissionRule_tenantId_idx" ON "CommissionRule"("tenantId");
CREATE INDEX IF NOT EXISTS "CommissionRule_scope_idx" ON "CommissionRule"("scope");
CREATE INDEX IF NOT EXISTS "CommissionRule_isActive_idx" ON "CommissionRule"("isActive");

CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_tenantId_idx" ON "PaymentGatewayConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_gateway_idx" ON "PaymentGatewayConfig"("gateway");
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_isActive_idx" ON "PaymentGatewayConfig"("isActive");

CREATE INDEX IF NOT EXISTS "PricingRule_tenantId_idx" ON "PricingRule"("tenantId");
CREATE INDEX IF NOT EXISTS "PricingRule_serviceId_idx" ON "PricingRule"("serviceId");
CREATE INDEX IF NOT EXISTS "PricingRule_isActive_idx" ON "PricingRule"("isActive");

CREATE INDEX IF NOT EXISTS "Assessment_tenantId_idx" ON "Assessment"("tenantId");
CREATE INDEX IF NOT EXISTS "Assessment_jobId_idx" ON "Assessment"("jobId");
CREATE INDEX IF NOT EXISTS "Assessment_leadId_idx" ON "Assessment"("leadId");
CREATE INDEX IF NOT EXISTS "Assessment_customerId_idx" ON "Assessment"("customerId");
CREATE INDEX IF NOT EXISTS "Assessment_status_idx" ON "Assessment"("status");

CREATE INDEX IF NOT EXISTS "JobStateTransition_jobId_idx" ON "JobStateTransition"("jobId");
CREATE INDEX IF NOT EXISTS "JobStateTransition_tenantId_idx" ON "JobStateTransition"("tenantId");
CREATE INDEX IF NOT EXISTS "JobStateTransition_createdAt_idx" ON "JobStateTransition"("createdAt");

CREATE INDEX IF NOT EXISTS "QualityInspection_jobId_idx" ON "QualityInspection"("jobId");
CREATE INDEX IF NOT EXISTS "QualityInspection_tenantId_idx" ON "QualityInspection"("tenantId");
CREATE INDEX IF NOT EXISTS "QualityInspection_status_idx" ON "QualityInspection"("status");

CREATE INDEX IF NOT EXISTS "RequestExtraction_tenantId_idx" ON "RequestExtraction"("tenantId");
CREATE INDEX IF NOT EXISTS "RequestExtraction_leadId_idx" ON "RequestExtraction"("leadId");
CREATE INDEX IF NOT EXISTS "RequestExtraction_status_idx" ON "RequestExtraction"("status");

CREATE INDEX IF NOT EXISTS "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");
CREATE INDEX IF NOT EXISTS "InventoryItem_branchId_idx" ON "InventoryItem"("branchId");
CREATE INDEX IF NOT EXISTS "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX IF NOT EXISTS "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

CREATE INDEX IF NOT EXISTS "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");
CREATE INDEX IF NOT EXISTS "Warehouse_branchId_idx" ON "Warehouse"("branchId");

CREATE INDEX IF NOT EXISTS "StockLocation_inventoryItemId_idx" ON "StockLocation"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "StockLocation_warehouseId_idx" ON "StockLocation"("warehouseId");
CREATE INDEX IF NOT EXISTS "StockLocation_employeeId_idx" ON "StockLocation"("employeeId");

CREATE INDEX IF NOT EXISTS "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE INDEX IF NOT EXISTS "Supplier_isActive_idx" ON "Supplier"("isActive");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

CREATE INDEX IF NOT EXISTS "StockTransfer_tenantId_idx" ON "StockTransfer"("tenantId");
CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status");

CREATE INDEX IF NOT EXISTS "StockTransaction_tenantId_idx" ON "StockTransaction"("tenantId");
CREATE INDEX IF NOT EXISTS "StockTransaction_inventoryItemId_idx" ON "StockTransaction"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "StockTransaction_type_idx" ON "StockTransaction"("type");
CREATE INDEX IF NOT EXISTS "StockTransaction_createdAt_idx" ON "StockTransaction"("createdAt");

CREATE INDEX IF NOT EXISTS "LowStockAlert_tenantId_idx" ON "LowStockAlert"("tenantId");
CREATE INDEX IF NOT EXISTS "LowStockAlert_inventoryItemId_idx" ON "LowStockAlert"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "LowStockAlert_status_idx" ON "LowStockAlert"("status");

CREATE INDEX IF NOT EXISTS "ServicePlan_tenantId_idx" ON "ServicePlan"("tenantId");
CREATE INDEX IF NOT EXISTS "ServicePlan_isActive_idx" ON "ServicePlan"("isActive");

CREATE INDEX IF NOT EXISTS "ServicePlanSubscription_tenantId_idx" ON "ServicePlanSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "ServicePlanSubscription_customerId_idx" ON "ServicePlanSubscription"("customerId");
CREATE INDEX IF NOT EXISTS "ServicePlanSubscription_status_idx" ON "ServicePlanSubscription"("status");

CREATE INDEX IF NOT EXISTS "Warranty_tenantId_idx" ON "Warranty"("tenantId");
CREATE INDEX IF NOT EXISTS "Warranty_jobId_idx" ON "Warranty"("jobId");
CREATE INDEX IF NOT EXISTS "Warranty_customerId_idx" ON "Warranty"("customerId");
CREATE INDEX IF NOT EXISTS "Warranty_isActive_idx" ON "Warranty"("isActive");

CREATE INDEX IF NOT EXISTS "WarrantyClaim_tenantId_idx" ON "WarrantyClaim"("tenantId");
CREATE INDEX IF NOT EXISTS "WarrantyClaim_warrantyId_idx" ON "WarrantyClaim"("warrantyId");
CREATE INDEX IF NOT EXISTS "WarrantyClaim_status_idx" ON "WarrantyClaim"("status");

CREATE INDEX IF NOT EXISTS "JobRequest_tenantId_idx" ON "JobRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "JobRequest_status_idx" ON "JobRequest"("status");
CREATE INDEX IF NOT EXISTS "JobRequest_industry_idx" ON "JobRequest"("industry");
CREATE INDEX IF NOT EXISTS "JobRequest_createdAt_idx" ON "JobRequest"("createdAt");

CREATE INDEX IF NOT EXISTS "EmergencyDispatch_status_idx" ON "EmergencyDispatch"("status");
CREATE INDEX IF NOT EXISTS "EmergencyDispatch_industry_idx" ON "EmergencyDispatch"("industry");
CREATE INDEX IF NOT EXISTS "EmergencyDispatch_createdAt_idx" ON "EmergencyDispatch"("createdAt");

CREATE INDEX IF NOT EXISTS "ProviderPortfolio_tenantId_idx" ON "ProviderPortfolio"("tenantId");

CREATE INDEX IF NOT EXISTS "ProviderCertification_tenantId_idx" ON "ProviderCertification"("tenantId");
CREATE INDEX IF NOT EXISTS "ProviderCertification_isVerified_idx" ON "ProviderCertification"("isVerified");

CREATE INDEX IF NOT EXISTS "Membership_tenantId_idx" ON "Membership"("tenantId");
CREATE INDEX IF NOT EXISTS "Membership_customerId_idx" ON "Membership"("customerId");
CREATE INDEX IF NOT EXISTS "Membership_status_idx" ON "Membership"("status");

CREATE INDEX IF NOT EXISTS "Promotion_tenantId_idx" ON "Promotion"("tenantId");
CREATE INDEX IF NOT EXISTS "Promotion_code_idx" ON "Promotion"("code");
CREATE INDEX IF NOT EXISTS "Promotion_isActive_idx" ON "Promotion"("isActive");

CREATE INDEX IF NOT EXISTS "Coupon_tenantId_idx" ON "Coupon"("tenantId");
CREATE INDEX IF NOT EXISTS "Coupon_customerId_idx" ON "Coupon"("customerId");
CREATE INDEX IF NOT EXISTS "Coupon_status_idx" ON "Coupon"("status");

CREATE INDEX IF NOT EXISTS "LoyaltyPoint_tenantId_idx" ON "LoyaltyPoint"("tenantId");
CREATE INDEX IF NOT EXISTS "LoyaltyPoint_customerId_idx" ON "LoyaltyPoint"("customerId");

CREATE INDEX IF NOT EXISTS "Referral_tenantId_idx" ON "Referral"("tenantId");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");


-- ##########################################
-- PHASE 6: CLEANUP HELPER FUNCTIONS
-- ##########################################
-- Drop helper functions (optional — keeping them speeds up future runs)
-- DROP FUNCTION IF EXISTS _fk_exists(text);
-- DROP FUNCTION IF EXISTS _constraint_exists(text, text);
-- DROP FUNCTION IF EXISTS _index_exists(text);
-- DROP FUNCTION IF EXISTS _column_exists(text, text);

-- Migration complete.
