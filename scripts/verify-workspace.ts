/**
 * Verify the workspace + tenant the user provided has a meaningful job count
 * for EXPLAIN ANALYZE. READ-ONLY — no mutations.
 */
import 'dotenv/config';
import { getAdminClient } from '../src/lib/supabase-db';

const WORKSPACE_ID = '29bAOZ3VpdULurndS7D-bX7BX';
const TENANT_ID = 'q3ELcE45UhpTCjg-MsvI1aHfP';

async function main() {
  const client = getAdminClient();

  console.log('═'.repeat(70));
  console.log('  Workspace / Tenant verification (READ-ONLY)');
  console.log('═'.repeat(70));
  console.log(`  Workspace ID: ${WORKSPACE_ID}`);
  console.log(`  Tenant ID:    ${TENANT_ID}`);
  console.log('');

  // 1. Confirm workspace exists + its tenantId
  console.log('  [1] Workspace lookup...');
  const { data: ws, error: wsErr } = await client
    .from('Workspace')
    .select('id, name, "tenantId"')
    .eq('id', WORKSPACE_ID)
    .maybeSingle();

  if (wsErr) {
    console.log(`    ❌ Error: ${wsErr.message}`);
    return;
  }
  if (!ws) {
    console.log(`    ❌ Workspace not found with id=${WORKSPACE_ID}`);
    return;
  }
  console.log(`    ✅ Found: "${ws.name}" (tenantId=${ws.tenantId})`);
  if (ws.tenantId !== TENANT_ID) {
    console.log(`    ⚠️  tenantId mismatch! Workspace says ${ws.tenantId}, you said ${TENANT_ID}`);
  }

  // 2. Count jobs in this workspace (the EXPLAIN target)
  console.log('');
  console.log('  [2] Job count in this workspace...');
  const { count: wsJobCount, error: wsJobErr } = await client
    .from('Job')
    .select('*', { count: 'exact', head: true })
    .eq('workspaceId', WORKSPACE_ID);

  if (wsJobErr) {
    console.log(`    ❌ Error: ${wsJobErr.message}`);
  } else {
    console.log(`    ✅ ${wsJobCount} jobs in workspace "${ws.name}"`);
  }

  // 3. Count ACTIVE jobs (the realistic EXPLAIN target — what /api/jobs loads)
  console.log('');
  console.log('  [3] Active (non-deleted) jobs in this workspace...');
  const { count: activeCount, error: activeErr } = await client
    .from('Job')
    .select('*', { count: 'exact', head: true })
    .eq('workspaceId', WORKSPACE_ID)
    .is('deletedAt', null);

  if (activeErr) {
    console.log(`    ❌ Error: ${activeErr.message}`);
  } else {
    console.log(`    ✅ ${activeCount} active (non-deleted) jobs`);
  }

  // 4. Status distribution (so we know what the /api/jobs?status= filter hits)
  console.log('');
  console.log('  [4] Status distribution in this workspace...');
  const { data: statusRows, error: statusErr } = await client
    .from('Job')
    .select('status')
    .eq('workspaceId', WORKSPACE_ID)
    .is('deletedAt', null);

  if (statusErr) {
    console.log(`    ❌ Error: ${statusErr.message}`);
  } else if (statusRows) {
    const dist: Record<string, number> = {};
    for (const r of statusRows) {
      const s = r.status || '(null)';
      dist[s] = (dist[s] || 0) + 1;
    }
    console.log(`    ✅ Status distribution:`);
    for (const [s, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
      console.log(`       ${s.padEnd(20)} ${n}`);
    }
  }

  // 5. All workspaces under this tenant (to understand the full tenant scope)
  console.log('');
  console.log('  [5] All workspaces under this tenant...');
  const { data: tenantWs, error: tenantWsErr } = await client
    .from('Workspace')
    .select('id, name')
    .eq('tenantId', TENANT_ID);

  if (tenantWsErr) {
    console.log(`    ❌ Error: ${tenantWsErr.message}`);
  } else if (tenantWs) {
    console.log(`    ✅ ${tenantWs.length} workspace(s) under this tenant:`);
    for (const w of tenantWs) {
      console.log(`       ${w.id}  "${w.name}"`);
    }
  }

  // 6. Tenant-wide totals (the realistic dashboard scope)
  console.log('');
  console.log('  [6] Tenant-wide CRM table counts (via workspaceIds)...');
  const wsIds = tenantWs?.map((w) => w.id) || [];
  if (wsIds.length > 0) {
    // Job count across all tenant workspaces
    const { count: tenantJobs } = await client
      .from('Job')
      .select('*', { count: 'exact', head: true })
      .in('workspaceId', wsIds)
      .is('deletedAt', null);
    console.log(`    Jobs (tenant-wide, active):     ${tenantJobs}`);

    // Employee count
    const { count: tenantEmps } = await client
      .from('Employee')
      .select('*', { count: 'exact', head: true })
      .in('workspaceId', wsIds);
    console.log(`    Employees (tenant-wide):         ${tenantEmps}`);
  }

  // Customer + Invoice + Lead are tenantId-scoped directly
  const tables = ['Customer', 'Invoice', 'Lead', 'Conversation', 'AppNotification'];
  for (const t of tables) {
    const { count, error } = await client
      .from(t)
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', TENANT_ID);
    if (error) {
      console.log(`    ${t}: ❌ ${error.message}`);
    } else {
      console.log(`    ${t} (tenant-scoped):              ${count}`);
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('  Verification complete');
  console.log('═'.repeat(70));
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
