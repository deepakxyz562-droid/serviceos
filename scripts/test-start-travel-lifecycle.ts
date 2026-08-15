import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const xyzEmpId = 'I58eXzN1qCZMHo3RFhfM08RbT'; // xyz@gmail.com
  const jobId = 'VvBUjiH7Z0-TZQ7W7PHdPE2YX'; // live disptach job

  const now = new Date().toISOString();

  // Simulate start_travel action updating Employee record
  await client.query(`
    UPDATE "Employee"
    SET "lastSeenAt" = '${now}',
        "lastLocationAt" = '${now}',
        status = 'en_route',
        "currentJobId" = '${jobId}',
        latitude = 25.603,
        longitude = 85.075
    WHERE id = '${xyzEmpId}';
  `);

  console.log(`✅ Simulated start_travel action! Updated Employee lastSeenAt to ${now}`);

  const res = await client.query(`
    SELECT id, name, email, status, latitude, longitude, "lastSeenAt", "currentJobId"
    FROM "Employee"
    WHERE id = '${xyzEmpId}';
  `);

  console.table(res.rows);
  await client.end();
}

main();
