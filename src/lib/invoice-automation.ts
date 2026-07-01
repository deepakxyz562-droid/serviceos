/**
 * Invoice Automation
 * ───────────────────
 * Enterprise invoice workflow engine for ServiceOS.
 *
 * Supports the four invoice creation methods requested:
 *   1. Manual           — manager creates from the Invoices page
 *   2. Automatic        — workflow triggers (job.completed, booking.confirmed, etc.)
 *   3. Approval Required — created in "pending_approval" status for manager review
 *   4. Recurring        — schedule-based generation (AMC / subscriptions)
 *
 * Plus actions usable from workflows or the UI:
 *   - create_invoice (from job / booking / standalone)
 *   - create_deposit_invoice (advance payment on booking)
 *   - create_recurring_invoice (AMC / monthly)
 *   - send_invoice (email + WhatsApp)
 *   - mark_paid
 *   - send_reminder
 *
 * Settings live in `tenant.settingsJson.invoiceAutomation`.
 */

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email-send'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { getExchangeRate, convertCurrency } from '@/lib/currency'
import { notifyOwner } from '@/lib/owner-notifications'

// ─── Settings ────────────────────────────────────────────────────────────────

export interface InvoiceAutomationSettings {
  /** Auto-create invoice when a job is marked complete */
  autoCreateOnJobComplete: boolean
  /** Auto-email the invoice when it's created */
  autoSendEmail: boolean
  /** Auto-send a WhatsApp copy when the invoice is created */
  autoSendWhatsApp: boolean
  /** Create a deposit/advance invoice when a booking is confirmed */
  createDepositOnBooking: boolean
  /** Deposit percentage (e.g. 30 = 30%) */
  depositPercentage: number
  /** Enable recurring invoice schedules */
  enableRecurring: boolean
  /** Default tax % applied to auto-invoices */
  defaultTaxPercent: number
  /** Invoice creation method: manual | automatic | approval_required | recurring */
  creationMethod: 'manual' | 'automatic' | 'approval_required' | 'recurring'
  /** Number of days from creation until an invoice is due */
  defaultDueDays: number
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceAutomationSettings = {
  // Auto-create an invoice the moment a job is marked complete — core ServiceOS
  // value proposition. Tenants can turn this off from the invoice settings dialog.
  autoCreateOnJobComplete: true,
  // Auto-email the invoice to the customer immediately after creation. Email
  // delivery failures are non-fatal (the invoice is still created as 'draft'
  // and only flipped to 'sent' when the email succeeds).
  autoSendEmail: true,
  autoSendWhatsApp: false,
  createDepositOnBooking: false,
  depositPercentage: 30,
  enableRecurring: false,
  defaultTaxPercent: 0,
  creationMethod: 'automatic',
  defaultDueDays: 15,
}

function safeParse(str: string | null | undefined, fallback: unknown = {}): unknown {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

/**
 * Read invoice automation settings for a tenant.
 */
export async function getInvoiceSettings(tenantId: string | null | undefined): Promise<InvoiceAutomationSettings> {
  if (!tenantId) return { ...DEFAULT_INVOICE_SETTINGS }
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true, currency: true },
    })
    if (!tenant) return { ...DEFAULT_INVOICE_SETTINGS }
    const settings = safeParse(tenant.settingsJson, {}) as Record<string, unknown>
    const inv = (settings.invoiceAutomation as Record<string, unknown> | undefined) || {}
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...inv,
    } as InvoiceAutomationSettings
  } catch {
    return { ...DEFAULT_INVOICE_SETTINGS }
  }
}

/**
 * Persist invoice automation settings for a tenant.
 */
export async function saveInvoiceSettings(tenantId: string, patch: Partial<InvoiceAutomationSettings>): Promise<InvoiceAutomationSettings> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  })
  const current = safeParse(tenant?.settingsJson, {}) as Record<string, unknown>
  const merged: InvoiceAutomationSettings = {
    ...(DEFAULT_INVOICE_SETTINGS),
    ...((current.invoiceAutomation as Record<string, unknown>) || {}),
    ...patch,
  }
  const nextSettings = { ...current, invoiceAutomation: merged }
  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(nextSettings) },
  })
  return merged
}

// ─── Number generation ───────────────────────────────────────────────────────

export async function generateInvoiceNumber(tenantId: string | null): Promise<string> {
  // The `number` field is GLOBALLY unique (not per-tenant), so we must avoid
  // collisions with invoices from other tenants. We try a sequential per-tenant
  // number first, then fall back to a timestamp-suffixed number on collision.
  const prefix = 'INV'
  const where = tenantId ? { tenantId } : {}
  const count = await db.invoice.count({ where })
  const sequential = `${prefix}-${String(count + 1).padStart(4, '0')}`

  // Check if the sequential number is already taken (by another tenant)
  const existing = await db.invoice.findUnique({ where: { number: sequential } })
  if (!existing) return sequential

  // Collision — append a short timestamp suffix to guarantee uniqueness.
  // Use a counter too so two rapid collisions in the same millisecond differ.
  const suffix = Date.now().toString(36).toUpperCase().slice(-5)
  const counter = Math.floor(Math.random() * 36).toString(36).toUpperCase()
  return `${prefix}-${String(count + 1).padStart(4, '0')}-${suffix}${counter}`
}

// ─── Currency helpers ────────────────────────────────────────────────────────

