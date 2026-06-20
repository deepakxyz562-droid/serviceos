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
  /** Enable milestone invoicing (30% on start / 40% at 50% / 30% on complete) */
  enableMilestones: boolean
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
  enableMilestones: false,
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

async function generateInvoiceNumber(tenantId: string | null): Promise<string> {
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

  // Collision — append a short timestamp suffix to guarantee uniqueness
  const suffix = Date.now().toString(36).toUpperCase().slice(-5)
  return `${prefix}-${String(count + 1).padStart(4, '0')}-${suffix}`
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
}

/**
 * Auto-create an invoice from a completed job.
 * - Skips if an invoice already exists for the job.
 * - Uses the job's customer + a single line item for the job service.
 * - Honors the tenant's defaultTaxPercent and defaultDueDays.
 */
export async function autoCreateInvoiceFromJob(jobId: string): Promise<AutoInvoiceResult> {
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

    // Idempotency: skip if an invoice already exists for this job
    const existing = await db.invoice.findFirst({ where: { jobId } })
    if (existing) {
      return { success: false, skipped: true, reason: 'Invoice already exists for this job', invoiceId: existing.id, number: existing.number }
    }

    // Need a customer to invoice
    if (!job.customerId && !job.customerPhone) {
      return { success: false, skipped: true, reason: 'Job has no customer to invoice' }
    }

    const { base, rate } = await resolveCurrency(tenantId)
    const taxPercent = settings.defaultTaxPercent || 0

    // Build a single line item for the job
    const lineItem = {
      description: job.title || `Job #${job.jobNumber || job.id.slice(-6)}`,
      quantity: 1,
      rate: job.estimatedDuration ? Math.round((job.estimatedDuration / 60) * 50) : 50, // fallback rate
      notes: job.description || '',
    }
    const items = [lineItem]
    const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0)
    const tax = subtotal * (taxPercent / 100)
    const total = subtotal + tax

    const number = await generateInvoiceNumber(tenantId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (settings.defaultDueDays || 15))

    const status = settings.creationMethod === 'approval_required' ? 'pending_approval' : 'draft'

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId,
        jobId,
        customerId: job.customerId || null,
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
        invoiceType: 'standard',
        dueDate,
        itemsJson: JSON.stringify(items),
        notes: `Auto-created from completed job #${job.jobNumber || job.id.slice(-6)}`,
      },
    })

    // Auto-send (email + WhatsApp) if enabled
    if (settings.autoSendEmail || settings.autoSendWhatsApp) {
      await sendInvoice(invoice.id, {
        sendEmail: settings.autoSendEmail,
        sendWhatsApp: settings.autoSendWhatsApp,
      })
    }

    return { success: true, invoiceId: invoice.id, number: invoice.number, total: invoice.total }
  } catch (err) {
    console.error('[InvoiceAutomation] autoCreateInvoiceFromJob error:', err)
    return { success: false, error: String(err) }
  }
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

export async function sendInvoice(invoiceId: string, opts: SendInvoiceOptions = { sendEmail: true, sendWhatsApp: true }): Promise<{ email?: { success: boolean; error?: string }; whatsapp?: { success: boolean; error?: string } }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, tenant: true },
  })
  if (!invoice) return { email: { success: false, error: 'Invoice not found' } }

  const result: { email?: { success: boolean; error?: string }; whatsapp?: { success: boolean; error?: string } } = {}

  // Build a compact text summary
  const items = safeParse(invoice.itemsJson, []) as Array<{ description: string; quantity: number; rate: number }>
  const itemsText = items.map((it, i) => `${i + 1}. ${it.description} ×${it.quantity} = $${(it.quantity * it.rate).toFixed(2)}`).join('\n')
  const customerName = invoice.customer?.name || 'Customer'
  const invoiceTotal = `$${Number(invoice.total).toFixed(2)} ${invoice.currency}`

  // ─── Email ─────────────────────────────────────────────────────
  if (opts.sendEmail && invoice.customer?.email) {
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
      const r = await sendEmail({ to: invoice.customer.email, subject, html, text, usageType: 'transactional' })
      result.email = { success: !!r.success, error: r.error }
      if (r.success && invoice.status === 'draft') {
        await db.invoice.update({ where: { id: invoiceId }, data: { status: 'sent', sentAt: new Date() } })
      }
    } catch (err) {
      result.email = { success: false, error: String(err) }
    }
  } else if (opts.sendEmail) {
    result.email = { success: false, error: 'Customer has no email address' }
  }

  // ─── WhatsApp ──────────────────────────────────────────────────
  if (opts.sendWhatsApp && invoice.customer?.phone) {
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
      const r = await sendWhatsAppMessage({ to: invoice.customer.phone, message: waMessage })
      result.whatsapp = { success: !!r.success, error: r.error }
    } catch (err) {
      result.whatsapp = { success: false, error: String(err) }
    }
  } else if (opts.sendWhatsApp) {
    result.whatsapp = { success: false, error: 'Customer has no phone number' }
  }

  return result
}

// ─── Core: mark invoice paid ─────────────────────────────────────────────────

export async function markInvoicePaid(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return { success: false, error: 'Invoice not found' }
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
    })
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

