import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { resolveEmployee } from '../shift/route';

/**
 * GET /api/employee/jobs?filter=today|upcoming|completed|scheduled|all
 *
 * Lists jobs assigned to the current employee (resolved via JWT employeeId,
 * Employee.userId link, or workspace fallback).
 *
 * Filters:
 *   - today      — scheduled for today (or assigned today with no scheduled date)
 *   - upcoming   — scheduled for a future date
 *   - completed  — status=completed
 *   - scheduled  — scheduled within [from, to] date range (mobile app)
 *   - all        — everything assigned to this employee
 *
 * Pagination: ?limit=50&offset=0 (optional — mobile app uses this)
 *
 * Includes customer + assignee relations and a parsed `lifecycleTimestamps`
 * derived from the job's notificationLogJson (so the UI can render the
 * full timeline: assigned → accepted → travelling → arrived → working → completed).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Pagination support: ?limit=50&offset=0
    // Default: no limit (backwards-compatible — returns all). The mobile app
    // can opt into pagination by sending ?limit=50&offset=0 for faster loads.
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200) : undefined;
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0;

    // Date range for filter=scheduled (mobile app's Schedule screen)
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');

    // Today's window
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      assigneeId: employee.id,
    };

    if (filter === 'today') {
      where.OR = [
        { scheduledAt: { gte: startOfDay, lte: endOfDay } },
        {
          scheduledAt: null,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      ];
      // Exclude completed from "today" list (they go in completed)
      where.status = { not: 'completed' };
    } else if (filter === 'upcoming') {
      where.scheduledAt = { gt: endOfDay };
      where.status = { notIn: ['completed', 'cancelled'] };
    } else if (filter === 'completed') {
      where.status = 'completed';
    } else if (filter === 'scheduled') {
      // Mobile app Schedule screen: jobs within [from, to] date range.
      // Exclude cancelled jobs. If from/to are missing, behaves like 'all'.
      where.status = { not: 'cancelled' };
      if (fromRaw && toRaw) {
        const fromDate = new Date(fromRaw);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(toRaw);
        toDate.setHours(23, 59, 59, 999);
        where.scheduledAt = { gte: fromDate, lte: toDate };
      } else if (fromRaw) {
        const fromDate = new Date(fromRaw);
        fromDate.setHours(0, 0, 0, 0);
        where.scheduledAt = { gte: fromDate };
      }
    }
    // 'all' → no extra filter

    // FIX: Use `select` to drop heavy JSON columns (metadataJson,
    // notificationLogJson) that the list view doesn't need — they can be
    // several KB each and bloat the payload for large job lists. The job
    // detail endpoint (/api/jobs/[id]) still returns them.
    //
    // Also apply pagination when limit is provided.
    const jobs = await db.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        jobNumber: true,
        status: true,
        assignmentStatus: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        actualStartTime: true,
        actualEndTime: true,
        createdAt: true,
        address: true,
        latitude: true,
        longitude: true,
        notes: true,
        internalNotes: true,
        quotedAmount: true,
        estimatedDuration: true,
        priority: true,
        type: true,
        verificationPin: true,
        customerPin: true,
        requiresPin: true,
        notificationLogJson: true, // needed for parseLifecycleTimestamps
        // metadataJson intentionally omitted — too heavy for list view
        assignee: {
          select: { id: true, name: true, phone: true, role: true, status: true, avatar: true, rating: true, completedJobs: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true, address: true },
        },
        resource: true,
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      // FIX: Only add `skip` when offset > 0. The Supabase REST adapter
      // (PostgREST) can error on `skip: 0` in some configurations, and it's
      // a no-op anyway. This also makes the first-page query identical to
      // the PWA's non-paginated query (which works reliably).
      ...(limit ? { take: limit, ...(offset > 0 ? { skip: offset } : {}) } : {}),
    });

    // FIX: Batch the count queries. Previously this did 3 separate COUNT
    // queries PER job (3N+1 total queries). Now we do 3 grouped aggregate
    // queries total (one for photos, one for signatures, one for checklists),
    // then merge the counts in memory. This reduces DB round-trips from
    // 3N+1 to 4, a massive speedup for employees with many jobs.
    const jobIds = jobs.map((j) => j.id);

    const [photoCounts, signatureCounts, checklistCounts] = await Promise.all([
      db.jobPhoto.groupBy({
        by: ['jobId'],
        where: { jobId: { in: jobIds } },
        _count: { _all: true },
      }),
      db.jobSignature.groupBy({
        by: ['jobId'],
        where: { jobId: { in: jobIds } },
        _count: { _all: true },
      }),
      db.jobChecklist.groupBy({
        by: ['jobId'],
        where: { jobId: { in: jobIds } },
        _count: { _all: true },
      }),
    ]);

    // Build lookup maps for O(1) merge
    const photoMap = new Map(photoCounts.map((r) => [r.jobId, r._count._all]));
    const sigMap = new Map(signatureCounts.map((r) => [r.jobId, r._count._all]));
    const checklistMap = new Map(checklistCounts.map((r) => [r.jobId, r._count._all]));

    // Batch-fetch service names for jobs that have a serviceId.
    // The Job model stores `serviceId` as a scalar (no Prisma relation),
    // so we look up Service records separately and merge in memory —
    // same pattern as the count queries above.
    const serviceIds = [
      ...new Set(
        jobs.map((j) => (j as { serviceId?: string | null }).serviceId).filter(Boolean) as string[]
      ),
    ];
    const services =
      serviceIds.length > 0
        ? await db.service.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true, name: true, basePrice: true, duration: true, icon: true },
          })
        : [];
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Enrich with lifecycle state + timestamps + counts + service (in-memory)
    const enriched = jobs.map((job) => {
      const lifecycleTimestamps = parseLifecycleTimestamps(job.notificationLogJson);
      const lifecycleState = deriveLifecycleState(job, lifecycleTimestamps);
      const serviceId = (job as { serviceId?: string | null }).serviceId;
      const service = serviceId ? serviceMap.get(serviceId) ?? null : null;

      return {
        ...job,
        lifecycleTimestamps,
        lifecycleState,
        service,
        _counts: {
          photos: photoMap.get(job.id) ?? 0,
          signatures: sigMap.get(job.id) ?? 0,
          checklists: checklistMap.get(job.id) ?? 0,
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    // Log the FULL error (including Prisma code + message) so server logs
    // show exactly what failed. The generic 'Failed to fetch jobs' message
    // is returned to the client for security.
    const err = error as { code?: string; message?: string; stack?: string };
    console.error('[employee/jobs GET] error:', {
      code: err?.code,
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
    });
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface LifecycleEntry {
  action: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface LifecycleTimestamps {
  assigned?: string;
  accepted?: string;
  travelling?: string;
  arrived?: string;
  working?: string;
  paused?: string;
  resumed?: string;
  completed?: string;
}

function parseLifecycleTimestamps(notificationLogJson: string): LifecycleTimestamps {
  const out: LifecycleTimestamps = {};
  try {
    const parsed = JSON.parse(notificationLogJson || '[]') as LifecycleEntry[];
    if (!Array.isArray(parsed)) return out;
    for (const entry of parsed) {
      const ts =
        typeof entry.timestamp === 'string'
          ? entry.timestamp
          : undefined;
      if (!ts) continue;
      const action = String(entry.action || '').toLowerCase();
      // FIX (Q1.5): Do NOT "keep first" — for pause/resume we want the LATEST
      // event so multi-cycle pause→resume→pause→resume resolves correctly.
      // The previous `if (action in out) continue;` guard was buggy (it
      // checked action names against stage keys, which never matched) AND
      // would have prevented correct multi-cycle resolution if it had matched.
      if (action === 'assigned') out.assigned = ts;
      else if (action === 'accepted') out.accepted = ts;
      else if (action === 'start_travel' || action === 'travelling' || action === 'started' || action === 'en_route')
        out.travelling = ts;
      else if (action === 'arrive' || action === 'arrived') out.arrived = ts;
      else if (action === 'start_work' || action === 'working') out.working = ts;
      else if (action === 'pause' || action === 'paused') out.paused = ts;
      else if (action === 'resume' || action === 'resumed') out.resumed = ts;
      else if (action === 'complete' || action === 'completed') out.completed = ts;
    }
  } catch {
    // ignore
  }
  return out;
}

function deriveLifecycleState(
  job: { status: string; actualStartTime?: Date | null; completedAt?: Date | null; assignmentStatus?: string | null },
  ts: LifecycleTimestamps,
): string {
  if (job.status === 'completed' || job.completedAt) return 'completed';
  // FIX (Q1.5): Correctly resolve working vs paused across multi-cycle
  // pause/resume. If the most recent pause/resume event was a resume
  // (i.e. resumed > paused), the job is working again. ISO 8601 timestamps
  // compare lexicographically, so a simple string comparison is safe.
  if (ts.working) {
    if (ts.resumed && (!ts.paused || ts.resumed > ts.paused)) return 'working';
    if (ts.paused) return 'paused';
    return 'working';
  }
  if (ts.arrived) return 'arrived';
  if (ts.travelling) return 'travelling';
  if (ts.accepted || job.assignmentStatus === 'accepted') return 'accepted';
  return 'assigned';
}
