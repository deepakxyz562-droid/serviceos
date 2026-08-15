import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { autoCreateInvoiceFromJob } from '@/lib/invoice-automation'
import { getAuthUser } from '@/lib/auth'

// POST /api/jobs/generate-invoice — Generate invoice from a job
//
// REWRITE (Billing lifecycle split Phase): previously this endpoint inlined
// invoice creation with HARDCODED pricing (`estimatedDuration * 5` or `$1500`
// flat) and ignored the customer's quoted amount, lead value, and service
// base price. It was also a THIRD parallel code path (alongside
// `autoCreateInvoiceFromJob` and `POST /api/invoices`) with subtly different
// pricing logic, which produced invoices whose totals did not match what the
// customer was actually quoted.
//
// Now this endpoint delegates to `autoCreateInvoiceFromJob(jobId, { force: true })`,
// which:
//   - Uses `resolveJobAmount()` (quotedAmount → amountCollected → Service.basePrice
//     → Lead.value → estimatedDuration × rate) — single source of pricing truth.
//   - Honors tenant defaultTaxPercent, defaultDueDays, and creationMethod
//     (draft vs pending_approval vs paid-for-COD).
//   - Auto-sends email/WhatsApp if the tenant has those toggles on (still
//     respects them — `force` only bypasses the autoCreateOnJobComplete toggle,
//     NOT the auto-send toggles, since the user explicitly asked for an invoice).
//   - Is idempotent (returns the existing invoice if one already exists for
//     the job).
//
// Response shape: `{ invoice: Invoice, created: boolean }` so the UI can show
// "Invoice created" vs "Invoice already exists" toasts accurately.
//
// Auth: optional. The endpoint is hit both interactively (owner/admin clicking
// "Create Invoice" in the UI — authenticated) AND potentially by automation
// (rare, but possible). We call getAuthUser() but tolerate `null` — tenantId
// is resolved inside `autoCreateInvoiceFromJob` from the job's workspace chain.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, jobNumber: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Call the canonical invoice-creation helper with `force: true` so it
    // bypasses the autoCreateOnJobComplete toggle (the user is explicitly
    // asking for an invoice here, not relying on auto-completion behavior).
    const result = await autoCreateInvoiceFromJob(jobId, { force: true })

    // If an invoice already existed (idempotent skip), `result.skipped` is
    // true and `result.invoiceId` points at the existing one. Treat that as
    // success-with-existing rather than an error.
    const invoiceId = result.invoiceId
    if (!invoiceId) {
      // Genuine failure (e.g. "No tenant for job", "Job has no customer to
      // invoice"). Return 400 so the UI can surface the reason.
      return NextResponse.json(
        { error: result.error || result.reason || 'Failed to generate invoice' },
        { status: 400 },
      )
    }

    // Fetch the full invoice row (with relations the UI needs) so the response
    // matches the shape returned by `POST /api/invoices` for consistency.
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice was created but could not be re-fetched' },
        { status: 500 },
      )
    }

    // `created` distinguishes "we made a new invoice" from "one already existed".
    // The UI uses this to choose the right toast message.
    const created = !result.skipped

    // Best-effort audit log: who triggered the invoice creation. Mirrors the
    // pattern in /api/invoices/route.ts but inline because we don't want to
    // import the full ActivityLog helper from the lifecycle route. Never
    // blocks the response — audit logging is best-effort.
    try {
      const authUser = await getAuthUser().catch(() => null)
      const tenantId = invoice.tenantId
      if (tenantId) {
        Promise.resolve(db.activityLog.create({
          data: {
            tenantId,
            actorId: authUser?.id ?? null,
            actorName: authUser?.name ?? null,
            actorType: authUser ? 'user' : 'system',
            action: created ? 'create_invoice_from_job' : 'invoice_already_exists',
            entityType: 'invoice',
            entityId: invoice.id,
            entityName: invoice.number,
            description: created
              ? `Invoice #${invoice.number} created for job '${job.title}' (${Number(invoice.total).toFixed(2)} ${invoice.currency}).`
              : `Invoice #${invoice.number} already existed for job '${job.title}' — returned existing.`,
            metadataJson: JSON.stringify({
              jobId: job.id,
              jobTitle: job.title,
              jobNumber: job.jobNumber ?? null,
              invoiceId: invoice.id,
              invoiceNumber: invoice.number,
              total: Number(invoice.total),
              currency: invoice.currency,
              status: invoice.status,
              created,
            }),
            severity: 'info',
          },
        })).catch((err) => console.error('[generate-invoice] ActivityLog write failed:', err))
      }
    } catch (auditErr) {
      console.error('[generate-invoice] ActivityLog setup failed:', auditErr)
    }

    return NextResponse.json({ invoice, created }, { status: created ? 201 : 200 })
  } catch (error) {
    console.error('Failed to generate invoice:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
