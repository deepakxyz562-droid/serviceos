-- ============================================================================
-- FIESEROS / SERVICEOS — ROLES & ROW LEVEL SECURITY (RLS) POLICIES
-- TARGET: Hostinger / Coolify Self-Hosted Supabase
-- FULL MIGRATION FOR ALL SUPABASE ROLES, GRANTS & POLICIES
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1: ROLES CREATION & ROLE HIERARCHY
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- 1.1 Create core Supabase roles if they do not exist
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  ELSE
    -- Ensure service_role has BYPASSRLS capability
    ALTER ROLE service_role BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin SUPERUSER;
  END IF;

  -- 1.2 Grant role memberships to authenticator (PostgREST proxy user)
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SCHEMA & DEFAULT PRIVILEGES GRANTS
-- ────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- Grants for postgres & service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- Grants for authenticated role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

-- Grants for anon role (public access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO anon;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 3: DYNAMIC RLS ENABLING & BASE POLICIES FOR ALL TABLES
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl RECORD;
BEGIN
  -- Loop through EVERY table in the public schema
  FOR tbl IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  )
  LOOP
    -- 3.1 Enable Row Level Security on the table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.table_name);

    -- 3.2 Drop existing base policies to prevent duplicate policy errors
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_access" ON public.%I;', tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_access" ON public.%I;', tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %s" ON public.%I;', tbl.table_name, tbl.table_name);

    -- 3.3 Create unrestricted service_role access policy
    EXECUTE format(
      'CREATE POLICY "service_role_all_access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl.table_name
    );

    -- 3.4 Create authenticated full access policy (for backend API & logged in users)
    EXECUTE format(
      'CREATE POLICY "authenticated_all_access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl.table_name
    );
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 4: PUBLIC / ANON POLICIES FOR CLIENT-FACING FEATURES
-- ────────────────────────────────────────────────────────────────────────────

-- 4.1 Marketplace Public Provider Listings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
    DROP POLICY IF EXISTS "anon_select_marketplace_tenants" ON "Tenant";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'marketplaceOptIn') THEN
      CREATE POLICY "anon_select_marketplace_tenants" ON "Tenant"
        FOR SELECT TO anon
        USING ("publicProfileEnabled" = true AND "marketplaceOptIn" = true AND "suspendedAt" IS NULL);
    ELSE
      CREATE POLICY "anon_select_marketplace_tenants" ON "Tenant"
        FOR SELECT TO anon
        USING (true);
    END IF;
  END IF;
END $$;

-- 4.2 Published Customer Reviews
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Review') THEN
    DROP POLICY IF EXISTS "anon_select_published_reviews" ON "Review";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Review' AND column_name = 'status') THEN
      CREATE POLICY "anon_select_published_reviews" ON "Review"
        FOR SELECT TO anon
        USING (status = 'published');
    ELSE
      CREATE POLICY "anon_select_published_reviews" ON "Review"
        FOR SELECT TO anon
        USING (true);
    END IF;
  END IF;
END $$;

-- 4.3 Public Live Chat Sessions & Messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicChatSession') THEN
    DROP POLICY IF EXISTS "anon_all_public_chat_session" ON "PublicChatSession";
    CREATE POLICY "anon_all_public_chat_session" ON "PublicChatSession"
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicChatMessage') THEN
    DROP POLICY IF EXISTS "anon_all_public_chat_message" ON "PublicChatMessage";
    CREATE POLICY "anon_all_public_chat_message" ON "PublicChatMessage"
      FOR ALL TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4.4 Directory Locations (SEO Pages)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DirectoryLocation') THEN
    DROP POLICY IF EXISTS "anon_select_directory_locations" ON "DirectoryLocation";
    CREATE POLICY "anon_select_directory_locations" ON "DirectoryLocation"
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- 4.5 Public Lead Forms & Form Submissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Form') THEN
    DROP POLICY IF EXISTS "anon_select_active_forms" ON "Form";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Form' AND column_name = 'status') THEN
      CREATE POLICY "anon_select_active_forms" ON "Form"
        FOR SELECT TO anon
        USING (status = 'active');
    ELSE
      CREATE POLICY "anon_select_active_forms" ON "Form"
        FOR SELECT TO anon
        USING (true);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'FormResponse') THEN
    DROP POLICY IF EXISTS "anon_insert_form_responses" ON "FormResponse";
    CREATE POLICY "anon_insert_form_responses" ON "FormResponse"
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- 4.6 Public Subscription Plans & Marketplace Templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SubscriptionPlan') THEN
    DROP POLICY IF EXISTS "anon_select_subscription_plans" ON "SubscriptionPlan";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SubscriptionPlan' AND column_name = 'isActive') THEN
      CREATE POLICY "anon_select_subscription_plans" ON "SubscriptionPlan"
        FOR SELECT TO anon
        USING ("isActive" = true);
    ELSE
      CREATE POLICY "anon_select_subscription_plans" ON "SubscriptionPlan"
        FOR SELECT TO anon
        USING (true);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Plan') THEN
    DROP POLICY IF EXISTS "anon_select_plans" ON "Plan";
    CREATE POLICY "anon_select_plans" ON "Plan"
      FOR SELECT TO anon
      USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MarketplaceTemplate') THEN
    DROP POLICY IF EXISTS "anon_select_marketplace_templates" ON "MarketplaceTemplate";
    CREATE POLICY "anon_select_marketplace_templates" ON "MarketplaceTemplate"
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 5: REALTIME PUBLICATION SETUP
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Create supabase_realtime publication if it does not exist
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add real-time tables to publication if they exist
DO $$
DECLARE
  t text;
  r_tables text[] := ARRAY[
    'Conversation',
    'InboxMessage',
    'UnifiedMessage',
    'PublicChatSession',
    'PublicChatMessage',
    'Notification',
    'GPSLocation',
    'Job',
    'Booking',
    'Lead',
    'CommunicationProvider',
    'Contact',
    'Form',
    'FormResponse',
    'WorkflowAutomation',
    'TriggerExecution'
  ];
BEGIN
  FOREACH t IN ARRAY r_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      EXCEPTION WHEN OTHERS THEN
        -- Table already in publication or cannot be added
        NULL;
      END;
    END IF;
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 6: NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 7: VERIFICATION REPORT
-- ────────────────────────────────────────────────────────────────────────────
SELECT 
  t.schemaname, 
  t.tablename, 
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS active_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;
