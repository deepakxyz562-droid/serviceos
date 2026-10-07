-- Atomic commerce operations. Apply to staging and verify reconciliation before release.
ALTER TABLE "GptformCommerceOrder" ADD COLUMN IF NOT EXISTS "paidAmount" double precision NOT NULL DEFAULT 0;
ALTER TABLE "GptformCommerceOrder" ADD COLUMN IF NOT EXISTS "needsReconciliation" boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "NuvoraCommerceOutbox" (
 id text PRIMARY KEY, "orderId" text NOT NULL REFERENCES "GptformCommerceOrder"(id) ON DELETE CASCADE,
 audience text NOT NULL CHECK(audience IN ('customer','vendor')), status text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0, "availableAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "leasedAt" timestamptz, "leaseToken" text, "lastError" text, UNIQUE("orderId",audience)
);
ALTER TABLE "NuvoraCommerceOutbox" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "NuvoraCommerceMigration"(name text PRIMARY KEY,"appliedAt" timestamptz NOT NULL DEFAULT now());
ALTER TABLE "NuvoraCommerceMigration" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM "NuvoraCommerceMigration" WHERE name='20261007150000_commerce_consistency') THEN
UPDATE "GptformCommerceOrder" SET "paidAmount" = "total" WHERE "paymentStatus" = 'PAID';
UPDATE "GptformCommerceOrder" SET "needsReconciliation" = true
 WHERE coalesce("notes", '') ILIKE '%Partial Khata Payment:%' AND "paymentStatus" <> 'PAID';
END IF; END $$;

