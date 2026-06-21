import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import {
  notifyEmployeeJobAssigned,
  notifyCustomerJobAssigned,
  notifyCustomerJobStarted,
  notifyCustomerJobCompleted,
  notifyEmployeeJobCompleted,
} from '@/lib/whatsapp-notifications'
import { EventBus } from '@/lib/event-bus'
import { notifyOwner } from '@/lib/owner-notifications'
import { autoCreateInvoiceFromJob, createMilestoneInvoice, getInvoiceSettings } from '@/lib/invoice-automation'

function safeParseJson(str: string): unknown[] {
  try {
    return JSON.parse(str || '[]')
  } catch {
    return []
  }
}

function addNotificationLog(logJson: string, entry: Record<string, unknown>): string {
  const logs = safeParseJson(logJson)
  logs.push({ ...entry, timestamp: new Date().toISOString() })
  return JSON.stringify(logs)
}

/**
 * Resolve the tenant id for a job. Jobs reference a Workspace (not a Tenant
 * directly), so look up the workspace → tenantId. Fall back to the first
 * tenant so invoice-automation settings still resolve in single-tenant demos.
 */
async function resolveTenantIdForJob(workspaceId: string | null | undefined): Promise<string | null> {
  if (workspaceId) {
    try {
      const ws = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { tenantId: true },
      })
      if (ws?.tenantId) return ws.tenantId
    } catch { /* fall through */ }
  }
  try {
    const t = await db.tenant.findFirst({ select: { id: true } })
    return t?.id || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
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
    const body = await request.json()
    const { action, jobId, resourceId, reason } = body

    if (!action || !jobId) {
      return NextResponse.json({ error: 'action and jobId are required' }, { status: 400 })
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
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

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            resourceId: resource?.id ?? null,
            assigneeId: employee?.id ?? null,
            assigneeName,
            assigneePhone,
            status: 'assigned',
            assignmentStatus: 'pending',
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // Update employee/resource status
        if (employee) {
          await db.employee.update({
            where: { id: employee.id },
            data: { status: 'busy' },
          })
        }
        if (resource) {
          await db.resource.update({
            where: { id: resource.id },
            data: { status: 'busy' },
          })
        }

        // Send WhatsApp notification to employee
        if (employee) {
          try {
            await notifyEmployeeJobAssigned(updatedJob, employee)
          } catch (e) {
            console.error('Failed to send employee assignment notification:', e)
          }
        }

        // Send WhatsApp notification to customer
        // NOTE: notifyCustomerJobAssigned(job, employee) uses `employee.name` for
        // the "Technician:" field — so we MUST pass the assigned employee here,
        // NOT the customer. Falling back to updatedJob.assigneeName/Phone covers
        // the resource-only assignment case (no Employee row).
        try {
          if (job.customerPhone) {
            const technician =
              employee
                ? { id: employee.id, name: employee.name, phone: employee.phone }
                : { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone }
            await notifyCustomerJobAssigned(updatedJob, technician)
          }
        } catch (e) {
          console.error('Failed to send customer assignment notification:', e)
        }

        // ─── Emit event via EventBus ─────────────────────────────
        try {
          await EventBus.emit('job.assigned', {
            job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
            employee: employee ? { id: employee.id, name: employee.name, phone: employee.phone } : null,
            customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
            resourceType: 'job', resourceId: updatedJob.id,
          }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined })
        } catch (e) {
          console.error('Failed to emit job.assigned event:', e)
        }

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

        // Notify customer that employee accepted
        try {
          if (job.customerPhone) {
            await notifyCustomerJobAssigned(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone })
          }
        } catch (e) {
          console.error('Failed to send notification:', e)
        }

        // ─── Emit event via EventBus ─────────────────────────────
        try {
          await EventBus.emit('job.accepted', {
            job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
            employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
            customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
            resourceType: 'job', resourceId: updatedJob.id,
          }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined })
        } catch (e) {
          console.error('Failed to emit job.accepted event:', e)
        }

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

        // ─── Emit event via EventBus ─────────────────────────────
        try {
          await EventBus.emit('job.rejected', {
            job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: null, assigneePhone: null, workspaceId: updatedJob.workspaceId },
            employee: null,
            customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
            resourceType: 'job', resourceId: updatedJob.id,
            reason: reason || 'No reason provided',
          }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined })
        } catch (e) {
          console.error('Failed to emit job.rejected event:', e)
        }

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

        // Notify customer that technician is on the way
        try {
          if (job.customerPhone) {
            await notifyCustomerJobStarted(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone })
          }
        } catch (e) {
          console.error('Failed to send notification:', e)
        }

        // ─── Emit event via EventBus ─────────────────────────────
        try {
          await EventBus.emit('job.started', {
            job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
            employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
            customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
            resourceType: 'job', resourceId: updatedJob.id,
          }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined })
        } catch (e) {
          console.error('Failed to emit job.started event:', e)
        }

        // ─── Notify the tenant owner that the job has started ────
        try {
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
        } catch (ownerErr) {
          console.error('[JobLifecycle] Owner start notification failed:', ownerErr)
        }

        // ─── Milestone invoice #1 (30% on job start) if enabled ──
        try {
          const invSettings = await getInvoiceSettings(await resolveTenantIdForJob(updatedJob.workspaceId))
          if (invSettings.enableMilestones) {
            const msResult = await createMilestoneInvoice(updatedJob.id, 1)
            if (msResult.success) {
              console.log(`[JobLifecycle] Created milestone 1 invoice ${msResult.number} for job ${updatedJob.id}`)
            } else if (!msResult.skipped) {
              console.error(`[JobLifecycle] Milestone 1 invoice failed: ${msResult.error}`)
            }
          }
        } catch (msErr) {
          console.error('[JobLifecycle] Milestone invoice error:', msErr)
        }

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

        const logEntry = { action: 'completed', resourceId: job.resourceId, assigneeId: job.assigneeId, reason }
        const newLogJson = addNotificationLog(job.notificationLogJson, logEntry)

        // Set employee back to available and increment completedJobs
        if (job.assigneeId) {
          try {
            await db.employee.update({
              where: { id: job.assigneeId },
              data: {
                status: 'available',
                completedJobs: { increment: 1 },
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
            notificationLogJson: newLogJson,
          },
          include: { assignee: true, customer: true, resource: true },
        })

        // Notify customer that job is completed
        try {
          if (job.customerPhone) {
            await notifyCustomerJobCompleted(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone })
          }
        } catch (e) {
          console.error('Failed to send notification:', e)
        }

        // Notify employee that job is completed
        try {
          if (updatedJob.assigneeId) {
            const employee = await db.employee.findUnique({ where: { id: updatedJob.assigneeId } })
            if (employee) {
              await notifyEmployeeJobCompleted(updatedJob, employee)
            }
          }
        } catch (e) {
          console.error('Failed to send notification:', e)
        }

        // ─── Emit event via EventBus ─────────────────────────────
        try {
          await EventBus.emit('job.completed', {
            job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
            employee: updatedJob.assigneeId ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone } : null,
            customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
            resourceType: 'job', resourceId: updatedJob.id,
          }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined })
        } catch (e) {
          console.error('Failed to emit job.completed event:', e)
        }

        // ─── Notify the tenant owner that the job is complete ────
        try {
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
        } catch (ownerErr) {
          console.error('[JobLifecycle] Owner complete notification failed:', ownerErr)
        }

        // ─── Auto-create invoice if tenant setting is enabled ────
        // Two paths:
        //   1. Milestone mode (enableMilestones=true) → create milestone #3 (final 30%).
        //      Milestone #1 (30%) was created on job start; milestone #2 (40% at 50%
        //      progress) is created manually by the manager from the invoices view.
        //   2. Standard mode → autoCreateInvoiceFromJob (respects autoCreateOnJobComplete
        //      toggle + approval_required → pending_approval status).
        try {
          const invSettings = await getInvoiceSettings(await resolveTenantIdForJob(updatedJob.workspaceId))
          if (invSettings.enableMilestones) {
            const msResult = await createMilestoneInvoice(updatedJob.id, 3)
            if (msResult.success) {
              console.log(`[JobLifecycle] Created milestone 3 (final) invoice ${msResult.number} for job ${updatedJob.id}`)
            } else if (!msResult.skipped) {
              console.error(`[JobLifecycle] Milestone 3 invoice failed: ${msResult.error}`)
            }
          } else {
            const invResult = await autoCreateInvoiceFromJob(updatedJob.id)
            if (invResult.success) {
              console.log(`[JobLifecycle] Auto-created invoice ${invResult.number} for job ${updatedJob.id}`)
            } else if (!invResult.skipped) {
              console.error(`[JobLifecycle] Auto-invoice failed: ${invResult.error}`)
            }
          }
        } catch (invErr) {
          console.error('[JobLifecycle] Auto-invoice creation error:', invErr)
        }

        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json(updatedJob)
  } catch (error) {
    console.error('Error handling job lifecycle:', error)
    return NextResponse.json({ error: 'Failed to handle job lifecycle action' }, { status: 500 })
  }
}
