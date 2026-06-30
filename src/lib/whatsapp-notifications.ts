import { db } from '@/lib/db'

// ==========================================
// TYPES
// ==========================================

interface NotificationPayload {
  to: string
  message: string
  type?: 'text' | 'interactive'
  interactive?: Record<string, unknown>
  recipientName?: string
  recipientRole?: 'employee' | 'customer'
  subject?: string
  jobId?: string
  employeeId?: string
  customerId?: string
  tenantId?: string
}

interface SendResult {
  success: boolean
  error?: string
  externalId?: string
  simulated?: boolean
}

// ==========================================
// INTERNAL WHATSAPP SEND
// ==========================================

async function sendWhatsAppMessage(
  to: string,
  message: string,
  type?: string,
  interactive?: Record<string, unknown>
): Promise<SendResult> {
  // Try to find a WhatsApp credential in the database
  const credential = await db.credential.findFirst({
    where: { type: 'whatsapp' },
    orderBy: { createdAt: 'desc' },
  })

  if (credential) {
    // Send real WhatsApp message via the API
    try {
      const credData = JSON.parse(credential.encryptedData) as Record<string, string>
      const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0'

      let recipientPhone = to.replace(/\D/g, '')
      // Auto-correct: if phone number is 10 digits, prepend country code
      if (/^\d{10}$/.test(recipientPhone)) {
        recipientPhone = `91${recipientPhone}`
      }

      let payload: Record<string, unknown>
      if (type === 'interactive' && interactive) {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'interactive',
          interactive,
        }
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'text',
          text: { body: message, preview_url: false },
        }
      }

      const response = await fetch(`${WHATSAPP_API_BASE}/${credData.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credData.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as Record<string, unknown>
      const messages = data.messages as Array<{ id: string }> | undefined
      const errorObj = data.error as Record<string, unknown> | undefined

      return {
        success: response.ok,
        externalId: messages?.[0]?.id,
        error: !response.ok ? (errorObj?.message as string) || `WhatsApp API error: ${response.status}` : undefined,
      }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }

  // No credential - simulate and log
  return { success: true, externalId: `sim_${Date.now()}`, simulated: true }
}

// ==========================================
// MAIN NOTIFICATION SENDER + LOGGER
// ==========================================

export async function sendJobNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  let sendResult: SendResult = { success: true, simulated: true, externalId: `sim_${Date.now()}` }

  // 1. Attempt to send the WhatsApp message
  try {
    sendResult = await sendWhatsAppMessage(payload.to, payload.message, payload.type, payload.interactive)
  } catch (e) {
    console.error('WhatsApp send error:', e)
    sendResult = { success: false, error: String(e) }
  }

  // 2. Create a NotificationLog entry (even if the send failed)
  try {
    await db.notificationLog.create({
      data: {
        type: 'whatsapp',
        recipient: payload.to,
        recipientName: payload.recipientName,
        recipientRole: payload.recipientRole,
        subject: payload.subject,
        message: payload.message,
        status: sendResult.success ? 'sent' : 'failed',
        externalId: sendResult.externalId,
        jobId: payload.jobId,
        employeeId: payload.employeeId,
        customerId: payload.customerId,
        tenantId: payload.tenantId,
        metadataJson: JSON.stringify({
          notificationType: payload.type || 'text',
          simulated: sendResult.simulated ?? false,
          error: sendResult.error,
        }),
      },
    })
  } catch (logError) {
    console.error('Failed to create NotificationLog:', logError)
  }

  // 3. Update the job's notificationLogJson
  if (payload.jobId) {
    try {
      const job = await db.job.findUnique({ where: { id: payload.jobId } })
      if (job) {
        const existingLogs: unknown[] = (() => {
          try {
            return JSON.parse(job.notificationLogJson || '[]')
          } catch {
            return []
          }
        })()

        existingLogs.push({
          action: 'whatsapp_notification',
          to: payload.to,
          recipientName: payload.recipientName,
          recipientRole: payload.recipientRole,
          subject: payload.subject,
          status: sendResult.success ? 'sent' : 'failed',
          externalId: sendResult.externalId,
          simulated: sendResult.simulated ?? false,
          error: sendResult.error,
          timestamp: new Date().toISOString(),
        })

        await db.job.update({
          where: { id: payload.jobId },
          data: { notificationLogJson: JSON.stringify(existingLogs) },
        })
      }
    } catch (updateError) {
      console.error('Failed to update job notificationLogJson:', updateError)
    }
  }

  // 4. Return success/failure
  return { success: sendResult.success, error: sendResult.error }
}

// ==========================================
// HELPER: Format date/time for display
// ==========================================

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'TBD'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return 'TBD'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getJobNumber(job: Record<string, unknown>): string {
  return (job.jobNumber as string) || (job.id as string)?.slice(-6)?.toUpperCase() || 'N/A'
}

// ==========================================
// EMPLOYEE NOTIFICATIONS
// ==========================================

export async function notifyEmployeeJobAssigned(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  if (!employeePhone) return

  const jobNumber = getJobNumber(job)
  const scheduledDate = formatDate(job.scheduledAt as string | null)
  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)

  const message = [
    '🔔 New Job Assigned',
    '',
    `Job #${jobNumber}`,
    `Customer: ${job.customerName || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
    `Service: ${job.title || 'N/A'}`,
    `Date: ${scheduledDate}`,
    `Time: ${scheduledTime}`,
    `Phone: ${job.customerPhone || 'N/A'}`,
    '',
    'Please confirm arrival.',
  ].join('\n')

  // Interactive buttons: [Accept Job] [Reject Job]
  const interactive = {
    type: 'button',
    body: { text: message },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: { id: `job_accept_${job.id}`, title: 'Accept Job' },
        },
        {
          type: 'reply',
          reply: { id: `job_reject_${job.id}`, title: 'Reject Job' },
        },
      ],
    },
  }

  await sendJobNotification({
    to: employeePhone,
    message,
    type: 'interactive',
    interactive,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `New Job Assigned: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: employee.id as string,
    customerId: (job.customerId as string) || undefined,
    // NOTE: NotificationLog.tenantId is a FK to Tenant. Job has `workspaceId`,
    // not `tenantId`, so `job.tenantId` is always undefined here. Do NOT fall
    // back to `employee.workspaceId` — that is a Workspace ID, not a Tenant ID,
    // and would violate the FK constraint (Prisma P2003) and abort the log.
    tenantId: (job.tenantId as string) || undefined,
  })
}

