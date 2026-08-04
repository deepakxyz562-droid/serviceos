import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import {
  notifyEmployeeJobAssigned,
  notifyCustomerJobAssigned,
  notifyCustomerJobStarted,
  notifyCustomerJobCompleted,
  notifyEmployeeJobCompleted,
  notifyCustomerVerificationPin,
} from '@/lib/whatsapp-notifications'
import { EventBus } from '@/lib/event-bus'
import { notifyOwner } from '@/lib/owner-notifications'
import { autoCreateInvoiceFromJob } from '@/lib/invoice-automation'
import { autoRecordAssetServiceHistory } from '@/lib/asset-service-history'
import { validateJobCompletionProof } from '@/lib/job-completion-validation'
import { getAuthUser } from '@/lib/auth'

/**
 * Role-based action authorization for POST /api/jobs/lifecycle.
 *
 * `super_admin` bypasses this check entirely (allowed for all actions).
 * Unknown actions (not listed here) skip the role check and fall through to
 * the switch's `default` case, which returns 400 Bad Request.
 */
const ACTION_ROLES: Record<string, string[]> = {
  assign: ['owner', 'admin', 'manager'],
  accept: ['owner', 'admin', 'manager', 'employee'],
  reject: ['owner', 'admin', 'manager', 'employee'],
  start: ['owner', 'admin', 'manager', 'employee'],
  complete: ['owner', 'admin', 'manager', 'employee'],
}

function safeParseJson(str: string): unknown[] {
  try {
    return JSON.parse(str || '[]')
  } catch {
    return []
  }
}

/**
 * Run a background side-effect without blocking the API response.
 * Errors are logged but never thrown to the caller. This is what makes
 * assign/start/complete feel instant to the user — the DB write is awaited
 * (so the response reflects the new state) but WhatsApp/Email/EventBus/
 * invoice creation all run detached in the background.
 */
function fireAndForget<T>(
  label: string,
  task: Promise<T> | (() => Promise<T>),
): void {
  const p = typeof task === 'function' ? task() : task
  p.catch((err) => console.error(`[JobLifecycle] ${label} failed:`, err))
}

function addNotificationLog(logJson: string, entry: Record<string, unknown>): string {
  const logs = safeParseJson(logJson)
  logs.push({ ...entry, timestamp: new Date().toISOString() })
  return JSON.stringify(logs)
}

