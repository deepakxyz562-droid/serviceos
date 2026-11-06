import EmbeddedPostgres from 'embedded-postgres';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

async function runScenario(withViewSchema = false) {
  const pg=new EmbeddedPostgres({databaseDir:await mkdtemp(join(tmpdir(),'bgos-calls-')),user:'postgres',password:'local-test-only',port:55439,persistent:false});
  let client;
  try {
    await pg.initialise(); await pg.start(); client=pg.getPgClient(); await client.connect();
    await client.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
    
    if (withViewSchema) {
      // Production topology: table in chatbotly, view in public
      await client.query(`
        CREATE SCHEMA chatbotly;
        CREATE TABLE chatbotly."AiCall" (id text primary key,"tenantId" text,"customerPhone" text,"fromNumber" text,"toNumber" text,"callType" text,status text,"durationSec" int,summary text,"outcomeType" text,"endedReason" text,"startedAt" timestamptz,"endedAt" timestamptz,"updatedAt" timestamptz,"billingStatus" text,"leadId" text);
        CREATE VIEW public."AiCall" AS SELECT * FROM chatbotly."AiCall";
        CREATE TABLE "Lead" (id text primary key,"tenantId" text,name text,phone text,source text,status text,value float,description text,"notesJson" text,"updatedAt" timestamptz);
      `);
    } else {
      // Monolithic topology: table directly in public
      await client.query(`
        CREATE TABLE "AiCall" (id text primary key,"tenantId" text,"customerPhone" text,"fromNumber" text,"toNumber" text,"callType" text,status text,"durationSec" int,summary text,"outcomeType" text,"endedReason" text,"startedAt" timestamptz,"endedAt" timestamptz,"updatedAt" timestamptz,"billingStatus" text,"leadId" text);
        CREATE TABLE "Lead" (id text primary key,"tenantId" text,name text,phone text,source text,status text,value float,description text,"notesJson" text,"updatedAt" timestamptz);
      `);
    }

    // Run migration
    await client.query(await readFile('supabase/migrations/20261106000100_call_tracker_atomic.sql','utf8'));

    const body={customerPhone:'+15551234567',captureSource:'android_sim',sourceEventId:'device:1:12345678',callType:'inbound',durationSec:20,createLead:false};
    const invoke=async(action,payload,tenant='t1')=>{
      const c=pg.getPgClient(); await c.connect();
      try{return (await c.query('SELECT bgos_call_write($1,$2,$3::jsonb) AS result',[tenant,action,JSON.stringify(payload)])).rows[0].result;}finally{await c.end();}
    };

    const created=await Promise.all(Array.from({length:8},()=>invoke('create',body)));
    assert.equal(new Set(created.map(r=>r.call.id)).size,1);
    const id=created[0].call.id;

    const converted=await Promise.all(Array.from({length:8},()=>invoke('convert',{callId:id,leadName:'Customer'})));
    assert.equal(new Set(converted.map(r=>r.lead.id)).size,1);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM "Lead"')).rows[0].n,1);
    assert.equal((await invoke('convert',{callId:id},'other')).status,404);

    // Force lead insert failure and prove the call insert is rolled back too.
    await client.query(`ALTER TABLE "Lead" ADD CONSTRAINT reject_test_${withViewSchema ? 'v' : 't'} CHECK (name <> 'FAIL');`);
    await assert.rejects(invoke('create',{...body,sourceEventId:'rollback-event',createLead:true,leadName:'FAIL'}));
    assert.equal((await client.query('SELECT count(*)::int AS n FROM "AiCall" WHERE "sourceEventId"=$1',['rollback-event'])).rows[0].n,0);

    console.log(`PASS (${withViewSchema ? 'view in public -> table in chatbotly' : 'table in public'}): concurrent ingestion, conversion, rollback`);
  } finally {
    if(client) await client.end();
    await pg.stop();
  }
}

await runScenario(false);
await runScenario(true);
console.log('ALL SCENARIOS PASSED: both monolithic and view-separated schemas work perfectly!');