export async function notifyEmployeeJobStarted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  if (!employeePhone) return

  const jobNumber = getJobNumber(job)
  const checkInTime = formatTime(job.actualStartTime as string | null)

  const message = [
    '✅ Job Started',
    `Job #${jobNumber} - ${job.title || 'N/A'}`,
    `You checked in at ${checkInTime}`,
    `Customer: ${job.customerName || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `Job Started: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: employee.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}

export async function notifyEmployeeJobCompleted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  if (!employeePhone) return

  const jobNumber = getJobNumber(job)
  const completedJobs = ((employee.completedJobs as number) || 0) + 1

  const message = [
    '🎉 Job Completed!',
    `Job #${jobNumber} - ${job.title || 'N/A'}`,
    'Great work! Job marked as completed.',
    `Total completed: ${completedJobs}`,
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `Job Completed: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: employee.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}

// ==========================================
// CUSTOMER NOTIFICATIONS
// ==========================================

export async function notifyCustomerJobAssigned(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)

  const message = [
    '✅ Technician Assigned',
    '',
    'Your technician has been assigned.',
    `Technician: ${employee.name || 'N/A'}`,
    `Arrival: ${scheduledTime}`,
    `Service: ${job.title || 'N/A'}`,
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Technician Assigned: ${employee.name || 'N/A'}`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}

