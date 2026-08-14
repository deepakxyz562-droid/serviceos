/**
 * Find an owner/admin user in the data-rich tenant so we can dev-login as them
 * for C-1 measurement. READ-ONLY.
 */
import 'dotenv/config';
import { getAdminClient } from '../src/lib/supabase-db';

const TENANT_ID = 'q3ELcE45UhpTCjg-MsvI1aHfP';

async function main() {
  const client = getAdminClient();
  console.log('Looking up users in tenant', TENANT_ID);

  const { data, error } = await client
    .from('User')
    .select('id, email, name, role, "workspaceId", "tenantId"')
    .eq('"tenantId"', TENANT_ID);

  if (error) {
    console.log('ERROR:', error.message);
    // try without quotes on tenantId
    const { data: data2, error: err2 } = await client
      .from('User')
      .select('id, email, name, role, workspaceId, tenantId')
      .eq('tenantId', TENANT_ID);
    if (err2) { console.log('ERROR2:', err2.message); return; }
    print(data2);
    return;
  }
  print(data);
}

function print(data: unknown) {
  const rows = (data as Array<Record<string, unknown>>) || [];
  console.log(`Found ${rows.length} users:`);
  for (const u of rows) {
    console.log(
      `  role=${u.role}  email=${u.email}  name=${u.name}  workspaceId=${u.workspaceId}  id=${u.id}`,
    );
  }
  const owner = rows.find((u) => u.role === 'owner' || u.role === 'admin') || rows[0];
  if (owner) {
    console.log('');
    console.log(`>>> Use this email for dev-login: ${owner.email}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
