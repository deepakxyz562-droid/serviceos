-- ==========================================
-- Template Studio - Supabase Migration
-- ==========================================
-- Adds 3 new tables (BrandKit, ImageLibrary, TemplatePack)
-- Extends 2 existing tables (CampaignTemplate, EmailTemplate)
-- with WhatsApp/Email template-builder fields.
--
-- Safe to run multiple times: uses CREATE TABLE IF NOT EXISTS
-- and ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
--
-- Run AFTER supabase-migration.sql (enterprise/superadmin) if you
-- haven't already. No dependencies between the two — order is only
-- recommended so the change log reads top-to-bottom.
-- ==========================================

-- ==========================================
-- NEW TABLES
-- ==========================================

-- BrandKit: Per-tenant branding (1 row per tenant).
-- Drives email footer, color palette, font, logo across templates.
CREATE TABLE IF NOT EXISTS "BrandKit" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"        TEXT NOT NULL UNIQUE,
  "logoUrl"         TEXT,
  "primaryColor"    TEXT NOT NULL DEFAULT '#0f766e',  -- teal-700
  "secondaryColor"  TEXT NOT NULL DEFAULT '#1f2937',  -- gray-800
  "accentColor"     TEXT NOT NULL DEFAULT '#f59e0b',  -- amber-500
  "fontFamily"      TEXT NOT NULL DEFAULT 'Inter, sans-serif',
  "footerHtml"      TEXT,
  "companyName"     TEXT,
  "address"         TEXT,
  "website"         TEXT,
  "email"           TEXT,
  "phone"           TEXT,
  "socialLinksJson" TEXT NOT NULL DEFAULT '[]',        -- [{platform, url}]
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- ImageLibrary: Uploaded images/logos used inside templates.
-- folder: logos | promotions | service | seasonal | uploaded
CREATE TABLE IF NOT EXISTS "ImageLibrary" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"    TEXT,
  "name"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "folder"      TEXT NOT NULL DEFAULT 'uploaded',
  "mediaType"   TEXT NOT NULL DEFAULT 'image/png',
  "size"        INTEGER NOT NULL DEFAULT 0,
  "width"       INTEGER,
  "height"      INTEGER,
  "uploadedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ImageLibrary_tenantId_folder_idx"
  ON "ImageLibrary"("tenantId", "folder");

-- TemplatePack: Pre-built template bundles (business + industry packs).
-- slug is the stable identifier used by the installer.
CREATE TABLE IF NOT EXISTS "TemplatePack" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"           TEXT NOT NULL UNIQUE,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "category"       TEXT NOT NULL DEFAULT 'business',  -- business | industry
  "industry"       TEXT,
  "icon"           TEXT NOT NULL DEFAULT 'Package',
  "color"          TEXT NOT NULL DEFAULT '#0f766e',
  "templatesJson"  TEXT NOT NULL DEFAULT '[]',
  "isInstalled"    BOOLEAN NOT NULL DEFAULT false,
  "installedBy"    TEXT,
  "installCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- ==========================================
-- EXTEND EXISTING TABLES
-- ==========================================

-- CampaignTemplate: WhatsApp-style template fields
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "language"        TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "templateType"    TEXT NOT NULL DEFAULT 'text';   -- text|image|document|video
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerText"      TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerMediaUrl"  TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "headerMediaType" TEXT;                          -- image/jpeg | application/pdf | video/mp4
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "footerText"      TEXT;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "buttonsJson"     TEXT NOT NULL DEFAULT '[]';     -- [{type,text,value?}]
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "status"          TEXT NOT NULL DEFAULT 'published'; -- draft|pending|approved|rejected|disabled|published
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "isFavorite"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "tagsJson"        TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt"      TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CampaignTemplate_templateType_idx" ON "CampaignTemplate"("templateType");
CREATE INDEX IF NOT EXISTS "CampaignTemplate_status_idx"        ON "CampaignTemplate"("status");

-- EmailTemplate: Template Studio fields
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "language"        TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "status"          TEXT NOT NULL DEFAULT 'published'; -- draft|published
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "isFavorite"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "tagsJson"        TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "attachmentsJson" TEXT NOT NULL DEFAULT '[]';        -- [{name,url,size}]
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "brandKitId"      TEXT;                              -- -> BrandKit.id (no FK by default; see note below)
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt"      TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "EmailTemplate_status_idx" ON "EmailTemplate"("status");

-- ==========================================
-- OPTIONAL: Foreign Key from EmailTemplate.brandKitId -> BrandKit.id
-- ==========================================
-- The Prisma schema models brandKitId as a plain string (no @relation),
-- so the FK is NOT created automatically. Add it here if you want DB-level
-- integrity. Commented out by default to match Prisma's behavior.
--
-- ALTER TABLE "EmailTemplate" DROP CONSTRAINT IF EXISTS "EmailTemplate_brandKitId_fkey";
-- ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_brandKitId_fkey"
--   FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id")
--   ON DELETE SET NULL ON UPDATE CASCADE;

-- ==========================================
-- updatedAt TRIGGER (recommended)
-- ==========================================
-- Prisma Client auto-populates @updatedAt on update, but raw SQL
-- updates (e.g. via psql or Supabase SQL editor) won't. This trigger
-- keeps the column in sync for direct SQL operations.
-- Safe to run multiple times: CREATE OR REPLACE FUNCTION + DROP IF EXISTS.

CREATE OR REPLACE FUNCTION "_prisma_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "BrandKit_updated_at" ON "BrandKit";
CREATE TRIGGER "BrandKit_updated_at"
  BEFORE UPDATE ON "BrandKit"
  FOR EACH ROW EXECUTE FUNCTION "_prisma_set_updated_at"();

DROP TRIGGER IF EXISTS "TemplatePack_updated_at" ON "TemplatePack";
CREATE TRIGGER "TemplatePack_updated_at"
  BEFORE UPDATE ON "TemplatePack"
  FOR EACH ROW EXECUTE FUNCTION "_prisma_set_updated_at"();

-- ==========================================
-- RLS (Row-Level Security) - OPTIONAL
-- ==========================================
-- Supabase enables RLS by default on all new tables. If you rely on
-- Prisma (server-side, service-role key) for all access, you can either:
--   (a) keep RLS disabled for these tables, OR
--   (b) enable RLS and add a permissive policy for the service role.
-- Below is a safe starting point that allows the service role full access
-- and blocks anon/authenticated (so all access goes through Prisma).
--
-- ALTER TABLE "BrandKit"       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ImageLibrary"   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "TemplatePack"   ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "service_role_all_BrandKit"     ON "BrandKit"     FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
-- CREATE POLICY "service_role_all_ImageLibrary" ON "ImageLibrary" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
-- CREATE POLICY "service_role_all_TemplatePack" ON "TemplatePack" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
