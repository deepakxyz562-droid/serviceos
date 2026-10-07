import {afterAll,beforeAll,expect,it} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {priceOrder} from '@/lib/commerce/pricing';
let pg:PGlite;
beforeAll(async()=>{
 const schema=execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8',maxBuffer:5*1024*1024,timeout:30000});
 pg=new PGlite();await pg.exec(schema);
 await pg.exec(readFileSync('prisma/migrations/20261007190000_auth_refresh_sessions/migration.sql','utf8'));
 await pg.exec('BEGIN;'+(readFileSync('prisma/migrations/20261007150000_commerce_consistency/migration.sql','utf8')+readFileSync('prisma/migrations/20261007200000_order_notifications/migration.sql','utf8'))+'COMMIT;');
 await pg.exec(readFileSync('prisma/migrations/20261008010000_customer_history/migration.sql','utf8'));
 await pg.exec(`INSERT INTO "Tenant"(id,name,slug,"updatedAt") VALUES('tenant','Test shop','test-shop',now());
 INSERT INTO "User"(id,email,"updatedAt") VALUES('owner','test-owner@example.invalid',now());
 INSERT INTO "AiBusiness"(id,"ownerId","tenantId",name,currency,"updatedAt") VALUES('business','owner','tenant','Test shop','INR',now());
 INSERT INTO "GptformCommerceConfig"(id,"businessId","catalogJson","fieldsJson","updatedAt") VALUES('config','business','[{"id":"product","name":"Rice","price":100}]','{"billing":{"taxRate":0}}',now());
 INSERT INTO "InventoryItem"(id,"tenantId",name,sku,"totalStock","availableStock","updatedAt") VALUES('stock','tenant','Rice','CAT-product',3,3,now());`);
},30000);
afterAll(async()=>{await pg?.close();});
it('runs checkout and ledger commands against the actual Prisma schema and constraints',async()=>{
 const quote=priceOrder({catalogJson:'[{"id":"product","name":"Rice","price":100}]',fieldsJson:'{"billing":{"taxRate":0}}'},[{productId:'product',qty:1}],false);
 await pg.query('SELECT nuvora_finance_command($1,$2,$3::jsonb)',['business','opening-full-schema',JSON.stringify({kind:'OPENING',amountMinor:10000,account:'CASH'})]);
 const saved=(await pg.query<any>('SELECT nuvora_create_order($1,$2,$3::jsonb) result',['business','full-schema-checkout',JSON.stringify({...quote,configId:'config',clientHash:'full-schema',customerPhone:'919876543210',paymentStatus:'PAID',paymentMethod:'CASH',publicOrder:false})])).rows[0].result;
 expect(saved.order.paidAmount).toBe(100);
 const history=(await pg.query<any>('SELECT nuvora_customer_history($1,$2,$3,$4,$5) result',['business','919876543210','ledger','',''])).rows[0].result;
 expect(history.balance).toBe(0);
 expect(history.records).toHaveLength(2);
 expect(history.records.find((r:any)=>r.kind==='SALE')).toMatchObject({debit:100,credit:0});
 expect(history.records.find((r:any)=>r.kind==='SALE_PAYMENT')).toMatchObject({debit:0,credit:100});
 expect((await pg.query<any>('SELECT "totalStock" FROM "InventoryItem" WHERE id=$1',['stock'])).rows[0].totalStock).toBe(2);
 const snapshot=(await pg.query<any>(`SELECT nuvora_finance_snapshot('business',now()-interval '1 day',now()+interval '1 day') result`)).rows[0].result;
 expect(snapshot).toMatchObject({balance:200,moneyIn:100});
 await expect(pg.query('SELECT nuvora_update_order($1,$2,$3::jsonb)',['business',saved.order.id,'{"status":"CANCELLED"}'])).rejects.toThrow('PAYMENT_REFUND_REQUIRED');
});

it('edits invoices atomically and protects recorded receipts',async()=>{
 await pg.exec(`INSERT INTO "AiCustomer"(id,"businessId",name,"updatedAt") VALUES('customer','business','Test customer',now());
 INSERT INTO "AiInvoice"(id,"businessId","customerId",number,"updatedAt") VALUES('invoice','business','customer','INV-TEST',now());
 INSERT INTO "AiInvoiceItem"(id,"invoiceId",description,qty,"unitPrice") VALUES('line','invoice','Original item',1,100);`);
 const edit=async(body:object)=>pg.query('SELECT nuvora_edit_invoice($1,$2,$3::jsonb)',['business','invoice',JSON.stringify(body)]);
 await expect(edit({notes:'Should roll back',items:[{description:'Valid line',qty:1,unitPrice:50},{description:null,qty:1,unitPrice:50}]})).rejects.toThrow();
 expect((await pg.query<any>('SELECT description FROM "AiInvoiceItem" WHERE "invoiceId"=$1',['invoice'])).rows).toEqual([{description:'Original item'}]);
 expect((await pg.query<any>('SELECT notes FROM "AiInvoice" WHERE id=$1',['invoice'])).rows[0].notes).toBeNull();
 await edit({items:[{description:'Updated item',qty:2,unitPrice:25}]});
 await pg.query('SELECT nuvora_finance_command($1,$2,$3::jsonb)',['business','invoice-full-schema-payment',JSON.stringify({kind:'INVOICE_PAYMENT',invoiceId:'invoice',amountMinor:2000,account:'BANK'})]);
 await expect(edit({taxRate:20})).rejects.toThrow('RECEIPT_CORRECTION_REQUIRED');
 await expect(pg.query('DELETE FROM "AiPayment" WHERE "invoiceId"=$1',['invoice'])).rejects.toThrow('RECEIPT_CORRECTION_REQUIRED');
 await expect(pg.query('INSERT INTO "AiPayment"(id,"invoiceId",amount) VALUES($1,$2,$3)',['overpayment','invoice',40])).rejects.toThrow('PAYMENT_EXCEEDS_DUES');
});
