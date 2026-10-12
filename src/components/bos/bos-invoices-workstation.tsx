'use client';

import React, { useMemo, useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  MessageCircle,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react';
import { BosBrand } from '@/components/bos/brand';
import {
  type BosCustomer,
  type BosProductItem,
   type BosStoreSettings,
  formatBosCurrency,
} from '@/components/bos/bos-types';
import { generateGstInvoiceHtml, numberToWords } from '@/lib/billing/gst-invoice-helper';

type InvoiceDocType =
  | 'gst'
  | 'non_gst'
  | 'quotation'
  | 'proforma'
  | 'credit_note'
  | 'challan';

type InvoiceLineItem = {
  id: string;
  name: string;
  subtitle: string;
  hsnSac: string;
  qty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstRate: number;
};

type SavedBosInvoice = {
  id: string;
  invoiceNumber: string;
  docType: InvoiceDocType;
  customerName: string;
  customerGstin: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
};

type BosInvoicesWorkstationProps = {
  storeSettings: BosStoreSettings;
  customers: BosCustomer[];
  products: BosProductItem[];
  onInvoiceSaved?: (invoice: SavedBosInvoice) => void;
};

export function BosInvoicesWorkstation({
  storeSettings,
  customers,
  products,
  onInvoiceSaved,
}: BosInvoicesWorkstationProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';
  const [docType, setDocType] = useState<InvoiceDocType>('gst');
  const [viewMode, setViewMode] = useState<'create' | 'list'>('create');
  const [previewFormat, setPreviewFormat] = useState<'a4' | 'a5' | 'thermal' | 'green'>('a4');
  const [taxInclusive, setTaxInclusive] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0842');
  const [invoiceDate, setInvoiceDate] = useState('2026-04-24');
  const [dueDate, setDueDate] = useState('2026-05-09');
  const [paymentTerms, setPaymentTerms] = useState('Net 15 Days');
  const [placeOfSupply, setPlaceOfSupply] = useState('27 - Maharashtra');

  const [selectedCustomerName, setSelectedCustomerName] = useState('Mehta General Traders');
  const [selectedCustomerGstin, setSelectedCustomerGstin] = useState('27AADCM4821B1Z2');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('+91 98201 44510');
  const [selectedCustomerAddress, setSelectedCustomerAddress] = useState(
    'Shop 12, APMC Market, Vashi, Navi Mumbai - 400703',
  );

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: 'inv-item-1',
      name: 'India Gate Basmati Rice (Super)',
      subtitle: 'Batch: BG-204 • 5 Kg Pack',
      hsnSac: '10063020',
      qty: 10,
      unit: 'Bag',
      rate: 620,
      discountPercent: 5,
      gstRate: 5,
    },
    {
      id: 'inv-item-2',
      name: 'Fortune Sunlite Refined Oil',
      subtitle: '15 Litre Tin • Wholesale Box',
      hsnSac: '15121910',
      qty: 4,
      unit: 'Tin',
      rate: 1850,
      discountPercent: 0,
      gstRate: 5,
    },
    {
      id: 'inv-item-3',
      name: 'Tata Tea Gold Leaf Pouch',
      subtitle: '500g Pack • Case of 10',
      hsnSac: '09024020',
      qty: 6,
      unit: 'Pack',
      rate: 240,
      discountPercent: 2,
      gstRate: 5,
    },
  ]);

  const [shippingCharge, setShippingCharge] = useState(150);
  const [includeUpiQr, setIncludeUpiQr] = useState(true);
  const [includeBankDetails, setIncludeBankDetails] = useState(true);
  const [allowPartialPayment, setAllowPartialPayment] = useState(true);
  const [paidToday, setPaidToday] = useState(5000);
  const [paymentMode, setPaymentMode] = useState('UPI / QR (GPay)');
  const [termsNotes, setTermsNotes] = useState(
    'Goods once sold will not be taken back. Subject to Mumbai Jurisdiction.',
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [savedInvoices, setSavedInvoices] = useState<SavedBosInvoice[]>([
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0842',
      docType: 'gst',
      customerName: 'Mehta General Traders',
      customerGstin: '27AADCM4821B1Z2',
      date: '24 Apr 2026',
      dueDate: '09 May 2026',
      totalAmount: 15172,
      paidAmount: 5000,
      status: 'Partial',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-0841',
      docType: 'gst',
      customerName: 'Sharma Kirana & Provision',
      customerGstin: '27AAECS1904C1Z9',
      date: '23 Apr 2026',
      dueDate: '23 Apr 2026',
      totalAmount: 8420,
      paidAmount: 8420,
      status: 'Paid',
    },
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-0840',
      docType: 'gst',
      customerName: 'Priya Wellness & Organics',
      customerGstin: '27AAACW3321F1Z1',
      date: '22 Apr 2026',
      dueDate: '07 May 2026',
      totalAmount: 12650,
      paidAmount: 0,
      status: 'Unpaid',
    },
  ]);

  const calculations = useMemo(() => {
    const computedRows = items.map((item) => {
      const gross = item.qty * item.rate;
      const discountAmt = (gross * (item.discountPercent || 0)) / 100;
      const afterDiscount = Math.max(0, gross - discountAmt);
      const effectiveGst = docType === 'non_gst' ? 0 : item.gstRate;

      const taxable = taxInclusive
        ? afterDiscount / (1 + effectiveGst / 100)
        : afterDiscount;
      const taxAmt = (taxable * effectiveGst) / 100;
      const lineTotal = taxable + taxAmt;

      return {
        ...item,
        discountAmt,
        taxable,
        taxAmt,
        lineTotal,
        effectiveGst,
      };
    });

    const totalDiscount = computedRows.reduce((s, r) => s + r.discountAmt, 0);
    const taxableAmount = computedRows.reduce((s, r) => s + r.taxable, 0);
    const totalTax = computedRows.reduce((s, r) => s + r.taxAmt, 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    const rawTotal = taxableAmount + totalTax + (Number(shippingCharge) || 0);
    const grandTotal = Math.round(rawTotal);
    const roundOff = +(grandTotal - rawTotal).toFixed(2);
    const balanceDue = Math.max(0, grandTotal - (Number(paidToday) || 0));

    return {
      computedRows,
      totalDiscount,
      taxableAmount,
      totalTax,
      cgst,
      sgst,
      grandTotal,
      roundOff,
      balanceDue,
      amountInWords: numberToWords(grandTotal),
    };
  }, [items, docType, taxInclusive, shippingCharge, paidToday]);

  const handleAddLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `inv-item-${Date.now()}`,
        name: 'New Product / Service Item',
        subtitle: 'Standard Pack',
        hsnSac: '210690',
        qty: 1,
        unit: 'Pcs',
        rate: 500,
        discountPercent: 0,
        gstRate: 5,
      },
    ]);
  };

  const handleAddFromInventory = () => {
    const pick = products[items.length % Math.max(1, products.length)];
    if (!pick) {
      handleAddLineItem();
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `inv-item-${Date.now()}`,
        name: pick.name,
        subtitle: `SKU: ${pick.sku}`,
        hsnSac: pick.hsnCode || '10063020',
        qty: 2,
        unit: pick.unit || 'Pack',
        rate: pick.price,
        discountPercent: 0,
        gstRate: pick.gstRate ?? 5,
      },
    ]);
  };

  const handlePrintOrDownload = () => {
    const html = generateGstInvoiceHtml(
      {
        number: invoiceNumber,
        date: invoiceDate,
        dueDate,
        customerName: selectedCustomerName,
        customerPhone: selectedCustomerPhone,
        customerGstin: selectedCustomerGstin,
        customerAddress: selectedCustomerAddress,
        placeOfSupply,
        subtotal: Math.round(calculations.taxableAmount),
        tax: Math.round(calculations.totalTax),
        discount: Math.round(calculations.totalDiscount),
        total: calculations.grandTotal,
        balance: calculations.balanceDue,
        status: calculations.balanceDue <= 0 ? 'PAID' : 'PARTIAL',
        items: calculations.computedRows.map((r) => ({
          name: r.name,
          hsn: r.hsnSac,
          qty: r.qty,
          unitPrice: Math.round(r.taxable / Math.max(1, r.qty)),
        })),
      },
      {
        businessName: storeSettings.businessName || 'BOS Supermart & General Store',
        logoUrl: '/bos/primary-logo.png',
        gstin: storeSettings.gstin || '27AABCS1429B1Z5',
        address:
          storeSettings.address ||
          'Shop 4, Green Valley Complex, MG Road, Pune - 411001',
        phone: storeSettings.phone || '+91 98765 43210',
        email: storeSettings.email,
        upiId: storeSettings.upiId || 'sharmastore@okhdfcbank',
      },
      currencySymbol,
    );

    const win = window.open('', '_blank', 'width=900,height=800');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }

    const newSaved: SavedBosInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      docType,
      customerName: selectedCustomerName,
      customerGstin: selectedCustomerGstin,
      date: invoiceDate,
      dueDate,
      totalAmount: calculations.grandTotal,
      paidAmount: paidToday,
      status:
        paidToday >= calculations.grandTotal
          ? 'Paid'
          : paidToday > 0
            ? 'Partial'
            : 'Unpaid',
    };
    setSavedInvoices((prev) => [newSaved, ...prev.filter((x) => x.invoiceNumber !== invoiceNumber)]);
    onInvoiceSaved?.(newSaved);

    // Also persist to /api/invoices in background
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: selectedCustomerName,
        amount: calculations.grandTotal,
        dueDate,
        status: paidToday >= calculations.grandTotal ? 'paid' : 'sent',
      }),
    }).catch(() => {});

    setStatusBanner(`Invoice ${invoiceNumber} saved & opened for printing!`);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = selectedCustomerPhone.replace(/\D/g, '');
    const text = `Hello *${selectedCustomerName}*,\nHere is your GST Tax Invoice *${invoiceNumber}* from *${storeSettings.businessName}*.\n\n• *Taxable Value:* ${formatBosCurrency(Math.round(calculations.taxableAmount), currencySymbol)}\n• *GST (CGST+SGST):* ${formatBosCurrency(Math.round(calculations.totalTax), currencySymbol)}\n• *Total Payable:* ${formatBosCurrency(calculations.grandTotal, currencySymbol)}\n• *Balance Due:* ${formatBosCurrency(calculations.balanceDue, currencySymbol)}\n\nPay via UPI ID: ${storeSettings.upiId || 'sharmastore@okaxis'}`;
    window.open(
      `https://wa.me/${cleanPhone || '919820144510'}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Document Type Tabs & Actions */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'gst', label: 'GST Invoice' },
              { id: 'non_gst', label: 'Non-GST / Bill of Supply' },
              { id: 'quotation', label: 'Quotation / Estimate' },
              { id: 'proforma', label: 'Proforma Invoice' },
              { id: 'credit_note', label: 'Credit / Debit Note' },
              { id: 'challan', label: 'Delivery Challan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setDocType(tab.id);
                setViewMode('create');
              }}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                docType === tab.id && viewMode === 'create'
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'create' ? 'list' : 'create'))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
          >
            <FileText className="h-4 w-4 text-[#0A6847]" />
            <span>{viewMode === 'create' ? `All Invoices (${savedInvoices.length})` : '+ Create Invoice'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]/50"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrintOrDownload}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Printer className="h-4 w-4" />
            <span>Save & Print Invoice</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {statusBanner}
          </span>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="bos-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#111827]">GST & Retail Invoices Register</h2>
              <p className="text-[12.5px] text-[#64748B]">
                All generated tax invoices, credit notes, and payment statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('create')}
              className="bos-btn-primary rounded-xl px-4 py-2 text-[12.5px]"
            >
              + Create GST Invoice
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E4EFEA] text-[11px] font-bold uppercase text-[#64748B]">
                  <th className="py-2.5">Invoice #</th>
                  <th className="py-2.5">Customer & GSTIN</th>
                  <th className="py-2.5">Invoice Date</th>
                  <th className="py-2.5">Due Date</th>
                  <th className="py-2.5">Total Amount</th>
                  <th className="py-2.5">Paid</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6F3]">
                {savedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8FCFA]">
                    <td className="py-3 font-extrabold text-[#111827]">{inv.invoiceNumber}</td>
                    <td className="py-3">
                      <p className="font-bold text-[#111827]">{inv.customerName}</p>
                      <p className="text-[11px] font-mono text-[#64748B]">{inv.customerGstin}</p>
                    </td>
                    <td className="py-3 text-[#475569]">{inv.date}</td>
                    <td className="py-3 text-[#475569]">{inv.dueDate}</td>
                    <td className="py-3 font-extrabold text-[#111827]">
                      {formatBosCurrency(inv.totalAmount, currencySymbol)}
                    </td>
                    <td className="py-3 text-[#0A6847] font-semibold">
                      {formatBosCurrency(inv.paidAmount, currencySymbol)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          inv.status === 'Paid'
                            ? 'bg-[#E6F6F0] text-[#0A6847]'
                            : inv.status === 'Partial'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceNumber(inv.invoiceNumber);
                          setSelectedCustomerName(inv.customerName);
                          setViewMode('create');
                        }}
                        className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-semibold text-[#0A6847]"
                      >
                        Open / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Main Split Layout: Left Invoice Builder (7 cols) + Right Live Preview (5 cols) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left Column: Builder */}
          <div className="lg:col-span-7 space-y-4">
            {/* Invoice Details & Bill To Card */}
            <div className="bos-card p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Invoice Metadata */}
              <div className="space-y-3 border-b md:border-b-0 md:border-r border-[#EDF4F0] pb-3 md:pb-0 md:pr-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13.5px] font-bold text-[#111827]">Invoice Details</h3>
                  <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    FY 2026-27
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-2.5 py-1.5 font-bold text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-2.5 py-1.5 font-semibold text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-1.5 font-medium text-[#334155]"
                    >
                      <option>Due on Receipt</option>
                      <option>Net 15 Days</option>
                      <option>Net 30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                      Place of Supply
                    </label>
                    <select
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-1.5 font-medium text-[#334155]"
                    >
                      <option>27 - Maharashtra</option>
                      <option>29 - Karnataka</option>
                      <option>07 - Delhi</option>
                      <option>24 - Gujarat</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bill To (Customer Details) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13.5px] font-bold text-[#111827]">
                    Bill To (Customer Details)
                  </h3>
                  <span className="rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    ✓ B2B GST Verified
                  </span>
                </div>

                <select
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedCustomerName(name);
                    const found = customers.find((c) => c.name === name);
                    if (found) {
                      setSelectedCustomerPhone(found.phone);
                      setSelectedCustomerAddress(found.address || 'Local Market');
                      setSelectedCustomerGstin(found.gstin || '27AADCM4821B1Z2');
                    }
                  }}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-1.5 text-[12.5px] font-semibold text-[#111827]"
                >
                  <option value="Mehta General Traders">
                    Mehta General Traders (27AADCM4821B1Z2)
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>

                <div className="rounded-xl border border-[#BCE3D4] bg-[#F3FAF7] p-2.5 text-[11.5px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#111827] text-[12.5px]">
                      {selectedCustomerName}
                    </span>
                    <span className="font-mono font-bold text-[#0A6847]">
                      GSTIN: {selectedCustomerGstin}
                    </span>
                  </div>
                  <p className="text-[#475569]">{selectedCustomerAddress}</p>
                  <p className="text-[#64748B]">Phone: {selectedCustomerPhone}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items & GST Breakdown Table */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-[#111827]">
                    Invoice Items & GST Breakdown
                  </h3>
                  <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    Intra-State (CGST + SGST)
                  </span>
                </div>

                <div className="inline-flex rounded-lg bg-[#F1F6F3] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(false)}
                    className={`rounded-md px-2.5 py-1 ${
                      !taxInclusive ? 'bg-[#0A6847] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    Tax Exclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(true)}
                    className={`rounded-md px-2.5 py-1 ${
                      taxInclusive ? 'bg-[#0A6847] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    Tax Inclusive
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#E4EFEA] text-[10px] font-bold uppercase text-[#64748B]">
                      <th className="py-2 pr-1">#</th>
                      <th className="py-2 px-1.5">Item / Description</th>
                      <th className="py-2 px-1.5">HSN/SAC</th>
                      <th className="py-2 px-1.5">Qty</th>
                      <th className="py-2 px-1.5">Rate ({currencySymbol})</th>
                      <th className="py-2 px-1.5">Disc %</th>
                      <th className="py-2 px-1.5">GST %</th>
                      <th className="py-2 px-1.5">Tax Amt</th>
                      <th className="py-2 pl-1.5 text-right">Total ({currencySymbol})</th>
                      <th className="py-2 pl-1" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F6F3]">
                    {calculations.computedRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-[#F8FCFA]">
                        <td className="py-2.5 pr-1 font-semibold text-[#64748B]">{idx + 1}</td>
                        <td className="py-2.5 px-1.5">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id ? { ...it, name: e.target.value } : it,
                                ),
                              )
                            }
                            className="w-full font-bold text-[#111827] bg-transparent focus:outline-hidden"
                          />
                          <p className="text-[10.5px] text-[#64748B]">{row.subtitle}</p>
                        </td>
                        <td className="py-2.5 px-1.5">
                          <input
                            type="text"
                            value={row.hsnSac}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id ? { ...it, hsnSac: e.target.value } : it,
                                ),
                              )
                            }
                            className="w-20 rounded border border-[#E4EFEA] bg-[#F8FCFA] px-1.5 py-1 font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id
                                    ? { ...it, qty: Math.max(1, Number(e.target.value) || 1) }
                                    : it,
                                ),
                              )
                            }
                            className="w-14 rounded border border-[#E4EFEA] bg-white px-1.5 py-1 font-bold text-center"
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <input
                            type="number"
                            value={row.rate}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id
                                    ? { ...it, rate: Math.max(0, Number(e.target.value) || 0) }
                                    : it,
                                ),
                              )
                            }
                            className="w-20 rounded border border-[#E4EFEA] bg-white px-1.5 py-1 font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={row.discountPercent}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id
                                    ? {
                                        ...it,
                                        discountPercent: Math.min(
                                          100,
                                          Math.max(0, Number(e.target.value) || 0),
                                        ),
                                      }
                                    : it,
                                ),
                              )
                            }
                            className="w-12 rounded border border-[#E4EFEA] bg-white px-1.5 py-1 text-center"
                          />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <select
                            value={row.gstRate}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id ? { ...it, gstRate: Number(e.target.value) } : it,
                                ),
                              )
                            }
                            className="rounded bg-[#E6F6F0] px-1.5 py-1 text-[11px] font-bold text-[#0A6847]"
                          >
                            {[0, 5, 12, 18, 28].map((g) => (
                              <option key={g} value={g}>
                                {g}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-1.5 text-[11px] text-[#475569]">
                          <div className="font-semibold text-[#111827]">
                            {formatBosCurrency(Math.round(row.taxAmt), currencySymbol)}
                          </div>
                          <div className="text-[9.5px] text-[#64748B]">
                            {row.effectiveGst / 2}% + {row.effectiveGst / 2}%
                          </div>
                        </td>
                        <td className="py-2.5 pl-1.5 text-right font-extrabold text-[#111827]">
                          {formatBosCurrency(Math.round(row.lineTotal), currencySymbol)}
                        </td>
                        <td className="py-2.5 pl-1 text-right">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setItems((prev) => prev.filter((it) => it.id !== row.id))
                              }
                              className="p-1 text-[#94A3B8] hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EDF4F0]">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#E6F6F0] px-3 py-1.5 text-[12px] font-bold text-[#0A6847] hover:bg-[#D1EFE4]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddFromInventory}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
                >
                  <Package className="h-3.5 w-3.5 text-[#0A6847]" />
                  <span>Select from Inventory</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Payment & Bank Details + Tax & Total Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bos-card p-4 space-y-3">
                <h3 className="text-[13.5px] font-bold text-[#111827]">Payment & Bank Details</h3>

                <div className="space-y-2 text-[12px]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#334155] font-medium">
                      Include UPI QR Code on Invoice
                    </span>
                    <input
                      type="checkbox"
                      checked={includeUpiQr}
                      onChange={(e) => setIncludeUpiQr(e.target.checked)}
                      className="h-4 w-4 accent-[#0A6847]"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#334155] font-medium">Include Bank Account Details</span>
                    <input
                      type="checkbox"
                      checked={includeBankDetails}
                      onChange={(e) => setIncludeBankDetails(e.target.checked)}
                      className="h-4 w-4 accent-[#0A6847]"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#334155] font-medium">
                      Allow Partial / Khata Payment
                    </span>
                    <input
                      type="checkbox"
                      checked={allowPartialPayment}
                      onChange={(e) => setAllowPartialPayment(e.target.checked)}
                      className="h-4 w-4 accent-[#0A6847]"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111827]">Record Payment Now</span>
                    <button
                      type="button"
                      onClick={() => setPaidToday(calculations.grandTotal)}
                      className="text-[11px] font-bold text-[#0A6847] hover:underline"
                    >
                      Mark Fully Paid
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10.5px] text-[#64748B]">Paid Today ({currencySymbol})</span>
                      <input
                        type="number"
                        value={paidToday}
                        onChange={(e) => setPaidToday(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-0.5 w-full rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 font-bold text-[#0A6847]"
                      />
                    </div>
                    <div>
                      <span className="text-[10.5px] text-[#64748B]">Payment Mode</span>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 font-medium"
                      >
                        <option>UPI / QR (GPay)</option>
                        <option>Cash</option>
                        <option>NEFT / RTGS</option>
                        <option>Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E4EFEA] text-[11.5px]">
                    <span className="text-[#64748B]">Balance Due (Khata):</span>
                    <strong className="text-red-600">
                      {formatBosCurrency(calculations.balanceDue, currencySymbol)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bos-card p-4 flex flex-col justify-between space-y-2 text-[12.5px]">
                <div className="space-y-2">
                  <h3 className="text-[13.5px] font-bold text-[#111827]">Tax & Total Summary</h3>
                  <div className="flex justify-between text-[#475569]">
                    <span>Taxable Amount</span>
                    <span className="font-semibold text-[#111827]">
                      {formatBosCurrency(Math.round(calculations.taxableAmount), currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#0A6847]">
                    <span>Total Discount</span>
                    <span>
                      -{formatBosCurrency(Math.round(calculations.totalDiscount), currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#475569]">
                    <span>CGST (2.5%)</span>
                    <span>{formatBosCurrency(Math.round(calculations.cgst), currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-[#475569]">
                    <span>SGST (2.5%)</span>
                    <span>{formatBosCurrency(Math.round(calculations.sgst), currencySymbol)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>Shipping / Freight</span>
                    <input
                      type="number"
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(Number(e.target.value) || 0)}
                      className="w-20 rounded border border-[#DCE9E3] px-2 py-0.5 text-right font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-[#DCE9E3] pt-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-bold text-[#111827]">Total Payable</span>
                    <span className="text-[22px] font-extrabold text-[#0A6847]">
                      {formatBosCurrency(calculations.grandTotal, currencySymbol)}
                    </span>
                  </div>
                  <p className="mt-1 rounded-lg bg-[#E6F6F0]/60 p-2 text-[11px] font-medium text-[#065F46]">
                    <strong>Amount in Words:</strong> {calculations.amountInWords}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Invoice Preview (Featuring the BOS Logo PNG) */}
          <div className="bos-card p-4 lg:col-span-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF4F0] pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <h3 className="text-[13.5px] font-bold text-[#111827]">Live Invoice Preview</h3>
              </div>

              <div className="inline-flex rounded-lg bg-[#F1F6F3] p-0.5 text-[11px] font-semibold">
                {(
                  [
                    { id: 'a4', label: 'A4 Standard' },
                    { id: 'thermal', label: 'Thermal (80mm)' },
                    { id: 'green', label: 'Modern Green' },
                  ] as const
                ).map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setPreviewFormat(fmt.id)}
                    className={`rounded-md px-2 py-1 ${
                      previewFormat === fmt.id ? 'bg-[#0A6847] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Invoice Sheet */}
            <div
              className={`rounded-xl border border-[#DCE9E3] bg-white p-5 shadow-xs space-y-4 ${
                previewFormat === 'thermal' ? 'max-w-[330px] mx-auto font-mono text-[11px]' : 'text-[11.5px]'
              }`}
            >
              {/* Invoice Header with BOS Logo PNG */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E4EFEA] pb-3.5">
                <div>
                  <BosBrand variant="light" />
                  <p className="mt-2 font-bold text-[#111827] text-[12.5px]">
                    {storeSettings.businessName || 'BOS Supermart & General Store'}
                  </p>
                  <p className="text-[10.5px] text-[#64748B]">
                    {storeSettings.address || 'Shop 4, Green Valley Complex, MG Road, Pune - 411001'}
                  </p>
                  <p className="text-[10.5px] font-semibold text-[#0A6847] mt-0.5">
                    GSTIN: {storeSettings.gstin || '27AABCS1429B1Z5'} • State: 27-Maharashtra
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[14px] font-extrabold tracking-tight text-[#111827] block">
                    {docType === 'gst'
                      ? 'TAX INVOICE'
                      : docType === 'quotation'
                        ? 'ESTIMATE / QUOTATION'
                        : 'BILL OF SUPPLY'}
                  </span>
                  <span className="mt-1 inline-block rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10px] font-bold text-[#0A6847]">
                    Original for Recipient
                  </span>
                  <div className="mt-2 text-[10.5px] text-[#475569] space-y-0.5">
                    <p>
                      Invoice No: <strong className="text-[#111827]">{invoiceNumber}</strong>
                    </p>
                    <p>Date: {invoiceDate}</p>
                    <p>Due Date: {dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Buyer Block */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#F8FCFA] p-2.5 border border-[#EDF4F0]">
                <div>
                  <p className="text-[9.5px] font-bold uppercase text-[#64748B]">Billed To</p>
                  <p className="font-bold text-[#111827]">{selectedCustomerName}</p>
                  <p className="text-[10.5px] text-[#64748B]">{selectedCustomerAddress}</p>
                  <p className="text-[10.5px] font-semibold text-[#0A6847]">
                    GSTIN: {selectedCustomerGstin}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9.5px] font-bold uppercase text-[#64748B]">Supply Details</p>
                  <p className="font-semibold text-[#111827]">Place: {placeOfSupply}</p>
                  <p className="text-[10.5px] text-[#64748B]">Terms: {paymentTerms}</p>
                  <p className="text-[10.5px] text-[#64748B]">Reverse Charge: No</p>
                </div>
              </div>

              {/* Items Table in Preview */}
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-y border-[#DCE9E3] bg-[#F1F6F3] text-[9.5px] font-bold uppercase text-[#334155]">
                    <th className="py-1.5 px-1.5">Item</th>
                    <th className="py-1.5 px-1">HSN</th>
                    <th className="py-1.5 px-1 text-center">Qty</th>
                    <th className="py-1.5 px-1 text-right">Taxable</th>
                    <th className="py-1.5 px-1 text-right">GST</th>
                    <th className="py-1.5 px-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF4F0]">
                  {calculations.computedRows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-1.5 font-semibold text-[#111827]">{r.name}</td>
                      <td className="py-1.5 px-1 font-mono text-[10px] text-[#64748B]">{r.hsnSac}</td>
                      <td className="py-1.5 px-1 text-center">
                        {r.qty} {r.unit}
                      </td>
                      <td className="py-1.5 px-1 text-right">
                        {formatBosCurrency(Math.round(r.taxable), currencySymbol)}
                      </td>
                      <td className="py-1.5 px-1 text-right">
                        {formatBosCurrency(Math.round(r.taxAmt), currencySymbol)}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-bold text-[#111827]">
                        {formatBosCurrency(Math.round(r.lineTotal), currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer QR & Totals */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DCE9E3] items-end">
                <div className="space-y-1.5">
                  {includeBankDetails && (
                    <div className="text-[10px] text-[#475569]">
                      <p className="font-bold text-[#111827]">Bank Details:</p>
                      <p>{storeSettings.bankName || 'HDFC Bank'} • A/C: {storeSettings.accountNumber || '50200048291042'}</p>
                      <p>IFSC: {storeSettings.ifscCode || 'HDFC0001204'}</p>
                    </div>
                  )}
                  {includeUpiQr && (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-[#DCE9E3] bg-[#F8FCFA] p-1.5">
                      <QrCode className="h-9 w-9 text-[#0A6847] shrink-0" />
                      <div className="text-[9.5px]">
                        <p className="font-bold text-[#0A6847]">
                          Pay {formatBosCurrency(calculations.grandTotal, currencySymbol)} via UPI
                        </p>
                        <p className="text-[#64748B]">{storeSettings.upiId || 'bosstore@okhdfcbank'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Taxable:</span>
                    <span>{formatBosCurrency(Math.round(calculations.taxableAmount), currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>CGST + SGST:</span>
                    <span>{formatBosCurrency(Math.round(calculations.totalTax), currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#DCE9E3] pt-1 text-[13.5px] font-extrabold text-[#0A6847]">
                    <span>Grand Total:</span>
                    <span>{formatBosCurrency(calculations.grandTotal, currencySymbol)}</span>
                  </div>
                  <div className="pt-3 text-[10px] text-[#64748B]">
                    <p className="font-semibold text-[#111827]">
                      For {storeSettings.businessName || 'BOS Supermart'}
                    </p>
                    <p className="mt-2 italic">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom E-Invoice / E-Way Bill / PDF Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusBanner(`Generated E-Invoice IRN for ${invoiceNumber}`);
                  setTimeout(() => setStatusBanner(null), 3000);
                }}
                className="rounded-xl border border-[#DCE9E3] bg-white py-2 px-2 text-[11.5px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
              >
                E-Invoice (IRN)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusBanner(`Generated E-Way Bill for ${invoiceNumber}`);
                  setTimeout(() => setStatusBanner(null), 3000);
                }}
                className="rounded-xl border border-[#DCE9E3] bg-white py-2 px-2 text-[11.5px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
              >
                E-Way Bill
              </button>
              <button
                type="button"
                onClick={handlePrintOrDownload}
                className="bos-btn-primary rounded-xl py-2 px-2 text-[11.5px] inline-flex items-center justify-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
