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
 *   - lead.created, lead.updated, lead.converted, lead.assigned
 *   - quote.created, quote.sent, quote.accepted, quote.rejected
 *   - invoice.created, invoice.sent
 *   - payment.received, payment.failed
 *   - review.request, review.received
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
import { orchestrateNotification, buildJobTemplateData, buildEmployeeTemplateData } from '@/lib/notification-orchestrator'
import type { NotificationChannel } from '@/lib/notification-orchestrator'

// ─── Event Types ──────────────────────────────────────────────────────────────

export type ServiceEvent =
  | 'job.created' | 'job.updated' | 'job.assigned' | 'job.accepted'
  | 'job.started' | 'job.completed' | 'job.cancelled' | 'job.rejected'
  | 'lead.created' | 'lead.updated' | 'lead.converted' | 'lead.assigned'
  | 'quote.created' | 'quote.sent' | 'quote.accepted' | 'quote.rejected'
  | 'invoice.created' | 'invoice.sent'
  | 'payment.received' | 'payment.failed'
  | 'review.request' | 'review.received'
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
  'lead.assigned':     { label: 'Lead Assigned',      description: 'A lead was assigned to an employee',        category: 'lead' },
  'quote.created':     { label: 'Quote Created',      description: 'A new quote was created',                   category: 'quote' },
  'quote.sent':        { label: 'Quote Sent',         description: 'A quote was sent to the customer',          category: 'quote' },
  'quote.accepted':    { label: 'Quote Accepted',     description: 'A customer accepted a quote',               category: 'quote' },
  'quote.rejected':    { label: 'Quote Rejected',     description: 'A customer rejected a quote',               category: 'quote' },
  'invoice.created':   { label: 'Invoice Created',    description: 'A new invoice was created',                 category: 'invoice' },
  'invoice.sent':      { label: 'Invoice Sent',       description: 'An invoice was sent to the customer',       category: 'invoice' },
  'payment.received':  { label: 'Payment Received',   description: 'A payment was received',                    category: 'payment' },
  'payment.failed':    { label: 'Payment Failed',     description: 'A payment attempt failed',                  category: 'payment' },
  'review.request':    { label: 'Review Requested',   description: 'A review request was sent',                 category: 'review' },
  'review.received':   { label: 'Review Received',    description: 'A new review was received',                 category: 'review' },
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

// ─── Auto-Notification Handlers ───────────────────────────────────────────────

/**
 * Scenario 1: Lead Created → Auto WhatsApp to customer
 * When a new lead comes in (from WordPress, manual, etc.), automatically
 * send a WhatsApp welcome message to the customer.
 */
async function handleLeadCreatedAutoWhatsApp(payload: EventPayload): Promise<void> {
  const { phone, name, source, tenantId } = payload.data
  if (!phone) return

  try {
    let tenantName = 'ServiceOS'
    if (tenantId) {
      try {
        const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
        if (tenant?.name) tenantName = tenant.name
      } catch {}
    }

    const message = [
      `👋 Hello${name ? ` ${name}` : ''}!`,
      '',
      `Thank you for reaching out to ${tenantName}!`,
      `We've received your inquiry${source === 'wordpress' ? ' from our website' : ''}.`,
      '',
      'Our team will get back to you shortly.',
      '',
      `— ${tenantName}`,
    ].join('\n')

    await orchestrateNotification({
      channels: ['whatsapp', 'email'],
      recipient: {
        phone,
        email: payload.data.email,
        name,
        role: 'customer',
      },
      template: 'custom',
      templateData: {
        subject: `Thank you for your inquiry - ${tenantName}`,
        message,
      },
      context: {
        tenantId,
        workspaceId: payload.workspaceId,
      },
    })

    console.log(`[EventBus] Auto WhatsApp sent to customer for lead: ${name || phone}`)
  } catch (err) {
    console.error('[EventBus] Failed to auto-send WhatsApp for lead.created:', err)
  }
}

/**
 * Scenario 3: Lead Assigned → WhatsApp notification to assigned employee
 */
async function handleLeadAssignedNotification(payload: EventPayload): Promise<void> {
  const { assignedToId, name, phone, serviceType, tenantId } = payload.data
  if (!assignedToId) return

  try {
    const employee = await db.employee.findUnique({ where: { id: assignedToId } })
    if (!employee || !employee.phone) return

    const message = [
      '🎯 New Lead Assigned to You',
      '',
      `Customer: ${name || 'N/A'}`,
      `Phone: ${phone || 'N/A'}`,
      `Service: ${serviceType || 'N/A'}`,
      '',
      'Please follow up promptly!',
    ].join('\n')

    await orchestrateNotification({
      channels: ['whatsapp', 'email'],
      recipient: {
        phone: employee.phone,
        email: employee.email,
        name: employee.name,
        userId: employee.userId || undefined,
        role: 'employee',
        whatsappId: employee.whatsappId,
      },
      template: 'custom',
      templateData: {
        subject: `New Lead Assigned: ${name || 'N/A'}`,
        message,
      },
      context: {
        tenantId,
        workspaceId: employee.workspaceId || payload.workspaceId,
        employeeId: employee.id,
      },
    })

    console.log(`[EventBus] Lead assigned WhatsApp sent to employee: ${employee.name}`)
  } catch (err) {
    console.error('[EventBus] Failed to send lead assigned notification:', err)
  }
}

