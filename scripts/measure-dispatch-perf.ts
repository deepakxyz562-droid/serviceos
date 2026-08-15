import { Client } from 'pg';

const connectionString = "postgresql://postgres:%24Mahadev%40123%23@db.rmzaxqxzultxetlgsgic.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🔌 Connected to Supabase PostgreSQL database.');

  console.log('\n======================================================================');
  console.log('📊 MEASURING LIVE DISPATCH PAGE QUERY PERFORMANCE (COLD vs WARM)');
  console.log('======================================================================\n');

  // Query 1: Active & Pending Jobs for Dispatch Map (lat/lng, assignee, status)
  const jobsSql = `
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, "jobNumber", title, description, status, priority, type, address,
           "scheduledAt", "scheduledTime", "customerName", "customerPhone",
           "assigneeId", "assigneeName", "assigneePhone", latitude, longitude,
           "createdAt", "updatedAt"
    FROM "Job"
    WHERE "deletedAt" IS NULL
      AND status IN ('pending', 'assigned', 'in_progress', 'en_route', 'scheduled')
    ORDER BY "createdAt" DESC
    LIMIT 100;
  `;

  const coldJobs = await client.query(jobsSql);
  const coldJobsLines = coldJobs.rows.map(r => r['QUERY PLAN']);
  const coldJobsExec = coldJobsLines.find(l => l.includes('Execution Time:'));
  const warmJobs = await client.query(jobsSql);
  const warmJobsLines = warmJobs.rows.map(r => r['QUERY PLAN']);
  const warmJobsExec = warmJobsLines.find(l => l.includes('Execution Time:'));

  console.log(`📌 1. Dispatch Jobs Fetch Query`);
  console.log(`   Cold Execution Time: ${coldJobsExec ? coldJobsExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Warm Execution Time: ${warmJobsExec ? warmJobsExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Plan: ${coldJobsLines[0]}\n`);

  // Query 2: Employee Fleet Roster + GPS + Team Metadata
  const empSql = `
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, name, phone, email, role, status, skills, rating, "completedJobs",
           location, latitude, longitude, avatar, "lastSeenAt", "currentJobId",
           "onLeaveUntil", "teamId"
    FROM "Employee"
    ORDER BY name ASC;
  `;

  const coldEmp = await client.query(empSql);
  const coldEmpLines = coldEmp.rows.map(r => r['QUERY PLAN']);
  const coldEmpExec = coldEmpLines.find(l => l.includes('Execution Time:'));
  const warmEmp = await client.query(empSql);
  const warmEmpLines = warmEmp.rows.map(r => r['QUERY PLAN']);
  const warmEmpExec = warmEmpLines.find(l => l.includes('Execution Time:'));

  console.log(`📌 2. Dispatch Employee Fleet Roster Query`);
  console.log(`   Cold Execution Time: ${coldEmpExec ? coldEmpExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Warm Execution Time: ${warmEmpExec ? warmEmpExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Plan: ${coldEmpLines[0]}\n`);

  // Query 3: Teams List
  const teamSql = `
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, name, color, description, "createdAt"
    FROM "Team"
    ORDER BY name ASC;
  `;

  const coldTeam = await client.query(teamSql);
  const coldTeamLines = coldTeam.rows.map(r => r['QUERY PLAN']);
  const coldTeamExec = coldTeamLines.find(l => l.includes('Execution Time:'));
  const warmTeam = await client.query(teamSql);
  const warmTeamLines = warmTeam.rows.map(r => r['QUERY PLAN']);
  const warmTeamExec = warmTeamLines.find(l => l.includes('Execution Time:'));

  console.log(`📌 3. Workspace Teams List Query`);
  console.log(`   Cold Execution Time: ${coldTeamExec ? coldTeamExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Warm Execution Time: ${warmTeamExec ? warmTeamExec.split('Execution Time:')[1].trim() : 'N/A'}`);
  console.log(`   Plan: ${coldTeamLines[0]}\n`);

  await client.end();
  console.log('🔌 Disconnected.');
}

main();
