-- ============================================================
-- Fieseros Rebrand — Supabase / PostgreSQL Migration
-- ============================================================
-- Purpose: Update all existing database records that contain
--          the old brand "ServiceOS" / "serviceos.cc" to the
--          new brand "Fieseros" / "fieseros.com".
--
-- WHEN TO RUN:
--   Run this ONCE on your production Supabase database AFTER
--   deploying the rebranded code. This updates existing rows;
--   new rows inserted by the rebranded code will already use
--   the new brand strings.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste this
--   entire file → Run.
--
--   Or via psql:
--     psql "postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
--       -f supabase-migration-rebrand.sql
--
-- SAFETY:
--   - All statements use WHERE clauses to only update matching rows.
--   - A backup is assumed (Supabase auto-backs up, but you can also
--     export a .csv from the Table Editor first).
--   - This migration is IDEMPOTENT — running it twice is safe
--     (second run updates 0 rows).
-- ============================================================

BEGIN;

-- ─── 1. Users table: update seed/admin email addresses ───────────────────────
-- The superadmin seed email was admin@serviceos.cc → now admin@fieseros.com
UPDATE "User"
SET "email" = REPLACE("email", '@serviceos.cc', '@fieseros.com')
WHERE "email" LIKE '%@serviceos.cc';

-- ─── 2. Email provider configs: fromEmail / replyTo ──────────────────────────
-- These are the platform-level email sender addresses.
UPDATE "EmailProvider"
SET "fromEmail" = REPLACE("fromEmail", '@serviceos.cc', '@fieseros.com')
WHERE "fromEmail" LIKE '%@serviceos.cc';

UPDATE "EmailProvider"
SET "replyTo" = REPLACE("replyTo", '@serviceos.cc', '@fieseros.com')
WHERE "replyTo" LIKE '%@serviceos.cc';

-- ─── 3. Tenants: company names and contact emails ────────────────────────────
-- Any tenant whose name or email still references the old brand.
UPDATE "Tenant"
SET "name" = REPLACE("name", 'ServiceOS', 'Fieseros')
WHERE "name" LIKE '%ServiceOS%';

UPDATE "Tenant"
SET "email" = REPLACE("email", '@serviceos.cc', '@fieseros.com')
WHERE "email" LIKE '%@serviceos.cc';

-- ─── 4. Email campaign sender names/emails ───────────────────────────────────
UPDATE "EmailCampaign"
SET "senderName" = REPLACE("senderName", 'ServiceOS', 'Fieseros')
WHERE "senderName" LIKE '%ServiceOS%';

-- If there's a senderEmail column on campaigns (check your schema):
UPDATE "EmailCampaign"
SET "senderEmail" = REPLACE("senderEmail", '@serviceos.cc', '@fieseros.com')
WHERE "senderEmail" LIKE '%@serviceos.cc';

-- ─── 5. Email templates: body content with brand name/domain ─────────────────
-- Email templates store HTML/text with the brand name embedded.
UPDATE "EmailTemplate"
SET "body" = REPLACE("body", 'ServiceOS', 'Fieseros')
WHERE "body" LIKE '%ServiceOS%';

UPDATE "EmailTemplate"
SET "body" = REPLACE("body", 'serviceos.cc', 'fieseros.com')
WHERE "body" LIKE '%serviceos.cc%';

UPDATE "EmailTemplate"
SET "subject" = REPLACE("subject", 'ServiceOS', 'Fieseros')
WHERE "subject" LIKE '%ServiceOS%';

-- ─── 6. Workflow automations: names/descriptions with brand ──────────────────
UPDATE "WorkflowAutomation"
SET "name" = REPLACE("name", 'ServiceOS', 'Fieseros')
WHERE "name" LIKE '%ServiceOS%';

UPDATE "WorkflowAutomation"
SET "description" = REPLACE("description", 'ServiceOS', 'Fieseros')
WHERE "description" LIKE '%ServiceOS%';

-- ─── 7. Knowledge base articles: body content ────────────────────────────────
-- KB default articles reference the brand name and support emails.
UPDATE "KbArticle"
SET "body" = REPLACE("body", 'ServiceOS', 'Fieseros')
WHERE "body" LIKE '%ServiceOS%';

UPDATE "KbArticle"
SET "body" = REPLACE("body", 'serviceos.cc', 'fieseros.com')
WHERE "body" LIKE '%serviceos.cc%';

UPDATE "KbArticle"
SET "title" = REPLACE("title", 'ServiceOS', 'Fieseros')
WHERE "title" LIKE '%ServiceOS%';