CREATE TABLE IF NOT EXISTS "NuvoraMoneyState" (
 "businessId" text PRIMARY KEY REFERENCES "AiBusiness"(id) ON DELETE CASCADE,
 "openedAt" timestamptz NOT NULL DEFAULT clock_timestamp(), "supplierReviewComplete" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS "NuvoraMoneyEvent" (
 id text PRIMARY KEY, "businessId" text NOT NULL REFERENCES "AiBusiness"(id) ON DELETE CASCADE,
 "requestKey" text NOT NULL, "payloadHash" text NOT NULL, kind text NOT NULL,
 "moneyMinor" bigint NOT NULL DEFAULT 0, account text NOT NULL CHECK (account IN ('CASH','BANK')),
 "counterparty" text, "referenceId" text, "occurredAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
 result jsonb NOT NULL DEFAULT '{}', UNIQUE("businessId", "requestKey")
);
CREATE INDEX IF NOT EXISTS "NuvoraMoneyEvent_business_date" ON "NuvoraMoneyEvent"("businessId", "occurredAt");
CREATE TABLE IF NOT EXISTS "NuvoraSupplierBill" (
 id text PRIMARY KEY, "businessId" text NOT NULL REFERENCES "AiBusiness"(id) ON DELETE CASCADE,
 "supplierId" text NOT NULL REFERENCES "Supplier"(id), "amountMinor" bigint NOT NULL CHECK ("amountMinor" > 0),
 "paidMinor" bigint NOT NULL DEFAULT 0 CHECK ("paidMinor" >= 0 AND "paidMinor" <= "amountMinor"),
 "reference" text, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "NuvoraSupplierBill_reference" ON "NuvoraSupplierBill"("businessId","supplierId",reference) WHERE reference IS NOT NULL AND reference<>'';
CREATE INDEX IF NOT EXISTS "NuvoraSupplierBill_business" ON "NuvoraSupplierBill"("businessId", "supplierId");
CREATE TABLE IF NOT EXISTS "NuvoraCommerceRequest" (
 "businessId" text NOT NULL, "requestKey" text NOT NULL, "payloadHash" text NOT NULL,
 "orderId" text NOT NULL REFERENCES "GptformCommerceOrder"(id), PRIMARY KEY("businessId", "requestKey")
);
CREATE TABLE IF NOT EXISTS "NuvoraStockRequest" (
 "businessId" text NOT NULL, "requestKey" text NOT NULL, "payloadHash" text NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY("businessId","requestKey")
);
ALTER TABLE "NuvoraStockRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NuvoraCommerceRequest" ADD COLUMN IF NOT EXISTS "promotionId" text;
ALTER TABLE "NuvoraCommerceRequest" ADD COLUMN IF NOT EXISTS "customerKey" text;
ALTER TABLE "NuvoraMoneyState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NuvoraMoneyEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NuvoraSupplierBill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NuvoraCommerceRequest" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION nuvora_invoice_total(p_id text) RETURNS numeric LANGUAGE sql STABLE SET search_path=public AS $$
 WITH gross AS (SELECT i.id,i."discountType",i."discountValue",round(coalesce(sum(l.qty::numeric*l."unitPrice"::numeric),0),2)+round(coalesce(sum(l.qty::numeric*l."unitPrice"::numeric),0)*i."taxRate"::numeric/100,2) total FROM "AiInvoice" i LEFT JOIN "AiInvoiceItem" l ON l."invoiceId"=i.id WHERE i.id=p_id GROUP BY i.id,i."discountType",i."discountValue",i."taxRate")
 SELECT greatest(total-CASE WHEN "discountType"='PERCENT' THEN round(total*"discountValue"::numeric/100,2) ELSE least(round("discountValue"::numeric,2),total) END,0) FROM gross
$$;
REVOKE ALL ON FUNCTION nuvora_invoice_total(text) FROM PUBLIC;

-- Receipts from every producer must preserve the same invoice/accounting invariants.
CREATE OR REPLACE FUNCTION nuvora_guard_invoice_payment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE invoice "AiInvoice"%ROWTYPE; due numeric;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'RECEIPT_CORRECTION_REQUIRED'; END IF;
 SELECT * INTO invoice FROM "AiInvoice" WHERE id=NEW."invoiceId" FOR UPDATE;
 IF NOT FOUND OR invoice.status='CANCELLED' THEN RAISE EXCEPTION 'INVOICE_NOT_PAYABLE'; END IF;
 SELECT nuvora_invoice_total(invoice.id)-coalesce(sum(amount),0) INTO due FROM "AiPayment" WHERE "invoiceId"=invoice.id;
 IF NEW.amount<=0 OR NEW.amount::numeric<>round(NEW.amount::numeric,2) THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 IF NEW.amount::numeric>round(due,2) THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUES'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION nuvora_guard_invoice_payment() FROM PUBLIC;
DROP TRIGGER IF EXISTS nuvora_guard_invoice_payment ON "AiPayment";
CREATE TRIGGER nuvora_guard_invoice_payment BEFORE INSERT OR UPDATE OR DELETE ON "AiPayment" FOR EACH ROW EXECUTE FUNCTION nuvora_guard_invoice_payment();
CREATE OR REPLACE FUNCTION nuvora_guard_invoice_edit() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE invoice_id text;
BEGIN
 IF TG_TABLE_NAME='AiInvoiceItem' THEN
  IF TG_OP='UPDATE' AND OLD."invoiceId" IS DISTINCT FROM NEW."invoiceId" AND EXISTS(SELECT 1 FROM "AiPayment" WHERE "invoiceId"=OLD."invoiceId") THEN RAISE EXCEPTION 'RECEIPT_CORRECTION_REQUIRED'; END IF;
  invoice_id:=CASE WHEN TG_OP='DELETE' THEN OLD."invoiceId" ELSE NEW."invoiceId" END;
  PERFORM 1 FROM "AiInvoice" WHERE id=invoice_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM "AiPayment" WHERE "invoiceId"=invoice_id) THEN RAISE EXCEPTION 'RECEIPT_CORRECTION_REQUIRED'; END IF;
 ELSE
  invoice_id:=OLD.id;
  IF EXISTS(SELECT 1 FROM "AiPayment" WHERE "invoiceId"=invoice_id) AND (TG_OP='DELETE' OR NEW."discountType" IS DISTINCT FROM OLD."discountType" OR NEW."discountValue" IS DISTINCT FROM OLD."discountValue" OR NEW."taxRate" IS DISTINCT FROM OLD."taxRate" OR NEW.status IN ('UNPAID','CANCELLED')) THEN RAISE EXCEPTION 'RECEIPT_CORRECTION_REQUIRED'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION nuvora_guard_invoice_edit() FROM PUBLIC;
DROP TRIGGER IF EXISTS nuvora_guard_invoice_items ON "AiInvoiceItem";
CREATE TRIGGER nuvora_guard_invoice_items BEFORE INSERT OR UPDATE OR DELETE ON "AiInvoiceItem" FOR EACH ROW EXECUTE FUNCTION nuvora_guard_invoice_edit();
DROP TRIGGER IF EXISTS nuvora_guard_invoice_edit ON "AiInvoice";
CREATE TRIGGER nuvora_guard_invoice_edit BEFORE UPDATE OR DELETE ON "AiInvoice" FOR EACH ROW EXECUTE FUNCTION nuvora_guard_invoice_edit();

CREATE OR REPLACE FUNCTION nuvora_edit_invoice(p_business_id text,p_id text,p_body jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE invoice "AiInvoice"%ROWTYPE; item jsonb; i integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id,0));
 SELECT * INTO invoice FROM "AiInvoice" WHERE id=p_id AND "businessId"=p_business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_NOT_PAYABLE'; END IF;
 IF EXISTS(SELECT 1 FROM "AiPayment" WHERE "invoiceId"=p_id) AND (p_body ? 'items' OR p_body ? 'taxRate' OR p_body ? 'discountType' OR p_body ? 'discountValue' OR p_body->>'status' IN ('DRAFT','UNPAID')) THEN RAISE EXCEPTION 'RECEIPT_CORRECTION_REQUIRED'; END IF;
 IF p_body->>'status'='PAID' OR (p_body->>'status'='PARTIALLY_PAID' AND invoice.status<>'PARTIALLY_PAID') THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;
 IF p_body ? 'customerId' AND NOT EXISTS(SELECT 1 FROM "AiCustomer" WHERE id=p_body->>'customerId' AND "businessId"=p_business_id) THEN RAISE EXCEPTION 'CUSTOMER_NOT_FOUND'; END IF;
 UPDATE "AiInvoice" SET number=coalesce(p_body->>'number',number),"customerId"=coalesce(p_body->>'customerId',"customerId"),
 status=CASE WHEN p_body->>'status'='UNPAID' THEN 'DRAFT' ELSE coalesce(p_body->>'status',status) END,
 "dueDate"=CASE WHEN p_body ? 'dueDate' THEN (p_body->>'dueDate')::timestamp ELSE "dueDate" END,
 notes=CASE WHEN p_body ? 'notes' THEN p_body->>'notes' ELSE notes END,
 "discountValue"=coalesce((p_body->>'discountValue')::double precision,"discountValue"),"discountType"=coalesce(p_body->>'discountType',"discountType"),
 "taxRate"=coalesce((p_body->>'taxRate')::double precision,"taxRate"),"pdfTemplate"=coalesce(p_body->>'pdfTemplate',"pdfTemplate"),"updatedAt"=now() WHERE id=p_id;
 IF p_body ? 'items' THEN
  DELETE FROM "AiInvoiceItem" WHERE "invoiceId"=p_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_body->'items') LOOP
   INSERT INTO "AiInvoiceItem"(id,"invoiceId",description,qty,"unitPrice","hsnCode") VALUES(md5(p_id||clock_timestamp()::text||i::text),p_id,item->>'description',(item->>'qty')::double precision,(item->>'unitPrice')::double precision,item->>'hsnCode');
   i:=i+1;
  END LOOP;
 END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION nuvora_edit_invoice(text,text,jsonb) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION nuvora_edit_invoice(text,text,jsonb) TO service_role;END IF;END $$;

