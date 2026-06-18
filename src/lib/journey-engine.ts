/**
 * ServiceOS Customer Journey Engine
 *
 * Automates the customer lifecycle:
 *
 * Stages: Lead → Booking → Assigned → En Route → In Progress → Completed → Review
 *
 * Each stage triggers:
 *   - WhatsApp message to customer
 *   - Email notification (if email available)
 *   - Internal status update
 *   - Journey stage change event on the Event Bus
 *
 * Supports delay-based actions:
 *   - "Send review request 2 hours after completion"
 *   - "Send reminder 24 hours before appointment"
 *   - "Follow up with lead after 1 hour if no response"
 *
 * Usage:
 *   await JourneyEngine.advanceStage(jobId, 'assigned', { employee });
 *   await JourneyEngine.scheduleAction(jobId, 'review_request', 2 * 60 * 60 * 1000); // 2 hours
 */

import { db } from '@/lib/db'
import { EventBus, type ServiceEvent } from '@/lib/event-bus'
import { sendJobNotification } from '@/lib/notification-orchestrator'

// ─── Types ────────────────────────────────────────────────────────────────────

export type JourneyStage =
  | 'lead'
  | 'booking'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'review'
  | 'archived'
  | 'cancelled'

export interface CustomerJourney {
  id: string
  jobId: string
  leadId?: string | null
  customerId?: string | null
  tenantId?: string | null
  currentStage: JourneyStage
  previousStage: JourneyStage | null
  stageHistory: StageHistoryEntry[]
  scheduledActions: ScheduledAction[]
  context: JourneyContext
  createdAt: Date
  updatedAt: Date
}

export interface StageHistoryEntry {
  stage: JourneyStage
  enteredAt: string
  exitedAt?: string | null
  triggeredBy?: string | null
  metadata?: Record<string, unknown>
}

export interface ScheduledAction {
  id: string
  jobId: string
  actionType: ScheduledActionType
  scheduledFor: string
  executedAt?: string | null
  status: 'pending' | 'executed' | 'cancelled' | 'failed'
  actionData?: Record<string, unknown>
  createdAt: string
}

export type ScheduledActionType =
  | 'review_request'
  | 'appointment_reminder'
  | 'lead_follow_up'
  | 'completion_follow_up'
  | 'no_response_follow_up'
  | 'custom'

export interface JourneyContext {
  employee?: {
    id: string
    name: string
    phone: string
    role?: string
  } | null
  customer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null
  job?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface StageAction {
  stage: JourneyStage
  notifications: NotificationAction[]
  scheduledActions: ScheduledActionConfig[]
  eventBusEvents: ServiceEvent[]
}

export interface NotificationAction {
  channel: 'whatsapp' | 'email' | 'sms' | 'in_app'
  recipient: 'customer' | 'employee' | 'both'
  template: string
  interactive?: boolean
}

export interface ScheduledActionConfig {
  actionType: ScheduledActionType
  delayMs: number
  condition?: (context: JourneyContext) => boolean
}

// ─── Stage Transition Map ─────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  lead: ['booking', 'cancelled'],
  booking: ['assigned', 'cancelled'],
  assigned: ['en_route', 'cancelled', 'booking'],
  en_route: ['in_progress', 'cancelled', 'assigned'],
  in_progress: ['completed', 'cancelled', 'assigned'],
  completed: ['review', 'cancelled'],
  review: ['archived'],
  archived: [],
  cancelled: ['lead'],
}

// ─── Stage Action Configurations ──────────────────────────────────────────────

