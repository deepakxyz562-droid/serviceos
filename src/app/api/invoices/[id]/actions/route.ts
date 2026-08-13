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
        return NextResponse.json({
          success: anyRequested ? anySuccess : false,
          action,
          result,
        });
      }

      case 'mark_paid': {
        const wasNotPaid = invoice.status !== 'paid';
        const result = await markInvoicePaid(id);
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
        return NextResponse.json({ success: result.success, action, error: result.error, invoice: updatedInvoice });
      }

      case 'reminder': {
        const result = await sendInvoiceReminder(id);
        return NextResponse.json({ success: result.success, action, error: result.error, email: result.email, whatsapp: result.whatsapp });
      }

      case 'approve': {
        const result = await approveInvoice(id);
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