export async function notifyCustomerJobStarted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)

  const message = [
    '🚀 Technician On The Way',
    '',
    `${employee.name || 'Your technician'} is on the way!`,
    `Service: ${job.title || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
    `ETA: ${scheduledTime}`,
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Technician On The Way`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}

export async function notifyCustomerJobCompleted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  // Try to find tenant name for the signature.
  // Job has `workspaceId` (not `tenantId`), so resolve via the Workspace row.
  let tenantName = 'ServiceOS'
  try {
    const wid = (job.tenantId as string) || (job.workspaceId as string)
    if (wid) {
      // Could be either a tenant id or a workspace id — try tenant first, then workspace
      const tenant = await db.tenant.findUnique({ where: { id: wid } })
      if (tenant?.name) {
        tenantName = tenant.name
      } else {
        const workspace = await db.workspace.findUnique({
          where: { id: wid },
          include: { tenant: true },
        })
        if (workspace?.tenant?.name) tenantName = workspace.tenant.name
      }
    }
  } catch {
    // fallback to default
  }

  const jobNumber = getJobNumber(job)

  const message = [
    '✅ Service Completed',
    '',
    'Your service has been completed.',
    `Service: ${job.title || 'N/A'}`,
    `Technician: ${employee.name || 'N/A'}`,
    '',
    `Thank you for choosing ${tenantName}!`,
    '',
    'Please rate your experience:',
    '⭐⭐⭐⭐⭐',
  ].join('\n')

  const interactive = {
    type: 'button',
    body: { text: message },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: { id: `rate_5_${job.id}`, title: '⭐⭐⭐⭐⭐' },
        },
        {
          type: 'reply',
          reply: { id: `rate_4_${job.id}`, title: '⭐⭐⭐⭐' },
        },
        {
          type: 'reply',
          reply: { id: `rate_3_${job.id}`, title: '⭐⭐⭐' },
        },
      ],
    },
  }

  await sendJobNotification({
    to: customerPhone,
    message,
    type: 'interactive',
    interactive,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Service Completed: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}

// ==========================================
// LEAD NOTIFICATIONS
// ==========================================

export async function notifyEmployeeLeadAssigned(
  lead: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  if (!employeePhone) return

  const message = [
    '🔔 New Lead Assigned',
    '',
    `Name: ${lead.name || 'N/A'}`,
    `Phone: ${lead.phone || 'N/A'}`,
    `Source: ${lead.source || 'N/A'}`,
    `Service: ${lead.serviceType || 'N/A'}`,
    `Priority: ${lead.priority || 'N/A'}`,
    `Value: ${lead.value || 'N/A'}`,
    '',
    'Please follow up promptly.',
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `New Lead Assigned: ${lead.name || 'N/A'}`,
    employeeId: employee.id as string,
    tenantId: (lead.tenantId as string) || undefined,
  })
}

export async function notifyCustomerLeadAssigned(
  lead: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (lead.phone as string) || ''
  if (!customerPhone) return

  const message = [
    `👋 Hello ${lead.name || 'there'}!`,
    '',
    'Thank you for your interest in our services. ' +
      `${employee.name || 'A team member'} has been assigned to assist you.`,
    '',
    'They will reach out to you shortly. If you need immediate help, feel free to reply to this message.',
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (lead.name as string) || undefined,
    recipientRole: 'customer',
    subject: `Assigned Representative: ${employee.name || 'N/A'}`,
    employeeId: (employee.id as string) || undefined,
    tenantId: (lead.tenantId as string) || undefined,
  })
}

export async function notifyCustomerBookingConfirmed(job: Record<string, unknown>): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const jobNumber = getJobNumber(job)
  const scheduledDate = formatDate(job.scheduledAt as string | null)

  const message = [
    '📋 Booking Confirmed',
    '',
    'Thank you for your booking.',
    `Booking ID: ${jobNumber}`,
    `Service: ${job.title || 'N/A'}`,
    `Date: ${scheduledDate}`,
    '',
    'We will assign a technician shortly.',
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Booking Confirmed: #${jobNumber}`,
    jobId: job.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
  })
}
