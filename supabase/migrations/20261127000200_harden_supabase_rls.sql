-- Harden Supabase RLS policies and relation privileges across core + BGOS tables & views.
-- Ensures PUBLIC, anon, and authenticated PostgREST roles cannot bypass server-side authorization,
-- while skipping table-only RLS statements when a relation is a SQL view ('v' / 'm').

DO $$
DECLARE
  t text;
  rel_kind "char";
  policy_tables text[] := ARRAY[
    'CommunicationProvider',
    'Contact',
    'Form',
    'FormResponse',
    'WorkflowAutomation',
    'TriggerExecution'
  ];
  server_only_tables text[] := ARRAY[
    'Competitor',
    'RankGridScan',
    'BgosRateLimitBucket',
    'DesignGenerationJob',
    'AuthRefreshSession'
  ];
BEGIN
  FOREACH t IN ARRAY policy_tables LOOP
    SELECT c.relkind INTO rel_kind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t
    LIMIT 1;

    IF rel_kind IN ('r', 'p', 'v', 'm', 'f') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

      IF rel_kind IN ('r', 'p') THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %s" ON public.%I', t, t);
        EXECUTE format(
          'CREATE POLICY "Service role full access on %s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
          t, t
        );
      END IF;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY server_only_tables LOOP
    SELECT c.relkind INTO rel_kind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t
    LIMIT 1;

    IF rel_kind IN ('r', 'p', 'v', 'm', 'f') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

      IF rel_kind IN ('r', 'p') THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      END IF;
    END IF;
  END LOOP;
END $$;
