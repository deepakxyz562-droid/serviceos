/**
 * ServiceOS Event Bus
 *
 * A decoupled event system that allows different parts of the application
 * to communicate without direct dependencies.
 *
 * Architecture:
 *   API Route → EventBus.emit() → All registered handlers execute in parallel
 *                                    ├── Internal handlers (notification orchestrator, etc.)
 *                                    ├── External webhook dispatcher (n8n, etc.)
 *                                    └── AuditLog persistence
 *
 * Supported Events:
 *   - job.created, job.updated, job.assigned, job.accepted, job.started, job.completed, job.cancelled, job.rejected
 *   - lead.created, lead.updated, lead.converted
 *   - payment.received, payment.failed
 *   - employee.status_changed, employee.heartbeat
 *   - conversation.message_received, conversation.message_sent
 *   - customer.journey_stage_changed
 *
 * Usage:
 *   // Subscribe to events
 *   EventBus.on('job.created', async (payload) => { ... })
 *
 *   // Emit events (typically from API routes)
 *   await EventBus.emit('job.created', { jobId: '...', title: '...' }, { tenantId: '...' })
 */

import { db } from '@/lib/db'
import { dispatchJobEvent } from '@/lib/event-webhook-dispatcher'
import type { JobEventType } from '@/lib/event-webhook-dispatcher'

// ─── Event Types ──────────────────────────────────────────────────────────────

export type ServiceEvent =
  | 'job.created' | 'job.updated' | 'job.assigned' | 'job.accepted'
  | 'job.started' | 'job.completed' | 'job.cancelled' | 'job.rejected'
  | 'lead.created' | 'lead.updated' | 'lead.converted'
  | 'booking.created' | 'booking.confirmed' | 'booking.cancelled'
  | 'booking.completed' | 'booking.rescheduled'
  | 'contract.renewed' | 'schedule.trigger'
  | 'invoice.created' | 'invoice.paid' | 'invoice.overdue'
  | 'quote.sent' | 'quote.accepted' | 'quote.rejected'
  | 'payment.received' | 'payment.failed'
  | 'employee.status_changed' | 'employee.heartbeat'
  | 'conversation.message_received' | 'conversation.message_sent'
  | 'conversation.state_changed'
  | 'customer.journey_stage_changed'
  | 'journey.lead_created' | 'journey.booking_confirmed' | 'journey.technician_assigned'
  | 'journey.en_route' | 'journey.in_progress' | 'journey.completed'
  | 'journey.review_requested' | 'journey.archived' | 'journey.cancelled'
  | 'journey.custom_action'

export interface EventPayload {
  event: ServiceEvent
  timestamp: string
  tenantId?: string
  workspaceId?: string
  data: Record<string, any>
  metadata?: Record<string, any>
}

export type EventHandler = (payload: EventPayload) => Promise<void>

// ─── Event Labels (for UI and logging) ────────────────────────────────────────

