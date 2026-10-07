-- Apply after commerce_consistency, in a transaction. No messages are backfilled.
ALTER TABLE "GptformCommerceOrder" ADD COLUMN IF NOT EXISTS "whatsappConsent" boolean NOT NULL DEFAULT false;
ALTER TABLE "NuvoraCommerceOutbox" ADD COLUMN IF NOT EXISTS event text NOT NULL DEFAULT 'CREATED';
ALTER TABLE "NuvoraCommerceOutbox" ADD COLUMN IF NOT EXISTS "eventStatus" text;
ALTER TABLE "NuvoraCommerceOutbox" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE "NuvoraCommerceOutbox" DROP CONSTRAINT IF EXISTS "NuvoraCommerceOutbox_orderId_audience_key";
ALTER TABLE "NuvoraCommerceOutbox" DROP CONSTRAINT IF EXISTS "NuvoraCommerceOutbox_audience_check";
ALTER TABLE "NuvoraCommerceOutbox" ADD CONSTRAINT "NuvoraCommerceOutbox_audience_check" CHECK(audience IN ('customer','vendor','owner'));
CREATE UNIQUE INDEX IF NOT EXISTS "NuvoraCommerceOutbox_event_key" ON "NuvoraCommerceOutbox"("orderId",audience,event);
UPDATE "GptformCommerceOrder" o SET "whatsappConsent"=true WHERE EXISTS(SELECT 1 FROM "NuvoraCommerceOutbox" n WHERE n."orderId"=o.id AND n.audience='customer');
CREATE OR REPLACE FUNCTION nuvora_queue_order_notifications() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience,event,"eventStatus") VALUES(md5(NEW.id||':owner:CREATED'),NEW.id,'owner','CREATED',NEW.status) ON CONFLICT DO NOTHING;
  INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience,event,"eventStatus") VALUES(md5(NEW.id||':vendor:CREATED'),NEW.id,'vendor','CREATED',NEW.status) ON CONFLICT DO NOTHING;
  IF NEW."whatsappConsent" AND coalesce(NEW."customerPhone",'')<>'' THEN
   INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience,event,"eventStatus") VALUES(md5(NEW.id||':customer:CREATED'),NEW.id,'customer','CREATED',NEW.status) ON CONFLICT DO NOTHING;
  END IF;
 ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW."whatsappConsent" AND coalesce(NEW."customerPhone",'')<>'' THEN
  INSERT INTO "NuvoraCommerceOutbox"(id,"orderId",audience,event,"eventStatus") VALUES(md5(NEW.id||':customer:'||NEW.status),NEW.id,'customer',NEW.status,NEW.status) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION nuvora_queue_order_notifications() FROM PUBLIC;
DROP TRIGGER IF EXISTS nuvora_order_notifications ON "GptformCommerceOrder";
CREATE TRIGGER nuvora_order_notifications AFTER INSERT OR UPDATE OF status ON "GptformCommerceOrder" FOR EACH ROW EXECUTE FUNCTION nuvora_queue_order_notifications();
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
 INSERT INTO "GptformCommerceOrder"(id,"configId","businessId","customerPhone","customerName",status,"itemsJson",total,"deliveryAddress","deliveryType",notes,"paymentStatus","paymentMethod","paidAmount","whatsappConsent","createdAt","updatedAt")
 VALUES(new_id,c.id,b.id,coalesce(p_payload->>'customerPhone',''),p_payload->>'customerName',CASE WHEN public_order THEN 'PENDING' ELSE 'CONFIRMED' END,
  (p_payload->'items')::text,total,p_payload->>'deliveryAddress',p_payload->>'deliveryType',p_payload->>'notes',CASE WHEN paid>0 THEN 'PAID' ELSE 'UNPAID' END,p_payload->>'paymentMethod',paid,coalesce((p_payload->>'whatsappConsent')::boolean,false),now(),now()) RETURNING * INTO o;
 INSERT INTO "NuvoraCommerceRequest"("businessId","requestKey","payloadHash","orderId","promotionId","customerKey") VALUES(b.id,p_key,p_payload->>'clientHash',new_id,p_payload->>'promotionId',p_payload->>'customerPhone');
 IF paid>0 THEN INSERT INTO "NuvoraMoneyEvent"(id,"businessId","requestKey","payloadHash",kind,"moneyMinor",account,"referenceId",result)
  VALUES(md5(new_id||'receipt'),b.id,'order:'||new_id,md5(p_payload::text),'SALE_PAYMENT',round(paid::numeric*100)::bigint,CASE WHEN p_payload->>'paymentMethod'='CASH' THEN 'CASH' ELSE 'BANK' END,new_id,'{}'); END IF;
 RETURN jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('items',o."itemsJson"::jsonb),'replayed',false);
END $$;
REVOKE ALL ON FUNCTION nuvora_create_order(text,text,jsonb) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION nuvora_create_order(text,text,jsonb) TO service_role; END IF; END $$;

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
  UPDATE "NuvoraCommerceOutbox" SET status='cancelled',"leaseToken"=NULL WHERE "orderId"=o.id AND audience='customer' AND status<>'delivered';
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

CREATE OR REPLACE FUNCTION nuvora_claim_outbox(p_limit integer) RETURNS jsonb LANGUAGE sql SET search_path=public AS $$
 WITH picked AS (SELECT n.id FROM "NuvoraCommerceOutbox" n WHERE NOT EXISTS (SELECT 1 FROM "NuvoraCommerceOutbox" earlier WHERE earlier."orderId"=n."orderId" AND earlier.audience=n.audience AND earlier.status IN ('pending','processing') AND earlier.attempts<8 AND (earlier."createdAt",earlier.id)<(n."createdAt",n.id)) AND attempts<8 AND ((status='pending' AND "availableAt"<=clock_timestamp()) OR (status='processing' AND "leasedAt"<clock_timestamp()-interval '5 minutes')) ORDER BY "availableAt",id LIMIT least(greatest(p_limit,1),50) FOR UPDATE SKIP LOCKED),
 claimed AS (UPDATE "NuvoraCommerceOutbox" o SET status='processing',attempts=attempts+1,"leasedAt"=clock_timestamp(),"leaseToken"=md5(o.id||(o.attempts+1)::text||clock_timestamp()::text) FROM picked WHERE o.id=picked.id RETURNING o.*)
 SELECT coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) FROM claimed
$$;

NOTIFY pgrst,'reload schema';
