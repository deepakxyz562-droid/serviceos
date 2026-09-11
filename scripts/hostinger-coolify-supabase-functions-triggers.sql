-- ============================================================================
-- FIESEROS / SERVICEOS — COMPLETE DATABASE FUNCTIONS & TRIGGERS
-- TARGET: Hostinger / Coolify Self-Hosted Supabase
-- FULL MATCH FOR ALL SUPABASE CLOUD FUNCTIONS & TRIGGERS
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. DYNAMIC CLEANUP (Drops any existing signatures to prevent 42P13 errors)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        '_fk_exists',
        '_constraint_exists',
        '_index_exists',
        '_column_exists',
        '_table_exists',
        'recompute_tenant_rating',
        'recompute_tenant_rating_trigger',
        'generate_job_visits',
        'reserve_ai_usage_seconds',
        'finalize_ai_usage',
        'get_marketplace_cities',
        'get_marketplace_counts',
        'get_customer_timeline',
        'get_job_detail',
        'get_invoices',
        'get_leads',
        'get_customer_assets',
        'get_recurring_jobs',
        'get_recurring_job_details',
        '_prisma_set_updated_at',
        '_ai_set_updatedAt',
        'update_updated_at_column',
        'updateUpdatedAt',
        'set_updated_at',
        'set_updatedAt'
      )
  )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE;';
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ────────────────────────────────────────────────────────────────────────────
-- 2. SCHEMA & CONSTRAINT INTROSPECTION HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _fk_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1 AND contype = 'f')
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION _constraint_exists(text, text DEFAULT NULL) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = $1
    AND ($2 IS NULL OR contype = $2)
  )
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION _index_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = $1 AND relkind = 'i')
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION _column_exists(text, text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  )
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION _table_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
  )
$$ LANGUAGE sql;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. TIMESTAMP UPDATER TRIGGER FUNCTIONS (ALL VARIANTS)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "_prisma_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "_ai_set_updatedAt"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION updateUpdatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updatedAt()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. REVIEWS & TENANT RATING RECOMPUTATION TRIGGER
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_tenant_rating(t_id text)
RETURNS void AS $$
DECLARE
  v_avg_rating numeric;
  v_count integer;
BEGIN
  IF t_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg_rating, v_count
  FROM "Review"
  WHERE "tenantId" = t_id AND status = 'published';

  UPDATE "Tenant"
  SET "rating" = ROUND(v_avg_rating::numeric, 2),
      "reviewCount" = v_count
  WHERE "id" = t_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recompute_tenant_rating_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_tenant_rating(OLD."tenantId");
    RETURN OLD;
  ELSE
    PERFORM recompute_tenant_rating(NEW."tenantId");
    IF TG_OP = 'UPDATE' AND OLD."tenantId" IS DISTINCT FROM NEW."tenantId" THEN
      PERFORM recompute_tenant_rating(OLD."tenantId");
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. ATTACH TRIGGERS TO ALL TABLES
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 5.1 Dynamic attachment: Add `_prisma_set_updated_at` trigger to EVERY table with `updatedAt`
  FOR r IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updatedAt'
  )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I;', '_prisma_set_updated_at', r.table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION "_prisma_set_updated_at"();', '_prisma_set_updated_at', r.table_name);
  END LOOP;

  -- 5.2 Specific AI tables using `_ai_set_updatedAt`
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AiAgent') THEN
    DROP TRIGGER IF EXISTS "_ai_set_updatedAt" ON "AiAgent";
    CREATE TRIGGER "_ai_set_updatedAt" BEFORE UPDATE ON "AiAgent" FOR EACH ROW EXECUTE FUNCTION "_ai_set_updatedAt"();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AiCall') THEN
    DROP TRIGGER IF EXISTS "_ai_set_updatedAt" ON "AiCall";
    CREATE TRIGGER "_ai_set_updatedAt" BEFORE UPDATE ON "AiCall" FOR EACH ROW EXECUTE FUNCTION "_ai_set_updatedAt"();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AiPhoneNumber') THEN
    DROP TRIGGER IF EXISTS "_ai_set_updatedAt" ON "AiPhoneNumber";
    CREATE TRIGGER "_ai_set_updatedAt" BEFORE UPDATE ON "AiPhoneNumber" FOR EACH ROW EXECUTE FUNCTION "_ai_set_updatedAt"();
  END IF;

  -- 5.3 Specific named triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DirectoryLocation') THEN
    DROP TRIGGER IF EXISTS "set_updatedAt" ON "DirectoryLocation";
    CREATE TRIGGER "set_updatedAt" BEFORE UPDATE ON "DirectoryLocation" FOR EACH ROW EXECUTE FUNCTION set_updatedAt();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicChatSession') THEN
    DROP TRIGGER IF EXISTS "set_updated_at" ON "PublicChatSession";
    CREATE TRIGGER "set_updated_at" BEFORE UPDATE ON "PublicChatSession" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- 5.4 Review recomputation trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Review') THEN
    DROP TRIGGER IF EXISTS "recompute_tenant_rating_trigger" ON "Review";
    CREATE TRIGGER "recompute_tenant_rating_trigger"
      AFTER INSERT OR UPDATE OR DELETE ON "Review"
      FOR EACH ROW EXECUTE FUNCTION recompute_tenant_rating_trigger();
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC: generate_job_visits
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_job_visits(
  p_job_id text,
  p_tenant_id text,
  p_visits_json jsonb
) RETURNS jsonb AS $$
DECLARE
  v_visit jsonb;
  v_count int := 0;
  v_id text;