CREATE OR REPLACE FUNCTION nuvora_finance_command(p_business_id text, p_key text, p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE b "AiBusiness"%ROWTYPE; old "NuvoraMoneyEvent"%ROWTYPE; o "GptformCommerceOrder"%ROWTYPE;
 invoice "AiInvoice"%ROWTYPE; invoice_due numeric; bill "NuvoraSupplierBill"%ROWTYPE; amount bigint; remaining bigint; allocated bigint; movement bigint := 0;
 kind text := p_command->>'kind'; account text := coalesce(p_command->>'account','CASH'); result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id, 0));
 SELECT * INTO b FROM "AiBusiness" WHERE id = p_business_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_NOT_FOUND'; END IF;
 IF length(p_key) < 8 OR length(p_key) > 128 THEN RAISE EXCEPTION 'INVALID_REQUEST_KEY'; END IF;
 SELECT * INTO old FROM "NuvoraMoneyEvent" WHERE "businessId" = p_business_id AND "requestKey" = p_key;
 IF FOUND THEN
  IF old."payloadHash" <> md5(p_command::text) THEN RAISE EXCEPTION 'REQUEST_KEY_CONFLICT'; END IF;
  RETURN old.result;
 END IF;
 amount := (p_command->>'amountMinor')::bigint;
 IF amount IS NULL OR abs(amount) > 9000000000000 OR account NOT IN ('CASH','BANK') THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 IF kind NOT IN ('OPENING','RECONCILE_ORDER','SUPPLIER_REVIEW') AND amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 IF kind='RECONCILE_ORDER' AND amount<0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 IF kind = 'OPENING' THEN
  IF EXISTS(SELECT 1 FROM "NuvoraMoneyState" WHERE "businessId" = p_business_id) THEN RAISE EXCEPTION 'OPENING_ALREADY_SET'; END IF;
  INSERT INTO "NuvoraMoneyState"("businessId","supplierReviewComplete") VALUES(p_business_id, coalesce((p_command->>'supplierReviewComplete')::boolean,false));
  movement := amount;
 ELSIF kind='SUPPLIER_REVIEW' THEN
  IF NOT coalesce((p_command->>'supplierReviewComplete')::boolean,false) OR amount<>0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  UPDATE "NuvoraMoneyState" SET "supplierReviewComplete"=true WHERE "businessId"=p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPENING_REQUIRED'; END IF;
 ELSIF kind = 'CREDIT_SALE'  THEN
  IF coalesce(p_command->>'customerPhone','')='' THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED'; END IF;
  INSERT INTO "GptformCommerceOrder"(id,"configId","businessId","customerPhone","customerName",status,"itemsJson",total,"deliveryType",notes,"paymentStatus","paymentMethod","paidAmount","createdAt","updatedAt")
   SELECT md5(p_business_id||p_key),c.id,b.id,p_command->>'customerPhone',p_command->>'customerName','CONFIRMED',
    jsonb_build_array(jsonb_build_object('name',coalesce(p_command->>'reference','Credit bill'),'qty',1,'price',amount/100.0,'amount',amount/100.0))::text,amount/100.0,'pickup','Unitemized credit bill','UNPAID','CREDIT',0,now(),now()
   FROM "GptformCommerceConfig" c WHERE c."businessId" IN (b.id,b."tenantId") ORDER BY CASE WHEN c."businessId"=b.id THEN 0 ELSE 1 END LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
 ELSIF kind = 'COLLECTION' THEN
  IF coalesce(p_command->>'customerPhone','') = '' THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND "customerPhone"=p_command->>'customerPhone' AND "needsReconciliation") THEN RAISE EXCEPTION 'RECONCILIATION_REQUIRED'; END IF;
  remaining := amount;
  FOR o IN SELECT * FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND "customerPhone"=p_command->>'customerPhone'
   AND status NOT IN ('CANCELLED','PENDING') AND "paymentStatus" <> 'REFUNDED' AND "paidAmount" < total ORDER BY "createdAt", id FOR UPDATE LOOP
   allocated := least(remaining, round((o.total-o."paidAmount")::numeric*100)::bigint);
   UPDATE "GptformCommerceOrder" SET "paidAmount"="paidAmount"+allocated/100.0,
    "paymentStatus"=CASE WHEN "paidAmount"+allocated/100.0 >= total THEN 'PAID' ELSE 'PARTIAL' END,
    "paymentMethod"=account, "updatedAt"=now() WHERE id=o.id;
   remaining := remaining-allocated; EXIT WHEN remaining=0;
  END LOOP;
  IF remaining<>0 THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUES'; END IF;
  movement := amount;
 ELSIF kind = 'SUPPLIER_BILL' THEN
  IF NOT EXISTS(SELECT 1 FROM "Supplier" WHERE id=p_command->>'supplierId' AND "tenantId"=coalesce(b."tenantId",b.id)) THEN RAISE EXCEPTION 'SUPPLIER_NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM "NuvoraSupplierBill" WHERE "businessId"=p_business_id AND "supplierId"=p_command->>'supplierId' AND reference=p_command->>'reference' AND reference<>'') THEN RAISE EXCEPTION 'DUPLICATE_SUPPLIER_BILL'; END IF;
  INSERT INTO "NuvoraSupplierBill"(id,"businessId","supplierId","amountMinor",reference)
   VALUES(md5(p_business_id||p_key),p_business_id,p_command->>'supplierId',amount,p_command->>'reference');
 ELSIF kind = 'SUPPLIER_PAYMENT' THEN
  remaining := amount;
  FOR bill IN SELECT * FROM "NuvoraSupplierBill" WHERE "businessId"=p_business_id AND "supplierId"=p_command->>'supplierId'
   AND "paidMinor"<"amountMinor" ORDER BY "createdAt",id FOR UPDATE LOOP
   allocated := least(remaining,bill."amountMinor"-bill."paidMinor");
   UPDATE "NuvoraSupplierBill" SET "paidMinor"="paidMinor"+allocated WHERE id=bill.id;
   remaining:=remaining-allocated; EXIT WHEN remaining=0;
  END LOOP;
  IF remaining<>0 THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUES'; END IF;
  movement := -amount;
 ELSIF kind = 'EXPENSE' THEN
  movement := -amount;
  INSERT INTO "Expense"(id,number,"tenantId",amount,currency,category,"paymentMethod",description,"expenseDate",status,"createdAt","updatedAt")
   VALUES(md5(p_business_id||p_key),'EXP-'||md5(p_business_id||p_key),coalesce(b."tenantId",b.id),amount/100.0,b.currency,
    coalesce(p_command->>'category','General'),account,coalesce(p_command->>'reference','Shop expense'),now(),'approved',now(),now());
 ELSIF kind = 'MONEY_IN' THEN movement := amount;
 ELSIF kind = 'INVOICE_PAYMENT' THEN
  SELECT * INTO invoice FROM "AiInvoice" WHERE id=p_command->>'invoiceId' AND "businessId"=p_business_id FOR UPDATE;
  IF NOT FOUND OR invoice.status='CANCELLED' THEN RAISE EXCEPTION 'INVOICE_NOT_PAYABLE'; END IF;
  SELECT nuvora_invoice_total(invoice.id)-coalesce(sum(payment.amount),0) INTO invoice_due FROM "AiPayment" payment WHERE payment."invoiceId"=invoice.id;
  IF amount>round(invoice_due*100)::bigint THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUES'; END IF;
  INSERT INTO "AiPayment"(id,"invoiceId",amount,method,"paidAt") VALUES(md5(p_business_id||p_key),invoice.id,amount/100.0,account,now());
  UPDATE "AiInvoice" SET status=CASE WHEN amount>=round(invoice_due*100)::bigint THEN 'PAID' ELSE 'PARTIALLY_PAID' END,"updatedAt"=now() WHERE id=invoice.id;
 ELSIF kind = 'ORDER_PAYMENT' THEN
  SELECT * INTO o FROM "GptformCommerceOrder" WHERE id=p_command->>'orderId' AND "businessId"=p_business_id FOR UPDATE;
  IF NOT FOUND OR o.status='CANCELLED' OR o."paymentStatus"='REFUNDED' THEN RAISE EXCEPTION 'ORDER_NOT_PAYABLE'; END IF;
  IF o."needsReconciliation" THEN RAISE EXCEPTION 'RECONCILIATION_REQUIRED'; END IF;
  IF amount > round((o.total-o."paidAmount")::numeric*100)::bigint THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUES'; END IF;
  UPDATE "GptformCommerceOrder" SET "paidAmount"="paidAmount"+amount/100.0,
   "paymentStatus"=CASE WHEN "paidAmount"+amount/100.0 >= total THEN 'PAID' ELSE 'PARTIAL' END,
   "paymentMethod"=account,"updatedAt"=now() WHERE id=o.id;
  movement:=amount;
 ELSIF kind = 'RECONCILE_ORDER' THEN
  SELECT * INTO o FROM "GptformCommerceOrder" WHERE id=p_command->>'orderId' AND "businessId"=p_business_id FOR UPDATE;
  IF NOT FOUND OR NOT o."needsReconciliation" OR amount > round(o.total::numeric*100)::bigint THEN RAISE EXCEPTION 'INVALID_RECONCILIATION'; END IF;
  UPDATE "GptformCommerceOrder" SET "paidAmount"=amount/100.0,"needsReconciliation"=false,
   "paymentStatus"=CASE WHEN amount/100.0 >= total THEN 'PAID' ELSE 'PARTIAL' END,"updatedAt"=now() WHERE id=o.id;
 ELSE RAISE EXCEPTION 'INVALID_MONEY_ACTION'; END IF;
 result := jsonb_build_object('success',true,'kind',kind,'amount',amount/100.0);
 INSERT INTO "NuvoraMoneyEvent"(id,"businessId","requestKey","payloadHash",kind,"moneyMinor",account,counterparty,"referenceId",result)
 VALUES(md5(p_business_id||p_key),p_business_id,p_key,md5(p_command::text),kind,movement,account,
  coalesce(p_command->>'customerPhone',p_command->>'supplierId'),p_command->>'orderId',result);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION nuvora_stock_alert(p_id text) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE i "InventoryItem"%ROWTYPE; alert_id text;
