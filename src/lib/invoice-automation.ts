/**
 * Invoice Automation
 * ───────────────────
 * Enterprise invoice workflow engine for Fieseros.
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
import { Prisma } from '@prisma/client'
import { sendEmail } from '@/lib/email-send'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { sendSmsMessage } from '@/lib/sms-send'
import { getExchangeRate, convertCurrency } from '@/lib/currency'
import { notifyOwner } from '@/lib/owner-notifications'
import { issueCustomerMagicLink } from '@/lib/customer-magic-link'

// ─── ActivityLog helper (BILLING-C Step 5) ──────────────────────────────────
//
// Mirror of the `safeLogActivity` pattern used by the V1.5 job lifecycle route
// (src/app/api/jobs/[id]/lifecycle/route.ts lines 172-200). Audit logging MUST
// NEVER break the main operation — every call is wrapped in try/catch and
// failures are logged to the server console only.
//
// Why we log INSIDE the lib functions (in addition to the per-API logging in
// /api/invoices/[id]/actions/route.ts): callers like the trigger-engine and
// auto-invoice-on-complete fire-and-forget don't go through the actions API,
// so without lib-level logging those code paths leave NO audit trail. The
// action names (`invoice_mark_paid`, `invoice_send`, `invoice_reminder`,
// `invoice_approve`) are namespaced with the `invoice_` prefix so they're
// distinguishable from the API-level logs (`mark_paid`, `send_invoice`, …)
// when both fire on the same request.
async function safeLogInvoiceActivity(params: {
  tenantId: string | null | undefined
  actorId?: string | null
  actorName?: string | null
  action: string
  entityType?: string
  entityId?: string | null
  entityName?: string | null
  description: string
  metadataJson?: Record<string, unknown>
  severity?: string
}): Promise<void> {
  if (!params.tenantId) return
  try {
    await db.activityLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        actorType: params.actorId ? 'user' : 'system',
        action: params.action,
        entityType: params.entityType ?? 'invoice',
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        description: params.description,
        metadataJson: JSON.stringify(params.metadataJson ?? {}),
        severity: params.severity ?? 'info',
      },
    })
  } catch (err) {
    console.error('[InvoiceAutomation] ActivityLog write failed:', err)
  }
}

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
  // Auto-create an invoice the moment a job is marked complete — core Fieseros
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
 * Fieseros runs as a single Next.js process so this is sufficient.
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
 *
 * `opts.force` (default false) bypasses the `autoCreateOnJobComplete` toggle
 * check below. Use this when the user EXPLICITLY requested invoice creation
 * (e.g. clicking "Create Invoice" in the Billing section) — they want an
 * invoice regardless of whether auto-create-on-completion is enabled.
 * Auto-send (email/WhatsApp) is still governed by its own toggles and is NOT
 * affected by `force`.
 */
