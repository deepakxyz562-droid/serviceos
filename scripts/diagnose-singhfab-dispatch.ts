import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  // 1. Find tenant info@singhfab.com.au
  const tenantRes = await client.query(`
    SELECT id, name, slug, email, "publicSlug"
    FROM "Tenant"
    WHERE email = 'info@singhfab.com.au' OR slug LIKE '%singhfab%' OR name LIKE '%Singh%';
  `);

  console.log('\n--- 1. Tenant Info ---');
  console.table(tenantRes.rows);

  if (tenantRes.rows.length === 0) {
    console.log('No tenant found matching info@singhfab.com.au');
    await client.end();
    return;
  }

  const tenantId = tenantRes.rows[0].id;

  // 2. Find employees for this tenant
  const empRes = await client.query(`
    SELECT id, name, email, phone, role, status, latitude, longitude, "lastSeenAt", "teamId", "updatedAt"
    FROM "Employee"
    WHERE "workspaceId" = '${tenantId}'
    ORDER BY name ASC;
  `);

  console.log(`\n--- 2. Employees for Tenant (${tenantId}) ---`);
  console.table(empRes.rows);

  // 3. Find jobs for this tenant
  const jobsRes = await client.query(`
    SELECT id, "jobNumber", title, status, priority, "assigneeId", "assigneeName", latitude, longitude, "updatedAt"
    FROM "Job"
    WHERE "workspaceId" = '${tenantId}' AND "deletedAt" IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT 10;
  `);

  console.log(`\n--- 3. Jobs for Tenant ---`);
  console.table(jobsRes.rows);

  await client.end();
  console.log('\n🔌 Disconnected.');
}

main();
