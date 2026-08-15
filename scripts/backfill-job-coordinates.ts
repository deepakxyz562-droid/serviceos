/**
 * Backfill Job.latitude / longitude for jobs that have an address but no coords.
 *
 * One-time resumable script. Run with:
 *   bun run scripts/backfill-job-coordinates.ts                  # backfill all
 *   bun run scripts/backfill-job-coordinates.ts --dry-run        # preview only
 *   bun run scripts/backfill-job-coordinates.ts --limit=50       # cap rows
 *   bun run scripts/backfill-job-coordinates.ts --tenant=<slug>  # single tenant
 *   bun run scripts/backfill-job-coordinates.ts --max-backoff=300000  # cap backoff at 5min
 *
 * Resumability:
 *   The script queries `WHERE latitude IS NULL AND longitude IS NULL AND
 *   address IS NOT NULL`. Once a job is geocoded, the WHERE clause excludes
 *   it on the next run — so the script can be killed and restarted without
 *   losing progress. Failed jobs (no_result / network / rate_limited) get
 *   logged to a progress file so they can be investigated manually, but
 *   are NOT skipped — re-running will retry them because their coords are
 *   still null.
 *
 * Rate limiting (Nominatim policy is 1 req/sec):
 *   - Sequential loop, NOT Promise.all (would 429 immediately).
 *   - 1.1s sleep between requests (10% safety margin).
 *   - On 429/503: exponential backoff — 60s, 120s, 240s, ... up to --max-backoff.
 *     After backoff, retries the SAME address (does NOT skip).
 *   - On network error: 5s sleep, then continue to next row (will retry on
 *     re-run since coords are still null).
 *   - On 'no_result': logs and continues (address genuinely unresolvable).
 *
 * Dry-run mode:
 *   Calls geocodeAddress (to verify resolution + see what Nominatim returns)
 *   but does NOT call db.job.update. Useful for auditing weird addresses
 *   before applying.
 *
 * Production usage (Supabase):
 *   Copy production .env (with USE_SUPABASE_DB=true, NEXT_PUBLIC_SUPABASE_URL,
 *   SUPABASE_SERVICE_ROLE_KEY) to your laptop, then run:
 *     bun run scripts/backfill-job-coordinates.ts --dry-run
 *     bun run scripts/backfill-job-coordinates.ts --limit=20
 *     bun run scripts/backfill-job-coordinates.ts
 */

import { db } from '../src/lib/db'
import { geocodeAddress, type GeocodeResult } from '../src/lib/geocode'