export async function autoCreateInvoiceFromJob(
  jobId: string,
  opts?: { force?: boolean },
): Promise<AutoInvoiceResult> {
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
      //
      // `opts.force` bypasses this check: callers responding to an EXPLICIT user
      // action (e.g. clicking "Create Invoice" in the Billing section, or the
      // lifecycle `generate_invoice` action) want an invoice created regardless
      // of the toggle. The toggle's purpose is to suppress the AUTO creation on
      // job completion — not to block manual creation.
      if (!opts?.force && !settings.autoCreateOnJobComplete) {
        return { success: false, skipped: true, reason: 'autoCreateOnJobComplete is disabled (use force to bypass)' }
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

      // ── BILLING-C Step 1: prefer the Job's actual line items ─────────
      // Previously this built a SINGLE summary line item with rate=resolvedAmount
      // (the quotedAmount / lead value / etc.), discarding the detailed line
      // items the user entered on the job form. That meant the invoice PDF and
      // the customer-facing email listed only "Service × 1 = $X" even when the
      // job had 5 negotiated line items.
      //
      // Now: parse `job.lineItemsJson` and use those line items when they exist
      // AND have at least one with a non-zero unitPrice. Otherwise fall back to
      // the single summary line item so behaviour is preserved for quick-create
      // jobs that only set a quotedAmount.
      interface JobLineItemShape {
        name?: string | null
        description?: string | null
        quantity?: number | string | null
        unitPrice?: number | string | null
      }
      const parsedJobLineItems = safeParse(job.lineItemsJson, []) as unknown
      const jobLineItems: JobLineItemShape[] = Array.isArray(parsedJobLineItems)
        ? (parsedJobLineItems as JobLineItemShape[]).filter((it) => it && typeof it === 'object')
        : []
      const validJobLineItems = jobLineItems.filter(
        (it) => (it.name || it.description) && Number(it.unitPrice) > 0,
      )

      let items: Array<{ description: string; quantity: number; rate: number; notes: string }>
      let amountSourceForNote = amountSource
      if (validJobLineItems.length > 0) {
        items = validJobLineItems.map((it) => ({
          description: String(it.name || it.description || 'Service'),
          quantity: Number(it.quantity) || 1,
          rate: Number(it.unitPrice) || 0,
          notes: String(it.description || ''),
        }))
        amountSourceForNote = `${amountSource}+line_items`
      } else {
        // Fall back to single summary line item using resolved amount
        items = [{
          description: job.title || `Job #${job.jobNumber || job.id.slice(-6)}`,
          quantity: 1,
          rate: resolvedAmount,
          notes: job.description || '',
        }]
      }
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
          notes: `Auto-created from completed job #${job.jobNumber || job.id.slice(-6)} (amount source: ${amountSourceForNote})`,
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
            sendSms: false, // Rule 5b: invoice creation = email only
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
          sendSms: false, // Rule 5b: invoice creation = email only
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
  /** Send an SMS via the configured SMS provider (SNS / Twilio / etc.). Defaults to true. */
  sendSms?: boolean
}

export async function sendInvoice(invoiceId: string, opts: SendInvoiceOptions = { sendEmail: true, sendWhatsApp: true, sendSms: true }): Promise<{ email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean }; sms?: { success: boolean; error?: string; simulated?: boolean } }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, tenant: true, job: true },
  })
  if (!invoice) return { email: { success: false, error: 'Invoice not found' } }

  const result: { email?: { success: boolean; error?: string; simulated?: boolean }; whatsapp?: { success: boolean; error?: string; simulated?: boolean }; sms?: { success: boolean; error?: string; simulated?: boolean } } = {}

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
    // Issue a magic-link URL so the customer can one-click into their invoice
    // on the portal. Wrapped in try/catch — the email should still send even
    // if link generation fails (some invoices may not have a customerId).
    let magicUrl: string | null = null
    if (invoice.customerId) {
      try {
        const magicLink = await issueCustomerMagicLink({
          customerId: invoice.customerId,
          redirect: `/invoices/${invoice.id}`,
        })
        magicUrl = magicLink.url
      } catch (err) {
        console.warn(
          `[InvoiceAutomation] sendInvoice(${invoice.number}): magic-link generation failed:`,
          err
        )
      }
    }

    const viewInvoiceButton = magicUrl
      ? `<div style="margin: 24px 0;"><a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Invoice</a></div>`
      : ''

    const subject = `Invoice ${invoice.number} from ${invoice.tenant?.name || 'Fieseros'}`
    const html = [
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">`,
      `<h2 style="color: #0f172a;">Invoice ${invoice.number}</h2>`,
      `<p>Hi ${customerName},</p>`,
      `<p>Please find your invoice below. Thank you for your business!</p>`,
      viewInvoiceButton,
      `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">`,
      `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Invoice #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${invoice.number}</td></tr>`,
      `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Total Due</td><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700; color: #059669;">${invoiceTotal}</td></tr>`,
      invoice.dueDate ? `<tr><td style="padding: 8px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Due Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(invoice.dueDate).toLocaleDateString()}</td></tr>` : '',
      `</table>`,
      `<h3 style="margin-top: 24px;">Line Items</h3>`,
      `<pre style="background: #f9fafb; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${itemsText || 'No items'}</pre>`,
      invoice.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${invoice.notes}</p>` : '',
      `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`,
      `<p style="font-size: 12px; color: #9ca3af;">— Sent from ${invoice.tenant?.name || 'Fieseros'}</p>`,
      `</div>`,
    ].filter(Boolean).join('\n')
    const text = `Invoice ${invoice.number}\nTotal: ${invoiceTotal}\nDue: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}\n${magicUrl ? `\nView your invoice: ${magicUrl}\n` : ''}\nItems:\n${itemsText}\n\n— ${invoice.tenant?.name || 'Fieseros'}`
    try {
      const r = await sendEmail({ to: recipientEmail, subject, html, text, usageType: 'transactional', tenantId: invoice.tenantId || undefined })
      result.email = { success: !!r.success, error: r.error, simulated: r.simulated }
    } catch (err) {
      result.email = { success: false, error: String(err) }
    }
  } else if (opts.sendEmail) {
    result.email = { success: false, error: 'Customer has no email address' }
  }

  // ─── WhatsApp ──────────────────────────────────────────────────
  // `waMagicUrl` is declared at function scope so the SMS block below can
  // reuse it (avoids issuing a second magic link when WhatsApp already got one).
  let waMagicUrl: string | null = null
  if (opts.sendWhatsApp && recipientPhone) {
    // For WhatsApp we can't render an HTML button, but if we have a magic
    // link (generated above OR re-attempted here for WhatsApp-only sends),
    // append a plain-text link so the customer can still tap into the portal.
    if (invoice.customerId) {
      try {
        const magicLink = await issueCustomerMagicLink({
          customerId: invoice.customerId,
          redirect: `/invoices/${invoice.id}`,
        })
        waMagicUrl = magicLink.url
      } catch (err) {
        console.warn(
          `[InvoiceAutomation] sendInvoice(${invoice.number}): WhatsApp magic-link generation failed:`,
          err
        )
      }
    }

    const waMessage = [
      `🧾 *Invoice ${invoice.number}*`,
      '',
      `Hi ${customerName}, your invoice from ${invoice.tenant?.name || 'Fieseros'}:`,
      '',
      `*Total:* ${invoiceTotal}`,
      invoice.dueDate ? `*Due:* ${new Date(invoice.dueDate).toLocaleDateString()}` : '',
      '',
      '*Line Items:*',
      itemsText || 'No items',
      '',
      waMagicUrl ? `Track your invoice: ${waMagicUrl}` : '',
      'Thank you for your business!',
    ].filter(Boolean).join('\n')
    try {
      const r = await sendWhatsAppMessage({ to: recipientPhone, message: waMessage, tenantId: invoice.tenantId || undefined })
      result.whatsapp = { success: !!r.success, error: r.error, simulated: r.simulated }
    } catch (err) {
      result.whatsapp = { success: false, error: String(err) }
    }
  } else if (opts.sendWhatsApp) {
    result.whatsapp = { success: false, error: 'Customer has no phone number' }
  }

  // ─── SMS (NEW — SNS / Twilio / etc. via sendSmsMessage) ─────────────────
  // SMS is the channel that delivers a REAL message when WhatsApp is
  // simulated. The body is short (<=160 chars) and includes the invoice
  // number + total + a magic link so the customer can tap straight into the
  // portal invoice view.
  if (opts.sendSms !== false && recipientPhone) {
    // Reuse the WhatsApp magic link if it was generated above; otherwise try
    // to issue one now (best-effort).
    let smsMagicUrl: string | null = waMagicUrl || null
    if (!smsMagicUrl && invoice.customerId) {
      try {
        const magicLink = await issueCustomerMagicLink({
          customerId: invoice.customerId,
          redirect: `/invoices/${invoice.id}`,
        })
        smsMagicUrl = magicLink.url
      } catch (err) {
        console.warn(`[InvoiceAutomation] sendInvoice(${invoice.number}): SMS magic-link generation failed:`, err)
      }
    }
    const dueStr = invoice.dueDate ? ` due ${new Date(invoice.dueDate).toLocaleDateString()}` : ''
    const smsBody = `Invoice ${invoice.number} from ${invoice.tenant?.name || 'Fieseros'}: ${invoiceTotal}${dueStr}.${smsMagicUrl ? ` View: ${smsMagicUrl}` : ''}`.slice(0, 160)
    try {
      const r = await sendSmsMessage({ to: recipientPhone, message: smsBody, tenantId: invoice.tenantId || undefined })
      result.sms = { success: r.success, error: r.error, simulated: r.simulated }
      // NotificationLog for SMS
      try {
        await db.notificationLog.create({
          data: {
            type: 'sms',
            recipient: recipientPhone,
            recipientName: customerName,
            recipientRole: 'customer',
            subject: `Invoice ${invoice.number}`,
            message: smsBody,
            status: r.success ? 'sent' : 'failed',
            externalId: r.messageId,
            customerId: invoice.customerId || undefined,
            tenantId: invoice.tenantId || undefined,
            metadataJson: JSON.stringify({
              channel: 'sms',
              eventType: 'invoice.sent',
              invoiceId: invoice.id,
              invoiceNumber: invoice.number,
              simulated: !!r.simulated,
              provider: r.provider,
              error: r.error,
            }),
          },
        })
      } catch (logErr) {
        console.error(`[InvoiceAutomation] sendInvoice(${invoice.number}): SMS NotificationLog create failed:`, logErr)
      }
    } catch (err) {
      result.sms = { success: false, error: String(err) }
    }
  } else if (opts.sendSms !== false) {
    result.sms = { success: false, error: 'Customer has no phone number' }
  }

  // ── Flip invoice status to 'sent' if ANY channel succeeded ────
  // PREVIOUS BUG: The status flip was only inside the email success block,
  // so when email had no recipient but WhatsApp succeeded, the invoice
  // stayed in 'draft' even though WhatsApp was delivered. Now we check
  // ALL channels (email + WhatsApp + SMS) after they have all run.
  const anyChannelSuccess =
    (result.email?.success === true) || (result.whatsapp?.success === true) || (result.sms?.success === true)
  const wasDraft = invoice.status === 'draft'
  if (anyChannelSuccess && wasDraft) {
    try {
      await db.invoice.update({ where: { id: invoiceId }, data: { status: 'sent', sentAt: new Date() } })
    } catch (err) {
      console.error(`[InvoiceAutomation] sendInvoice(${invoice.number}): failed to flip status to 'sent':`, err)
    }
  }

  // ─── BILLING-C Step 4: sync the linked Job's status ──────────────
  // When an invoice transitions draft → sent, the linked job (if any) should
  // reflect that it has been invoiced. The job lifecycle stores this as the
  // 'invoice_generated' Job.status (terminal lifecycle stage — see
  // src/lib/job-lifecycle.ts JOB_LIFECYCLE_STAGES).
  //
  // We ONLY promote from 'completed' → 'invoice_generated'. Other statuses
  // are left untouched:
  //   - 'invoice_generated' / 'invoiced': already in the right state.
  //   - 'cancelled': don't touch — cancelled jobs shouldn't be re-activated.
  //   - 'pending' / 'assigned' / 'working' / etc.: the job hasn't been
  //     completed yet; sending an invoice early doesn't change its lifecycle
  //     stage (the dispatcher may still need to complete it).
  //
  // This is a ONE-WAY sync (Invoice → Job) — the Job never writes back to
  // the Invoice here, so there's no loop risk. The V1.5 lifecycle
  // `generate_invoice` action also flips Job.status to 'invoice_generated',
  // but that's a separate code path that runs when the user explicitly clicks
  // "Generate Invoice" in the UI (not when sendInvoice is called from a
  // workflow or auto-create-on-complete flow).
  if (anyChannelSuccess && wasDraft && invoice.jobId) {
    try {
      // Re-fetch the job's current status — don't trust the invoice.job
      // snapshot (it may be stale if the job was completed after the invoice
      // was loaded into memory).
      const linkedJob = await db.job.findUnique({
        where: { id: invoice.jobId },
        select: { id: true, status: true, title: true },
      })
      if (linkedJob && linkedJob.status === 'completed') {
        await db.job.update({
          where: { id: linkedJob.id },
          data: { status: 'invoice_generated' },
        })
      }
    } catch (jobSyncErr) {
      // Non-fatal — the Invoice itself is already sent; the Job sync is a
      // best-effort mirror.
      console.error(
        `[InvoiceAutomation] sendInvoice(${invoice.number}): failed to promote Job ${invoice.jobId} completed→invoice_generated:`,
        jobSyncErr,
      )
    }
  }

  // ─── BILLING-C Step 5: ActivityLog entry ──────────────────────────
  // Logs regardless of channel success so admins can see retry history.
  // Channel-specific results are captured in metadataJson.
  await safeLogInvoiceActivity({
    tenantId: invoice.tenantId,
    action: 'invoice_send',
    entityType: 'invoice',
    entityId: invoice.id,
    entityName: invoice.number,
    description: `Invoice #${invoice.number} sent via ${[opts.sendEmail && 'email', opts.sendWhatsApp && 'whatsapp', opts.sendSms && 'sms'].filter(Boolean).join('+') || 'no channel'}${anyChannelSuccess ? '' : ' (failed)'}.`,
    metadataJson: {
      invoiceNumber: invoice.number,
      sentTo: recipientEmail || recipientPhone || null,
      email: recipientEmail || null,
      phone: recipientPhone || null,
      channels: {
        email: opts.sendEmail ? result.email : undefined,
        whatsapp: opts.sendWhatsApp ? result.whatsapp : undefined,
        sms: opts.sendSms !== false ? result.sms : undefined,
      },
      anyChannelSuccess,
      fromStatus: invoice.status,
      toStatus: anyChannelSuccess && wasDraft ? 'sent' : invoice.status,
      total: Number(invoice.total),
      currency: invoice.currency,
      customerId: invoice.customerId ?? null,
      jobId: invoice.jobId ?? null,
    },
    severity: anyChannelSuccess ? 'info' : 'warning',
  })

  return result
}