-- ─── 8. Form templates: descriptions/labels with brand ───────────────────────
UPDATE "Form"
SET "title" = REPLACE("title", 'ServiceOS', 'Fieseros')
WHERE "title" LIKE '%ServiceOS%';

UPDATE "Form"
SET "description" = REPLACE("description", 'ServiceOS', 'Fieseros')
WHERE "description" LIKE '%ServiceOS%';

-- ─── 9. Webhook registrations: URLs pointing to old domain ───────────────────
-- External webhooks (n8n, Zapier) that reference the old domain.
UPDATE "WebhookRegistration"
SET "url" = REPLACE("url", 'serviceos.cc', 'fieseros.com')
WHERE "url" LIKE '%serviceos.cc%';

-- ─── 10. API keys: names/labels with brand ───────────────────────────────────
UPDATE "ApiKey"
SET "name" = REPLACE("name", 'ServiceOS', 'Fieseros')
WHERE "name" LIKE '%ServiceOS%';

-- ─── 11. Notifications: body text with brand ─────────────────────────────────
UPDATE "Notification"
SET "body" = REPLACE("body", 'ServiceOS', 'Fieseros')
WHERE "body" LIKE '%ServiceOS%';

UPDATE "Notification"
SET "body" = REPLACE("body", 'serviceos.cc', 'fieseros.com')
WHERE "body" LIKE '%serviceos.cc%';

-- ─── 12. Audit logs: action descriptions (optional, historical) ──────────────
-- NOTE: Audit logs are historical records. Updating them is OPTIONAL.
-- Comment out the next two statements if you want to preserve the
-- original brand name in historical audit trails.
UPDATE "AuditLog"
SET "action" = REPLACE("action", 'ServiceOS', 'Fieseros')
WHERE "action" LIKE '%ServiceOS%';

-- ─── 13. Platform settings (if stored as JSON/key-value) ─────────────────────
-- Many SaaS apps store platform name, support email, etc. in a settings table.
-- If your schema has a PlatformSetting or similar model, update it here.
-- Example (uncomment if applicable):
-- UPDATE "PlatformSetting"
-- SET "value" = REPLACE("value", 'ServiceOS', 'Fieseros')
-- WHERE "key" IN ('platformName', 'brandName', 'siteName')
--   AND "value" LIKE '%ServiceOS%';
--
-- UPDATE "PlatformSetting"
-- SET "value" = REPLACE("value", 'serviceos.cc', 'fieseros.com')
-- WHERE "key" IN ('siteUrl', 'supportEmail', 'adminEmail', 'fromEmail')
--   AND "value" LIKE '%serviceos.cc%';

-- ─── 14. Email events: brand in subject lines ────────────────────────────────
UPDATE "EmailEvent"
SET "subject" = REPLACE("subject", 'ServiceOS', 'Fieseros')
WHERE "subject" LIKE '%ServiceOS%';

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================
-- These should all return 0 rows:

-- SELECT COUNT(*) AS remaining_serviceos_emails FROM "User" WHERE "email" LIKE '%@serviceos.cc';
-- SELECT COUNT(*) AS remaining_serviceos_in_tenants FROM "Tenant" WHERE "name" LIKE '%ServiceOS%' OR "email" LIKE '%@serviceos.cc';
-- SELECT COUNT(*) AS remaining_serviceos_in_templates FROM "EmailTemplate" WHERE "body" LIKE '%ServiceOS%' OR "body" LIKE '%serviceos.cc%';
-- SELECT COUNT(*) AS remaining_serviceos_in_kb FROM "KbArticle" WHERE "body" LIKE '%ServiceOS%' OR "body" LIKE '%serviceos.cc%';
-- SELECT COUNT(*) AS remaining_serviceos_webhooks FROM "WebhookRegistration" WHERE "url" LIKE '%serviceos.cc%';

-- ============================================================
-- POST-MIGRATION NOTES
-- ============================================================
-- 1. After running this, clear any application-level cache:
--    - Vercel: redeploy (clears Next.js cache)
--    - Supabase: no cache to clear (PostgREST serves fresh data)
--
-- 2. Email deliverability: update your email provider (AWS SES, SendGrid,
--    etc.) sender identities:
--    - Old: notifications@serviceos.cc
--    - New: notifications@fieseros.com
--    Verify the new domain (SPF, DKIM, DMARC) on your email provider.
--
-- 3. Webhooks: if you have external integrations (n8n, Zapier, Make)
--    that call your API, update their endpoint URLs from
--    https://fieseros.com/api/... (already done by this migration for
--    stored URLs, but external systems need manual updates).
--
-- 4. PayPal/Creem/Stripe: update webhook URLs in each payment provider's
--    dashboard to point to https://fieseros.com/api/webhooks/...
-- ============================================================
