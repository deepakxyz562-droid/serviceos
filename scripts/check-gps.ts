import { db } from '../src/lib/db'

async function main() {
  // 1. Count GPS pings
  const gpsCount = await db.gPSLocation.count()
  console.log(`Total GPSLocation records: ${gpsCount}`)

  // 2. Most recent 8 GPS pings
  const recentGps = await db.gPSLocation.findMany({
    take: 8,
    orderBy: { capturedAt: 'desc' },
    select: { id: true, employeeId: true, jobId: true, latitude: true, longitude: true, capturedAt: true, isMoving: true, accuracy: true }
  })
  console.log('\nMost recent 8 GPS pings:')
  for (const g of recentGps) {
    const ageMs = Date.now() - g.capturedAt.getTime()
    const emp = await db.employee.findUnique({ where: { id: g.employeeId }, select: { name: true } })
    console.log(`  - ${g.id.slice(-10)} | emp=${emp?.name ?? g.employeeId.slice(-8)} | job=${g.jobId?.slice(-8) ?? 'none'} | (${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}) | ${Math.round(ageMs/1000)}s ago | moving=${g.isMoving} | acc=${g.accuracy ? Math.round(g.accuracy) + 'm' : 'null'}`)
  }

  // 3. Active RouteHistory records (in_progress)
  const activeRoutes = await db.routeHistory.findMany({
    where: { status: 'in_progress' },
    take: 5,
    orderBy: { startedAt: 'desc' },
    select: { id: true, employeeId: true, jobId: true, startedAt: true, startLat: true, startLng: true, endLat: true, endLng: true, distanceMeters: true, durationMinutes: true, pathJson: true }
  })
  console.log(`\nActive (in_progress) routes: ${activeRoutes.length}`)
  for (const r of activeRoutes) {
    const path = JSON.parse(r.pathJson || '[]')
    const emp = await db.employee.findUnique({ where: { id: r.employeeId }, select: { name: true } })
    console.log(`  - ${r.id.slice(-10)} | emp=${emp?.name ?? r.employeeId.slice(-8)} | job=${r.jobId?.slice(-8) ?? 'none'} | path points: ${path.length} | dist=${Math.round(r.distanceMeters)}m | dur=${r.durationMinutes}min`)
    if (path.length > 0) {
      console.log(`    first: (${path[0].lat.toFixed(4)}, ${path[0].lng.toFixed(4)}) | last: (${path[path.length-1].lat.toFixed(4)}, ${path[path.length-1].lng.toFixed(4)})`)
    }
  }

  // 4. All completed routes too
  const completedRoutes = await db.routeHistory.count({ where: { status: 'completed' } })
  console.log(`\nCompleted routes: ${completedRoutes}`)
  console.log(`Total RouteHistory records: ${await db.routeHistory.count()}`)

  // 5. Employees with recent lastSeenAt (online techs)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  const onlineEmps = await db.employee.findMany({
    where: { lastSeenAt: { gte: fiveMinAgo } },
    select: { id: true, name: true, lastSeenAt: true, latitude: true, longitude: true, status: true, currentJobId: true }
  })
  console.log(`\nEmployees seen in last 5 min (online): ${onlineEmps.length}`)
  for (const e of onlineEmps) {
    const ageSec = Math.round((Date.now() - e.lastSeenAt!.getTime())/1000)
    console.log(`  - ${e.name} | status=${e.status} | lastSeen ${ageSec}s ago | pos=(${e.latitude?.toFixed(4) ?? 'null'}, ${e.longitude?.toFixed(4) ?? 'null'}) | currentJob=${e.currentJobId?.slice(-8) ?? 'none'}`)
  }

  // 6. Total employees (for context)
  const totalEmps = await db.employee.count()
  console.log(`\nTotal employees in DB: ${totalEmps}`)
}

main().catch(console.error).finally(() => process.exit(0))