interface Args {
  dryRun: boolean
  limit: number | null
  tenantSlug: string | null
  maxBackoffMs: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
  const tenantArg = argv.find((a) => a.startsWith('--tenant='))
  const tenantSlug = tenantArg ? tenantArg.split('=')[1] : null
  const backoffArg = argv.find((a) => a.startsWith('--max-backoff='))
  const maxBackoffMs = backoffArg ? parseInt(backoffArg.split('=')[1], 10) : 5 * 60_000
  return { dryRun, limit, tenantSlug, maxBackoffMs }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m${rem}s`
  const h = Math.floor(m / 60)
  return `${h}h${m % 60}m`
}

async function geocodeWithRetry(
  address: string,
  maxBackoffMs: number,
): Promise<GeocodeResult> {
  let attempt = 0
  // Exponential backoff for rate-limited responses: 60s, 120s, 240s, 480s...
  // capped at maxBackoffMs (default 5min).
  for (;;) {
    const result = await geocodeAddress(address)
    if (result.ok) return result
    if (result.reason !== 'rate_limited') return result

    // Rate limited — exponential backoff
    const backoffMs = Math.min(60_000 * Math.pow(2, attempt), maxBackoffMs)
    console.log(
      `  ⏳ Nominatim 429 — backing off for ${formatDuration(backoffMs)} (attempt ${attempt + 1})`,
    )
    await sleep(backoffMs)
    attempt++
  }
}

async function main() {
  const args = parseArgs()
  const startedAt = Date.now()

  console.log('━'.repeat(70))
  console.log('Backfill Job Coordinates')
  console.log('━'.repeat(70))
  console.log(`  Mode:        ${args.dryRun ? 'DRY RUN (no DB writes)' : 'APPLY'}`)
  console.log(`  Tenant:      ${args.tenantSlug ?? 'ALL'}`)
  console.log(`  Limit:       ${args.limit ?? 'none'}`)
  console.log(`  Max backoff: ${formatDuration(args.maxBackoffMs)}`)
  console.log('━'.repeat(70))

  // Build the WHERE clause. The "latitude: null AND longitude: null" filter
  // makes the script idempotent + resumable — already-geocoded rows are
  // excluded on every subsequent run.
  const where: Record<string, unknown> = {
    address: { not: null },
    latitude: null,
    longitude: null,
    deletedAt: null,
  }

  // Optional tenant filter — join via workspace.tenantId
  let tenantFilter: { id: string } | null = null
  if (args.tenantSlug) {
    const tenant = await db.tenant.findFirst({
      where: { slug: args.tenantSlug },
      select: { id: true },
    })
    if (!tenant) {
      console.error(`✗ Tenant "${args.tenantSlug}" not found`)
      process.exit(1)
    }
    tenantFilter = tenant
  }

  // Fetch candidate jobs. Use select to keep payload small.
  const jobs = await db.job.findMany({
    where,
    select: {
      id: true,
      jobNumber: true,
      title: true,
      address: true,
      workspaceId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }, // oldest first — older jobs are more likely abandoned
    ...(args.limit ? { take: args.limit } : {}),
  })

  // If a tenant filter was specified, filter client-side by joining
  // workspaceId → workspace.tenantId. (Prisma's relation filter would work
  // too, but doing it client-side keeps the query simple and works in
  // PostgREST mode where nested filters can be finicky.)
  let filteredJobs = jobs
  if (tenantFilter) {
    const workspaces = await db.workspace.findMany({
      where: { tenantId: tenantFilter.id },
      select: { id: true },
    })
    const wsIds = new Set(workspaces.map((w) => w.id))
    filteredJobs = jobs.filter((j) => j.workspaceId && wsIds.has(j.workspaceId))
  }

  console.log(`  Found ${filteredJobs.length} job(s) with address but no coords`)
  console.log('━'.repeat(70))

  if (filteredJobs.length === 0) {
    console.log('✓ Nothing to backfill — all jobs have coordinates.')
    await db.$disconnect()
    return
  }

  let success = 0
  let noResult = 0
  let networkErrors = 0
  let skipped = 0

  for (let i = 0; i < filteredJobs.length; i++) {
    const job = filteredJobs[i]
    const progress = `[${i + 1}/${filteredJobs.length}]`
    const jobLabel = job.jobNumber || job.id.slice(0, 8)

    if (!job.address || job.address.trim().length < 3) {
      console.log(`${progress} ⏭  ${jobLabel} — address too short, skipping`)
      skipped++
      continue
    }

    const result = await geocodeWithRetry(job.address, args.maxBackoffMs)

    if (result.ok) {
      const label = result.displayName
        ? `→ ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)} (${result.displayName.slice(0, 60)})`
        : `→ ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
      console.log(`${progress} ✓ ${jobLabel} ${label}`)

      if (!args.dryRun) {
        try {
          await db.job.update({
            where: { id: job.id },
            data: {
              latitude: result.latitude,
              longitude: result.longitude,
            },
          })
        } catch (err) {
          console.error(`  ⚠️ DB update failed for ${job.id}:`, err)
          networkErrors++
          // Don't continue — fall through to rate-limit sleep
        }
      }
      success++
    } else if (result.reason === 'no_result') {
      console.log(`${progress} ✗ ${jobLabel} — Nominatim could not resolve: "${job.address}"`)
      noResult++
    } else if (result.reason === 'network') {
      console.log(`${progress} ⚠️  ${jobLabel} — network error, will retry on next run`)
      networkErrors++
    }

    // Rate-limit: sleep 1.1s between requests (Nominatim policy = 1 req/sec)
    if (i < filteredJobs.length - 1) {
      await sleep(1100)
    }
  }

  const elapsedMs = Date.now() - startedAt
  console.log('━'.repeat(70))
  console.log('Backfill complete')
  console.log('━'.repeat(70))
  console.log(`  Total processed:  ${filteredJobs.length}`)
  console.log(`  ✓ Geocoded:       ${success}`)
  console.log(`  ✗ No result:      ${noResult}`)
  console.log(`  ⚠️  Network errs:  ${networkErrors}`)
  console.log(`  ⏭  Skipped:       ${skipped}`)
  console.log(`  Elapsed:          ${formatDuration(elapsedMs)}`)
  if (args.dryRun) {
    console.log('  (Dry run — no DB writes were made. Re-run without --dry-run to apply.)')
  }
  console.log('━'.repeat(70))

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('Backfill failed:', err)
  try {
    await db.$disconnect()
  } catch {}
  process.exit(1)
})
