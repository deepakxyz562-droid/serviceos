"use client";

import { useEffect, useState, useRef, use } from "react";
import {
  CheckCircle2,
  Download,
  Printer,
  MessageCircle,
  ShieldCheck,
  Calendar,
  Building,
  CreditCard,
  FileCheck,
  AlertCircle,
  Loader2,
  Eraser,
  PenTool,
} from "lucide-react";
import { formatCurrency, computeInvoiceTotals, type ProposalTier } from "@/lib/quote-flow-calc";

interface ClientDocData {
  docType: "QUOTE" | "INVOICE";
  id: string;
  number: string;
  status: string;
  validUntil?: string | null;
  dueDate?: string | null;
  createdAt: string;
  notes?: string;
  discountValue: number;
  discountType: "AMOUNT" | "PERCENT" | string;
  taxRate: number;
  pdfTemplate: string;
  items: Array<{
    id?: string;
    description: string;
    qty: number;
    unitPrice: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
  };
  paidAmount?: number;
  balanceDue?: number;
  isMultiTier?: boolean;
  tiers?: ProposalTier[];
  signature?: {
    dataUrl: string;
    signedAt: string;
    signerName: string;
  } | null;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  business: {
    name: string;
    ownerName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    currency: string;
    currencySymbol: string;
  };
}