export async function approveInvoice(invoiceId: string): Promise<{ success: boolean; error?: string; invoiceId?: string; number?: string }> {
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
    // Send to customer via email + WhatsApp
    try {
      await sendInvoice(invoiceId, { sendEmail: true, sendWhatsApp: true })
    } catch (sendErr) {
      console.error('[InvoiceAutomation] approveInvoice send error:', sendErr)
    }
    return { success: true, invoiceId, number: invoice.number }
  } catch (err) {
    console.error('[InvoiceAutomation] approveInvoice error:', err)
    return { success: false, error: String(err) }
  }
}

// ─── Core: milestone invoices for larger projects ────────────────────────────
// Splits a job's value across 3 milestone invoices:
//   1. Job Started      → 30%  (milestoneIndex = 1)
//   2. Job 50% Complete → 40%  (milestoneIndex = 2)  [triggered manually or by progress update]
//   3. Job Complete     → 30%  (milestoneIndex = 3)
// Each milestone is its own Invoice row linked via parentInvoiceId to the first one.

export interface MilestoneSplit {
  label: string
  percentage: number
  milestoneIndex: number
}

export const DEFAULT_MILESTONE_SPLITS: MilestoneSplit[] = [
  { label: 'Milestone 1 — Start (30%)', percentage: 30, milestoneIndex: 1 },
  { label: 'Milestone 2 — 50% Complete (40%)', percentage: 40, milestoneIndex: 2 },
  { label: 'Milestone 3 — Complete (30%)', percentage: 30, milestoneIndex: 3 },
]

/**
 * Create a single milestone invoice for a job.
 * Called from the job lifecycle 'start' (index 1) and 'complete' (index 3) actions,
 * and can be called manually for the 50% milestone (index 2).
 */
export async function createMilestoneInvoice(
  jobId: string,
  milestoneIndex: number,
  splits: MilestoneSplit[] = DEFAULT_MILESTONE_SPLITS
): Promise<AutoInvoiceResult> {
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { customer: true },
    })
    if (!job) return { success: false, error: 'Job not found' }

    // Resolve tenant
    let tenantId: string | null = null
    if (job.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({ where: { id: job.workspaceId }, select: { tenantId: true } })
        tenantId = ws?.tenantId || null
      } catch { /* ignore */ }
    }
    if (!tenantId) {
      const t = await db.tenant.findFirst({ select: { id: true } })
      tenantId = t?.id || null
    }
    if (!tenantId) return { success: false, error: 'No tenant for job' }

    const settings = await getInvoiceSettings(tenantId)
    const split = splits.find((s) => s.milestoneIndex === milestoneIndex)
    if (!split) return { success: false, error: `Unknown milestone index: ${milestoneIndex}` }

    // Idempotency: skip if this milestone already has an invoice
    const existing = await db.invoice.findFirst({
      where: { jobId, invoiceType: 'milestone', milestoneIndex },
    })
    if (existing) {
      return { success: false, skipped: true, reason: `Milestone ${milestoneIndex} invoice already exists`, invoiceId: existing.id, number: existing.number }
    }

    // Compute the job's total value (estimated from duration × rate, or job value field)
    const jobValue = job.estimatedDuration ? Math.round((job.estimatedDuration / 60) * 50) : 50
    const milestoneAmount = Math.round(jobValue * (split.percentage / 100))

    const { base, rate } = await resolveCurrency(tenantId)
    const taxPercent = settings.defaultTaxPercent || 0
    const subtotal = milestoneAmount
    const tax = subtotal * (taxPercent / 100)
    const total = subtotal + tax

    const number = await generateInvoiceNumber(tenantId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (settings.defaultDueDays || 15))

    // Find the parent invoice (milestone 1) to link subsequent milestones
    let parentInvoiceId: string | null = null
    if (milestoneIndex > 1) {
      const parent = await db.invoice.findFirst({
        where: { jobId, invoiceType: 'milestone', milestoneIndex: 1 },
        select: { id: true },
      })
      parentInvoiceId = parent?.id || null
    }

    const items = [{
      description: split.label,
      quantity: 1,
      rate: milestoneAmount,
      notes: `Milestone ${milestoneIndex} of ${splits.length} for job #${job.jobNumber || job.id.slice(-6)}`,
    }]

    const status = settings.creationMethod === 'approval_required' ? 'pending_approval' : 'sent'

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId,
        jobId,
        customerId: job.customerId || null,
        employeeId: job.assigneeId || null,
        parentInvoiceId,
        amount: subtotal,
        tax,
        discount: 0,
        total,
        currency: base,
        exchangeRate: rate(base),
        baseCurrency: base,
        baseAmount: total,
        status,
        invoiceType: 'milestone',
        milestoneIndex,
        sentAt: status === 'sent' ? new Date() : null,
        dueDate,
        itemsJson: JSON.stringify(items),
        notes: `Milestone ${milestoneIndex}/${splits.length} (${split.percentage}%) for job #${job.jobNumber || job.id.slice(-6)}`,
      },
    })

    // Auto-send if enabled and not pending approval
    if (status === 'sent' && (settings.autoSendEmail || settings.autoSendWhatsApp)) {
      try {
        await sendInvoice(invoice.id, {
          sendEmail: settings.autoSendEmail,
          sendWhatsApp: settings.autoSendWhatsApp,
        })
      } catch (sendErr) {
        console.error('[InvoiceAutomation] milestone send error:', sendErr)
      }
    }

    return { success: true, invoiceId: invoice.id, number: invoice.number, total: invoice.total }
  } catch (err) {
    console.error('[InvoiceAutomation] createMilestoneInvoice error:', err)
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