const STAGE_ACTIONS: Record<JourneyStage, StageAction> = {
  lead: {
    stage: 'lead',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'lead_acknowledgment' },
    ],
    scheduledActions: [
      { actionType: 'lead_follow_up', delayMs: 60 * 60 * 1000 }, // 1 hour
    ],
    eventBusEvents: ['journey.lead_created'],
  },
  booking: {
    stage: 'booking',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'booking_confirmed', interactive: true },
    ],
    scheduledActions: [
      { actionType: 'appointment_reminder', delayMs: 24 * 60 * 60 * 1000 }, // 24 hours before
    ],
    eventBusEvents: ['journey.booking_confirmed'],
  },
  assigned: {
    stage: 'assigned',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'technician_assigned' },
      { channel: 'whatsapp', recipient: 'employee', template: 'job_assigned', interactive: true },
    ],
    scheduledActions: [],
    eventBusEvents: ['journey.technician_assigned'],
  },
  en_route: {
    stage: 'en_route',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'technician_en_route' },
    ],
    scheduledActions: [],
    eventBusEvents: ['journey.en_route'],
  },
  in_progress: {
    stage: 'in_progress',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'service_in_progress' },
    ],
    scheduledActions: [],
    eventBusEvents: ['journey.in_progress'],
  },
  completed: {
    stage: 'completed',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'service_completed', interactive: true },
      { channel: 'whatsapp', recipient: 'employee', template: 'job_completed' },
    ],
    scheduledActions: [
      { actionType: 'review_request', delayMs: 2 * 60 * 60 * 1000 }, // 2 hours after
      { actionType: 'completion_follow_up', delayMs: 24 * 60 * 60 * 1000 }, // 24 hours after
    ],
    eventBusEvents: ['journey.completed'],
  },
  review: {
    stage: 'review',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'review_request', interactive: true },
    ],
    scheduledActions: [],
    eventBusEvents: ['journey.review_requested'],
  },
  archived: {
    stage: 'archived',
    notifications: [],
    scheduledActions: [],
    eventBusEvents: ['journey.archived'],
  },
  cancelled: {
    stage: 'cancelled',
    notifications: [
      { channel: 'whatsapp', recipient: 'customer', template: 'booking_cancelled' },
    ],
    scheduledActions: [],
    eventBusEvents: ['journey.cancelled'],
  },
}

// ─── In-Memory Scheduled Actions Store ────────────────────────────────────────
// In production, this would be replaced with a persistent job queue (BullMQ, etc.)

const scheduledActionsStore = new Map<string, ScheduledAction>()
let actionIdCounter = 0

function generateActionId(): string {
  actionIdCounter++
  return `sa_${Date.now()}_${actionIdCounter}`
}

// ─── In-Memory Journey Store ──────────────────────────────────────────────────
// Maps jobId → CustomerJourney. Persisted via Job/Lead DB records.

const journeyCache = new Map<string, CustomerJourney>()

// ─── Notification Templates ───────────────────────────────────────────────────

interface NotificationTemplate {
  whatsapp: {
    customer: string
    employee: string
  }
  email?: {
    customer?: string
    employee?: string
  }
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  lead_acknowledgment: {
    whatsapp: {
      customer: '👋 Hello! Thanks for reaching out. We\'ve received your request and will get back to you shortly.',
      employee: '',
    },
  },
  booking_confirmed: {
    whatsapp: {
      customer: '📋 Your booking has been confirmed! We\'ll assign a technician shortly and notify you.',
      employee: '',
    },
  },
  technician_assigned: {
    whatsapp: {
      customer: '✅ A technician has been assigned to your service. You\'ll be notified when they\'re on the way.',
      employee: '',
    },
  },
  job_assigned: {
    whatsapp: {
      customer: '',
      employee: '🔔 New job assigned to you. Please review and accept.',
    },
  },
  technician_en_route: {
    whatsapp: {
      customer: '🚀 Your technician is on the way! Please ensure someone is available at the location.',
      employee: '',
    },
  },
  service_in_progress: {
    whatsapp: {
      customer: '🔧 Your service is now in progress. The technician is working on your request.',
      employee: '',
    },
  },
  service_completed: {
    whatsapp: {
      customer: '✅ Your service has been completed! We hope everything went well. Thank you for choosing us!',
      employee: '🎉 Job completed! Great work.',
    },
  },
  job_completed: {
    whatsapp: {
      customer: '',
      employee: '🎉 Job completed! Great work.',
    },
  },
  review_request: {
    whatsapp: {
      customer: '⭐ How was your experience? We\'d love your feedback! Please rate our service.',
      employee: '',
    },
  },
  booking_cancelled: {
    whatsapp: {
      customer: '❌ Your booking has been cancelled. If this was a mistake, please contact us to reschedule.',
      employee: '',
    },
  },
  lead_follow_up_msg: {
    whatsapp: {
      customer: '👋 Hi! We noticed we haven\'t heard back from you. Would you still like to proceed with your service request?',
      employee: '',
    },
  },
  appointment_reminder_msg: {
    whatsapp: {
      customer: '⏰ Reminder: You have a service appointment scheduled. We look forward to seeing you!',
      employee: '',
    },
  },
  completion_follow_up_msg: {
    whatsapp: {
      customer: '👋 Hi! Just checking in after your recent service. Is everything working well? Let us know if you need anything.',
      employee: '',
    },
  },
  no_response_follow_up_msg: {
    whatsapp: {
      customer: '👋 We\'re still here if you need us! Feel free to reply anytime to continue.',
      employee: '',
    },
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isValidTransition(from: JourneyStage, to: JourneyStage): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

function nowISO(): string {
  return new Date().toISOString()
}

/**
 * Build a CustomerJourney from database records (Job + Lead).
 */
async function buildJourneyFromJob(jobId: string): Promise<CustomerJourney | null> {
  // Check cache first
  if (journeyCache.has(jobId)) {
    return journeyCache.get(jobId)!
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      assignee: true,
      customer: true,
      lead: true,
    },
  })

