/**
 * ServiceOS — Lifecycle Push Dispatcher
 *
 * A central EventBus listener that fires an in-app notification + a real Web
 * Push notification to the relevant dashboard users on EVERY lifecycle event.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Before this module, push notifications were wired ad-hoc: a handful of API
 * routes called `notifyOwner()` / `notifyEmployeeJobAssigned()` which fired
 * push for a FEW events (job.assigned, job.completed, lead.created, …). The
 * majority of lifecycle events (job.accepted, job.rejected, job.updated,
 * lead.updated, lead.converted, booking.*, employee.status_changed,
 * payment.received, quote.*, conversation.message_received) emitted a
 * `EventBus.emit(...)` but triggered NO push at all.
 *
 * This module closes that gap by registering a handler for every event on the
 * bus. It is the SINGLE source of truth for "who gets a push on event X" and
 * guarantees the tenant owner (operator) always sees every lifecycle change,
 * plus the assigned employee sees job/lead events that concern them.
 *
 * ARCHITECTURE
 * ─────────────
 *   API Route → EventBus.emit('job.assigned', {…})
 *                 ↓
 *               EventBus.emit() runs all registered handlers in parallel
 *                 ↓
 *               lifecycle-push-dispatcher handler:
 *                 1. resolve tenantId + resourceId from the payload
 *                 2. resolve recipients:
 *                    • owner/admin user(s) for the tenant  → ALWAYS
 *                    • assigned employee (Job.assigneeId / Lead.assignedToId)
 *                      → for job.* + lead.* events (NOT for accept/reject,
 *                        since the employee is the actor)
 *                 3. for each recipient:
 *                    • dedup check (hasRecentPush)
 *                    • createNotification()  → in-app bell + inbox
 *                    • sendWebPushToUser()   → device push (APNs/FCM)
 *                    • markPushSent()
 *
 * DEDUPLICATION
 * ──────────────
 * A few events are ALSO covered by the legacy ad-hoc notify functions
 * (`notifyOwner` pushes to the owner on lead.created / job.completed / invoice
 * events; `sendJobNotification` pushes to the employee on job.assigned /
 * started / completed). To avoid double-pushing the same user for the same
 * event, both this dispatcher and the ad-hoc paths consult a shared in-memory
 * dedup cache (`pushDedupCache`) keyed by `${userId}:${eventType}:${resourceId}`
 * with a 5-minute TTL. Whichever fires first wins; the other becomes a no-op.
 *
 * The cache is module-level (not persistent) — on a server restart the cache
 * is empty, so the first event after restart may double-push if the ad-hoc
 * path also fires. This is acceptable (restarts are rare; one extra push is
 * not harmful) and avoids the complexity of a persistent cache.
 *
 * REGISTRATION
 * ──────────────
 * `registerLifecyclePushHandlers()` is called once from `instrumentation.ts`
 * (Next.js server boot). It is idempotent — calling it twice registers each
 * handler twice, but the dedup cache makes the second handler a no-op.
 */

import { EventBus, type ServiceEvent, type EventPayload } from '@/lib/event-bus'
import { db } from '@/lib/db'
import { resolveTenantId, resolveOwner } from '@/lib/owner-notifications'
import { createNotification } from '@/lib/notifications'
import { sendWebPushToUser } from '@/lib/web-push-send'

// ─── Dedup cache ──────────────────────────────────────────────────────────────
//
// Map key → epoch millis when the entry should expire.
// TTL is 5 minutes — long enough to absorb the ad-hoc + dispatcher race for a
// single event, short enough that a legitimately repeated event (e.g. a job
// re-assigned 10 minutes later) still pushes.
const PUSH_DEDUP_TTL_MS = 5 * 60 * 1000
const pushDedupCache = new Map<string, number>()

/** Build the dedup cache key. */
function dedupKey(userId: string, eventType: string, resourceId: string | null | undefined): string {
  return `${userId}:${eventType}:${resourceId || 'none'}`
}

