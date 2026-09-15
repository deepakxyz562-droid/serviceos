'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  jobTitle: string | null;
  items: Array<{
    name: string;
    description?: string;
    unitPrice?: number;
    amount?: number;
    quantity?: number;
  }>;
}

interface BrandingData {
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
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

  // Manual payment report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportMethod, setReportMethod] = useState('Bank Transfer');
  const [reportRef, setReportRef] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/public/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        setBranding(data.branding);
        setPaymentMethods(data.paymentMethods);
      } else {
        toast.error('Invoice not found or expired');
      }
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Launch Razorpay Online Checkout
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
          color: '#059669', // Emerald
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
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

  // Submit manual "I've Paid"
  const handleReportPayment = async () => {
    if (!invoice) return;
    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/public/invoices/${invoice.id}/report-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: reportMethod,
          referenceNumber: reportRef,
          notes: reportNotes,
        }),
      });

      if (res.ok) {
        toast.success('Payment reported successfully!');
        setPaymentReported(true);
        setReportModalOpen(false);
        fetchInvoice();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to submit payment report');
      }
    } catch {
      toast.error('Network error submitting payment report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading invoice payment details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Invoice Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">This invoice link may be invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const currencySymbol = invoice.currency === 'INR' ? '₹' : '$';

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header Card */}
          <Card className="shadow-sm border-border/80 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Invoice Payment</p>
                  <h1 className="text-2xl font-black mt-0.5">{branding?.businessName || 'Service Provider'}</h1>
                  <p className="text-xs text-emerald-100/90 font-mono mt-1">Invoice #{invoice.number}</p>
                </div>
                <div className="sm:text-right">
                  <Badge
                    className={
                      isPaid
                        ? 'bg-emerald-400 text-emerald-950 font-bold px-3 py-1 text-xs'
                        : paymentReported
                        ? 'bg-amber-400 text-amber-950 font-bold px-3 py-1 text-xs'
                        : 'bg-white/20 text-white font-bold px-3 py-1 text-xs'
                    }
                  >
                    {isPaid ? 'PAID ✓' : paymentReported ? 'PAYMENT REPORTED' : 'PAYMENT DUE'}
                  </Badge>
                  <p className="text-2xl font-black mt-2">
                    {currencySymbol}
                    {invoice.total.toFixed(2)}
                  </p>
                  {invoice.dueDate && (
                    <p className="text-[11px] text-emerald-100/80">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To Info */}
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Billed To</p>
                  <p className="font-bold text-sm text-foreground mt-0.5">{invoice.customerName}</p>
                  {invoice.customerEmail && <p className="text-muted-foreground">{invoice.customerEmail}</p>}
                  {invoice.customerPhone && <p className="text-muted-foreground">{invoice.customerPhone}</p>}
                </div>
                {invoice.jobTitle && (
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Service</p>
                    <p className="font-semibold text-foreground mt-0.5">{invoice.jobTitle}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items Breakdown */}
          {invoice.items && invoice.items.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-emerald-600" />
                  Service Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-start text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        {item.description && <p className="text-muted-foreground mt-0.5">{item.description}</p>}
                      </div>
                      <p className="font-mono font-bold text-foreground">
                        {currencySymbol}
                        {(item.amount || item.unitPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 p-4 border-t space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{currencySymbol}{invoice.amount.toFixed(2)}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span className="font-mono">{currencySymbol}{invoice.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="font-mono">-{currencySymbol}{invoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t text-foreground">
                    <span>Total Due</span>
                    <span className="font-mono">{currencySymbol}{invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Payment Options Section ─────────────────────────────── */}
          {!isPaid ? (
            <Card className="shadow-sm border-emerald-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="size-5 text-emerald-600" />
                  Pay Provider Directly
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose your preferred payment method below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue={paymentMethods?.razorpay?.enabled ? 'online' : paymentMethods?.upi?.enabled ? 'upi' : 'bank'} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 text-xs">
                    <TabsTrigger value="online" disabled={!paymentMethods?.razorpay?.enabled && !paymentMethods?.stripe?.enabled}>
                      Instant Online
                    </TabsTrigger>
                    <TabsTrigger value="upi" disabled={!paymentMethods?.upi?.enabled}>
                      UPI / QR
                    </TabsTrigger>
                    <TabsTrigger value="bank" disabled={!paymentMethods?.directBank?.enabled}>
                      Bank Transfer
                    </TabsTrigger>
                  </TabsList>

                  {/* ── 1. Online Gateway (UPI / Cards / Apple Pay) ────────── */}
                  <TabsContent value="online" className="space-y-4 pt-3">
                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3 text-center">
                      <ShieldCheck className="size-8 text-emerald-600 mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm">Pay Instantly with UPI / Cards</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Instant automated receipt. Supports Google Pay, PhonePe, Paytm, Cards & Netbanking.
                        </p>
                      </div>
                      <Button
                        onClick={handleRazorpayPay}
                        disabled={payingOnline}
                        className="w-full sm:w-auto px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
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

                  {/* ── 2. UPI Direct ID ────────────────────────────────────── */}
                  <TabsContent value="upi" className="space-y-4 pt-3">
                    {paymentMethods?.upi && (
                      <div className="p-4 rounded-xl bg-muted/40 border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Provider UPI ID</p>
                            <p className="font-mono font-bold text-sm text-foreground mt-0.5">{paymentMethods.upi.upiId}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(paymentMethods.upi?.upiId || '', 'upi')}
                            className="gap-1 text-xs"
                          >
                            {copiedKey === 'upi' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            {copiedKey === 'upi' ? 'Copied' : 'Copy UPI'}
                          </Button>
                        </div>

                        {/* UPI Deep Link for Mobile */}
                        <a
                          href={`upi://pay?pa=${paymentMethods.upi.upiId}&pn=${encodeURIComponent(paymentMethods.upi.merchantName || branding?.businessName || 'Provider')}&am=${invoice.total}&tn=Invoice%20${invoice.number}`}
                          className="block w-full text-center py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
                        >
                          Open in UPI App (GPay / PhonePe / Paytm)
                        </a>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── 3. Bank Transfer ────────────────────────────────────── */}
                  <TabsContent value="bank" className="space-y-4 pt-3">
                    {paymentMethods?.directBank && (
                      <div className="p-4 rounded-xl bg-muted/40 border space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bank Name</p>
                            <p className="font-semibold text-foreground mt-0.5">{paymentMethods.directBank.bankName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Account Name</p>
                            <p className="font-semibold text-foreground mt-0.5">{paymentMethods.directBank.accountName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Account Number</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="font-mono font-bold text-foreground">{paymentMethods.directBank.accountNumber}</p>
                              <button
                                onClick={() => copyToClipboard(paymentMethods.directBank?.accountNumber || '', 'acc')}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {copiedKey === 'acc' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                          {paymentMethods.directBank.ifscCode && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Routing / IFSC / Sort Code</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="font-mono font-bold text-foreground">{paymentMethods.directBank.ifscCode}</p>
                                <button
                                  onClick={() => copyToClipboard(paymentMethods.directBank?.ifscCode || '', 'ifsc')}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {copiedKey === 'ifsc' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {paymentMethods.directBank.iban && (
                            <div className="sm:col-span-2">
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">IBAN / SWIFT</p>
                              <p className="font-mono font-bold text-foreground mt-0.5">{paymentMethods.directBank.iban}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Please include reference: <strong className="text-foreground font-mono">{invoice.number}</strong></span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* "I've Paid" CTA button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Transferred directly? Let your provider know.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportModalOpen(true)}
                    className="w-full sm:w-auto gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <CheckCircle2 className="size-3.5" />
                    I&apos;ve Paid (Submit Reference)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardContent className="p-6 text-center space-y-2">
                <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-foreground">This Invoice is Paid</h3>
                <p className="text-xs text-muted-foreground">Thank you for your business! Your receipt has been issued.</p>
              </CardContent>
            </Card>
          )}

          {/* Legal Non-Intermediary Notice */}
          <div className="text-center text-[11px] text-muted-foreground space-y-1 pt-4">
            <p className="flex items-center justify-center gap-1">
              <Info className="size-3" />
              Payment is made directly to <strong>{branding?.businessName || 'the service provider'}</strong>.
            </p>
            <p>Fieseros does not process, receive, hold, or escrow customer funds.</p>
          </div>
        </div>
      </div>

      {/* ── "I've Paid" Report Modal ───────────────────────────────── */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Report Direct Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Let {branding?.businessName || 'your provider'} know you have completed the transfer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method Used</Label>
              <select
                value={reportMethod}
                onChange={(e) => setReportMethod(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Bank Transfer">Bank Transfer / Wire</option>
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="PayPal">PayPal</option>
                <option value="Cash">Cash on Site</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Transaction Reference / UTR Number</Label>
              <Input
                placeholder="e.g. UTR-98214901 or Check #104"
                value={reportRef}
                onChange={(e) => setReportRef(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Additional Notes (Optional)</Label>
              <Input
                placeholder="e.g. Sent from John's Chase account"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReportPayment}
              disabled={submittingReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submittingReport ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Send className="size-3.5 mr-1.5" />}
              Submit Payment Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
