'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import {
  CheckCircle2,
  Building2,
  QrCode,
  CreditCard,
  Banknote,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  Send,
  Loader2,
  Info,
  Smartphone,
  Printer,
  Download,
  Share2,
  MessageCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generateGstInvoiceHtml } from '@/lib/billing/gst-invoice-helper';
import { qrSvgMarkup } from '@/lib/qr-svg';

interface InvoiceData {
  id: string;
  number: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  notes: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress?: string | null;
  customerGstin?: string;
  jobTitle: string | null;
  paidAmount?: number;
  balance?: number;
  items: Array<{
    name: string;
    description?: string;
    unitPrice?: number;
    amount?: number;
    quantity?: number;
    hsnCode?: string;
  }>;
  reportedPayment?: {
    reference?: string | null;
    method?: string;
    notes?: string;
    reportedAt?: string;
  } | null;
}

interface BrandingData {
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin?: string | null;
  currency: string;
}

interface PaymentMethodsData {
  razorpay?: { enabled: boolean; keyId: string };
  stripe?: { enabled: boolean; publishableKey: string };
  paypal?: { enabled: boolean; clientId: string };
  directBank?: {
    enabled: boolean;
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber?: string;
    ifscCode?: string;
    sortCode?: string;
    bsb?: string;
    iban?: string;
    swiftBic?: string;
    instructions?: string;
  };
  upi?: {
    enabled: boolean;
    upiId: string;
    merchantName?: string;
  };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function PublicInvoicePayPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Online checkout state
  const [payingOnline, setPayingOnline] = useState(false);

  // Inline UPI UTR state
  const [inlineUtr, setInlineUtr] = useState('');
  const [submittingInlineUtr, setSubmittingInlineUtr] = useState(false);

