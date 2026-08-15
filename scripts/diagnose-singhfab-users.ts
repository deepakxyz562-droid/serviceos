import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const tenantId = 'q3ELcE45UhpTCjg-MsvI1aHfP';

  const usersRes = await client.query(`
    SELECT id, name, email, role, "workspaceId", "createdAt"
    FROM "User"
    WHERE "workspaceId" = '${tenantId}' OR email ILIKE '%singhfab%';
  `);

  console.log('\n--- Users for Singh Fabrication Workspace ---');
  console.table(usersRes.rows);

  const empRes = await client.query(`
    SELECT id, name, email, phone, role, status, latitude, longitude, "lastSeenAt", "workspaceId"
    FROM "Employee"
    WHERE "workspaceId" = '${tenantId}' OR email ILIKE '%singhfab%';
  `);

  console.log('\n--- Employees for Singh Fabrication Workspace ---');
  console.table(empRes.rows);

  await client.end();
  console.log('🔌 Disconnected.');
}

main();
