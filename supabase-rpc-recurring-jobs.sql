-- ====================================================================
-- FIESEROS — RECURRING JOBS RPC FUNCTIONS
-- ====================================================================
-- Purpose: Create `get_recurring_jobs` + `get_recurring_job_details` SQL
-- functions to consolidate multiple DB queries into a single RPC call.
--
-- Without these functions, the recurring jobs API falls back to 4 separate
-- Prisma queries (schedules + last jobs + counts + employees), each making
-- a separate HTTP round-trip to Supabase's PostgREST API (~500ms each).
-- With these functions, it's 1 round-trip (~500ms total).
--
-- SAFE TO RUN MULTIPLE TIMES (uses CREATE OR REPLACE).
-- Run in Supabase SQL Editor.
-- ====================================================================

-- ── Step 1: get_recurring_jobs(p_tenant_id, p_active, p_customer_id) ──
-- Returns: { schedules: [{ ...schedule fields, customer: {...}, lastJob: {...}|null, generatedCount: int, primaryAssigneeName: string|null, recurrencePreview: string }] }

CREATE OR REPLACE FUNCTION get_recurring_jobs(
  p_tenant_id text,
  p_active text DEFAULT '',
  p_customer_id text DEFAULT ''
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
        AND (p_active = '' OR (p_active = 'true' AND s."active" = true) OR (p_active = 'false' AND s."active" = false))
        AND (p_customer_id = '' OR s."customerId" = p_customer_id)
      ORDER BY s."active" DESC, s."nextRunAt" ASC
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Step 2: get_recurring_job_details(p_tenant_id, p_schedule_id) ──────
-- Returns: { schedule: {...}, customer: {...}|null, recentJobs: [...], metrics: {...} }
-- Or: { error: 'not_found', status: 404 } if not found

CREATE OR REPLACE FUNCTION get_recurring_job_details(
  p_tenant_id text,
  p_schedule_id text
) RETURNS jsonb AS $$
DECLARE
  v_schedule "RecurringJobSchedule"%ROWTYPE;
  v_exists boolean;
  result jsonb;
BEGIN
  -- Check if schedule exists + belongs to tenant
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
        'address', c."address"
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

-- ── Verify ─────────────────────────────────────────────────────────────
SELECT
  'get_recurring_jobs' AS function_name,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_recurring_jobs') AS created
UNION ALL
SELECT
  'get_recurring_job_details',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_recurring_job_details');

-- Expected: both rows show created = true
