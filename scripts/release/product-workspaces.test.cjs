const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sql = readFileSync('prisma/migrations/20261008120000_product_workspaces/migration.sql','utf8');
const bgosSql = readFileSync('prisma/migrations/20261009180000_bgos_product_identity/migration.sql','utf8');
async function fixture() {
 const db = new PGlite();
 await db.exec(`CREATE ROLE service_role; CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE TABLE "Tenant" (id text PRIMARY KEY,name text,slug text UNIQUE,country text,currency text,plan text,"planStatus" text,"updatedAt" timestamp,"signupMode" text,"onboardingCompleted" boolean,"onboardingStep" int,"trialEndsAt" timestamp,"planEndsAt" timestamp,"suspendedAt" timestamp);
 CREATE TABLE "Workspace" (id text PRIMARY KEY,name text,slug text UNIQUE,"ownerId" text,"tenantId" text,"productType" text,"updatedAt" timestamp);
 CREATE TABLE "User" (id text PRIMARY KEY,"tenantId" text,"workspaceId" text,role text,"isActive" boolean,"emailVerified" boolean);
 CREATE TABLE "Subscription" (id text,"tenantId" text,"createdAt" timestamp);
 INSERT INTO "Tenant" (id,name,plan,"planStatus","onboardingCompleted","onboardingStep") VALUES ('t','Acme','free','active',true,4);
 INSERT INTO "Workspace" VALUES('w','Acme','acme','u','t','crm',now());
 INSERT INTO "User" VALUES ('u','t','w','owner',true,true),('employee','t','w','employee',true,true),('disabled','t','w','owner',false,true);
 `);
 return db;
}
test('backfill is repeatable and preserves identities, billing and onboarding',async()=>{
 const db=await fixture();try {
 await db.exec(sql);await db.exec(sql);
 const p=(await db.query('SELECT * FROM "ProductWorkspace"')).rows;
 assert.equal(p.length,1);assert.equal(p[0].product,'crm');assert.equal(p[0].onboardingCompleted,true);
 assert.equal((await db.query('SELECT "billingSource" FROM "ProductSubscription"')).rows[0].billingSource,'legacy');
 assert.equal((await db.query(`SELECT has_table_privilege('anon','"ProductMembership"','SELECT') AS allowed`)).rows[0].allowed,false);
 assert.equal((await db.query(`SELECT has_function_privilege('authenticated','activate_product_workspace(text,text,text)','EXECUTE') AS allowed`)).rows[0].allowed,false);
 }finally{await db.close()}
});
test('activation is idempotent, independent, and cannot reset subscriptions',async()=>{
 const db=await fixture();try {
 await db.exec(sql);
 const activate=async()=> (await db.query(`SELECT activate_product_workspace('u','bos','Acme retail') AS id`)).rows[0].id;
 const id=await activate();assert.equal(await activate(),id);
 await db.query(`UPDATE "ProductSubscription" SET status='expired' WHERE "workspaceId"=$1`,[id]);
 assert.equal(await activate(),id);
 assert.equal((await db.query(`SELECT status FROM "ProductSubscription" WHERE "workspaceId"=$1`,[id])).rows[0].status,'expired');
 assert.equal((await db.query(`SELECT "workspaceId" FROM "User" WHERE id='u'`)).rows[0].workspaceId,'w');
 assert.equal((await db.query(`SELECT "onboardingCompleted" FROM "ProductWorkspace" WHERE "workspaceId"=$1`,[id])).rows[0].onboardingCompleted,false);
 for(const user of ['employee','disabled','missing']) await assert.rejects(db.query(`SELECT activate_product_workspace($1,'bos','x')`,[user]),/FORBIDDEN/);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM "ProductWorkspace"')).rows[0].n,2);
 }finally{await db.close()}
});
test('BGOS upgrade preserves memberships and subscriptions and canonicalizes activation',async()=>{
 const db=await fixture();try {
 await db.exec(sql);
 const legacy=(await db.query(`SELECT activate_product_workspace('u','chatbotly','Growth') AS id`)).rows[0].id;
 await db.query(`UPDATE "ProductSubscription" SET status='expired' WHERE "workspaceId"=$1`,[legacy]);
 await db.exec(bgosSql);await db.exec(bgosSql);
 for(const product of ['bgos','chatbotly']) assert.equal((await db.query(`SELECT activate_product_workspace('u',$1,'Growth') AS id`,[product])).rows[0].id,legacy);
 assert.equal((await db.query(`SELECT status FROM "ProductSubscription" WHERE "workspaceId"=$1`,[legacy])).rows[0].status,'expired');
 assert.equal((await db.query(`SELECT product FROM "ProductWorkspace" WHERE "workspaceId"=$1`,[legacy])).rows[0].product,'bgos');
 }finally{await db.close()}
});
