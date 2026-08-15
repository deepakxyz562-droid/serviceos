import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const res = await client.query(`
    SELECT id, name, email, slug FROM "Tenant"
    WHERE email ILIKE '%singh%' OR email ILIKE '%fab%' OR name ILIKE '%singh%' OR name ILIKE '%fab%'
    LIMIT 10;
  `);
  console.log('Tenants:', res.rows);

  const users = await client.query(`
    SELECT id, email, name, role, "tenantId" FROM "User"
    WHERE email ILIKE '%singh%' OR email ILIKE '%fab%'
    LIMIT 10;
  `);
  console.log('Users:', users.rows);

  await client.end();
}

main();