/**
 * Has a push for this (user, event, resource) triple been sent recently?
 * Exported so the ad-hoc notify paths (notifyOwner, sendJobNotification) can
 * consult the same cache and avoid double-pushing.
 */
export function hasRecentPush(
  userId: string,
  eventType: string,
  resourceId: string | null | undefined,
): boolean {
  const key = dedupKey(userId, eventType, resourceId)
  const expiresAt = pushDedupCache.get(key)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) {
    // Expired — clean up and treat as "not sent".
    pushDedupCache.delete(key)
    return false
  }
  return true
}

/**
 * Mark that a push for this (user, event, resource) triple was just sent.
 * Exported so the ad-hoc notify paths can mark their sends.
 */
export function markPushSent(
  userId: string,
  eventType: string,
  resourceId: string | null | undefined,
): void {
  const key = dedupKey(userId, eventType, resourceId)
  pushDedupCache.set(key, Date.now() + PUSH_DEDUP_TTL_MS)
  // Opportunistic cleanup — prune expired entries every ~100 writes so the map
  // doesn't grow unbounded in long-running processes.
  if (pushDedupCache.size > 500) {
    const now = Date.now()
    for (const [k, exp] of pushDedupCache) {
      if (now > exp) pushDedupCache.delete(k)
    }
  }
}

// ─── Recipient resolution ─────────────────────────────────────────────────────

interface PushRecipient {
  userId: string
  tenantId: string
  role: 'owner' | 'employee'
}

/**
 * Resolve the owner/admin user(s) to push to for a given tenant.
 * Returns at most 2 users (owner + admin) — we don't push to every user in
 * the tenant, only the operator(s) who need lifecycle visibility.
 */
async function resolveOwnerRecipients(tenantId: string): Promise<PushRecipient[]> {
  const recipients: PushRecipient[] = []
  try {
    const owner = await resolveOwner(tenantId)
    if (owner?.userId) {
      recipients.push({ userId: owner.userId, tenantId: owner.tenantId, role: 'owner' })
    }
  } catch (err) {
    console.warn('[lifecycle-push] resolveOwnerRecipients failed:', err)
  }
  // Also push to active admins (in addition to the single owner resolved
  // above) — admins are operators too and need lifecycle visibility.
  try {
    const admins = await db.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true },
      take: 5,
    })
    for (const a of admins) {
      if (!recipients.some((r) => r.userId === a.id)) {
        recipients.push({ userId: a.id, tenantId, role: 'owner' })
      }
    }
  } catch (err) {
    // Non-fatal — owner push is the critical path.
  }
  return recipients
}

/**
 * Resolve the assigned employee's userId for a job. Returns null if the job
 * has no assignee or the assignee has no linked user account.
 */
async function resolveEmployeeForJob(jobId: string): Promise<PushRecipient | null> {
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { assigneeId: true, workspaceId: true },
    })
    if (!job?.assigneeId) return null
    const emp = await db.employee.findUnique({
      where: { id: job.assigneeId },
      select: { userId: true, workspaceId: true },
    })
    if (!emp?.userId) return null
    const tenantId = await resolveTenantId(emp.workspaceId || job.workspaceId)
    if (!tenantId) return null
    return { userId: emp.userId, tenantId, role: 'employee' }
  } catch (err) {
    console.warn('[lifecycle-push] resolveEmployeeForJob failed:', err)
    return null
  }
}

/**
 * Resolve the assigned employee's userId for a lead. Returns null if the lead
 * has no assignee or the assignee has no linked user account.
 */