// ─── Core: mark invoice paid ─────────────────────────────────────────────────

export interface MarkInvoicePaidOptions {
  /**
   * Payment method used to settle the invoice (e.g. 'cash', 'card',
   * 'bank_transfer', 'upi', 'online'). Stored on the linked Job's
   * `paymentMethod` field (the Invoice model itself has no paymentMethod
   * column — we sync it to the Job side) and recorded in the ActivityLog
   * metadata for audit.
   */
  paymentMethod?: string
  /** Auth user who triggered the payment (for ActivityLog). Null/undefined = system. */
  actorId?: string | null
  actorName?: string | null
}

/**
 * BILLING-C Step 6: field-name verification + signature extension.
 *
 * Verified against the actual `Invoice` Prisma model
 * (prisma/schema.prisma lines 737-791):
 *   - `status`    String   @default("draft")  // draft, sent, paid, pending_approval, cancelled
 *   - `paidAt`    DateTime?
 *   - `total`     Float
 *   - `amount`    Float     (subtotal)
 *   - `tax`       Float
 *   - `discount`  Float
 *
 * The previous implementation already used `status: 'paid'` + `paidAt: new Date()`
 * — both correct. There is NO `paidAmount` / `paidDate` / `paymentMethod` field
 * on the Invoice model, so we don't try to set them on the Invoice row itself.
 *
 * The "paid amount" is implicitly `invoice.total` (the field that already holds
 * the grand total). When the invoice is marked paid, we additionally sync the
 * linked Job's payment fields (`amountCollected`, `paymentStatus`,
 * `paymentMethod`, `collectedAt`, `collectedById`) so the dispatch board, job
 * detail page, and reports all see a consistent "paid" state — that's Step 4.
 *
 * The optional `paymentMethod` is now accepted and forwarded to the Job sync
 * and ActivityLog metadata (Step 6 requirement: "Optionally record the payment
 * method if provided").
 */