  if (!job) return null

  // Map job status to journey stage
  const currentStage = jobStatusToJourneyStage(job.status)
  const previousStage: JourneyStage | null = null

  // Parse stage history from notificationLogJson
  let stageHistory: StageHistoryEntry[] = []
  try {
    const logData = JSON.parse(job.notificationLogJson || '[]')
    const historyEntries = logData.filter(
      (entry: Record<string, unknown>) => entry.action === 'journey_stage_change'
    )
    stageHistory = historyEntries.map((entry: Record<string, unknown>) => ({
      stage: entry.stage as JourneyStage,
      enteredAt: entry.timestamp as string,
      exitedAt: entry.exitedAt as string | null,
      triggeredBy: entry.triggeredBy as string | null,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    }))
  } catch {
    stageHistory = []
  }

  // If no history, create initial entry
  if (stageHistory.length === 0) {
    stageHistory = [
      {
        stage: currentStage,
        enteredAt: job.createdAt.toISOString(),
        triggeredBy: 'system',
      },
    ]
  }

  // Collect scheduled actions for this job
  const scheduledActions: ScheduledAction[] = []
  for (const [, action] of Array.from(scheduledActionsStore)) {
    if (action.jobId === jobId) {
      scheduledActions.push(action)
    }
  }

  // Build context
  const context: JourneyContext = {
    employee: job.assignee
      ? {
          id: job.assignee.id,
          name: job.assignee.name,
          phone: job.assignee.phone,
          role: job.assignee.role,
        }
      : null,
    customer: job.customer
      ? {
          id: job.customer.id,
          name: job.customer.name,
          phone: job.customer.phone,
          email: job.customer.email,
        }
      : {
          name: job.customerName,
          phone: job.customerPhone,
        },
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      address: job.address,
      scheduledAt: job.scheduledAt?.toISOString(),
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      assigneeName: job.assigneeName,
      assigneePhone: job.assigneePhone,
    },
  }

  const journey: CustomerJourney = {
    id: `jrn_${job.id}`,
    jobId: job.id,
    leadId: job.lead?.id,
    customerId: job.customerId,
    tenantId: job.workspaceId,
    currentStage,
    previousStage,
    stageHistory,
    scheduledActions,
    context,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }

  journeyCache.set(jobId, journey)
  return journey
}

function jobStatusToJourneyStage(status: string): JourneyStage {
  const mapping: Record<string, JourneyStage> = {
    pending: 'lead',
    confirmed: 'booking',
    assigned: 'assigned',
    en_route: 'en_route',
    in_progress: 'in_progress',
    completed: 'completed',
    review: 'review',
    archived: 'archived',
    cancelled: 'cancelled',
  }
  return mapping[status] || 'lead'
}

function journeyStageToJobStatus(stage: JourneyStage): string {
  const mapping: Record<JourneyStage, string> = {
    lead: 'pending',
    booking: 'confirmed',
    assigned: 'assigned',
    en_route: 'en_route',
    in_progress: 'in_progress',
    completed: 'completed',
    review: 'review',
    archived: 'archived',
    cancelled: 'cancelled',
  }
  return mapping[stage] || 'pending'
}

// ─── Send Notifications ───────────────────────────────────────────────────────

