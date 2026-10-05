export interface GstStoreInfo {
  businessName: string;
  logoUrl?: string;
  signatureUrl?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  upiId?: string;
  billFooter?: string;
}

export function numberToWords(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowHundred(n: number): string {
    if (n < 10) return units[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += `${units[hundred]} Hundred `;
    if (rest > 0) str += convertBelowHundred(rest);
    return str.trim();
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let words = '';
  if (crore > 0) words += `${convertThreeDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertThreeDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertThreeDigits(thousand)} Thousand `;
  if (remainder > 0) words += convertThreeDigits(remainder);

  return `${words.trim()} Rupees Only`;
}

export function generateGstInvoiceHtml(
  inv: any,
  store: GstStoreInfo,
  currencySymbol = '₹'
): string {
  const taxable = Number(inv.subtotal || inv.total - (inv.tax || 0)) || 0;
  const tax = Number(inv.tax || 0);
  const cgst = tax / 2;
  const sgst = tax / 2;
  const discount = Number(inv.discount || 0);
  const total = Number(inv.total || 0);
  const isPaid = Number(inv.balance || 0) <= 0 || inv.status === 'PAID';
  const effectiveRate = taxable > 0 ? Math.round((tax / taxable) * 100) : 18;
  const halfRate = (effectiveRate / 2).toFixed(1).replace('.0', '');

  const upiLink = store.upiId
    ? `upi://pay?pa=${encodeURIComponent(store.upiId)}&pn=${encodeURIComponent(
        store.businessName || 'Store'
      )}&am=${total.toFixed(2)}&tn=${encodeURIComponent(`Invoice ${inv.number}`)}&cu=INR`
    : '';

  const qrUrl = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`
    : '';

  const itemsRows = (inv.items || [])
    .map((item: any, idx: number) => {
      const itemQty = Number(item.qty) || 1;
      const itemRate = Number(item.unitPrice) || 0;
      const itemAmount = itemQty * itemRate;
      const itemCgst = itemAmount * (effectiveRate / 200);
      const itemSgst = itemCgst;
      const itemTotal = itemAmount + itemCgst + itemSgst;

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <strong>${item.description || 'Item'}</strong>
          </td>
          <td style="text-align: center;">${item.hsnCode || '—'}</td>
          <td style="text-align: center;">${itemQty}</td>
          <td style="text-align: right;">${currencySymbol}${itemRate.toFixed(2)}</td>
          <td style="text-align: right;">${currencySymbol}${itemAmount.toFixed(2)}</td>
          <td style="text-align: right;">${halfRate}% (${currencySymbol}${itemCgst.toFixed(2)})</td>
          <td style="text-align: right;">${halfRate}% (${currencySymbol}${itemSgst.toFixed(2)})</td>
          <td style="text-align: right; font-weight: bold;">${currencySymbol}${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${inv.number}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .store-name {
      font-size: 22px;
      font-weight: 900;
      color: #1e1b4b;
      margin: 0 0 4px 0;
    }
    .invoice-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #4f46e5;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .sub-badge {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .two-col {
      width: 100%;
      margin-bottom: 14px;
      border-collapse: separate;
      border-spacing: 10px 0;
    }
    .card-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      vertical-align: top;
      background: #f8fafc;
      font-size: 11px;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      color: #4f46e5;
      text-transform: uppercase;
      margin-bottom: 6px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .items-table th {
      background: #4f46e5;
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      padding: 8px 6px;
      border: 1px solid #4338ca;
    }
    .items-table td {
      padding: 7px 6px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .totals-wrap {
      width: 100%;
      margin-top: 8px;
    }
    .totals-table {
      width: 320px;
      margin-left: auto;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 5px 8px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
    }
    .grand-total-row td {
      font-size: 14px;
      font-weight: 900;
      background: #e0e7ff;
      color: #312e81;
      border-top: 2px solid #4f46e5;
      border-bottom: 2px solid #4f46e5;
      padding: 8px;
    }
    .words-box {
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 6px;
      font-style: italic;
      font-size: 11px;
      margin-top: 10px;
    }
    .footer-table {
      width: 100%;
      margin-top: 26px;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
    }
    .qr-container {
      text-align: center;
      width: 140px;
    }
    .signature-container {
      text-align: right;
      width: 220px;
    }
    .signature-line {
      border-top: 1px solid #475569;
      margin-top: 40px;
      padding-top: 4px;
      font-weight: 700;
      font-size: 11px;
      color: #1e293b;
    }
    .paid-stamp {
      display: inline-block;
      border: 2px solid #059669;
      color: #059669;
      font-weight: 900;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
      letter-spacing: 1px;
    }
    .unpaid-stamp {
      display: inline-block;
      border: 2px solid #d97706;
      color: #d97706;
      font-weight: 900;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <table class="header-table" cellpadding="0" cellspacing="0">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        ${
          store.logoUrl
            ? `<img src="${store.logoUrl}" style="max-height: 55px; max-width: 140px; object-fit: contain; margin-bottom: 6px;" alt="Logo" /><br/>`
            : ''
        }
        <h1 class="store-name">${store.businessName || 'Business Store'}</h1>
        ${store.gstin ? `<div style="font-weight: bold; color: #475569;">GSTIN: ${store.gstin}</div>` : ''}
        ${store.address ? `<div>${store.address}</div>` : ''}
        ${store.phone ? `<div>Phone: ${store.phone}</div>` : ''}
        ${store.email ? `<div>Email: ${store.email}</div>` : ''}
      </td>
      <td style="vertical-align: top; text-align: right; width: 40%;">
        <div class="invoice-badge">TAX INVOICE</div>
        <div class="sub-badge">Original for Recipient</div>
        <div style="margin-top: 10px; font-size: 14px; font-weight: 900; font-family: monospace;">${inv.number}</div>
        <div style="color: #64748b; font-size: 11px;">Date: ${new Date(inv.createdAt).toLocaleDateString('en-IN')}</div>
        ${inv.dueDate ? `<div style="color: #64748b; font-size: 11px;">Due: ${new Date(inv.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
        <div style="margin-top: 8px;">
          ${
            isPaid
              ? `<span class="paid-stamp">PAID ✓</span>`
              : `<span class="unpaid-stamp">PAYMENT DUE</span>`
          }
        </div>
      </td>
    </tr>
  </table>

  <!-- Customer & Supply Details -->
  <table class="two-col" cellpadding="0" cellspacing="0">
    <tr>
      <td class="card-box" style="width: 50%;">
        <div class="card-title">Billed To (Customer)</div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${inv.customer?.name || 'Walk-in Client'}</div>
        ${inv.customer?.phone ? `<div>Phone: ${inv.customer.phone}</div>` : ''}
        ${inv.customer?.email ? `<div>Email: ${inv.customer.email}</div>` : ''}
        ${inv.customer?.address ? `<div>Address: ${inv.customer.address}</div>` : ''}
        ${inv.customer?.gstin ? `<div style="font-weight: bold; margin-top: 2px;">Customer GSTIN: ${inv.customer.gstin}</div>` : ''}
      </td>
      <td class="card-box" style="width: 50%;">
        <div class="card-title">Invoice &amp; Payment Details</div>
        <div><strong>Invoice #:</strong> ${inv.number}</div>
        <div><strong>Status:</strong> ${inv.status || (isPaid ? 'PAID' : 'UNPAID')}</div>
        ${inv.paymentMethod ? `<div><strong>Payment Mode:</strong> ${inv.paymentMethod}</div>` : ''}
        <div><strong>State of Supply:</strong> Intra-State (CGST + SGST)</div>
        <div><strong>Reverse Charge:</strong> No</div>
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 32%;">Item Description</th>
        <th style="width: 10%;">HSN/SAC</th>
        <th style="width: 7%;">Qty</th>
        <th style="width: 11%; text-align: right;">Rate</th>
        <th style="width: 11%; text-align: right;">Taxable</th>
        <th style="width: 12%; text-align: right;">CGST</th>
        <th style="width: 12%; text-align: right;">SGST</th>
        <th style="width: 12%; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Summary Table -->
  <div class="totals-wrap">
    <table class="totals-table">
      <tr>
        <td style="color: #64748b;">Taxable Subtotal</td>
        <td style="text-align: right; font-weight: bold;">${currencySymbol}${taxable.toFixed(2)}</td>
      </tr>
      ${
        discount > 0
          ? `<tr>
              <td style="color: #059669;">Special Discount</td>
              <td style="text-align: right; color: #059669; font-weight: bold;">-${currencySymbol}${discount.toFixed(2)}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="color: #64748b;">CGST (${halfRate}%)</td>
        <td style="text-align: right; font-weight: bold;">${currencySymbol}${cgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">SGST (${halfRate}%)</td>
        <td style="text-align: right; font-weight: bold;">${currencySymbol}${sgst.toFixed(2)}</td>
      </tr>
      <tr class="grand-total-row">
        <td>Total Invoice Value</td>
        <td style="text-align: right;">${currencySymbol}${total.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">Amount Paid</td>
        <td style="text-align: right; font-weight: bold; color: ${isPaid ? '#059669' : '#0f172a'};">
          ${currencySymbol}${isPaid ? total.toFixed(2) : (Number(inv.paidAmount) || 0).toFixed(2)}
        </td>
      </tr>
      ${
        !isPaid
          ? `<tr style="color: #d97706; font-weight: bold;">
              <td>Balance Due</td>
              <td style="text-align: right;">${currencySymbol}${total.toFixed(2)}</td>
            </tr>`
          : ''
      }
    </table>
  </div>

  <!-- Amount in Words -->
  <div class="words-box">
    <strong>Total in Words:</strong> ${numberToWords(total)}
  </div>

  <!-- Footer with UPI QR & Signature Stamp -->
  <table class="footer-table" cellpadding="0" cellspacing="0">
    <tr>
      <td style="vertical-align: top; width: 50%;">
        ${
          qrUrl
            ? `
            <div style="display: inline-block; vertical-align: top; text-align: center; margin-right: 14px;">
              <img src="${qrUrl}" class="qr-img" style="border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px;" alt="UPI QR" />
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Scan &amp; Pay via UPI</div>
            </div>`
            : ''
        }
        <div style="display: inline-block; vertical-align: top; font-size: 10px; color: #64748b; max-width: 240px;">
          <strong>Terms &amp; Conditions:</strong><br/>
          ${store.billFooter || '1. Goods once sold will not be taken back.<br/>2. Interest @18% p.a. will be charged if payment is not made within due date.'}
          ${inv.notes ? `<div style="margin-top: 6px;"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
        </div>
      </td>
      <td class="signature-container" style="vertical-align: bottom;">
        ${
          store.signatureUrl
            ? `<img src="${store.signatureUrl}" style="max-height: 48px; max-width: 140px; object-fit: contain; margin-bottom: 2px;" alt="Signature" /><br/>`
            : ''
        }
        <div class="signature-line">
          For ${store.businessName || 'Business'}<br/>
          <span style="font-weight: normal; font-size: 9px; color: #64748b;">Authorized Signatory</span>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
