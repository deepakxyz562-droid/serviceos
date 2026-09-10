-- ============================================================================
-- Performance & High CPU Optimization: High-Impact Composite Indexes
-- Date: 2026-09-10
-- Target: PostgreSQL / Supabase
-- ============================================================================

-- 1. Job Composite Indexes (Reduces sequential scans on Jobs list & Dispatch)
CREATE INDEX IF NOT EXISTS idx_job_workspace_status_deletedat
  ON "Job" ("workspaceId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS idx_job_customer_workspace
  ON "Job" ("customerId", "workspaceId");

CREATE INDEX IF NOT EXISTS idx_job_assignee_status
  ON "Job" ("assigneeId", "status");

-- 2. Invoice Composite Indexes (Speeds up status filtering and customer lookups)
CREATE INDEX IF NOT EXISTS idx_invoice_tenant_status_duedate
  ON "Invoice" ("tenantId", "status", "dueDate");

CREATE INDEX IF NOT EXISTS idx_invoice_tenant_customer
  ON "Invoice" ("tenantId", "customerId");

-- 3. Notification Indexes (Eliminates full table scans on notification polling)
CREATE INDEX IF NOT EXISTS idx_notification_tenant_read_createdat_desc
  ON "Notification" ("tenantId", "read", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notification_user_read_createdat_desc
  ON "Notification" ("userId", "read", "createdAt" DESC);

-- 4. Recurring Job Schedule Indexes (Accelerates cron processing of due schedules)
CREATE INDEX IF NOT EXISTS idx_recurring_schedule_active_nextrunat
  ON "RecurringJobSchedule" ("active", "nextRunAt");

CREATE INDEX IF NOT EXISTS idx_recurring_schedule_tenant_active_nextrunat
  ON "RecurringJobSchedule" ("tenantId", "active", "nextRunAt");

-- 5. Scheduled Message Indexes (Accelerates cron runner queue lookups)
CREATE INDEX IF NOT EXISTS idx_scheduled_message_status_dueat
  ON "ScheduledMessage" ("status", "dueAt");

-- 6. GPS Location Telemetry Indexes (Accelerates live map & route history lookups)
CREATE INDEX IF NOT EXISTS idx_gps_location_capturedat_desc
  ON "GPSLocation" ("capturedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_gps_location_employee_capturedat_desc
  ON "GPSLocation" ("employeeId", "capturedAt" DESC);
