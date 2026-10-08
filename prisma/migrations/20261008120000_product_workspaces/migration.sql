BEGIN;
CREATE TABLE IF NOT EXISTS public."ProductWorkspace" (
  "workspaceId" text PRIMARY KEY REFERENCES public."Workspace"(id),
  "tenantId" text REFERENCES public."Tenant"(id),
  product text NOT NULL CHECK (product IN ('crm','bos','chatbotly','quoteflow','marketplace')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  "onboardingCompleted" boolean NOT NULL DEFAULT false,
  "onboardingStep" integer NOT NULL DEFAULT 0,
  "profileJson" text NOT NULL DEFAULT '{}',
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ProductWorkspace_tenantId_product_idx" ON public."ProductWorkspace"("tenantId",product);
CREATE TABLE IF NOT EXISTS public."ProductMembership" (
  id text PRIMARY KEY, "workspaceId" text NOT NULL REFERENCES public."ProductWorkspace"("workspaceId"),
  "userId" text NOT NULL REFERENCES public."User"(id), role text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("workspaceId","userId")
);
CREATE INDEX IF NOT EXISTS "ProductMembership_userId_status_idx" ON public."ProductMembership"("userId",status);
CREATE TABLE IF NOT EXISTS public."ProductSubscription" (
  "workspaceId" text PRIMARY KEY REFERENCES public."ProductWorkspace"("workspaceId"),
  plan text NOT NULL, status text NOT NULL,
  "trialEndsAt" timestamp, "currentPeriodEnd" timestamp,
  "billingSource" text NOT NULL DEFAULT 'product', "legacySubscriptionId" text,
  provider text, "providerSubscriptionId" text UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
-- Keep IDs and data in place. Historical subscriptions remain authoritative.
INSERT INTO public."ProductWorkspace" ("workspaceId","tenantId",product,"onboardingCompleted","onboardingStep")
SELECT w.id,w."tenantId", CASE
 WHEN t."signupMode"='listing_only' THEN 'marketplace'
 WHEN w."productType" IN ('forms','gptform','chatboly') THEN 'chatbotly'
 WHEN w."productType" IN ('bos','chatbotly','quoteflow','marketplace') THEN w."productType"
 ELSE 'crm' END, COALESCE(t."onboardingCompleted",false), COALESCE(t."onboardingStep",0)
FROM public."Workspace" w LEFT JOIN public."Tenant" t ON t.id=w."tenantId"
ON CONFLICT DO NOTHING;
INSERT INTO public."ProductMembership" (id,"workspaceId","userId",role)
SELECT 'pm_'||md5(u.id||':'||u."workspaceId"),u."workspaceId",u.id,u.role
FROM public."User" u JOIN public."ProductWorkspace" p ON p."workspaceId"=u."workspaceId"
ON CONFLICT DO NOTHING;
INSERT INTO public."ProductMembership" (id,"workspaceId","userId",role)
SELECT 'pm_'||md5(u.id||':'||w.id),w.id,u.id,'owner'
FROM public."Workspace" w JOIN public."User" u ON u.id=w."ownerId"
ON CONFLICT DO NOTHING;
INSERT INTO public."ProductSubscription" ("workspaceId",plan,status,"trialEndsAt","currentPeriodEnd","billingSource","legacySubscriptionId")
SELECT p."workspaceId",COALESCE(t.plan,'free'),COALESCE(t."planStatus",'active'),t."trialEndsAt",t."planEndsAt",'legacy',
 (SELECT s.id FROM public."Subscription" s WHERE s."tenantId"=p."tenantId" ORDER BY s."createdAt" DESC LIMIT 1)
FROM public."ProductWorkspace" p LEFT JOIN public."Tenant" t ON t.id=p."tenantId"
ON CONFLICT DO NOTHING;

-- RPC is used by both Prisma and PostgREST: all provisioning is one transaction.
CREATE OR REPLACE FUNCTION public.activate_product_workspace(p_user_id text,p_product text,p_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u public."User"%ROWTYPE; w text; tid text; existing text;
BEGIN
 IF p_product NOT IN ('crm','bos','chatbotly','quoteflow','marketplace') OR length(trim(p_name)) NOT BETWEEN 1 AND 120 THEN
 RAISE EXCEPTION 'INVALID_PRODUCT_INPUT'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id,0));
 SELECT * INTO u FROM public."User" WHERE id=p_user_id AND "isActive" AND "emailVerified";
 IF NOT FOUND OR u.role NOT IN ('owner','admin','standalone_user') THEN RAISE EXCEPTION 'PRODUCT_ACTIVATION_FORBIDDEN'; END IF;
 SELECT p."workspaceId" INTO existing FROM public."ProductMembership" m
 JOIN public."ProductWorkspace" p ON p."workspaceId"=m."workspaceId"
 WHERE m."userId"=u.id AND p.product=p_product ORDER BY p."createdAt" LIMIT 1;
 -- Do not revive a suspended membership or restart an expired trial.
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 tid:=u."tenantId";
 IF tid IS NULL THEN
 tid:='pt_'||md5(u.id);
 INSERT INTO public."Tenant" (id,name,slug,country,currency,plan,"planStatus","updatedAt")
 VALUES(tid,trim(p_name),tid,'US','USD','free','active',now()) ON CONFLICT (id) DO NOTHING;
 UPDATE public."User" SET "tenantId"=tid WHERE id=u.id;
 END IF;
 IF EXISTS(SELECT 1 FROM public."Tenant" WHERE id=tid AND "suspendedAt" IS NOT NULL) THEN RAISE EXCEPTION 'TENANT_SUSPENDED'; END IF;
 w:='pw_'||md5(u.id||':'||p_product);
 INSERT INTO public."Workspace" (id,name,slug,"ownerId","tenantId","productType","updatedAt")
 VALUES(w,trim(p_name),w,u.id,tid,p_product,now());
 INSERT INTO public."ProductWorkspace" ("workspaceId","tenantId",product) VALUES(w,tid,p_product);
 INSERT INTO public."ProductMembership" (id,"workspaceId","userId",role) VALUES('pm_'||md5(u.id||':'||w),w,u.id,'owner');
 INSERT INTO public."ProductSubscription" ("workspaceId",plan,status,"trialEndsAt")
 VALUES(w,CASE WHEN p_product IN ('quoteflow','marketplace') THEN 'free' ELSE 'trial' END,
 CASE WHEN p_product IN ('quoteflow','marketplace') THEN 'active' ELSE 'trial' END,
 CASE WHEN p_product IN ('quoteflow','marketplace') THEN NULL ELSE now()+interval '14 days' END);
 UPDATE public."User" SET "workspaceId"=w WHERE id=u.id AND "workspaceId" IS NULL;
 RETURN w;
END $$;
REVOKE ALL ON FUNCTION public.activate_product_workspace(text,text,text) FROM PUBLIC;
DO $$ DECLARE t text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['ProductWorkspace','ProductMembership','ProductSubscription'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t);
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',t,r); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE format('GRANT ALL ON public.%I TO service_role',t); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION public.activate_product_workspace(text,text,text) TO service_role; END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