/**
 * Scenario 4: Quote Sent → WhatsApp to customer with quote link
 */
async function handleQuoteSentNotification(payload: EventPayload): Promise<void> {
  const { quoteId, quoteNumber, customerPhone, customerEmail, customerName, title, total, currency, approvalToken, tenantId } = payload.data
  if (!customerPhone && !customerEmail) return

  try {
    let tenantName = 'ServiceOS'
    if (tenantId) {
      try {
        const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
        if (tenant?.name) tenantName = tenant.name
      } catch {}
    }

    const approvalLink = approvalToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/quote/approve/${approvalToken}`
      : ''

    const message = [
      `📋 Your Quote from ${tenantName}`,
      '',
      `Quote #: ${quoteNumber || 'N/A'}`,
      `Service: ${title || 'N/A'}`,
      `Amount: ${currency || '$'}${total?.toFixed(2) || 'N/A'}`,
      '',
      approvalLink ? `View & Accept: ${approvalLink}` : 'Please review and let us know your decision.',
      '',
      `— ${tenantName}`,
    ].join('\n')

    await orchestrateNotification({
      channels: ['whatsapp', 'email'],
      recipient: {
        phone: customerPhone,
        email: customerEmail,
        name: customerName,
        role: 'customer',
      },
      template: 'custom',
      templateData: {
        subject: `Quote #${quoteNumber || 'N/A'} from ${tenantName}`,
        message,
        htmlBody: [
          `<h2>📋 Your Quote from ${tenantName}</h2>`,
          `<ul>`,
          `<li><strong>Quote #:</strong> ${quoteNumber || 'N/A'}</li>`,
          `<li><strong>Service:</strong> ${title || 'N/A'}</li>`,
          `<li><strong>Amount:</strong> ${currency || '$'}${total?.toFixed(2) || 'N/A'}</li>`,
          `</ul>`,
          approvalLink ? `<p><a href="${approvalLink}" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View & Accept Quote</a></p>` : '<p>Please review and let us know your decision.</p>',
        ].join('\n'),
      },
      context: {
        tenantId,
        workspaceId: payload.workspaceId,
      },
    })

    console.log(`[EventBus] Quote sent WhatsApp sent to customer: ${customerName || customerPhone}`)
  } catch (err) {
    console.error('[EventBus] Failed to send quote sent notification:', err)
  }
}

/**
 * Scenario 5: Job Assigned → WhatsApp notification to employee with job details
 */
async function handleJobAssignedAutoNotification(payload: EventPayload): Promise<void> {
  const { job, employee } = payload.data
  if (!employee?.phone && !employee?.whatsappId) return

  try {
    await orchestrateNotification({
      channels: ['whatsapp', 'email', 'sms'] as NotificationChannel[],
      recipient: {
        phone: employee.phone || employee.whatsappId,
        email: employee.email,
        name: employee.name,
        userId: employee.userId,
        role: 'employee',
        whatsappId: employee.whatsappId,
      },
      template: 'job_assigned',
      templateData: {
        ...buildJobTemplateData(job || payload.data),
        ...buildEmployeeTemplateData(employee),
      },
      context: {
        tenantId: payload.tenantId,
        workspaceId: payload.workspaceId || employee.workspaceId,
        jobId: job?.id || payload.data.jobId,
        employeeId: employee.id,
        customerId: job?.customerId,
      },
    })

    console.log(`[EventBus] Job assigned WhatsApp sent to employee: ${employee.name}`)
  } catch (err) {
    console.error('[EventBus] Failed to send job assigned notification:', err)
  }
}

/**
 * Job Completed → Send review request to customer
 */
async function handleJobCompletedAutoReview(payload: EventPayload): Promise<void> {
  const { job, employee } = payload.data
  if (!job?.customerPhone && !job?.customerEmail) return

  try {
    await orchestrateNotification({
      channels: ['whatsapp', 'email'] as NotificationChannel[],
      recipient: {
        phone: job.customerPhone,
        email: job.customerEmail,
        name: job.customerName,
        userId: job.customerUserId,
        role: 'customer',
      },
      template: 'review_request',
      templateData: {
        ...buildJobTemplateData(job),
        ...buildEmployeeTemplateData(employee || {}),
      },
      context: {
        tenantId: payload.tenantId,
        workspaceId: payload.workspaceId,
        jobId: job.id,
        employeeId: employee?.id,
        customerId: job.customerId,
      },
    })

    console.log(`[EventBus] Review request sent for completed job: ${job.id}`)
  } catch (err) {
    console.error('[EventBus] Failed to send review request:', err)
  }
}

