-- =============================================================================
-- BGOS 5,000+ User Performance Optimization Migration (PostgreSQL / Supabase)
-- Safe & Idempotent: creates missing BGOS tables if needed, guards indexes,
-- provides 1-call RPC aggregation + Postgres-backed shared rate limiting.
-- =============================================================================

-- 0. Ensure BGOS tables added post-initial-seed exist safely in PostgreSQL
CREATE TABLE IF NOT EXISTS "Competitor" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  name TEXT NOT NULL,
  rating DOUBLE PRECISION,
  "reviewCount" INTEGER,
  "distanceKm" DOUBLE PRECISION,
  address TEXT,
  category TEXT,
  "placeId" TEXT,
  "mapsUrl" TEXT,
  "websiteUrl" TEXT,
  "lastSeoScore" INTEGER,
  "seoSummaryJson" TEXT,
  "lastAuditedAt" TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Competitor_tenantId_name_key" UNIQUE ("tenantId", name)
);
ALTER TABLE "Competitor" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "RankGridScan" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "scanType" TEXT NOT NULL,
  keyword TEXT NOT NULL,
  "placeId" TEXT,
  "targetDomain" TEXT,
  "gridSize" INTEGER NOT NULL DEFAULT 3,
  "radiusKm" DOUBLE PRECISION,
  "centerLat" DOUBLE PRECISION,
  "centerLng" DOUBLE PRECISION,
  "avgRank" DOUBLE PRECISION,
  "top3Pct" DOUBLE PRECISION,
  "organicRank" INTEGER,
  "aiOverviewPresent" BOOLEAN,
  "aiOverviewCited" BOOLEAN,
  "citedDomainsJson" TEXT NOT NULL DEFAULT '[]',
  "pointsJson" TEXT NOT NULL DEFAULT '[]',
  "providerCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "RankGridScan" ENABLE ROW LEVEL SECURITY;

