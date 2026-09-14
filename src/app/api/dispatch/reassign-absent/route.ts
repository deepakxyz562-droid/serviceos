import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { findBestMatch } from '@/lib/smart-dispatch';
import { EventBus } from '@/lib/event-bus';

/**
 * POST /api/dispatch/reassign-absent
 * Batch reassign an absent/sick employee's jobs for today to best matching available technicians.
 *
 * Body:
 * {
 *   absentEmployeeId: string,
 *   reassignments?: Array<{ jobId: string; targetEmployeeId: string; reason?: string }>,
 *   autoMatch?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { absentEmployeeId, reassignments, autoMatch } = body as {
      absentEmployeeId?: string;
      reassignments?: Array<{ jobId: string; targetEmployeeId: string; reason?: string }>;
      autoMatch?: boolean;
    };

    if (!absentEmployeeId) {
      return NextResponse.json({ error: 'absentEmployeeId is required' }, { status: 400 });
    }

    const absentEmployee = await db.employee.findUnique({
      where: { id: absentEmployeeId },
      include: {
        assignedJobs: {
          where: {
            status: { in: ['assigned', 'in_progress', 'scheduled'] },
          },
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            scheduledAt: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!absentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayJobs = absentEmployee.assignedJobs.filter((job) => {
      if (!job.scheduledAt) return true; // unassigned time today
      return new Date(job.scheduledAt).toISOString().slice(0, 10) === todayStr;
    });

    if (todayJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active jobs assigned to this employee for today',
        reassignedCount: 0,
        results: [],
      });
    }

    const executionResults: Array<{
      jobId: string;
      jobTitle: string;
      previousEmployeeId: string;
      newEmployeeId?: string;
      newEmployeeName?: string;
      status: 'reassigned' | 'failed' | 'no_match';
      reason?: string;
    }> = [];

    // Mode A: Explicit reassignments list
    if (Array.isArray(reassignments) && reassignments.length > 0) {
      for (const item of reassignments) {
        try {
          const targetEmp = await db.employee.findUnique({
            where: { id: item.targetEmployeeId },
            select: { id: true, name: true, phone: true },
          });

          if (!targetEmp) {
            executionResults.push({
              jobId: item.jobId,
              jobTitle: item.jobId,
              previousEmployeeId: absentEmployeeId,
              newEmployeeId: item.targetEmployeeId,
              status: 'failed',
              reason: 'Target employee not found',
            });
            continue;
          }

          const updatedJob = await db.job.update({
            where: { id: item.jobId },
            data: {
              assigneeId: targetEmp.id,
              assigneeName: targetEmp.name,
              assigneePhone: targetEmp.phone,
              assignmentStatus: 'assigned',
              status: 'assigned',
              updatedAt: now,
            },
            select: { id: true, title: true },
          });

          executionResults.push({
            jobId: updatedJob.id,
            jobTitle: updatedJob.title,
            previousEmployeeId: absentEmployeeId,
            newEmployeeId: targetEmp.id,
            newEmployeeName: targetEmp.name,
            status: 'reassigned',
            reason: item.reason || 'Technician absent/sick rebalance',
          });

          EventBus.emit('job:reassigned', {
            jobId: item.jobId,
            fromEmployeeId: absentEmployeeId,
            toEmployeeId: targetEmp.id,
            reason: item.reason || 'Absence rebalance',
          });
        } catch (err) {
          executionResults.push({
            jobId: item.jobId,
            jobTitle: item.jobId,
            previousEmployeeId: absentEmployeeId,
            newEmployeeId: item.targetEmployeeId,
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Update failed',
          });
        }
      }
    } else if (autoMatch) {
      // Mode B: Smart Auto-Match
      for (const job of todayJobs) {
        try {
          const matchResult = await findBestMatch(job.id, {
            excludeOnLeave: true,
            workspaceId: absentEmployee.workspaceId || undefined,
          });

          if (matchResult && matchResult.found && matchResult.employeeId) {
            const targetEmpId = matchResult.employeeId;
            const targetEmpName = matchResult.employeeName || 'Technician';

            await db.job.update({
              where: { id: job.id },
              data: {
                assigneeId: targetEmpId,
                assigneeName: targetEmpName,
                assignmentStatus: 'assigned',
                status: 'assigned',
                updatedAt: now,
              },
            });

            executionResults.push({
              jobId: job.id,
              jobTitle: job.title,
              previousEmployeeId: absentEmployeeId,
              newEmployeeId: targetEmpId,
              newEmployeeName: targetEmpName,
              status: 'reassigned',
              reason: `Smart Match (score: ${Math.round(matchResult.score)})`,
            });

            EventBus.emit('job:reassigned', {
              jobId: job.id,
              fromEmployeeId: absentEmployeeId,
              toEmployeeId: targetEmpId,
              reason: 'Smart Auto-Match Absence Rebalance',
            });
          } else {
            executionResults.push({
              jobId: job.id,
              jobTitle: job.title,
              previousEmployeeId: absentEmployeeId,
              newEmployeeId: '',
              status: 'failed',
              reason: 'No available matching technician found',
            });
          }
        } catch (err) {
          executionResults.push({
            jobId: job.id,
            jobTitle: job.title,
            previousEmployeeId: absentEmployeeId,
            newEmployeeId: '',
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Smart match error',
          });
        }
      }
    }

    const successfulCount = executionResults.filter((r) => r.status === 'reassigned').length;

    return NextResponse.json({
      success: true,
      absentEmployee: {
        id: absentEmployee.id,
        name: absentEmployee.name,
      },
      reassignedCount: successfulCount,
      totalJobs: todayJobs.length,
      results: executionResults,
      message: `Successfully rebalanced ${successfulCount} of ${todayJobs.length} jobs.`,
    });
  } catch (error) {
    console.error('[POST /api/dispatch/reassign-absent] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reassign jobs' },
      { status: 500 },
    );
  }
}
