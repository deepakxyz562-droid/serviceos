/**
 * ScheduledExecution Processor
 * ────────────────────────────────
 * Persistent, cron-driven replacement for the `setTimeout()` pattern in
 * trigger-engine.ts. When a workflow automation has a `delayMinutes > 0`,
 * the trigger engine creates a `ScheduledExecution` row (instead of using
 * setTimeout, which dies on serverless cold-starts / restarts) and this
 * processor picks it up when due.
 *
 * Each row stores:
 *   - actionsJson  : the workflow automation's action list (same shape as
 *                    WorkflowAutomation.actionsJson — `[{type, config}]`)
 *   - contextJson  : the original EventPayload snapshot (data + tenantId +
 *                    workspaceId + the triggering event name)
 *   - triggerEvent : the ServiceEvent name that fired the automation
 *
 * On execution:
 *   1. Parse actionsJson + contextJson
 *   2. Reconstruct the EventPayload from contextJson
 *   3. For each action, call the shared `executeAction()` from trigger-engine
 *   4. Mark the row as 'completed' (success) or 'failed' (error)
 *
 * The shared `executeAction()` lives in `@/lib/trigger-engine` and is the
 * exact same code path the immediate (non-delayed) trigger engine uses, so
 * delayed and immediate automations behave identically.
 */

import { db } from '@/lib/db'
import { executeAction } from '@/lib/trigger-engine'
import type { EventPayload } from '@/lib/event-bus'

export interface ProcessScheduledExecutionsResult {
  processed: number
  completed: number
  failed: number
}

interface StoredContext {
  event?: string
  tenantId?: string
  workspaceId?: string
  data?: Record<string, any>
  // The legacy shape stored the whole EventPayload directly. Support both.
  [k: string]: unknown
}

/**
 * Process all due ScheduledExecutions.
 *
 * Returns counts of how many were picked up, how many completed
 * successfully, and how many failed. Failures do NOT abort the batch.
 */
export async function processDueScheduledExecutions(): Promise<ProcessScheduledExecutionsResult> {
  const now = new Date()

  // ── Select all due pending executions ─────────────────────────────
  // Bounded batch so a long backlog doesn't blow up a single cron tick.
  const BATCH_SIZE = 100
  const dueExecutions = await db.scheduledExecution.findMany({
    where: {
      status: 'pending',
      dueAt: { lte: now },
    },
    orderBy: { dueAt: 'asc' },
    take: BATCH_SIZE,
  })

  if (dueExecutions.length === 0) {
    return { processed: 0, completed: 0, failed: 0 }
  }

  let completed = 0
  let failed = 0

  // Sequential — actions inside a single execution may have side effects
  // (creating jobs, sending WhatsApps) that we don't want to parallelize
  // across rows.
  for (const exec of dueExecutions) {
    try {
      // Mark as executing (best-effort) so a concurrent cron worker
      // doesn't pick the same row up.
      try {
        await db.scheduledExecution.update({
          where: { id: exec.id },
          data: { status: 'executing', attempts: { increment: 1 }, updatedAt: new Date() },
        })
      } catch {
        // ignore — race-condition guard only
      }

      const result = await runScheduledExecution(exec)

      if (result.success) {
        completed++
      } else {
        failed++
      }
    } catch (err) {
      console.error(
        `[ScheduledExecutions] Unhandled error processing execution ${exec.id} (${exec.triggerEvent}):`,
        err
      )
      failed++
      try {
        await db.scheduledExecution.update({
          where: { id: exec.id },
          data: {
            status: 'failed',
            lastError:
              err instanceof Error
                ? `${err.name}: ${err.message}`.slice(0, 500)
                : String(err).slice(0, 500),
            executedAt: new Date(),
            updatedAt: new Date(),
          },
        })
      } catch {
        // best-effort
      }
    }
  }

  return { processed: dueExecutions.length, completed, failed }
}