async function resolveCurrency(tenantId: string | null | undefined): Promise<{ base: string; rate: (tx: string) => number }> {
  let base = 'USD'
  if (tenantId) {
    try {
      const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } })
      if (t?.currency) base = t.currency
    } catch { /* ignore */ }
  }
  return {
    base,
    rate: (tx: string) => (tx === base ? 1 : getExchangeRate(tx, base)),
  }
}

// ─── Core: create invoice from a completed job ───────────────────────────────

export interface AutoInvoiceResult {
  success: boolean
  invoiceId?: string
  number?: string
  total?: number
  error?: string
  skipped?: boolean
  reason?: string
  /** True when the invoice was created but the auto-send (email/WhatsApp) failed. */
  sendFailed?: boolean
  /** Aggregated error message from the failed auto-send. */
  sendError?: string
  /** The per-channel send result (email + WhatsApp). */
  sendResult?: { email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean } }
}

/**
 * In-memory per-job lock that prevents two concurrent requests from both
 * passing the "no invoice exists yet" check and creating duplicate invoices.
 *
 * This handles the race between:
 *   - POST /api/jobs/lifecycle { action: 'complete' }  → fireAndForget(autoCreateInvoiceFromJob)
 *   - POST /api/jobs/[id]/complete-proof               → COD invoice creation
 *
 * Both paths call this lock before checking/creating. On a multi-server
 * deployment a distributed lock (Redis SETNX etc.) would be needed, but
 * ServiceOS runs as a single Next.js process so this is sufficient.
 */
const _invoiceLockForJob = new Map<string, Promise<AutoInvoiceResult>>()

async function withJobInvoiceLock<T extends AutoInvoiceResult>(
  jobId: string,
  fn: () => Promise<T>,
): Promise<T> {
  // If another request is already creating an invoice for this job, wait for
  // it to finish and return its result (the caller will then see `skipped`
  // because the invoice now exists).
  const existing = _invoiceLockForJob.get(jobId)
  if (existing) {
    return existing as Promise<T>
  }
  const p = (async () => {
    try {
      return await fn()
    } finally {
      // Clear the lock once the operation completes (success or failure).
      // Use a microtask delay so concurrent callers that started while we
      // were running still see the lock and join our promise.
      queueMicrotask(() => _invoiceLockForJob.delete(jobId))
    }
  })()
  _invoiceLockForJob.set(jobId, p)
  return p as Promise<T>
}

/**
 * Resolve the monetary value of a job using a sensible fallback chain.
 * Used by auto-invoice so the invoice amount reflects
 * REAL data instead of a hard-coded $50/hr rate.
 *
 * Priority:
 *   1. job.quotedAmount   — explicitly agreed price (set on Create Job form,
 *                           OR carried over from lead.value during conversion)
 *   2. job.amountCollected — COD payment already collected by the technician
 *   3. Lead.value         — if the job was converted from a lead (an explicit
 *                           negotiated quote beats the generic catalog price)
 *   4. Service.basePrice  — the linked service catalog entry's default price
 *   5. estimatedDuration × DEFAULT_HOURLY_RATE  — last-resort fallback
 *
 * NOTE: Lead.value is checked BEFORE Service.basePrice. A lead's value is an
 * explicitly negotiated quote between the business and the customer, while a
 * Service.basePrice is just a catalog default. If a lead was converted before
 * the quotedAmount carry-over fix was deployed (so job.quotedAmount is null),
 * the lead's value should still win over the service catalog price — that is
 * the amount the customer actually agreed to pay.
 */
const DEFAULT_HOURLY_RATE = 50
export async function resolveJobAmount(job: {
  quotedAmount?: number | null
  amountCollected?: number | null
  serviceId?: string | null
  estimatedDuration?: number | null
  id: string
}): Promise<{ amount: number; source: string }> {
  // 1. Explicitly quoted amount (set on the job, or carried from lead.value)
  if (job.quotedAmount && job.quotedAmount > 0) {
    return { amount: job.quotedAmount, source: 'quoted_amount' }
  }
  // 2. COD amount already collected
  if (job.amountCollected && job.amountCollected > 0) {
    return { amount: job.amountCollected, source: 'cod_collected' }
  }
  // 3. Lead value (if this job was converted from a lead) — explicit
  //    negotiated quote beats the generic service catalog price.
  try {
    const lead = await db.lead.findFirst({
      where: { jobId: job.id },
      select: { value: true },
    })
    if (lead && lead.value > 0) {
      return { amount: lead.value, source: 'lead_value' }
    }
  } catch { /* ignore — fall through */ }
  // 4. Service catalog base price
  if (job.serviceId) {
    try {
      const svc = await db.service.findUnique({
        where: { id: job.serviceId },
        select: { basePrice: true, name: true },
      })
      if (svc && svc.basePrice > 0) {
        return { amount: svc.basePrice, source: 'service_base_price' }
      }
    } catch { /* ignore — fall through */ }
  }
  // 5. Last resort: estimated duration × default hourly rate
  if (job.estimatedDuration && job.estimatedDuration > 0) {
    return {
      amount: Math.round((job.estimatedDuration / 60) * DEFAULT_HOURLY_RATE),
      source: 'estimated_duration_fallback',
    }
  }
  // Absolute fallback
  return { amount: DEFAULT_HOURLY_RATE, source: 'default_flat' }
}

/**
 * Auto-create an invoice from a completed job.
 * - Wrapped in a per-job lock to prevent duplicate invoices from concurrent
 *   requests (e.g. lifecycle complete + complete-proof running at the same
 *   time, or the user double-clicking "Complete").
 * - Skips if an invoice already exists for the job.
 * - Uses resolveJobAmount() so the invoice amount reflects REAL data
 *   (quotedAmount → amountCollected → Service.basePrice → Lead.value →
 *    estimatedDuration × rate) instead of a hard-coded $50/hr.
 * - Honors the tenant's defaultTaxPercent and defaultDueDays.
 */
