import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  sendInvoice,
  markInvoicePaid,
  sendInvoiceReminder,
  approveInvoice,
} from '@/lib/invoice-automation';
import { EventBus } from '@/lib/event-bus';

/**
 * Fire-and-forget ActivityLog writer for invoice state changes.
 *
 * Audit logging must NEVER break the user-facing response — every call is
 * detached and swallows its own errors. Mirrors the `safeLogActivity` pattern
 * used by the job lifecycle route, but inline because this file has only one
 * call site per action and we want to keep the dependency surface minimal.
 *
 * ActivityLog.action is a free-form String (not an enum), so the new values
 * `send_invoice`, `mark_paid`, `send_reminder`, `approve_invoice` require
 * NO schema migration.
 */
function logInvoiceActivity(params: {
  invoiceId: string;
  invoiceNumber: string;
  tenantId: string | null;
  customerId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  description: string;
  metadataJson?: Record<string, unknown>;
  severity?: string;
}): void {
  if (!params.tenantId) return;
  Promise.resolve(db.activityLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorType: params.actorId ? 'user' : 'system',
      action: params.action,
      entityType: 'invoice',
      entityId: params.invoiceId,
      entityName: params.invoiceNumber,
      description: params.description,
      metadataJson: JSON.stringify(params.metadataJson ?? {}),
      severity: params.severity ?? 'info',
    },
  })).catch((err) => console.error('[Invoice actions] ActivityLog write failed:', err));
}