export async function GET(request: NextRequest) {
  try {
    // ─── Authentication ──────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Tenant scoping: super_admin sees all jobs; everyone else is scoped to
    // their workspace. (Job has no `tenantId` column — the tenant link is via
    // Job.workspaceId → Workspace.tenantId. Adapted from the task's
    // tenantId template to match the actual Prisma schema.)
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        ...(user.isSuperAdmin ? {} : { workspaceId: user.workspaceId }),
      },
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Parse notification log
    const notificationLog = safeParseJson(job.notificationLogJson)

    return NextResponse.json({ ...job, notificationLog })
  } catch (error) {
    console.error('Error fetching job lifecycle:', error)
    return NextResponse.json({ error: 'Failed to fetch job lifecycle' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ─── Authentication ──────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, jobId, resourceId, reason } = body

    if (!action || !jobId) {
      return NextResponse.json({ error: 'action and jobId are required' }, { status: 400 })
    }

    // ─── Role-based action authorization ────────────────────────────
    // super_admin bypasses the role check (allowed for all actions).
    // Unknown actions (not in ACTION_ROLES) skip this check and fall
    // through to the switch's default case, which returns 400 Bad Request.
    const allowedRoles = ACTION_ROLES[action]
    if (!user.isSuperAdmin && allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action' },
        { status: 403 },
      )
    }

    // Tenant scoping: super_admin sees all jobs; everyone else is scoped to
    // their workspace. (Job has no `tenantId` column — the tenant link is via
    // Job.workspaceId → Workspace.tenantId. Adapted from the task's
    // tenantId template to match the actual Prisma schema.)
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        ...(user.isSuperAdmin ? {} : { workspaceId: user.workspaceId }),
      },
      include: { assignee: true, resource: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let updatedJob

    switch (action) {
      case 'assign': {
        if (!resourceId) {
          return NextResponse.json({ error: 'resourceId (employee or resource ID) is required for assign action' }, { status: 400 })
        }

        // Try Employee first (frontend sends employee IDs), then fall back to Resource
        const employee = await db.employee.findUnique({ where: { id: resourceId } })
        const resource = employee ? null : await db.resource.findUnique({ where: { id: resourceId } })

        if (!employee && !resource) {
          return NextResponse.json({ error: 'Employee/Resource not found' }, { status: 404 })
        }

        // Check availability
        if (employee && employee.status !== 'available' && employee.status !== 'busy') {
          return NextResponse.json({ error: `Employee is not available (current status: ${employee.status})` }, { status: 400 })
        }
        if (resource && resource.status !== 'available') {
          return NextResponse.json({ error: 'Resource is not available' }, { status: 400 })
        }

        // ── Re-assignment fix: clear the OLD assignee's currentJobId BEFORE
        // setting the new one. Employee.currentJobId is @unique, so setting
        // the new employee's currentJobId while the old one still points at
        // this job throws P2002 Unique constraint failed → 500 error. This
        // was the root cause of "Failed to handle job lifecycle action" on
        // the Re-assign button.
        if (job.assigneeId && job.assigneeId !== employee?.id) {
          try {
            const oldEmpOtherActive = await db.job.count({
              where: {
                assigneeId: job.assigneeId,
                id: { not: jobId },
                status: { in: ['assigned', 'in_progress', 'en_route'] },
              },
            })
            await db.employee.update({
              where: { id: job.assigneeId },
              data: {
                currentJobId: null,
                status: oldEmpOtherActive > 0 ? 'busy' : 'available',
              },
            })
          } catch (e) {
            // Non-fatal — log and continue. The old employee staying "busy"
            // is better than failing the whole re-assignment.
            console.error('[JobLifecycle] failed to reset old assignee:', e)
          }
        }
        // Also free up the old resource if re-assigning to a different one
        if (job.resourceId && job.resourceId !== resource?.id) {
          try {
            await db.resource.update({
              where: { id: job.resourceId },
              data: { status: 'available' },
            })
          } catch (e) {
            console.error('[JobLifecycle] failed to reset old resource:', e)
          }
        }

        const assigneeName = employee?.name ?? resource?.name ?? 'Unknown'
        const assigneePhone = employee?.phone ?? resource?.phone ?? ''

        const logEntry = {
          action: 'assigned',
          assignedVia: employee ? 'employee' : 'resource',
          resourceId,
          resourceName: assigneeName,
          reason,
        }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        // ── Generate verificationPin if missing ──────────────────────
        // The 4-digit PIN is SMS'd to the customer so the technician can
        // verify on-site arrival. Generate it here (on first assignment AND
        // on re-assignment if the job somehow has no PIN yet) so the
        // customer notification below can include it. The PIN stays the same
        // across re-assignments (no re-SMS needed) — we only generate if
        // the job.verificationPin field is null/empty.
        const pinForUpdate = !job.verificationPin
          ? Math.floor(1000 + Math.random() * 9000).toString()
          : undefined

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            resourceId: resource?.id ?? null,
            assigneeId: employee?.id ?? null,
            assigneeName,
            assigneePhone,
            status: 'assigned',
            assignmentStatus: 'pending',
            ...(pinForUpdate ? { verificationPin: pinForUpdate } : {}),
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // Update employee/resource status — wrapped in try/catch so a
        // side-effect failure never 500s the main assignment.
        if (employee) {
          try {
            await db.employee.update({
              where: { id: employee.id },
              data: {
                status: 'busy',
                // Track the current job so the dispatch board / employee portal
                // can show "on job: X". Cleared when the job is completed.
                currentJobId: jobId,
              },
            })
          } catch (e) {
            console.error('[JobLifecycle] failed to set new employee status:', e)
          }
        }
        if (resource) {
          try {
            await db.resource.update({
              where: { id: resource.id },
              data: { status: 'busy' },
            })
          } catch (e) {
            console.error('[JobLifecycle] failed to set new resource status:', e)
          }
        }

        // Send WhatsApp notification to employee (background — don't block response)
        if (employee) {
          fireAndForget('employee assign notification', notifyEmployeeJobAssigned(updatedJob, employee))
        }

        // ─── Customer assignment SMS (consolidated) ─────────────────
        // notifyCustomerVerificationPin sends a single SMS with technician
        // name + scheduled date/time + 4-digit PIN + tracking link. This is
        // the ONLY customer notification on assignment — we do NOT also call
        // notifyCustomerJobAssigned (which sent a second, partial SMS with
        // no PIN, confusing customers).
        //
        // This was previously suppressed here because the PUT /api/jobs/[id]
        // route was expected to fire it. But the frontend Assign/Re-assign
        // buttons call POST /api/jobs/lifecycle (this route), NOT PUT, so
        // the customer never received any notification. Now we fire it here
        // directly.
        if (updatedJob.customerPhone && updatedJob.verificationPin) {
          fireAndForget('customer PIN SMS', notifyCustomerVerificationPin(updatedJob))
        }

        // ─── Emit event via EventBus (background) ────────────────
        fireAndForget('job.assigned event', EventBus.emit('job.assigned', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: employee ? { id: employee.id, name: employee.name, phone: employee.phone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }))

        // ─── Notify the tenant owner that the job was assigned (background) ────
        fireAndForget('owner assign notification', async () => {
          const jobNumber = updatedJob.jobNumber || String(updatedJob.id).slice(-6).toUpperCase()
          const scheduledDate = updatedJob.scheduledAt
            ? new Date(updatedJob.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : 'TBD'
          const scheduledTime = (updatedJob.scheduledTime as string) || (updatedJob.scheduledAt ? new Date(updatedJob.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD')
          const waMessage = [
            '📋 *Job Assigned*',
            '',
            `*Job #:* ${jobNumber}`,
            `*Title:* ${updatedJob.title || 'N/A'}`,
            `*Customer:* ${updatedJob.customerName || 'N/A'}`,
            `*Assigned To:* ${updatedJob.assigneeName || 'Unassigned'}`,
            `*Date:* ${scheduledDate}`,
            `*Time:* ${scheduledTime}`,
            updatedJob.address ? `*Address:* ${updatedJob.address}` : '',
          ].filter(Boolean).join('\n')

          await notifyOwner(updatedJob.workspaceId, {
            eventType: 'job.assigned',
            eventLabel: 'Job Assigned',
            whatsappMessage: waMessage,
            jobId: updatedJob.id,
          })
        })

        break
      }

      case 'accept': {
        const logEntry = { action: 'accepted', resourceId: job.resourceId, reason }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'assigned',
            assignmentStatus: 'accepted',
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // Notify customer that employee accepted (background)
        if (job.customerPhone) {
          fireAndForget('customer accept notification', notifyCustomerJobAssigned(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone }))
        }

        // ─── Emit event via EventBus (background) ────────────────
        fireAndForget('job.accepted event', EventBus.emit('job.accepted', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }))

        break
      }

      case 'reject': {
        const logEntry = { action: 'rejected', resourceId: job.resourceId, reason }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        // If there's a resource, set it back to available
        if (job.resourceId) {
          await db.resource.update({
            where: { id: job.resourceId },
            data: { status: 'available' },
          })
        }

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'pending',
            assignmentStatus: 'rejected',
            resourceId: null,
            assigneeId: null,
            assigneeName: null,
            assigneePhone: null,
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // ─── Emit event via EventBus (background) ────────────────
        fireAndForget('job.rejected event', EventBus.emit('job.rejected', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: null, assigneePhone: null, workspaceId: updatedJob.workspaceId },
          employee: null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
          reason: reason || 'No reason provided',
        }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }))

        break
      }

      case 'start': {
        const logEntry = { action: 'started', resourceId: job.resourceId, reason }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'in_progress',
            actualStartTime: new Date(),
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // Notify customer that technician is on the way (background)
        if (job.customerPhone) {
          fireAndForget('customer start notification', notifyCustomerJobStarted(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone }))
        }

        // ─── Emit event via EventBus (background) ────────────────
        fireAndForget('job.started event', EventBus.emit('job.started', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }))

        // ─── Notify the tenant owner that the job has started (background) ────
        fireAndForget('owner start notification', async () => {
          const jobNumber = updatedJob.jobNumber || String(updatedJob.id).slice(-6).toUpperCase()
          const startTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const waMessage = [
            '🚀 *Job Started*',
            '',
            `*Job #:* ${jobNumber}`,
            `*Title:* ${updatedJob.title || 'N/A'}`,
            `*Customer:* ${updatedJob.customerName || 'N/A'}`,
            `*Technician:* ${updatedJob.assigneeName || 'Unassigned'}`,
            `*Started At:* ${startTime}`,
            updatedJob.address ? `*Address:* ${updatedJob.address}` : '',
          ].filter(Boolean).join('\n')

          await notifyOwner(updatedJob.workspaceId, {
            eventType: 'job.started',
            eventLabel: 'Job Started',
            whatsappMessage: waMessage,
            jobId: updatedJob.id,
          })
        })

        break
      }

      case 'complete': {
        // ── Idempotency guard ──────────────────────────────────────
        // If the job is already completed, return it as-is without re-running
        // the complete flow (which would re-fire notifications, re-create
        // invoices, etc.). This prevents duplicate invoices when the user
        // double-clicks "Complete" or when the complete-proof route already
        // closed the job.
        if (job.status === 'completed') {
          updatedJob = job
          break
        }

        // ── Validation: require before/after photos + customer signature
        // (and a completed checklist if linked/expected) before a job can be
        // marked completed. Mirrors the JobCompletionScreen UI gating. ──
        const proof = await validateJobCompletionProof(jobId)
        if (!proof.ok) {
          return NextResponse.json(
            { error: proof.error, missing: proof.missing },
            { status: 400 },
          )
        }

        const logEntry = { action: 'completed', resourceId: job.resourceId, assigneeId: job.assigneeId, reason }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        // Set employee back to available and increment completedJobs.
        // Only mark the employee as 'available' if they have no OTHER active
        // jobs (assigned / in_progress / en_route). If they still have work
        // assigned, keep them busy so the dispatch board doesn't show them as
        // free when they're actually still on a job.
        if (job.assigneeId) {
          try {
            const otherActiveJobs = await db.job.count({
              where: {
                assigneeId: job.assigneeId,
                id: { not: jobId },
                status: { in: ['assigned', 'in_progress', 'en_route'] },
              },
            })

            await db.employee.update({
              where: { id: job.assigneeId },
              data: {
                status: otherActiveJobs > 0 ? 'busy' : 'available',
                completedJobs: { increment: 1 },
                // Always clear currentJobId when the job completes. If the
                // employee has another active job, the dispatch board will
                // re-assign currentJobId when they start that job next.
                currentJobId: null,
              },
            })
          } catch (e) {
            console.error('Failed to update employee status on completion:', e)
          }
        }

        // Set resource back to available and increment completedJobs
        if (job.resourceId) {
          const resource = await db.resource.findUnique({ where: { id: job.resourceId } })
          if (resource) {
            await db.resource.update({
              where: { id: job.resourceId },
              data: {
                status: 'available',
                completedJobs: resource.completedJobs + 1,
              },
            })
          }
        }

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            actualEndTime: new Date(),
            completedAt: new Date(),
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // ── Synthesize a RouteHistory row if none exists for this job.
        // Many jobs are completed via this legacy /api/jobs/lifecycle endpoint
        // without ever starting GPS tracking — the GPS & route tab then shows
        // "No travel recorded for this job yet." even though check-in /
        // check-out coordinates were captured. This synthesizes a completed
        // RouteHistory row from those coordinates so the GPS tab has something
        // to render. (employeeId is required on RouteHistory — skip if no
        // assignee. tenantId is required too — use user.tenantId since Job
        // has no tenantId column.) Non-fatal: any DB error is logged but
        // never breaks the completion flow.
        try {
          if (user.tenantId && job.assigneeId && (job.checkInLat || job.checkOutLat)) {
            const existingRoute = await db.routeHistory.findFirst({
              where: { jobId: job.id },
              orderBy: { createdAt: 'desc' },
            });
            if (!existingRoute) {
              const endTime = updatedJob.actualEndTime || updatedJob.completedAt || new Date();
              const startTime = job.actualStartTime || job.scheduledAt || endTime;
              await db.routeHistory.create({
                data: {
                  tenantId: user.tenantId,
                  employeeId: job.assigneeId,
                  jobId: job.id,
                  startedAt: startTime,
                  endedAt: endTime,
                  pathJson: JSON.stringify([]),
                  distanceMeters: 0,
                  durationMinutes: Math.max(
                    0,
                    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
                  ),
                  startLat: job.checkInLat ?? null,
                  startLng: job.checkInLng ?? null,
                  endLat: job.checkOutLat ?? job.checkInLat ?? null,
                  endLng: job.checkOutLng ?? job.checkInLng ?? null,
                  status: 'completed',
                  arrivedAt: endTime,
                },
              });
            }
          }
        } catch (e) {
          console.error('[jobs/lifecycle] Failed to synthesize RouteHistory:', e);
          // non-fatal — completion already succeeded
        }

        // Notify customer that job is completed (background)
        if (job.customerPhone) {
          fireAndForget('customer complete notification', notifyCustomerJobCompleted(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone }))
        }

        // Notify employee that job is completed (background).
        // Use the already-included `updatedJob.assignee` relation instead of
        // re-querying the employee table.
        if (updatedJob.assignee) {
          fireAndForget('employee complete notification', notifyEmployeeJobCompleted(updatedJob, updatedJob.assignee))
        }

        // ─── Emit event via EventBus (background) ────────────────
        fireAndForget('job.completed event', EventBus.emit('job.completed', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }))

        // ─── Notify the tenant owner that the job is complete (background) ────
        fireAndForget('owner complete notification', async () => {
          const jobNumber = updatedJob.jobNumber || String(updatedJob.id).slice(-6).toUpperCase()
          const completedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
          const waMessage = [
            '🎉 *Job Completed*',
            '',
            `*Job #:* ${jobNumber}`,
            `*Title:* ${updatedJob.title || 'N/A'}`,
            `*Customer:* ${updatedJob.customerName || 'N/A'}`,
            `*Technician:* ${updatedJob.assigneeName || 'Unassigned'}`,
            `*Completed At:* ${completedAt}`,
          ].filter(Boolean).join('\n')

          await notifyOwner(updatedJob.workspaceId, {
            eventType: 'job.completed',
            eventLabel: 'Job Completed',
            whatsappMessage: waMessage,
            jobId: updatedJob.id,
          })
        })

        // ─── Auto-create a single invoice on job completion (background) ────
        // Single-invoice billing only (milestone invoicing was removed).
        // autoCreateInvoiceFromJob is idempotent (skips if an invoice already
        // exists for the job), respects the autoCreateOnJobComplete toggle,
        // and uses resolveJobAmount() so the amount reflects real data
        // (quotedAmount → amountCollected → Lead.value → Service.basePrice).
        fireAndForget('auto-invoice', async () => {
          const invResult = await autoCreateInvoiceFromJob(updatedJob.id)
          if (invResult.success) {
            if (invResult.sendFailed) {
              console.warn(
                `[JobLifecycle] Auto-created invoice ${invResult.number} for job ${updatedJob.id}, ` +
                `but SEND FAILED: ${invResult.sendError || 'unknown reason'}. ` +
                `The invoice is in 'draft' status. Add customer email/phone and click Send.`
              )
            } else {
              console.log(`[JobLifecycle] Auto-created invoice ${invResult.number} for job ${updatedJob.id}`)
            }
          } else if (!invResult.skipped) {
            console.error(`[JobLifecycle] Auto-invoice failed: ${invResult.error}`)
          }
        })

        // ─── Auto-record AssetServiceHistory for the linked equipment (background) ────
        // Fulfills the job-form promise: "Service history will be auto-recorded
        // on this asset when the job completes." Idempotent — skips if no asset
        // linked or an entry already exists for this job+asset.
        fireAndForget('asset-service-history', async () => {
          const ashResult = await autoRecordAssetServiceHistory(updatedJob)
          if (ashResult.success) {
            console.log(`[JobLifecycle] Auto-recorded service history for job ${updatedJob.id}`)
          } else if (!ashResult.skipped) {
            console.error(`[JobLifecycle] Asset service-history failed: ${ashResult.reason}`)
          }
        })

        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // ─── Audit logging (best-effort, non-fatal) ─────────────────────
    // Mirrors the pattern in /api/jobs/[id]/lifecycle/route.ts. Skipped
    // for users without a tenantId (e.g. a misconfigured super_admin) —
    // ActivityLog.tenantId is a required (non-nullable) column.
    // Field-name adaptations from the task template: userId→actorId,
    // detailsJson→metadataJson (per the actual Prisma schema).
    if (user.tenantId) {
      try {
        await db.activityLog.create({
          data: {
            action: `job.${action}`,
            entityType: 'job',
            entityId: jobId,
            entityName: updatedJob?.title || job.title || undefined,
            actorId: user.id,
            actorType: 'user',
            description: `Job ${action}: ${updatedJob?.title || job.title || jobId}`,
            tenantId: user.tenantId,
            metadataJson: JSON.stringify({
              resourceId,
              previousStatus: job.status,
              newStatus: updatedJob?.status,
            }),
          },
        })
      } catch (e) {
        // non-fatal — the action already succeeded
        console.error('[JobLifecycle] audit log failed:', e)
      }
    }

    return NextResponse.json(updatedJob)
  } catch (error) {
    console.error('Error handling job lifecycle:', error)
    return NextResponse.json({ error: 'Failed to handle job lifecycle action' }, { status: 500 })
  }
}
