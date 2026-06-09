/**
 * Event Webhook Dispatcher
 *
 * Automatically fires HTTP POST requests to configured webhook URLs
 * (e.g., n8n workflows) whenever a job lifecycle event occurs.
 *
 * Architecture:
 *   ServiceOS Job Event → Save to DB → Fire webhooks → n8n → WhatsApp
 *
 * Supported events:
 *   - job.created      → When a new job is created
 *   - job.assigned     → When an employee is assigned to a job
 *   - job.accepted     → When employee accepts the job
 *   - job.started      → When employee starts the job (on the way)
 *   - job.completed    → When job is marked completed
 *   - job.cancelled    → When job is cancelled
 *   - job.rejected     → When employee rejects the job
 *
 * Usage (in API routes):
 *   await dispatchJobEvent('job.created', job, { employee, customer })
 */

import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobEventType =
  | 'job.created'
  | 'job.assigned'
  | 'job.accepted'
  | 'job.started'
  | 'job.completed'
  | 'job.cancelled'
  | 'job.rejected'

export interface JobEventPayload {
  event: JobEventType
  timestamp: string
  job: {
    id: string
    jobNumber?: string | null
    title: string
    description?: string | null
    status: string
    priority: string
    type: string
    address?: string | null
    scheduledAt?: string | null
    scheduledTime?: string | null
    notes?: string | null
    customerName?: string | null
    customerPhone?: string | null
    assigneeName?: string | null
    assigneePhone?: string | null
    workspaceId?: string | null
    createdAt: string
    updatedAt: string
  }
  employee?: {
    id: string
    name: string
    phone: string
    role?: string
    status?: string
    whatsappId?: string | null
  } | null
  customer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null
  metadata?: Record<string, unknown>
}

interface DispatchResult {
  webhookId: string
  webhookName: string
  url: string
  success: boolean
  statusCode?: number
  error?: string
  durationMs: number
}

// ─── Build Payload ────────────────────────────────────────────────────────────

function buildJobPayload(
  event: JobEventType,
  job: Record<string, any>,
  related?: {
    employee?: Record<string, any> | null
    customer?: Record<string, any> | null
    metadata?: Record<string, unknown>
  }
): JobEventPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    job: {
      id: job.id,
      jobNumber: job.jobNumber || null,
      title: job.title || '',
      description: job.description || null,
      status: job.status || 'pending',
      priority: job.priority || 'medium',
      type: job.type || 'service',
      address: job.address || null,
      scheduledAt: job.scheduledAt ? new Date(job.scheduledAt).toISOString() : null,
      scheduledTime: job.scheduledTime || null,
      notes: job.notes || null,
      customerName: job.customerName || null,
      customerPhone: job.customerPhone || null,
      assigneeName: job.assigneeName || null,
      assigneePhone: job.assigneePhone || null,
      workspaceId: job.workspaceId || null,
      createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : new Date().toISOString(),
    },
    employee: related?.employee ? {
      id: related.employee.id,
      name: related.employee.name || '',
      phone: related.employee.phone || '',
      role: related.employee.role || undefined,
      status: related.employee.status || undefined,
      whatsappId: related.employee.whatsappId || null,
    } : null,
    customer: related?.customer ? {
      id: related.customer.id || null,
      name: related.customer.name || null,
      phone: related.customer.phone || null,
      email: related.customer.email || null,
    } : null,
    metadata: related?.metadata,
  }
}

// ─── Fire Single Webhook ─────────────────────────────────────────────────────

async function fireWebhook(
  webhook: {
    id: string
    name: string
    url: string
    method: string
    headersJson: string
    timeoutMs: number
    retryOnFail: boolean
    maxRetries: number
  },
  payload: JobEventPayload,
  isRetry = false
): Promise<DispatchResult> {
  const startTime = Date.now()
  let headers: Record<string, string> = {}

  try {
    headers = JSON.parse(webhook.headersJson || '{}')
  } catch {
    headers = {}
  }

  // Always send JSON content type
  headers = {
    'Content-Type': 'application/json',
    ...headers,
  }

  const maxAttempts = webhook.retryOnFail ? webhook.maxRetries : 1
  let lastError: string | undefined
  let lastStatusCode: number | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs || 10000)

      const response = await fetch(webhook.url, {
        method: webhook.method || 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      lastStatusCode = response.status
      const durationMs = Date.now() - startTime

      let responseBody: string | undefined
      try {
        responseBody = (await response.text()).substring(0, 2000) // Truncate large responses
      } catch {
        responseBody = undefined
      }

      if (response.ok) {
        // Log success
        await db.eventWebhookLog.create({
          data: {
            eventWebhookId: webhook.id,
            event: payload.event,
            jobId: payload.job.id,
            payloadJson: JSON.stringify(payload),
            responseStatus: response.status,
            responseBody,
            durationMs,
            retried: isRetry || attempt > 1,
          },
        })

        return {
          webhookId: webhook.id,
          webhookName: webhook.name,
          url: webhook.url,
          success: true,
          statusCode: response.status,
          durationMs,
        }
      } else {
        lastError = `HTTP ${response.status}: ${responseBody || 'Unknown error'}`
        if (attempt < maxAttempts) {
          // Wait before retry (exponential backoff: 1s, 2s, 4s)
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
          continue
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = `Request timed out after ${webhook.timeoutMs}ms`
        lastStatusCode = 0
      } else {
        lastError = err.message || 'Unknown error'
        lastStatusCode = 0
      }

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }
    }
  }

  const durationMs = Date.now() - startTime

  // Log failure
  await db.eventWebhookLog.create({
    data: {
      eventWebhookId: webhook.id,
      event: payload.event,
      jobId: payload.job.id,
      payloadJson: JSON.stringify(payload),
      responseStatus: lastStatusCode,
      error: lastError,
      durationMs,
      retried: isRetry,
    },
  })

  return {
    webhookId: webhook.id,
    webhookName: webhook.name,
    url: webhook.url,
    success: false,
    statusCode: lastStatusCode,
    error: lastError,
    durationMs,
  }
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatch a job event to all matching, active event webhooks.
 *
 * This is the main entry point. Call it from API routes after
 * saving job changes to the database.
 *
 * @param event - The job event type (e.g., 'job.created')
 * @param job - The job record (any object with job fields)
 * @param related - Optional related data (employee, customer, metadata)
 * @returns Array of dispatch results for logging/auditing
 *
 * @example
 * // After creating a job in the database:
 * await dispatchJobEvent('job.created', newJob, { customer: customerData })
 *
 * // After assigning an employee:
 * await dispatchJobEvent('job.assigned', updatedJob, { employee: employeeData, customer: customerData })
 */
