import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  const workspaceId = '29bAOZ3VpdULurndS7D-bX7BX'; // Singh Fabrication
  const xyzEmpId = 'I58eXzN1qCZMHo3RFhfM08RbT'; // xyz@gmail.com employee

  // 1. Check if jobs exist for this workspace
  const jobsRes = await client.query(`
    SELECT id, title, status, "assigneeId", latitude, longitude
    FROM "Job"
    WHERE "workspaceId" = '${workspaceId}' AND "deletedAt" IS NULL
    LIMIT 5;
  `);

  let jobId: string;

  if (jobsRes.rows.length === 0) {
    // Create a sample job with destination lat/lng near the mobile employee's live location (25.60, 85.07)
    const newJob = await client.query(`
      INSERT INTO "Job" (
        id, "workspaceId", title, description, status, priority, type,
        address, latitude, longitude, "assigneeId", "assigneeName", "assigneePhone",
        "createdAt", "updatedAt"
      ) VALUES (
        'job-singhfab-xyz-1',
        '${workspaceId}',
        'Custom Steel Fabrication & On-Site Installation',
        'On-site welding and fabrication installation for commercial client.',
        'en_route',
        'high',
        'installation',
        'Boring Road, Patna, BR 800001',
        25.6120,
        85.1234,
        '${xyzEmpId}',
        'xyz',
        '+918505945123',
        NOW(),
        NOW()
      )
      RETURNING id;
    `);
    jobId = newJob.rows[0].id;
    console.log(`✅ Created active job ${jobId} assigned to xyz@gmail.com`);
  } else {
    jobId = jobsRes.rows[0].id;
    await client.query(`
      UPDATE "Job"
      SET "assigneeId" = '${xyzEmpId}',
          "assigneeName" = 'xyz',
          "assigneePhone" = '+918505945123',
          status = 'en_route',
          latitude = 25.6120,
          longitude = 85.1234,
          "updatedAt" = NOW()
      WHERE id = '${jobId}';
    `);
    console.log(`✅ Updated job ${jobId} to status en_route assigned to xyz@gmail.com`);
  }

  // Update employee status to en_route & link currentJobId
  await client.query(`
    UPDATE "Employee"
    SET status = 'en_route',
        "currentJobId" = '${jobId}',
        "lastSeenAt" = NOW()
    WHERE id = '${xyzEmpId}';
  `);

  console.log(`✅ Updated xyz@gmail.com employee record with active job link ${jobId}`);

  await client.end();
  console.log('🔌 Disconnected.');
}

main();