/**
 * Quote Accepted → Auto-create job from accepted quote
 */
async function handleQuoteAcceptedAutoJob(payload: EventPayload): Promise<void> {
  const { quoteId, tenantId, workspaceId } = payload.data
  if (!quoteId) return

  try {
    const quote = await db.quote.findUnique({ where: { id: quoteId } })
    if (!quote || quote.status !== 'accepted') return

    // Check if a job was already created from this quote
    const existingJob = await db.job.findFirst({
      where: {
        customerPhone: quote.customerPhone || undefined,
        title: quote.title,
        workspaceId: workspaceId || undefined,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Only auto-create if no recent job exists for this quote
    if (existingJob && (Date.now() - new Date(existingJob.createdAt).getTime()) < 60000) {
      console.log(`[EventBus] Job already exists for quote ${quoteId}, skipping auto-create`)
      return
    }

    const job = await db.job.create({
      data: {
        title: quote.title,
        description: quote.description,
        status: 'pending',
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        workspaceId: workspaceId || null,
      },
    })

    // Update quote status to won
    await db.quote.update({
      where: { id: quoteId },
      data: { status: 'won' },
    })

    // Emit job.created event
    await EventBus.emit('job.created', {
      jobId: job.id,
      title: job.title,
      customerPhone: job.customerPhone,
      customerName: job.customerName,
      resourceType: 'job',
      resourceId: job.id,
      summary: `Job auto-created from accepted quote #${quote.quoteNumber}`,
    }, { tenantId, workspaceId })

    console.log(`[EventBus] Job auto-created from accepted quote: ${quoteId} → Job ${job.id}`)
  } catch (err) {
    console.error('[EventBus] Failed to auto-create job from quote:', err)
  }
}

// ─── EventBus Singleton ───────────────────────────────────────────────────────

class EventBusClass {
  private handlers: Map<ServiceEvent, EventHandler[]> = new Map()
  private initialized = false

  /**
   * Register a handler for a specific event.
   * Multiple handlers can be registered for the same event.
   */
  on(event: ServiceEvent, handler: EventHandler): void {
    const existing = this.handlers.get(event) || []
    existing.push(handler)
    this.handlers.set(event, existing)
  }

  /**
   * Remove a previously registered handler for a specific event.
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
   * Initialize auto-notification handlers.
   * Called once on first emit to register all workflow automation handlers.
   */
  private ensureInitialized(): void {
    if (this.initialized) return
    this.initialized = true

    // Scenario 1: Lead Created → Auto WhatsApp to customer
    this.on('lead.created', handleLeadCreatedAutoWhatsApp)

    // Scenario 3: Lead Assigned → WhatsApp notification to assigned employee
    this.on('lead.assigned', handleLeadAssignedNotification)

    // Scenario 4: Quote Sent → WhatsApp to customer with quote link
    this.on('quote.sent', handleQuoteSentNotification)

    // Scenario 5: Job Assigned → WhatsApp notification to employee
    this.on('job.assigned', handleJobAssignedAutoNotification)

    // Job Completed → Send review request to customer
    this.on('job.completed', handleJobCompletedAutoReview)

    // Quote Accepted → Auto-create job
    this.on('quote.accepted', handleQuoteAcceptedAutoJob)

    console.log('[EventBus] Auto-notification handlers initialized')
  }

  /**
   * Emit an event, triggering all registered handlers in parallel.
   *
   * This method:
   * 1. Initializes auto-notification handlers on first call
   * 2. Builds the payload with ISO timestamp
   * 3. Calls all registered handlers via Promise.allSettled (errors are logged, not thrown)
   * 4. Dispatches to the event-webhook-dispatcher for external webhooks (job events)
   * 5. Creates an AuditLog entry for the event
   */
  async emit(
    event: ServiceEvent,
    data: Record<string, any>,
    context?: { tenantId?: string; workspaceId?: string }
  ): Promise<void> {
    // Initialize handlers on first emit
    this.ensureInitialized()

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
          resourceId: payload.data.resourceId || payload.data.id || payload.data.jobId || payload.data.leadId || payload.data.quoteId || null,
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
  }

  /**
   * Get the number of registered handlers for a given event.
   */
  handlerCount(event: ServiceEvent): number {
    return this.handlers.get(event)?.length || 0
  }

  /**
   * Remove all handlers for all events.
   */
  removeAllHandlers(): void {
    this.handlers.clear()
    this.initialized = false
  }

  /**
   * Get all events that have at least one handler registered.
   */
  registeredEvents(): ServiceEvent[] {
    return Array.from(this.handlers.keys()).filter(
      event => (this.handlers.get(event)?.length || 0) > 0
    )
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const EventBus = new EventBusClass()