BEGIN
 SELECT * INTO i FROM "InventoryItem" WHERE id=p_id;
 IF i."reorderLevel">0 AND i."availableStock"<=i."reorderLevel" THEN
  SELECT id INTO alert_id FROM "LowStockAlert" WHERE "inventoryItemId"=i.id AND status IN ('active','acknowledged') ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN UPDATE "LowStockAlert" SET "currentStock"=i."availableStock","reorderLevel"=i."reorderLevel",status='active',"resolvedAt"=NULL WHERE id=alert_id;
  ELSE INSERT INTO "LowStockAlert"(id,"tenantId","inventoryItemId","currentStock","reorderLevel",status,"createdAt") VALUES(md5(i.id||clock_timestamp()::text),i."tenantId",i.id,i."availableStock",i."reorderLevel",'active',now()); END IF;
 ELSE UPDATE "LowStockAlert" SET status='resolved',"resolvedAt"=now() WHERE "inventoryItemId"=i.id AND status IN ('active','acknowledged'); END IF;
END $$;
REVOKE ALL ON FUNCTION nuvora_stock_alert(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION nuvora_adjust_stock(p_business_id text,p_key text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE b "AiBusiness"%ROWTYPE; i "InventoryItem"%ROWTYPE; c "GptformCommerceConfig"%ROWTYPE;
 product jsonb; previous "NuvoraStockRequest"%ROWTYPE; next_stock integer; old_stock integer; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id,0));
 IF length(p_key)<8 OR length(p_key)>128 THEN RAISE EXCEPTION 'INVALID_REQUEST_KEY'; END IF;
 SELECT * INTO previous FROM "NuvoraStockRequest" WHERE "businessId"=p_business_id AND "requestKey"=p_key;
 IF FOUND THEN IF previous."payloadHash"<>md5(p_payload::text) THEN RAISE EXCEPTION 'REQUEST_KEY_CONFLICT'; END IF;RETURN previous.result; END IF;
 SELECT * INTO b FROM "AiBusiness" WHERE id=p_business_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_NOT_FOUND'; END IF;
 SELECT * INTO i FROM "InventoryItem" WHERE "tenantId"=coalesce(b."tenantId",b.id) AND (id=p_payload->>'productId' OR sku=p_payload->>'productId' OR sku='CAT-'||(p_payload->>'productId') OR sku=coalesce(b."tenantId",b.id)||':'||(p_payload->>'productId')) FOR UPDATE;
 IF NOT FOUND THEN
  SELECT * INTO c FROM "GptformCommerceConfig" WHERE "businessId" IN (b.id,b."tenantId") ORDER BY CASE WHEN "businessId"=b.id THEN 0 ELSE 1 END LIMIT 1 FOR UPDATE;
  SELECT value INTO product FROM jsonb_array_elements(c."catalogJson"::jsonb) WHERE value->>'id'=p_payload->>'productId';
  IF product IS NULL THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
  INSERT INTO "InventoryItem"(id,"tenantId",sku,name,"salePrice","costPrice",currency,"totalStock","availableStock","reservedStock","reorderLevel","reorderQty","unit",category,"isActive","isSellableOnline","metadataJson","createdAt","updatedAt")
   VALUES(md5(coalesce(b."tenantId",b.id)||(p_payload->>'productId')),coalesce(b."tenantId",b.id),coalesce(b."tenantId",b.id)||':'||(p_payload->>'productId'),product->>'name',(product->>'price')::double precision,0,b.currency,0,0,0,0,0,'each',coalesce(product->>'category','General'),true,true,'{}',now(),now()) RETURNING * INTO i;
 END IF;
 old_stock:=i."totalStock";
 next_stock:=CASE WHEN p_payload ? 'newStock' THEN (p_payload->>'newStock')::integer ELSE i."totalStock"+coalesce((p_payload->>'deltaStock')::integer,0) END;
 IF next_stock<0 OR next_stock<i."reservedStock" THEN RAISE EXCEPTION 'STOCK_UNAVAILABLE'; END IF;
 UPDATE "InventoryItem" SET "totalStock"=next_stock,"availableStock"=next_stock-"reservedStock","reorderLevel"=coalesce((p_payload->>'minStock')::integer,"reorderLevel"),"updatedAt"=now() WHERE id=i.id RETURNING * INTO i;
 INSERT INTO "StockTransaction"(id,"tenantId","inventoryItemId",type,direction,quantity,"unitCost","totalCost",reference,"referenceId","createdAt")
  VALUES(md5(p_business_id||p_key),coalesce(b."tenantId",b.id),i.id,'adjustment',CASE WHEN next_stock>=old_stock THEN 'in' ELSE 'out' END,abs(next_stock-old_stock),i."costPrice",abs(next_stock-old_stock)*i."costPrice",'stock_adjustment',p_key,now());
 PERFORM nuvora_stock_alert(i.id);
 result:=jsonb_build_object('success',true,'item',to_jsonb(i));
 INSERT INTO "NuvoraStockRequest" VALUES(b.id,p_key,md5(p_payload::text),result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION nuvora_adjust_stock(text,text,jsonb) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
 GRANT ALL ON "NuvoraStockRequest" TO service_role;
 GRANT EXECUTE ON FUNCTION nuvora_adjust_stock(text,text,jsonb),nuvora_stock_alert(text) TO service_role;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "NuvoraCatalogStockMovement" (
 "orderId" text REFERENCES "GptformCommerceOrder"(id) DEFERRABLE INITIALLY DEFERRED,
 "productId" text NOT NULL, quantity integer NOT NULL, PRIMARY KEY("orderId","productId")
);
ALTER TABLE "NuvoraCatalogStockMovement" ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION nuvora_update_order(p_business_id text,p_id text,p_body jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE o "GptformCommerceOrder"%ROWTYPE; next_status text; amount bigint; method text; transaction "StockTransaction"%ROWTYPE; c "GptformCommerceConfig"%ROWTYPE; movement "NuvoraCatalogStockMovement"%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id,0));
 SELECT * INTO o FROM "GptformCommerceOrder" WHERE id=p_id AND "businessId"=p_business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 next_status:=coalesce(p_body->>'status',o.status);
 IF next_status NOT IN ('PENDING','CONFIRMED','PREPARING','READY','DELIVERED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_ORDER_STATUS'; END IF;
 IF next_status<>o.status AND NOT (
  (o.status='PENDING' AND next_status IN ('CONFIRMED','CANCELLED')) OR
  (o.status='CONFIRMED' AND next_status IN ('PREPARING','READY','DELIVERED','CANCELLED')) OR
  (o.status='PREPARING' AND next_status IN ('READY','CANCELLED')) OR
  (o.status='READY' AND next_status IN ('DELIVERED','CANCELLED'))
 ) THEN RAISE EXCEPTION 'INVALID_ORDER_TRANSITION'; END IF;
 IF p_body ? 'paymentStatus' AND p_body->>'paymentStatus'<>'PAID' THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;
 IF next_status='CANCELLED' AND o.status<>'CANCELLED' THEN
  IF o."paidAmount">0 OR o."needsReconciliation" OR o."paymentStatus"='PAID' THEN RAISE EXCEPTION 'PAYMENT_REFUND_REQUIRED'; END IF;
  IF p_body->>'paymentStatus'='PAID' THEN RAISE EXCEPTION 'ORDER_NOT_PAYABLE'; END IF;
  IF NOT EXISTS(SELECT 1 FROM "NuvoraCommerceRequest" WHERE "orderId"=o.id) THEN RAISE EXCEPTION 'CANCELLATION_REVIEW_REQUIRED'; END IF;
  FOR transaction IN SELECT * FROM "StockTransaction" WHERE "referenceId"=o.id AND reference='store_order' AND direction='out' LOOP
   UPDATE "InventoryItem" SET "totalStock"="totalStock"+transaction.quantity,"availableStock"="availableStock"+transaction.quantity,"updatedAt"=now() WHERE id=transaction."inventoryItemId";
   INSERT INTO "StockTransaction"(id,"tenantId","inventoryItemId",type,direction,quantity,"unitCost","totalCost",reference,"referenceId","createdAt")
    VALUES(md5(transaction.id||'cancel'),transaction."tenantId",transaction."inventoryItemId",'return','in',transaction.quantity,transaction."unitCost",transaction."totalCost",'cancelled_order',o.id,now());
   PERFORM nuvora_stock_alert(transaction."inventoryItemId");
  END LOOP;
  SELECT * INTO c FROM "GptformCommerceConfig" WHERE id=o."configId" FOR UPDATE;
  FOR movement IN SELECT * FROM "NuvoraCatalogStockMovement" WHERE "orderId"=o.id LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c."catalogJson"::jsonb) WHERE value->>'id'=movement."productId" AND value ? 'stock') THEN RAISE EXCEPTION 'CANCELLATION_REVIEW_REQUIRED'; END IF;
   c."catalogJson":=(SELECT jsonb_agg(CASE WHEN value->>'id'=movement."productId" THEN jsonb_set(value,'{stock}',to_jsonb((value->>'stock')::integer+movement.quantity)) ELSE value END)::text FROM jsonb_array_elements(c."catalogJson"::jsonb));
  END LOOP;
  UPDATE "GptformCommerceConfig" SET "catalogJson"=c."catalogJson","updatedAt"=now() WHERE id=c.id;
  UPDATE "NuvoraCommerceOutbox" SET status='cancelled',"leaseToken"=NULL WHERE "orderId"=o.id AND status<>'delivered';
 END IF;
 IF p_body->>'paymentStatus'='PAID' AND o."paymentStatus"<>'PAID' THEN
  IF next_status='CANCELLED' THEN RAISE EXCEPTION 'ORDER_NOT_PAYABLE'; END IF;
  amount:=round((o.total-o."paidAmount")::numeric*100)::bigint;
  method:=coalesce(p_body->>'paymentMethod',o."paymentMethod",'CASH');
  IF amount>0 THEN PERFORM nuvora_finance_command(p_business_id,'settle:'||o.id,jsonb_build_object('kind','ORDER_PAYMENT','orderId',o.id,'amountMinor',amount,'account',CASE WHEN method='CASH' THEN 'CASH' ELSE 'BANK' END)); END IF;
 END IF;
 UPDATE "GptformCommerceOrder" SET status=next_status,
 "paymentRef"=CASE WHEN p_body ? 'paymentRef' THEN p_body->>'paymentRef' ELSE "paymentRef" END,
 "paymentMethod"=CASE WHEN p_body ? 'paymentMethod' THEN p_body->>'paymentMethod' ELSE "paymentMethod" END,
 "customerName"=CASE WHEN p_body ? 'customerName' THEN p_body->>'customerName' ELSE "customerName" END,
 "deliveryAddress"=CASE WHEN p_body ? 'deliveryAddress' THEN p_body->>'deliveryAddress' ELSE "deliveryAddress" END,
 notes=CASE WHEN p_body ? 'notes' THEN p_body->>'notes' ELSE notes END,"updatedAt"=now() WHERE id=o.id RETURNING * INTO o;
 RETURN jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('items',o."itemsJson"::jsonb));