export async function dispatchJobEvent(
  event: JobEventType,
  job: Record<string, any>,
  related?: {
    employee?: Record<string, any> | null
    customer?: Record<string, any> | null
    metadata?: Record<string, unknown>
  }
): Promise<DispatchResult[]> {
  const payload = buildJobPayload(event, job, related)

  // Find all active webhooks matching this event
  const webhooks = await db.eventWebhook.findMany({
    where: {
      event,
      active: true,
      // If job has workspaceId, match webhooks for that workspace or global ones
      ...(job.workspaceId ? {
        OR: [
          { workspaceId: job.workspaceId },
          { workspaceId: null },
        ],
      } : {}),
    },
  })

  if (webhooks.length === 0) {
    console.log(`[EventWebhook] No active webhooks for event: ${event}`)
    return []
  }

  console.log(`[EventWebhook] Dispatching ${event} to ${webhooks.length} webhook(s) for job ${job.id}`)

  // Fire all webhooks in parallel (don't block the API response)
  const results = await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const result = await fireWebhook(webhook, payload)

      // Update the webhook's last triggered info
      await db.eventWebhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          lastStatus: result.success ? 'success' : 'failed',
          lastError: result.error || null,
          failCount: result.success ? 0 : { increment: 1 },
        },
      })

      return result
    })
  )

  // Extract results, filtering out any unexpected rejections
  const dispatchResults: DispatchResult[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      dispatchResults.push(r.value)
    } else {
      console.error('[EventWebhook] Unexpected rejection:', r.reason)
    }
  }

  const successCount = dispatchResults.filter(r => r.success).length
  const failCount = dispatchResults.filter(r => !r.success).length
  console.log(
    `[EventWebhook] ${event} dispatched: ${successCount} success, ${failCount} failed` +
    (failCount > 0 ? ` (errors: ${dispatchResults.filter(r => !r.success).map(r => r.error).join(', ')})` : '')
  )

  return dispatchResults
}

// ─── Event Labels (for UI) ───────────────────────────────────────────────────

export const JOB_EVENT_LABELS: Record<JobEventType, { label: string; description: string; icon: string }> = {
  'job.created': {
    label: 'Job Created',
    description: 'Triggered when a new job is created in the system',
    icon: 'Plus',
  },
  'job.assigned': {
    label: 'Job Assigned',
    description: 'Triggered when an employee is assigned to a job',
    icon: 'UserPlus',
  },
  'job.accepted': {
    label: 'Job Accepted',
    description: 'Triggered when the employee accepts the job',
    icon: 'Check',
  },
  'job.started': {
    label: 'Job Started',
    description: 'Triggered when the employee starts the job (en route)',
    icon: 'Play',
  },
  'job.completed': {
    label: 'Job Completed',
    description: 'Triggered when the job is marked as completed',
    icon: 'CheckCircle',
  },
  'job.cancelled': {
    label: 'Job Cancelled',
    description: 'Triggered when a job is cancelled',
    icon: 'XCircle',
  },
  'job.rejected': {
    label: 'Job Rejected',
    description: 'Triggered when the employee rejects the job',
    icon: 'X',
  },
}

// ─── Quick Setup Helper ──────────────────────────────────────────────────────

/**
 * Create a standard set of event webhooks for a tenant.
 * Useful for onboarding: creates one webhook URL for each common event.
 */
export async function createDefaultEventWebhooks(
  baseUrl: string,
  workspaceId?: string,
  tenantId?: string
) {
  const events: JobEventType[] = [
    'job.created',
    'job.assigned',
    'job.accepted',
    'job.started',
    'job.completed',
    'job.cancelled',
    'job.rejected',
  ]

  const created = []
  for (const event of events) {
    const webhook = await db.eventWebhook.create({
      data: {
        name: `n8n - ${JOB_EVENT_LABELS[event].label}`,
        event,
        url: `${baseUrl}/${event.replace('.', '-')}`,
        method: 'POST',
        active: false, // Disabled by default - user must configure and enable
        workspaceId: workspaceId || null,
        tenantId: tenantId || null,
      },
    })
    created.push(webhook)
  }

  return created
}