// POST /api/invoices/[id]/actions
// Body: { action: 'send' | 'send_email' | 'send_whatsapp' | 'mark_paid' | 'reminder' | 'approve' }
//
// This is the single endpoint the Invoices UI and workflow engine call to
// perform invoice operations. Each action is best-effort and returns a
// structured result so the UI can show toast feedback.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || '').toLowerCase();

    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    switch (action) {
      case 'send':
      case 'send_email':
      case 'send_whatsapp': {
        // sendSms is explicitly set to false here because the user only
        // asked for email (or email+whatsapp). Previously sendSms was left
        // undefined, and sendInvoice's `sendSms !== false` check treated
        // undefined as true — so SMS was dispatched on every "Send Email"
        // click even though the user didn't want it.
        const opts = {
          sendEmail: action === 'send' || action === 'send_email',
          sendWhatsApp: action === 'send' || action === 'send_whatsapp',
          sendSms: false,
        };
        const result = await sendInvoice(id, opts);
        // Aggregate per-channel results into the top-level success flag so
        // the UI can show an accurate toast. If BOTH channels failed (or the
        // only requested channel failed), the overall action failed.
        const channels = [result.email, result.whatsapp].filter(Boolean);
        const anySuccess = channels.some((c) => c?.success);
        const anyRequested = channels.length > 0;
        // Update invoice status to 'sent' if any channel succeeded
        const wasDraft = invoice.status === 'draft';
        if (anySuccess && wasDraft) {
          await db.invoice.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } }).catch(() => {});
        }
        // ─── Emit invoice.sent event (only on draft → sent transition) ──
        // Best-effort — never fails the response. sendInvoice() already
        // dispatches the email/WhatsApp; this event drives workflow
        // automations like "7 days after invoice sent, send follow-up".
        if (anySuccess && wasDraft) {
          try {
            await EventBus.emit(
              'invoice.sent',
              {
                invoiceId: invoice.id,
                invoiceNumber: invoice.number,
                customerId: invoice.customerId || null,
                tenantId: invoice.tenantId || null,
                fromStatus: 'draft',
                toStatus: 'sent',
                resourceType: 'invoice',
                resourceId: invoice.id,
              },
              { tenantId: invoice.tenantId || undefined }
            );
          } catch (eventErr) {
            console.error('[Invoice actions] invoice.sent event failed:', eventErr);
          }
        }
        // ─── Audit log: who sent the invoice, via which channels ───
        // Best-effort, never blocks the response. Logs even on partial-channel
        // failure so admins can see "an attempt was made".
        logInvoiceActivity({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          tenantId: invoice.tenantId || null,
          customerId: invoice.customerId || null,
          actorId: user.id,
          actorName: user.name,
          action: 'send_invoice',
          description: `Invoice #${invoice.number} sent via ${action === 'send' ? 'email + WhatsApp' : action === 'send_email' ? 'email' : action === 'send_whatsapp' ? 'WhatsApp' : 'unknown channel'}${anySuccess ? '' : ' (failed)'}.`,
          metadataJson: {
            channel: action,
            emailResult: result.email,
            whatsappResult: result.whatsapp,
            fromStatus: invoice.status,
            toStatus: anySuccess && wasDraft ? 'sent' : invoice.status,
            total: Number(invoice.total),
            currency: invoice.currency,
          },
          severity: anySuccess ? 'info' : 'warning',
        });
        return NextResponse.json({
          success: anyRequested ? anySuccess : false,
          action,
          result,
        });
      }

      case 'mark_paid': {
        const wasNotPaid = invoice.status !== 'paid';
        // BILLING-C Step 6: forward optional paymentMethod + actor context to
        // the lib function so it can sync the linked Job's payment fields and
        // write an accurate ActivityLog entry. The body shape is intentionally
        // permissive — callers (UI / trigger-engine / workflow) may omit any
        // of these.
        const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : undefined;
        const result = await markInvoicePaid(id, {
          paymentMethod,
          actorId: user.id,
          actorName: user.name,
        });
        // Fetch the updated invoice to return the new status
        const updatedInvoice = result.success ? await db.invoice.findUnique({ where: { id }, select: { id: true, number: true, status: true, paidAt: true, customerId: true, tenantId: true, total: true, currency: true } }) : null;
        // ─── Emit invoice.paid event ──────────────────────────────────
        // markInvoicePaid() already emits 'payment.received' (the legacy
        // payment-side event); we additionally emit 'invoice.paid' so
        // workflow automations keyed on this event can fire (e.g. "send
        // thank-you email 1 hour after invoice paid").
        if (result.success && wasNotPaid && updatedInvoice) {
          try {
            await EventBus.emit(
              'invoice.paid',
              {
                invoiceId: updatedInvoice.id,
                invoiceNumber: updatedInvoice.number,
                customerId: updatedInvoice.customerId || null,
                tenantId: updatedInvoice.tenantId || null,
                total: Number(updatedInvoice.total),
                currency: updatedInvoice.currency,
                fromStatus: invoice.status,
                toStatus: 'paid',
                resourceType: 'invoice',
                resourceId: updatedInvoice.id,
              },
              { tenantId: updatedInvoice.tenantId || undefined }
            );
          } catch (eventErr) {
            console.error('[Invoice actions] invoice.paid event failed:', eventErr);
          }
        }
        // ─── Audit log: who marked the invoice paid ───
        if (result.success && wasNotPaid && updatedInvoice) {
          logInvoiceActivity({
            invoiceId: updatedInvoice.id,
            invoiceNumber: updatedInvoice.number,
            tenantId: updatedInvoice.tenantId || null,
            customerId: updatedInvoice.customerId || null,
            actorId: user.id,
            actorName: user.name,
            action: 'mark_paid',
            description: `Invoice #${updatedInvoice.number} marked as paid (${Number(updatedInvoice.total).toFixed(2)} ${updatedInvoice.currency}).`,
            metadataJson: {
              fromStatus: invoice.status,
              toStatus: 'paid',
              total: Number(updatedInvoice.total),
              currency: updatedInvoice.currency,
              paidAt: updatedInvoice.paidAt,
            },
            severity: 'info',
          });
        }
        return NextResponse.json({ success: result.success, action, error: result.error, invoice: updatedInvoice });
      }

      case 'reminder': {
        const result = await sendInvoiceReminder(id);
        // ─── Audit log: who sent a payment reminder ───
        // Logs regardless of channel success so admins can see retry history.
        logInvoiceActivity({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          tenantId: invoice.tenantId || null,
          customerId: invoice.customerId || null,
          actorId: user.id,
          actorName: user.name,
          action: 'send_reminder',
          description: `Payment reminder sent for invoice #${invoice.number}${result.success ? '' : ' (failed)'} — email: ${result.email ? 'yes' : 'no'}, whatsapp: ${result.whatsapp ? 'yes' : 'no'}.`,
          metadataJson: {
            emailSent: result.email,
            whatsappSent: result.whatsapp,
            smsSent: result.sms,
            success: result.success,
            error: result.error ?? null,
            total: Number(invoice.total),
            currency: invoice.currency,
          },
          severity: result.success ? 'info' : 'warning',
        });
        return NextResponse.json({ success: result.success, action, error: result.error, email: result.email, whatsapp: result.whatsapp });
      }

      case 'approve': {
        // BILLING-C Step 5: forward actor context so approveInvoice can write
        // an ActivityLog entry naming WHO approved the invoice.
        const result = await approveInvoice(id, {
          actorId: user.id,
          actorName: user.name,
        });
        // ─── Audit log: who approved the pending-approval invoice ───
        if (result.success) {
          logInvoiceActivity({
            invoiceId: result.invoiceId || invoice.id,
            invoiceNumber: result.number || invoice.number,
            tenantId: invoice.tenantId || null,
            customerId: invoice.customerId || null,
            actorId: user.id,
            actorName: user.name,
            action: 'approve_invoice',
            description: `Invoice #${result.number || invoice.number} approved and sent to customer.`,
            metadataJson: {
              fromStatus: 'pending_approval',
              toStatus: 'sent',
              sendResult: result.sendResult ?? null,
              total: Number(invoice.total),
              currency: invoice.currency,
            },
            severity: 'info',
          });
        }
        return NextResponse.json({ success: result.success, action, error: result.error, invoiceId: result.invoiceId, number: result.number, result: result.sendResult });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Invoice action error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to perform invoice action', details: message }, { status: 500 });
  }
}