async function resolveEmployeeForLead(leadId: string): Promise<PushRecipient | null> {
  try {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { assignedToId: true, tenantId: true },
    })
    if (!lead?.assignedToId) return null
    const emp = await db.employee.findUnique({
      where: { id: lead.assignedToId },
      select: { userId: true, workspaceId: true },
    })
    if (!emp?.userId) return null
    const tenantId = await resolveTenantId(emp.workspaceId || lead.tenantId)
    if (!tenantId) return null
    return { userId: emp.userId, tenantId, role: 'employee' }
  } catch (err) {
    console.warn('[lifecycle-push] resolveEmployeeForLead failed:', err)
    return null
  }
}

// ─── Event → title/body derivation ────────────────────────────────────────────
//
// Each event maps to a short push title + body. We keep these concise (push
// titles <=80 chars, bodies <=200 chars) so they render well in the OS
// notification tray on both iOS (APNs) and Android (FCM).

interface PushContent {
  title: string
  body: string
  /** Deep-link URL for the in-app + push notification. */
  url: string
  /** In-app notification type (drives the bell icon + category). */
  inAppType: string
}

function pick(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v)
  }
  return ''
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/**
 * Derive push content (title + body + url + inAppType) from a lifecycle event.
 * Falls back to a generic "Lifecycle update" message for events without a
 * specific handler — so EVERY event produces a push, even if the payload
 * shape is unfamiliar.
 */
