/**
 * Find the largest tenants by CRM volume (jobs, customers, invoices, leads).
 * READ-ONLY. Uses the user's distribution query + extends to tenant-scoped tables.
 *
 * Purpose: identify tenants big enough for meaningful EXPLAIN ANALYZE.
 * Rule of thumb: need 1000+ rows in the target table for Seq Scan vs Index Scan
 * to be a meaningful decision.
 */
import 'dotenv/config';
import { getAdminClient } from '../src/lib/supabase-db';

async function main() {
  const client = getAdminClient();

  console.log('═'.repeat(70));
  console.log('  CRM volume distribution by tenant (READ-ONLY)');
  console.log('═'.repeat(70));
  console.log('');

  // 1. Top 10 workspaces by job count (the user's query, extended)
  console.log('  [1] Top 10 workspaces by job count...');
  const { data: topWs, error: topWsErr } = await client
    .from('Workspace')
    .select('id, name, "tenantId"')
    .not('tenantId', 'is', null)
    .order('name')
    .limit(500);

  if (topWsErr || !topWs) {
    console.log(`    ❌ ${topWsErr?.message || 'no data'}`);
    return;
  }
  console.log(`    Loaded ${topWs.length} workspaces with tenantId. Counting jobs per workspace...`);

  // Count jobs per workspace (head: true, count only — no payload)
  const wsJobCounts: Array<{ id: string; name: string; tenantId: string; jobs: number }> = [];
  for (const w of topWs) {
    const { count } = await client
      .from('Job')
      .select('*', { count: 'exact', head: true })
      .eq('workspaceId', w.id);
    wsJobCounts.push({ id: w.id, name: w.name, tenantId: w.tenantId!, jobs: count ?? 0 });
  }
  wsJobCounts.sort((a, b) => b.jobs - a.jobs);
  console.log('');
  console.log('    Top 10 workspaces by job count:');
  console.log('    ' + 'workspaceId'.padEnd(30) + 'name'.padEnd(35) + 'jobs');
  console.log('    ' + '-'.repeat(28) + ' ' + '-'.repeat(33) + ' ' + '-'.repeat(8));
  for (const w of wsJobCounts.slice(0, 10)) {
    console.log('    ' + w.id.padEnd(30) + w.name.substring(0, 33).padEnd(35) + String(w.jobs));
  }

  // 2. Top 10 tenants by Customer count (tenant-scoped table)
  console.log('');
  console.log('  [2] Top 10 tenants by Customer count...');
  // Get distinct tenantIds from Customer
  const { data: tenants } = await client
    .from('Customer')
    .select('tenantId')
    .not('tenantId', 'is', null);

  const tenantCustCounts: Record<string, number> = {};
  for (const c of tenants || []) {
    if (c.tenantId) tenantCustCounts[c.tenantId] = (tenantCustCounts[c.tenantId] || 0) + 1;
  }
  const sortedTenants = Object.entries(tenantCustCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('    ' + 'tenantId'.padEnd(30) + 'customers');
  console.log('    ' + '-'.repeat(28) + ' ' + '-'.repeat(10));
  for (const [tid, n] of sortedTenants) {
    console.log('    ' + tid.padEnd(30) + String(n));
  }

  // 3. Top 10 tenants by Invoice count
  console.log('');
  console.log('  [3] Top 10 tenants by Invoice count...');
  const { data: invTenants } = await client
    .from('Invoice')
    .select('tenantId')
    .not('tenantId', 'is', null);

  const tenantInvCounts: Record<string, number> = {};
  for (const i of invTenants || []) {
    if (i.tenantId) tenantInvCounts[i.tenantId] = (tenantInvCounts[i.tenantId] || 0) + 1;
  }
  const sortedInvTenants = Object.entries(tenantInvCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('    ' + 'tenantId'.padEnd(30) + 'invoices');
  console.log('    ' + '-'.repeat(28) + ' ' + '-'.repeat(10));
  for (const [tid, n] of sortedInvTenants) {
    console.log('    ' + tid.padEnd(30) + String(n));
  }

  // 4. Top 10 tenants by Lead count
  console.log('');
  console.log('  [4] Top 10 tenants by Lead count...');
  const { data: leadTenants } = await client
    .from('Lead')
    .select('tenantId')
    .not('tenantId', 'is', null);

  const tenantLeadCounts: Record<string, number> = {};
  for (const l of leadTenants || []) {
    if (l.tenantId) tenantLeadCounts[l.tenantId] = (tenantLeadCounts[l.tenantId] || 0) + 1;
  }
  const sortedLeadTenants = Object.entries(tenantLeadCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('    ' + 'tenantId'.padEnd(30) + 'leads');
  console.log('    ' + '-'.repeat(28) + ' ' + '-'.repeat(10));
  for (const [tid, n] of sortedLeadTenants) {
    console.log('    ' + tid.padEnd(30) + String(n));
  }

  // 5. Total table sizes (global, not per-tenant)
  console.log('');
  console.log('  [5] Global table sizes (all tenants combined)...');
  for (const t of ['Job', 'Customer', 'Invoice', 'Lead', 'Conversation', 'InboxMessage', 'AppNotification', 'ActivityLog', 'Employee', 'Deal']) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`    ${t.padEnd(20)} ❌ ${error.message}`);
    } else {
      console.log(`    ${t.padEnd(20)} ${count}`);
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('  RECOMMENDATION:');
  console.log('  Pick a tenant/workspace from the top of each list above');
  console.log('  (1000+ rows minimum for meaningful EXPLAIN ANALYZE).');
  console.log('═'.repeat(70));
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