END $$;
REVOKE ALL ON FUNCTION nuvora_update_order(text,text,jsonb) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
 GRANT ALL ON "NuvoraCatalogStockMovement" TO service_role;
 GRANT EXECUTE ON FUNCTION nuvora_update_order(text,text,jsonb) TO service_role;
END IF; END $$;

CREATE OR REPLACE FUNCTION nuvora_create_order(p_business_id text,p_key text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE b "AiBusiness"%ROWTYPE; c "GptformCommerceConfig"%ROWTYPE; old "NuvoraCommerceRequest"%ROWTYPE;
 o "GptformCommerceOrder"%ROWTYPE; stock "InventoryItem"%ROWTYPE; promo "Promotion"%ROWTYPE;
 item jsonb; qty integer; new_id text := md5(p_business_id||p_key); paid double precision; total double precision;
 catalog jsonb; product jsonb; public_order boolean := coalesce((p_payload->>'publicOrder')::boolean,false);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id,0));
 IF length(p_key)<8 OR length(p_key)>128 THEN RAISE EXCEPTION 'INVALID_REQUEST_KEY'; END IF;
 SELECT * INTO old FROM "NuvoraCommerceRequest" WHERE "businessId"=p_business_id AND "requestKey"=p_key;
 IF FOUND THEN
  IF old."payloadHash"<>p_payload->>'clientHash' THEN RAISE EXCEPTION 'REQUEST_KEY_CONFLICT'; END IF;
  SELECT * INTO o FROM "GptformCommerceOrder" WHERE id=old."orderId";
  RETURN jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('items',o."itemsJson"::jsonb),'replayed',true);
 END IF;
 SELECT * INTO b FROM "AiBusiness" WHERE id=p_business_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_NOT_FOUND'; END IF;
 SELECT * INTO c FROM "GptformCommerceConfig" WHERE id=p_payload->>'configId' AND "businessId" IN (b.id,b."tenantId") FOR UPDATE;
 IF NOT FOUND OR (public_order AND NOT c."isActive") THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
 IF md5(c."catalogJson"||c."fieldsJson")<>p_payload->>'catalogHash' THEN RAISE EXCEPTION 'CATALOG_CHANGED'; END IF;
 total:=(p_payload->>'totalMinor')::bigint/100.0;
 IF total IS NULL OR total<0 OR total>90000000000 OR jsonb_array_length(p_payload->'items')<1 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 IF p_payload->>'promotionId' IS NOT NULL THEN
  SELECT * INTO promo FROM "Promotion" WHERE id=p_payload->>'promotionId' AND "tenantId"=coalesce(b."tenantId",b.id) FOR UPDATE;
  IF NOT FOUND OR NOT promo."isActive" OR promo."startDate">now() OR (promo."endDate" IS NOT NULL AND promo."endDate"<now())
   OR (promo."usageLimit" IS NOT NULL AND promo."usedCount">=promo."usageLimit") THEN RAISE EXCEPTION 'PROMOTION_UNAVAILABLE'; END IF;
  IF jsonb_build_object('type',promo.type,'value',promo.value,'minSpend',promo."minSpend",'maxDiscount',promo."maxDiscount") IS DISTINCT FROM p_payload->'promotionQuote' THEN RAISE EXCEPTION 'PROMOTION_UNAVAILABLE'; END IF;
  IF promo."perCustomerLimit">0 AND (SELECT count(*) FROM "NuvoraCommerceRequest" WHERE "promotionId"=promo.id AND "customerKey"=p_payload->>'customerPhone')>=promo."perCustomerLimit" THEN RAISE EXCEPTION 'PROMOTION_UNAVAILABLE'; END IF;
  UPDATE "Promotion" SET "usedCount"="usedCount"+1,"updatedAt"=now() WHERE id=promo.id;
 END IF;
 catalog:=c."catalogJson"::jsonb;
 FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
  qty:=(item->>'qty')::integer;
  IF qty<1 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT value INTO product FROM jsonb_array_elements(catalog) WHERE value->>'id'=item->>'productId';
  IF product IS NULL OR (product->>'isActive')='false' OR (product->>'price')::numeric<>(item->>'price')::numeric THEN RAISE EXCEPTION 'CATALOG_CHANGED'; END IF;
  SELECT * INTO stock FROM "InventoryItem" WHERE "tenantId"=coalesce(b."tenantId",b.id)
   AND (id=item->>'productId' OR sku=item->>'productId' OR (product->>'sku' IS NOT NULL AND sku=product->>'sku') OR sku='CAT-'||(item->>'productId') OR sku=coalesce(b."tenantId",b.id)||':'||(item->>'productId')) FOR UPDATE;
  IF FOUND THEN
   IF NOT stock."isActive" OR stock."availableStock"<qty THEN RAISE EXCEPTION 'STOCK_UNAVAILABLE'; END IF;
   UPDATE "InventoryItem" SET "totalStock"="totalStock"-qty,"availableStock"="availableStock"-qty,"updatedAt"=now() WHERE id=stock.id;
   PERFORM nuvora_stock_alert(stock.id);
   INSERT INTO "StockTransaction"(id,"tenantId","inventoryItemId",type,direction,quantity,"unitCost","totalCost",reference,"referenceId","createdAt")
    VALUES(md5(new_id||stock.id||item::text),coalesce(b."tenantId",b.id),stock.id,'sale','out',qty,stock."costPrice",qty*stock."costPrice",'store_order',new_id,now());
  ELSIF product ? 'stock' THEN
   INSERT INTO "NuvoraCatalogStockMovement"("orderId","productId",quantity) VALUES(new_id,item->>'productId',qty) ON CONFLICT("orderId","productId") DO UPDATE SET quantity="NuvoraCatalogStockMovement".quantity+excluded.quantity;
   IF (product->>'stock')::numeric<qty THEN RAISE EXCEPTION 'STOCK_UNAVAILABLE'; END IF;
   catalog:=(SELECT jsonb_agg(CASE WHEN value->>'id'=item->>'productId' THEN jsonb_set(value,'{stock}',to_jsonb((value->>'stock')::integer-qty)) ELSE value END) FROM jsonb_array_elements(catalog));
  END IF;
 END LOOP;
 IF catalog IS DISTINCT FROM c."catalogJson"::jsonb THEN
  UPDATE "GptformCommerceConfig" SET "catalogJson"=catalog::text,"updatedAt"=now() WHERE id=c.id;
 END IF;
 paid:=CASE WHEN NOT public_order AND p_payload->>'paymentStatus'='PAID' THEN total ELSE 0 END;
 INSERT INTO "GptformCommerceOrder"(id,"configId","businessId","customerPhone","customerName",status,"itemsJson",total,"deliveryAddress","deliveryType",notes,"paymentStatus","paymentMethod","paidAmount","createdAt","updatedAt")
 VALUES(new_id,c.id,b.id,coalesce(p_payload->>'customerPhone',''),p_payload->>'customerName',CASE WHEN public_order THEN 'PENDING' ELSE 'CONFIRMED' END,
  (p_payload->'items')::text,total,p_payload->>'deliveryAddress',p_payload->>'deliveryType',p_payload->>'notes',CASE WHEN paid>0 THEN 'PAID' ELSE 'UNPAID' END,p_payload->>'paymentMethod',paid,now(),now()) RETURNING * INTO o;
 INSERT INTO "NuvoraCommerceRequest"("businessId","requestKey","payloadHash","orderId","promotionId","customerKey") VALUES(b.id,p_key,p_payload->>'clientHash',new_id,p_payload->>'promotionId',p_payload->>'customerPhone');
 IF paid>0 THEN INSERT INTO "NuvoraMoneyEvent"(id,"businessId","requestKey","payloadHash",kind,"moneyMinor",account,"referenceId",result)
  VALUES(md5(new_id||'receipt'),b.id,'order:'||new_id,md5(p_payload::text),'SALE_PAYMENT',round(paid::numeric*100)::bigint,CASE WHEN p_payload->>'paymentMethod'='CASH' THEN 'CASH' ELSE 'BANK' END,new_id,'{}'); END IF;
 IF public_order THEN
  INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience) VALUES(md5(new_id||'vendor'),new_id,'vendor');
  IF coalesce((p_payload->>'whatsappConsent')::boolean,false) THEN
   INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience) VALUES(md5(new_id||'customer'),new_id,'customer');
  END IF;
 END IF;
 RETURN jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('items',o."itemsJson"::jsonb),'replayed',false);