export async function markInvoicePaid(
  invoiceId: string,
  opts?: MarkInvoicePaidOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, tenant: true },
    })
    if (!invoice) return { success: false, error: 'Invoice not found' }

    // Skip if already paid (idempotent — the actions API can be double-clicked,
    // and the trigger-engine can re-fire on workflow retries).
    const wasAlreadyPaid = invoice.status === 'paid'

    if (!wasAlreadyPaid) {
      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: 'paid', paidAt: new Date() },
      })
    }

    // ─── BILLING-C Step 4: sync the linked Job's payment fields ───────
    // The Invoice model has no paymentMethod column, so we sync the payment
    // info to the linked Job (which DOES have paymentMethod/paymentStatus/
    // amountCollected/collectedAt/collectedById). This is a ONE-WAY sync
    // (Invoice → Job) — the Job never writes back to the Invoice here, so
    // there's no loop risk.
    //
    // We do NOT change Job.status — the job lifecycle (assigned → … →
    // completed → invoice_generated) is orthogonal to payment state. The
    // Job.paymentStatus field tracks payment state separately, which is
    // exactly what we update here.
    if (invoice.jobId && !wasAlreadyPaid) {
      try {
        const jobUpdate: Record<string, unknown> = {
          paymentStatus: 'paid',
          amountCollected: Number(invoice.total),
          collectedAt: new Date(),
        }
        if (opts?.paymentMethod) {
          jobUpdate.paymentMethod = opts.paymentMethod
        }
        if (opts?.actorId) {
          jobUpdate.collectedById = opts.actorId
        }
        await db.job.update({
          where: { id: invoice.jobId },
          data: jobUpdate,
        })
      } catch (jobSyncErr) {
        // Non-fatal — the Invoice itself is already paid; the Job sync is a
        // best-effort mirror. Logged so admins can spot drift.
        console.error(
          `[InvoiceAutomation] markInvoicePaid: failed to sync Job ${invoice.jobId} payment fields:`,
          jobSyncErr,
        )
      }
    }

    // ─── BILLING-C Step 5: ActivityLog entry ──────────────────────────
    // Action name `invoice_mark_paid` (namespaced with `invoice_` prefix) so
    // it's distinguishable from the API-level `mark_paid` log written by
    // /api/invoices/[id]/actions/route.ts when both fire on the same request.
    if (!wasAlreadyPaid) {
      await safeLogInvoiceActivity({
        tenantId: invoice.tenantId,
        actorId: opts?.actorId,
        actorName: opts?.actorName,
        action: 'invoice_mark_paid',
        entityType: 'invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        description: `Invoice #${invoice.number} marked as paid (${Number(invoice.total).toFixed(2)} ${invoice.currency})${opts?.paymentMethod ? ` via ${opts.paymentMethod}` : ''}.`,
        metadataJson: {
          invoiceNumber: invoice.number,
          amount: Number(invoice.total),
          currency: invoice.currency,
          paymentMethod: opts?.paymentMethod ?? null,
          customerId: invoice.customerId ?? null,
          jobId: invoice.jobId ?? null,
        },
        severity: 'info',
      })
    }

    // ─── Send WhatsApp payment confirmation to customer ──────────
    try {
      const customerPhone = invoice.customer?.phone
      if (customerPhone) {
        const { sendJobNotification } = await import('@/lib/whatsapp-notifications')
        const invoiceNumber = invoice.number
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
          eventType: 'invoice.paid',
          smsMessage: `Payment confirmed: ${total} for invoice #${invoiceNumber}. Thank you!`,
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
        invoiceNumber: invoice.number,
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

export async function sendInvoiceReminder(invoiceId: string): Promise<{ success: boolean; error?: string; email?: boolean; whatsapp?: boolean; sms?: boolean }> {
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
  let smsSent = false

  // Issue a magic-link URL (shared by both email and WhatsApp branches) so the
  // customer can one-click into their invoice on the portal. Wrapped in
  // try/catch — the reminder should still send even if link generation fails.
  let reminderMagicUrl: string | null = null
  if (invoice.customerId) {
    try {
      const magicLink = await issueCustomerMagicLink({
        customerId: invoice.customerId,
        redirect: `/invoices/${invoice.id}`,
      })
      reminderMagicUrl = magicLink.url
    } catch (err) {
      console.warn(
        `[InvoiceAutomation] sendInvoiceReminder(${invoice.number}): magic-link generation failed:`,
        err
      )
    }
  }

  if (invoice.customer?.email) {
    const viewInvoiceButton = reminderMagicUrl
      ? `<div style="margin: 24px 0;"><a href="${reminderMagicUrl}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Invoice</a></div>`
      : ''
    try {
      await sendEmail({
        to: invoice.customer.email,
        subject: `Reminder: Invoice ${invoice.number} is due`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Payment Reminder</h2><p>Hi ${customerName},</p><p>This is a friendly reminder that invoice <strong>${invoice.number}</strong> for <strong>${invoiceTotal}</strong> ${invoice.dueDate ? `is due on ${new Date(invoice.dueDate).toLocaleDateString()}` : 'is now due'}.</p>${viewInvoiceButton}<p>Please complete payment at your earliest convenience.</p><p>— ${invoice.tenant?.name || 'Fieseros'}</p></div>`,
        text: `Reminder: Invoice ${invoice.number} for ${invoiceTotal} is due. Please complete payment.${reminderMagicUrl ? `\n\nView your invoice: ${reminderMagicUrl}` : ''}\n\n— ${invoice.tenant?.name || 'Fieseros'}`,
        usageType: 'transactional',
        tenantId: invoice.tenantId || undefined,
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
        message: `Friendly reminder: Your invoice ${invoice.number} for ${invoiceTotal} ${invoice.dueDate ? `(due ${new Date(invoice.dueDate).toLocaleDateString()})` : 'is now due'}. Please complete payment.${reminderMagicUrl ? `\nView your invoice: ${reminderMagicUrl}` : ''} Thank you! — ${invoice.tenant?.name || 'Fieseros'}`,
        tenantId: invoice.tenantId || undefined,
      })
      whatsappSent = true
    } catch (err) {
      console.error('[InvoiceAutomation] reminder WhatsApp failed:', err)
    }
  }

  // ─── SMS reminder (NEW — SNS / Twilio / etc. via sendSmsMessage) ────────
  // Real SMS delivery even when WhatsApp is simulated. Short body so it fits
  // in a single SMS segment (<=160 chars).
  if (invoice.customer?.phone) {
    const dueStr = invoice.dueDate ? ` due ${new Date(invoice.dueDate).toLocaleDateString()}` : ''
    const smsBody = `Reminder: Invoice ${invoice.number} for ${invoiceTotal}${dueStr}.${reminderMagicUrl ? ` View: ${reminderMagicUrl}` : ''} — ${invoice.tenant?.name || 'Fieseros'}`.slice(0, 160)
    try {
      const r = await sendSmsMessage({
        to: invoice.customer.phone,
        message: smsBody,
        tenantId: invoice.tenantId || undefined,
      })
      smsSent = r.success
      try {
        await db.notificationLog.create({
          data: {
            type: 'sms',
            recipient: invoice.customer.phone,
            recipientName: customerName,
            recipientRole: 'customer',
            subject: `Reminder: Invoice ${invoice.number}`,
            message: smsBody,
            status: r.success ? 'sent' : 'failed',
            externalId: r.messageId,
            customerId: invoice.customerId || undefined,
            tenantId: invoice.tenantId || undefined,
            metadataJson: JSON.stringify({
              channel: 'sms',
              eventType: 'invoice.reminder',
              invoiceId: invoice.id,
              invoiceNumber: invoice.number,
              simulated: !!r.simulated,
              provider: r.provider,
              error: r.error,
            }),
          },
        })
      } catch (logErr) {
        console.error(`[InvoiceAutomation] sendInvoiceReminder(${invoice.number}): SMS NotificationLog create failed:`, logErr)
      }
    } catch (err) {
      console.error('[InvoiceAutomation] reminder SMS failed:', err)
    }
  }

  // ─── BILLING-C Step 5: ActivityLog entry ──────────────────────────
  // `daysOverdue` is computed from the invoice's dueDate so the audit log
  // captures how late the reminder was. Negative/zero values mean the
  // reminder fired before or on the due date (preventative nudge).
  const reminderDaysOverdue = invoice.dueDate
    ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  await safeLogInvoiceActivity({
    tenantId: invoice.tenantId,
    action: 'invoice_reminder',
    entityType: 'invoice',
    entityId: invoice.id,
    entityName: invoice.number,
    description: `Payment reminder sent for invoice #${invoice.number}${emailSent || whatsappSent || smsSent ? '' : ' (all channels failed)'} — email: ${emailSent ? 'yes' : 'no'}, whatsapp: ${whatsappSent ? 'yes' : 'no'}, sms: ${smsSent ? 'yes' : 'no'}.`,
    metadataJson: {
      invoiceNumber: invoice.number,
      daysOverdue: reminderDaysOverdue,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
      emailSent,
      whatsappSent,
      smsSent,
      total: Number(invoice.total),
      currency: invoice.currency,
      customerId: invoice.customerId ?? null,
      jobId: invoice.jobId ?? null,
    },
    severity: emailSent || whatsappSent || smsSent ? 'info' : 'warning',
  })

  return { success: emailSent || whatsappSent || smsSent, email: emailSent, whatsapp: whatsappSent, sms: smsSent }
}

// ─── Core: approve a pending_approval invoice ────────────────────────────────
// Used by the "Approval Required" creation method: a manager reviews the
// pending_approval invoice and approves it, which flips it to "sent" and
// emails + WhatsApps the customer.

export async function approveInvoice(
  invoiceId: string,
  opts?: { actorId?: string | null; actorName?: string | null },
): Promise<{ success: boolean; error?: string; invoiceId?: string; number?: string; sendResult?: { email?: { success: boolean; simulated?: boolean; error?: string }; whatsapp?: { success: boolean; simulated?: boolean; error?: string } } }> {
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

    // ─── BILLING-C Step 5: ActivityLog entry ──────────────────────────
    // Records WHO approved the invoice (actorId/actorName) so the audit trail
    // can answer "who released this pending-approval invoice?". `approvedBy`
    // in metadata mirrors the task spec naming.
    await safeLogInvoiceActivity({
      tenantId: invoice.tenantId,
      actorId: opts?.actorId,
      actorName: opts?.actorName,
      action: 'invoice_approve',
      entityType: 'invoice',
      entityId: invoice.id,
      entityName: invoice.number,
      description: `Invoice #${invoice.number} approved and sent to customer${opts?.actorName ? ` by ${opts.actorName}` : ''}.`,
      metadataJson: {
        invoiceNumber: invoice.number,
        approvedBy: opts?.actorId ?? null,
        approvedByName: opts?.actorName ?? null,
        fromStatus: 'pending_approval',
        toStatus: 'sent',
        sendResult: sendResult ?? null,
        total: Number(invoice.total),
        currency: invoice.currency,
        customerId: invoice.customerId ?? null,
        jobId: invoice.jobId ?? null,
      },
      severity: 'info',
    })

    return { success: true, invoiceId, number: invoice.number, sendResult }
  } catch (err) {
    console.error('[InvoiceAutomation] approveInvoice error:', err)
    return { success: false, error: String(err) }
  }
}

// ─── Core: recurring invoice schedules ───────────────────────────────────────

// ── Phase A2: idempotency helper ──────────────────────────────────────────────
//
// Detects Prisma's P2002 (unique constraint violation) so the recurring
// generator can gracefully swallow a concurrent duplicate-invoice attempt
// instead of bubbling it up as a hard error.
//
// We accept both the structured `PrismaClientKnownRequestError` and a
// duck-typed `{ code: 'P2002' }` check so this still works if the error gets
// wrapped by a higher-level try/catch (e.g. in the API route layer).
function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === 'P2002'
  }
  if (err && typeof err === 'object') {
    const e = err as { code?: string }
    return e.code === 'P2002'
  }
  return false
}

// ── Phase F: timezone helpers ─────────────────────────────────────────────────
//
// The project does NOT depend on `date-fns-tz` (only `date-fns` is installed —
// see package.json). To support per-schedule timezones without adding a new
// runtime dependency, we implement the two helpers below using the native
// `Intl.DateTimeFormat` API, which understands IANA tz keys (e.g.
// "Europe/Berlin", "Asia/Kolkata") and handles DST correctly.
//
// These mirror the documented `getTimezoneOffsetMinutes` + `zonedTimeToUtc`
// pattern used by recurring-jobs.ts (Phase F): copied locally into this file
// rather than imported from a shared location to avoid coupling the two
// feature modules.

/**
 * Return the offset (in minutes) of `timezone` from UTC at the given instant.
 *
 * Positive = behind UTC (e.g. America/New_York at -300 returns +300 — this
 * matches the convention of `Date.prototype.getTimezoneOffset()`).
 * Negative = ahead of UTC (e.g. Asia/Kolkata at +5:30 returns -330).
 *
 * When `timezone` is null/undefined/invalid, returns the SERVER's local
 * offset at that instant — preserving legacy behavior when no tz is set.
 */
function getTimezoneOffsetMinutes(
  timezone: string | null | undefined,
  instant: Date = new Date(),
): number {
  if (!timezone) {
    // Server local offset (legacy behavior). `getTimezoneOffset()` returns
    // "UTC - local" (e.g. +300 for UTC-5), which is the same sign convention
    // used below for the Intl-based path.
    return -instant.getTimezoneOffset()
  }
  try {
    // Format the instant in the target tz and parse the wall-clock parts back
    // as if they were UTC. The difference between that pseudo-UTC instant and
    // the true instant is the tz's offset (in minutes).
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = dtf.formatToParts(instant)
    const get = (t: string): number => {
      const v = parts.find(p => p.type === t)?.value
      return v ? Number(v) : 0
    }
    let hour = get('hour')
    // Some Node versions return "24" instead of "00" for midnight when
    // `hour12: false` is set — normalize to 0 so Date.UTC below isn't off.
    if (hour === 24) hour = 0
    const asUtcMs = Date.UTC(
      get('year'),
      get('month') - 1, // 0-indexed month
      get('day'),
      hour,
      get('minute'),
      get('second'),
    )
    const diffMin = Math.round((asUtcMs - instant.getTime()) / 60000)
    return diffMin
  } catch {
    // Invalid tz key — fall back to server-local.
    return -instant.getTimezoneOffset()
  }
}

/**
 * Convert a "wall-clock" Date in `timezone` to the corresponding UTC instant.
 *
 * The input Date's Y/M/D/H/M/S/ms fields are interpreted as the wall-clock
 * time the customer sees in `timezone` (e.g. 09:00 in "Asia/Kolkata"). The
 * returned Date is the actual UTC instant that corresponds to that
 * wall-clock.
 *
 * Uses the standard 2-pass DST algorithm: compute the offset at the
 * "pseudo-UTC" instant, build a candidate UTC instant, then re-evaluate the
 * offset at that candidate. If they differ (meaning a DST boundary lies
 * between the wall-clock and the resulting UTC), recompute with the
 * corrected offset.
 *
 * When `timezone` is null/undefined, returns a clone of the input unchanged
 * (legacy behavior — wall-clock fields are already server-local UTC instants).
 */
function zonedTimeToUtc(
  wallClockDate: Date,
  timezone: string | null | undefined,
): Date {
  if (!timezone) return new Date(wallClockDate)
  // Build the wall-clock fields as if they were UTC.
  const wallAsUtcMs = Date.UTC(
    wallClockDate.getFullYear(),
    wallClockDate.getMonth(),
    wallClockDate.getDate(),
    wallClockDate.getHours(),
    wallClockDate.getMinutes(),
    wallClockDate.getSeconds(),
    wallClockDate.getMilliseconds(),
  )
  // Pass 1: offset at the pseudo-UTC instant.
  let offsetMin = getTimezoneOffsetMinutes(timezone, new Date(wallAsUtcMs))
  let utcMs = wallAsUtcMs - offsetMin * 60000
  // Pass 2: re-evaluate at the candidate UTC instant. If the offset changed,
  // a DST boundary lies in between — use the corrected offset.
  const offsetAtUtc = getTimezoneOffsetMinutes(timezone, new Date(utcMs))
  if (offsetAtUtc !== offsetMin) {
    offsetMin = offsetAtUtc
    utcMs = wallAsUtcMs - offsetMin * 60000
  }
  return new Date(utcMs)
}

/**
 * Extract the wall-clock fields (year, month0, day, dayOfWeek 0-6,
 * hour, minute, second) of `date` in `timezone`. When `timezone` is null,
 * uses the server-local getters (legacy behavior).
 */
function getWallClockParts(
  date: Date,
  timezone: string | null | undefined,
): {
  year: number
  month: number // 0-indexed
  day: number
  dayOfWeek: number // 0-6 (Sun-Sat)
  hour: number
  minute: number
  second: number
} {
  if (!timezone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = dtf.formatToParts(date)
    const get = (t: string): string | undefined =>
      parts.find(p => p.type === t)?.value
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    let hour = parseInt(get('hour') || '0', 10)
    if (hour === 24) hour = 0 // Intl can return "24" with hour12:false
    return {
      year: parseInt(get('year') || '0', 10),
      month: parseInt(get('month') || '0', 10) - 1, // 0-indexed
      day: parseInt(get('day') || '0', 10),
      dayOfWeek: weekdayMap[get('weekday') || 'Sun'] ?? 0,
      hour,
      minute: parseInt(get('minute') || '0', 10),
      second: parseInt(get('second') || '0', 10),
    }
  } catch {
    // Invalid tz key — fall back to server-local fields.
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }
}

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
  /**
   * ── Phase F: Timezone ──
   * IANA tz key (e.g. "Europe/Berlin", "Asia/Kolkata"). When set, the
   * schedule's wall-clock 09:00 occurrence time is interpreted in this
   * timezone, then converted to UTC for storage. When null/undefined, the
   * legacy server-local-time behavior is used (unchanged for existing rows).
   */
  timezone?: string | null
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

    // ── Phase F: pass the per-schedule timezone (if any) to computeNextRun so
    // the initial `nextRunAt` is the wall-clock 09:00 in the customer's tz,
    // converted to UTC. When `timezone` is null, behavior is identical to the
    // legacy server-local implementation.
    const nextRunAt = computeNextRun(startDate, frequency, dayOfMonth, input.timezone)

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
        // ── Phase F: persist the tz so the cron generator can re-evaluate it
        // on every occurrence (DST may change between runs).
        timezone: input.timezone || null,
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
 *
 * ── Phase F: Timezone ──
 * When `timezone` is provided (IANA key, e.g. "Europe/Berlin"), the
 * wall-clock 09:00 is interpreted in that timezone and then converted to a
 * UTC instant for storage. When null/undefined, the legacy server-local
 * implementation is used — behavior is byte-for-byte identical to the
 * pre-Phase-F version (verified by preserving the same `setHours/setDate/
 * setMonth` calls on a `new Date(from)` clone).
 */
export function computeNextRun(
  from: Date,
  frequency: string,
  dayOfMonth: number,
  timezone?: string | null,
): Date {
  // Legacy path — MUST be unchanged when no timezone is set.
  if (!timezone) {
    return computeNextRunLegacy(from, frequency, dayOfMonth)
  }

  // ── Timezone-aware path ──
  // 1. Extract wall-clock fields of `from` in the customer's tz.
  // 2. Compute the next-occurrence wall-clock fields (Y/M/D 09:00:00).
  // 3. Convert the wall-clock fields to a UTC instant via zonedTimeToUtc.
  const parts = getWallClockParts(from, timezone)
  let year = parts.year
  let month = parts.month // 0-indexed
  let day = parts.day

  if (frequency === 'weekly') {
    const target = dayOfMonth % 7
    let diff = (target - parts.dayOfWeek + 7) % 7
    if (diff === 0) diff = 7 // next week if today is the day
    // Add `diff` days using UTC arithmetic (we're working in wall-clock frame).
    const shifted = new Date(Date.UTC(year, month, day) + diff * 86400000)
    year = shifted.getUTCFullYear()
    month = shifted.getUTCMonth()
    day = shifted.getUTCDate()
  } else {
    // monthly / quarterly / yearly
    const monthStep = frequency === 'quarterly' ? 3 : frequency === 'yearly' ? 12 : 1
    month += monthStep
    while (month > 11) {
      month -= 12
      year += 1
    }
    const dom = Math.min(dayOfMonth, 28) // clamp to avoid month-length issues
    day = dom
  }

  // Build wall-clock 09:00:00 in the target tz, then convert to UTC.
  const wallClock = new Date(Date.UTC(year, month, day, 9, 0, 0, 0))
  return zonedTimeToUtc(wallClock, timezone)
}

/**
 * Legacy `computeNextRun` implementation (server-local time).
 * Kept verbatim from the pre-Phase-F version so the no-timezone path is
 * byte-for-byte identical to before. See `computeNextRun` above.
 */
function computeNextRunLegacy(from: Date, frequency: string, dayOfMonth: number): Date {
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
 *
 * Flow:
 *   1. Load schedule. Bail if inactive / past endDate (auto-deactivate).
 *   2. ── Phase A2: Idempotency pre-check ──
 *      Look for an existing invoice with the same (recurrenceId, occurrenceDate).
 *      If found → skip creation, just advance nextRunAt. This is an optimization
 *      to avoid spinning up a transaction for an already-generated occurrence;
 *      the UNIQUE constraint on [recurrenceId, occurrenceDate] is the real
 *      safety net for the race window between this findFirst and the create.
 *   3. ── Phase A3: Atomic create + advance ──
 *      Both `invoice.create` and `recurringInvoice.update` run inside a single
 *      `db.$transaction` so a crash between them can't leave the schedule's
 *      nextRunAt stale (which would cause a duplicate on the next tick).
 *      The new invoice carries `occurrenceDate = schedule.nextRunAt` so the
 *      unique constraint can detect concurrent attempts.
 *   4. If the transaction throws P2002 (unique violation) — a concurrent
 *      process won the race — fetch the existing invoice and advance the
 *      schedule. Treat as success-with-skip, not an error.
 *   5. ── Auto-send (OUTSIDE the transaction) ──
 *      Email + WhatsApp is a side-effect and must not roll back if it fails;
 *      failures are logged but do not affect the invoice record.
 *
 * Returns `nextRunAt` so the cron endpoint can include it in the response.
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
      // Auto-deactivate the schedule so the cron stops trying to process it.
      // Previously this just returned "skipped" but left active=true forever,
      // causing the cron to keep re-evaluating this schedule on every run.
      await db.recurringInvoice.update({
        where: { id: scheduleId },
        data: { active: false },
      })
      return { success: false, skipped: true, reason: 'Schedule ended — auto-deactivated' }
    }

    // The occurrenceDate for this run is the schedule's current nextRunAt —
    // this is the idempotency key used in both the pre-check and the unique
    // constraint.
    const occurrenceDate = schedule.nextRunAt

    // ── Phase A2: Pre-check (outside the transaction) ──────────────────────
    // If we already generated an invoice for this occurrence, skip creation
    // and just advance the schedule. The findFirst is best-effort; the UNIQUE
    // constraint on [recurrenceId, occurrenceDate] is the authoritative guard.
    const existing = await db.invoice.findFirst({
      where: { recurrenceId: schedule.id, occurrenceDate },
    })
    if (existing) {
      const nextRunAt = computeNextRun(
        new Date(),
        schedule.frequency,
        schedule.dayOfMonth,
        schedule.timezone,
      )
      await db.recurringInvoice.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          lastInvoiceId: existing.id,
          executionCount: { increment: 1 },
          nextRunAt,
        },
      })
      return {
        success: true,
        skipped: true,
        invoiceId: existing.id,
        reason: 'Already generated for this occurrence',
        nextRunAt,
      }
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

    // ── Phase A3: Transaction — invoice.create + recurringInvoice.update ──
    // Atomic so a crash between the two can't leave nextRunAt stale (which
    // would cause the next cron tick to either duplicate-invoice or skip).
    // The new invoice's `occurrenceDate` is set so the unique constraint on
    // [recurrenceId, occurrenceDate] is the safety net for the race window
    // between the pre-check above and the create below.
    let invoice: { id: string; number: string; total: number }
    let nextRunAt: Date
    try {
      const result = await db.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            number,
            tenantId: schedule.tenantId,
            customerId: schedule.customerId || null,
            jobId: schedule.jobId || null,
            recurrenceId: schedule.id,
            // ── Phase A2: idempotency key ──
            occurrenceDate,
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
        // ── Phase F: pass schedule.timezone so the next occurrence is computed
        // in the customer's wall-clock tz (e.g. "Europe/Berlin" 09:00 →
        // correct UTC instant even across DST transitions). When null, the
        // legacy server-local path is used (unchanged).
        const nr = computeNextRun(
          new Date(),
          schedule.frequency,
          schedule.dayOfMonth,
          schedule.timezone,
        )
        await tx.recurringInvoice.update({
          where: { id: scheduleId },
          data: {
            lastRunAt: new Date(),
            lastInvoiceId: inv.id,
            executionCount: { increment: 1 },
            nextRunAt: nr,
          },
        })
        return { invoice: inv, nextRunAt: nr }
      })
      invoice = result.invoice
      nextRunAt = result.nextRunAt
    } catch (err) {
      // ── Phase A2: P2002 = concurrent generation won the race ──
      // Another process (or a retry of this same cron tick) inserted an
      // invoice for this (recurrenceId, occurrenceDate) between our pre-check
      // and our create. Fetch the winner and advance the schedule so we don't
      // get stuck re-trying the same occurrence forever.
      if (isUniqueViolation(err)) {
        const winner = await db.invoice.findFirst({
          where: { recurrenceId: schedule.id, occurrenceDate },
        })
        const nr = computeNextRun(
          new Date(),
          schedule.frequency,
          schedule.dayOfMonth,
          schedule.timezone,
        )
        await db.recurringInvoice.update({
          where: { id: scheduleId },
          data: {
            lastRunAt: new Date(),
            lastInvoiceId: winner?.id,
            executionCount: { increment: 1 },
            nextRunAt: nr,
          },
        })
        return {
          success: true,
          skipped: true,
          invoiceId: winner?.id,
          reason: 'Concurrent generation detected — skipped',
          nextRunAt: nr,
        }
      }
      throw err
    }

    // ── Auto-send (OUTSIDE the transaction) ─────────────────────────────────
    // Email/WhatsApp is a side-effect — failures must NOT roll back the
    // invoice.create + schedule.advance above. The invoice is already created
    // with status='sent'; a send failure here just means the customer didn't
    // get the email immediately (a manual re-send is still possible).
    try {
      await sendInvoice(invoice.id, { sendEmail: true, sendWhatsApp: true, sendSms: false }) // Rule 5b: invoice creation = email only
    } catch (sendErr) {
      console.error('[InvoiceAutomation] recurring send error:', sendErr)
    }

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

