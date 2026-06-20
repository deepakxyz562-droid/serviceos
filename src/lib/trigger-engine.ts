/**
 * ServiceOS Trigger Engine
 * 
 * Bridges the EventBus to WorkflowAutomation records.
 * When a ServiceEvent is emitted, the trigger engine:
 * 1. Finds all active automations matching the event triggerType
 * 2. Evaluates conditions against the event payload
 * 3. Executes actions (send_whatsapp, send_notification, create_task, update_record, send_email, call_webhook, add_tag, assign_user, create_job, move_pipeline)
 * 4. Logs results to TriggerExecution
 */

import { EventBus, type ServiceEvent, type EventPayload } from '@/lib/event-bus'
import { db } from '@/lib/db'

// ─── Trigger Type Definitions ────────────────────────────────────────────────

export interface TriggerDefinition {
  id: string
  label: string
  description: string
  category: string
  icon: string
  event: ServiceEvent
  configurableFields?: TriggerField[]
}

export interface TriggerField {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'boolean'
  options?: { label: string; value: string }[]
  required?: boolean
  defaultValue?: any
}

// ─── Action Type Definitions ─────────────────────────────────────────────────

export interface ActionDefinition {
  type: string
  label: string
  description: string
  category: string
  icon: string
  configurableFields: TriggerField[]
}

// ─── Trigger Catalog ─────────────────────────────────────────────────────────

