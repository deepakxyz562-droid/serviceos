const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sql = readFileSync('supabase-restore-tables-and-reconcile-quoteflow.sql', 'utf8');
const tables = ['AiBusiness','AiCustomer','AiQuote','AiQuoteItem','AiInvoice','AiInvoiceItem','AiPayment','AiItem','AiTemplate'];
async function fixture(existing = false) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE service_role; CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA bos; CREATE SCHEMA chatbotly;
    CREATE TABLE public."Job"(id text PRIMARY KEY);
    CREATE TABLE public."Employee"(id text PRIMARY KEY);
    CREATE TABLE public."Tenant"(id text PRIMARY KEY);
    CREATE TABLE bos."Customer"(id text PRIMARY KEY);
    CREATE VIEW public."Customer" AS SELECT * FROM bos."Customer";
    GRANT ALL ON bos."Customer", public."Customer" TO anon, authenticated;
    CREATE TABLE chatbotly.protected(id text); ALTER TABLE chatbotly.protected ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_policy ON chatbotly.protected FOR SELECT TO authenticated USING (true);
    GRANT ALL ON chatbotly.protected TO authenticated;`);
  for (const table of tables) await db.exec(`CREATE TABLE bos."${table}"(id text PRIMARY KEY); INSERT INTO bos."${table}" VALUES ('preserved'); CREATE VIEW public."${table}" AS SELECT * FROM bos."${table}";`);
  if (existing) {
    const ddl = sql.match(/CREATE TABLE IF NOT EXISTS public\."NotificationLog" \([\s\S]*?\n\);/)[0];
    await db.exec(ddl);
  }
  return db;
}
for (const existing of [false, true]) test(`repairs ${existing ? 'existing' : 'missing'} tables and is repeatable`, async () => {
  const db = await fixture(existing);
  try {
    await db.exec(sql); await db.exec(sql);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='public."NotificationLog"'::regclass AND contype='f'`)).rows[0].n, 4);
    for (const table of tables) assert.equal((await db.query(`SELECT id FROM public."${table}"`)).rows[0].id, 'preserved');
    assert.equal((await db.query(`SELECT has_table_privilege('anon','bos."Customer"','SELECT') AS allowed`)).rows[0].allowed, false);
    assert.equal((await db.query(`SELECT has_table_privilege('anon','public."Customer"','SELECT') AS allowed`)).rows[0].allowed, false);
    assert.equal((await db.query(`SELECT has_schema_privilege('service_role','quoteflow','USAGE') AS allowed`)).rows[0].allowed, true);
    assert.equal((await db.query(`SELECT has_table_privilege('authenticated','chatbotly.protected','SELECT') AS allowed`)).rows[0].allowed, true);
    assert.equal((await db.query(`SELECT has_table_privilege('authenticated','chatbotly.protected','TRUNCATE') AS allowed`)).rows[0].allowed, false);
    assert.equal((await db.query(`SELECT has_table_privilege('service_role','public."NotificationLog"','INSERT') AS allowed`)).rows[0].allowed, true);
  } finally { await db.close(); }
});
test('missing QuoteFlow tables are automatically provisioned with views', async () => {
  const db = await fixture();
  try {
    await db.exec('DROP VIEW public."AiItem"; DROP TABLE bos."AiItem";');
    await db.exec(sql);
    assert.equal((await db.query(`SELECT table_schema FROM information_schema.tables WHERE table_schema='quoteflow' AND table_name='AiItem'`)).rows[0].table_schema, 'quoteflow');
    assert.equal((await db.query(`SELECT table_schema FROM information_schema.tables WHERE table_schema='public' AND table_name='AiItem' AND table_type='VIEW'`)).rows[0].table_schema, 'public');
  } finally { await db.close(); }
});
