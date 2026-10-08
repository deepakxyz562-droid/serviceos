-- ═══════════════════════════════════════════════════════════════════════════
-- Database Restoration & QuoteFlow Reconcile Migration (Hardened)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Restores the 4 active tables in "public" with exact foreign keys and indexes:
--    - NotificationLog (with Job, Employee, Customer, Tenant foreign keys)
--    - WebhookTestRequest
--    - OfflineMutation
--    - SitemapState
--
-- 2. Principle of Least Privilege:
--    - Schema USAGE granted to postgres, service_role, authenticated, anon.
--    - Backend access restored after all objects are created.
--    - Existing RLS-protected DML preserved; unsafe blanket privileges revoked.
--
-- 3. Reconciles QuoteFlow:
--    - Moves QuoteFlow tables from "bos" (or "public") into "quoteflow".
--    - Reconstructs public backward-compatibility views.
-- ═══════════════════════════════════════════════════════════════════════════

-- Schema repair only: historical rows require a pre-deletion backup.
BEGIN;
SET LOCAL lock_timeout = '10s';

-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS bos;
CREATE SCHEMA IF NOT EXISTS chatbotly;
CREATE SCHEMA IF NOT EXISTS quoteflow;
CREATE SCHEMA IF NOT EXISTS marketplace;

-- Search Path
DO $$
BEGIN
    ALTER DATABASE postgres SET search_path TO "$user", public, bos, chatbotly, quoteflow, marketplace;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Database search_path not changed; configure the application connection search_path explicitly.';
END $$;

SET search_path TO "$user", public, bos, chatbotly, quoteflow, marketplace;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 1: Re-create Core Active Tables in "public" with full constraints
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. NotificationLog (with full FKs and createdAt index)
CREATE TABLE IF NOT EXISTS public."NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "NotificationLog_type_idx" ON public."NotificationLog"("type");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON public."NotificationLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_jobId_idx" ON public."NotificationLog"("jobId");
CREATE INDEX IF NOT EXISTS "NotificationLog_employeeId_idx" ON public."NotificationLog"("employeeId");
CREATE INDEX IF NOT EXISTS "NotificationLog_customerId_idx" ON public."NotificationLog"("customerId");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON public."NotificationLog"("createdAt");

-- Repair constraints even when an earlier script already recreated the table.
-- Resolve the base table, never the public compatibility view.
DO $$
DECLARE
    target TEXT;
    target_schema TEXT;
    column_name TEXT;
    constraint_name TEXT;
    matches INTEGER;
BEGIN
    FOREACH target IN ARRAY ARRAY['Job', 'Employee', 'Customer', 'Tenant'] LOOP
        SELECT count(*), min(n.nspname) INTO matches, target_schema
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = target AND c.relkind IN ('r', 'p')
          AND n.nspname IN ('public', 'bos');
        IF matches <> 1 THEN
            RAISE EXCEPTION 'Expected one base table for %, found %; inspect schema before repairing', target, matches;
        END IF;
        column_name := lower(left(target, 1)) || substring(target from 2) || 'Id';
        constraint_name := 'NotificationLog_' || column_name || '_fkey';
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public."NotificationLog"'::regclass
              AND conname = constraint_name
        ) THEN
            EXECUTE format('ALTER TABLE public."NotificationLog" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(id) ON DELETE SET NULL',
                constraint_name, column_name, target_schema, target);
        END IF;
        -- Validation fails atomically if existing data contains orphaned references.
        EXECUTE format('ALTER TABLE public."NotificationLog" VALIDATE CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

-- 2. WebhookTestRequest
CREATE TABLE IF NOT EXISTS public."WebhookTestRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "headersJson" TEXT NOT NULL DEFAULT '{}',
    "queryParamsJson" TEXT NOT NULL DEFAULT '{}',
    "bodyJson" TEXT,
    "contentType" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WebhookTestRequest_path_idx" ON public."WebhookTestRequest"("path");

-- 3. OfflineMutation
CREATE TABLE IF NOT EXISTS public."OfflineMutation" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OfflineMutation_tenantId_userId_status_idx" ON public."OfflineMutation"("tenantId", "userId", "status");
CREATE INDEX IF NOT EXISTS "OfflineMutation_tenantId_status_createdAt_idx" ON public."OfflineMutation"("tenantId", "status", "createdAt");

-- 4. SitemapState
CREATE TABLE IF NOT EXISTS public."SitemapState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dirtyFilesJson" TEXT NOT NULL DEFAULT '[]',
    "lastRunAt" TIMESTAMP(3),
    "lastFullRegenAt" TIMESTAMP(3),
    "lockAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 2: Reconcile QuoteFlow Tables (Move from bos OR public -> quoteflow)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    qf_tables TEXT[] := ARRAY[
        'AiBusiness',
        'AiCustomer',
        'AiQuote',
        'AiQuoteItem',
        'AiInvoice',
        'AiInvoiceItem',
        'AiPayment',
        'AiItem',
        'AiTemplate'
    ];
    tbl TEXT;
    table_count INTEGER;