export const SERVICE_EVENT_LABELS: Record<ServiceEvent, { label: string; description: string; category: string }> = {
  'job.created':       { label: 'Job Created',        description: 'A new job was created',                     category: 'job' },
  'job.updated':       { label: 'Job Updated',        description: 'Job details were modified',                 category: 'job' },
  'job.assigned':      { label: 'Job Assigned',       description: 'An employee was assigned to a job',         category: 'job' },
  'job.accepted':      { label: 'Job Accepted',       description: 'The employee accepted the job',             category: 'job' },
  'job.started':       { label: 'Job Started',        description: 'The employee started the job',              category: 'job' },
  'job.completed':     { label: 'Job Completed',      description: 'The job was marked as completed',           category: 'job' },
  'job.cancelled':     { label: 'Job Cancelled',      description: 'The job was cancelled',                     category: 'job' },
  'job.rejected':      { label: 'Job Rejected',       description: 'The employee rejected the job',             category: 'job' },
  'lead.created':      { label: 'Lead Created',       description: 'A new lead was created',                    category: 'lead' },
  'lead.updated':      { label: 'Lead Updated',       description: 'Lead details were modified',                category: 'lead' },
  'lead.converted':    { label: 'Lead Converted',     description: 'A lead was converted to a customer/job',    category: 'lead' },
  'booking.created':   { label: 'Booking Created',    description: 'A new booking was created',                 category: 'booking' },
  'booking.confirmed': { label: 'Booking Confirmed',  description: 'A booking was confirmed',                   category: 'booking' },
  'booking.cancelled': { label: 'Booking Cancelled',  description: 'A booking was cancelled',                   category: 'booking' },
  'booking.completed': { label: 'Booking Completed',  description: 'A booking was completed',                   category: 'booking' },
  'booking.rescheduled': { label: 'Booking Rescheduled', description: 'A booking was rescheduled',              category: 'booking' },
  'contract.renewed':  { label: 'Contract Renewed',   description: 'A service contract was renewed',            category: 'contract' },
  'schedule.trigger':  { label: 'Schedule Trigger',   description: 'A time-based schedule trigger fired',       category: 'schedule' },
  'invoice.created':   { label: 'Invoice Created',    description: 'A new invoice was created',                 category: 'invoice' },
  'invoice.paid':      { label: 'Invoice Paid',       description: 'An invoice was paid',                       category: 'invoice' },
  'invoice.overdue':   { label: 'Invoice Overdue',    description: 'An invoice became overdue',                 category: 'invoice' },
  'quote.sent':        { label: 'Quote Sent',         description: 'A quote was sent to a customer',            category: 'quote' },
  'quote.accepted':    { label: 'Quote Accepted',     description: 'A quote was accepted',                      category: 'quote' },
  'quote.rejected':    { label: 'Quote Rejected',     description: 'A quote was rejected',                      category: 'quote' },
  'payment.received':  { label: 'Payment Received',   description: 'A payment was received',                    category: 'payment' },
  'payment.failed':    { label: 'Payment Failed',     description: 'A payment attempt failed',                  category: 'payment' },
  'employee.status_changed': { label: 'Employee Status Changed', description: 'An employee status was updated',  category: 'employee' },
  'employee.heartbeat':      { label: 'Employee Heartbeat',     description: 'Employee heartbeat ping received', category: 'employee' },
  'conversation.message_received': { label: 'Message Received', description: 'A conversation message was received', category: 'conversation' },
  'conversation.message_sent':     { label: 'Message Sent',     description: 'A conversation message was sent',     category: 'conversation' },
  'conversation.state_changed':        { label: 'Conversation State Changed', description: 'WhatsApp conversation state was updated',        category: 'conversation' },
  'customer.journey_stage_changed': { label: 'Journey Stage Changed', description: 'Customer journey stage was updated', category: 'customer' },
  'journey.lead_created':         { label: 'Journey Lead Created',         description: 'Journey started from a new lead',         category: 'journey' },
  'journey.booking_confirmed':    { label: 'Journey Booking Confirmed',    description: 'Journey booking was confirmed',            category: 'journey' },
  'journey.technician_assigned':  { label: 'Journey Technician Assigned',  description: 'Journey technician was assigned',          category: 'journey' },
  'journey.en_route':             { label: 'Journey En Route',             description: 'Journey technician is en route',           category: 'journey' },
  'journey.in_progress':          { label: 'Journey In Progress',          description: 'Journey service is in progress',          category: 'journey' },
  'journey.completed':            { label: 'Journey Completed',            description: 'Journey service was completed',          category: 'journey' },
  'journey.review_requested':     { label: 'Journey Review Requested',     description: 'Journey review was requested',            category: 'journey' },
  'journey.archived':             { label: 'Journey Archived',             description: 'Journey was archived',                    category: 'journey' },
  'journey.cancelled':            { label: 'Journey Cancelled',            description: 'Journey was cancelled',                   category: 'journey' },
  'journey.custom_action':        { label: 'Journey Custom Action',        description: 'Journey custom action triggered',        category: 'journey' },
}

// ─── Job Events Set ───────────────────────────────────────────────────────────

/** Set of events that are job-related and should be forwarded to the webhook dispatcher */
const JOB_EVENTS: Set<string> = new Set([
  'job.created', 'job.updated', 'job.assigned', 'job.accepted',
  'job.started', 'job.completed', 'job.cancelled', 'job.rejected',
])