BEGIN
  FOR v_visit IN SELECT * FROM jsonb_array_elements(p_visits_json)
  LOOP
    v_id := gen_random_uuid()::text;
    INSERT INTO "JobVisit" (
      "id",
      "jobId",
      "tenantId",
      "jobVisitNumber",
      "title",
      "visitType",
      "instructions",
      "scheduledDate",
      "endDate",
      "scheduledTime",
      "endTime",
      "anytime",
      "scheduleLater",
      "repeats",
      "repeatInterval",
      "repeatWeekdays",
      "repeatUntil",
      "assigneeIdsJson",
      "assigneeNamesJson",
      "emailTeam",
      "teamReminder",
      "checklistIdsJson",
      "status",
      "createdAt",
      "updatedAt"
    ) VALUES (
      COALESCE((v_visit->>'id'), v_id),
      p_job_id,
      p_tenant_id,
      COALESCE((v_visit->>'jobVisitNumber')::int, v_count + 1),
      COALESCE(v_visit->>'title', ''),
      COALESCE(v_visit->>'visitType', 'visit'),
      v_visit->>'instructions',
      COALESCE((v_visit->>'scheduledDate')::timestamptz, now()),
      (v_visit->>'endDate')::timestamptz,
      v_visit->>'scheduledTime',
      v_visit->>'endTime',
      COALESCE((v_visit->>'anytime')::boolean, true),
      COALESCE((v_visit->>'scheduleLater')::boolean, false),
      COALESCE(v_visit->>'repeats', 'none'),
      COALESCE((v_visit->>'repeatInterval')::int, 1),
      COALESCE(v_visit->>'repeatWeekdays', '[]'),
      (v_visit->>'repeatUntil')::timestamptz,
      COALESCE(v_visit->>'assigneeIdsJson', '[]'),
      COALESCE(v_visit->>'assigneeNamesJson', '[]'),
      COALESCE((v_visit->>'emailTeam')::boolean, false),
      COALESCE(v_visit->>'teamReminder', 'none'),
      COALESCE(v_visit->>'checklistIdsJson', '[]'),
      COALESCE(v_visit->>'status', 'scheduled'),
      now(),
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION generate_job_visits(text, text, jsonb) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. RPC: AI USAGE (reserve_ai_usage_seconds & finalize_ai_usage)
-- ────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "UsageReservation_entitlementId_externalCallId_active_idx"
  ON "UsageReservation" ("entitlementId", "externalCallId")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "UsageReservation_entitlementId_externalCallId_lifecycle_idx"
  ON "UsageReservation" ("entitlementId", "externalCallId");

CREATE OR REPLACE FUNCTION reserve_ai_usage_seconds(
  p_tenant_id        TEXT,
  p_entitlement_id  TEXT,
  p_external_call_id TEXT,
  p_requested_seconds INTEGER,
  p_max_concurrent_calls INTEGER
) RETURNS JSON AS $$
DECLARE
  v_entitlement RECORD;
  v_existing_reservation RECORD;
  v_active_count INTEGER;
  v_reserved_seconds BIGINT;
  v_used_seconds BIGINT;
  v_remaining BIGINT;
  v_reservation_id TEXT;
BEGIN
  SELECT "id", "tenantId", "status", "includedSeconds", "periodStart", "periodEnd",
         "maxConcurrentCalls", "maxCallDurationSeconds"
    INTO v_entitlement
    FROM "AddonEntitlement"
    WHERE "id" = p_entitlement_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  IF v_entitlement."tenantId" != p_tenant_id THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  IF v_entitlement."status" != 'ACTIVE' THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_ACTIVE');
  END IF;

  SELECT "id", "reservedSeconds", "status" INTO v_existing_reservation
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "externalCallId" = p_external_call_id
    LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'reservationId', v_existing_reservation."id",
      'idempotent', true,
      'reservedSeconds', v_existing_reservation."reservedSeconds",
      'reservationStatus', v_existing_reservation."status",
      'activeCallCount', NULL
    );
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_active_count
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "status" = 'ACTIVE';

  IF p_max_concurrent_calls IS NOT NULL AND v_active_count >= p_max_concurrent_calls THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'CONCURRENCY_EXCEEDED',
      'activeCallCount', v_active_count
    );
  END IF;

  SELECT COALESCE(SUM("quantitySeconds"), 0)::BIGINT INTO v_used_seconds
    FROM "UsageLedger"
    WHERE "entitlementId" = p_entitlement_id
      AND "periodStart" = v_entitlement."periodStart"
      AND "periodEnd" = v_entitlement."periodEnd";

  SELECT COALESCE(SUM("reservedSeconds"), 0)::BIGINT INTO v_reserved_seconds
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "status" = 'ACTIVE';

  v_remaining := GREATEST(0, v_entitlement."includedSeconds" - v_used_seconds - v_reserved_seconds);

  IF v_remaining < p_requested_seconds THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'INSUFFICIENT_CAPACITY',
      'remainingAfterReserve', v_remaining,
      'activeCallCount', v_active_count
    );
  END IF;

  v_reservation_id := gen_random_uuid()::TEXT;

  INSERT INTO "UsageReservation" (
    "id", "tenantId", "entitlementId", "externalCallId",
    "reservedSeconds", "status", "reservedAt", "createdAt", "updatedAt"
  ) VALUES (
    v_reservation_id, p_tenant_id, p_entitlement_id, p_external_call_id,
    p_requested_seconds, 'ACTIVE', NOW(), NOW(), NOW()
  );

  RETURN json_build_object(
    'ok', true,
    'reason', NULL,
    'reservationId', v_reservation_id,
    'idempotent', false,
    'reservedSeconds', p_requested_seconds,
    'remainingAfterReserve', v_remaining - p_requested_seconds,
    'activeCallCount', v_active_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION reserve_ai_usage_seconds FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reserve_ai_usage_seconds TO authenticated, service_role;


CREATE OR REPLACE FUNCTION finalize_ai_usage(
  p_tenant_id        TEXT,
  p_entitlement_id   TEXT,
  p_reservation_id   TEXT,
  p_external_call_id TEXT,
  p_billable_seconds INTEGER,
  p_provider_cost_usd DOUBLE PRECISION,
  p_revenue_usd      DOUBLE PRECISION,
  p_cost_breakdown   JSONB,
  p_idempotency_key  TEXT,
  p_usage_type       TEXT DEFAULT 'VOICE_MINUTE'
) RETURNS JSON AS $$
DECLARE
  v_entitlement RECORD;
  v_reservation RECORD;
  v_existing_ledger RECORD;
  v_ledger_id TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT "tenantId", "periodStart", "periodEnd", "status" INTO v_entitlement
    FROM "AddonEntitlement"
    WHERE "id" = p_entitlement_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  IF v_entitlement."tenantId" != p_tenant_id THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  v_period_start := v_entitlement."periodStart";
  v_period_end := v_entitlement."periodEnd";

  IF p_reservation_id IS NOT NULL THEN
    SELECT "id", "tenantId", "entitlementId", "externalCallId", "status"
      INTO v_reservation
      FROM "UsageReservation"
      WHERE "id" = p_reservation_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_reservation."tenantId" != p_tenant_id THEN
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_reservation."entitlementId" != p_entitlement_id THEN
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_ENTITLEMENT_MISMATCH');
    END IF;

    IF p_external_call_id IS NOT NULL AND v_reservation."externalCallId" != p_external_call_id THEN
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_CALL_MISMATCH');
    END IF;
  END IF;

  SELECT "id" INTO v_existing_ledger
    FROM "UsageLedger"
    WHERE "idempotencyKey" = p_idempotency_key;

  IF FOUND THEN
    IF p_reservation_id IS NOT NULL AND v_reservation."status" = 'ACTIVE' THEN
      UPDATE "UsageReservation"
        SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
            "consumedSeconds" = p_billable_seconds,
            "releasedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = p_reservation_id;
    END IF;

    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'ledgerId', v_existing_ledger."id",
      'idempotent', true
    );
  END IF;

  v_ledger_id := gen_random_uuid()::TEXT;

  BEGIN
    INSERT INTO "UsageLedger" (
      "id", "tenantId", "entitlementId", "idempotencyKey",
      "usageType", "quantitySeconds",
      "providerCostUsd", "revenueUsd", "costBreakdownJson",
      "periodStart", "periodEnd", "occurredAt", "createdAt"
    ) VALUES (
      v_ledger_id, p_tenant_id, p_entitlement_id, p_idempotency_key,
      p_usage_type, p_billable_seconds,
      p_provider_cost_usd, p_revenue_usd,
      CASE WHEN p_cost_breakdown IS NOT NULL THEN p_cost_breakdown::TEXT ELSE NULL END,
      v_period_start, v_period_end, NOW(), NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    SELECT "id" INTO v_existing_ledger
      FROM "UsageLedger"
      WHERE "idempotencyKey" = p_idempotency_key;

    IF p_reservation_id IS NOT NULL AND v_reservation."status" = 'ACTIVE' THEN
      UPDATE "UsageReservation"
        SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
            "consumedSeconds" = p_billable_seconds,
            "releasedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = p_reservation_id;
    END IF;

    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'ledgerId', v_existing_ledger."id",
      'idempotent', true
    );
  END;

  IF p_reservation_id IS NOT NULL THEN
    UPDATE "UsageReservation"
      SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
          "consumedSeconds" = p_billable_seconds,
          "releasedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = p_reservation_id;
  ELSE
    UPDATE "UsageReservation"
      SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
          "consumedSeconds" = p_billable_seconds,
          "releasedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "entitlementId" = p_entitlement_id
        AND "externalCallId" = p_external_call_id
        AND "status" = 'ACTIVE';
  END IF;

  RETURN json_build_object(
    'ok', true,
    'reason', NULL,
    'ledgerId', v_ledger_id,
    'idempotent', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION finalize_ai_usage FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION finalize_ai_usage TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. RPC: MARKETPLACE CITIES & COUNTS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_marketplace_cities(p_country text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE $query$
    SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
    FROM (
      SELECT
        MIN(TRIM(city)) AS city,
        COALESCE(MIN(TRIM(state)), '') AS region,
        COALESCE(MIN(latitude) FILTER (WHERE latitude IS NOT NULL), 0) AS lat,
        COALESCE(MIN(longitude) FILTER (WHERE longitude IS NOT NULL), 0) AS lng
      FROM "Tenant"
      WHERE "publicProfileEnabled" = true
        AND "marketplaceOptIn" = true
        AND "suspendedAt" IS NULL
        AND country = $1
        AND city IS NOT NULL
        AND TRIM(city) <> ''
      GROUP BY
        LOWER(TRIM(city)),
        LOWER(TRIM(COALESCE(state, '')))
      ORDER BY
        MIN(TRIM(city))
    ) sub
  $query$ USING p_country INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_marketplace_counts(p_country text, p_city text)
RETURNS TABLE (
  industry_counts jsonb,
  total bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY EXECUTE $query$
    SELECT
      COALESCE(
        jsonb_object_agg(LOWER(industry), cnt)
          FILTER (WHERE industry IS NOT NULL),
        '{}'::jsonb
      ) AS industry_counts,
      SUM(cnt)::bigint AS total
    FROM (
      SELECT
        industry,
        COUNT(*)::bigint AS cnt
      FROM "Tenant"
      WHERE "publicProfileEnabled" = true
        AND "marketplaceOptIn" = true
        AND "suspendedAt" IS NULL
        AND ($1 IS NULL OR country = $1)
        AND (
          $2 IS NULL
          OR city ILIKE '%' || $2 || '%'
          OR state ILIKE '%' || $2 || '%'
          OR ("serviceAreasJson"::text) ILIKE '%' || $2 || '%'
        )
      GROUP BY industry
    ) sub
  $query$ USING p_country, p_city;
END;
$$;

GRANT EXECUTE ON FUNCTION get_marketplace_cities(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_counts(text, text) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. RPC: CUSTOMER TIMELINE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_timeline(
  p_customer_id TEXT,
  p_tenant_id TEXT,
  p_entry_type TEXT,
  p_include_internal BOOLEAN,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_workspace_id TEXT;
  v_effective_tenant_id TEXT;
  v_result jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 100;
  ELSIF p_limit > 500 THEN
    p_limit := 500;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
  END IF;
  IF p_entry_type = 'all' THEN
    p_entry_type := NULL;
  END IF;

  IF p_tenant_id IS NOT NULL THEN
    SELECT c."workspaceId", p_tenant_id
    INTO v_workspace_id, v_effective_tenant_id
    FROM "Customer" c
    JOIN "Workspace" w ON c."workspaceId" = w.id
    WHERE c.id = p_customer_id
      AND w."tenantId" = p_tenant_id
    LIMIT 1;
  ELSE
    SELECT c."workspaceId"
    INTO v_workspace_id
    FROM "Customer" c
    WHERE c.id = p_customer_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_effective_tenant_id IS NULL AND v_workspace_id IS NOT NULL THEN
    SELECT w."tenantId" INTO v_effective_tenant_id
    FROM "Workspace" w WHERE w.id = v_workspace_id;
  END IF;

  EXECUTE $query$
    WITH
    explicit_entries AS (
      SELECT
        jsonb_build_object(
          'id', e.id,
          'entryType', e."entryType",
          'title', e.title,
          'description', e.description,
          'sourceType', e."sourceType",
          'sourceId', e."sourceId",
          'metadata', CASE
            WHEN e."metadataJson" IS NULL OR e."metadataJson" = ''
            THEN '{}'::jsonb
            ELSE e."metadataJson"::jsonb
          END,
          'actorId', e."actorId",
          'actorName', e."actorName",
          'actorType', e."actorType",
          'eventDate', to_char(e."eventDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', e."isInternal",
          'isPinned', e."isPinned",
          'isExplicit', true
        ) AS entry,
        e."entryType" AS entry_type,
        e."sourceType" AS source_type,
        e."sourceId" AS source_id,
        e."eventDate" AS event_date,
        true AS is_explicit
      FROM "CustomerTimelineEntry" e
      WHERE e."customerId" = $1
        AND ($2 IS NULL OR e."tenantId" = $2)
        AND ($4 = true OR e."isInternal" = false)
      ORDER BY e."eventDate" DESC
      LIMIT $5
      OFFSET $6
    ),

    lead_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'lead-' || l.id,
          'entryType', 'lead',
          'title', 'Lead received: ' || l.name,
          'description', CONCAT_WS(' · ',
            'Source: ' || COALESCE(l.source, 'manual'),
            l."serviceType",
            'Status: ' || COALESCE(l.status, 'new')
          ),
          'sourceType', 'Lead',
          'sourceId', l.id,
          'metadata', jsonb_build_object(
            'leadId', l.id,
            'source', l.source,
            'serviceType', l."serviceType",
            'status', l.status
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(l."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'lead' AS entry_type,
        'Lead' AS source_type,
        l.id AS source_id,
        l."createdAt" AS event_date,
        false AS is_explicit
      FROM "Lead" l
      WHERE l."customerId" = $1
        AND ($2 IS NULL OR l."tenantId" = $2)
      ORDER BY l."createdAt" DESC
      LIMIT 50
    ),

    job_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'job-' || j.id,
          'entryType', 'job',
          'title', 'Job: ' || COALESCE(j.title, 'Untitled job'),
          'description', CONCAT_WS(' · ',
            'Status: ' || COALESCE(j.status, 'pending'),
            CASE WHEN j."assigneeName" IS NOT NULL
              THEN 'Assigned to ' || j."assigneeName"
              ELSE 'Unassigned'
            END
          ),
          'sourceType', 'Job',
          'sourceId', j.id,
          'metadata', jsonb_build_object(
            'jobId', j.id,
            'status', j.status,
            'assigneeName', j."assigneeName"
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(
            COALESCE(j."completedAt", j."scheduledAt", j."createdAt"),
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'job' AS entry_type,
        'Job' AS source_type,
        j.id AS source_id,
        COALESCE(j."completedAt", j."scheduledAt", j."createdAt") AS event_date,
        false AS is_explicit
      FROM "Job" j
      WHERE j."customerId" = $1
      ORDER BY j."createdAt" DESC
      LIMIT 50
    ),

    invoice_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'inv-' || i.id,
          'entryType', CASE WHEN i.status = 'paid' THEN 'payment' ELSE 'invoice' END,
          'title', CASE WHEN i.status = 'paid'
            THEN 'Invoice paid: ' || i.number
            ELSE 'Invoice created: ' || i.number
          END,
          'description', COALESCE(i.currency, 'USD') || ' ' ||
            COALESCE(TO_CHAR(i.total, 'FM999999990.00'), '0.00') ||
            ' · Status: ' || COALESCE(i.status, 'unknown'),
          'sourceType', 'Invoice',
          'sourceId', i.id,
          'metadata', jsonb_build_object(
            'invoiceId', i.id,
            'number', i.number,
            'total', i.total,
            'currency', i.currency,
            'status', i.status
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(
            COALESCE(i."paidAt", i."createdAt"),
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        CASE WHEN i.status = 'paid' THEN 'payment' ELSE 'invoice' END AS entry_type,
        'Invoice' AS source_type,
        i.id AS source_id,
        COALESCE(i."paidAt", i."createdAt") AS event_date,
        false AS is_explicit
      FROM "Invoice" i
      WHERE i."customerId" = $1
      ORDER BY i."createdAt" DESC
      LIMIT 50
    ),

    photo_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'photo-' || p.id,
          'entryType', 'photo',
          'title', COALESCE(p."photoType", 'Photo') || ' uploaded',
          'description', CONCAT_WS(' · ',
            p.caption,
            CASE WHEN p."capturedByName" IS NOT NULL
              THEN 'By ' || p."capturedByName"
              ELSE NULL
            END
          ),
          'sourceType', 'JobPhoto',
          'sourceId', p.id,
          'metadata', jsonb_build_object(
            'url', p.url,
            'photoType', p."photoType",
            'jobId', p."jobId",
            'capturedByName', p."capturedByName"
          ),
          'actorId', NULL,
          'actorName', p."capturedByName",
          'actorType', 'employee',
          'eventDate', to_char(p."capturedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'photo' AS entry_type,
        'JobPhoto' AS source_type,
        p.id AS source_id,
        p."capturedAt" AS event_date,
        false AS is_explicit
      FROM "JobPhoto" p
      WHERE p."customerId" = $1
      ORDER BY p."capturedAt" DESC
      LIMIT 50
    ),

    signature_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'sig-' || s.id,
          'entryType', 'signature',
          'title', 'Signature captured: ' || s."signatoryName",
          'description', CONCAT_WS(' · ',
            s."signatoryType",
            s."signatoryRole"
          ),
          'sourceType', 'JobSignature',
          'sourceId', s.id,
          'metadata', jsonb_build_object(
            'signatoryType', s."signatoryType",
            'signatoryName', s."signatoryName",
            'jobId', s."jobId"
          ),
          'actorId', NULL,
          'actorName', s."signatoryName",
          'actorType', CASE WHEN s."signatoryType" = 'customer' THEN 'customer' ELSE 'employee' END,
          'eventDate', to_char(s."signedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'signature' AS entry_type,
        'JobSignature' AS source_type,
        s.id AS source_id,
        s."signedAt" AS event_date,
        false AS is_explicit
      FROM "JobSignature" s
      WHERE s."customerId" = $1
      ORDER BY s."signedAt" DESC
      LIMIT 50
    ),

    all_entries AS (
      SELECT * FROM explicit_entries
      UNION ALL
      SELECT * FROM lead_entries
      UNION ALL
      SELECT * FROM job_entries
      UNION ALL
      SELECT * FROM invoice_entries
      UNION ALL
      SELECT * FROM photo_entries
      UNION ALL
      SELECT * FROM signature_entries
    ),

    deduped AS (
      SELECT * FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY source_type, source_id, is_explicit
            ORDER BY event_date DESC
          ) AS rn
        FROM all_entries
      ) t
      WHERE is_explicit OR rn = 1
    ),

    filtered AS (
      SELECT * FROM deduped
      WHERE $3 IS NULL OR entry_type = $3
    )

    SELECT jsonb_build_object(
      'entries', COALESCE((
        SELECT jsonb_agg(entry ORDER BY event_date DESC)
        FROM (
          SELECT entry, event_date
          FROM filtered
          ORDER BY event_date DESC
          LIMIT $5 OFFSET $6
        ) paged
      ), '[]'::jsonb),
      'total', (SELECT COUNT(*)::int FROM filtered),
      'sources', jsonb_build_object(
        'leads', (SELECT COUNT(*)::int FROM lead_entries),
        'jobs', (SELECT COUNT(*)::int FROM job_entries),
        'invoices', (SELECT COUNT(*)::int FROM invoice_entries),
        'photos', (SELECT COUNT(*)::int FROM photo_entries),
        'signatures', (SELECT COUNT(*)::int FROM signature_entries),
        'manual', (SELECT COUNT(*)::int FROM explicit_entries)
      )
    )
  $query$
  INTO v_result
  USING p_customer_id, v_effective_tenant_id, p_entry_type, p_include_internal, p_limit, p_offset;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_timeline(text, text, text, boolean, integer, integer) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 10. RPC: JOB DETAIL
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_job_detail(p_job_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'job',
    to_jsonb(j) || jsonb_build_object(
      'assignee',
        CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'phone', e.phone,
          'role', e.role,
          'status', e.status,
          'avatar', e.avatar,
          'rating', e.rating,
          'completedJobs', e."completedJobs"
        ) ELSE NULL END,
      'customer',
        CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'phone', c.phone,
          'email', c.email,
          'address', c.address
        ) ELSE NULL END,
      'resource',
        CASE WHEN r.id IS NOT NULL THEN to_jsonb(r) ELSE NULL END,
      '_counts',
        jsonb_build_object(
          'photos', (
            SELECT COUNT(*)::int FROM "JobPhoto" WHERE "jobId" = p_job_id
          ),
          'signatures', (
            SELECT COUNT(*)::int FROM "JobSignature" WHERE "jobId" = p_job_id
          ),
          'checklists', (
            SELECT COUNT(*)::int FROM "JobChecklist" WHERE "jobId" = p_job_id
          )
        )
    )
  )
  INTO result
  FROM "Job" j
  LEFT JOIN "Employee" e ON e.id = j."assigneeId"
  LEFT JOIN "Customer" c ON c.id = j."customerId"
  LEFT JOIN "Resource" r ON r.id = j."resourceId"
  WHERE j.id = p_job_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_job_detail(text) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 11. RPC: INVOICES
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_invoices(
  p_tenant_id  text,
  p_customer_id text,
  p_status     text,
  p_search     text,
  p_page       int,
  p_limit      int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_total int;
  v_offset int;
BEGIN
  IF p_page IS NULL OR p_page < 1 THEN
    p_page := 1;
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 200;
  END IF;
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)::int INTO v_total
  FROM "Invoice" i
  LEFT JOIN "Customer" c ON c.id = i."customerId"
  WHERE
    (p_tenant_id IS NULL  OR i."tenantId" = p_tenant_id)
    AND (p_customer_id IS NULL OR i."customerId" = p_customer_id)
    AND (
      p_status IS NULL OR p_status = 'all' OR i.status = p_status
    )
    AND (
      p_search IS NULL
      OR i.number ILIKE '%' || p_search || '%'
      OR c.name  ILIKE '%' || p_search || '%'
    );

  SELECT jsonb_build_object(
    'invoices',
      COALESCE((
        SELECT jsonb_agg(inv_obj ORDER BY inv_created DESC)
        FROM (
          SELECT
            to_jsonb(i) || jsonb_build_object(
              'customer',
                CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
                  'id', c.id,
                  'name', c.name,
                  'email', c.email,
                  'phone', c.phone
                ) ELSE NULL END,
              'job',
                CASE WHEN j.id IS NOT NULL THEN jsonb_build_object(
                  'id', j.id,
                  'title', j.title
                ) ELSE NULL END,
              'employee',
                CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
                  'id', e.id,
                  'name', e.name
                ) ELSE NULL END
            ) AS inv_obj,
            i."createdAt" AS inv_created
          FROM "Invoice" i
          LEFT JOIN "Customer" c ON c.id = i."customerId"
          LEFT JOIN "Job" j      ON j.id = i."jobId"
          LEFT JOIN "Employee" e ON e.id = i."employeeId"
          WHERE
            (p_tenant_id IS NULL  OR i."tenantId" = p_tenant_id)
            AND (p_customer_id IS NULL OR i."customerId" = p_customer_id)
            AND (
              p_status IS NULL OR p_status = 'all' OR i.status = p_status
            )
            AND (
              p_search IS NULL
              OR i.number ILIKE '%' || p_search || '%'
              OR c.name  ILIKE '%' || p_search || '%'
            )
          ORDER BY i."createdAt" DESC
          LIMIT p_limit OFFSET v_offset
        ) limited
      ), '[]'::jsonb),
    'pagination',
      jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages',
          CASE WHEN p_limit > 0
               THEN CEIL(v_total::float / p_limit)::int
               ELSE 0 END
      )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_invoices(text, text, text, text, int, int) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 12. RPC: LEADS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_leads(
  p_tenant_id text,
  p_status    text,
  p_source    text,
  p_priority  text,
  p_search    text,
  p_page      int,
  p_limit     int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_total int;
  v_offset int;
BEGIN
  IF p_page IS NULL OR p_page < 1 THEN
    p_page := 1;
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 50;
  END IF;
  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*)::int INTO v_total
  FROM "Lead" l
  WHERE
    (p_tenant_id IS NULL  OR l."tenantId" = p_tenant_id)
    AND (p_status   IS NULL OR l.status   = p_status)
    AND (p_source   IS NULL OR l.source   = p_source)
    AND (p_priority IS NULL OR l.priority = p_priority)
    AND (
      p_search IS NULL
      OR l.name        ILIKE '%' || p_search || '%'
      OR l.email       ILIKE '%' || p_search || '%'
      OR l.phone       ILIKE '%' || p_search || '%'
      OR l.description ILIKE '%' || p_search || '%'
    );

  SELECT jsonb_build_object(
    'leads',
      COALESCE((
        SELECT jsonb_agg(lead_obj ORDER BY lead_created DESC)
        FROM (
          SELECT
            to_jsonb(l) || jsonb_build_object(
              'assignedTo',
                CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'phone', e.phone,
                  'avatar', e.avatar
                ) ELSE NULL END,
              'customer',
                CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
                  'id', c.id,
                  'name', c.name,
                  'phone', c.phone
                ) ELSE NULL END,
              'job',
                CASE WHEN j.id IS NOT NULL THEN jsonb_build_object(
                  'id', j.id,
                  'title', j.title,
                  'status', j.status
                ) ELSE NULL END
            ) AS lead_obj,
            l."createdAt" AS lead_created
          FROM "Lead" l
          LEFT JOIN "Employee" e ON e.id = l."assignedToId"
          LEFT JOIN "Customer" c ON c.id = l."customerId"
          LEFT JOIN "Job" j      ON j.id = l."jobId"
          WHERE
            (p_tenant_id IS NULL  OR l."tenantId" = p_tenant_id)
            AND (p_status   IS NULL OR l.status   = p_status)
            AND (p_source   IS NULL OR l.source   = p_source)
            AND (p_priority IS NULL OR l.priority = p_priority)
            AND (
              p_search IS NULL
              OR l.name        ILIKE '%' || p_search || '%'
              OR l.email       ILIKE '%' || p_search || '%'
              OR l.phone       ILIKE '%' || p_search || '%'
              OR l.description ILIKE '%' || p_search || '%'
            )
          ORDER BY l."createdAt" DESC
          LIMIT p_limit OFFSET v_offset
        ) limited
      ), '[]'::jsonb),
    'pagination',
      jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages',
          CASE WHEN p_limit > 0
               THEN CEIL(v_total::float / p_limit)::int
               ELSE 0 END
      )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_leads(text, text, text, text, text, int, int) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 13. RPC: CUSTOMER ASSETS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_assets(
  p_customer_id     text,
  p_user_tenant_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_tenant_id text;
BEGIN
  SELECT w."tenantId" INTO v_tenant_id
  FROM "Customer" c
  LEFT JOIN "Workspace" w ON w.id = c."workspaceId"
  WHERE c.id = p_customer_id;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := p_user_tenant_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('assets', '[]'::jsonb, 'tenantResolved', false);
  END IF;

  SELECT jsonb_build_object(
    'assets',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(ca) ORDER BY ca."createdAt" DESC)
        FROM "CustomerAsset" ca
        WHERE ca."customerId" = p_customer_id
          AND ca."tenantId"   = v_tenant_id
          AND ca.status      <> 'disposed'
      ), '[]'::jsonb),
    'tenantResolved', true
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_assets(text, text) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 14. RPC: RECURRING JOBS & SCHEDULE DETAILS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_recurring_jobs(
  p_tenant_id text,
  p_active_filter text DEFAULT NULL::text,
  p_customer_id text DEFAULT NULL::text
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'schedules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s."id",
        'tenantId', s."tenantId",
        'customerId', s."customerId",
        'customerName', c."name",
        'customerPhone', c."phone",
        'customerEmail', c."email",
        'title', s."title",
        'description', s."description",
        'active', s."active",
        'frequency', s."frequency",
        'interval', s."interval",
        'weekdaysJson', s."weekdaysJson",
        'monthDay', s."monthDay",
        'startDate', s."startDate",
        'endDate', s."endDate",
        'nextRunAt', s."nextRunAt",
        'lastRunAt', s."lastRunAt",
        'lastJobId', s."lastJobId",
        'assigneeIdsJson', s."assigneeIdsJson",
        'serviceId', s."serviceId",
        'serviceTitle', svc."name",
        'createdAt', s."createdAt",
        'updatedAt', s."updatedAt",
        'lastJob', CASE
          WHEN lj."id" IS NOT NULL THEN jsonb_build_object(
            'id', lj."id",
            'jobNumber', lj."jobNumber",
            'title', lj."title",
            'status', lj."status",
            'scheduledAt', lj."scheduledAt",
            'createdAt', lj."createdAt"
          )
          ELSE NULL
        END,
        'generatedCount', COALESCE(gc.cnt, 0),
        'primaryAssigneeName', emp."name"
      ))
      FROM "RecurringJobSchedule" s
      LEFT JOIN "Customer" c ON c."id" = s."customerId"
      LEFT JOIN "Service" svc ON svc."id" = s."serviceId"
      LEFT JOIN "Job" lj ON lj."id" = s."lastJobId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM "Job" j
        WHERE j."recurringScheduleId" = s."id"
      ) gc ON true
      LEFT JOIN LATERAL (
        SELECT e."name"
        FROM "Employee" e
        WHERE e."id" = ANY (
          CASE
            WHEN s."assigneeIdsJson" IS NOT NULL AND s."assigneeIdsJson" != '[]'
              THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(s."assigneeIdsJson"::jsonb) x LIMIT 1)
            ELSE ARRAY[]::text[]
          END
        )
        LIMIT 1
      ) emp ON true
      WHERE s."tenantId" = p_tenant_id
        AND (
          p_active_filter IS NULL
          OR p_active_filter = ''
          OR (p_active_filter = 'true' AND s."active" = true)
          OR (p_active_filter = 'false' AND s."active" = false)
        )
        AND (
          p_customer_id IS NULL
          OR p_customer_id = ''
          OR s."customerId" = p_customer_id
        )
      ORDER BY s."active" DESC, s."nextRunAt" ASC
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_recurring_job_details(
  p_tenant_id text,
  p_schedule_id text
) RETURNS jsonb AS $$
DECLARE
  v_schedule "RecurringJobSchedule"%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO v_schedule
  FROM "RecurringJobSchedule"
  WHERE "id" = p_schedule_id AND "tenantId" = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found', 'status', 404);
  END IF;

  SELECT jsonb_build_object(
    'schedule', to_jsonb(v_schedule),
    'customer', (
      SELECT jsonb_build_object(
        'id', c."id",
        'name', c."name",
        'phone', c."phone",
        'email', c."email",
        'address', c.address
      )
      FROM "Customer" c
      WHERE c."id" = v_schedule."customerId"
    ),
    'recentJobs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', j."id",
        'jobNumber', j."jobNumber",
        'title', j."title",
        'status', j."status",
        'scheduledAt', j."scheduledAt",
        'completedAt', j."completedAt",
        'createdAt', j."createdAt"
      ) ORDER BY j."createdAt" DESC)
      FROM (
        SELECT * FROM "Job"
        WHERE "recurringScheduleId" = p_schedule_id
        ORDER BY "createdAt" DESC
        LIMIT 10
      ) j
    ), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'totalGenerated', COALESCE((
        SELECT COUNT(*)::int FROM "Job" WHERE "recurringScheduleId" = p_schedule_id
      ), 0),
      'completed', COALESCE((
        SELECT COUNT(*)::int FROM "Job"
        WHERE "recurringScheduleId" = p_schedule_id AND "status" = 'completed'
      ), 0),
      'cancelled', COALESCE((
        SELECT COUNT(*)::int FROM "Job"
        WHERE "recurringScheduleId" = p_schedule_id AND "status" = 'cancelled'
      ), 0),
      'nextRunAt', v_schedule."nextRunAt",
      'lastRunAt', v_schedule."lastRunAt"
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recurring_jobs(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_recurring_job_details(text, text) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 15. PERFORMANCE COMPOSITE & COVERING INDEXES
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_mp_counts_cover
  ON "Tenant" (country, industry)
  WHERE "publicProfileEnabled" = true
    AND "marketplaceOptIn" = true
    AND "suspendedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_mp_cities_cover
  ON "Tenant" (country, city, state, latitude, longitude)
  WHERE "publicProfileEnabled" = true
    AND "marketplaceOptIn" = true
    AND "suspendedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Job_workspaceId_status_deletedAt_idx" ON "Job"("workspaceId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Job_customerId_workspaceId_idx" ON "Job"("customerId", "workspaceId");
CREATE INDEX IF NOT EXISTS "Job_assigneeId_status_idx" ON "Job"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Job_recurringScheduleId_idx" ON "Job"("recurringScheduleId");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_status_dueDate_idx" ON "Invoice"("tenantId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_customerId_idx" ON "Invoice"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_createdAt_idx" ON "Invoice"("customerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_tenantId_status_createdAt_idx" ON "Lead"("tenantId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Lead_customerId_createdAt_idx" ON "Lead"("customerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_tenantId_read_createdAt_idx" ON "Notification"("tenantId", "read", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomerTimelineEntry_customerId_eventDate_idx" ON "CustomerTimelineEntry"("customerId", "eventDate" DESC);

CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_active_nextRunAt_idx" ON "RecurringJobSchedule"("active", "nextRunAt");
CREATE INDEX IF NOT EXISTS "RecurringJobSchedule_tenantId_active_nextRunAt_idx" ON "RecurringJobSchedule"("tenantId", "active", "nextRunAt");
CREATE INDEX IF NOT EXISTS "ScheduledMessage_status_dueAt_idx" ON "ScheduledMessage"("status", "dueAt");

CREATE INDEX IF NOT EXISTS "GPSLocation_capturedAt_idx" ON "GPSLocation"("capturedAt" DESC);
CREATE INDEX IF NOT EXISTS "GPSLocation_employeeId_capturedAt_idx" ON "GPSLocation"("employeeId", "capturedAt" DESC);

CREATE INDEX IF NOT EXISTS "JobPhoto_jobId_idx" ON "JobPhoto"("jobId");
CREATE INDEX IF NOT EXISTS "JobSignature_jobId_idx" ON "JobSignature"("jobId");
CREATE INDEX IF NOT EXISTS "JobChecklist_jobId_idx" ON "JobChecklist"("jobId");


-- ────────────────────────────────────────────────────────────────────────────
-- 16. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ────────────────────────────────────────────────────────────────────────────
-- 17. VERIFICATION
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
