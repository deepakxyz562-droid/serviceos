-- ════════════════════════════════════════════════════════════════════════════
-- get_bos_commerce_context(p_user_id text)
-- Consolidates 3 sequential PostgREST HTTP round-trips into 1 atomic database call:
--   1. "User" active status verification
--   2. "AiBusiness" lookup (owner or tenant)
--   3. "GptformCommerceConfig" lookup
--
-- Performance Impact:
--   Reduces server-side database resolution from ~1200ms (3 sequential HTTP
--   REST roundtrips to Supabase) to ~60ms (1 single PostgREST RPC call).
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_bos_commerce_context(p_user_id text);

CREATE OR REPLACE FUNCTION get_bos_commerce_context(
  p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_business record;
  v_config record;
  v_role text := 'owner';
  v_is_owner boolean := true;
BEGIN
  -- 1. Check user
  SELECT id, email, name, "tenantId", "isActive", role
  INTO v_user
  FROM "User"
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_user."isActive" IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_INACTIVE');
  END IF;

  -- 2. Find business: first by ownerId
  SELECT *
  INTO v_business
  FROM "AiBusiness"
  WHERE "ownerId" = p_user_id
  LIMIT 1;

  -- If not found by ownerId, try tenantId if available
  IF NOT FOUND AND v_user."tenantId" IS NOT NULL THEN
    SELECT *
    INTO v_business
    FROM "AiBusiness"
    WHERE "tenantId" = v_user."tenantId"
    LIMIT 1;
  END IF;

  -- If still not found, check if user is a staff member inside GptformCommerceConfig.fieldsJson
  IF NOT FOUND THEN
    SELECT b.*
    INTO v_business
    FROM "GptformCommerceConfig" cfg
    JOIN "AiBusiness" b ON (b.id = cfg."businessId" OR (b."tenantId" IS NOT NULL AND b."tenantId" = cfg."businessId"))
    WHERE cfg."fieldsJson" ILIKE '%' || p_user_id || '%'
       OR (v_user.email IS NOT NULL AND cfg."fieldsJson" ILIKE '%' || v_user.email || '%')
    ORDER BY cfg."updatedAt" DESC
    LIMIT 1;

    IF FOUND THEN
      v_role := 'staff';
      v_is_owner := false;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'user', to_jsonb(v_user),
      'business', NULL,
      'config', NULL,
      'role', 'none',
      'isOwner', false
    );
  END IF;

  -- 3. Find commerce config for the resolved business
  SELECT *
  INTO v_config
  FROM "GptformCommerceConfig"
  WHERE "businessId" = v_business.id
     OR (v_business."tenantId" IS NOT NULL AND "businessId" = v_business."tenantId")
  ORDER BY "updatedAt" DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'user', to_jsonb(v_user),
    'business', to_jsonb(v_business),
    'config', CASE WHEN v_config.id IS NOT NULL THEN to_jsonb(v_config) ELSE NULL END,
    'role', v_role,
    'isOwner', v_is_owner
  );
END;
$$;