export const TRIGGER_CATALOG: TriggerDefinition[] = [
  // ─── CRM Events (Lead-focused) ─────────────────────────────────────────
  { id: 'lead.created', label: 'Lead Created', description: 'When a new lead is created', category: 'CRM Events', icon: 'UserPlus', event: 'lead.created' },
  { id: 'lead.updated', label: 'Lead Updated', description: 'When a lead is updated', category: 'CRM Events', icon: 'UserCog', event: 'lead.updated' },
  { id: 'lead.assigned', label: 'Lead Assigned', description: 'When a lead is assigned to someone', category: 'CRM Events', icon: 'UserCheck', event: 'lead.updated', configurableFields: [{ key: 'assignedOnly', label: 'Only on assignment', type: 'boolean', defaultValue: true }] },
  { id: 'lead.status_changed', label: 'Lead Status Changed', description: 'When lead status changes', category: 'CRM Events', icon: 'ArrowRightLeft', event: 'lead.updated', configurableFields: [{ key: 'fromStatus', label: 'From Status', type: 'select', options: [{ label: 'Any', value: 'any' }, { label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Qualified', value: 'qualified' }, { label: 'Proposal', value: 'proposal' }, { label: 'Negotiation', value: 'negotiation' }] }, { key: 'toStatus', label: 'To Status', type: 'select', options: [{ label: 'Any', value: 'any' }, { label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Qualified', value: 'qualified' }, { label: 'Proposal', value: 'proposal' }, { label: 'Won', value: 'won' }, { label: 'Lost', value: 'lost' }] }] },
  { id: 'lead.won', label: 'Lead Won', description: 'When a lead is won', category: 'CRM Events', icon: 'Trophy', event: 'lead.updated', configurableFields: [{ key: 'toStatus', label: 'Status', type: 'select', options: [{ label: 'Won', value: 'won' }], defaultValue: 'won' }] },
  { id: 'lead.lost', label: 'Lead Lost', description: 'When a lead is lost', category: 'CRM Events', icon: 'Siren', event: 'lead.updated', configurableFields: [{ key: 'toStatus', label: 'Status', type: 'select', options: [{ label: 'Lost', value: 'lost' }], defaultValue: 'lost' }] },
  { id: 'lead.converted', label: 'Lead Converted', description: 'When a lead is converted to customer/job', category: 'CRM Events', icon: 'CheckCircle', event: 'lead.converted' },
  { id: 'time.1h_after_lead', label: '1 Hour After Lead Created', description: '1 hour after a new lead is created', category: 'CRM Events', icon: 'Clock', event: 'lead.created', configurableFields: [{ key: 'delayMinutes', label: 'Delay (minutes)', type: 'number', defaultValue: 60 }] },

  // ─── Customer Events ───────────────────────────────────────────────────
  { id: 'customer.created', label: 'Customer Created', description: 'When a new customer is created', category: 'Customer Events', icon: 'Users', event: 'customer.journey_stage_changed', configurableFields: [{ key: 'stage', label: 'Stage', type: 'select', options: [{ label: 'Any', value: 'any' }, { label: 'Lead', value: 'lead' }], defaultValue: 'any' }] },
  { id: 'customer.updated', label: 'Customer Updated', description: 'When customer details are updated', category: 'Customer Events', icon: 'UserCog', event: 'customer.journey_stage_changed' },
  { id: 'customer.tagged', label: 'Customer Tagged', description: 'When a tag is added to a customer', category: 'Customer Events', icon: 'Hash', event: 'customer.journey_stage_changed', configurableFields: [{ key: 'tag', label: 'Tag Name', type: 'text' }] },
  { id: 'customer.journey_stage_changed', label: 'Customer Journey Stage Changed', description: 'When a customer moves to a new journey stage', category: 'Customer Events', icon: 'Route', event: 'customer.journey_stage_changed' },

  // ─── Booking Events ────────────────────────────────────────────────────
  { id: 'booking.created', label: 'Booking Created', description: 'When a new booking is created', category: 'Booking Events', icon: 'CalendarPlus', event: 'job.created' },
  { id: 'booking.confirmed', label: 'Booking Confirmed', description: 'When a booking is confirmed', category: 'Booking Events', icon: 'CalendarCheck', event: 'job.assigned' },
  { id: 'booking.cancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled', category: 'Booking Events', icon: 'CalendarX', event: 'job.cancelled' },
  { id: 'booking.completed', label: 'Booking Completed', description: 'When a booking is completed', category: 'Booking Events', icon: 'CheckCircle', event: 'job.completed' },
  { id: 'booking.rescheduled', label: 'Booking Rescheduled', description: 'When a booking is rescheduled', category: 'Booking Events', icon: 'CalendarClock', event: 'job.updated' },

  // ─── Job Events ────────────────────────────────────────────────────────
  { id: 'job.created', label: 'Job Created', description: 'When a new job is created', category: 'Job Events', icon: 'Briefcase', event: 'job.created' },
  { id: 'job.assigned', label: 'Job Assigned', description: 'When a job is assigned to employee', category: 'Job Events', icon: 'UserCheck', event: 'job.assigned' },
  { id: 'job.started', label: 'Job Started', description: 'When a job is started', category: 'Job Events', icon: 'Play', event: 'job.started' },
  { id: 'job.completed', label: 'Job Completed', description: 'When a job is completed', category: 'Job Events', icon: 'CheckCircle', event: 'job.completed' },
  { id: 'job.cancelled', label: 'Job Cancelled', description: 'When a job is cancelled', category: 'Job Events', icon: 'XCircle', event: 'job.cancelled' },
  { id: 'time.3d_after_job', label: '3 Days After Job Completed', description: '3 days after job completion for follow-up', category: 'Job Events', icon: 'Clock', event: 'job.completed', configurableFields: [{ key: 'delayMinutes', label: 'Delay (minutes)', type: 'number', defaultValue: 4320 }] },

  // ─── Invoice Events (Renamed from Finance) ────────────────────────────
  { id: 'quote.created', label: 'Quote Created', description: 'When a new quote is created', category: 'Invoice Events', icon: 'FileText', event: 'payment.received' },
  { id: 'quote.sent', label: 'Quote Sent', description: 'When a quote is sent to customer', category: 'Invoice Events', icon: 'Send', event: 'payment.received' },
  { id: 'quote.accepted', label: 'Quote Accepted', description: 'When a quote is accepted', category: 'Invoice Events', icon: 'CheckCircle', event: 'payment.received' },
  { id: 'quote.rejected', label: 'Quote Rejected', description: 'When a quote is rejected', category: 'Invoice Events', icon: 'XCircle', event: 'payment.received' },
  { id: 'invoice.created', label: 'Invoice Created', description: 'When a new invoice is created', category: 'Invoice Events', icon: 'Receipt', event: 'payment.received' },
  { id: 'invoice.paid', label: 'Invoice Paid', description: 'When an invoice is paid', category: 'Invoice Events', icon: 'Banknote', event: 'payment.received' },
  { id: 'invoice.overdue', label: 'Invoice Overdue', description: 'When an invoice becomes overdue', category: 'Invoice Events', icon: 'AlertTriangle', event: 'payment.failed' },
  { id: 'time.1d_after_quote', label: '1 Day After Quote Sent', description: '1 day after quote is sent without acceptance', category: 'Invoice Events', icon: 'Clock', event: 'payment.received', configurableFields: [{ key: 'delayMinutes', label: 'Delay (minutes)', type: 'number', defaultValue: 1440 }] },
  { id: 'time.7d_after_invoice', label: '7 Days After Invoice Due', description: '7 days after invoice due date (overdue reminder)', category: 'Invoice Events', icon: 'Clock', event: 'payment.failed', configurableFields: [{ key: 'delayMinutes', label: 'Delay (minutes)', type: 'number', defaultValue: 10080 }] },

  // ─── WhatsApp Events ──────────────────────────────────────────────────
  { id: 'whatsapp.message_received', label: 'Message Received', description: 'When a WhatsApp message is received', category: 'WhatsApp Events', icon: 'MessageCircle', event: 'conversation.message_received' },
  { id: 'whatsapp.message_delivered', label: 'Message Delivered', description: 'When a WhatsApp message is delivered', category: 'WhatsApp Events', icon: 'CheckCircle', event: 'conversation.message_sent' },
  { id: 'whatsapp.conversation_started', label: 'Conversation Started', description: 'When a new WhatsApp conversation starts', category: 'WhatsApp Events', icon: 'MessageSquarePlus', event: 'conversation.state_changed' },
  { id: 'whatsapp.template_delivered', label: 'Template Delivered', description: 'When a WhatsApp template is delivered', category: 'WhatsApp Events', icon: 'Check', event: 'conversation.message_sent' },
  { id: 'whatsapp.template_failed', label: 'Template Failed', description: 'When a WhatsApp template fails', category: 'WhatsApp Events', icon: 'AlertCircle', event: 'conversation.message_sent' },

  // ─── Form Events (EXPANDED — includes Website) ────────────────────────
  { id: 'form.submitted', label: 'Form Submitted', description: 'When a form is submitted', category: 'Form Events', icon: 'FileInput', event: 'customer.journey_stage_changed' },
  { id: 'form.survey_submitted', label: 'Survey Submitted', description: 'When a survey is submitted', category: 'Form Events', icon: 'ClipboardList', event: 'customer.journey_stage_changed' },
  { id: 'form.response_received', label: 'Response Received', description: 'When a form response is received', category: 'Form Events', icon: 'Inbox', event: 'customer.journey_stage_changed' },
  { id: 'form.abandoned', label: 'Form Abandoned', description: 'When a form is started but not completed', category: 'Form Events', icon: 'Inbox', event: 'customer.journey_stage_changed' },
  { id: 'website.contact_form', label: 'Contact Form Submitted', description: 'When a contact form is submitted from website', category: 'Form Events', icon: 'Globe', event: 'lead.created', configurableFields: [{ key: 'source', label: 'Source', type: 'select', options: [{ label: 'Any', value: 'any' }, { label: 'Website', value: 'website' }, { label: 'WordPress', value: 'wordpress' }], defaultValue: 'website' }] },
  { id: 'website.booking_form', label: 'Booking Form Submitted', description: 'When a booking form is submitted from website', category: 'Form Events', icon: 'CalendarPlus', event: 'job.created' },
  { id: 'website.quote_request', label: 'Quote Request Submitted', description: 'When a quote request comes from website', category: 'Form Events', icon: 'FileText', event: 'lead.created' },

  // ─── System Events (EXPANDED — includes Employee) ─────────────────────
  { id: 'user.registered', label: 'User Registered', description: 'When a new user registers on the platform', category: 'System Events', icon: 'ShieldCheck', event: 'lead.created' },
  { id: 'employee.created', label: 'Employee Created', description: 'When a new employee is added', category: 'System Events', icon: 'UserRoundPlus', event: 'employee.status_changed' },
  { id: 'employee.assigned', label: 'Employee Assigned', description: 'When an employee is assigned to a job', category: 'System Events', icon: 'UserCheck', event: 'employee.status_changed' },
  { id: 'employee.available', label: 'Employee Available', description: 'When employee becomes available', category: 'System Events', icon: 'CircleCheck', event: 'employee.status_changed' },
  { id: 'employee.offline', label: 'Employee Offline', description: 'When employee goes offline', category: 'System Events', icon: 'WifiOff', event: 'employee.heartbeat' },
  { id: 'system.error', label: 'System Error', description: 'When a system error occurs', category: 'System Events', icon: 'AlertOctagon', event: 'system.error' },
  { id: 'system.api_call_failed', label: 'API Call Failed', description: 'When an external API call fails', category: 'System Events', icon: 'Unplug', event: 'system.api_call_failed' },
]

