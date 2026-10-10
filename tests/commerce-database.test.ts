import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { priceOrder } from '@/lib/commerce/pricing';

let database: PGlite;
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE TABLE "AiBusiness"(id text PRIMARY KEY,"tenantId" text,currency text);
    CREATE TABLE "Supplier"(id text PRIMARY KEY,"tenantId" text,name text);
    CREATE TABLE "GptformCommerceConfig"(id text PRIMARY KEY,"businessId" text,"catalogJson" text,"fieldsJson" text,"isActive" boolean,"updatedAt" timestamptz);
    CREATE TABLE "GptformCommerceOrder"(id text PRIMARY KEY,"configId" text REFERENCES "GptformCommerceConfig"(id),"businessId" text,"customerPhone" text,"customerName" text,status text,"itemsJson" text,total double precision,"deliveryAddress" text,"deliveryType" text,notes text,"paymentStatus" text,"paymentMethod" text,"paymentRef" text,"createdAt" timestamptz,"updatedAt" timestamptz);
    CREATE TABLE "InventoryItem"(id text PRIMARY KEY,"tenantId" text,sku text,"isActive" boolean,"availableStock" integer,"totalStock" integer,"costPrice" double precision,"updatedAt" timestamptz,"reservedStock" integer DEFAULT 0,"reorderLevel" integer DEFAULT 1,name text,"salePrice" double precision,currency text,"reorderQty" integer,unit text,category text,"isSellableOnline" boolean,"metadataJson" text,"createdAt" timestamptz);
    CREATE TABLE "LowStockAlert"(id text PRIMARY KEY,"tenantId" text,"inventoryItemId" text,"currentStock" integer,"reorderLevel" integer,status text,"createdAt" timestamptz,"resolvedAt" timestamptz);
    CREATE TABLE "StockTransaction"(id text PRIMARY KEY,"tenantId" text,"inventoryItemId" text,type text,direction text,quantity double precision,"unitCost" double precision,"totalCost" double precision,reference text,"referenceId" text,"createdAt" timestamptz);
    CREATE TABLE "Promotion"(type text,value double precision,"minSpend" double precision,"maxDiscount" double precision,id text PRIMARY KEY,"tenantId" text,"isActive" boolean,"startDate" timestamptz,"endDate" timestamptz,"usageLimit" integer,"usedCount" integer,"perCustomerLimit" integer,"updatedAt" timestamptz);
    CREATE TABLE "AiInvoice"(id text PRIMARY KEY,"businessId" text,number text,status text,"discountType" text,"discountValue" double precision,"taxRate" double precision,"updatedAt" timestamptz);
    CREATE TABLE "AiInvoiceItem"(id text PRIMARY KEY,"invoiceId" text,qty double precision,"unitPrice" double precision);
    CREATE TABLE "AiPayment"(id text PRIMARY KEY,"invoiceId" text,amount double precision,method text,"paidAt" timestamptz);
    CREATE TABLE "Expense"(id text PRIMARY KEY,number text,"tenantId" text,amount double precision,currency text,category text,"paymentMethod" text,description text,"expenseDate" timestamptz,status text,"createdAt" timestamptz,"updatedAt" timestamptz);
    INSERT INTO "AiBusiness" VALUES('business','tenant','INR'),('other-business','other-tenant','INR');
    INSERT INTO "Supplier" VALUES('supplier','tenant','Supplier A'),('other-supplier','other-tenant','Supplier B');
  `);
  await database.exec((readFileSync('prisma/migrations/20261007150000_commerce_consistency/migration.sql','utf8')+readFileSync('prisma/migrations/20261007200000_order_notifications/migration.sql','utf8')+readFileSync('prisma/migrations/20261008010000_customer_history/migration.sql','utf8')));
}, 30000);
afterAll(async () => { await database?.close(); });
const command = async (key: string, body: object) => (await database.query<{ result: any }>('SELECT nuvora_finance_command($1,$2,$3::jsonb) result', ['business',key,JSON.stringify(body)])).rows[0].result;
const snapshot = async () => (await database.query<{ result: any }>(`SELECT nuvora_finance_snapshot('business',now()-interval '1 day',now()+interval '1 day') result`)).rows[0].result;

describe('real PostgreSQL finance transactions', () => {
  it('records an opening balance separately from money received', async () => {
    await command('opening-key',{kind:'OPENING',amountMinor:10000,account:'CASH',supplierReviewComplete:true});
    expect(await snapshot()).toMatchObject({ initialized:true,balance:100,moneyIn:0,moneyOut:0 });
    await expect(command('second-opening',{kind:'OPENING',amountMinor:5000,account:'CASH'})).rejects.toThrow('OPENING_ALREADY_SET');
  });
  it('retries a payment once and rejects reuse for a different amount', async () => {
    const payload={kind:'MONEY_IN',amountMinor:2500,account:'CASH'};
    await command('same-key',payload); await command('same-key',payload);
    expect((await snapshot()).moneyIn).toBe(25);
    await expect(command('same-key',{...payload,amountMinor:2600})).rejects.toThrow('REQUEST_KEY_CONFLICT');
  });
  it('does not mistake supplier payment for receipt of stock', async () => {
    await command('supplier-bill',{kind:'SUPPLIER_BILL',amountMinor:10000,account:'CASH',supplierId:'supplier'});
    await command('supplier-payment',{kind:'SUPPLIER_PAYMENT',amountMinor:3500,account:'BANK',supplierId:'supplier'});
    expect((await snapshot()).toPay).toBe(65);
    await expect(command('too-much-supplier',{kind:'SUPPLIER_PAYMENT',amountMinor:10000,account:'CASH',supplierId:'supplier'})).rejects.toThrow('PAYMENT_EXCEEDS_DUES');
    expect((await snapshot()).toPay).toBe(65);
  });
  it('rejects a supplier from another tenant', async () => {
    await expect(command('foreign-supplier',{kind:'SUPPLIER_BILL',amountMinor:1000,account:'CASH',supplierId:'other-supplier'})).rejects.toThrow('SUPPLIER_NOT_FOUND');
  });
  it('records invoice receipts once and rejects payment beyond the invoice balance', async () => {
    await database.exec(`INSERT INTO "AiInvoice" VALUES('invoice','business','INV-1','SENT','AMOUNT',10,10,now()); INSERT INTO "AiInvoiceItem" VALUES('line','invoice',1,100);`);
    const before=(await snapshot()).moneyIn;
    const receipt={kind:'INVOICE_PAYMENT',amountMinor:4000,account:'BANK',invoiceId:'invoice'};
    await command('invoice-payment',receipt);await command('invoice-payment',receipt);
    expect((await snapshot()).moneyIn).toBe(before+40);
    expect((await snapshot()).invoices[0].balance).toBe(60);
    await expect(command('invoice-overpay',{...receipt,amountMinor:7000})).rejects.toThrow('PAYMENT_EXCEEDS_DUES');
    expect((await snapshot()).invoices[0].balance).toBe(60);
  });
});

describe('real PostgreSQL checkout and stock transactions', () => {
  const catalogJson=JSON.stringify([{id:'product',name:'Rice',price:100,isActive:true}]);
  const fieldsJson=JSON.stringify({billing:{taxRate:0}});
  const quote=() => priceOrder({catalogJson,fieldsJson},[{productId:'product',qty:1}],false);
  const order=async (key: string, overrides: object = {}) => (await database.query<{result:any}>('SELECT nuvora_create_order($1,$2,$3::jsonb) result',['business',key,JSON.stringify({...quote(),clientHash:key,configId:'config',customerPhone:'919999999999',paymentMethod:'CASH',paymentStatus:'PAID',publicOrder:false,...overrides})])).rows[0].result;
  it('commits the order, payment and stock together', async () => {
    await database.query('INSERT INTO "GptformCommerceConfig" VALUES($1,$2,$3,$4,true,now())',['config','business',catalogJson,fieldsJson]);
    await database.exec(`INSERT INTO "InventoryItem"(id,"tenantId",sku,"isActive","availableStock","totalStock","costPrice","updatedAt") VALUES('stock','tenant','CAT-product',true,2,2,50,now())`);
    const saved=await order('checkout-one');
    expect(saved.order.paidAmount).toBe(100);
    expect((await database.query<any>('SELECT "availableStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].availableStock).toBe(1);
    const replay=await order('checkout-one');
    expect(replay.replayed).toBe(true);
    expect((await database.query<any>('SELECT "availableStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].availableStock).toBe(1);
  });
  it('rolls back all effects when stock is insufficient', async () => {
    await expect(order('checkout-too-many',{items:[{productId:'product',name:'Rice',price:100,qty:2,amount:200}],totalMinor:20000})).rejects.toThrow('STOCK_UNAVAILABLE');
    expect((await database.query<any>('SELECT count(*)::integer n FROM "GptformCommerceOrder"')).rows[0].n).toBe(1);
  });
  it('records partial collections numerically and rolls back overpayment', async () => {
    const saved=await order('credit-sale',{paymentStatus:'UNPAID'});
    await command('partial-collection',{kind:'COLLECTION',amountMinor:4000,account:'CASH',customerPhone:'919999999999'});
    expect((await snapshot()).toCollect).toBe(120);
    await expect(command('over-collection',{kind:'COLLECTION',amountMinor:7000,account:'CASH',customerPhone:'919999999999'})).rejects.toThrow('PAYMENT_EXCEEDS_DUES');
    expect((await snapshot()).toCollect).toBe(120);
    expect((await database.query<any>('SELECT "paidAmount" FROM "GptformCommerceOrder" WHERE id=$1',[saved.order.id])).rows[0].paidAmount).toBe(40);
  });
});


describe('PostgreSQL order lifecycle', () => {
 const update=async(id:string,body:object)=>(await database.query<any>('SELECT nuvora_update_order($1,$2,$3::jsonb) result',['business',id,JSON.stringify(body)])).rows[0].result;
 it('records mark-paid once, including the unpaid remainder',async()=>{
  const row=(await database.query<any>(`SELECT id FROM "GptformCommerceOrder" WHERE "paymentStatus"='PARTIAL'`)).rows[0];
  const before=(await snapshot()).moneyIn;
  const paid=await update(row.id,{paymentStatus:'PAID'});
  expect(paid.order.paidAmount).toBe(100);
  await update(row.id,{paymentStatus:'PAID'});
  expect((await snapshot()).moneyIn).toBe(before+60);
  await expect(update(row.id,{status:'CANCELLED'})).rejects.toThrow('PAYMENT_REFUND_REQUIRED');
 });
 it('rejects arbitrary payment resets, invalid transitions and foreign orders',async()=>{
  const row=(await database.query<any>('SELECT id FROM "GptformCommerceOrder" LIMIT 1')).rows[0];
  await expect(update(row.id,{paymentStatus:'UNPAID'})).rejects.toThrow('INVALID_PAYMENT_STATUS');
  await expect(update(row.id,{status:'PENDING'})).rejects.toThrow('INVALID_ORDER_TRANSITION');
  await expect(update('unknown-order',{status:'READY'})).rejects.toThrow('ORDER_NOT_FOUND');
 });
 it('adjusts stock once and prevents reducing below reserved stock',async()=>{
  const payload={productId:'stock',deltaStock:5};
  const adjust=async(key:string,body:object)=>(await database.query<any>('SELECT nuvora_adjust_stock($1,$2,$3::jsonb) result',['business',key,JSON.stringify(body)])).rows[0].result;
  await adjust('restock-key',payload);await adjust('restock-key',payload);
  expect((await database.query<any>('SELECT "totalStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].totalStock).toBe(5);
  await database.exec(`UPDATE "InventoryItem" SET "reservedStock"=2,"availableStock"=3 WHERE id='stock'`);
  await expect(adjust('invalid-restock',{productId:'stock',newStock:1})).rejects.toThrow();
  expect((await database.query<any>('SELECT "totalStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].totalStock).toBe(5);
 });
});


describe('public checkout and message retries in PostgreSQL',()=>{
 const publicOrder=async(key:string,consent:boolean)=>{
  const config=(await database.query<any>('SELECT * FROM "GptformCommerceConfig" WHERE id=$1',['config'])).rows[0];
  const quote=priceOrder(config,[{productId:'product',qty:1}],true);
  return (await database.query<any>('SELECT nuvora_create_order($1,$2,$3::jsonb) result',['business',key,JSON.stringify({...quote,configId:'config',clientHash:key,customerPhone:'919999999999',publicOrder:true,paymentStatus:'PAID',whatsappConsent:consent})])).rows[0].result;
 };
 it('does not trust a public paid claim or send unrequested customer messages',async()=>{
  const saved=await publicOrder('public-order-no-consent',false);
  expect(saved.order).toMatchObject({paymentStatus:'UNPAID',paidAmount:0,status:'PENDING'});
  const messages=(await database.query<any>('SELECT audience FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1',[saved.order.id])).rows;
  expect(messages.map(r=>r.audience).sort()).toEqual(['owner','vendor']);
 });
 it('restores stock once when cancelling an unpaid order',async()=>{
  const saved=await publicOrder('public-order-cancel',true);
  const stockBefore=(await database.query<any>('SELECT "totalStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].totalStock;
  await database.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',saved.order.id,JSON.stringify({status:'CANCELLED'})]);
  await database.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',saved.order.id,JSON.stringify({status:'CANCELLED'})]);
  expect((await database.query<any>('SELECT "totalStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].totalStock).toBe(stockBefore+1);
  const queued=(await database.query<any>('SELECT audience,event,status FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1',[saved.order.id])).rows;
  expect(queued.find(r=>r.audience==='vendor')?.status).toBe('pending');
  expect(queued.filter(r=>r.event==='CANCELLED')).toHaveLength(1);
  expect(queued.find(r=>r.audience==='customer'&&r.event==='CREATED')?.status).toBe('cancelled');
 });
 it('fences stale workers after a lease expires',async()=>{
  const claimed=(await database.query<any>('SELECT nuvora_claim_outbox(1) result')).rows[0].result[0];
  expect(claimed).toBeDefined();
  await database.query(`UPDATE "NuvoraCommerceOutbox" SET "leasedAt"=now()-interval '6 minutes' WHERE id=$1`,[claimed.id]);
  const reclaimed=(await database.query<any>('SELECT nuvora_claim_outbox(1) result')).rows[0].result[0];
  const ack=async(token:string)=>(await database.query<any>('SELECT nuvora_ack_outbox($1,$2,$3,$4) result',[claimed.id,'true','',token])).rows[0].result;
  expect(await ack(claimed.leaseToken)).toEqual({updated:0});
  expect(await ack(reclaimed.leaseToken)).toEqual({updated:1});
 });
});

describe('order lifecycle notifications',()=>{
 it('queues vendor and owner alerts for counter orders and deduplicates each customer transition',async()=>{
  await database.exec(`UPDATE "InventoryItem" SET "totalStock"=20,"availableStock"=18 WHERE id='stock'`);
  const config=(await database.query<any>('SELECT * FROM "GptformCommerceConfig" WHERE id=$1',['config'])).rows[0];
  const quote=priceOrder(config,[{productId:'product',qty:1}],false);
  const payload={...quote,configId:'config',clientHash:'notification-lifecycle',customerPhone:'919999999999',publicOrder:false,paymentStatus:'UNPAID',whatsappConsent:true};
  const create=()=>database.query<any>('SELECT nuvora_create_order($1,$2,$3::jsonb) result',['business','notification-lifecycle',JSON.stringify(payload)]);
  const saved=(await create()).rows[0].result.order;await create();
  const initial=(await database.query<any>('SELECT audience,event,"eventStatus" FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1',[saved.id])).rows;
  expect(initial.map(r=>r.audience).sort()).toEqual(['customer','owner','vendor']);
  expect(initial.every(r=>r.eventStatus==='CONFIRMED')).toBe(true);
  for(const status of ['PREPARING','PREPARING','READY','DELIVERED'])await database.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',saved.id,JSON.stringify({status})]);
  const messages=(await database.query<any>('SELECT event,"eventStatus" FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1 AND audience=$2 ORDER BY "createdAt", CASE "eventStatus" WHEN \'CONFIRMED\' THEN 1 WHEN \'PREPARING\' THEN 2 WHEN \'READY\' THEN 3 WHEN \'DELIVERED\' THEN 4 ELSE 5 END',[saved.id,'customer'])).rows;
  expect(messages.map(r=>r.event)).toEqual(['CREATED','PREPARING','READY','DELIVERED']);
  expect(messages.map(r=>r.eventStatus)).toEqual(['CONFIRMED','PREPARING','READY','DELIVERED']);
  await expect(database.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',saved.id,JSON.stringify({status:'READY'})])).rejects.toThrow('INVALID_ORDER_TRANSITION');
  expect((await database.query<any>('SELECT count(*)::integer count FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1',[saved.id])).rows[0].count).toBe(6);
 });
 it('does not queue customer status messages without order-update consent',async()=>{
  const order=(await database.query<any>('SELECT id FROM "GptformCommerceOrder" WHERE id=(SELECT "orderId" FROM "NuvoraCommerceRequest" WHERE "requestKey"=$1)',['public-order-no-consent'])).rows[0];
  await database.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',order.id,JSON.stringify({status:'CONFIRMED'})]);
  expect((await database.query('SELECT id FROM "NuvoraCommerceOutbox" WHERE "orderId"=$1 AND audience=$2',[order.id,'customer'])).rows).toHaveLength(0);
 });
});


describe('customer ledger history', () => {
  const history = async (section = 'orders', date = '', id = '', business = 'business') => (await database.query<any>('SELECT nuvora_customer_history($1,$2,$3,$4,$5) result', [business,'919876543201',section,date,id])).rows[0].result;
  it('paginates every order without leaking another business and includes recorded collections', async () => {
    await database.exec(`INSERT INTO "GptformCommerceConfig"(id,"businessId","catalogJson","fieldsJson","isActive") VALUES('history-config','business','[]','{}',true);
      INSERT INTO "GptformCommerceOrder"(id,"configId","businessId","customerPhone","customerName",status,"itemsJson",total,"paidAmount","paymentStatus","createdAt","updatedAt")
      SELECT 'history-'||lpad(n::text,3,'0'),'history-config','business','919876543201','History customer','CONFIRMED','[]',10,0,'UNPAID','2026-10-08'::timestamptz,'2026-10-08'::timestamptz FROM generate_series(1,55) n;`);
    const first = await history();
    expect(first.records).toHaveLength(51);
    expect(first.balance).toBe(550);
    const last = first.records[49];
    const second = await history('orders',last.createdAt,last.id);
    expect(second.records).toHaveLength(5);
    expect(new Set([...first.records.slice(0,50),...second.records].map((r:any)=>r.id)).size).toBe(55);
    expect((await history('orders','','','other-business')).records).toHaveLength(0);
    await command('history-payment',{kind:'COLLECTION',customerPhone:'919876543201',amountMinor:1500,account:'CASH'});
    const ledger = await history('ledger');
    expect(ledger.balance).toBe(535);
    expect(ledger.records.some((r:any)=>r.kind==='COLLECTION'&&r.credit===15)).toBe(true);
    await database.exec(`UPDATE "GptformCommerceOrder" SET "needsReconciliation"=true WHERE id='history-001'`);
    expect(await history()).toMatchObject({ balance:null,reviewRequired:true });
  });
});
