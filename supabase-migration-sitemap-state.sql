-- ====================================================================
-- FIESEROS — SITEMAP INCREMENTAL REGENERATION MIGRATION
-- ====================================================================
-- Purpose: Add the SitemapState table for tracking dirty sitemap files
-- and regeneration state.
--
-- What this does:
--   1. Creates the "SitemapState" table (singleton row — id = 'singleton')
--   2. Inserts the initial singleton row
--
-- The table tracks:
--   dirtyFilesJson  — JSON array of file numbers (1-10) needing regeneration
--   lastRunAt       — when the cron last ran
--   lastFullRegenAt — when all 10 files were last regenerated (7-day safety net)
--   lockAt          — non-null = cron currently running (prevents concurrency)
--
-- PREREQUISITE: Deploy the application code changes first (sitemap lib,
-- routes, cron wiring), then run this SQL.
-- SAFE TO RUN MULTIPLE TIMES (idempotent).
--
-- ALSO REQUIRED: Create a Supabase Storage bucket named 'sitemaps'
-- (the app will auto-create it on first use, but you can create it manually):
--   1. Go to Supabase Dashboard → Storage
--   2. Create bucket: name = 'sitemaps', public = true
--   3. (Optional) Set allowed MIME types: application/xml, text/xml
-- ====================================================================

-- ── Step 1: Create "SitemapState" table ────────────────────────────────
CREATE TABLE IF NOT EXISTS "SitemapState" (
  "id"              TEXT     NOT NULL,
  "dirtyFilesJson"  TEXT     NOT NULL DEFAULT '[]',
  "lastRunAt"       TIMESTAMP(3),
  "lastFullRegenAt" TIMESTAMP(3),
  "lockAt"          TIMESTAMP(3),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SitemapState_pkey" PRIMARY KEY ("id")
);

-- ── Step 2: Insert the singleton row ───────────────────────────────────
INSERT INTO "SitemapState" ("id", "dirtyFilesJson", "updatedAt")
VALUES ('singleton', '[]', NOW())
ON CONFLICT ("id") DO NOTHING;

-- ── Step 3: Verify ─────────────────────────────────────────────────────
SELECT
  'SitemapState table' AS check_name,
  COUNT(*) AS count
FROM information_schema.tables
WHERE table_name = 'SitemapState'
UNION ALL
SELECT
  'Singleton row',
  COUNT(*)
FROM "SitemapState"
WHERE id = 'singleton';

-- Expected: both rows show count=1

-- ── Step 4 (optional): Create the Supabase Storage bucket manually ─────
-- The app auto-creates this on first use, but you can create it manually:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('sitemaps', 'sitemaps', true)
-- ON CONFLICT (id) DO NOTHING;

-- ── Rollback ───────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "SitemapState";
-- (The Storage bucket 'sitemaps' can be deleted from the Supabase Dashboard)