// ─── Action Catalog ──────────────────────────────────────────────────────────

export const ACTION_CATALOG: ActionDefinition[] = [
  { type: 'send_whatsapp', label: 'Send WhatsApp Message', description: 'Send a WhatsApp message to customer or employee', category: 'Communication', icon: 'MessageCircle', configurableFields: [{ key: 'recipient', label: 'Recipient', type: 'select', options: [{ label: 'Customer', value: 'customer' }, { label: 'Employee', value: 'employee' }, { label: 'Phone Number', value: 'custom' }], required: true }, { key: 'template', label: 'Message Template', type: 'text', required: true }] },
  { type: 'send_notification', label: 'Send Notification', description: 'Send an in-app notification', category: 'Communication', icon: 'Bell', configurableFields: [{ key: 'userId', label: 'User ID', type: 'text' }, { key: 'title', label: 'Title', type: 'text', required: true }, { key: 'message', label: 'Message', type: 'text', required: true }] },
  { type: 'send_email', label: 'Send Email', description: 'Send an email notification', category: 'Communication', icon: 'Mail', configurableFields: [{ key: 'to', label: 'To', type: 'text', required: true }, { key: 'subject', label: 'Subject', type: 'text', required: true }, { key: 'body', label: 'Body', type: 'text', required: true }] },
  { type: 'create_task', label: 'Create Follow-up Task', description: 'Create a follow-up task or job', category: 'Action', icon: 'Plus', configurableFields: [{ key: 'title', label: 'Task Title', type: 'text', required: true }, { key: 'description', label: 'Description', type: 'text' }, { key: 'assignTo', label: 'Assign To', type: 'select', options: [{ label: 'Lead Owner', value: 'lead_owner' }, { label: 'Sales Rep', value: 'sales_rep' }, { label: 'Specific User', value: 'specific' }] }] },
  { type: 'update_record', label: 'Update Record', description: 'Update a CRM record field', category: 'Action', icon: 'Save', configurableFields: [{ key: 'recordType', label: 'Record Type', type: 'select', options: [{ label: 'Lead', value: 'lead' }, { label: 'Job', value: 'job' }, { label: 'Customer', value: 'customer' }], required: true }, { key: 'field', label: 'Field', type: 'text', required: true }, { key: 'value', label: 'Value', type: 'text', required: true }] },
  { type: 'add_tag', label: 'Add Tag', description: 'Add a tag to the record', category: 'Action', icon: 'Tag', configurableFields: [{ key: 'tag', label: 'Tag', type: 'text', required: true }] },
  { type: 'assign_user', label: 'Assign User', description: 'Assign the record to a user', category: 'Action', icon: 'UserPlus', configurableFields: [{ key: 'assignTo', label: 'Assign To', type: 'select', options: [{ label: 'Round Robin', value: 'round_robin' }, { label: 'Lead Owner', value: 'lead_owner' }, { label: 'Specific User', value: 'specific' }], required: true }, { key: 'userId', label: 'User ID (if specific)', type: 'text' }] },
  { type: 'call_webhook', label: 'Call Webhook', description: 'Send data to an external webhook URL', category: 'Integration', icon: 'Webhook', configurableFields: [{ key: 'url', label: 'Webhook URL', type: 'text', required: true }, { key: 'method', label: 'Method', type: 'select', options: [{ label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }], defaultValue: 'POST' }] },
  { type: 'move_pipeline', label: 'Move to Pipeline Stage', description: 'Move lead to a different pipeline stage', category: 'CRM', icon: 'ArrowRight', configurableFields: [{ key: 'stage', label: 'Target Stage', type: 'select', options: [{ label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Qualified', value: 'qualified' }, { label: 'Proposal', value: 'proposal' }, { label: 'Won', value: 'won' }], required: true }] },
  { type: 'create_job', label: 'Create Job', description: 'Create a new job from the trigger data', category: 'Action', icon: 'Briefcase', configurableFields: [{ key: 'title', label: 'Job Title', type: 'text', required: true }, { key: 'serviceType', label: 'Service Type', type: 'text' }] },
]

// ─── Condition Evaluator ─────────────────────────────────────────────────────

interface Condition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'in'
  value: any
}

function evaluateConditions(conditions: Condition[], data: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true
  
  return conditions.every(condition => {
    const fieldValue = getNestedValue(data, condition.field)
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      default:
        return true
    }
  })
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// ─── Action Executor ─────────────────────────────────────────────────────────

async function executeAction(
  action: { type: string; config: Record<string, any> },
  payload: EventPayload
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.type) {
      case 'send_whatsapp': {
        // In production, this would call the WhatsApp API
        console.log(`[TriggerEngine] Sending WhatsApp to ${action.config.recipient}: ${action.config.template}`)
        return { success: true, result: { sent: true, recipient: action.config.recipient } }
      }
      case 'send_notification': {
        if (action.config.userId || payload.tenantId) {
          await db.notification.create({
            data: {
              title: action.config.title || 'Trigger Notification',
              message: action.config.message || 'Automated notification from trigger',
              type: 'info',
              userId: action.config.userId || null,
              tenantId: payload.tenantId || null,
            },
          })
        }
        return { success: true, result: { notificationCreated: true } }
      }
      case 'create_task': {
        // Create a job as a follow-up task
        if (payload.data.jobId || payload.data.leadId) {
          const job = await db.job.create({
            data: {
              title: action.config.title || 'Follow-up Task',
              description: action.config.description || `Auto-created by trigger`,
              status: 'pending',
              priority: 'medium',
              workspaceId: payload.workspaceId || null,
              customerId: payload.data.customerId || null,
              customerName: payload.data.customerName || null,
              customerPhone: payload.data.customerPhone || null,
            },
          })
          return { success: true, result: { jobId: job.id } }
        }
        return { success: true, result: { note: 'No reference ID for task creation' } }
      }
      case 'update_record': {
        const recordType = action.config.recordType
        const recordId = recordType === 'lead' ? payload.data.leadId : recordType === 'job' ? payload.data.jobId : payload.data.customerId
        if (!recordId) return { success: false, error: `No ${recordType} ID in payload` }
        
        const model = recordType === 'lead' ? db.lead : recordType === 'job' ? db.job : db.customer
        await (model as any).update({ where: { id: recordId }, data: { [action.config.field]: action.config.value } })
        return { success: true, result: { updated: true, field: action.config.field } }
      }
      case 'add_tag': {
        const leadId = payload.data.leadId
        if (leadId) {
          const lead = await db.lead.findUnique({ where: { id: leadId } })
          if (lead) {
            const tags = JSON.parse(lead.tagsJson || '[]')
            if (!tags.includes(action.config.tag)) {
              tags.push(action.config.tag)
              await db.lead.update({ where: { id: leadId }, data: { tagsJson: JSON.stringify(tags) } })
            }
          }
        }
        return { success: true, result: { tagAdded: action.config.tag } }
      }
      case 'assign_user': {
        // Round-robin or specific assignment
        if (action.config.assignTo === 'round_robin' && payload.data.leadId) {
          const employees = await db.employee.findMany({ where: { status: 'available', workspaceId: payload.workspaceId || undefined }, take: 1 })
          if (employees.length > 0) {
            await db.lead.update({ where: { id: payload.data.leadId }, data: { assignedToId: employees[0].id } })
            return { success: true, result: { assignedTo: employees[0].id } }
          }
        }
        return { success: true, result: { note: 'Assignment handled' } }
      }
      case 'call_webhook': {
        const response = await fetch(action.config.url, {
          method: action.config.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        return { success: response.ok, result: { status: response.status } }
      }
      case 'move_pipeline': {
        if (payload.data.leadId) {
          await db.lead.update({ where: { id: payload.data.leadId }, data: { status: action.config.stage } })
        }
        return { success: true, result: { movedTo: action.config.stage } }
      }
      case 'create_job': {
        const job = await db.job.create({
          data: {
            title: action.config.title || 'New Job',
            status: 'pending',
            priority: 'medium',
            workspaceId: payload.workspaceId || null,
            customerId: payload.data.customerId || null,
            customerName: payload.data.customerName || null,
            customerPhone: payload.data.customerPhone || null,
          },
        })
        return { success: true, result: { jobId: job.id } }
      }
      case 'send_email': {
        // In production, integrate with email service
        console.log(`[TriggerEngine] Sending email to ${action.config.to}: ${action.config.subject}`)
        return { success: true, result: { emailSent: true } }
      }
      case 'send_sms': {
        // In production, integrate with SMS service (Twilio, etc.)
        console.log(`[TriggerEngine] Sending SMS to ${action.config.to}: ${action.config.message}`)
        return { success: true, result: { smsSent: true } }
      }
      case 'remove_tag': {
        const leadId = payload.data.leadId
        if (leadId) {
          const lead = await db.lead.findUnique({ where: { id: leadId } })
          if (lead) {
            const tags = JSON.parse(lead.tagsJson || '[]')
            const updatedTags = tags.filter((t: string) => t !== action.config.tag)
            await db.lead.update({ where: { id: leadId }, data: { tagsJson: JSON.stringify(updatedTags) } })
          }
        }
        return { success: true, result: { tagRemoved: action.config.tag } }
      }
      case 'create_broadcast': {
        // In production, create a broadcast campaign
        console.log(`[TriggerEngine] Creating broadcast: ${action.config.name || 'Auto Broadcast'}`)
        return { success: true, result: { broadcastCreated: true } }
      }

      // ─── Invoice workflow actions ───────────────────────────────────────
      // These let workflow automations create/send/approve invoices. They're
      // backed by the real invoice-automation functions so workflows and the UI
      // share the exact same business logic.
      case 'create_invoice': {
        const { autoCreateInvoiceFromJob } = await import('@/lib/invoice-automation')
        // Prefer an explicit jobId from config, then fall back to the payload
        // (resourceId is set by the job lifecycle emitter; job.id is the nested form)
        const jobId = action.config.jobId || payload.data.jobId || payload.data.resourceId || payload.data.job?.id
        if (!jobId) {
          return { success: false, error: 'create_invoice requires a jobId (in config or payload)' }
        }
        const r = await autoCreateInvoiceFromJob(jobId)
        return { success: r.success, result: r, error: r.error }
      }
      case 'create_deposit_invoice': {
        const { createDepositInvoiceFromBooking } = await import('@/lib/invoice-automation')
        const bookingId = action.config.bookingId || payload.data.bookingId || payload.data.resourceId || payload.data.booking?.id
        if (!bookingId) {
          return { success: false, error: 'create_deposit_invoice requires a bookingId (in config or payload)' }
        }
        const pct = action.config.percentage ? Number(action.config.percentage) : undefined
        const r = await createDepositInvoiceFromBooking(bookingId, pct)
        return { success: r.success, result: r, error: r.error }
      }
      case 'create_recurring_invoice': {
        const { createRecurringInvoiceSchedule } = await import('@/lib/invoice-automation')
        const tenantId = action.config.tenantId || payload.tenantId || payload.data.tenantId
        if (!tenantId) {
          return { success: false, error: 'create_recurring_invoice requires a tenantId' }
        }
        const r = await createRecurringInvoiceSchedule({
          name: action.config.name || 'Auto Recurring Invoice',
          customerId: action.config.customerId || payload.data.customerId || payload.data.customer?.id || null,
          jobId: action.config.jobId || payload.data.jobId || payload.data.job?.id || null,
          frequency: action.config.frequency || 'monthly',
          dayOfMonth: action.config.dayOfMonth ? Number(action.config.dayOfMonth) : 1,
          amount: Number(action.config.amount || 0),
          taxPercent: action.config.taxPercent ? Number(action.config.taxPercent) : 0,
          currency: action.config.currency || 'USD',
          itemsJson: action.config.itemsJson,
          notes: action.config.notes || 'Created by workflow automation',
          tenantId,
        })
        return { success: r.success, result: r, error: r.error }
      }
      case 'send_invoice': {
        const { sendInvoice } = await import('@/lib/invoice-automation')
        const invoiceId = action.config.invoiceId || payload.data.invoiceId || payload.data.invoice?.id
        if (!invoiceId) {
          return { success: false, error: 'send_invoice requires an invoiceId (in config or payload)' }
        }
        const r = await sendInvoice(invoiceId, {
          sendEmail: action.config.sendEmail !== false,
          sendWhatsApp: action.config.sendWhatsApp !== false,
        })
        return { success: !(r.email?.error) || !(r.whatsapp?.error), result: r }
      }
      case 'mark_paid': {
        const { markInvoicePaid } = await import('@/lib/invoice-automation')
        const invoiceId = action.config.invoiceId || payload.data.invoiceId || payload.data.invoice?.id
        if (!invoiceId) {
          return { success: false, error: 'mark_paid requires an invoiceId (in config or payload)' }
        }
        const r = await markInvoicePaid(invoiceId)
        return { success: r.success, result: r, error: r.error }
      }
      case 'send_reminder': {
        const { sendInvoiceReminder } = await import('@/lib/invoice-automation')
        const invoiceId = action.config.invoiceId || payload.data.invoiceId || payload.data.invoice?.id
        if (!invoiceId) {
          return { success: false, error: 'send_reminder requires an invoiceId (in config or payload)' }
        }
        const r = await sendInvoiceReminder(invoiceId)
        return { success: r.success, result: r, error: r.error }
      }
      case 'approve_invoice': {
        const { approveInvoice } = await import('@/lib/invoice-automation')
        const invoiceId = action.config.invoiceId || payload.data.invoiceId || payload.data.invoice?.id
        if (!invoiceId) {
          return { success: false, error: 'approve_invoice requires an invoiceId (in config or payload)' }
        }
        const r = await approveInvoice(invoiceId)
        return { success: r.success, result: r, error: r.error }
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Action execution failed' }
  }
}

// ─── Trigger Engine ──────────────────────────────────────────────────────────

class TriggerEngineClass {
  private initialized = false

  /**
   * Initialize the trigger engine by subscribing to all EventBus events
   * that have matching triggers in the catalog.
   */
  initialize(): void {
    if (this.initialized) return

    // Get unique events from the catalog
    const uniqueEvents = new Set<ServiceEvent>(
      TRIGGER_CATALOG.map(t => t.event)
    )

    // Subscribe to each unique event
    for (const event of uniqueEvents) {
      EventBus.on(event, this.handleEvent.bind(this))
    }

    this.initialized = true
    console.log(`[TriggerEngine] Initialized with ${uniqueEvents.size} event subscriptions`)
  }

  /**
   * Handle an incoming event from the EventBus
   */
  private async handleEvent(payload: EventPayload): Promise<void> {
    const { event, data, tenantId, workspaceId } = payload

    try {
      // Find all active automations matching this event
      const automations = await db.workflowAutomation.findMany({
        where: {
          active: true,
          triggerType: event,
          ...(tenantId ? { tenantId } : {}),
        },
      })

      // Also find automations by catalog trigger ID (e.g., lead.assigned → lead.updated)
      const catalogMatches = TRIGGER_CATALOG.filter(
        t => t.event === event && t.id !== event
      )
      
      if (catalogMatches.length > 0) {
        const additionalAutomations = await db.workflowAutomation.findMany({
          where: {
            active: true,
            triggerType: { in: catalogMatches.map(t => t.id) },
            ...(tenantId ? { tenantId } : {}),
          },
        })
        automations.push(...additionalAutomations)
      }

      if (automations.length === 0) return

      console.log(`[TriggerEngine] Found ${automations.length} matching automations for "${event}"`)

      // Execute each matching automation
      for (const automation of automations) {
        await this.executeAutomation(automation, payload)
      }
    } catch (error) {
      console.error(`[TriggerEngine] Error handling event "${event}":`, error)
    }
  }

  /**
   * Execute a single automation
   */
  private async executeAutomation(
    automation: any,
    payload: EventPayload
  ): Promise<void> {
    const startTime = Date.now()
    let conditionsMet = true
    let executionStatus = 'success'
    let executionError: string | undefined
    const actionResults: any[] = []

    try {
      // 1. Evaluate conditions
      const conditions: Condition[] = JSON.parse(automation.conditionsJson || '[]')
      conditionsMet = evaluateConditions(conditions, payload.data)

      if (!conditionsMet) {
        console.log(`[TriggerEngine] Conditions not met for "${automation.name}"`)
        executionStatus = 'skipped'
      } else {
        // 2. Check trigger config for delays (time-based triggers)
        const triggerConfig = JSON.parse(automation.triggerConfigJson || '{}')
        if (triggerConfig.delayMinutes && triggerConfig.delayMinutes > 0) {
          // Schedule delayed execution
          console.log(`[TriggerEngine] Scheduling delayed execution for "${automation.name}" in ${triggerConfig.delayMinutes} minutes`)
          setTimeout(async () => {
            try {
              const actions = JSON.parse(automation.actionsJson || '[]')
              const results: { success: boolean; result?: any; error?: string }[] = []
              for (const action of actions) {
                const result = await executeAction(action, payload)
                results.push(result)
              }
              
              await db.triggerExecution.create({
                data: {
                  automationId: automation.id,
                  triggerEvent: payload.event,
                  triggerPayload: JSON.stringify(payload.data),
                  conditionsMet: true,
                  actionsResultsJson: JSON.stringify(results),
                  status: results.every(r => r.success) ? 'success' : 'partial',
                  durationMs: Date.now() - startTime,
                  tenantId: payload.tenantId || null,
                },
              })
            } catch (err: any) {
              console.error(`[TriggerEngine] Delayed execution failed for "${automation.name}":`, err)
            }
          }, triggerConfig.delayMinutes * 60 * 1000)
          
          // Don't log as a full execution yet - it's scheduled
          return
        }

        // 3. Execute actions
        const actions = JSON.parse(automation.actionsJson || '[]')
        for (const action of actions) {
          const result = await executeAction(action, payload)
          actionResults.push(result)
          if (!result.success) {
            executionStatus = 'partial'
          }
        }

        if (actionResults.every(r => !r.success)) {
          executionStatus = 'failed'
        }
      }
    } catch (error: any) {
      executionStatus = 'failed'
      executionError = error.message
      console.error(`[TriggerEngine] Automation "${automation.name}" failed:`, error)
    }

    const durationMs = Date.now() - startTime

    // 4. Update automation stats
    try {
      await db.workflowAutomation.update({
        where: { id: automation.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
          lastExecutionStatus: executionStatus,
        },
      })
    } catch {
      // Ignore stats update failure
    }

    // 5. Log execution
    try {
      await db.triggerExecution.create({
        data: {
          automationId: automation.id,
          triggerEvent: payload.event,
          triggerPayload: JSON.stringify(payload.data),
          conditionsMet,
          actionsResultsJson: JSON.stringify(actionResults),
          status: executionStatus,
          error: executionError,
          durationMs,
          tenantId: payload.tenantId || null,
        },
      })
    } catch {
      // Ignore logging failure
    }
  }
}

// ─── Export Singleton ────────────────────────────────────────────────────────

export const TriggerEngine = new TriggerEngineClass()

// Auto-initialize when imported on server side
if (typeof window === 'undefined') {
  TriggerEngine.initialize()
}