export default function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [data, setData] = useState<ClientDocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-tier selection
  const [activeTierId, setActiveTierId] = useState<string>("professional");

  // Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  // Payment Simulation State
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/quote-flow/public-doc/${docId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Document not found or access expired");
        return res.json();
      })
      .then((json: ClientDocData) => {
        setData(json);
        if (json.customer?.name) {
          setSignerName(json.customer.name);
        }
        if (json.isMultiTier && json.tiers && json.tiers.length > 0) {
          const rec = json.tiers.find((t) => t.isRecommended) || json.tiers[1] || json.tiers[0];
          setActiveTierId(rec.id);
        }
        if (json.signature) {
          setSignedSuccess(true);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load document");
      })
      .finally(() => setLoading(false));
  }, [docId]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Sign & Accept Proposal
  const handleAcceptProposal = async () => {
    if (!data) return;
    let signatureDataUrl = "";
    if (canvasRef.current && hasDrawn) {
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/quote-flow/public-doc/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACCEPT",
          signatureDataUrl,
          signerName: signerName || data.customer.name,
          selectedTierId: data.isMultiTier ? activeTierId : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to record acceptance");
      setSignedSuccess(true);
      setData((prev) => (prev ? { ...prev, status: "ACCEPTED" } : null));
    } catch (e: any) {
      alert(e.message || "Could not complete acceptance. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  // Payment simulation
  const handleSimulatePayment = async () => {
    if (!data) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/quote-flow/public-doc/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT_SIMULATION",
          amount: data.balanceDue || data.totals.total,
          method: "UPI_ONLINE",
        }),
      });

      if (!res.ok) throw new Error("Payment simulation failed");
      setPaymentSuccess(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: "PAID",
              paidAmount: prev.totals.total,
              balanceDue: 0,
            }
          : null
      );
    } catch (e: any) {
      alert(e.message || "Payment processing error.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading interactive proposal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Proposal Not Available</h2>
          <p className="text-slate-600 text-sm mb-6">{error || "This link may have expired or is invalid."}</p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Active items and totals (support multi-tier dynamically)
  let displayedItems = data.items;
  let displayedTotals = data.totals;

  if (data.isMultiTier && data.tiers && data.tiers.length > 0) {
    const currentTier = data.tiers.find((t) => t.id === activeTierId) || data.tiers[0];
    if (currentTier) {
      displayedItems = currentTier.items.map((i, idx) => ({
        id: `tier-item-${idx}`,
        description: i.description || "Package Item",
        qty: i.qty || 1,
        unitPrice: i.unitPrice || 0,
      }));
      displayedTotals = computeInvoiceTotals({
        items: currentTier.items,
        discountValue: currentTier.discountValue,
        discountType: currentTier.discountType,
        globalTaxRate: data.taxRate,
      });
    }
  }

  const pdfUrl = `/api/quote-flow/${data.docType === "QUOTE" ? "quotes" : "invoices"}/${data.id}/pdf`;
  const isQuote = data.docType === "QUOTE";
  const isAccepted = data.status === "ACCEPTED" || signedSuccess;
  const isPaid = data.status === "PAID" || paymentSuccess;

  // WhatsApp owner link
  const rawBusinessPhone = (data.business.phone || "").replace(/[^0-9+]/g, "");
  const whatsappOwnerUrl = rawBusinessPhone
    ? `https://wa.me/${rawBusinessPhone.replace("+", "")}?text=${encodeURIComponent(
        `Hi ${data.business.name}, I'm reviewing ${data.docType} #${data.number} for ${formatCurrency(
          displayedTotals.total,
          data.business.currency,
          data.business.currencySymbol
        )}.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/60 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Floating Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200/80 shadow-sm sticky top-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Client Portal 2026
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 font-medium">
            {data.business.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
          {whatsappOwnerUrl && (
            <a
              href={whatsappOwnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Us
            </a>
          )}
        </div>
      </div>

      {/* Main Document Container */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/70 overflow-hidden">
        {/* Document Header Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-white/10 text-emerald-400 border border-white/10">
                {data.docType === "QUOTE" ? "Official Estimate / Proposal" : "Tax Invoice"}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
                #{data.number}
              </h1>
              <p className="text-slate-400 text-sm">
                Issued on{" "}
                {new Date(data.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Status Pill */}
            <div className="sm:text-right">
              {isAccepted ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  PROPOSAL ACCEPTED
                </div>
              ) : isPaid ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  PAID IN FULL
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-sm font-bold">
                  <Calendar className="w-4 h-4" />
                  {isQuote ? `Valid until ${data.validUntil ? new Date(data.validUntil).toLocaleDateString() : "receipt"}` : `Due by ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "receipt"}`}
                </div>
              )}
              <div className="mt-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Investment</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {formatCurrency(displayedTotals.total, data.business.currency, data.business.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business & Customer Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prepared By</h3>
            <p className="text-base font-bold text-slate-900">{data.business.name}</p>
            {data.business.ownerName && <p className="text-sm text-slate-600">{data.business.ownerName}</p>}
            {data.business.phone && <p className="text-sm text-slate-600">Tel: {data.business.phone}</p>}
            {data.business.email && <p className="text-sm text-slate-600">Email: {data.business.email}</p>}
            {data.business.address && <p className="text-xs text-slate-500 mt-1">{data.business.address}</p>}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prepared For</h3>
            <p className="text-base font-bold text-slate-900">{data.customer.name}</p>
            {data.customer.email && <p className="text-sm text-slate-600">Email: {data.customer.email}</p>}
            {data.customer.phone && <p className="text-sm text-slate-600">Phone: {data.customer.phone}</p>}
            {data.customer.address && <p className="text-xs text-slate-500 mt-1">{data.customer.address}</p>}
          </div>
        </div>

        {/* 2026 Multi-Tier Option Selector (if active) */}
        {data.isMultiTier && data.tiers && data.tiers.length > 0 && !isAccepted && (
          <div className="p-6 sm:p-10 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
                Choose Your Package Tier (Good / Better / Best)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-6">
              Review and select the proposal option that best aligns with your goals. The scope and total below will update instantly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.tiers.map((tier) => {
                const isSelected = activeTierId === tier.id;
                const tierTotal = computeInvoiceTotals({
                  items: tier.items,
                  discountValue: tier.discountValue,
                  discountType: tier.discountType,
                  globalTaxRate: data.taxRate,
                }).total;

                return (
                  <div
                    key={tier.id}
                    onClick={() => setActiveTierId(tier.id)}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                      isSelected
                        ? "border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {tier.isRecommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                        Recommended
                      </span>
                    )}
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{tier.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{tier.description || "Complete scope package"}</p>
                    <div className="text-lg font-black text-slate-900">
                      {formatCurrency(tierTotal, data.business.currency, data.business.currencySymbol)}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      {isSelected ? "✓ Selected Option" : "Click to select"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Itemized Scope & Pricing Table */}
        <div className="p-6 sm:p-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Itemized Scope & Pricing</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2 text-right">Qty</th>
                  <th className="py-3 px-2 text-right">Unit Price</th>
                  <th className="py-3 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {displayedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-medium text-slate-800">{item.description}</td>
                    <td className="py-3.5 px-2 text-right text-slate-600">{item.qty}</td>
                    <td className="py-3.5 px-2 text-right text-slate-600">
                      {formatCurrency(item.unitPrice, data.business.currency, data.business.currencySymbol)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900">
                      {formatCurrency(item.qty * item.unitPrice, data.business.currency, data.business.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="mt-6 flex flex-col sm:flex-row justify-end">
            <div className="w-full sm:w-80 space-y-2 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(displayedTotals.subtotal, data.business.currency, data.business.currencySymbol)}</span>
              </div>
              {displayedTotals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(displayedTotals.discount, data.business.currency, data.business.currencySymbol)}</span>
                </div>
              )}
              {displayedTotals.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({data.taxRate}%)</span>
                  <span>+{formatCurrency(displayedTotals.tax, data.business.currency, data.business.currencySymbol)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-base">
                <span>Total Amount</span>
                <span>{formatCurrency(displayedTotals.total, data.business.currency, data.business.currencySymbol)}</span>
              </div>
              {data.paidAmount !== undefined && data.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(data.paidAmount, data.business.currency, data.business.currencySymbol)}</span>
                </div>
              )}
              {data.balanceDue !== undefined && (
                <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
                  <span>Balance Due</span>
                  <span>{formatCurrency(data.balanceDue, data.business.currency, data.business.currencySymbol)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {data.notes && (
          <div className="px-6 sm:px-10 pb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Notes</h4>
            <div className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
              {data.notes}
            </div>
          </div>
        )}

        {/* Interactive Action Section */}
        {isQuote && (
          <div className="border-t border-slate-200 bg-slate-50/70 p-6 sm:p-10">
            {isAccepted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-emerald-950">Proposal Accepted & Signed</h3>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  Thank you! We have logged your acceptance. A confirmation has been dispatched to {data.business.name}.
                </p>
                {data.signature?.dataUrl && (
                  <div className="mt-4 inline-block bg-white p-3 rounded-xl border border-emerald-200">
                    <img src={data.signature.dataUrl} alt="Signed" className="max-h-16 mx-auto" />
                    <p className="text-[10px] text-slate-400 mt-1">Signed by {data.signature.signerName || data.customer.name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PenTool className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">Sign & Accept Proposal</h3>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Draw your digital signature below and click "Accept & Sign Proposal" to lock in this agreement.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">Digital Signature Pad</label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                      >
                        <Eraser className="w-3 h-3" /> Clear
                      </button>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden relative touch-none">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={120}
                        className="w-full h-28 cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!hasDrawn && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-medium">
                          Draw signature here using finger, stylus, or mouse
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    By signing, you agree to the terms outlined in this proposal from {data.business.name}.
                  </p>
                  <button
                    onClick={handleAcceptProposal}
                    disabled={signing}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-sm flex items-center gap-2 transition"
                  >
                    {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    Accept & Sign Proposal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoice Payment Section */}
        {!isQuote && (
          <div className="border-t border-slate-200 bg-slate-50/70 p-6 sm:p-10">
            {isPaid ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-emerald-950">Invoice Paid in Full</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Payment has been received. Thank you for your business!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">Payment Options</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Direct Bank Transfer / UPI
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{data.business.name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      UPI / VPA: <span className="font-mono text-slate-800">{data.business.phone ? `${data.business.phone.replace(/[^0-9]/g, "")}@upi` : "pay@business"}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Please quote #{data.number} in payment reference.</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Instant Online Pay
                      </span>
                      <p className="text-xs text-slate-600">Simulate 1-tap instant payment checkout for demo & review.</p>
                    </div>
                    <button
                      onClick={handleSimulatePayment}
                      disabled={paying}
                      className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                      Pay Now ({formatCurrency(data.balanceDue || data.totals.total, data.business.currency, data.business.currencySymbol)})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-slate-900 text-center text-slate-400 text-xs">
          Powered by ServiceOS QuoteFlow · Secure Client Portal 2026
        </div>
      </div>
    </div>
  );
}
