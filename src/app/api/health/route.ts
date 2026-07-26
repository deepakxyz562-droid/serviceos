import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withRequestId } from '@/lib/logger'

/**
 * Lightweight health-check endpoint for load balancers and uptime monitors.
 *
 * Design notes:
 *  - Always returns HTTP 200 (unless the Node process itself is gone, in which
 *    case the LB sees a connection failure — the correct signal). The `db`
 *    field tells the LB/ops team whether the database is reachable, but a
 *    degraded DB should NOT cause the LB to drain this instance — the app may
 *    still serve cached/static routes and the LB has no other target.
 *  - `force-dynamic` + `Cache-Control: no-store` so the LB never sees a stale
 *    cached 200 from a previous boot.
 *  - The DB probe is a single `SELECT 1` — must complete in <100ms even on
 *    a cold Neon/Supabase pool. Failures are caught and reported, never thrown.
 *  - `runtime = 'nodejs'` because we use `process.uptime()` and Prisma's
 *    `$queryRaw` tagged template (both unavailable in the Edge runtime).
 *  - Emits a structured pino log line tagged with the request ID so that
 *    LB probes can be correlated in the log aggregator.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const log = withRequestId(request)

  // DB probe — single round-trip, swallow all errors.
  let dbStatus: 'connected' | 'disconnected' = 'disconnected'
  try {
    await db.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (err) {
    // Keep `disconnected` — do NOT throw. LB still needs 200.
    log.warn({ err }, 'Health check: DB probe failed')
  }

  log.info({ db: dbStatus, uptime: Math.round(process.uptime()) }, 'Health check')

  const body = {
    status: 'ok',
    service: 'serviceos',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()), // seconds, integer for compactness
    runtime: 'nodejs',
    db: dbStatus,
  }

  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
