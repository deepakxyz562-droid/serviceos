import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/billing-history/[id]/receipt
 * Returns a printable HTML receipt for a single SubscriptionPayment.
 * The user can only fetch receipts for their own tenant.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const { id } = await params;

    const payment = await db.subscriptionPayment.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true, address: true, country: true, currency: true },
    });

    const planLabel =
      payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);
    const cycleLabel =
      payment.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
    const currencySymbol =
      payment.currency === 'USD' ? '$' : payment.currency + ' ';
    const amountStr = `${currencySymbol}${payment.amount.toFixed(2)}`;
    const paidDateStr = payment.paidAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const statusLabel =
      payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${payment.invoiceNumber || payment.id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #f8fafc; }
  .receipt { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #059669, #10b981); color: #fff; padding: 28px 36px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .header .sub { margin-top: 4px; font-size: 13px; opacity: 0.9; }
  .body { padding: 32px 36px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row .label { color: #64748b; }
  .row .value { color: #0f172a; font-weight: 600; text-align: right; }
  .total { display: flex; justify-content: space-between; padding: 18px 0 6px; margin-top: 12px; border-top: 2px solid #0f172a; font-size: 18px; font-weight: 700; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
  .muted { color: #64748b; font-size: 12px; }
  .footer { padding: 18px 36px 28px; border-top: 1px solid #e2e8f0; }
  .actions { padding: 0 36px 28px; }
  button { background: #0f172a; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 13px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .actions { display: none; } .receipt { border: 0; } }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Payment Receipt</h1>
      <div class="sub">${payment.invoiceNumber || 'Receipt #' + payment.id.slice(-8).toUpperCase()}</div>
    </div>
    <div class="body">
      <div class="row"><span class="label">Billed to</span><span class="value">${escapeHtml(tenant?.name || '—')}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(tenant?.email || payment.payerEmail || '—')}</span></div>
      <div class="row"><span class="label">Plan</span><span class="value">${planLabel} · ${cycleLabel}</span></div>
      <div class="row"><span class="label">Description</span><span class="value">${escapeHtml(payment.description || `${planLabel} Plan - ${cycleLabel}`)}</span></div>
      <div class="row"><span class="label">Date paid</span><span class="value">${paidDateStr}</span></div>
      <div class="row"><span class="label">Payment method</span><span class="value">${escapeHtml(payment.paymentProvider === 'paypal' ? 'PayPal' : payment.paymentProvider)}${payment.payerEmail ? ' · ' + escapeHtml(payment.payerEmail) : ''}</span></div>
      <div class="row"><span class="label">Status</span><span class="value"><span class="badge">${statusLabel}</span></span></div>
      ${payment.paypalOrderId ? `<div class="row"><span class="label">PayPal Order ID</span><span class="value">${escapeHtml(payment.paypalOrderId)}</span></div>` : ''}
      <div class="total"><span>Amount paid</span><span>${amountStr} ${payment.currency}</span></div>
    </div>
    <div class="footer">
      <div class="muted">This receipt was issued electronically and is valid without signature. Keep it for your records.</div>
    </div>
    <div class="actions">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Receipt error:', error);
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 });
  }
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