BEGIN
    FOREACH tbl IN ARRAY qf_tables
    LOOP
        SELECT count(*) INTO table_count FROM information_schema.tables
        WHERE table_schema IN ('public', 'bos', 'quoteflow')
          AND table_name = tbl AND table_type = 'BASE TABLE';
        IF table_count <> 1 THEN
            RAISE EXCEPTION 'Expected exactly one base table for %, found %', tbl, table_count;
        END IF;
        -- Check if it currently lives in bos
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'bos' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE bos.%I SET SCHEMA quoteflow', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM quoteflow.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % from bos to quoteflow schema', tbl;
        -- Or check if it currently lives in public as a BASE TABLE
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA quoteflow', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM quoteflow.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % from public to quoteflow schema', tbl;
        END IF;
        EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM quoteflow.%I', tbl, tbl);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 3: Verification Check
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    table_schema, 
    table_type,
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'bos', 'chatbotly', 'quoteflow', 'marketplace')
GROUP BY table_schema, table_type
ORDER BY table_schema, table_type;

-- Remove accidental blanket grants. Preserve policy-controlled DML on tables
-- with RLS; unprotected tables and owner-rights views remain backend-only.
DO $$
DECLARE obj RECORD; client_role TEXT;
BEGIN
    GRANT USAGE ON SCHEMA public, bos, chatbotly, quoteflow, marketplace TO service_role;
    FOR obj IN
        SELECT n.nspname, c.relname, c.relrowsecurity
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p','v') AND (
            n.nspname IN ('bos','chatbotly','quoteflow','marketplace') OR
            (n.nspname = 'public' AND c.relname IN (
                'NotificationLog','WebhookTestRequest','OfflineMutation','SitemapState',
                'AiBusiness','AiCustomer','AiQuote','AiQuoteItem','AiInvoice',
                'AiInvoiceItem','AiPayment','AiItem','AiTemplate')) OR
            (n.nspname = 'public' AND c.relkind = 'v' AND EXISTS (
                SELECT 1 FROM pg_rewrite rw
                JOIN pg_depend dep ON dep.objid = rw.oid AND dep.classid = 'pg_rewrite'::regclass
                JOIN pg_class base ON base.oid = dep.refobjid
                JOIN pg_namespace ns ON ns.oid = base.relnamespace
                WHERE rw.ev_class = c.oid AND dep.refclassid = 'pg_class'::regclass
                  AND ns.nspname IN ('bos','chatbotly','quoteflow','marketplace')
            ))
        )
    LOOP
        EXECUTE format('GRANT ALL ON TABLE %I.%I TO postgres, service_role', obj.nspname, obj.relname);
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', obj.nspname, obj.relname);
        FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                IF obj.relrowsecurity THEN
                    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM %I', obj.nspname, obj.relname, client_role);
                ELSE
                    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', obj.nspname, obj.relname, client_role);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