  // App-Return Prompt Dialog (When customer switches back from GPay/PhonePe)
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnUtr, setReturnUtr] = useState('');
  const [submittingReturnReport, setSubmittingReturnReport] = useState(false);

  // Manual payment report modal state (for Bank transfer or other methods)
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportMethod, setReportMethod] = useState('UPI');
  const [reportRef, setReportRef] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Last poll sync timestamp
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInvoice = useCallback(
    async (isSilent = false) => {
      if (!id) return;
      if (!isSilent) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/public/invoices/${id}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          setInvoice(data.invoice);
          setBranding(data.branding);
          setPaymentMethods(data.paymentMethods);
          setLastSyncedAt(new Date());
        } else if (!isSilent) {
          toast.error('Invoice not found or expired');
        }
      } catch {
        if (!isSilent) toast.error('Failed to load invoice');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ── UPI URI & Dynamic QR Code Computation ────────────────────────────────
  const upiUri = useMemo(() => {
    if (!paymentMethods?.upi?.upiId || !invoice) return '';
    const rawUpiId = paymentMethods.upi.upiId.trim();
    if (!rawUpiId) return '';
    const merchant = paymentMethods.upi.merchantName || branding?.businessName || 'Merchant';
    const amount = invoice.total.toFixed(2);
    const note = `Invoice ${invoice.number}`;
    return `upi://pay?pa=${encodeURIComponent(rawUpiId)}&pn=${encodeURIComponent(merchant)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
  }, [paymentMethods?.upi, branding?.businessName, invoice]);

  // UPI QR generated fully on-device — the deep link never leaves the browser.
  const dynamicQrMarkup = useMemo(() => {
    if (!upiUri) return '';
    return qrSvgMarkup(upiUri) ?? '';
  }, [upiUri]);

  // ── App-Return Detection Layer: Listen for user returning from UPI app ──
  const handleOpenUpiApp = () => {
    if (!invoice) return;
    try {
      sessionStorage.setItem(
        `upi_launched_${invoice.id}`,
        JSON.stringify({
          timestamp: Date.now(),
          amount: invoice.total,
          number: invoice.number,
        })
      );
    } catch {}
  };

  useEffect(() => {
    if (!invoice || invoice.status === 'paid') return;

    const checkAppReturn = () => {
      try {
        const stored = sessionStorage.getItem(`upi_launched_${invoice.id}`);
        if (!stored) return;
        const data = JSON.parse(stored);
        // If initiated within the last 15 minutes and modal not already open
        if (Date.now() - data.timestamp < 15 * 60 * 1000) {
          sessionStorage.removeItem(`upi_launched_${invoice.id}`);
          setReturnModalOpen(true);
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAppReturn();
        fetchInvoice(true); // silent sync
      }
    };

    const handleFocus = () => {
      checkAppReturn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [invoice, fetchInvoice]);

  // ── Real-Time Status Background Polling ───────────────────────────────────
  useEffect(() => {
    if (!invoice || invoice.status === 'paid') return;

    // Poll every 3.5s if payment reported, otherwise every 5s
    const isPending =
      invoice.status === 'payment_reported' ||
      invoice.status === 'pending_approval' ||
      invoice.status === 'partially_paid';
    const intervalMs = isPending ? 3500 : 5000;

    const timer = setInterval(() => {
      fetchInvoice(true);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [invoice?.status, fetchInvoice]);

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Launch Razorpay Online Checkout (if configured on tenant)
  const handleRazorpayPay = async () => {
    if (!invoice) return;
    setPayingOnline(true);
    try {
      const res = await fetch(`/api/public/invoices/${invoice.id}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'razorpay' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initiate payment');
      }

      const orderData = await res.json();

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: branding?.businessName || 'Service Invoice',
        description: `Invoice #${invoice.number}`,
        order_id: orderData.orderId,
        prefill: {
          name: invoice.customerName,
          email: invoice.customerEmail || '',
          contact: invoice.customerPhone || '',
        },
        theme: {
          color: '#0A6847',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function () {
          toast.success('Payment completed successfully!');
          fetchInvoice();
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment error');
    } finally {
      setPayingOnline(false);
    }
  };

  // ── Submit Payment Report (UTR / Reference) ──────────────────────────────
  const handleReportPayment = async (
    method = reportMethod,
    ref = reportRef,
    notes = reportNotes,
    fromModal = 'manual'
  ) => {
    if (!invoice) return;
    if (fromModal === 'inline') setSubmittingInlineUtr(true);
    else if (fromModal === 'return') setSubmittingReturnReport(true);
    else setSubmittingReport(true);

    try {
      const res = await fetch(`/api/public/invoices/${invoice.id}/report-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          referenceNumber: ref.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(data.message || 'Payment reported successfully! Merchant is verifying.');
        setReportModalOpen(false);
        setReturnModalOpen(false);
        setInlineUtr('');
        setReturnUtr('');
        fetchInvoice();
      } else {
        toast.error(data.error || 'Failed to submit payment report');
      }
    } catch {
      toast.error('Network error submitting payment report');
    } finally {
      setSubmittingInlineUtr(false);
      setSubmittingReturnReport(false);
      setSubmittingReport(false);
    }
  };

  // ── Download / Print Tax Invoice via A4 Window ───────────────────────────
  const handlePrintInvoice = () => {
    if (!invoice) return;
    const html = generateGstInvoiceHtml(
      {
        number: invoice.number,
        date: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : undefined,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone || undefined,
        customerGstin: invoice.customerGstin || undefined,
        customerAddress: invoice.customerAddress || undefined,
        subtotal: invoice.amount,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        balance: invoice.status === 'paid' ? 0 : invoice.balance ?? invoice.total,
        status: invoice.status.toUpperCase(),
        items: invoice.items.map((it) => ({
          name: it.name,
          description: it.name,
          hsnCode: it.hsnCode,
          qty: it.quantity || 1,
          unitPrice: it.unitPrice || (it.amount ? it.amount / (it.quantity || 1) : 0),
        })),
      },
      {
        businessName: branding?.businessName || 'Service Provider',
        logoUrl: branding?.logoUrl || undefined,
        gstin: branding?.gstin || undefined,
        address: branding?.address || undefined,
        phone: branding?.phone || undefined,
        email: branding?.email || undefined,
        upiId: paymentMethods?.upi?.upiId || undefined,
      },
      invoice.currency === 'INR' ? '₹' : '$'
    );

    const win = window.open('', '_blank', 'width=900,height=800');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // ── WhatsApp Merchant Direct Confirmation ────────────────────────────────
  const handleWhatsAppMerchant = () => {
    const phone = (branding?.phone || '').replace(/\D/g, '');
    if (!phone) {
      toast.info('Merchant phone number is not available on this invoice.');
      return;
    }
    const currencySym = invoice?.currency === 'INR' ? '₹' : '$';
    const ref = invoice?.reportedPayment?.reference
      ? ` (UTR / Ref: ${invoice.reportedPayment.reference})`
      : '';
    const text = `Hello *${branding?.businessName || 'Merchant'}*,\nI have paid *${currencySym}${invoice?.total.toFixed(2)}* for Invoice *#${invoice?.number}*${ref}.\n\n👉 *View Invoice / Receipt:* ${typeof window !== 'undefined' ? window.location.href : ''}`;
    window.open(
      `https://wa.me/${phone.startsWith('91') ? phone : `91${phone}`}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // ── Share Payment Link ───────────────────────────────────────────────────
  const handleShareLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Invoice link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F8F6] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-9 animate-spin text-[#0A6847] mx-auto" />
          <p className="text-sm font-semibold text-stone-600">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#F4F8F6] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-stone-200 shadow-sm rounded-2xl">
          <AlertCircle className="size-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900">Invoice Not Found</h2>
          <p className="text-xs text-stone-500 mt-2">
            This invoice link may be invalid, closed, or expired. Please check with your merchant.
          </p>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isReported =
    !isPaid &&
    (invoice.status === 'payment_reported' ||
      invoice.status === 'pending_approval' ||
      invoice.status === 'partially_paid' ||
      Boolean(invoice.reportedPayment));
  const currencySymbol = invoice.currency === 'INR' ? '₹' : '$';

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen bg-[#F4F8F6] py-8 px-4 sm:px-6 lg:px-8 text-stone-900">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Top Merchant Branding & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center gap-3">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.businessName}
                  className="size-11 rounded-xl object-contain border border-stone-200"
                />
              ) : (
                <div className="size-11 rounded-xl bg-gradient-to-br from-[#0A6847] to-[#085238] flex items-center justify-center text-white font-black text-lg shadow-2xs">
                  {branding?.businessName ? branding.businessName.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-stone-900 leading-tight">
                  {branding?.businessName || 'Business Store'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                  {branding?.gstin && (
                    <span className="font-mono bg-stone-100 px-1.5 py-0.2 rounded text-[10px] font-semibold text-stone-700">
                      GSTIN: {branding.gstin}
                    </span>
                  )}
                  {branding?.phone && <span>Ph: {branding.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareLink}
                className="gap-1.5 text-xs rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInvoice}
                className="gap-1.5 text-xs rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                <Printer className="size-3.5 text-[#0A6847]" />
                <span>Invoice PDF</span>
              </Button>
            </div>
          </div>

          {/* Header Invoice Card */}
          <Card className="shadow-xs border-stone-200/90 overflow-hidden rounded-2xl bg-white">
            <div className="bg-gradient-to-r from-[#0A6847] via-[#0D7A54] to-[#0A6847] p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                    <FileText className="size-3" />
                    Official Tax Invoice
                  </div>
                  <h1 className="text-2xl font-black mt-1.5 tracking-tight">#{invoice.number}</h1>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Issued on {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="sm:text-right">
                  <Badge
                    className={
                      isPaid
                        ? 'bg-emerald-400 text-emerald-950 font-black px-3 py-1 text-xs shadow-xs'
                        : isReported
                        ? 'bg-amber-300 text-amber-950 font-black px-3 py-1 text-xs shadow-xs animate-pulse'
                        : 'bg-white/20 text-white font-bold px-3 py-1 text-xs'
                    }
                  >
                    {isPaid
                      ? 'PAID & VERIFIED ✓'
                      : isReported
                      ? 'PAYMENT VERIFYING...'
                      : 'PAYMENT DUE'}
                  </Badge>
                  <p className="text-3xl font-black mt-2 tracking-tight">
                    {currencySymbol}
                    {invoice.total.toFixed(2)}
                  </p>
                  {invoice.dueDate && (
                    <p className="text-[11.5px] text-emerald-100/80 mt-0.5">
                      Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To Info */}
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    Billed To
                  </p>
                  <p className="font-bold text-sm text-stone-900 mt-0.5">{invoice.customerName}</p>
                  {invoice.customerGstin && (
                    <p className="font-mono text-stone-600 text-[11px] mt-0.5">
                      GSTIN: {invoice.customerGstin}
                    </p>
                  )}
                  {invoice.customerPhone && (
                    <p className="text-stone-600 mt-0.5">Ph: {invoice.customerPhone}</p>
                  )}
                  {invoice.customerAddress && (
                    <p className="text-stone-500 mt-0.5 text-[11px] leading-relaxed">
                      {invoice.customerAddress}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    Invoice Status &amp; Sync
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>
                      Live Auto-Syncing (Checked {lastSyncedAt.toLocaleTimeString()})
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchInvoice()}
                      className="ml-1 text-stone-400 hover:text-stone-700 transition"
                      title="Sync now"
                    >
                      <RefreshCw className={`size-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {invoice.reportedPayment && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900">
                      <p className="font-bold flex items-center gap-1">
                        <Clock className="size-3 text-amber-600" />
                        Reported Reference:{' '}
                        <span className="font-mono">{invoice.reportedPayment.reference || 'Submitted'}</span>
                      </p>
                      <p className="text-stone-500 text-[10px] mt-0.5">
                        Your merchant has received your reference and is verifying with bank settlement.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Breakdown */}
          {invoice.items && invoice.items.length > 0 && (
            <Card className="shadow-2xs border-stone-200/90 rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                  <FileText className="size-4 text-[#0A6847]" />
                  Itemized Service &amp; Tax Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-stone-100">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-start text-xs">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-bold text-stone-800">{item.name}</p>
                        {item.description && (
                          <p className="text-stone-500 text-[11px] mt-0.5">{item.description}</p>
                        )}
                        {item.quantity && item.quantity > 1 && (
                          <p className="text-stone-400 text-[10px] mt-0.5">
                            Qty: {item.quantity} × {currencySymbol}
                            {(item.unitPrice || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className="font-mono font-bold text-stone-900 shrink-0">
                        {currencySymbol}
                        {(item.amount || item.unitPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-stone-50/70 p-4 border-t border-stone-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono font-semibold">
                      {currencySymbol}
                      {invoice.amount.toFixed(2)}
                    </span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount</span>
                      <span className="font-mono">
                        -{currencySymbol}
                        {invoice.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>GST Tax (CGST + SGST)</span>
                      <span className="font-mono font-semibold">
                        +{currencySymbol}
                        {invoice.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black pt-2.5 border-t border-stone-200 text-stone-900">
                    <span>Grand Total Due</span>
                    <span className="font-mono text-[#0A6847]">
                      {currencySymbol}
                      {invoice.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Payment Options Section ───────────────────────────────────── */}
          {!isPaid ? (
            <Card className="shadow-xs border-emerald-500/40 rounded-2xl bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-stone-100 bg-emerald-50/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-stone-900">
                    <CreditCard className="size-4 text-[#0A6847]" />
                    Choose Payment Option
                  </CardTitle>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="size-3 text-[#0A6847]" />
                    Direct Merchant Settlement
                  </span>
                </div>
                <CardDescription className="text-xs text-stone-500">
                  Pay directly to {branding?.businessName || 'the merchant'}. 100% safe &amp; instant.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <Tabs
                  defaultValue={
                    paymentMethods?.upi?.enabled
                      ? 'upi'
                      : paymentMethods?.razorpay?.enabled
                      ? 'online'
                      : 'bank'
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 text-xs bg-stone-100 rounded-xl p-1">
                    <TabsTrigger
                      value="upi"
                      disabled={!paymentMethods?.upi?.enabled}
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-2xs font-bold"
                    >
                      ⚡ UPI / QR
                    </TabsTrigger>
                    <TabsTrigger
                      value="online"
                      disabled={!paymentMethods?.razorpay?.enabled && !paymentMethods?.stripe?.enabled}
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-2xs font-bold"
                    >
                      💳 Instant Online
                    </TabsTrigger>
                    <TabsTrigger
                      value="bank"
                      disabled={!paymentMethods?.directBank?.enabled}
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-2xs font-bold"
                    >
                      🏦 Bank Transfer
                    </TabsTrigger>
                  </TabsList>

                  {/* ── 1. UPI QR Code & 1-Tap Mobile Intent ────────────────── */}
                  <TabsContent value="upi" className="space-y-4 pt-4">
                    {paymentMethods?.upi && (
                      <div className="space-y-4">
                        {/* Dynamic QR Code Card (Visual Layout matching Store) */}
                        <div className="p-5 rounded-2xl bg-[#F8FCFA] border border-[#DCE9E3] space-y-4">
                          <div className="flex flex-col sm:flex-row items-center gap-5">
                            {/* Visual QR Image */}
                            <div className="bg-white p-2.5 rounded-2xl border border-[#DCE9E3] shadow-sm shrink-0">
                              {dynamicQrMarkup ? (
                                // Safe to inline: markup is generated entirely by our
                                // local encoder — no user-controlled attributes.
                                <div
                                  className="w-44 h-44 rounded-xl"
                                  dangerouslySetInnerHTML={{ __html: dynamicQrMarkup }}
                                />
                              ) : (
                                <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">
                                  No QR Available
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0A6847] bg-[#E6F6F0] px-2.5 py-0.5 rounded-full">
                                <QrCode className="size-3" />
                                Scan with Any UPI App
                              </span>
                              <p className="text-xs text-stone-600 leading-relaxed">
                                Open Google Pay, PhonePe, Paytm, BHIM, or Cred on your phone to scan and pay instantly.
                              </p>
                              <div className="pt-1">
                                <p className="text-[11px] text-stone-400 font-medium">Exact Amount:</p>
                                <p className="text-2xl font-black text-[#0A6847]">
                                  {currencySymbol}
                                  {invoice.total.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* UPI ID Row with 1-Tap Copy */}
                          <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-[9.5px] text-stone-400 font-bold uppercase tracking-wider">
                                Merchant UPI ID
                              </p>
                              <p className="font-mono font-bold text-stone-800 truncate select-all text-xs">
                                {paymentMethods.upi.upiId}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(paymentMethods.upi?.upiId || '', 'upi')}
                              className="shrink-0 gap-1 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition active:scale-95"
                            >
                              {copiedKey === 'upi' ? (
                                <>
                                  <Check className="size-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Mobile 1-Tap Intent Button */}
                          {upiUri && (
                            <div className="space-y-1">
                              <a
                                href={upiUri}
                                onClick={handleOpenUpiApp}
                                className="w-full bg-gradient-to-r from-[#0A6847] via-[#0D7A54] to-[#0A6847] hover:from-[#085238] hover:to-[#085238] text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition cursor-pointer"
                              >
                                <Smartphone className="size-4" />
                                <span>
                                  Tap to Open UPI App ({currencySymbol}{invoice.total.toFixed(2)})
                                </span>
                              </a>
                              <p className="text-center text-[10px] text-stone-400">
                                Launches Google Pay, PhonePe, Paytm, or BHIM directly on your mobile device.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* ── Inline UTR / Reference Entry (For desktop & manual scanning) ── */}
                        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-stone-800">
                              Already Paid? Submit 12-Digit UPI Reference (UTR)
                            </Label>
                            <span className="text-[10px] text-stone-400 font-medium">
                              Optional but recommended
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={inlineUtr}
                              onChange={(e) =>
                                setInlineUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))
                              }
                              placeholder="e.g. 428901234567 (12 digits)"
                              maxLength={18}
                              className="font-mono text-xs rounded-xl h-10 border-stone-200"
                            />
                            <Button
                              type="button"
                              onClick={() => handleReportPayment('UPI', inlineUtr, '', 'inline')}
                              disabled={submittingInlineUtr || !inlineUtr.trim()}
                              className="bg-[#0A6847] hover:bg-[#085238] text-white font-bold text-xs h-10 px-4 rounded-xl shrink-0"
                            >
                              {submittingInlineUtr ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="size-3.5 mr-1" />
                                  Confirm
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-[10px] text-stone-400 leading-tight">
                            The UTR number is printed on your UPI payment confirmation screen and SMS.
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── 2. Online Gateway (Cards / Netbanking / Wallets) ────── */}
                  <TabsContent value="online" className="space-y-4 pt-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-500/20 space-y-3 text-center">
                      <ShieldCheck className="size-9 text-[#0A6847] mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">Instant Online Checkout</h4>
                        <p className="text-xs text-stone-500 mt-1">
                          Automated settlement with instant receipt generation.
                        </p>
                      </div>
                      <Button
                        onClick={handleRazorpayPay}
                        disabled={payingOnline}
                        className="w-full sm:w-auto px-8 bg-[#0A6847] hover:bg-[#085238] text-white font-bold text-sm rounded-xl shadow-xs"
                      >
                        {payingOnline ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" /> Processing...
                          </>
                        ) : (
                          <>Pay {currencySymbol}{invoice.total.toFixed(2)} Online</>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── 3. Direct Bank Transfer (NEFT / RTGS / IMPS / Wire) ──── */}
                  <TabsContent value="bank" className="space-y-4 pt-4">
                    {paymentMethods?.directBank && (
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase font-bold">Bank Name</p>
                            <p className="font-bold text-stone-900 mt-0.5">
                              {paymentMethods.directBank.bankName}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase font-bold">Beneficiary Name</p>
                            <p className="font-bold text-stone-900 mt-0.5">
                              {paymentMethods.directBank.accountName}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase font-bold">Account Number</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="font-mono font-bold text-stone-900">
                                {paymentMethods.directBank.accountNumber}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    paymentMethods.directBank?.accountNumber || '',
                                    'acc'
                                  )
                                }
                                className="text-stone-400 hover:text-stone-700"
                              >
                                {copiedKey === 'acc' ? (
                                  <Check className="size-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          {paymentMethods.directBank.ifscCode && (
                            <div>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">IFSC / Branch Code</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="font-mono font-bold text-stone-900">
                                  {paymentMethods.directBank.ifscCode}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(paymentMethods.directBank?.ifscCode || '', 'ifsc')
                                  }
                                  className="text-stone-400 hover:text-stone-700"
                                >
                                  {copiedKey === 'ifsc' ? (
                                    <Check className="size-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          {paymentMethods.directBank.iban && (
                            <div className="sm:col-span-2">
                              <p className="text-[10px] text-stone-400 uppercase font-bold">IBAN / SWIFT</p>
                              <p className="font-mono font-bold text-stone-900 mt-0.5">
                                {paymentMethods.directBank.iban}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                          <span>
                            Please use remark:{' '}
                            <strong className="text-stone-900 font-mono">Invoice #{invoice.number}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Bottom Assistance & Manual Notice Bar */}
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-stone-400" />
                    <span>Paid using cash, cheque, or other method?</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportModalOpen(true)}
                    className="w-full sm:w-auto text-xs font-semibold rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50"
                  >
                    <Send className="size-3 mr-1 text-[#0A6847]" />
                    Notify Merchant (Other Methods)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ── Paid Celebratory Card ────────────────────────────────────── */
            <Card className="shadow-xs border-emerald-500/40 bg-emerald-50/30 rounded-2xl overflow-hidden">
              <CardContent className="p-8 text-center space-y-4">
                <div className="size-14 rounded-full bg-emerald-100 text-[#0A6847] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="size-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-stone-900">Payment Confirmed &amp; Settled</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Thank you! Your payment of {currencySymbol}
                    {invoice.total.toFixed(2)} has been verified.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={handlePrintInvoice}
                    className="bg-[#0A6847] hover:bg-[#085238] text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Download Official Tax Invoice
                  </Button>

                  {branding?.phone && (
                    <Button
                      variant="outline"
                      onClick={handleWhatsAppMerchant}
                      className="border-emerald-300 text-[#0A6847] hover:bg-emerald-50 font-bold text-xs rounded-xl gap-1.5"
                    >
                      <MessageCircle className="size-3.5" />
                      WhatsApp Merchant Receipt
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal Safe-Harbor Notice */}
          <div className="text-center text-[11px] text-stone-400 space-y-0.5 pt-2">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="size-3 text-emerald-600" />
              Direct P2M/P2P Settlement: Payment transfers directly to{' '}
              <strong className="text-stone-600">{branding?.businessName || 'the merchant'}</strong>.
            </p>
            <p>ServiceOS does not hold, escrow, or intermediate merchant funds.</p>
          </div>
        </div>
      </div>

      {/* ── App-Return Detection Dialog (Triggered when user switches back from UPI app) ── */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="size-10 rounded-full bg-emerald-100 text-[#0A6847] flex items-center justify-center mb-1">
              <Sparkles className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-stone-900">
              Welcome back! Did you complete the payment?
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              We detected you just returned from your UPI app. Please confirm so we can notify{' '}
              {branding?.businessName || 'the merchant'} to dispatch your order/service immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center font-bold">
              <span className="text-stone-600">Amount Due:</span>
              <span className="text-base text-[#0A6847] font-black">
                {currencySymbol}
                {invoice.total.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800">
                12-Digit UPI Reference / UTR Number
              </Label>
              <Input
                autoFocus
                placeholder="e.g. 428901234567 (from your UPI receipt)"
                value={returnUtr}
                onChange={(e) => setReturnUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                maxLength={18}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-stone-400">
                Found in your Google Pay, PhonePe, or Paytm receipt screen.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReturnModalOpen(false)}
              className="rounded-xl text-stone-600"
            >
              Not Yet / Retry
            </Button>
            <Button
              size="sm"
              onClick={() => handleReportPayment('UPI', returnUtr, 'Reported after app return', 'return')}
              disabled={submittingReturnReport}
              className="bg-[#0A6847] hover:bg-[#085238] text-white font-bold text-xs rounded-xl"
            >
              {submittingReturnReport ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              Yes, I&apos;ve Paid (Submit Reference)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual "I've Paid" Report Modal (Other methods) ─────────────── */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
              <CheckCircle2 className="size-5 text-[#0A6847]" />
              Report Direct Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Notify {branding?.businessName || 'your provider'} that you have completed this payment offline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Payment Method Used</Label>
              <select
                value={reportMethod}
                onChange={(e) => setReportMethod(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm / BHIM)</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                <option value="Cash">Cash on Delivery / In Person</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Transaction Reference / UTR Number
              </Label>
              <Input
                placeholder="e.g. UTR-98214901 or Cheque #104"
                value={reportRef}
                onChange={(e) => setReportRef(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Additional Notes (Optional)</Label>
              <Input
                placeholder="e.g. Paid from HDFC account ending in 4102"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReportModalOpen(false)}
              className="rounded-xl text-stone-600"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleReportPayment(reportMethod, reportRef, reportNotes, 'manual')}
              disabled={submittingReport}
              className="bg-[#0A6847] hover:bg-[#085238] text-white font-semibold rounded-xl text-xs"
            >
              {submittingReport ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="size-3.5 mr-1.5" />
              )}
              Submit Payment Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