type ScheduledExecutionRow = {
  id: string
  tenantId: string
  automationId: string | null
  triggerEvent: string
  entityType: string | null
  entityId: string | null
  delayMinutes: number
  dueAt: Date
  executedAt: Date | null
  status: string
  actionsJson: string
  contextJson: string
  attempts: number
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Execute the actions stored on a single ScheduledExecution row.
 *
 * Reconstructs the EventPayload from contextJson, then runs each action via
 * the shared `executeAction()` from trigger-engine.ts. The row is updated
 * with the final status + a TriggerExecution log entry is created (so delayed
 * executions show up in the same audit trail as immediate ones).
 */
async function runScheduledExecution(
  exec: ScheduledExecutionRow
): Promise<{ success: boolean; error?: string }> {
  let actions: Array<{ type: string; config: Record<string, any> }> = []
  let context: StoredContext = {}

  try {
    actions = JSON.parse(exec.actionsJson || '[]')
  } catch (err) {
    const error = `Failed to parse actionsJson: ${err instanceof Error ? err.message : String(err)}`
    await markFailed(exec, error)
    return { success: false, error }
  }

  try {
    context = JSON.parse(exec.contextJson || '{}') as StoredContext
  } catch (err) {
    const error = `Failed to parse contextJson: ${err instanceof Error ? err.message : String(err)}`
    await markFailed(exec, error)
    return { success: false, error }
  }

  // ── Reconstruct the EventPayload that executeAction() expects ──────
  // The trigger engine stores the full payload snapshot in contextJson,
  // including `event`, `tenantId`, `workspaceId`, and `data`. We tolerate
  // the legacy shape where context IS the payload object.
  const payload: EventPayload = {
    event: (context.event as EventPayload['event']) || (exec.triggerEvent as EventPayload['event']),
    timestamp: new Date().toISOString(),
    tenantId: context.tenantId ?? exec.tenantId ?? undefined,
    workspaceId: context.workspaceId ?? undefined,
    data: (context.data as Record<string, any>) || {},
    metadata: {},
  }

  // ── Execute each action, capturing per-action results ──────────────
  const actionResults: Array<{ success: boolean; result?: any; error?: string }> = []
  let overallStatus: 'success' | 'partial' | 'failed' = 'success'
  let firstError: string | undefined

  for (const action of actions) {
    try {
      const r = await executeAction(action, payload)
      actionResults.push(r)
      if (!r.success) {
        if (overallStatus === 'success') overallStatus = 'partial'
        if (!firstError) firstError = r.error
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      actionResults.push({ success: false, error: errMsg })
      if (overallStatus === 'success') overallStatus = 'partial'
      if (!firstError) firstError = errMsg
    }
  }

  // If every action failed, mark as failed; otherwise completed.
  if (actionResults.length > 0 && actionResults.every((r) => !r.success)) {
    overallStatus = 'failed'
  }

  const isCompleted = overallStatus !== 'failed'

  try {
    await db.scheduledExecution.update({
      where: { id: exec.id },
      data: {
        status: isCompleted ? 'completed' : 'failed',
        executedAt: new Date(),
        lastError: isCompleted ? null : (firstError ?? undefined)?.slice(0, 500) ?? null,
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error(
      `[ScheduledExecutions] Failed to mark execution ${exec.id} as ${isCompleted ? 'completed' : 'failed'}:`,
      err
    )
  }

  // ── Mirror the result into TriggerExecution so the audit trail is unified ──
  // The immediate (non-delayed) path writes a TriggerExecution row; we do
  // the same here so a tenant's automation history shows both immediate and
  // delayed runs in one place. Best-effort.
  if (exec.automationId) {
    try {
      await db.triggerExecution.create({
        data: {
          automationId: exec.automationId,
          triggerEvent: exec.triggerEvent,
          triggerPayload: JSON.stringify(payload.data),
          conditionsMet: true,
          actionsResultsJson: JSON.stringify(actionResults),
          status: overallStatus,
          error: isCompleted ? undefined : firstError,
          durationMs: 0,
          tenantId: exec.tenantId || null,
        },
      })
    } catch (err) {
      console.warn(
        `[ScheduledExecutions] Failed to create TriggerExecution mirror row for ${exec.id}:`,
        err
      )
    }
  }

  return { success: isCompleted, error: isCompleted ? undefined : firstError }
}

async function markFailed(exec: ScheduledExecutionRow, error: string): Promise<void> {
  try {
    await db.scheduledExecution.update({
      where: { id: exec.id },
      data: {
        status: 'failed',
        lastError: error.slice(0, 500),
        executedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  } catch {
    // best-effort
  }
}