export async function autoCreateInvoiceFromJob(jobId: string): Promise<AutoInvoiceResult> {
  return withJobInvoiceLock(jobId, async () => {
    try {
      const job = await db.job.findUnique({
        where: { id: jobId },
        include: { customer: true },
      })
      if (!job) return { success: false, error: 'Job not found' }

      // Resolve tenant: job.workspaceId is a Workspace ID (not a Tenant ID), so
      // look up the Workspace to get its tenantId. Fall back to the first tenant.
      let tenantId: string | null = null
      if (job.workspaceId) {
        try {
          const ws = await db.workspace.findUnique({
            where: { id: job.workspaceId },
            select: { tenantId: true },
          })
          tenantId = ws?.tenantId || null
        } catch { /* ignore */ }
      }
      if (!tenantId) {
        // Last resort: first tenant
        try {
          const t = await db.tenant.findFirst({ select: { id: true } })
          tenantId = t?.id || null
        } catch { /* ignore */ }
      }
      if (!tenantId) return { success: false, error: 'No tenant for job' }

      const settings = await getInvoiceSettings(tenantId)

      // ── Respect the "Auto Create Invoice on Job Completion" toggle ──
      // The settings dialog exposes this switch; without this check, invoices were
      // being created on EVERY job completion regardless of the toggle value.
      if (!settings.autoCreateOnJobComplete) {
        return { success: false, skipped: true, reason: 'autoCreateOnJobComplete is disabled' }
      }

      // Idempotency: skip if an invoice already exists for this job (re-check
      // inside the lock so concurrent callers see the invoice the first one
      // created and bail out).
      const existing = await db.invoice.findFirst({ where: { jobId } })
      if (existing) {
        return { success: false, skipped: true, reason: 'Invoice already exists for this job', invoiceId: existing.id, number: existing.number }
      }

      // Need a customer to invoice — accept customerId, customerPhone, OR
      // customerName (previously only id/phone were accepted, which caused
      // invoices to be silently skipped for jobs that only had a name).
      if (!job.customerId && !job.customerPhone && !job.customerName) {
        return { success: false, skipped: true, reason: 'Job has no customer to invoice' }
      }

      // ── Ensure the invoice has a linked Customer record ──────────────
      // sendInvoice() resolves the recipient from `invoice.customer` (the
      // linked Customer row), falling back to `invoice.job.customerEmail/Phone`.
      // If the job was created directly (not from a lead) the user may have
      // typed customerName/Phone/Email on the form WITHOUT selecting an
      // existing Customer — so job.customerId is null.
      //
      // PREVIOUS BUG: The find-or-create block was gated on
      //   `(job.customerPhone || job.customerEmail) && job.workspaceId`
      // which meant jobs with ONLY customerName (no phone/email), OR jobs
      // with no workspaceId, produced invoices with customerId=null. If the
      // job also lacked customerEmail/customerPhone, sendInvoice() had no
      // recipient at all → both channels returned success:false → invoice
      // stayed in 'draft' and could not be sent even manually.
      //
      // FIX: Always try to find-or-create a Customer when there's ANY
      // customer identifier (name, phone, email, or existing customerId).
      // If the job has no workspaceId, resolve one from the tenant's first
      // workspace. This ensures the invoice is always linked to a Customer
      // row, and sendInvoice() can resolve recipients from it.
      let invoiceCustomerId = job.customerId || null
      if (!invoiceCustomerId && (job.customerName || job.customerPhone || job.customerEmail)) {
        try {
          // Resolve a workspaceId — prefer the job's, else first workspace
          // for the tenant. Customer.workspaceId is required by the schema.
          let customerWorkspaceId = job.workspaceId
          if (!customerWorkspaceId && tenantId) {
            const firstWs = await db.workspace.findFirst({
              where: { tenantId },
              select: { id: true },
            })
            customerWorkspaceId = firstWs?.id || null
          }
          if (customerWorkspaceId) {
            // Find by phone (most unique), then by email, then by name
            const existingCustomer = await db.customer.findFirst({
              where: {
                OR: [
                  ...(job.customerPhone ? [{ phone: job.customerPhone }] : []),
                  ...(job.customerEmail ? [{ email: job.customerEmail }] : []),
                  ...(job.customerName ? [{ name: job.customerName }] : []),
                ],
                workspaceId: customerWorkspaceId,
              },
            })
            if (existingCustomer) {
              invoiceCustomerId = existingCustomer.id
              // Backfill missing contact info on the Customer from the job
              // (e.g. the Customer existed with only a name, but the job
              // captured a phone/email — enrich the Customer record).
              const needsUpdate =
                (job.customerPhone && !existingCustomer.phone) ||
                (job.customerEmail && !existingCustomer.email)
              if (needsUpdate) {
                try {
                  await db.customer.update({
                    where: { id: existingCustomer.id },
                    data: {
                      ...(job.customerPhone && !existingCustomer.phone ? { phone: job.customerPhone } : {}),
                      ...(job.customerEmail && !existingCustomer.email ? { email: job.customerEmail } : {}),
                    },
                  })
                } catch { /* non-critical enrichment */ }
              }
            } else {
              // Create a Customer from the job's customer fields.
              // NOTE: Customer.phone is a non-nullable String in the Prisma
              // schema, so we use '' (empty string) instead of null when the
              // job has no phone. Using null here previously caused a
              // PrismaClientValidationError that was silently caught, leaving
              // the invoice with customerId=null.
              const created = await db.customer.create({
                data: {
                  name: job.customerName || 'Unknown Customer',
                  phone: job.customerPhone || '',
                  email: job.customerEmail || null,
                  workspaceId: customerWorkspaceId,
                },
              })
              invoiceCustomerId = created.id
            }
            // Link the job to this customer for future reference
            if (invoiceCustomerId && invoiceCustomerId !== job.customerId) {
              try {
                await db.job.update({ where: { id: jobId }, data: { customerId: invoiceCustomerId } })
              } catch { /* non-critical */ }
            }
          }
        } catch (e) {
          console.error('[InvoiceAutomation] find-or-create customer error:', e)
          // Non-fatal — proceed with null customerId. sendInvoice() will
          // still try to fall back to job.customerEmail/customerPhone.
        }
      }

      const { base, rate } = await resolveCurrency(tenantId)
      const taxPercent = settings.defaultTaxPercent || 0

      // ── Resolve the REAL invoice amount (Bug 3 fix) ──
      // Uses quotedAmount → amountCollected → Service.basePrice → Lead.value
      // → estimatedDuration × rate, instead of a hard-coded $50/hr.
      const { amount: resolvedAmount, source: amountSource } = await resolveJobAmount(job)

      // Build a single line item for the job
      const lineItem = {
        description: job.title || `Job #${job.jobNumber || job.id.slice(-6)}`,
        quantity: 1,
        rate: resolvedAmount,
        notes: job.description || '',
      }
      const items = [lineItem]
      const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0)
      const tax = subtotal * (taxPercent / 100)
      const total = subtotal + tax

      const number = await generateInvoiceNumber(tenantId)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (settings.defaultDueDays || 15))

      // If COD payment was already collected, mark the invoice as 'paid'.
      const isCodPaid = !!(job.amountCollected && job.amountCollected > 0)
      const status = isCodPaid
        ? 'paid'
        : (settings.creationMethod === 'approval_required' ? 'pending_approval' : 'draft')

      // Resolve the recipient email/phone for logging purposes. sendInvoice()
      // does its own resolution (customer.email → job.customerEmail), but we
      // compute a rough check here so we can log a clear warning when the
      // send fails due to a missing recipient.
      const recipientEmailFromJob = !!(job.customerEmail)
      const recipientPhoneFromJob = !!(job.customerPhone)

      const invoice = await db.invoice.create({
        data: {
          number,
          tenantId,
          jobId,
          customerId: invoiceCustomerId,
          employeeId: job.assigneeId || null,
          amount: subtotal,
          tax,
          discount: 0,
          total,
          currency: base,
          exchangeRate: rate(base),
          baseCurrency: base,
          baseAmount: total,
          status,
          invoiceType: 'job_completion',
          dueDate,
          paidAt: isCodPaid ? new Date() : null,
          itemsJson: JSON.stringify(items),
          notes: `Auto-created from completed job #${job.jobNumber || job.id.slice(-6)} (amount source: ${amountSource})`,
        },
      })

      // Auto-send (email + WhatsApp) if enabled and not already paid (COD
      // invoices are handed over in person, no need to email).
      //
      // We capture the send result and log a WARNING if it failed, so the
      // fire-and-forget caller (job lifecycle) records WHY the invoice
      // stayed in 'draft'. Previously the result was awaited but never
      // inspected, so send failures were silently swallowed and the user
      // saw a draft invoice with no indication that sending was attempted
      // and failed.
      let sendResult: { email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean } } | undefined
      let sendFailed = false
      let sendError: string | undefined
      if (!isCodPaid && (settings.autoSendEmail || settings.autoSendWhatsApp)) {
        try {
          sendResult = await sendInvoice(invoice.id, {
            sendEmail: settings.autoSendEmail,
            sendWhatsApp: settings.autoSendWhatsApp,
          })
          // Check if all attempted channels failed
          const channels = [sendResult?.email, sendResult?.whatsapp].filter(Boolean) as { success: boolean; error?: string }[]
          const anySuccess = channels.some((c) => c.success)
          if (channels.length > 0 && !anySuccess) {
            sendFailed = true
            const errors = channels.map((c) => c.error).filter(Boolean)
            sendError = errors.join('; ')
            console.warn(
              `[InvoiceAutomation] Auto-created invoice ${invoice.number} but SEND FAILED: ${sendError}. ` +
              `Invoice remains in 'draft'. Recipient email: ${recipientEmailFromJob ? 'yes' : 'no'}, phone: ${recipientPhoneFromJob ? 'yes' : 'no'}. ` +
              `Link a Customer with email/phone or edit the invoice to add recipient info, then click Send.`
            )
          } else if (sendResult?.email?.simulated || sendResult?.whatsapp?.simulated) {
            console.log(`[InvoiceAutomation] Auto-created invoice ${invoice.number} — send SIMULATED (no provider configured).`)
          }
        } catch (sendErr) {
          sendFailed = true
          sendError = String(sendErr)
          console.warn(`[InvoiceAutomation] Auto-created invoice ${invoice.number} but sendInvoice() threw: ${sendError}`)
        }
      }

      console.log(`[InvoiceAutomation] Auto-created invoice ${invoice.number} for job ${jobId} (amount: ${resolvedAmount} via ${amountSource}, status: ${status}, sendFailed: ${sendFailed})`)
      return { success: true, invoiceId: invoice.id, number: invoice.number, total: invoice.total, sendFailed, sendError, sendResult }
    } catch (err) {
      console.error('[InvoiceAutomation] autoCreateInvoiceFromJob error:', err)
      return { success: false, error: String(err) }
    }
  })
}

