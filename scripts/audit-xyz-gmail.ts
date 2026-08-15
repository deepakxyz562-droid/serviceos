import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const users = await client.query(`
    SELECT id, name, email, role, "workspaceId", "tenantId"
    FROM "User"
    WHERE email ILIKE '%xyz%' OR email ILIKE '%singhfab%';
  `);
  console.log('\n--- 1. Users matching xyz or singhfab ---');
  console.table(users.rows);

  const emps = await client.query(`
    SELECT id, name, email, phone, role, status, latitude, longitude, "lastSeenAt", "workspaceId"
    FROM "Employee"
    WHERE email ILIKE '%xyz%' OR email ILIKE '%singhfab%';
  `);
  console.log('\n--- 2. Employees matching xyz or singhfab ---');
  console.table(emps.rows);

  // Check how mobile GPS tracking POST /api/gps/track resolves employee ID from user token!
  await client.end();
}

main();
