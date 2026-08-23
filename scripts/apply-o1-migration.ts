/**
 * Apply the O1 Omnichannel DDL migration to Supabase via the REST API.
 *
 * The project uses USE_SUPABASE_DB=true (PostgREST), so we can't use `prisma db:push`
 * against the production database. Instead, we execute raw SQL via the Supabase
 * REST `/rest/v1/rpc/` endpoint — but that requires a pre-registered RPC function.
 *
 * Instead, this script uses the Supabase SQL API (the `/pg/query` endpoint exposed
 * via the management API, OR a direct connection). Since the sandbox doesn't have
 * direct psql access, we use a simpler approach: split the SQL into statements and
 * execute each via PostgREST's `rpc` function `exec_sql` if available, OR use the
 * table API for the parts that can be done via REST.
 *
 * SAFEST APPROACH: This script runs the DDL + seed by calling the Supabase
 * `pg_meta` query endpoint OR by splitting into individual ALTER/CREATE statements
 * and executing via a custom RPC. Since neither is guaranteed, this script instead
 * outputs the exact SQL that must be run in the Supabase SQL Editor (Dashboard →
 * SQL Editor) and verifies the result via REST.
 *
 * Usage:
 *   1. bun run scripts/apply-o1-migration.ts            # prints SQL + verifies
 *   2. Paste the SQL into Supabase Dashboard → SQL Editor → Run
 *   3. bun run scripts/apply-o1-migration.ts --verify   # verifies the result
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verify() {
  console.log('\n=== O1 Migration Verification ===\n');

  // Check ChannelCatalog
  const { data: catalog, error: catErr } = await client
    .from('ChannelCatalog')
    .select('channel, enabled, comingSoon, displayName, sortOrder')
    .order('sortOrder', { ascending: true });
  if (catErr) {
    console.log('❌ ChannelCatalog:', catErr.message);
  } else {
    console.log(`✅ ChannelCatalog (${catalog?.length || 0} rows):`);
    catalog?.forEach((c: any) => {
      const status = !c.enabled && !c.comingSoon ? 'HIDDEN' :
                     !c.enabled && c.comingSoon ? 'COMING SOON' :
                     c.enabled ? 'ENABLED' : 'UNKNOWN';
      console.log(`   ${status.padEnd(12)} ${c.channel.padEnd(16)} ${c.displayName}`);
    });
  }

  // Check ChannelConnection
  const { data: conns, error: connErr } = await client
    .from('ChannelConnection')
    .select('tenantId, channel, status, displayName')
    .order('tenantId')
    .limit(20);
  if (connErr) {
    console.log('\n❌ ChannelConnection:', connErr.message);
  } else {
    console.log(`\n✅ ChannelConnection (${conns?.length || 0} rows):`);
    conns?.forEach((c: any) => {
      console.log(`   tenant=${(c.tenantId || '').slice(0, 12)} channel=${c.channel.padEnd(12)} status=${c.status}`);
    });
  }

  // Check InboxMessage new columns
  const { data: im, error: imErr } = await client
    .from('InboxMessage')
    .select('id, channel, attachmentsJson')
    .limit(1);
  if (imErr) {
    console.log('\n❌ InboxMessage new columns:', imErr.message);
  } else {
    console.log(`\n✅ InboxMessage.channel + attachmentsJson columns exist (sample: ${JSON.stringify(im?.[0] || {})})`);
  }

  // Count InboxMessage rows with channel
  const { count: total } = await client.from('InboxMessage').select('*', { count: 'exact', head: true });
  const { count: withChannel } = await client.from('InboxMessage').select('*', { count: 'exact', head: true }).not('channel', 'is', null);
  console.log(`\n✅ InboxMessage: ${withChannel}/${total} rows have channel set`);

  console.log('\n=== Verification complete ===\n');
}

async function main() {
  if (process.argv.includes('--verify')) {
    await verify();
    return;
  }

  // Print the SQL for manual execution in Supabase Dashboard
  const sql = readFileSync('supabase-migration-o1-omnichannel.sql', 'utf8');
  console.log('=== O1 OMNICHANNEL MIGRATION SQL ===');
  console.log('Run this in the Supabase Dashboard → SQL Editor:\n');
  console.log(sql);
  console.log('\n=== After running the SQL, verify with: bun run scripts/apply-o1-migration.ts --verify ===\n');

  // Also verify the current state
  await verify();
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