async function sendStageNotifications(
  journey: CustomerJourney,
  stageActions: StageAction,
  context: JourneyContext
): Promise<void> {
  for (const notif of stageActions.notifications) {
    const template = NOTIFICATION_TEMPLATES[notif.template]
    if (!template) {
      console.warn(`[JourneyEngine] No template found for: ${notif.template}`)
      continue
    }

    // Send to customer
    if (notif.recipient === 'customer' || notif.recipient === 'both') {
      const customerPhone = context.customer?.phone || (journey.context?.job as Record<string, unknown>)?.customerPhone as string | undefined
      if (customerPhone && template.whatsapp.customer) {
        try {
          await sendJobNotification({
            to: customerPhone,
            message: template.whatsapp.customer,
            type: notif.interactive ? 'interactive' : 'text',
            recipientName: context.customer?.name || undefined,
            recipientRole: 'customer',
            subject: `Service Update: ${notif.template}`,
            jobId: journey.jobId,
            customerId: journey.customerId || undefined,
            tenantId: journey.tenantId || undefined,
          })
        } catch (err) {
          console.error(`[JourneyEngine] Failed to send WhatsApp to customer for stage ${stageActions.stage}:`, err)
        }
      }

      // Send email if available
      const customerEmail = context.customer?.email
      if (customerEmail && template.email?.customer) {
        try {
          await sendJobNotification({
            to: customerEmail,
            message: template.email.customer,
            recipientName: context.customer?.name || undefined,
            recipientRole: 'customer',
            subject: `Service Update: ${notif.template}`,
            jobId: journey.jobId,
            customerId: journey.customerId || undefined,
            tenantId: journey.tenantId || undefined,
          })
        } catch (err) {
          console.error(`[JourneyEngine] Failed to send email to customer for stage ${stageActions.stage}:`, err)
        }
      }
    }

    // Send to employee
    if ((notif.recipient === 'employee' || notif.recipient === 'both') && context.employee) {
      const employeePhone = context.employee.phone
      if (employeePhone && template.whatsapp.employee) {
        try {
          await sendJobNotification({
            to: employeePhone,
            message: template.whatsapp.employee,
            type: notif.interactive ? 'interactive' : 'text',
            recipientName: context.employee.name,
            recipientRole: 'employee',
            subject: `Job Update: ${notif.template}`,
            jobId: journey.jobId,
            employeeId: context.employee.id,
            tenantId: journey.tenantId || undefined,
          })
        } catch (err) {
          console.error(`[JourneyEngine] Failed to send WhatsApp to employee for stage ${stageActions.stage}:`, err)
        }
      }
    }
  }
}

// ─── Fire EventBus Events ────────────────────────────────────────────────────

async function fireStageEvents(
  journey: CustomerJourney,
  stageActions: StageAction,
  context: JourneyContext
): Promise<void> {
  for (const eventName of stageActions.eventBusEvents) {
    try {
      await EventBus.emit(eventName, {
        journeyId: journey.id,
        jobId: journey.jobId,
        leadId: journey.leadId,
        customerId: journey.customerId,
        tenantId: journey.tenantId,
        stage: journey.currentStage,
        previousStage: journey.previousStage,
        context,
        timestamp: nowISO(),
      })
    } catch (err) {
      console.error(`[JourneyEngine] Failed to emit event ${eventName}:`, err)
    }
  }
}

// ─── Persist Journey Stage to Job ─────────────────────────────────────────────

async function persistStageChange(
  jobId: string,
  newStage: JourneyStage,
  previousStage: JourneyStage | null,
  triggeredBy?: string
): Promise<void> {
  const jobStatus = journeyStageToJobStatus(newStage)

  // Update the job status
  await db.job.update({
    where: { id: jobId },
    data: {
      status: jobStatus,
      ...(newStage === 'in_progress' ? { actualStartTime: new Date() } : {}),
      ...(newStage === 'completed' ? { actualEndTime: new Date() } : {}),
    },
  })

  // Append stage change to notificationLogJson for history
  const job = await db.job.findUnique({ where: { id: jobId } })
  if (job) {
    let existingLogs: unknown[] = []
    try {
      existingLogs = JSON.parse(job.notificationLogJson || '[]')
    } catch {
      existingLogs = []
    }

    // Close the previous stage entry if exists
    const lastStageEntry = existingLogs
      .filter((entry: unknown) => (entry as Record<string, unknown>)?.action === 'journey_stage_change')
      .pop() as Record<string, unknown> | undefined

    if (lastStageEntry && !lastStageEntry.exitedAt) {
      lastStageEntry.exitedAt = nowISO()
    }

    existingLogs.push({
      action: 'journey_stage_change',
      stage: newStage,
      previousStage,
      timestamp: nowISO(),
      triggeredBy: triggeredBy || 'system',
    })

    await db.job.update({
      where: { id: jobId },
      data: { notificationLogJson: JSON.stringify(existingLogs) },
    })
  }

  // Also update the lead status if linked
  const jobWithLead = await db.job.findUnique({
    where: { id: jobId },
    include: { lead: true },
  })

  if (jobWithLead?.lead) {
    const leadStatusMap: Record<JourneyStage, string> = {
      lead: 'new',
      booking: 'contacted',
      assigned: 'qualified',
      en_route: 'qualified',
      in_progress: 'qualified',
      completed: 'converted',
      review: 'converted',
      archived: 'converted',
      cancelled: 'lost',
    }

    await db.lead.update({
      where: { id: jobWithLead.lead.id },
      data: {
        status: leadStatusMap[newStage],
        ...(newStage === 'completed' || newStage === 'review' ? { convertedAt: new Date() } : {}),
      },
    })
  }
}

