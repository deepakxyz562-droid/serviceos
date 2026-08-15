import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const empId = 'kfYF9bpf1nxd_vecsZKOINYUk'; // xyz employee
  const now = new Date().toISOString();

  // Melbourne/Sydney sample coordinates for Singh Fabrication
  const lat = -37.8136;
  const lng = 144.9631;

  const res = await client.query(`
    UPDATE "Employee"
    SET latitude = ${lat},
        longitude = ${lng},
        "lastSeenAt" = '${now}',
        "lastLocationAt" = '${now}',
        status = 'en_route'
    WHERE id = '${empId}';
  `);

  console.log(`✅ Updated ${res.rowCount} employee(s) for Singh Fabrication. Lat: ${lat}, Lng: ${lng}`);

  // Create initial GPSLocation record
  await client.query(`
    INSERT INTO "GPSLocation" (id, "tenantId", "employeeId", latitude, longitude, "capturedAt", "updatedAt")
    VALUES ('gps-singhfab-xyz-1', 'q3ELcE45UhpTCjg-MsvI1aHfP', '${empId}', ${lat}, ${lng}, '${now}', '${now}')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✅ Created GPSLocation ping for xyz employee');

  await client.end();
  console.log('🔌 Disconnected.');
}

main();