/** Map from ServiceEvent to JobEventType (for webhook dispatcher compatibility) */
const JOB_EVENT_MAP: Record<string, JobEventType> = {
  'job.created':   'job.created',
  'job.assigned':  'job.assigned',
  'job.accepted':  'job.accepted',
  'job.started':   'job.started',
  'job.completed': 'job.completed',
  'job.cancelled': 'job.cancelled',
  'job.rejected':  'job.rejected',
}

// ─── Realtime Bridge ──────────────────────────────────────────────────────────

/**
 * Set of events that should be bridged to the socket.io realtime service.
 * These are pushed to browser clients via the mini-service on port 3003.
 */
const REALTIME_BRIDGED_EVENTS: Set<string> = new Set([
  // Job lifecycle events (job.*)
  'job.created',
  'job.updated',
  'job.assigned',
  'job.accepted',
  'job.started',
  'job.completed',
  'job.cancelled',
  'job.rejected',
  // Employee presence / location
  'employee.status_changed',
  'employee.heartbeat',
  'employee.location_updated',
  // GPS pings (emitted by /api/gps/track if wired up)
  'gps.ping',
  // Shift events (shift.* / schedule.*)
  'schedule.trigger',
  'shift.started',
  'shift.completed',
  'shift.break_started',
  'shift.break_ended',
])

/**
 * Returns true if the given event name should be bridged to the realtime
 * service. Matches the explicit set above plus the wildcard patterns
 * `job.*`, `shift.*`, and `gps.*` so future events in those namespaces
 * automatically flow through without needing to update the set.
 */
function shouldBridgeEvent(event: string): boolean {
  if (REALTIME_BRIDGED_EVENTS.has(event)) return true
  if (event.startsWith('job.')) return true
  if (event.startsWith('shift.')) return true
  if (event.startsWith('gps.')) return true
  return false
}

/**
 * Bridge an event to the socket.io realtime service by POSTing to the
 * internal `/broadcast` endpoint on port 3003.
 *
 * This is fire-and-forget: any error is swallowed so a down realtime service
 * never breaks the in-process event flow. Only events with a tenantId in
 * their context are bridged (browser clients are joined to `tenant:<id>`
 * rooms, so without a tenantId there is no room to emit to).
 */
function bridgeToRealtime(
  event: ServiceEvent,
  data: Record<string, any>,
  tenantId?: string,
): void {
  if (!tenantId) return
  if (!shouldBridgeEvent(event)) return

  const internalSecret =
    process.env.REALTIME_INTERNAL_SECRET || 'serviceos-internal'
  const realtimeUrl =
    process.env.REALTIME_BROADCAST_URL ||
    'http://localhost:3003/broadcast'

  const body = {
    event,
    room: `tenant:${tenantId}`,
    payload: {
      event,
      timestamp: new Date().toISOString(),
      tenantId,
      data,
    },
  }

  // Fire-and-forget — swallow errors silently.
  fetch(realtimeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify(body),
  }).catch(() => {
    /* ignore — realtime service may be down or unreachable */
  })
}

// ─── EventBus Singleton ───────────────────────────────────────────────────────

class EventBusClass {
  private handlers: Map<ServiceEvent, EventHandler[]> = new Map()

  /**
   * Register a handler for a specific event.
   * Multiple handlers can be registered for the same event.
   *
   * @param event   - The event to listen for
   * @param handler - Async function called when the event is emitted
   */
  on(event: ServiceEvent, handler: EventHandler): void {
    const existing = this.handlers.get(event) || []
    existing.push(handler)
    this.handlers.set(event, existing)
  }

  /**
   * Remove a previously registered handler for a specific event.
   *
   * @param event   - The event to stop listening for
   * @param handler - The exact handler function reference to remove
   */
  off(event: ServiceEvent, handler: EventHandler): void {
    const existing = this.handlers.get(event)
    if (!existing) return
    const filtered = existing.filter(h => h !== handler)
    if (filtered.length === 0) {
      this.handlers.delete(event)
    } else {
      this.handlers.set(event, filtered)
    }
  }

