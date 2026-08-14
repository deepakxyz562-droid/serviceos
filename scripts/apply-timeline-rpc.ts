#!/usr/bin/env bun
/**
 * apply-timeline-rpc.ts
 *
 * Attempts to apply supabase-rpc-timeline.sql to the Supabase database via
 * the IPv4-reachable pooler (session mode, port 5432). The direct host
 * (db.{ref}.supabase.co) is IPv6-only and unreachable from this sandbox.
 *
 * Tries multiple pooler regions in order. Stops on first success.
 *
 * Usage: bun run scripts/apply-timeline-rpc.ts
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

// ── Load .env manually (avoid pulling in dotenv config side effects) ────────
const envFile = readFileSync('/home/z/my-project/.env', 'utf8');
const env: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let val = m[2];
  // strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[m[1]] = val;
}

const DATABASE_URL = env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL not found in .env');
  process.exit(1);
}

// Parse the direct DATABASE_URL to extract password + project ref.
// Direct URL format: postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres
let url: URL;
try {
  url = new URL(DATABASE_URL);
} catch (e) {
  console.error('✗ DATABASE_URL is not a valid URL:', (e as Error).message);
  process.exit(1);
}

const directHost = url.hostname; // db.{ref}.supabase.co
const password = decodeURIComponent(url.password);
const refMatch = directHost.match(/^db\.([^.]+)\.supabase\.co$/);
if (!refMatch) {
  console.error(`✗ Unexpected DATABASE_URL host: ${directHost}`);
  console.error('  Expected: db.{ref}.supabase.co');
  process.exit(1);
}
const ref = refMatch[1];
console.log(`Project ref: ${ref}`);
console.log(`Direct host: ${directHost} (IPv6-only, unreachable from sandbox)`);

// ── Load the SQL file ───────────────────────────────────────────────────────
const sqlPath = '/home/z/my-project/supabase-rpc-timeline.sql';
const sql = readFileSync(sqlPath, 'utf8');
console.log(`SQL file loaded: ${sql.length} bytes`);

// ── Pooler regions to try (session mode = port 5432) ───────────────────────
// Session mode supports multi-statement DDL; transaction mode (6543) does not.
const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ca-central-1',
  'sa-east-1',
];

// Pooler username format: postgres.{ref}
const poolerUser = `postgres.${ref}`;
const poolerDb = url.pathname.slice(1) || 'postgres';

// ── Try each region until one works ────────────────────────────────────────
let connected = false;
let lastErr: unknown = null;

for (const region of regions) {
  const poolerHost = `aws-0-${region}.pooler.supabase.com`;
  const connStr = `postgresql://${poolerUser}:${encodeURIComponent(password)}@${poolerHost}:5432/${poolerDb}`;
  console.log(`\n→ Trying ${poolerHost} (session mode, port 5432)...`);

  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 10000,
    // Force IPv4 — pg will use whatever getaddrinfo returns, and the pooler
    // resolves to IPv4, so this is just belt-and-suspenders.
    query_timeout: 30000,
  });

  try {
    await client.connect();
    console.log(`  ✓ Connected via ${region}`);

    // Quick sanity check: SELECT 1
    const r1 = await client.query('SELECT 1 AS ok');
    if (r1.rows[0]?.ok !== 1) {
      throw new Error('SELECT 1 sanity check failed');
    }
    console.log('  ✓ SELECT 1 ok');

    // Check if function already exists
    const checkRes = await client.query(
      `SELECT proname FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public' AND p.proname = 'get_customer_timeline'`,
    );
    if (checkRes.rows.length > 0) {
      console.log('  ⚠ Function already exists — DROP+CREATE will replace it');
    }

    // Apply the SQL. pg can execute multi-statement queries in a single
    // query() call IF the statements are separated by semicolons and the
    // driver is configured to allow it. However, the safer approach is to
    // split on semicolons and execute each statement separately, EXCEPT
    // for the function body which is a single statement delimited by $$.
    //
    // The cleanest approach: use pg's simple query protocol (query(text))
    // which sends the entire string to the server and lets libpq handle
    // multi-statement execution.
    console.log('  → Applying SQL...');
    await client.query(sql);
    console.log('  ✓ SQL applied successfully!');

    // Verify the function now exists
    const verifyRes = await client.query(
      `SELECT p.proname, pg_get_function_arguments(p.oid) AS args
       FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public' AND p.proname = 'get_customer_timeline'`,
    );
    if (verifyRes.rows.length === 0) {
      console.error('  ✗ Function not found after applying SQL!');
      await client.end();
      continue;
    }
    console.log(`  ✓ Function verified: ${verifyRes.rows[0].proname}(${verifyRes.rows[0].args})`);

    await client.end();
    console.log('\n✅ SUCCESS — get_customer_timeline RPC is now live in the database.');
    console.log('   The timeline route will use the RPC path on the next request.');
    connected = true;
    break;
  } catch (err) {
    const msg = (err as Error).message;
    console.log(`  ✗ ${region}: ${msg}`);
    lastErr = err;
    try { await client.end(); } catch { /* ignore */ }
  }
}

if (!connected) {
  console.error('\n✗ Could not connect via any pooler region.');
  console.error('  Last error:', (lastErr as Error)?.message);
  console.error('\nThe SQL file is correct and ready. Apply it manually via:');
  console.error('  Supabase Dashboard → SQL Editor → New query → paste contents of:');
  console.error('  /home/z/my-project/supabase-rpc-timeline.sql → Run');
  process.exit(2);
}
