import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { resolveEmployee } from '../shift/route';

/**
 * GET /api/employee/jobs?filter=today|upcoming|completed|all
 *
 * Lists jobs assigned to the current employee (resolved via JWT employeeId,
 * Employee.userId link, or workspace fallback).
 *
 * Filters:
 *   - today      — scheduled for today (or assigned today with no scheduled date)
 *   - upcoming   — scheduled for a future date
 *   - completed  — status=completed
 *   - all        — everything assigned to this employee
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
    }
    // 'all' → no extra filter

    const jobs = await db.job.findMany({
      where,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });

    // Parse lifecycle timestamps from notificationLogJson + add count of
    // JobPhoto / JobSignature / JobChecklist for quick UI display.
    const enriched = await Promise.all(
      jobs.map(async (job) => {
        const lifecycleTimestamps = parseLifecycleTimestamps(job.notificationLogJson);
        const lifecycleState = deriveLifecycleState(job, lifecycleTimestamps);

        const [photoCount, signatureCount, checklistCount] = await Promise.all([
          db.jobPhoto.count({ where: { jobId: job.id } }),
          db.jobSignature.count({ where: { jobId: job.id } }),
          db.jobChecklist.count({ where: { jobId: job.id } }),
        ]);

        return {
          ...job,
          lifecycleTimestamps,
          lifecycleState,
          _counts: {
            photos: photoCount,
            signatures: signatureCount,
            checklists: checklistCount,
          },
        };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('[employee/jobs GET] error:', error);
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
      if (action in out) continue; // keep first
      if (action === 'assigned') out.assigned = ts;
      else if (action === 'accepted') out.accepted = ts;
      else if (action === 'start_travel' || action === 'travelling' || action === 'started' || action === 'en_route')
        out.travelling = ts;
      else if (action === 'arrive' || action === 'arrived') out.arrived = ts;
      else if (action === 'start_work' || action === 'working') out.working = ts;
      else if (action === 'pause' || action === 'paused') out.paused = ts;
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
  if (ts.working) return ts.paused ? 'paused' : 'working';
  if (ts.arrived) return 'arrived';
  if (ts.travelling) return 'travelling';
  if (ts.accepted || job.assignmentStatus === 'accepted') return 'accepted';
  return 'assigned';
}