// ─── Execute Scheduled Action ─────────────────────────────────────────────────

async function executeScheduledAction(action: ScheduledAction): Promise<void> {
  const journey = await buildJourneyFromJob(action.jobId)
  if (!journey) {
    console.warn(`[JourneyEngine] Journey not found for action ${action.id}, job ${action.jobId}`)
    action.status = 'failed'
    return
  }

  // Check if journey is still in a relevant stage
  if (journey.currentStage === 'cancelled' || journey.currentStage === 'archived') {
    action.status = 'cancelled'
    console.log(`[JourneyEngine] Cancelling action ${action.id}: journey is ${journey.currentStage}`)
    return
  }

  const customerPhone =
    journey.context?.customer?.phone ||
    (journey.context?.job as Record<string, unknown>)?.customerPhone as string | undefined

  switch (action.actionType) {
    case 'review_request': {
      if (customerPhone) {
        const template = NOTIFICATION_TEMPLATES['review_request']
        await sendJobNotification({
          to: customerPhone,
          message: template.whatsapp.customer,
          type: 'interactive',
          recipientName: journey.context?.customer?.name || undefined,
          recipientRole: 'customer',
          subject: 'Review Request',
          jobId: journey.jobId,
          customerId: journey.customerId || undefined,
          tenantId: journey.tenantId || undefined,
        })
      }
      // Auto-advance to review stage if still in completed
      if (journey.currentStage === 'completed') {
        await JourneyEngine.advanceStage(journey.jobId, 'review', { triggeredBy: 'scheduled_action' })
      }
      break
    }

    case 'appointment_reminder': {
      if (customerPhone) {
        const template = NOTIFICATION_TEMPLATES['appointment_reminder_msg']
        await sendJobNotification({
          to: customerPhone,
          message: template.whatsapp.customer,
          recipientName: journey.context?.customer?.name || undefined,
          recipientRole: 'customer',
          subject: 'Appointment Reminder',
          jobId: journey.jobId,
          customerId: journey.customerId || undefined,
          tenantId: journey.tenantId || undefined,
        })
      }
      break
    }

    case 'lead_follow_up': {
      if (customerPhone) {
        const template = NOTIFICATION_TEMPLATES['lead_follow_up_msg']
        await sendJobNotification({
          to: customerPhone,
          message: template.whatsapp.customer,
          recipientName: journey.context?.customer?.name || undefined,
          recipientRole: 'customer',
          subject: 'Follow Up',
          jobId: journey.jobId,
          customerId: journey.customerId || undefined,
          tenantId: journey.tenantId || undefined,
        })
      }
      break
    }

    case 'completion_follow_up': {
      if (customerPhone) {
        const template = NOTIFICATION_TEMPLATES['completion_follow_up_msg']
        await sendJobNotification({
          to: customerPhone,
          message: template.whatsapp.customer,
          recipientName: journey.context?.customer?.name || undefined,
          recipientRole: 'customer',
          subject: 'Follow Up',
          jobId: journey.jobId,
          customerId: journey.customerId || undefined,
          tenantId: journey.tenantId || undefined,
        })
      }
      break
    }

    case 'no_response_follow_up': {
      if (customerPhone) {
        const template = NOTIFICATION_TEMPLATES['no_response_follow_up_msg']
        await sendJobNotification({
          to: customerPhone,
          message: template.whatsapp.customer,
          recipientName: journey.context?.customer?.name || undefined,
          recipientRole: 'customer',
          subject: 'Follow Up',
          jobId: journey.jobId,
          customerId: journey.customerId || undefined,
          tenantId: journey.tenantId || undefined,
        })
      }
      break
    }

    case 'custom': {
      // Custom actions can be handled by EventBus subscribers
      try {
        await EventBus.emit('journey.custom_action', {
          actionId: action.id,
          actionType: action.actionType,
          jobId: journey.jobId,
          actionData: action.actionData,
          timestamp: nowISO(),
        })
      } catch (err) {
        console.error(`[JourneyEngine] Failed to fire custom action event:`, err)
      }
      break
    }
  }

  action.status = 'executed'
  action.executedAt = nowISO()
}

