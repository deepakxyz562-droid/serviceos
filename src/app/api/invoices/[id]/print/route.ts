import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/invoices/[id]/print
 * ──────────────────────────────
 * Returns a printable HTML view of a single invoice. The customer (or admin)
 * can open this URL in a new tab and use the browser's "Print → Save as PDF"
 * flow to download a PDF copy. This is the lightweight equivalent of a full
 * PDF rendering service — no headless browser, no Puppeteer, no S3 upload.
 *
 * Access control mirrors GET /api/invoices/[id]:
 *   - Customer sessions: may view ONLY their own invoices (invoice.customerId
 *     must equal authUser.id). Returns 404 (not 403) for invoices that don't
 *     belong to the customer to avoid leaking existence.
 *   - Admin/employee sessions: may view any invoice in their tenant.
 *   - Unauthenticated requests: denied (401).
 *
 * Output: `Content-Type: text/html` (a self-contained printable page with a
 * "Print / Save as PDF" button that triggers `window.print()`).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        job: {
          select: { id: true, title: true, jobNumber: true, status: true },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            country: true,
            currency: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Customer session: enforce ownership. Return 404 (not 403) to avoid
    // leaking the existence of invoices that don't belong to the customer.
    if (authUser.role === 'customer') {
      if (invoice.customerId !== authUser.id) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
    }

    // ── Parse line items from itemsJson ──────────────────────────────────
    type LineItem = {
      description?: string;
      quantity?: number;
      rate?: number;
      unitPrice?: number;
      amount?: number;
    };
    let lineItems: LineItem[] = [];
    try {
      const parsed = JSON.parse(invoice.itemsJson || '[]');
      if (Array.isArray(parsed)) lineItems = parsed as LineItem[];
    } catch {
      // Malformed itemsJson — render with an empty line-items table and the
      // stored subtotal/tax/discount/total instead.
      lineItems = [];
    }

    // ── Currency formatting ──────────────────────────────────────────────
    const currency = invoice.currency || 'USD';
    const currencySymbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || `${currency} `;
    const fmt = (n: number | null | undefined) =>
      `${currencySymbol}${(Number(n) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // ── Date formatting ──────────────────────────────────────────────────
    const fmtDate = (d: Date | string | null | undefined) => {
      if (!d) return '—';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const statusLabel = invoice.status
      ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
      : 'Draft';

    const statusBadgeClass =
      invoice.status === 'paid'
        ? 'background:#dcfce7;color:#166534;'
        : invoice.status === 'cancelled'
        ? 'background:#fee2e2;color:#991b1b;'
        : 'background:#fef9c3;color:#854d0e;';

    // ── Build the HTML ───────────────────────────────────────────────────
    const lineItemsRows = lineItems.length
      ? lineItems
          .map(
            (item) => `
            <tr>
              <td>${escapeHtml(item.description || '—')}</td>
              <td class="num">${Number(item.quantity ?? 1).toLocaleString('en-US')}</td>
              <td class="num">${fmt(item.rate ?? item.unitPrice ?? 0)}</td>
              <td class="num">${fmt(item.amount ?? (Number(item.quantity ?? 1) * Number(item.rate ?? item.unitPrice ?? 0)))}</td>
            </tr>`
          )
          .join('')
      : `
            <tr>
              <td colspan="4" class="muted" style="text-align:center;padding:18px;">No line items recorded — subtotal shown below reflects the invoice total.</td>
            </tr>`;

    const tenantName = invoice.tenant?.name || 'Service Provider';
    const tenantAddress = [invoice.tenant?.address, invoice.tenant?.country]
      .filter(Boolean)
      .join(', ');
    const tenantContact = [invoice.tenant?.email, invoice.tenant?.phone]
      .filter(Boolean)
      .join(' · ');

    const customerName = invoice.customer?.name || 'Valued Customer';
    const customerAddress = invoice.customer?.address || '';
    const customerContact = [invoice.customer?.email, invoice.customer?.phone]
      .filter(Boolean)
      .join(' · ');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoice.number)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #f8fafc; }
  .invoice { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #0f766e, #14b8a6); color: #fff; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .header .sub { margin-top: 4px; font-size: 13px; opacity: 0.9; }
  .header .meta { text-align: right; font-size: 13px; opacity: 0.95; }
  .header .meta .num { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 14px; font-weight: 600; }
  .parties { display: flex; justify-content: space-between; gap: 24px; padding: 24px 36px; flex-wrap: wrap; border-bottom: 1px solid #f1f5f9; }
  .party .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .party .name { font-weight: 600; font-size: 14px; }
  .party .detail { color: #64748b; font-size: 12px; margin-top: 2px; }
  .body { padding: 0 36px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  thead th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th.num { text-align: right; }
  tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; padding: 20px 0 8px; }
  .totals table { width: 280px; }
  .totals td { padding: 6px 0; font-size: 13px; border: 0; }
  .totals td.label { color: #64748b; }
  .totals td.value { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .totals .grand { border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 6px; font-size: 18px; font-weight: 700; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; ${statusBadgeClass} }
  .notes { padding: 16px 0 0; color: #475569; font-size: 12px; border-top: 1px solid #f1f5f9; margin-top: 16px; }
  .muted { color: #64748b; }
  .footer { padding: 18px 36px 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  .actions { padding: 0 36px 28px; }
  button { background: #0f172a; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 13px; cursor: pointer; }
  button.secondary { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; margin-left: 8px; }
  @media print { body { background: #fff; padding: 0; } .actions { display: none; } .invoice { border: 0; border-radius: 0; } }
</style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <h1>INVOICE</h1>
        <div class="sub">${escapeHtml(tenantName)}</div>
        ${tenantAddress ? `<div class="sub">${escapeHtml(tenantAddress)}</div>` : ''}
        ${tenantContact ? `<div class="sub">${escapeHtml(tenantContact)}</div>` : ''}
      </div>
      <div class="meta">
        <div class="num">#${escapeHtml(invoice.number)}</div>
        <div style="margin-top:6px;">Issued: ${fmtDate(invoice.createdAt)}</div>
        <div>Due: ${fmtDate(invoice.dueDate)}</div>
        <div style="margin-top:6px;"><span class="badge">${escapeHtml(statusLabel)}</span></div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="label">Billed to</div>
        <div class="name">${escapeHtml(customerName)}</div>
        ${customerAddress ? `<div class="detail">${escapeHtml(customerAddress)}</div>` : ''}
        ${customerContact ? `<div class="detail">${escapeHtml(customerContact)}</div>` : ''}
      </div>
      ${invoice.job ? `
      <div class="party">
        <div class="label">Related job</div>
        <div class="name">${escapeHtml(invoice.job.title)}</div>
        ${invoice.job.jobNumber ? `<div class="detail">Job #${escapeHtml(invoice.job.jobNumber)}</div>` : ''}
      </div>` : ''}
    </div>

    <div class="body">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num" style="width:60px;">Qty</th>
            <th class="num" style="width:110px;">Rate</th>
            <th class="num" style="width:130px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsRows}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tbody>
            <tr><td class="label">Subtotal</td><td class="value">${fmt(invoice.amount)}</td></tr>
            <tr><td class="label">Tax</td><td class="value">${fmt(invoice.tax)}</td></tr>
            ${invoice.discount > 0 ? `<tr><td class="label">Discount</td><td class="value">-${fmt(invoice.discount)}</td></tr>` : ''}
            <tr class="grand"><td class="label">Total</td><td class="value">${fmt(invoice.total)}</td></tr>
            <tr><td class="label">Amount paid</td><td class="value">${invoice.status === 'paid' ? fmt(invoice.total) : fmt(0)}</td></tr>
            <tr><td class="label">Balance due</td><td class="value">${invoice.status === 'paid' ? fmt(0) : fmt(invoice.total)}</td></tr>
          </tbody>
        </table>
      </div>

      ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><br />${escapeHtml(invoice.notes)}</div>` : ''}
    </div>

    <div class="footer">
      <div>Invoice #${escapeHtml(invoice.number)} · ${fmtDate(invoice.createdAt)} · ${escapeHtml(statusLabel)}${invoice.paidAt ? ` · Paid ${fmtDate(invoice.paidAt)}` : ''}</div>
      <div style="margin-top:4px;">This invoice was issued electronically by ${escapeHtml(tenantName)}. Please retain it for your records.</div>
    </div>

    <div class="actions">
      <button onclick="window.print()">Print / Save as PDF</button>
      <button class="secondary" onclick="window.close()">Close</button>
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
    console.error('Print invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to generate printable invoice' },
      { status: 500 }
    );
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED ',
  ZAR: 'R ',
};

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