// ─── Overdue invoice detector ───────────────────────────────────────────────
//
// The audit found that the `invoice.overdue` event is in trigger catalogs but
// NEVER emitted by any code. This function is the fix: it finds all overdue
// invoices (dueDate < now, status NOT in {paid, cancelled, draft}) and:
//   1. Emits the 'invoice.overdue' EventBus event for each (so workflow
//      automations like "send overdue reminder email" can fire)
//   2. Creates a ScheduledMessage (channel=email if customer has email, else
//      whatsapp if phone) for the overdue reminder — so the actual message
//      dispatch happens through the same persistent pipeline as everything
//      else (processDueScheduledMessages cron).
//
// De-dup: a ScheduledMessage with messageType='overdue_reminder' AND
// invoiceId=invoice.id already existing means we've already processed this
// invoice — skip. This makes the daily cron idempotent.
//
// Called by /api/cron/overdue-detector (recommended schedule: daily 8 AM).

export async function detectAndEmitOverdueInvoices(): Promise<{ processed: number }> {
  const now = new Date()

  // Find all overdue invoices. We consider an invoice overdue when:
  //   - dueDate is set and < now
  //   - status is NOT 'paid', 'cancelled', or 'draft' (draft invoices have
  //     never been sent; they can't be overdue)
  //   - tenantId is set (without a tenant we can't dispatch reminders)
  const overdueInvoices = await db.invoice.findMany({
    where: {
      dueDate: { lt: now },
      status: { notIn: ['paid', 'cancelled', 'draft'] },
      tenantId: { not: null },
    },
    include: { customer: true, tenant: true },
  })

  if (overdueInvoices.length === 0) {
    return { processed: 0 }
  }

  let processed = 0

  for (const invoice of overdueInvoices) {
    const tenantId = invoice.tenantId || ''
    const invoiceId = invoice.id
    const customerId = invoice.customerId || null

    // ── De-dup: skip if we've already created an overdue reminder for this invoice ──
    try {
      const existing = await db.scheduledMessage.findFirst({
        where: {
          messageType: 'overdue_reminder',
          invoiceId,
        },
        select: { id: true, status: true },
      })
      if (existing) {
        // Already processed — skip. (The existing reminder may be pending,
        // sent, or failed; either way we don't want a daily cron spamming
        // duplicate reminders.)
        continue
      }
    } catch (err) {
      console.warn(
        `[InvoiceAutomation] detectAndEmitOverdueInvoices: dedup check failed for invoice ${invoice.number}:`,
        err
      )
      // Continue anyway — better to risk a duplicate than to silently skip
      // an overdue reminder.
    }

    // ── 1. Emit the invoice.overdue event ────────────────────────────
    // Best-effort — never aborts the loop. Triggers workflow automations
    // like "7 days after invoice overdue, send stern reminder".
    try {
      const { EventBus } = await import('@/lib/event-bus')
      await EventBus.emit(
        'invoice.overdue',
        {
          invoiceId,
          invoiceNumber: invoice.number,
          customerId,
          tenantId,
          total: Number(invoice.total),
          currency: invoice.currency,
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          resourceType: 'invoice',
          resourceId: invoiceId,
        },
        { tenantId: tenantId || undefined }
      )
    } catch (eventErr) {
      console.error(
        `[InvoiceAutomation] detectAndEmitOverdueInvoices: invoice.overdue event failed for ${invoice.number}:`,
        eventErr
      )
    }

    // ── 2. Flip invoice status to 'overdue' (if it was 'sent') ──────
    // Idempotent — only flips if the status is still 'sent'. If the user
    // already manually marked it 'overdue', leave it alone. Best-effort.
    if (invoice.status === 'sent') {
      try {
        await db.invoice.update({
          where: { id: invoiceId },
          data: { status: 'overdue' },
        })
      } catch (err) {
        console.warn(
          `[InvoiceAutomation] detectAndEmitOverdueInvoices: failed to flip invoice ${invoice.number} status to 'overdue':`,
          err
        )
      }
    }

    // ── 3. Create the ScheduledMessage for the actual reminder ──────
    // Channel: email if the customer has an email; else WhatsApp if they
    // have a phone; else skip (no way to reach them — the event still fired
    // so workflow automations could do something else, like create a task).
    const customerEmail = invoice.customer?.email || null
    const customerPhone = invoice.customer?.phone || null
    const customerName = invoice.customer?.name || 'Customer'
    const invoiceTotal = `$${Number(invoice.total).toFixed(2)} ${invoice.currency}`
    const dueStr = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString()
      : 'recently'

    const channel: 'email' | 'whatsapp' | 'sms' = customerEmail
      ? 'email'
      : customerPhone
        ? 'whatsapp'
        : 'sms' // will be skipped at dispatch time if phone is null

    const subject = `Invoice ${invoice.number} is overdue`
    const bodyText = `Hi ${customerName},\n\nYour invoice ${invoice.number} for ${invoiceTotal} was due on ${dueStr}. Please complete payment at your earliest convenience.\n\n— ${invoice.tenant?.name || 'Fieseros'}`

    const bodyHtml = customerEmail
      ? [
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
          `<h2 style="color:#b91c1c;">Overdue Invoice</h2>`,
          `<p>Hi ${customerName},</p>`,
          `<p>Your invoice <strong>${invoice.number}</strong> for <strong>${invoiceTotal}</strong> was due on <strong>${dueStr}</strong> and is now overdue.</p>`,
          `<p>Please complete payment at your earliest convenience. If you've already paid, please disregard this message.</p>`,
          `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
          `<p style="font-size:12px;color:#9ca3af;">— ${invoice.tenant?.name || 'Fieseros'}</p>`,
          `</div>`,
        ].join('\n')
      : null

    try {
      await db.scheduledMessage.create({
        data: {
          tenantId,
          customerId: customerId || undefined,
          invoiceId,
          messageType: 'overdue_reminder',
          channel,
          recipientEmail: customerEmail,
          recipientPhone: customerPhone,
          subject,
          bodyText,
          bodyHtml,
          dueAt: new Date(), // due NOW — the next scheduled-messages cron tick picks it up
          status: 'pending',
          metadataJson: JSON.stringify({
            invoiceNumber: invoice.number,
            invoiceTotal,
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            customerName,
            triggeredBy: 'overdue-detector',
          }),
        },
      })
    } catch (err) {
      console.error(
        `[InvoiceAutomation] detectAndEmitOverdueInvoices: failed to create ScheduledMessage for invoice ${invoice.number}:`,
        err
      )
      // Continue — the event still emitted; maybe a workflow will handle it.
    }

    processed++
  }

  return { processed }
}