// ─── JourneyEngine Public API ─────────────────────────────────────────────────

export const JourneyEngine = {
  /**
   * Move a job to a new journey stage, triggering all associated actions:
   *   1. Validate the transition
   *   2. Update the CustomerJourney record (Job status + log)
   *   3. Log the stage change
   *   4. Fire appropriate events on the EventBus
   *   5. Send appropriate notifications (WhatsApp + email)
   *   6. Schedule any follow-up actions
   */
  async advanceStage(
    jobId: string,
    newStage: JourneyStage,
    context?: {
      employee?: Record<string, unknown>
      triggeredBy?: string
      [key: string]: unknown
    }
  ): Promise<void> {
    // 1. Load current journey state
    const journey = await buildJourneyFromJob(jobId)
    if (!journey) {
      throw new Error(`[JourneyEngine] No journey found for job ${jobId}`)
    }

    const currentStage = journey.currentStage

    // 2. Validate transition
    if (currentStage === newStage) {
      console.log(`[JourneyEngine] Job ${jobId} is already at stage ${newStage}`)
      return
    }

    if (!isValidTransition(currentStage, newStage)) {
      throw new Error(
        `[JourneyEngine] Invalid stage transition: ${currentStage} → ${newStage}. ` +
        `Valid transitions from '${currentStage}': [${VALID_TRANSITIONS[currentStage]?.join(', ')}]`
      )
    }

    // 3. Merge context
    const enrichedContext: JourneyContext = {
      ...journey.context,
      ...context,
      employee: context?.employee
        ? {
            id: (context.employee as Record<string, unknown>).id as string,
            name: (context.employee as Record<string, unknown>).name as string,
            phone: (context.employee as Record<string, unknown>).phone as string,
            role: (context.employee as Record<string, unknown>).role as string | undefined,
          }
        : journey.context?.employee,
    }

    // 4. Update journey in cache
    journey.previousStage = currentStage
    journey.currentStage = newStage

    // Close the last history entry and add new one
    const lastEntry = journey.stageHistory[journey.stageHistory.length - 1]
    if (lastEntry && !lastEntry.exitedAt) {
      lastEntry.exitedAt = nowISO()
    }
    journey.stageHistory.push({
      stage: newStage,
      enteredAt: nowISO(),
      triggeredBy: context?.triggeredBy || 'system',
      metadata: { ...context },
    })
    journey.updatedAt = new Date()

    // 5. Persist the stage change to the database
    await persistStageChange(jobId, newStage, currentStage, context?.triggeredBy)

    // 6. Get stage configuration
    const stageConfig = STAGE_ACTIONS[newStage]
    if (!stageConfig) {
      console.warn(`[JourneyEngine] No action config for stage: ${newStage}`)
      return
    }

    // 7. Send notifications for the new stage
    await sendStageNotifications(journey, stageConfig, enrichedContext)

    // 8. Fire EventBus events
    await fireStageEvents(journey, stageConfig, enrichedContext)

    // 9. Schedule follow-up actions
    for (const scheduledConfig of stageConfig.scheduledActions) {
      // Check condition if present
      if (scheduledConfig.condition && !scheduledConfig.condition(enrichedContext)) {
        continue
      }

      await JourneyEngine.scheduleAction(
        jobId,
        scheduledConfig.actionType,
        scheduledConfig.delayMs,
        { stage: newStage, triggeredBy: context?.triggeredBy }
      )
    }

    // 10. Cancel any scheduled actions that are no longer relevant
    cancelIrrelevantActions(jobId, newStage)

    console.log(
      `[JourneyEngine] Job ${jobId} advanced: ${currentStage} → ${newStage}` +
      ` (${stageConfig.notifications.length} notifications, ${stageConfig.scheduledActions.length} scheduled actions)`
    )

    // Update cache
    journeyCache.set(jobId, journey)
  },

  /**
   * Schedule a delayed action for a job's journey.
   * Actions are stored in memory and processed by processScheduledActions().
   *
   * @param jobId - The job to schedule the action for
   * @param actionType - Type of action (review_request, appointment_reminder, etc.)
   * @param delayMs - Delay in milliseconds before the action should execute
   * @param actionData - Optional additional data for the action
   */
  async scheduleAction(
    jobId: string,
    actionType: ScheduledActionType,
    delayMs: number,
    actionData?: Record<string, unknown>
  ): Promise<void> {
    const id = generateActionId()
    const scheduledFor = new Date(Date.now() + delayMs).toISOString()

    const action: ScheduledAction = {
      id,
      jobId,
      actionType,
      scheduledFor,
      status: 'pending',
      actionData,
      createdAt: nowISO(),
    }

    scheduledActionsStore.set(id, action)

    console.log(
      `[JourneyEngine] Scheduled action ${actionType} for job ${jobId} ` +
      `in ${delayMs}ms (execute at ${scheduledFor})`
    )
  },

  /**
   * Process all scheduled actions that are due.
   * Should be called periodically by a cron job or polling mechanism.
   *
   * @returns Number of actions processed
   */
  async processScheduledActions(): Promise<number> {
    const now = new Date()
    let processedCount = 0

    for (const [id, action] of Array.from(scheduledActionsStore)) {
      if (action.status !== 'pending') continue

      const scheduledTime = new Date(action.scheduledFor)
      if (scheduledTime <= now) {
        try {
          await executeScheduledAction(action)
          processedCount++
          console.log(`[JourneyEngine] Executed scheduled action ${action.actionType} (${id}) for job ${action.jobId}`)
        } catch (err) {
          action.status = 'failed'
          console.error(`[JourneyEngine] Failed to execute action ${id}:`, err)
          processedCount++
        }

        // Clean up executed/failed actions after processing
        const status = action.status as string
        if (status === 'executed' || status === 'failed' || status === 'cancelled') {
          scheduledActionsStore.delete(id)
        }
      }
    }

    if (processedCount > 0) {
      console.log(`[JourneyEngine] Processed ${processedCount} scheduled actions`)
    }

    return processedCount
  },

  /**
   * Get the current journey state for a job.
   *
   * @param jobId - The job ID to look up
   * @returns The CustomerJourney or null if not found
   */
  async getJourneyForJob(jobId: string): Promise<CustomerJourney | null> {
    return buildJourneyFromJob(jobId)
  },

  /**
   * Create a new journey for a lead.
   * This creates a Job record in 'pending' status and links it to the lead.
   *
   * @param leadId - The lead ID to create a journey for
   * @param tenantId - Optional tenant ID (used to resolve the workspace)
   * @returns The new CustomerJourney
   */
  async createJourney(leadId: string, tenantId?: string): Promise<CustomerJourney> {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { customer: true },
    })

    if (!lead) {
      throw new Error(`[JourneyEngine] Lead not found: ${leadId}`)
    }

    // Check if a job already exists for this lead
    if (lead.jobId) {
      const existingJourney = await buildJourneyFromJob(lead.jobId)
      if (existingJourney) return existingJourney
    }

    // Resolve a workspace ID for the new Job. The Job model has only
    // `workspaceId` (no `tenantId` column), so we must NOT pass a tenantId here.
    // Prefer the lead's customer's workspace; otherwise look up the first
    // workspace for the tenant.
    let workspaceId: string | undefined = undefined
    if (lead.customer?.workspaceId) {
      workspaceId = lead.customer.workspaceId
    } else if (tenantId) {
      const ws = await db.workspace.findFirst({
        where: { tenantId },
        select: { id: true },
      })
      workspaceId = ws?.id || undefined
    }

    // Create a new job for this lead
    const job = await db.job.create({
      data: {
        title: lead.serviceType ? `${lead.serviceType} Service` : 'New Service Request',
        description: lead.description,
        status: 'pending',
        priority: lead.priority,
        address: lead.address,
        customerName: lead.name,
        customerPhone: lead.phone,
        customerId: lead.customerId,
        serviceId: lead.serviceId,
        workspaceId,
        notificationLogJson: JSON.stringify([
          {
            action: 'journey_stage_change',
            stage: 'lead',
            timestamp: nowISO(),
            triggeredBy: 'system',
          },
        ]),
      },
    })

    // Link the job to the lead
    await db.lead.update({
      where: { id: leadId },
      data: {
        jobId: job.id,
        status: 'contacted',
      },
    })

    // Build the journey object
    const journey = await buildJourneyFromJob(job.id)
    if (!journey) {
      throw new Error(`[JourneyEngine] Failed to build journey after creation`)
    }

    // Fire the lead stage actions
    const stageConfig = STAGE_ACTIONS.lead
    await sendStageNotifications(journey, stageConfig, journey.context)
    await fireStageEvents(journey, stageConfig, journey.context)

    // Schedule lead follow-up
    for (const scheduledConfig of stageConfig.scheduledActions) {
      await JourneyEngine.scheduleAction(
        job.id,
        scheduledConfig.actionType,
        scheduledConfig.delayMs,
        { stage: 'lead' }
      )
    }

    console.log(`[JourneyEngine] Created journey for lead ${leadId} → job ${job.id}`)
    return journey
  },

  /**
   * Get the configured actions for a given stage.
   *
   * @param stage - The journey stage
   * @returns Array of StageAction configurations
   */
  getStageActions(stage: JourneyStage): StageAction {
    return STAGE_ACTIONS[stage] || {
      stage,
      notifications: [],
      scheduledActions: [],
      eventBusEvents: [],
    }
  },

  /**
   * Cancel all scheduled actions for a job.
   */
  async cancelScheduledActions(jobId: string, actionType?: ScheduledActionType): Promise<number> {
    let cancelled = 0
    for (const [id, action] of Array.from(scheduledActionsStore)) {
      if (action.jobId === jobId && action.status === 'pending') {
        if (!actionType || action.actionType === actionType) {
          action.status = 'cancelled'
          scheduledActionsStore.delete(id)
          cancelled++
        }
      }
    }
    if (cancelled > 0) {
      console.log(`[JourneyEngine] Cancelled ${cancelled} scheduled actions for job ${jobId}`)
    }
    return cancelled
  },

  /**
   * Get all valid transitions from a given stage.
   */
  getValidTransitions(stage: JourneyStage): JourneyStage[] {
    return VALID_TRANSITIONS[stage] || []
  },

  /**
   * Invalidate the journey cache for a specific job.
   * Useful when external changes are made to a job.
   */
  invalidateCache(jobId: string): void {
    journeyCache.delete(jobId)
  },

  /**
   * Get pending scheduled actions for a job.
   */
  getScheduledActions(jobId: string): ScheduledAction[] {
    const actions: ScheduledAction[] = []
    for (const [, action] of Array.from(scheduledActionsStore)) {
      if (action.jobId === jobId) {
        actions.push(action)
      }
    }
    return actions
  },
}