// ─── Core: create deposit invoice from a booking ─────────────────────────────

export async function createDepositInvoiceFromBooking(bookingId: string, percentage?: number): Promise<AutoInvoiceResult> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
    })
    if (!booking) return { success: false, error: 'Booking not found' }

    const tenantId = booking.tenantId
    if (!tenantId) return { success: false, error: 'Booking has no tenant' }

    const settings = await getInvoiceSettings(tenantId)
    const pct = percentage ?? settings.depositPercentage ?? 30

    // Estimate the booking value from the linked service (if any)
    let servicePrice = 0
    if (booking.serviceId) {
      try {
        const svc = await db.service.findUnique({ where: { id: booking.serviceId }, select: { basePrice: true, name: true } })
        if (svc?.basePrice) servicePrice = Number(svc.basePrice)
      } catch { /* ignore */ }
    }
    const depositAmount = servicePrice > 0 ? Math.round(servicePrice * (pct / 100)) : 0

    if (depositAmount <= 0) {
      return { success: false, skipped: true, reason: 'No service price to compute deposit' }
    }

    const { base, rate } = await resolveCurrency(tenantId)
    const number = await generateInvoiceNumber(tenantId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (settings.defaultDueDays || 15))

    const items = [{
      description: `Deposit (${pct}%) for: ${booking.title}`,
      quantity: 1,
      rate: depositAmount,
      notes: `Advance payment for booking scheduled at ${booking.scheduledAt?.toISOString() || 'TBD'}`,
    }]
    const subtotal = depositAmount
    const tax = subtotal * ((settings.defaultTaxPercent || 0) / 100)
    const total = subtotal + tax

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId,
        bookingId: booking.id,
        customerId: booking.customerId || null,
        amount: subtotal,
        tax,
        discount: 0,
        total,
        currency: base,
        exchangeRate: rate(base),
        baseCurrency: base,
        baseAmount: total,
        status: 'sent',
        invoiceType: 'deposit',
        sentAt: new Date(),
        dueDate,
        itemsJson: JSON.stringify(items),
        notes: `Deposit invoice for booking ${booking.title}`,
      },
    })

    // Auto-send the deposit invoice if those toggles are on
    if (settings.autoSendEmail || settings.autoSendWhatsApp) {
      try {
        await sendInvoice(invoice.id, {
          sendEmail: settings.autoSendEmail,
          sendWhatsApp: settings.autoSendWhatsApp,
        })
      } catch (sendErr) {
        console.error('[InvoiceAutomation] deposit sendInvoice error:', sendErr)
      }
    }

    return { success: true, invoiceId: invoice.id, number: invoice.number, total: invoice.total }
  } catch (err) {
    console.error('[InvoiceAutomation] createDepositInvoiceFromBooking error:', err)
    return { success: false, error: String(err) }
  }
}