  /**
   * Emit an event, triggering all registered handlers in parallel.
   *
   * This method:
   * 1. Builds the payload with ISO timestamp
   * 2. Calls all registered handlers via Promise.allSettled (errors are logged, not thrown)
   * 3. Dispatches to the event-webhook-dispatcher for external webhooks (job events)
   * 4. Creates an AuditLog entry for the event
   *
   * @param event   - The event type to emit
   * @param data    - Event-specific data payload
   * @param context - Optional context (tenantId, workspaceId)
   */
  async emit(
    event: ServiceEvent,
    data: Record<string, any>,
    context?: { tenantId?: string; workspaceId?: string }
  ): Promise<void> {
    const payload: EventPayload = {
      event,
      timestamp: new Date().toISOString(),
      tenantId: context?.tenantId,
      workspaceId: context?.workspaceId,
      data,
      metadata: {},
    }

    console.log(`[EventBus] Emitting: ${event}`, {
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
    })

    // ── 1. Execute all registered internal handlers in parallel ──
    const handlers = this.handlers.get(event) || []
    if (handlers.length > 0) {
      const results = await Promise.allSettled(
        handlers.map(handler => handler(payload))
      )

      // Log any handler failures (but don't throw)
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          console.error(
            `[EventBus] Handler #${i + 1} for "${event}" failed:`,
            result.reason
          )
        }
      }
    }

    // ── 2. Dispatch to external webhooks (for job events) ──
    if (JOB_EVENTS.has(event) && JOB_EVENT_MAP[event]) {
      const jobEventType = JOB_EVENT_MAP[event]
      const job = data.job || data

      // Only dispatch if the data looks like a job object (has an id)
      if (job && typeof job === 'object' && job.id) {
        try {
          await dispatchJobEvent(jobEventType, job, {
            employee: data.employee || null,
            customer: data.customer || null,
            metadata: data.metadata || undefined,
          })
        } catch (err) {
          console.error(`[EventBus] Webhook dispatch failed for "${event}":`, err)
        }
      }
    }

    // ── 3. Create AuditLog entry ──
    try {
      await db.auditLog.create({
        data: {
          userId: data.userId || data.actorId || null,
          action: event,
          resourceType: payload.data.resourceType || event.split('.')[0] || null,
          resourceId: payload.data.resourceId || payload.data.id || payload.data.jobId || null,
          metadataJson: JSON.stringify({
            event,
            timestamp: payload.timestamp,
            tenantId: payload.tenantId,
            workspaceId: payload.workspaceId,
            // Strip large fields from audit to keep the log manageable
            dataKeys: Object.keys(payload.data),
            ...(payload.data.summary ? { summary: payload.data.summary } : {}),
            ...(payload.data.reason ? { reason: payload.data.reason } : {}),
            ...(payload.data.status ? { status: payload.data.status } : {}),
            ...(payload.data.fromStatus ? { fromStatus: payload.data.fromStatus } : {}),
            ...(payload.data.toStatus ? { toStatus: payload.data.toStatus } : {}),
          }),
        },
      })
    } catch (err) {
      console.error(`[EventBus] Failed to create AuditLog for "${event}":`, err)
    }

    // ── 4. Bridge to socket.io realtime service (fire-and-forget) ──
    // Only events with a tenantId in their context are bridged (browser
    // clients are joined to `tenant:<id>` rooms on the socket server).
    try {
      bridgeToRealtime(event, data, payload.tenantId)
    } catch {
      // Never let the realtime bridge break the in-process event flow.
    }
  }

  /**
   * Get the number of registered handlers for a given event.
   * Useful for debugging and testing.
   */
  handlerCount(event: ServiceEvent): number {
    return this.handlers.get(event)?.length || 0
  }

  /**
   * Remove all handlers for all events.
   * Primarily useful for testing.
   */
  removeAllHandlers(): void {
    this.handlers.clear()
  }

  /**
   * Get all events that have at least one handler registered.
   * Useful for debugging and introspection.
   */
  registeredEvents(): ServiceEvent[] {
    return Array.from(this.handlers.keys()).filter(
      event => (this.handlers.get(event)?.length || 0) > 0
    )
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const EventBus = new EventBusClass()
