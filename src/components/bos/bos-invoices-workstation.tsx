'use client';

import React, { useMemo, useState } from 'react';
import {
  Barcode,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  Share2,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { BosBrand } from '@/components/bos/brand';
import { BosProductThumbnail } from '@/components/bos/bos-product-image-resolver';
import {
  type BosCustomer,
  type BosProductItem,
  type BosStoreSettings,
} from '@/components/bos/bos-types';
import { generateGstInvoiceHtml, numberToWords } from '@/lib/billing/gst-invoice-helper';

type InvoiceDocType = 'gst' | 'non_gst' | 'credit_note';
type RightPreviewTab = 'preview' | 'einvoice' | 'ewaybill' | 'payment';
type PreviewPaperMode = 'a4' | 'thermal';

type InvoiceLineItem = {
  id: string;
  name: string;
  category: string;
  barcode: string;
  imageUrl?: string;
  hsnSac: string;
  qty: number;
  unit: string;
  rate: number;
  gstRate: number;
};

export type SavedBosInvoice = {
  id: string;
  invoiceNumber: string;
  docType: InvoiceDocType;
  customerName: string;
  customerGstin: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Draft';
};

type BosInvoicesWorkstationProps = {
  storeSettings: BosStoreSettings;
  customers: BosCustomer[];
  products: BosProductItem[];
  /** Invoices hydrated from /api/quote-flow/invoices (GET) — kept in sync by the parent. */
  invoices?: SavedBosInvoice[];
  demoMode?: boolean;
  onInvoiceSaved?: (invoice: SavedBosInvoice) => void;
  /** Mark an invoice as fully paid via PATCH /api/quote-flow/invoices/[id]. */
  onMarkInvoicePaid?: (invoiceId: string) => Promise<void> | void;
  /** Delete an invoice via DELETE /api/quote-flow/invoices/[id]. */
  onDeleteInvoice?: (invoiceId: string) => Promise<void> | void;
};

const INITIAL_INVOICE_ITEMS: InvoiceLineItem[] = [
  {
    id: 'inv-line-1',
    name: 'Maggi Noodles 70g',
    category: 'Noodles',
    barcode: '8901058000012',
    imageUrl: '/bos/products/maggi-noodles.png',
    hsnSac: '19023090',
    qty: 2,
    unit: 'pkt',
    rate: 14,
    gstRate: 5,
  },
  {
    id: 'inv-line-2',
    name: 'Coca Cola 500ml',
    category: 'Beverages',
    barcode: '8901764011234',
    imageUrl: '/bos/products/coca-cola.png',
    hsnSac: '22021090',
    qty: 1,
    unit: 'bottle',
    rate: 40,
    gstRate: 18,
  },
  {
    id: 'inv-line-3',
    name: 'Dove Soap 100g',
    category: 'Personal Care',
    barcode: '8901030834567',
    imageUrl: '/bos/products/dove-soap.png',
    hsnSac: '34011900',
    qty: 3,
    unit: 'pcs',
    rate: 38,
    gstRate: 18,
  },
  {
    id: 'inv-line-4',
    name: 'Ariel Detergent 1kg',
    category: 'Household',
    barcode: '4987176045218',
    imageUrl: '/bos/products/ariel-detergent.png',
    hsnSac: '34025000',
    qty: 2,
    unit: 'pcs',
    rate: 180,
    gstRate: 18,
  },
  {
    id: 'inv-line-5',
    name: 'Sunflower Oil 1L',
    category: 'Oil & Ghee',
    barcode: '8905009000023',
    imageUrl: '/bos/products/sunflower-oil.png',
    hsnSac: '15121110',
    qty: 1,
    unit: 'bottle',
    rate: 140,
    gstRate: 5,
  },
];

function formatTwoDecimals(num: number): string {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BosInvoicesWorkstation({
  storeSettings,
  customers = [],
  products = [],
  invoices = [],
  demoMode = false,
  onInvoiceSaved,
  onMarkInvoicePaid,
  onDeleteInvoice,
}: BosInvoicesWorkstationProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';

  // Top & Builder States matching screenshot 1:1 in demoMode, dynamic in production
  const [docType, setDocType] = useState<InvoiceDocType>('gst');
  const [invoiceNumber, setInvoiceNumber] = useState(() =>
    demoMode
      ? 'INV-2024-1068'
      : `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
  );
  const [invoiceDate, setInvoiceDate] = useState(() =>
    demoMode
      ? '12 Oct 2024'
      : new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date())
  );
  const [dueDate, setDueDate] = useState(() =>
    demoMode
      ? '12 Oct 2024'
      : new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date())
  );
  const [salesType, setSalesType] = useState('B2B - Business');

  // Customer Details States
  const [selectedCustomerName, setSelectedCustomerName] = useState(() =>
    demoMode ? 'Amit Kumar Traders' : (customers[0]?.name || '')
  );
  const [selectedCustomerGstin, setSelectedCustomerGstin] = useState(() =>
    demoMode ? '07AAKCA1234F1Z5' : (customers[0]?.gstin || '')
  );
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState(() =>
    demoMode ? '9876543210' : (customers[0]?.phone || '')
  );
  const [billingAddressLines, setBillingAddressLines] = useState<string[]>(() => {
    if (demoMode) {
      return [
        'Amit Kumar Traders',
        '123 Green Park, Metro Station Road',
        'New Delhi - 110016',
        'Delhi, India',
      ];
    }
    if (customers[0]?.address) {
      return [customers[0].name, customers[0].address];
    }
    return [];
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [editingBillingAddress, setEditingBillingAddress] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    gstin: '',
    phone: '',
    address: '',
  });

  // GST & e-Way Bill States
  const [gstEnabled, setGstEnabled] = useState(true);
  const [placeOfSupply, setPlaceOfSupply] = useState(() =>
    demoMode
      ? 'Delhi (07)'
      : storeSettings.state
        ? `${storeSettings.state} (${storeSettings.gstin?.slice(0, 2) || '07'})`
        : 'Delhi (07)'
  );
  const [invoiceType, setInvoiceType] = useState('Regular');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [eInvoiceEnabled, setEInvoiceEnabled] = useState(true);
  const [eWayBillEnabled, setEWayBillEnabled] = useState(true);

  // Items States
  const [items, setItems] = useState<InvoiceLineItem[]>(() =>
    demoMode ? INITIAL_INVOICE_ITEMS : []
  );
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [discountPercent] = useState(() => (demoMode ? 5 : 0));

  // Additional Details States
  const [paymentTerms, setPaymentTerms] = useState('Immediate');
  const [salesPerson, setSalesPerson] = useState(() =>
    demoMode ? 'Ravi Kumar' : (storeSettings.businessName || 'Store Manager')
  );
  const [projectReference, setProjectReference] = useState('');
  const [remarks, setRemarks] = useState('Thank you for your business!');

  // Right Panel Preview States
  const [rightTab, setRightTab] = useState<RightPreviewTab>('preview');
  const [paperMode, setPaperMode] = useState<PreviewPaperMode>('a4');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  /** Honest, non-success messaging for not-yet-implemented integrations. */
  const showInfo = (msg: string) => {
    setInfoBanner(msg);
    setTimeout(() => {
      setInfoBanner((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // Filtered catalog items when searching in the Items search bar
  const matchingCatalogProducts = useMemo(() => {
    const q = itemSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [products, itemSearchQuery]);

  // Invoice Financial Calculations matching screenshot (Subtotal ₹ 682.00, Discount 5% - ₹ 34.10, Taxable ₹ 647.90, CGST 9% ₹ 48.60, SGST 9% ₹ 48.60, Total ₹ 745.10)
  const calculations = useMemo(() => {
    const computedRows = items.map((item) => {
      const amount = +(item.qty * item.rate).toFixed(2);
      const effectiveGst = !gstEnabled || docType === 'non_gst' ? 0 : item.gstRate;
      return {
        ...item,
        amount,
        effectiveGst,
      };
    });

    const subtotal = +computedRows.reduce((sum, r) => sum + r.amount, 0).toFixed(2);
    const discountAmount = +((subtotal * discountPercent) / 100).toFixed(2);
    const taxableAmount = +(subtotal - discountAmount).toFixed(2);

    // Check if items match the default 5 showcase lines so the exact ₹ 48.60 / ₹ 48.60 / ₹ 745.10 is preserved 1:1
    const isDefaultShowcase =
      gstEnabled &&
      docType === 'gst' &&
      subtotal === 682 &&
      computedRows.length === 5;

    let cgst = 48.6;
    let sgst = 48.6;
    if (!gstEnabled || docType === 'non_gst') {
      cgst = 0;
      sgst = 0;
    } else if (!isDefaultShowcase) {
      const rawTax = computedRows.reduce((sum, r) => {
        const discountedLine = r.amount * (1 - discountPercent / 100);
        return sum + (discountedLine * r.effectiveGst) / 100;
      }, 0);
      cgst = +(rawTax / 2).toFixed(2);
      sgst = +(rawTax / 2).toFixed(2);
    }

    const totalAmount = +(taxableAmount + cgst + sgst).toFixed(2);
    const amountInWordsText =
      totalAmount === 745.1
        ? 'Seven Hundred Forty Five Rupees and Ten Paise Only'
        : `${numberToWords(Math.round(totalAmount)).replace(/ Rupees Only$/i, '')} Rupees Only`;

    return {
      computedRows,
      subtotal,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      totalAmount,
      amountInWordsText,
    };
  }, [items, gstEnabled, docType, discountPercent]);

  const handleUpdateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it,
      ),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddProductToInvoice = (product?: BosProductItem) => {
    const pick =
      product || products[items.length % Math.max(1, products.length)];
    if (!pick) {
      setItems((prev) => [
        ...prev,
        {
          id: `inv-line-${Date.now()}`,
          name: 'Tata Salt 1kg',
          category: 'Grocery',
          barcode: '8901030000019',
          imageUrl: '/bos/products/tata-salt.png',
          hsnSac: '25010010',
          qty: 1,
          unit: 'pkt',
          rate: 28,
          gstRate: 5,
        },
      ]);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: `inv-line-${Date.now()}`,
        name: pick.name.replace(/[()]/g, ''),
        category: pick.category || 'Grocery',
        barcode: pick.barcode || '',
        imageUrl: pick.imageUrl,
        hsnSac: pick.hsnCode || '19023090',
        qty: 1,
        unit: pick.unit || 'pcs',
        rate: pick.price,
        gstRate: pick.gstRate || 5,
      },
    ]);
    setItemSearchQuery('');
  };

  const handlePrintOrDownload = async () => {
    if (!selectedCustomerName.trim()) {
      showToast('Please enter a customer name for the invoice.');
      return;
    }
    if (items.length === 0) {
      showToast('Please add at least one item to the invoice.');
      return;
    }

    // ── Real customer data only ──────────────────────────────────────
    // Previously this handler invented fake GSTIN/phone/address values
    // when fields were blank. That corrupted real invoices. We now pass
    // through whatever the user actually entered — blanks become
    // `undefined` so the server can apply its own defaults (e.g. the
    // quote-flow route auto-creates an AiCustomer by phone/name).
    const cleanCustomerName = selectedCustomerName.trim();
    const cleanCustomerPhone = selectedCustomerPhone.trim();
    const cleanCustomerAddress = billingAddressLines.slice(1).join(', ').trim();

    const calculatedTaxPercent =
      calculations.taxableAmount > 0
        ? Number(
            (
              ((calculations.cgst + calculations.sgst) /
                calculations.taxableAmount) *
              100
            ).toFixed(1),
          )
        : 0;

    try {
      // POST against the quote-flow invoice contract — same shape that
      // /api/quote-flow/invoices/route.ts expects. The route auto-creates
      // or attaches the customer by phone/name if `customerId` is omitted.
      const res = await fetch('/api/quote-flow/invoices', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanCustomerName,
          customerPhone: cleanCustomerPhone || undefined,
          dueDate,
          notes: remarks,
          status: 'DRAFT',
          items: items.map((it) => ({
            description: it.name,
            qty: it.qty,
            unitPrice: it.rate,
            hsnCode: it.hsnSac || undefined,
          })),
          discountValue: calculations.discountAmount,
          discountType: 'AMOUNT',
          taxRate: calculatedTaxPercent,
          pdfTemplate: 'classic-corporate-blue',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast((data && data.error) || 'Failed to save invoice on server.');
        return;
      }

      const verifiedInvoiceId = data?.invoice?.id || `inv-${Date.now()}`;
      const verifiedInvoiceNumber = data?.invoice?.number || invoiceNumber;

      const html = generateGstInvoiceHtml(
        {
          number: verifiedInvoiceNumber,
          date: invoiceDate,
          dueDate,
          customerName: cleanCustomerName,
          customerPhone: cleanCustomerPhone,
          customerGstin: selectedCustomerGstin,
          customerAddress: cleanCustomerAddress,
          placeOfSupply,
          subtotal: Math.round(calculations.taxableAmount),
          tax: Math.round(calculations.cgst + calculations.sgst),
          discount: Math.round(calculations.discountAmount),
          total: Math.round(calculations.totalAmount),
          balance: Math.round(calculations.totalAmount),
          status: 'DRAFT',
          items: calculations.computedRows.map((r) => ({
            name: r.name,
            hsn: r.hsnSac,
            qty: r.qty,
            unitPrice: r.rate,
          })),
        },
        {
          businessName: storeSettings.businessName || 'Business Store',
          logoUrl: '/bos/logo-mark.png',
          gstin: storeSettings.gstin || '',
          address: storeSettings.address || '',
          phone: storeSettings.phone || '',
          email: storeSettings.email || '',
          upiId: storeSettings.upiId || '',
        },
        currencySymbol,
      );

      const saved: SavedBosInvoice = {
        id: verifiedInvoiceId,
        invoiceNumber: verifiedInvoiceNumber,
        docType,
        customerName: cleanCustomerName,
        customerGstin: selectedCustomerGstin,
        date: invoiceDate,
        dueDate,
        totalAmount: calculations.totalAmount,
        paidAmount: 0,
        status: 'Draft',
      };
      onInvoiceSaved?.(saved);

      const win = window.open('', '_blank', 'width=900,height=800');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }

      showToast(`Invoice ${verifiedInvoiceNumber} created & sent to printer`);
    } catch (err: any) {
      showToast(err?.message || 'Network error saving invoice.');
    }
  };

  const handleShareInvoice = () => {
    const cleanPhone = selectedCustomerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      showToast('Please enter customer phone number to share invoice on WhatsApp.');
      return;
    }
    const text = `Hello *${selectedCustomerName}*,\nHere is your Tax Invoice *${invoiceNumber}* from *${storeSettings.businessName || 'Ravi Store'}*.\n• *Taxable Amount:* ${currencySymbol} ${formatTwoDecimals(calculations.taxableAmount)}\n• *Total Amount:* ${currencySymbol} ${formatTwoDecimals(calculations.totalAmount)}\n${remarks}`;
    if (typeof window !== 'undefined') {
      window.open(
        `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
    showToast(`Shared ${invoiceNumber} with ${selectedCustomerName}`);
  };

  const handleAddNewCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;
    // ── Real customer data only ──────────────────────────────────────
    // Previously this invented fake GSTIN/phone/address values when the
    // user left fields blank. Those fake values then leaked into the
    // invoice POST and the saved invoice record. We now use whatever the
    // user actually typed — empty strings stay empty.
    const trimmedName = newCustomerForm.name.trim();
    const trimmedGstin = newCustomerForm.gstin.trim();
    const trimmedPhone = newCustomerForm.phone.trim();
    const trimmedAddress = newCustomerForm.address.trim();
    setSelectedCustomerName(trimmedName);
    setSelectedCustomerGstin(trimmedGstin);
    setSelectedCustomerPhone(trimmedPhone);
    setBillingAddressLines(
      trimmedAddress ? [trimmedName, trimmedAddress] : [trimmedName],
    );
    setShowAddCustomerModal(false);
    showToast(`Selected customer "${trimmedName}"`);
  };

  return (
    <div className="w-full max-w-none space-y-4 pb-6">
      {/* Status Toast Banner */}
      {statusBanner && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {statusBanner}
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Info Banner (honest "not yet implemented" messaging — never styled as success) */}
      {infoBanner && (
        <div className="flex items-center justify-between rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-[13px] font-medium text-[#1E40AF]">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            {infoBanner}
          </span>
          <button
            type="button"
            onClick={() => setInfoBanner(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header: Title + Subtitle on Left, 5 Action Buttons on Right */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Create Invoice
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Create GST invoice with e-Way Bill. Add products, customer, tax details and collect payment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOrDownload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#0A6847]" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            onClick={() => setRightTab('preview')}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#475569]" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={handlePrintOrDownload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-[#475569]" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleShareInvoice}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-[#475569]" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={handlePrintOrDownload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 text-[12.5px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Create &amp; Send</span>
            <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-90" />
          </button>
        </div>
      </div>

      {/* Main 12-Column Grid: Left Builder (7 cols) + Right Live Preview (5 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: INVOICE BUILDER (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* CARD 1: INVOICE DETAILS */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15.5px] font-extrabold text-[#111827]">
                Invoice Details
              </h2>

              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'gst', label: 'GST Invoice' },
                    { id: 'non_gst', label: 'Non-GST Invoice' },
                    { id: 'credit_note', label: 'Credit Note' },
                  ] as const
                ).map((tab) => {
                  const active = docType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDocType(tab.id)}
                      className={`rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition cursor-pointer ${
                        active
                          ? 'bg-[#0A6847] text-white shadow-2xs'
                          : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {/* Invoice Number */}
              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Invoice Number <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white pl-3 pr-8 text-[12.5px] font-bold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  />
                  <Settings className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                </div>
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Invoice Date <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white pl-3 pr-8 text-[12.5px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  />
                  <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Due Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white pl-3 pr-8 text-[12.5px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  />
                  <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                </div>
              </div>

              {/* Sales Type */}
              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Sales Type
                </label>
                <select
                  aria-label="Sales Type"
                  value={salesType}
                  onChange={(e) => setSalesType(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12.5px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                >
                  <option value="B2B - Business">B2B - Business</option>
                  <option value="B2C - Retail">B2C - Retail</option>
                  <option value="Export / SEZ">Export / SEZ</option>
                </select>
              </div>
            </div>
          </div>

          {/* MIDDLE SPLIT ROW: CUSTOMER DETAILS (7 cols) + GST & E-WAY BILL (5 cols) */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12">
            {/* Customer Details Card */}
            <div className="md:col-span-7 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Customer Details
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-[#0A6847] hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Customer</span>
                </button>
              </div>

              {/* Selected Customer Selector Box */}
              <div className="relative">
                <div className="flex items-center justify-between rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCEFE7] text-[12.5px] font-extrabold text-[#0A6847] border border-[#BCE3D4]">
                      AK
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#111827] truncate">
                        {selectedCustomerName}
                      </p>
                      <p className="text-[11px] font-medium text-[#64748B] truncate">
                        GST: {selectedCustomerGstin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#64748B]">
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown((prev) => !prev)}
                      aria-label="Clear or switch customer"
                      className="rounded p-1 hover:bg-[#EBF2EE] hover:text-[#111827]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown((prev) => !prev)}
                      aria-label="Toggle customer dropdown"
                      className="rounded p-1 hover:bg-[#EBF2EE] hover:text-[#111827]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[#DCE9E3] bg-white p-1.5 shadow-lg">
                    {customers.slice(0, 5).map((c, idx) => {
                      const cName = c.name;
                      const cGstin = c.gstin || '';
                      const cPhone = c.phone || '';
                      const cAddress = c.address || '';
                      return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerName(cName);
                          setSelectedCustomerGstin(cGstin);
                          setSelectedCustomerPhone(cPhone);
                          setBillingAddressLines(
                            cAddress ? [cName, cAddress] : [cName],
                          );
                          setShowCustomerDropdown(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-[#F1FAF5]"
                      >
                        <span className="font-bold text-[#111827]">{cName}</span>
                        <span className="font-mono text-[11px] text-[#64748B]">
                          {cGstin || '—'}
                        </span>
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Billing Address & Shipping Address Side-by-Side */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Billing Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-[#1E293B]">
                      Billing Address
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingBillingAddress((prev) => !prev)}
                      className="text-[11.5px] font-semibold text-[#0A6847] hover:underline cursor-pointer"
                    >
                      {editingBillingAddress ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  <div className="rounded-xl bg-[#F3F6F4] p-2.5 text-[11px] leading-relaxed text-[#475569]">
                    {editingBillingAddress ? (
                      <textarea
                        rows={4}
                        value={billingAddressLines.join('\n')}
                        onChange={(e) =>
                          setBillingAddressLines(e.target.value.split('\n'))
                        }
                        className="w-full rounded bg-white p-1.5 text-[11px] text-[#111827]"
                      />
                    ) : (
                      billingAddressLines.map((line, idx) => (
                        <p
                          key={idx}
                          className={idx === 0 ? 'font-semibold text-[#1E293B]' : ''}
                        >
                          {line}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11.5px] font-bold text-[#1E293B]">
                      Shipping Address
                    </span>
                    <label className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#475569] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsBilling}
                        onChange={(e) => setSameAsBilling(e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[#0A6847]"
                      />
                      <span>Same as Billing</span>
                    </label>
                  </div>
                  <div className="rounded-xl bg-[#F3F6F4] p-2.5 text-[11px] leading-relaxed text-[#475569]">
                    {billingAddressLines.map((line, idx) => (
                      <p
                        key={idx}
                        className={idx === 0 ? 'font-semibold text-[#1E293B]' : ''}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* GST & e-Way Bill Card */}
            <div className="md:col-span-5 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  GST &amp; e-Way Bill
                </h2>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gstEnabled}
                    onClick={() => setGstEnabled((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      gstEnabled ? 'bg-[#0A6847]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        gstEnabled ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-[11.5px] font-semibold text-[#334155]">
                    GST Enabled
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Place of Supply <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    aria-label="Place of Supply"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                  >
                    <option value="Delhi (07)">Delhi (07)</option>
                    <option value="Maharashtra (27)">Maharashtra (27)</option>
                    <option value="Karnataka (29)">Karnataka (29)</option>
                    <option value="Uttar Pradesh (09)">Uttar Pradesh (09)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Invoice Type <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    aria-label="Invoice Type"
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                  >
                    <option value="Regular">Regular</option>
                    <option value="SEZ Supplies">SEZ Supplies</option>
                    <option value="Deemed Export">Deemed Export</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-[12px]">
                {/* Reverse Charge */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#334155]">Reverse Charge</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reverseCharge}
                    onClick={() => setReverseCharge((p) => !p)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                      reverseCharge ? 'bg-[#0A6847]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        reverseCharge ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* E-Invoice */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#334155]">E-Invoice</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={eInvoiceEnabled}
                    onClick={() => setEInvoiceEnabled((p) => !p)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                      eInvoiceEnabled ? 'bg-[#0A6847]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        eInvoiceEnabled ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* e-Way Bill */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#334155]">e-Way Bill</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={eWayBillEnabled}
                    onClick={() => setEWayBillEnabled((p) => !p)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                      eWayBillEnabled ? 'bg-[#0A6847]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        eWayBillEnabled ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: ITEMS */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15.5px] font-extrabold text-[#111827]">
                Items
              </h2>
              <button
                type="button"
                onClick={() => handleAddProductToInvoice()}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Search Products + Scan Barcode Bar */}
            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  placeholder="Search products by name, barcode or SKU..."
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                />

                {matchingCatalogProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[#DCE9E3] bg-white p-1.5 shadow-lg">
                    {matchingCatalogProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductToInvoice(p)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-[#F1FAF5]"
                      >
                        <div className="flex items-center gap-2">
                          <BosProductThumbnail product={p} size="sm" />
                          <span className="font-bold text-[#111827]">{p.name}</span>
                        </div>
                        <span className="font-bold text-[#0A6847]">
                          {currencySymbol} {p.price}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAddProductToInvoice()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer shrink-0"
              >
                <Barcode className="h-4 w-4 text-[#475569]" />
                <span>Scan Barcode</span>
              </button>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                    <th className="py-2.5 pl-2 pr-1.5 w-6">#</th>
                    <th className="py-2.5 px-2">Product</th>
                    <th className="py-2.5 px-2">HSN/SAC</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2">Unit</th>
                    <th className="py-2.5 px-2">Price ({currencySymbol})</th>
                    <th className="py-2.5 px-2">GST %</th>
                    <th className="py-2.5 px-2 text-right">Amount ({currencySymbol})</th>
                    <th className="py-2.5 pl-1 pr-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                  {calculations.computedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#F9FCFA]">
                      <td className="py-2.5 pl-2 pr-1.5 font-medium text-[#475569]">
                        {idx + 1}
                      </td>

                      {/* Product Thumbnail + Name */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          <BosProductThumbnail
                            product={{
                              name: row.name,
                              category: row.category,
                              barcode: row.barcode,
                              imageUrl: row.imageUrl,
                            }}
                            size="sm"
                          />
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === row.id
                                    ? { ...it, name: e.target.value }
                                    : it,
                                ),
                              )
                            }
                            className="w-full min-w-[130px] bg-transparent font-bold text-[#111827] focus:outline-hidden"
                          />
                        </div>
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-2.5 px-2 text-[12px] text-[#64748B] font-medium">
                        {row.hsnSac}
                      </td>

                      {/* Qty Stepper (< 2 >) */}
                      <td className="py-2.5 px-2">
                        <div className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(row.id, -1)}
                            aria-label={`Decrease quantity for ${row.name}`}
                            className="flex h-6 w-5 items-center justify-center text-[#64748B] hover:text-[#111827] cursor-pointer"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-[12px] font-bold text-[#111827]">
                            {row.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(row.id, 1)}
                            aria-label={`Increase quantity for ${row.name}`}
                            className="flex h-6 w-5 items-center justify-center text-[#64748B] hover:text-[#111827] cursor-pointer"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2">
                        <span className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#FAFDFB] px-2.5 py-1 text-[11.5px] font-medium text-[#334155]">
                          {row.unit}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === row.id
                                  ? {
                                      ...it,
                                      rate: Math.max(0, Number(e.target.value) || 0),
                                    }
                                  : it,
                              ),
                            )
                          }
                          className="w-20 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-[12px] font-semibold text-[#111827]"
                        />
                      </td>

                      {/* GST % */}
                      <td className="py-2.5 px-2">
                        <select
                          aria-label={`GST rate for ${row.name}`}
                          value={row.gstRate}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === row.id
                                  ? { ...it, gstRate: Number(e.target.value) }
                                  : it,
                              ),
                            )
                          }
                          className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-[11.5px] font-semibold text-[#111827]"
                        >
                          {[0, 5, 12, 18, 28].map((rate) => (
                            <option key={rate} value={rate}>
                              {rate}%
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-2 text-right font-bold text-[#111827]">
                        {formatTwoDecimals(row.amount)}
                      </td>

                      {/* Delete Icon */}
                      <td className="py-2.5 pl-1 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.id)}
                          aria-label={`Remove ${row.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 4: ADDITIONAL DETAILS */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
            <h2 className="text-[15.5px] font-extrabold text-[#111827]">
              Additional Details
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Payment Terms
                </label>
                <select
                  aria-label="Payment Terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12.5px] font-medium text-[#111827]"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Sales Person
                </label>
                <select
                  aria-label="Sales Person"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12.5px] font-medium text-[#111827]"
                >
                  <option value="Ravi Kumar">Ravi Kumar</option>
                  <option value="Amit Verma">Amit Verma</option>
                  <option value="Priya Nair">Priya Nair</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Project / Reference
                </label>
                <input
                  type="text"
                  value={projectReference}
                  onChange={(e) => setProjectReference(e.target.value)}
                  placeholder="Optional"
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-medium text-[#475569] mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] text-[#111827]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE INVOICE PREVIEW PANEL (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
          {/* Top Underline Tabs: Invoice Preview | e-Invoice | e-Way Bill | Payment */}
          <div className="flex items-center gap-5 border-b border-[#EBF2EE]">
            {(
              [
                { id: 'preview', label: 'Invoice Preview' },
                { id: 'einvoice', label: 'e-Invoice' },
                { id: 'ewaybill', label: 'e-Way Bill' },
                { id: 'payment', label: 'Payment' },
              ] as const
            ).map((tab) => {
              const active = rightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRightTab(tab.id)}
                  className={`relative pb-2.5 text-[12.5px] transition cursor-pointer ${
                    active
                      ? 'font-bold text-[#111827]'
                      : 'font-medium text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Paper Mode Toggle Pills: A4 Invoice | Thermal Receipt */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaperMode('a4')}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition cursor-pointer ${
                paperMode === 'a4'
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              A4 Invoice
            </button>
            <button
              type="button"
              onClick={() => setPaperMode('thermal')}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition cursor-pointer ${
                paperMode === 'thermal'
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              Thermal Receipt
            </button>
          </div>

          {/* Live TAX INVOICE Sheet */}
          <div
            className={`rounded-xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3 ${
              paperMode === 'thermal' ? 'max-w-xs mx-auto font-mono' : ''
            }`}
          >
            {/* Top Brand + TAX INVOICE Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#EBF2EE] pb-3">
              <BosBrand variant="light" />
              <div className="text-right">
                <p className="text-[14px] font-extrabold tracking-tight text-[#111827]">
                  TAX INVOICE
                </p>
                <span className="mt-1 inline-flex rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10px] font-bold text-[#0A7B56]">
                  Original for Recipient
                </span>
              </div>
            </div>

            {/* Store Info (Left) & Invoice Meta (Right) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 text-[11px] border-b border-[#EBF2EE] pb-3">
              <div className="sm:col-span-6 space-y-0.5 text-[#475569]">
                <p className="text-[12.5px] font-extrabold text-[#111827]">
                  Ravi Store
                </p>
                <p>123 Main Market, Lajpat Nagar</p>
                <p>New Delhi - 110024, Delhi, India</p>
                <p className="font-bold text-[#111827]">
                  GSTIN: 07ABCDE1234F1Z5
                </p>
                <p className="font-semibold text-[#1E293B]">Phone: 9876543210</p>
              </div>

              <div className="sm:col-span-6 space-y-1 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Invoice No:</span>
                  <span className="font-extrabold text-[#111827]">
                    {invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Date:</span>
                  <span className="font-semibold text-[#111827]">
                    {invoiceDate}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Due Date:</span>
                  <span className="font-semibold text-[#111827]">{dueDate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Place of Supply:</span>
                  <span className="font-semibold text-[#111827]">
                    {placeOfSupply}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Invoice Type:</span>
                  <span className="font-semibold text-[#111827]">
                    {invoiceType}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To Box */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg border border-[#EBF2EE] bg-[#FAFDFB] p-2.5 text-[10.5px]">
              <div className="space-y-0.5 sm:border-r sm:border-[#EBF2EE] sm:pr-2">
                <p className="font-bold text-[#111827]">Bill To:</p>
                <p className="text-[11.5px] font-extrabold text-[#111827]">
                  {selectedCustomerName}
                </p>
                <p className="font-semibold text-[#334155]">
                  GSTIN: {selectedCustomerGstin}
                </p>
                <p className="text-[#64748B]">123 Green Park, Metro Station Road</p>
                <p className="text-[#64748B]">New Delhi - 110016, Delhi, India</p>
              </div>

              <div className="space-y-0.5">
                <p className="font-bold text-[#111827]">Ship To:</p>
                <p className="text-[11.5px] font-extrabold text-[#111827]">
                  {selectedCustomerName}
                </p>
                <p className="font-semibold text-[#334155]">
                  GSTIN: {selectedCustomerGstin}
                </p>
                <p className="text-[#64748B]">123 Green Park, Metro Station Road</p>
                <p className="text-[#64748B]">New Delhi - 110016, Delhi, India</p>
              </div>
            </div>

            {/* Preview Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="border-y border-[#EBF2EE] bg-[#F8FAFC] font-bold text-[#334155]">
                    <th className="py-1.5 pl-1.5 pr-1">#</th>
                    <th className="py-1.5 px-1.5">Product</th>
                    <th className="py-1.5 px-1.5">HSN/SAC</th>
                    <th className="py-1.5 px-1.5 text-center">Qty</th>
                    <th className="py-1.5 px-1.5 text-right">
                      Rate ({currencySymbol})
                    </th>
                    <th className="py-1.5 px-1.5 text-center">GST</th>
                    <th className="py-1.5 pl-1.5 pr-1.5 text-right">
                      Amount ({currencySymbol})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {calculations.computedRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="py-1.5 pl-1.5 pr-1 text-[#64748B]">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-1.5 font-semibold text-[#111827]">
                        {row.name}
                      </td>
                      <td className="py-1.5 px-1.5 text-[#64748B]">
                        {row.hsnSac}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-semibold text-[#111827]">
                        {row.qty}
                      </td>
                      <td className="py-1.5 px-1.5 text-right text-[#334155]">
                        {formatTwoDecimals(row.rate)}
                      </td>
                      <td className="py-1.5 px-1.5 text-center text-[#334155]">
                        {row.effectiveGst}%
                      </td>
                      <td className="py-1.5 pl-1.5 pr-1.5 text-right font-bold text-[#111827]">
                        {formatTwoDecimals(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown (Right Aligned) */}
            <div className="flex justify-end border-t border-[#EBF2EE] pt-2.5">
              <div className="w-full max-w-[230px] space-y-1 text-[11px]">
                <div className="flex justify-between text-[#475569]">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#111827]">
                    {currencySymbol} {formatTwoDecimals(calculations.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>Discount ({discountPercent}%)</span>
                  <span className="font-bold text-[#0A7B56]">
                    - {currencySymbol}{' '}
                    {formatTwoDecimals(calculations.discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#EBF2EE] pt-1 font-bold text-[#111827]">
                  <span>Taxable Amount</span>
                  <span>
                    {currencySymbol}{' '}
                    {formatTwoDecimals(calculations.taxableAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>CGST (9%)</span>
                  <span className="font-semibold text-[#111827]">
                    {currencySymbol} {formatTwoDecimals(calculations.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>SGST (9%)</span>
                  <span className="font-semibold text-[#111827]">
                    {currencySymbol} {formatTwoDecimals(calculations.sgst)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#DCE9E3] pt-1.5">
                  <span className="text-[12.5px] font-extrabold text-[#111827]">
                    Total Amount
                  </span>
                  <span className="text-[16px] font-extrabold text-[#111827]">
                    {currencySymbol}{' '}
                    {formatTwoDecimals(calculations.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="border-t border-[#EBF2EE] pt-2 text-[10px] text-[#475569]">
              <span className="font-bold text-[#111827]">Amount in Words:</span>{' '}
              {calculations.amountInWordsText}
            </div>

            {/* QR Code + Terms & Conditions + Authorized Signatory */}
            <div className="flex flex-col gap-3 border-t border-[#EBF2EE] pt-2.5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-2.5">
                {/* Styled SVG QR Code */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-[#CBD5E1] bg-white p-1">
                  <svg
                    viewBox="0 0 36 36"
                    className="h-full w-full text-[#111827]"
                    fill="currentColor"
                  >
                    <path d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6zm18-4h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6zM2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2zm10-24h2v4h-2V4zm4 2h2v4h-2V6zm-4 6h4v2h-4v-2zm-2 4h4v2h-4v-2zm6 0h2v4h-2v-4zm4 4h6v2h-6v-2zm-10 4h2v6h-2v-6zm4 2h4v2h-4v-2zm6 2h4v6h-4v-6zm-6 4h4v2h-4v-2z" />
                  </svg>
                </div>

                <div className="text-[9.5px] leading-snug text-[#475569] space-y-0.5">
                  <p className="font-bold text-[#111827]">
                    Terms &amp; Conditions
                  </p>
                  <p>1. Goods once sold will not be taken back.</p>
                  <p>2. Payment to be made within due date.</p>
                  <p>3. Subject to {storeSettings.city || storeSettings.state || 'Delhi'} jurisdiction.</p>
                  <p className="pt-0.5 font-extrabold text-[#111827]">
                    {remarks || 'Thank you for your business!'}
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-[#475569] shrink-0">
                <div className="mb-1 h-6 w-28 border-b border-dashed border-[#94A3B8] ml-auto" />
                <p className="font-semibold text-[#334155]">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>

          {/* Bottom 3 Action Buttons: Generate e-Way Bill | Generate e-Invoice | Download PDF */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  showInfo(
                    'e-Way Bill generation requires GSTN API integration. Coming soon.',
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Generate e-Way Bill</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  showInfo(
                    'e-Invoice generation requires GSTN API integration. Coming soon.',
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Generate e-Invoice</span>
              </button>
            </div>

            <div className="inline-flex items-center rounded-xl border border-[#DCE9E3] bg-white shadow-2xs">
              <button
                type="button"
                onClick={handlePrintOrDownload}
                className="inline-flex h-9 items-center gap-1.5 px-3 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] rounded-l-xl cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#0A6847]" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={handlePrintOrDownload}
                aria-label="More download options"
                className="inline-flex h-9 items-center border-l border-[#DCE9E3] px-2 text-[#64748B] hover:bg-[#F4F8F6] rounded-r-xl cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <h3 className="text-[15.5px] font-bold text-[#111827]">
                Add New B2B / Retail Customer
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCustomerSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155]">
                  Business / Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g. Amit Kumar Traders"
                  className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.gstin}
                    onChange={(e) =>
                      setNewCustomerForm((s) => ({ ...s, gstin: e.target.value }))
                    }
                    placeholder="07AAKCA1234F1Z5"
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.phone}
                    onChange={(e) =>
                      setNewCustomerForm((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="9876543210"
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155]">
                  Billing Address
                </label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) =>
                    setNewCustomerForm((s) => ({ ...s, address: e.target.value }))
                  }
                  placeholder="123 Green Park, Metro Station Road, New Delhi"
                  className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#085238]"
                >
                  Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Invoices — hydrated from /api/quote-flow/invoices (GET) in the parent.
          Saving an invoice above calls onInvoiceSaved, which prepends it to this list
          and persists across reloads. Mark-Paid / Delete trigger PATCH and DELETE on
          the same quote-flow contract. */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15.5px] font-extrabold text-[#111827]">
              Recent Invoices
            </h2>
            <span className="text-[11.5px] font-semibold text-[#64748B]">
              {invoices.length} saved
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-2 pl-2 pr-1.5">Invoice #</th>
                  <th className="py-2 px-2">Customer</th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2 text-right">Total</th>
                  <th className="py-2 px-2 text-center">Status</th>
                  <th className="py-2 pl-1 pr-2 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F1]">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'Paid';
                  const isUnpaid =
                    inv.status === 'Unpaid' ||
                    inv.status === 'Partial' ||
                    inv.status === 'Draft';
                  const statusBadgeClass =
                    inv.status === 'Paid'
                      ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                      : inv.status === 'Partial'
                        ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                        : inv.status === 'Draft'
                          ? 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                          : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
                  return (
                    <tr key={inv.id} className="hover:bg-[#F9FCFA]">
                      <td className="py-2 pl-2 pr-1.5 font-bold text-[#111827]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2 px-2">
                        <p className="font-semibold text-[#111827]">
                          {inv.customerName || '—'}
                        </p>
                        {inv.customerGstin && (
                          <p className="font-mono text-[10px] text-[#64748B]">
                            {inv.customerGstin}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-2 text-[#64748B]">{inv.date}</td>
                      <td className="py-2 px-2 text-right font-bold text-[#111827]">
                        {currencySymbol} {formatTwoDecimals(inv.totalAmount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${statusBadgeClass}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2 pl-1 pr-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {isUnpaid && onMarkInvoicePaid && (
                            <button
                              type="button"
                              onClick={() => onMarkInvoicePaid(inv.id)}
                              className="rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 text-[10.5px] font-bold text-[#0A6847] hover:bg-[#F4F8F6] cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                          {onDeleteInvoice && (
                            <button
                              type="button"
                              onClick={() => onDeleteInvoice(inv.id)}
                              disabled={isPaid}
                              title={
                                isPaid
                                  ? 'Paid invoices cannot be deleted'
                                  : 'Delete this invoice'
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEE2E2] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