END $$;
REVOKE ALL ON FUNCTION nuvora_create_order(text,text,jsonb) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION nuvora_create_order(text,text,jsonb) TO service_role; END IF; END $$;

CREATE OR REPLACE FUNCTION nuvora_invoice_receipt() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE business text;
BEGIN
 SELECT "businessId" INTO business FROM "AiInvoice" WHERE id=NEW."invoiceId";
 IF business IS NOT NULL AND NEW.amount>0 THEN
  INSERT INTO "NuvoraMoneyEvent"(id,"businessId","requestKey","payloadHash",kind,"moneyMinor",account,"referenceId",result)
   VALUES(md5('invoice-payment:'||NEW.id),business,'invoice-payment:'||NEW.id,md5(to_jsonb(NEW)::text),'INVOICE_PAYMENT',round(NEW.amount::numeric*100)::bigint,
    CASE WHEN NEW.method='CASH' THEN 'CASH' ELSE 'BANK' END,NEW.id,'{}') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS nuvora_invoice_receipt ON "AiPayment";
CREATE TRIGGER nuvora_invoice_receipt AFTER INSERT ON "AiPayment" FOR EACH ROW EXECUTE FUNCTION nuvora_invoice_receipt();

CREATE OR REPLACE FUNCTION nuvora_claim_outbox(p_limit integer) RETURNS jsonb LANGUAGE sql SET search_path=public AS $$
 WITH picked AS (SELECT id FROM "NuvoraCommerceOutbox" WHERE attempts<8 AND ((status='pending' AND "availableAt"<=clock_timestamp()) OR (status='processing' AND "leasedAt"<clock_timestamp()-interval '5 minutes')) ORDER BY "availableAt",id LIMIT least(greatest(p_limit,1),50) FOR UPDATE SKIP LOCKED),
 claimed AS (UPDATE "NuvoraCommerceOutbox" o SET status='processing',attempts=attempts+1,"leasedAt"=clock_timestamp(),"leaseToken"=md5(o.id||(o.attempts+1)::text||clock_timestamp()::text) FROM picked WHERE o.id=picked.id RETURNING o.*)
 SELECT coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) FROM claimed
