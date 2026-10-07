-- Run in Supabase SQL Editor as the postgres administrator.
-- Requires the existing commerce consistency and order notification migrations.
-- Adds indexes and a read-only function; does not alter customer balances.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public;

-- Read-only, business-scoped history. No legacy balances or receipts are invented.
CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_customer_history" ON "GptformCommerceOrder"("businessId","customerPhone","createdAt",id);
CREATE INDEX IF NOT EXISTS "NuvoraMoneyEvent_customer_history" ON "NuvoraMoneyEvent"("businessId",counterparty,"occurredAt",id);
CREATE OR REPLACE FUNCTION nuvora_customer_history(p_business_id text,p_phone text,p_section text,p_before_time text,p_before_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE records jsonb; balance numeric; review boolean; currency text; total_count bigint;
BEGIN
 IF p_phone !~ '^[0-9]{7,15}$' OR p_section NOT IN ('orders','ledger') THEN RAISE EXCEPTION 'INVALID_CUSTOMER_HISTORY'; END IF;
 SELECT b.currency INTO currency FROM "AiBusiness" b WHERE b.id=p_business_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_NOT_FOUND'; END IF;
 SELECT coalesce(sum(greatest(o.total-o."paidAmount",0)) FILTER(WHERE o.status NOT IN ('PENDING','CANCELLED') AND o."paymentStatus"<>'REFUNDED'),0),
   coalesce(bool_or(o."needsReconciliation"),false),count(*) INTO balance,review,total_count
 FROM "GptformCommerceOrder" o WHERE o."businessId"=p_business_id AND o."customerPhone"=p_phone;
 IF p_section='orders' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r."createdAt" DESC,r.id DESC),'[]'::jsonb) INTO records FROM (
   SELECT o.id,o.total,o."paidAmount",o.status,o."paymentStatus",o."createdAt",o."paymentMethod"
   FROM "GptformCommerceOrder" o WHERE o."businessId"=p_business_id AND o."customerPhone"=p_phone
   AND (p_before_time='' OR (o."createdAt",o.id)<(p_before_time::timestamptz,p_before_id))
   ORDER BY o."createdAt" DESC,o.id DESC LIMIT 51
  ) r;
 ELSE
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r."createdAt" DESC,r.id DESC),'[]'::jsonb) INTO records FROM (
   SELECT * FROM (
    SELECT 'sale:'||o.id AS id,o.id AS "orderId",'SALE'::text AS kind,o.total AS debit,0::numeric AS credit,o."createdAt",NULL::text AS account
    FROM "GptformCommerceOrder" o WHERE o."businessId"=p_business_id AND o."customerPhone"=p_phone
     AND o.status NOT IN ('PENDING','CANCELLED') AND o."paymentStatus"<>'REFUNDED'
    UNION ALL
    SELECT 'receipt:'||e.id,e."referenceId",e.kind,0::numeric,e."moneyMinor"/100.0,e."occurredAt",e.account
    FROM "NuvoraMoneyEvent" e WHERE e."businessId"=p_business_id AND e."moneyMinor">0
     AND e.kind IN ('COLLECTION','ORDER_PAYMENT','SALE_PAYMENT')
     AND (e.counterparty=p_phone OR EXISTS(SELECT 1 FROM "GptformCommerceOrder" o WHERE o.id=e."referenceId" AND o."businessId"=p_business_id AND o."customerPhone"=p_phone))
   ) combined WHERE p_before_time='' OR (combined."createdAt",combined.id)<(p_before_time::timestamptz,p_before_id)
   ORDER BY "createdAt" DESC,id DESC LIMIT 51
  ) r;
 END IF;
 RETURN jsonb_build_object('records',records,'balance',CASE WHEN review THEN NULL ELSE balance END,'reviewRequired',review,'ordersCount',total_count,'currency',currency);
END $$;
REVOKE ALL ON FUNCTION nuvora_customer_history(text,text,text,text,text) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
 GRANT EXECUTE ON FUNCTION nuvora_customer_history(text,text,text,text,text) TO service_role;
END IF; END $$;

-- Restrict direct access to the backend service role.
REVOKE ALL ON FUNCTION public.nuvora_customer_history(text,text,text,text,text) FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Expected: installed=true, service_access=true, anon_access=false,
-- authenticated_access=false.
SELECT
 to_regprocedure('public.nuvora_customer_history(text,text,text,text,text)') IS NOT NULL AS installed,
 has_function_privilege('service_role','public.nuvora_customer_history(text,text,text,text,text)','EXECUTE') AS service_access,
 has_function_privilege('anon','public.nuvora_customer_history(text,text,text,text,text)','EXECUTE') AS anon_access,
 has_function_privilege('authenticated','public.nuvora_customer_history(text,text,text,text,text)','EXECUTE') AS authenticated_access;
