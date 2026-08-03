-- ====================================================================
-- FIESEROS — NOTIFICATION SYSTEM BACKFILL MIGRATION
-- ====================================================================
-- Purpose: Backfill User accounts for existing Employees that have an
-- email but no linked userId. This fixes the production bug where
-- employees created BEFORE the auto-link feature (commit f7aa3a4)
-- had userId = NULL and silently received NO notifications.
--
-- NEW employees created after deploying commit f7aa3a4 get a User
-- account auto-created at creation time. This migration handles the
-- EXISTING employees already in your database.
--
-- PREREQUISITE: Deploy commit f7aa3a4 first, then run this SQL.
-- SAFE TO RUN MULTIPLE TIMES (idempotent).
--
-- What this does:
--   1. For each Employee with email + no userId:
--      a. If a User with that email already exists → link them
--      b. If no User exists → create an inactive User account, then link
--   2. New users are created as isActive=false (the owner must send a
--      formal invitation to let the employee set a password + log in).
--      Inactive users CAN still receive in-app + push notifications.
--
-- Table names are PascalCase (Prisma default, no @@map directives).
-- ====================================================================

-- ── Step 1: Pre-flight check — count employees needing backfill ────────
SELECT
  COUNT(*)                                                  AS employees_needing_user,
  COUNT(DISTINCT LOWER(TRIM("email")))                      AS unique_emails,
  COUNT(*) FILTER (WHERE "userId" IS NOT NULL)              AS employees_already_linked,
  COUNT(*) FILTER (WHERE "email" IS NULL OR TRIM("email") = '') AS employees_no_email
FROM "Employee";

-- ── Step 2: Create User accounts for employees that don't have one ────
-- Only inserts for emails NOT already present in the User table.
-- Resolves tenantId via Employee.workspaceId → Workspace.tenantId.
INSERT INTO "User" (
  "id",
  "email",
  "name",
  "phone",
  "role",
  "authProvider",
  "isActive",
  "isSuperAdmin",
  "mfaEnabled",
  "loginCount",
  "tenantId",
  "workspaceId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  LOWER(TRIM(e."email")),
  e."name",
  e."phone",
  CASE WHEN e."role" = 'owner' THEN 'owner' ELSE 'employee' END,
  'email',
  false,                       -- inactive until the owner sends a formal invitation
  false,
  false,
  0,
  w."tenantId",
  e."workspaceId",
  NOW(),
  NOW()
FROM "Employee" e
LEFT JOIN "Workspace" w ON w."id" = e."workspaceId"
WHERE e."email" IS NOT NULL
  AND TRIM(e."email") <> ''
  AND e."userId" IS NULL
  AND LOWER(TRIM(e."email")) NOT IN (
    SELECT LOWER(TRIM("email"))
    FROM "User"
    WHERE "email" IS NOT NULL
  );

-- ── Step 3: Link Employees to their User accounts ─────────────────────
-- Covers BOTH:
--   - Employees matched to newly-created users (from Step 2)
--   - Employees matched to pre-existing users with the same email
UPDATE "Employee" e
SET "userId" = u."id",
    "updatedAt" = NOW()
FROM "User" u
WHERE LOWER(TRIM(e."email")) = LOWER(TRIM(u."email"))
  AND e."userId" IS NULL
  AND e."email" IS NOT NULL
  AND TRIM(e."email") <> '';

-- ── Step 4: Verify results ────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE "userId" IS NOT NULL)                       AS employees_linked,
  COUNT(*) FILTER (WHERE "userId" IS NULL
                     AND "email" IS NOT NULL
                     AND TRIM("email") <> '')                         AS employees_still_unlinked,
  COUNT(*) FILTER (WHERE "userId" IS NULL
                     AND ("email" IS NULL OR TRIM("email") = ''))     AS employees_no_email_cannot_link
FROM "Employee";

-- ── Step 5 (optional): Reset monthly quota counters ───────────────────
-- If you want to give every tenant a fresh SMS + email quota starting now,
-- uncomment and run. The cron job at /api/cron/sms-quota-reset does this
-- automatically on the 1st of each month.
--
-- UPDATE "Subscription"
-- SET "smsUsageCount" = 0,
--     "emailUsageCount" = 0;

-- ====================================================================
-- DONE.
-- After running this:
--   1. Existing employees with emails will now have a linked User account
--      and will receive in-app + push notifications when jobs are assigned.
--   2. Employees WITHOUT an email still won't get in-app/push (they need
--      an email to create a User account). Add an email to those employees
--      in the dashboard, then re-run this migration.
--   3. To let an employee LOG IN, go to the employee record and click
--      "Invite" — this sends them a password-setup link and activates
--      their User account.
-- ====================================================================
