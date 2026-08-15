/**
 * Standalone diagnostic for the live-tracking job + employee GPS state.
 *
 * Verifies the exact data the new 5s polling will read, so we can confirm
 * the "live tracking" job has geocoded lat/lng (end-point marker + auto-zoom
 * need it) and that the employee's lastSeenAt/position is actively updating.
 *
 * Run with:  bun run scripts/check-live-tracking.ts
 */
import { config } from 'dotenv';
config();
import { db } from '../src/lib/db';

async function main() {
  console.log('🩺 Live Tracking Diagnostic (Supabase)');
  console.log('   URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('   USE_SUPABASE_DB:', process.env.USE_SUPABASE_DB);
  console.log('');

  // ── 1. Find xyz@gmail.com employee ─────────────────────────────
  console.log('━━━ 1. Employee xyz@gmail.com ━━━');
  const emp = await db.employee.findFirst({
    where: { email: 'xyz@gmail.com' },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastSeenAt: true,
      latitude: true,
      longitude: true,
      currentJobId: true,
      workspaceId: true,
      userId: true,
    },
  });
  if (!emp) {
    console.log('  ❌ Employee xyz@gmail.com NOT FOUND');
    return;
  }
  const lastSeenAge = emp.lastSeenAt
    ? Math.round((Date.now() - new Date(emp.lastSeenAt as string).getTime()) / 1000)
    : null;
  console.log('  ✅ Found:', emp.name, '| status:', emp.status);
  console.log('     id:', emp.id);
  console.log('     lastSeenAt:', emp.lastSeenAt, lastSeenAge != null ? `(${lastSeenAge}s ago)` : '(null)');
  console.log('     pos:', emp.latitude, emp.longitude);
  console.log('     currentJobId:', emp.currentJobId);
  console.log('     workspaceId:', emp.workspaceId);
  console.log('     userId:', emp.userId);

  // ── 2. Find the "live tracking" job (and all travelling jobs) ──
  console.log('\n━━━ 2. Travelling jobs in scope ━━━');
  const travellingJobs = await db.job.findMany({
    where: { status: 'travelling' },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      address: true,
      latitude: true,
      longitude: true,
      assigneeId: true,
      assigneeName: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 20,
  });
  console.log(`  Found ${travellingJobs.length} travelling job(s):`);
  for (const j of travellingJobs) {
    const hasCoords = j.latitude != null && j.longitude != null;
    console.log(`  - "${j.title}" | id=${j.id}`);
    console.log(`      assigneeId=${j.assigneeId ?? 'null'} | assigneeName=${j.assigneeName ?? 'null'}`);
    console.log(`      address="${j.address ?? 'null'}"`);
    console.log(`      lat/lng=${j.latitude}, ${j.longitude} ${hasCoords ? '✅' : '❌ MISSING (no end-point marker!)'}`);
    console.log(`      updated=${j.updatedAt}`);
  }

  // ── 3. Active RouteHistory for the employee ────────────────────
  console.log('\n━━━ 3. Active RouteHistory for xyz@gmail.com ━━━');
  const activeRoutes = await db.routeHistory.findMany({
    where: { employeeId: emp.id, status: 'in_progress' },
    orderBy: { startedAt: 'desc' },
    take: 3,
    select: {
      id: true,
      jobId: true,
      status: true,
      startedAt: true,
      startLat: true,
      startLng: true,
      endLat: true,
      endLng: true,
      distanceMeters: true,
      durationMinutes: true,
      pathJson: true,
    },
  });
  console.log(`  Found ${activeRoutes.length} active route(s):`);
  for (const r of activeRoutes) {
    let pathLen = 0;
    let firstPt: any = null;
    let lastPt: any = null;
    try {
      const raw = r.pathJson as unknown;
      const arr = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
      pathLen = arr.length;
      firstPt = arr[0];
      lastPt = arr[arr.length - 1];
    } catch {
      // ignore
    }
    const startedAge = r.startedAt
      ? Math.round((Date.now() - new Date(r.startedAt as string).getTime()) / 1000)
      : null;
    console.log(`  - routeId=${r.id}`);
    console.log(`      jobId=${r.jobId}`);
    console.log(`      startedAt=${r.startedAt} ${startedAge != null ? `(${startedAge}s ago)` : ''}`);
    console.log(`      start=(${r.startLat}, ${r.startLng})`);
    console.log(`      end=(${r.endLat}, ${r.endLng})`);
    console.log(`      pathJson points=${pathLen}`);
    if (firstPt) console.log(`      first point=(${firstPt.lat}, ${firstPt.lng})`);
    if (lastPt) console.log(`      last point=(${lastPt.lat}, ${lastPt.lng})`);
    console.log(`      distance=${r.distanceMeters}m | duration=${r.durationMinutes}min`);
  }

  // ── 4. Recent GPS pings for the employee ───────────────────────
  console.log('\n━━━ 4. Recent GPS pings for xyz@gmail.com (last 10) ━━━');
  const recentGps = await db.gPSLocation.findMany({
    where: { employeeId: emp.id },
    orderBy: { capturedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      jobId: true,
      latitude: true,
      longitude: true,
      capturedAt: true,
      accuracy: true,
      isMoving: true,
    },
  });
  console.log(`  Found ${recentGps.length} recent ping(s):`);
  for (const g of recentGps) {
    const age = g.capturedAt
      ? Math.round((Date.now() - new Date(g.capturedAt as string).getTime()) / 1000)
      : null;
    console.log(`  - (${g.latitude}, ${g.longitude}) | job=${g.jobId?.slice(-8) ?? 'null'} | ${age}s ago | moving=${g.isMoving} | acc=${g.accuracy ? Math.round(g.accuracy as number) + 'm' : 'null'}`);
  }

  // ── 5. Summary ─────────────────────────────────────────────────
  console.log('\n━━━ 5. Live-tracking readiness summary ━━━');
  const hasJob = travellingJobs.length > 0;
  const empHasCoords = emp.latitude != null && emp.longitude != null;
  const jobWithCoords = travellingJobs.find((j) => j.latitude != null && j.longitude != null);
  const routeWithStart = activeRoutes.find((r) => r.startLat != null && r.startLng != null);
  const empRecentlySeen = lastSeenAge != null && lastSeenAge < 120;
  console.log(`  Employee pinging (lastSeen < 2min):  ${empRecentlySeen ? '✅' : '❌'} ${lastSeenAge}s ago`);
  console.log(`  Employee has coords:                  ${empHasCoords ? '✅' : '❌'}`);
  console.log(`  Travelling job exists:                ${hasJob ? '✅' : '❌'}`);
  console.log(`  Travelling job has geocoded lat/lng:  ${jobWithCoords ? '✅' : '❌'} ← end-point marker needs this`);
  console.log(`  Active route has start coords:        ${routeWithStart ? '✅' : '❌'} ← start-point marker + auto-zoom need this`);
  console.log('');
  if (empRecentlySeen && empHasCoords && jobWithCoords && routeWithStart) {
    console.log('  🎉 ALL CONDITIONS MET — live tracking will work once the new polling code is deployed.');
  } else {
    console.log('  ⚠️  Some conditions not met — see above.');
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
}).finally(() => process.exit(0));