$$;
CREATE OR REPLACE FUNCTION nuvora_ack_outbox(p_id text,p_success text,p_error text,p_lease_token text) RETURNS jsonb LANGUAGE sql SET search_path=public AS $$
 WITH updated AS (UPDATE "NuvoraCommerceOutbox" SET status=CASE WHEN p_success='true' THEN 'delivered' WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,
  "availableAt"=clock_timestamp()+interval '1 minute'*power(2,least(attempts,8)),"lastError"=CASE WHEN p_success='true' THEN NULL ELSE left(p_error,500) END WHERE id=p_id AND status='processing' AND "leaseToken"=p_lease_token RETURNING id)
 SELECT jsonb_build_object('updated',count(*)) FROM updated
$$;
REVOKE ALL ON FUNCTION nuvora_claim_outbox(integer),nuvora_ack_outbox(text,text,text,text) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
 GRANT ALL ON "NuvoraCommerceOutbox" TO service_role;
 GRANT EXECUTE ON FUNCTION nuvora_claim_outbox(integer),nuvora_ack_outbox(text,text,text,text) TO service_role;
END IF; END $$;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION nuvora_finance_snapshot(p_business_id text, p_start timestamptz, p_end timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT jsonb_build_object(
  'initialized', EXISTS(SELECT 1 FROM "NuvoraMoneyState" WHERE "businessId"=p_business_id),
  'moneyIn', coalesce((SELECT sum("moneyMinor")/100.0 FROM "NuvoraMoneyEvent" WHERE "businessId"=p_business_id AND "occurredAt">=p_start AND "occurredAt"<p_end AND "moneyMinor">0 AND kind<>'OPENING'),0),
  'moneyOut', coalesce((SELECT -sum("moneyMinor")/100.0 FROM "NuvoraMoneyEvent" WHERE "businessId"=p_business_id AND "occurredAt">=p_start AND "occurredAt"<p_end AND "moneyMinor"<0 AND kind<>'OPENING'),0),
  'balance', (SELECT coalesce(sum(e."moneyMinor"),0)/100.0 FROM "NuvoraMoneyState" s LEFT JOIN "NuvoraMoneyEvent" e ON e."businessId"=s."businessId" AND e."occurredAt">=s."openedAt" WHERE s."businessId"=p_business_id GROUP BY s."businessId"),
  'toCollect', CASE WHEN EXISTS(SELECT 1 FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND "needsReconciliation") THEN NULL ELSE coalesce((SELECT sum(greatest(total-"paidAmount",0)) FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND status NOT IN ('PENDING','CANCELLED') AND "paymentStatus"<>'REFUNDED'),0)+coalesce((SELECT sum(greatest(nuvora_invoice_total(i.id)-coalesce((SELECT sum(amount) FROM "AiPayment" WHERE "invoiceId"=i.id),0),0)) FROM "AiInvoice" i WHERE i."businessId"=p_business_id AND i.status IN ('SENT','PAID','PARTIALLY_PAID','OVERDUE')),0) END,
  'toPay', CASE WHEN EXISTS(SELECT 1 FROM "NuvoraMoneyState" WHERE "businessId"=p_business_id AND "supplierReviewComplete") THEN coalesce((SELECT sum("amountMinor"-"paidMinor")/100.0 FROM "NuvoraSupplierBill" WHERE "businessId"=p_business_id),0) ELSE NULL END,
  'customers',coalesce((SELECT jsonb_agg(row_to_json(c)) FROM (SELECT "customerPhone" AS phone,max("customerName") AS name,sum(greatest(total-"paidAmount",0)) AS balance,bool_or("needsReconciliation") AS "needsReconciliation",count(*) FILTER(WHERE "paidAmount"<total) AS "unpaidOrdersCount",greatest(extract(day FROM now()-min("createdAt") FILTER(WHERE "paidAmount"<total))::integer,0) AS "daysPending",jsonb_agg(jsonb_build_object('id',id,'total',total,'paidAmount',"paidAmount",'createdAt',"createdAt",'status',status)) FILTER(WHERE "paidAmount"<total) AS "unpaidOrders" FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND "customerPhone"<>'' AND status NOT IN ('PENDING','CANCELLED') AND "paymentStatus"<>'REFUNDED' GROUP BY "customerPhone" HAVING sum(greatest(total-"paidAmount",0))>0) c),'[]'::jsonb),
  'suppliers',coalesce((SELECT jsonb_agg(row_to_json(s)) FROM (SELECT v.id,v.name,coalesce(sum(b."amountMinor"-b."paidMinor"),0)/100.0 AS balance FROM "Supplier" v JOIN "AiBusiness" a ON v."tenantId"=coalesce(a."tenantId",a.id) LEFT JOIN "NuvoraSupplierBill" b ON b."supplierId"=v.id AND b."businessId"=a.id WHERE a.id=p_business_id GROUP BY v.id,v.name) s),'[]'::jsonb),
  'invoices',coalesce((SELECT jsonb_agg(row_to_json(v)) FROM (SELECT i.id,i.number,nuvora_invoice_total(i.id)-coalesce((SELECT sum(amount) FROM "AiPayment" WHERE "invoiceId"=i.id),0) balance FROM "AiInvoice" i WHERE i."businessId"=p_business_id AND i.status IN ('SENT','PAID','PARTIALLY_PAID','OVERDUE') AND nuvora_invoice_total(i.id)>coalesce((SELECT sum(amount) FROM "AiPayment" WHERE "invoiceId"=i.id),0)) v),'[]'::jsonb),
  'reviewOrders',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',"customerName",'total',total)) FROM "GptformCommerceOrder" WHERE "businessId"=p_business_id AND "needsReconciliation"),'[]'::jsonb)
 )
$$;

REVOKE ALL ON FUNCTION nuvora_finance_command(text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION nuvora_finance_snapshot(text,timestamptz,timestamptz) FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT ALL ON "NuvoraMoneyState","NuvoraMoneyEvent","NuvoraSupplierBill","NuvoraCommerceRequest" TO service_role;
  GRANT EXECUTE ON FUNCTION nuvora_finance_command(text,text,jsonb),nuvora_finance_snapshot(text,timestamptz,timestamptz),nuvora_invoice_total(text) TO service_role;
 END IF;
END $$;

INSERT INTO "NuvoraCommerceMigration"(name) VALUES('20261007150000_commerce_consistency') ON CONFLICT DO NOTHING;