-- 1. Safe Composite Indexes (guarded so missing tables/columns never fail migration)
DO $$
BEGIN
  IF to_regclass('public."Review"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'source') THEN
    CREATE INDEX IF NOT EXISTS "Review_tenantId_source_createdAt_idx"
      ON "Review" ("tenantId", "source", "createdAt" DESC);
  END IF;

  IF to_regclass('public."SocialPost"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "SocialPost_tenantId_status_scheduledAt_createdAt_idx"
      ON "SocialPost" ("tenantId", "status", "scheduledAt", "createdAt" DESC);
  END IF;

  IF to_regclass('public."ScheduledMessage"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ScheduledMessage' AND column_name = 'messageType') THEN
    CREATE INDEX IF NOT EXISTS "ScheduledMessage_tenantId_messageType_status_idx"
      ON "ScheduledMessage" ("tenantId", "messageType", "status");
  END IF;

  IF to_regclass('public."Competitor"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "Competitor_tenantId_idx"
      ON "Competitor" ("tenantId");
    CREATE INDEX IF NOT EXISTS "Competitor_tenantId_distanceKm_rating_idx"
      ON "Competitor" ("tenantId", "distanceKm", "rating");
  END IF;

  IF to_regclass('public."RankGridScan"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "RankGridScan_tenantId_scanType_createdAt_idx"
      ON "RankGridScan" ("tenantId", "scanType", "createdAt" DESC);
    CREATE INDEX IF NOT EXISTS "RankGridScan_tenantId_scanType_keyword_createdAt_idx"
      ON "RankGridScan" ("tenantId", "scanType", "keyword", "createdAt" DESC);
  END IF;
END $$;

-- 2. Single-RPC Dashboard Summary Aggregation (replaces ~12 PostgREST round-trips)
CREATE OR REPLACE FUNCTION get_bgos_dashboard_summary(
  p_tenant_id TEXT,
  p_day_start TIMESTAMPTZ DEFAULT date_trunc('day', now()),
  p_day_end TIMESTAMPTZ DEFAULT (date_trunc('day', now()) + interval '1 day' - interval '1 millisecond')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_bookings JSONB := '[]'::jsonb;
  v_reviews JSONB := '[]'::jsonb;
  v_social_accounts JSONB := '[]'::jsonb;
  v_total_reviews INT := 0;
  v_avg_rating NUMERIC := 0;
  v_lead_count INT := 0;
  v_submissions_count INT := 0;
  v_published_posts INT := 0;
  v_scheduled_posts INT := 0;
  v_pending_invites INT := 0;
  v_sent_invites INT := 0;
BEGIN
  IF p_tenant_id IS NULL OR length(trim(p_tenant_id)) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  IF to_regclass('public."Booking"') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(b)::jsonb), '[]'::jsonb)
      INTO v_today_bookings
    FROM (
      SELECT id, title, "customerName", "customerPhone", "scheduledAt", status
      FROM "Booking"
      WHERE "tenantId" = p_tenant_id
        AND "deletedAt" IS NULL
        AND "scheduledAt" >= p_day_start
        AND "scheduledAt" <= p_day_end
      ORDER BY "scheduledAt" ASC
      LIMIT 50
    ) b;
  END IF;

  IF to_regclass('public."Review"') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
      INTO v_reviews
    FROM (
      SELECT id, rating, "createdAt", "authorName", comment, "responseJson", source
      FROM "Review"
      WHERE "tenantId" = p_tenant_id
      ORDER BY "createdAt" DESC
      LIMIT 30
    ) r;

    SELECT COUNT(*)::INT, COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
      INTO v_total_reviews, v_avg_rating
    FROM "Review"
    WHERE "tenantId" = p_tenant_id;
  END IF;

  IF to_regclass('public."SocialAccount"') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(sa)::jsonb), '[]'::jsonb)
      INTO v_social_accounts
    FROM (
      SELECT "accountId", "accountName", metadata
      FROM "SocialAccount"
      WHERE "tenantId" = p_tenant_id
        AND platform = 'googlebusiness'
        AND "isActive" = true
      LIMIT 5
    ) sa;
  END IF;

  IF to_regclass('public."Lead"') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_lead_count FROM "Lead" WHERE "tenantId" = p_tenant_id;
  END IF;

  IF to_regclass('public."FormResponse"') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_submissions_count FROM "FormResponse" WHERE "tenantId" = p_tenant_id;
  END IF;

  IF to_regclass('public."SocialPost"') IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE status = 'published')::INT,
      COUNT(*) FILTER (WHERE status = 'scheduled')::INT
    INTO v_published_posts, v_scheduled_posts
    FROM "SocialPost"
    WHERE "tenantId" = p_tenant_id;
  END IF;

  IF to_regclass('public."ScheduledMessage"') IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::INT,
      COUNT(*) FILTER (WHERE status = 'sent')::INT
    INTO v_pending_invites, v_sent_invites
    FROM "ScheduledMessage"
    WHERE "tenantId" = p_tenant_id
      AND "messageType" = 'review_request';
  END IF;

  RETURN jsonb_build_object(
    'todayBookings', v_today_bookings,
    'reviews', v_reviews,
    'totalReviewsCount', v_total_reviews,
    'avgRating', v_avg_rating,
    'socialAccounts', v_social_accounts,
    'totalLeadsCount', v_lead_count,
    'totalSubmissionsCount', v_submissions_count,
    'publishedSocialPosts', v_published_posts,
    'scheduledSocialPosts', v_scheduled_posts,
    'pendingInvites', v_pending_invites,
    'sentInvites', v_sent_invites
  );
END;
$$;

-- 3. Postgres-backed Shared Rate Limit Table + Atomic RPC (Replaces Redis for multi-instance quotas)
CREATE TABLE IF NOT EXISTS "BgosRateLimitBucket" (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "BgosRateLimitBucket_resetAt_idx"
  ON "BgosRateLimitBucket" ("resetAt");

ALTER TABLE "BgosRateLimitBucket" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_bgos_rate_limit(
  p_key TEXT,
  p_window_ms BIGINT,
  p_max INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_new_reset TIMESTAMPTZ := v_now + (p_window_ms::TEXT || ' milliseconds')::INTERVAL;
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  INSERT INTO "BgosRateLimitBucket" (key, count, "resetAt")
  VALUES (p_key, 1, v_new_reset)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN "BgosRateLimitBucket"."resetAt" < v_now THEN 1
      ELSE "BgosRateLimitBucket".count + 1
    END,
    "resetAt" = CASE
      WHEN "BgosRateLimitBucket"."resetAt" < v_now THEN v_new_reset
      ELSE "BgosRateLimitBucket"."resetAt"
    END
  RETURNING count, "resetAt" INTO v_count, v_reset;

  RETURN jsonb_build_object(
    'success', v_count <= p_max,
    'remaining', GREATEST(0, p_max - v_count),
    'resetAtMs', (EXTRACT(EPOCH FROM v_reset) * 1000)::BIGINT
  );
END;
$$;