function derivePushContent(event: ServiceEvent, data: Record<string, any>): PushContent {
  const job = data.job || {}
  const lead = data.lead || {}
  const booking = data.booking || {}
  const invoice = data.invoice || {}
  const quote = data.quote || {}

  const jobId = pick(job.id, data.jobId, data.resourceId && data.resourceType === 'job' ? data.resourceId : null)
  const leadId = pick(lead.id, data.leadId, data.resourceId && data.resourceType === 'lead' ? data.resourceId : null)
  const bookingId = pick(booking.id, data.bookingId, data.resourceId && data.resourceType === 'booking' ? data.resourceId : null)
  const invoiceId = pick(invoice.id, data.invoiceId, data.resourceId && data.resourceType === 'invoice' ? data.resourceId : null)

  switch (event) {
    // ── Job events ────────────────────────────────────────────────
    case 'job.created': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`New job${num ? ` #${num}` : ''}: ${pick(job.title, 'Untitled')}`, 80),
        body: truncate(`${pick(job.customerName, 'Customer')} • ${pick(job.type, 'service')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'job_assigned',
      }
    }
    case 'job.assigned': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job assigned${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.title, 'Untitled')} → ${pick(job.assigneeName, 'technician')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'job_assigned',
      }
    }
    case 'job.accepted': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job accepted${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.assigneeName, 'Technician')} accepted • ${pick(job.title, 'Untitled')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'job_assigned',
      }
    }
    case 'job.rejected': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job rejected${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.title, 'Untitled')} — ${pick(data.reason, 'no reason given')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'reminder',
      }
    }
    case 'job.started': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job started${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.assigneeName, 'Technician')} started • ${pick(job.title, 'Untitled')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'job_started',
      }
    }
    case 'job.completed': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job completed${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.title, 'Untitled')} • ${pick(job.customerName, 'Customer')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'job_completed',
      }
    }
    case 'job.cancelled': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job cancelled${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.title, 'Untitled')} — ${pick(data.reason, 'cancelled')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'reminder',
      }
    }
    case 'job.updated': {
      const num = pick(job.jobNumber)
      return {
        title: truncate(`Job updated${num ? ` #${num}` : ''}`, 80),
        body: truncate(`${pick(job.title, 'Untitled')} • ${pick(job.status, 'updated')}`, 200),
        url: jobId ? `/?view=jobs&job=${jobId}` : '/?view=jobs',
        inAppType: 'reminder',
      }
    }

    // ── Lead events ───────────────────────────────────────────────
    case 'lead.created': {
      return {
        title: truncate(`New lead: ${pick(data.name, lead.name, 'Unknown')}`, 80),
        body: truncate(`Source: ${pick(data.source, lead.source, 'manual')} • ${pick(data.phone, lead.phone, '')}`, 200),
        url: leadId ? `/?view=leads&lead=${leadId}` : '/?view=leads',
        inAppType: 'lead_assigned',
      }
    }
    case 'lead.updated': {
      return {
        title: truncate(`Lead updated: ${pick(data.name, lead.name, 'Unknown')}`, 80),
        body: truncate(`Status: ${pick(data.status, lead.status, 'updated')}`, 200),
        url: leadId ? `/?view=leads&lead=${leadId}` : '/?view=leads',
        inAppType: 'lead_updated',
      }
    }
    case 'lead.converted': {
      return {
        title: truncate(`Lead converted: ${pick(data.name, lead.name, 'Unknown')}`, 80),
        body: truncate(`→ Job created${data.jobId ? ` (${data.jobId.slice(-6)})` : ''}`, 200),
        url: leadId ? `/?view=leads&lead=${leadId}` : '/?view=leads',
        inAppType: 'lead_updated',
      }
    }

    // ── Booking events ────────────────────────────────────────────
    case 'booking.created': {
      return {
        title: truncate(`New booking: ${pick(booking.title, data.title, 'Untitled')}`, 80),
        body: truncate(`${pick(booking.customerName, data.customerName, 'Customer')} • ${booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : ''}`, 200),
        url: bookingId ? `/?view=bookings&booking=${bookingId}` : '/?view=bookings',
        inAppType: 'reminder',
      }
    }
    case 'booking.confirmed': {
      return {
        title: truncate(`Booking confirmed: ${pick(booking.title, data.title, 'Untitled')}`, 80),
        body: truncate(`${pick(booking.customerName, data.customerName, 'Customer')}`, 200),
        url: bookingId ? `/?view=bookings&booking=${bookingId}` : '/?view=bookings',
        inAppType: 'reminder',
      }
    }
    case 'booking.rescheduled': {
      return {
        title: truncate(`Booking rescheduled: ${pick(booking.title, data.title, 'Untitled')}`, 80),
        body: truncate(`${pick(booking.customerName, data.customerName, 'Customer')} • ${booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : ''}`, 200),
        url: bookingId ? `/?view=bookings&booking=${bookingId}` : '/?view=bookings',
        inAppType: 'reminder',
      }
    }
    case 'booking.cancelled': {
      return {
        title: truncate(`Booking cancelled: ${pick(booking.title, data.title, 'Untitled')}`, 80),
        body: truncate(`${pick(booking.customerName, data.customerName, 'Customer')} — ${pick(data.reason, 'cancelled')}`, 200),
        url: bookingId ? `/?view=bookings&booking=${bookingId}` : '/?view=bookings',
        inAppType: 'reminder',
      }
    }
    case 'booking.completed': {
      return {
        title: truncate(`Booking completed: ${pick(booking.title, data.title, 'Untitled')}`, 80),
        body: truncate(`${pick(booking.customerName, data.customerName, 'Customer')}`, 200),
        url: bookingId ? `/?view=bookings&booking=${bookingId}` : '/?view=bookings',
        inAppType: 'job_completed',
      }
    }

    // ── Invoice / Quote / Payment events ──────────────────────────
    case 'invoice.created': {
      const num = pick(invoice.number, data.invoiceNumber)
      return {
        title: truncate(`Invoice created${num ? ` ${num}` : ''}`, 80),
        body: truncate(`${pick(data.amount, invoice.total) ? `$${data.amount || invoice.total}` : ''} • ${pick(data.customerName, 'Customer')}`, 200),
        url: invoiceId ? `/?view=invoices&invoice=${invoiceId}` : '/?view=invoices',
        inAppType: 'invoice_created',
      }
    }
    case 'invoice.paid': {
      const num = pick(invoice.number, data.invoiceNumber)
      return {
        title: truncate(`Invoice paid${num ? ` ${num}` : ''}`, 80),
        body: truncate(`${pick(data.amount, invoice.total) ? `$${data.amount || invoice.total}` : ''} received`, 200),
        url: invoiceId ? `/?view=invoices&invoice=${invoiceId}` : '/?view=invoices',
        inAppType: 'invoice_paid',
      }
    }
    case 'invoice.overdue': {
      const num = pick(invoice.number, data.invoiceNumber)
      return {
        title: truncate(`Invoice overdue${num ? ` ${num}` : ''}`, 80),
        body: truncate(`${pick(data.customerName, 'Customer')} — follow up needed`, 200),
        url: invoiceId ? `/?view=invoices&invoice=${invoiceId}` : '/?view=invoices',
        inAppType: 'reminder',
      }
    }
    case 'payment.received': {
      const num = pick(data.invoiceNumber)
      return {
        title: truncate(`Payment received${num ? ` for ${num}` : ''}`, 80),
        body: truncate(`${data.amount ? `$${data.amount}` : ''} ${data.currency || ''} • ${pick(data.customerName, 'Customer')}`, 200),
        url: invoiceId ? `/?view=invoices&invoice=${invoiceId}` : '/?view=invoices',
        inAppType: 'invoice_paid',
      }
    }
    case 'payment.failed': {
      const num = pick(data.invoiceNumber)
      return {
        title: truncate(`Payment failed${num ? ` for ${num}` : ''}`, 80),
        body: truncate(`${pick(data.customerName, 'Customer')} — ${pick(data.reason, 'failure')}`, 200),
        url: invoiceId ? `/?view=invoices&invoice=${invoiceId}` : '/?view=invoices',
        inAppType: 'reminder',
      }
    }
    case 'quote.sent': {
      return {
        title: 'Quote sent',
        body: truncate(`${pick(quote.customerName, data.customerName, 'Customer')} • ${pick(quote.total, data.total) ? `$${quote.total || data.total}` : ''}`, 200),
        url: data.quoteId ? `/?view=quotes&quote=${data.quoteId}` : '/?view=quotes',
        inAppType: 'quote_approved',
      }
    }
    case 'quote.accepted': {
      return {
        title: 'Quote accepted!',
        body: truncate(`${pick(quote.customerName, data.customerName, 'Customer')}`, 200),
        url: data.quoteId ? `/?view=quotes&quote=${data.quoteId}` : '/?view=quotes',
        inAppType: 'quote_approved',
      }
    }
    case 'quote.rejected': {
      return {
        title: 'Quote rejected',
        body: truncate(`${pick(quote.customerName, data.customerName, 'Customer')} — follow up`, 200),
        url: data.quoteId ? `/?view=quotes&quote=${data.quoteId}` : '/?view=quotes',
        inAppType: 'quote_rejected',
      }
    }

    // ── Employee events ───────────────────────────────────────────
    case 'employee.status_changed': {
      return {
        title: truncate(`${pick(data.employeeName, 'Employee')} → ${pick(data.toStatus, 'updated')}`, 80),
        body: truncate(`Status changed from ${pick(data.fromStatus, '?')} to ${pick(data.toStatus, '?')}${data.reason ? `: ${data.reason}` : ''}`, 200),
        url: '/?view=team',
        inAppType: 'reminder',
      }
    }
    case 'employee.heartbeat': {
      // Heartbeats are too frequent to push on every time — skip.
      return { title: '', body: '', url: '/', inAppType: 'reminder' }
    }

    // ── Conversation events ───────────────────────────────────────
    case 'conversation.message_received': {
      return {
        title: truncate(`New message from ${pick(data.customerName, data.phone, 'customer')}`, 80),
        body: truncate(pick(data.message, data.preview, 'New message'), 200),
        url: data.conversationId ? `/?view=messages&conversation=${data.conversationId}` : '/?view=messages',
        inAppType: 'reminder',
      }
    }
    case 'conversation.message_sent': {
      return { title: '', body: '', url: '/', inAppType: 'reminder' }
    }
    case 'conversation.state_changed': {
      return { title: '', body: '', url: '/', inAppType: 'reminder' }
    }

    // ── Journey events (map to job lifecycle stages) ──────────────
    case 'journey.lead_created':
      return { title: 'New journey started', body: truncate(pick(data.customerName, 'New lead'), 200), url: '/', inAppType: 'lead_assigned' }
    case 'journey.booking_confirmed':
      return { title: 'Journey: booking confirmed', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }
    case 'journey.technician_assigned':
      return { title: 'Journey: technician assigned', body: truncate(pick(data.employeeName, 'Technician'), 200), url: '/', inAppType: 'job_assigned' }
    case 'journey.en_route':
      return { title: 'Journey: technician en route', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'technician_on_route' }
    case 'journey.in_progress':
      return { title: 'Journey: service in progress', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'job_started' }
    case 'journey.completed':
      return { title: 'Journey: service completed', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'job_completed' }
    case 'journey.review_requested':
      return { title: 'Journey: review requested', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'customer_review' }
    case 'journey.archived':
      return { title: 'Journey archived', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }
    case 'journey.cancelled':
      return { title: 'Journey cancelled', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }
    case 'journey.custom_action':
      return { title: truncate(`Journey: ${pick(data.actionLabel, 'custom action')}`, 80), body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }

    // ── Misc ──────────────────────────────────────────────────────
    case 'customer.journey_stage_changed':
      return { title: truncate(`Journey stage: ${pick(data.stage, 'updated')}`, 80), body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }
    case 'contract.renewed':
      return { title: 'Contract renewed', body: truncate(pick(data.customerName, 'Customer'), 200), url: '/', inAppType: 'reminder' }
    case 'schedule.trigger':
      return { title: 'Schedule triggered', body: truncate(pick(data.name, data.description, 'scheduled event'), 200), url: '/', inAppType: 'reminder' }

    default:
      return { title: 'Lifecycle update', body: truncate(event, 200), url: '/', inAppType: 'reminder' }
  }
}

// ─── Core: send push to a single recipient ────────────────────────────────────

/**
 * Send an in-app notification + web push to a single recipient for a lifecycle
 * event. Both channels are best-effort (own try/catch) and gated by the dedup
 * cache so the same (user, event, resource) triple never pushes twice.
 */
async function pushToRecipient(
  recipient: PushRecipient,
  event: ServiceEvent,
  resourceId: string | null | undefined,
  content: PushContent,
): Promise<void> {
  // Skip events with empty content (e.g. heartbeats, message_sent).
  if (!content.title && !content.body) return

  // Dedup — if the ad-hoc notify path (or an earlier handler) already pushed
  // this (user, event, resource), skip.
  if (hasRecentPush(recipient.userId, event, resourceId)) {
    return
  }
  markPushSent(recipient.userId, event, resourceId)

  // 1. In-app notification (bell + inbox)
  try {
    await createNotification({
      tenantId: recipient.tenantId,
      recipientId: recipient.userId,
      type: content.inAppType,
      title: content.title,
      message: content.body,
      actionUrl: content.url,
      actionLabel: 'Open',
      priority: recipient.role === 'owner' ? 'high' : 'normal',
      senderType: 'system',
      sourceType: resourceId ? 'LifecycleEvent' : undefined,
      sourceId: resourceId || undefined,
      metadataJson: { event, resourceId, role: recipient.role, channel: 'lifecycle-push' },
    })
  } catch (err) {
    console.error('[lifecycle-push] createNotification failed:', err)
  }

  // 2. Web Push (device notification)
  try {
    await sendWebPushToUser(recipient.userId, recipient.tenantId, {
      title: content.title,
      body: content.body,
      url: content.url,
      tag: `lifecycle_${event}_${resourceId || recipient.userId}`,
      data: { event, resourceId, role: recipient.role },
    })
  } catch (err) {
    console.error('[lifecycle-push] sendWebPushToUser failed:', err)
  }
}

// ─── Event → recipient resolution + dispatch ─────────────────────────────────

/**
 * The main handler registered on the EventBus. For each lifecycle event:
 *   1. Resolve the tenantId (from context.tenantId, data.tenantId, or workspaceId)
 *   2. Derive push content (title/body/url/inAppType) from the event + data
 *   3. Resolve recipients:
 *      • owner + admins → ALWAYS (operator needs lifecycle visibility)
 *      • assigned employee → for job.* / lead.* events (except accept/reject
 *        where the employee is the actor)
 *   4. Push to each recipient (dedup-gated)
 */
async function handleLifecycleEvent(payload: EventPayload): Promise<void> {
  const { event, data, tenantId: ctxTenantId, workspaceId } = payload

  // Skip high-frequency noise events that would spam the user.
  // (employee.heartbeat returns empty content in derivePushContent, so it's
  // already a no-op — but we also skip the DB lookups here for efficiency.)
  if (event === 'employee.heartbeat') return

  // Resolve the real Tenant.id. The context may carry a workspaceId (Job
  // events use workspaceId), so normalize via resolveTenantId.
  const rawTenantId = ctxTenantId || data.tenantId || workspaceId || data.workspaceId
  const tenantId = await resolveTenantId(rawTenantId)
  if (!tenantId) {
    // No tenant → can't resolve owner. Still try to push to an employee if
    // the event carries a jobId/leadId (rare path, e.g. superadmin context).
    const emp = await resolveEmployeeForEvent(event, data)
    if (emp) {
      const content = derivePushContent(event, data)
      await pushToRecipient(emp, event, data.resourceId || data.job?.id || data.leadId, content)
    }
    return
  }

  // Derive push content once — same for all recipients of this event.
  const content = derivePushContent(event, data)
  if (!content.title && !content.body) return // skip empty (heartbeat, message_sent, etc.)

  const resourceId = data.resourceId || data.job?.id || data.leadId || data.bookingId || data.invoiceId || null

  // Resolve recipients in parallel.
  const recipientTasks: Promise<PushRecipient[]>[] = [resolveOwnerRecipients(tenantId)]

  // For job events, also push to the assigned employee — EXCEPT for accept/
  // reject (the employee is the actor; they don't need a push about their own
  // action) and except for journey.* events that duplicate job events.
  const isJobEventForEmployee =
    (event === 'job.created' ||
      event === 'job.assigned' ||
      event === 'job.started' ||
      event === 'job.completed' ||
      event === 'job.updated' ||
      event === 'job.cancelled') &&
    (data.job?.id || data.jobId)

  const isLeadEventForEmployee =
    (event === 'lead.created' || event === 'lead.updated' || event === 'lead.converted') &&
    (data.leadId || data.lead?.id)

  if (isJobEventForEmployee) {
    const jobId = data.job?.id || data.jobId
    recipientTasks.push(resolveEmployeeForJob(jobId).then((e) => (e ? [e] : [])))
  } else if (isLeadEventForEmployee) {
    const leadId = data.leadId || data.lead?.id
    recipientTasks.push(resolveEmployeeForLead(leadId).then((e) => (e ? [e] : [])))
  }

  const recipientLists = await Promise.all(recipientTasks)
  const allRecipients: PushRecipient[] = []
  for (const list of recipientLists) {
    for (const r of list) {
      if (!allRecipients.some((existing) => existing.userId === r.userId)) {
        allRecipients.push(r)
      }
    }
  }

  if (allRecipients.length === 0) return

  // Push to each recipient in parallel. Each is dedup-gated + best-effort.
  await Promise.allSettled(
    allRecipients.map((r) => pushToRecipient(r, event, resourceId, content)),
  )
}

/**
 * Resolve the employee recipient for an event when no tenantId is available
 * (superadmin / single-tenant fallback path). Returns null if not resolvable.
 */
async function resolveEmployeeForEvent(
  event: ServiceEvent,
  data: Record<string, any>,
): Promise<PushRecipient | null> {
  const jobId = data.job?.id || data.jobId
  const leadId = data.leadId || data.lead?.id
  if (jobId) return resolveEmployeeForJob(jobId)
  if (leadId) return resolveEmployeeForLead(leadId)
  return null
}

// ─── Registration ─────────────────────────────────────────────────────────────

/** Set of ALL lifecycle events the dispatcher listens to. */
const LIFECYCLE_EVENTS: ServiceEvent[] = [
  // Job
  'job.created', 'job.updated', 'job.assigned', 'job.accepted',
  'job.started', 'job.completed', 'job.cancelled', 'job.rejected',
  // Lead
  'lead.created', 'lead.updated', 'lead.converted',
  // Booking
  'booking.created', 'booking.confirmed', 'booking.cancelled',
  'booking.completed', 'booking.rescheduled',
  // Invoice / Quote / Payment
  'invoice.created', 'invoice.paid', 'invoice.overdue',
  'quote.sent', 'quote.accepted', 'quote.rejected',
  'payment.received', 'payment.failed',
  // Employee
  'employee.status_changed', 'employee.heartbeat',
  // Conversation
  'conversation.message_received', 'conversation.message_sent',
  'conversation.state_changed',
  // Customer / Journey
  'customer.journey_stage_changed',
  'journey.lead_created', 'journey.booking_confirmed', 'journey.technician_assigned',
  'journey.en_route', 'journey.in_progress', 'journey.completed',
  'journey.review_requested', 'journey.archived', 'journey.cancelled',
  'journey.custom_action',
  // Misc
  'contract.renewed', 'schedule.trigger',
]

let registered = false

/**
 * Register the lifecycle push dispatcher on the EventBus. Called once from
 * `instrumentation.ts` at server boot. Idempotent — if called twice, the
 * second call is a no-op (the dedup cache makes duplicate handlers harmless,
 * but we skip re-registration to avoid wasteful double DB lookups).
 */
export function registerLifecyclePushHandlers(): void {
  if (registered) return
  registered = true

  for (const event of LIFECYCLE_EVENTS) {
    EventBus.on(event, async (payload) => {
      try {
        await handleLifecycleEvent(payload)
      } catch (err) {
        // Never let a push handler failure bubble — the EventBus already
        // logs handler rejections, but we double-catch here to be safe.
        console.error(`[lifecycle-push] handler for "${event}" threw:`, err)
      }
    })
  }

  console.info(`[lifecycle-push] Registered handlers for ${LIFECYCLE_EVENTS.length} lifecycle events`)
}

/**
 * Test helper: dispatch a lifecycle push for a specific event + payload WITHOUT
 * going through the EventBus. Used by the push test endpoint and by automated
 * verification scripts to confirm the dispatcher wiring is correct.
 */
export async function dispatchLifecyclePush(
  event: ServiceEvent,
  data: Record<string, any>,
  context?: { tenantId?: string; workspaceId?: string },
): Promise<{ dispatched: boolean; recipients: number }> {
  const payload: EventPayload = {
    event,
    timestamp: new Date().toISOString(),
    tenantId: context?.tenantId,
    workspaceId: context?.workspaceId,
    data,
    metadata: {},
  }
  // Snapshot recipient count before dispatch (for the return value).
  const tenantId = await resolveTenantId(context?.tenantId || data.tenantId || context?.workspaceId || data.workspaceId)
  let recipients = 0
  if (tenantId) {
    const owners = await resolveOwnerRecipients(tenantId)
    recipients += owners.length
  }
  await handleLifecycleEvent(payload)
  return { dispatched: true, recipients }
}