// ─── Helper: Cancel Irrelevant Actions ────────────────────────────────────────

function cancelIrrelevantActions(jobId: string, newStage: JourneyStage): void {
  // Define which action types are relevant for each stage
  const relevantActions: Record<JourneyStage, ScheduledActionType[]> = {
    lead: ['lead_follow_up', 'no_response_follow_up'],
    booking: ['appointment_reminder'],
    assigned: [],
    en_route: [],
    in_progress: [],
    completed: ['review_request', 'completion_follow_up'],
    review: [],
    archived: [],
    cancelled: [],
  }

  const relevant = relevantActions[newStage] || []

  for (const [id, action] of Array.from(scheduledActionsStore)) {
    if (action.jobId === jobId && action.status === 'pending') {
      if (!relevant.includes(action.actionType)) {
        action.status = 'cancelled'
        scheduledActionsStore.delete(id)
        console.log(
          `[JourneyEngine] Cancelled irrelevant action ${action.actionType} (${id}) ` +
          `for job ${jobId} at stage ${newStage}`
        )
      }
    }
  }
}

// ─── Exported Constants ───────────────────────────────────────────────────────

export const JOURNEY_STAGES: JourneyStage[] = [
  'lead',
  'booking',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
  'review',
  'archived',
  'cancelled',
]

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, { label: string; description: string; icon: string }> = {
  lead: { label: 'Lead', description: 'New inquiry received', icon: 'MessageSquare' },
  booking: { label: 'Booking', description: 'Appointment booked', icon: 'Calendar' },
  assigned: { label: 'Assigned', description: 'Technician assigned', icon: 'UserCheck' },
  en_route: { label: 'En Route', description: 'Technician on the way', icon: 'Truck' },
  in_progress: { label: 'In Progress', description: 'Service in progress', icon: 'Wrench' },
  completed: { label: 'Completed', description: 'Service completed', icon: 'CheckCircle' },
  review: { label: 'Review', description: 'Awaiting customer review', icon: 'Star' },
  archived: { label: 'Archived', description: 'Journey archived', icon: 'Archive' },
  cancelled: { label: 'Cancelled', description: 'Booking cancelled', icon: 'XCircle' },
}

export default JourneyEngine