// ─── Core: send invoice (email + WhatsApp) ───────────────────────────────────

export interface SendInvoiceOptions {
  sendEmail?: boolean
  sendWhatsApp?: boolean
}

export async function sendInvoice(invoiceId: string, opts: SendInvoiceOptions = { sendEmail: true, sendWhatsApp: true }): Promise<{ email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean } }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, tenant: true, job: true },
  })
  if (!invoice) return { email: { success: false, error: 'Invoice not found' } }

  const result: { email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean } } = {}

  // Build a compact text summary
  const rawItems = safeParse(invoice.itemsJson, []) as Array<{ description: string; quantity: number; rate: number; unitPrice: number; amount: number }> | { items?: Array<{ description: string; quantity: number; rate: number; unitPrice: number; amount: number }> }
  // itemsJson may be a flat array OR a wrapper like {items: [...], breakdown: {...}}
  const items = Array.isArray(rawItems) ? rawItems : (rawItems?.items || [])
  const itemsText = items.map((it, i) => `${i + 1}. ${it.description} ×${it.quantity} = $${((it.rate || it.unitPrice || 0) * it.quantity).toFixed(2)}`).join('\n')
  const customerName = invoice.customer?.name || invoice.job?.customerName || 'Customer'
  const invoiceTotal = `$${Number(invoice.total).toFixed(2)} ${invoice.currency}`

  // ── Resolve recipient email & phone ──────────────────────────────
  // Prefer the linked Customer record; fall back to the job's customer
  // fields (for invoices where no Customer row exists). This ensures the
  // send flow has a recipient even for direct-created jobs that were
  // completed before the find-or-create-customer fix was deployed.
  const recipientEmail = invoice.customer?.email || invoice.job?.customerEmail || null
  const recipientPhone = invoice.customer?.phone || invoice.job?.customerPhone || null

  // Log a clear warning when there's no recipient at all — this is the #1
  // cause of "invoice stuck in draft" reports. The per-channel errors
  // below will also be returned to the caller, but this console.warn
  // makes the issue immediately visible in server logs.
  if (!recipientEmail && !recipientPhone && (opts.sendEmail || opts.sendWhatsApp)) {
    console.warn(
      `[InvoiceAutomation] sendInvoice(${invoice.number}): no recipient email AND no recipient phone. ` +
      `customerId=${invoice.customerId || 'null'}, job.customerEmail=${invoice.job?.customerEmail || 'null'}, ` +
      `job.customerPhone=${invoice.job?.customerPhone || 'null'}. ` +
      `Invoice will remain in 'draft'. Link a Customer with contact info or edit the invoice.`
    )
  }

  // ─── Email ─────────────────────────────────────────────────────
  if (opts.sendEmail && recipientEmail) {
    const subject = `Invoice ${invoice.number} from ${invoice.tenant?.name || 'ServiceOS'}`
    const html = [
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">`,
      `<h2 style="color: #0f172a;">Invoice ${invoice.number}</h2>`,
      `<p>Hi ${customerName},</p>`,
      `<p>Please find your invoice below. Thank you for your business!</p>`,
      `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">`,
      `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Invoice #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${invoice.number}</td></tr>`,
      `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Total Due</td><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700; color: #059669;">${invoiceTotal}</td></tr>`,
      invoice.dueDate ? `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Due Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(invoice.dueDate).toLocaleDateString()}</td></tr>` : '',
      `</table>`,
      `<h3 style="margin-top: 24px;">Line Items</h3>`,
      `<pre style="background: #f9fafb; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${itemsText || 'No items'}</pre>`,
      invoice.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${invoice.notes}</p>` : '',
      `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`,
      `<p style="font-size: 12px; color: #9ca3af;">— Sent from ${invoice.tenant?.name || 'ServiceOS'}</p>`,
      `</div>`,
    ].filter(Boolean).join('\n')
    const text = `Invoice ${invoice.number}\nTotal: ${invoiceTotal}\nDue: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}\n\nItems:\n${itemsText}\n\n— ${invoice.tenant?.name || 'ServiceOS'}`
    try {
      const r = await sendEmail({ to: recipientEmail, subject, html, text, usageType: 'transactional' })
      result.email = { success: !!r.success, error: r.error, simulated: r.simulated }
    } catch (err) {
      result.email = { success: false, error: String(err) }
    }
  } else if (opts.sendEmail) {
    result.email = { success: false, error: 'Customer has no email address' }
  }

  // ─── WhatsApp ──────────────────────────────────────────────────
  if (opts.sendWhatsApp && recipientPhone) {
    const waMessage = [
      `🧾 *Invoice ${invoice.number}*`,
      '',
      `Hi ${customerName}, your invoice from ${invoice.tenant?.name || 'ServiceOS'}:`,
      '',
      `*Total:* ${invoiceTotal}`,
      invoice.dueDate ? `*Due:* ${new Date(invoice.dueDate).toLocaleDateString()}` : '',
      '',
      '*Line Items:*',
      itemsText || 'No items',
      '',
      'Thank you for your business!',
    ].filter(Boolean).join('\n')
    try {
      const r = await sendWhatsAppMessage({ to: recipientPhone, message: waMessage })
      result.whatsapp = { success: !!r.success, error: r.error, simulated: r.simulated }
    } catch (err) {
      result.whatsapp = { success: false, error: String(err) }
    }
  } else if (opts.sendWhatsApp) {
    result.whatsapp = { success: false, error: 'Customer has no phone number' }
  }

  // ── Flip invoice status to 'sent' if ANY channel succeeded ────
  // PREVIOUS BUG: The status flip was only inside the email success block,
  // so when email had no recipient but WhatsApp succeeded, the invoice
  // stayed in 'draft' even though WhatsApp was delivered. Now we check
  // both channels after both have run.
  const anyChannelSuccess =
    (result.email?.success === true) || (result.whatsapp?.success === true)
  if (anyChannelSuccess && invoice.status === 'draft') {
    try {
      await db.invoice.update({ where: { id: invoiceId }, data: { status: 'sent', sentAt: new Date() } })
    } catch (err) {
      console.error(`[InvoiceAutomation] sendInvoice(${invoice.number}): failed to flip status to 'sent':`, err)
    }
  }

  return result
}

// ─── Core: mark invoice paid ─────────────────────────────────────────────────

export async function markInvoicePaid(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, tenant: true },
    })
    if (!invoice) return { success: false, error: 'Invoice not found' }
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
    })

    // ─── Send WhatsApp payment confirmation to customer ──────────
    try {
      const customerPhone = invoice.customer?.phone || invoice.customerPhone
      if (customerPhone) {
        const { sendJobNotification } = await import('@/lib/whatsapp-notifications')
        const invoiceNumber = invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase()
        const total = `${invoice.currency || 'USD'} ${Number(invoice.total).toFixed(2)}`
        const message = [
          '✅ Payment Confirmed',
          '',
          `Thank you, ${invoice.customer?.name || 'Customer'}!`,
          `We've received your payment of ${total} for invoice #${invoiceNumber}.`,
          '',
          '🎉 Payment confirmed!',
        ].join('\n')

        await sendJobNotification({
          to: customerPhone,
          message,
          recipientName: invoice.customer?.name,
          recipientRole: 'customer',
          subject: `Payment Confirmed: #${invoiceNumber}`,
          tenantId: invoice.tenantId || undefined,
        })
      }
    } catch (notifyErr) {
      console.error('[InvoiceAutomation] Payment confirmation WhatsApp failed:', notifyErr)
    }

    // ─── Emit payment.received event ─────────────────────────────
    try {
      const { EventBus } = await import('@/lib/event-bus')
      await EventBus.emit('payment.received', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.total),
        currency: invoice.currency,
        customerId: invoice.customerId,
        customerName: invoice.customer?.name,
        tenantId: invoice.tenantId,
        resourceType: 'invoice',
        resourceId: invoice.id,
      }, { tenantId: invoice.tenantId || undefined })
    } catch (eventErr) {
      console.error('[InvoiceAutomation] payment.received event failed:', eventErr)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Core: send reminder ─────────────────────────────────────────────────────

export async function sendInvoiceReminder(invoiceId: string): Promise<{ success: boolean; error?: string; email?: boolean; whatsapp?: boolean }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, tenant: true },
  })
  if (!invoice) return { success: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { success: false, error: 'Invoice already paid' }

  const customerName = invoice.customer?.name || 'Customer'
  const invoiceTotal = `$${Number(invoice.total).toFixed(2)} ${invoice.currency}`
  let emailSent = false
  let whatsappSent = false

  if (invoice.customer?.email) {
    try {
      await sendEmail({
        to: invoice.customer.email,
        subject: `Reminder: Invoice ${invoice.number} is due`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Payment Reminder</h2><p>Hi ${customerName},</p><p>This is a friendly reminder that invoice <strong>${invoice.number}</strong> for <strong>${invoiceTotal}</strong> ${invoice.dueDate ? `is due on ${new Date(invoice.dueDate).toLocaleDateString()}` : 'is now due'}.</p><p>Please complete payment at your earliest convenience.</p><p>— ${invoice.tenant?.name || 'ServiceOS'}</p></div>`,
        text: `Reminder: Invoice ${invoice.number} for ${invoiceTotal} is due. Please complete payment.\n\n— ${invoice.tenant?.name || 'ServiceOS'}`,
        usageType: 'transactional',
      })
      emailSent = true
    } catch (err) {
      console.error('[InvoiceAutomation] reminder email failed:', err)
    }
  }

  if (invoice.customer?.phone) {
    try {
      await sendWhatsAppMessage({
        to: invoice.customer.phone,
        message: `Friendly reminder: Your invoice ${invoice.number} for ${invoiceTotal} ${invoice.dueDate ? `(due ${new Date(invoice.dueDate).toLocaleDateString()})` : 'is now due'}. Please complete payment. Thank you! — ${invoice.tenant?.name || 'ServiceOS'}`,
      })
      whatsappSent = true
    } catch (err) {
      console.error('[InvoiceAutomation] reminder WhatsApp failed:', err)
    }
  }

  return { success: emailSent || whatsappSent, email: emailSent, whatsapp: whatsappSent }
}

// ─── Core: approve a pending_approval invoice ────────────────────────────────
// Used by the "Approval Required" creation method: a manager reviews the
// pending_approval invoice and approves it, which flips it to "sent" and
// emails + WhatsApps the customer.

export async function approveInvoice(invoiceId: string): Promise<{ success: boolean; error?: string; invoiceId?: string; number?: string; sendResult?: { email?: { success: boolean; simulated?: boolean; error?: string }; whatsapp?: { success: boolean; simulated?: boolean; error?: string } } }> {
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return { success: false, error: 'Invoice not found' }
    if (invoice.status !== 'pending_approval') {
      return { success: false, error: `Invoice is not pending approval (current status: ${invoice.status})` }
    }
    // Flip to 'sent' and stamp sentAt
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'sent', sentAt: new Date() },
    })
    // Send to customer via email + WhatsApp — capture the result so the
    // caller (API → UI) can surface a "simulated" notice when no real
    // provider is configured. Without this, the UI would claim "Invoice
    // approved and sent to customer" even when the send was simulated.
    let sendResult: { email?: { success: boolean; simulated?: boolean; error?: string }; whatsapp?: { success: boolean; simulated?: boolean; error?: string } } | undefined
    try {
      sendResult = await sendInvoice(invoiceId, { sendEmail: true, sendWhatsApp: true })
    } catch (sendErr) {
      console.error('[InvoiceAutomation] approveInvoice send error:', sendErr)
    }
    return { success: true, invoiceId, number: invoice.number, sendResult }
  } catch (err) {
    console.error('[InvoiceAutomation] approveInvoice error:', err)
    return { success: false, error: String(err) }
  }
}

// ─── Core: recurring invoice schedules ───────────────────────────────────────

export interface RecurringInvoiceInput {
  name: string
  customerId?: string | null
  jobId?: string | null
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  dayOfMonth?: number
  amount: number
  taxPercent?: number
  currency?: string
  itemsJson?: string
  notes?: string
  startDate?: string | Date
  endDate?: string | Date | null
  tenantId: string
  createdById?: string
}

/**
 * Create a recurring invoice schedule (AMC / subscription / monthly maintenance).
 * The schedule's `nextRunAt` is set to the first occurrence; the cron endpoint
 * /api/cron/recurring-invoices picks up due schedules and generates invoices.
 */
export async function createRecurringInvoiceSchedule(input: RecurringInvoiceInput): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  try {
    const frequency = input.frequency || 'monthly'
    const dayOfMonth = input.dayOfMonth || 1
    const startDate = input.startDate ? new Date(input.startDate) : new Date()

    const nextRunAt = computeNextRun(startDate, frequency, dayOfMonth)

    const schedule = await db.recurringInvoice.create({
      data: {
        name: input.name,
        tenantId: input.tenantId,
        customerId: input.customerId || null,
        jobId: input.jobId || null,
        frequency,
        dayOfMonth,
        amount: input.amount,
        taxPercent: input.taxPercent || 0,
        currency: input.currency || 'USD',
        itemsJson: input.itemsJson || JSON.stringify([{ description: input.name, quantity: 1, rate: input.amount }]),
        notes: input.notes || null,
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        nextRunAt,
        active: true,
        createdById: input.createdById || null,
      },
    })
    return { success: true, scheduleId: schedule.id }
  } catch (err) {
    console.error('[InvoiceAutomation] createRecurringInvoiceSchedule error:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Compute the next run date for a recurring schedule.
 * For monthly/quarterly/yearly: dayOfMonth of the next occurrence.
 * For weekly: the next occurrence of dayOfWeek (dayOfMonth used as 0-6).
 */
export function computeNextRun(from: Date, frequency: string, dayOfMonth: number): Date {
  const d = new Date(from)
  if (frequency === 'weekly') {
    const target = dayOfMonth % 7
    const cur = d.getDay()
    let diff = (target - cur + 7) % 7
    if (diff === 0) diff = 7 // next week if today is the day
    d.setDate(d.getDate() + diff)
    d.setHours(9, 0, 0, 0)
    return d
  }
  // monthly / quarterly / yearly
  const monthStep = frequency === 'quarterly' ? 3 : frequency === 'yearly' ? 12 : 1
  d.setDate(1)
  d.setMonth(d.getMonth() + monthStep)
  const dom = Math.min(dayOfMonth, 28) // clamp to avoid month-length issues
  d.setDate(dom)
  d.setHours(9, 0, 0, 0)
  return d
}

/**
 * Generate a single invoice from a recurring schedule (called by the cron runner).
 * - Marks the schedule's lastRunAt + lastInvoiceId + executionCount
 * - Computes the next run date
 * - Auto-sends the invoice via email + WhatsApp (recurring invoices are always sent)
 */
export async function generateRecurringInvoice(scheduleId: string): Promise<AutoInvoiceResult & { nextRunAt?: Date }> {
  try {
    const schedule = await db.recurringInvoice.findUnique({
      where: { id: scheduleId },
      include: { customer: true, tenant: true },
    })
    if (!schedule) return { success: false, error: 'Schedule not found' }
    if (!schedule.active) return { success: false, skipped: true, reason: 'Schedule inactive' }
    if (schedule.endDate && new Date() > schedule.endDate) {
      return { success: false, skipped: true, reason: 'Schedule ended' }
    }

    const settings = await getInvoiceSettings(schedule.tenantId)
    const taxPercent = schedule.taxPercent || settings.defaultTaxPercent || 0
    const subtotal = schedule.amount
    const tax = subtotal * (taxPercent / 100)
    const total = subtotal + tax

    const number = await generateInvoiceNumber(schedule.tenantId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (settings.defaultDueDays || 15))

    const items = safeParse(schedule.itemsJson, []) as Array<{ description: string; quantity: number; rate: number }>

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId: schedule.tenantId,
        customerId: schedule.customerId || null,
        jobId: schedule.jobId || null,
        recurrenceId: schedule.id,
        amount: subtotal,
        tax,
        discount: 0,
        total,
        currency: schedule.currency,
        exchangeRate: 1,
        baseCurrency: schedule.currency,
        baseAmount: total,
        status: 'sent',
        invoiceType: 'recurring',
        sentAt: new Date(),
        dueDate,
        itemsJson: JSON.stringify(items),
        notes: schedule.notes || `Recurring invoice: ${schedule.name}`,
      },
    })

    // Auto-send email + WhatsApp
    try {
      await sendInvoice(invoice.id, { sendEmail: true, sendWhatsApp: true })
    } catch (sendErr) {
      console.error('[InvoiceAutomation] recurring send error:', sendErr)
    }

    // Advance the schedule
    const nextRunAt = computeNextRun(new Date(), schedule.frequency, schedule.dayOfMonth)
    await db.recurringInvoice.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        lastInvoiceId: invoice.id,
        executionCount: { increment: 1 },
        nextRunAt,
      },
    })

    return { success: true, invoiceId: invoice.id, number: invoice.number, total: invoice.total, nextRunAt }
  } catch (err) {
    console.error('[InvoiceAutomation] generateRecurringInvoice error:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Process all due recurring invoices. Called by the /api/cron/recurring-invoices endpoint.
 * Returns a summary of generated invoices.
 */
export async function processDueRecurringInvoices(): Promise<{ processed: number; succeeded: number; failed: number; results: AutoInvoiceResult[] }> {
  const now = new Date()
  const due = await db.recurringInvoice.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    select: { id: true },
  })
  const results: AutoInvoiceResult[] = []
  let succeeded = 0
  let failed = 0
  for (const s of due) {
    const r = await generateRecurringInvoice(s.id)
    results.push(r)
    if (r.success) succeeded++
    else failed++
  }
  return { processed: due.length, succeeded, failed, results }
}

// ─── Convenience: notify owner that an auto-invoice was created ──────────────

export async function notifyOwnerInvoiceCreated(invoiceId: string): Promise<void> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    })
    if (!invoice || !invoice.tenantId) return
    await notifyOwner(invoice.tenantId, {
      eventType: 'invoice.created',
      eventLabel: 'New Invoice',
      whatsappMessage: [
        '🧾 *New Invoice Created*',
        '',
        `*Invoice #:* ${invoice.number}`,
        `*Customer:* ${invoice.customer?.name || 'N/A'}`,
        `*Amount:* $${Number(invoice.total).toFixed(2)} ${invoice.currency}`,
        invoice.dueDate ? `*Due:* ${new Date(invoice.dueDate).toLocaleDateString()}` : '',
        `*Status:* ${invoice.status}`,
      ].filter(Boolean).join('\n'),
    })
  } catch (err) {
    console.error('[InvoiceAutomation] notifyOwnerInvoiceCreated error:', err)
  }
}
