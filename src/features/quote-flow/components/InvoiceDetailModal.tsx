"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch, apiDelete, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, MoreHorizontal, Send, Download, CheckCircle2, Edit, Printer, Palette, Copy, FileText, ArrowLeft, Trash2, MessageSquare, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/quote-flow-calc";
import { getTemplateTheme } from "@/features/quote-flow/lib/template-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InvoiceDetailModal({ invoiceId }: { invoiceId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoice: any }>(`/api/invoices/${invoiceId}`);
      setInv(r.invoice);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [invoiceId]);

  async function markPaid() {
    setBusy(true);
    try {
      await apiPost(`/api/invoices/${invoiceId}/pay`, {
        amount: inv.total,
        method: "MANUAL",
      });
      await apiPatch(`/api/invoices/${invoiceId}`, { status: "PAID" });
      await load();
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    if (!payAmount) return;
    setBusy(true);
    try {
      const amount = parseFloat(payAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount");
        setBusy(false);
        return;
      }
      await apiPost(`/api/invoices/${invoiceId}/pay`, {
        amount,
        method: "MANUAL",
      });
      setShowPayForm(false);
      setPayAmount("");
      await load();
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!inv) return;
    try {
      toast.loading("Preparing PDF...", { id: "pdf-dl" });
      const res = await fetch(`/api/quote-flow/invoices/${inv.id}/pdf?download=1`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded successfully", { id: "pdf-dl" });
    } catch (err: any) {
      toast.error(err.message || "Could not download PDF", { id: "pdf-dl" });
    }
  }

  function handlePrint() {
    window.print();
  }

  async function duplicateInvoice() {
    if (!inv) return;
    setBusy(true);
    try {
      const items = (inv.items || []).map((it: any) => ({
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));
      const r = await apiPost<{ invoice: any }>("/api/invoices", {
        customerId: inv.customerId,
        items,
        discountValue: inv.discountValue,
        discountType: inv.discountType,
        taxRate: inv.taxRate,
        notes: inv.notes,
        pdfTemplate: inv.pdfTemplate,
      });
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      openModal({ type: "invoice-detail", invoiceId: r.invoice.id });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function convertToEstimate() {
    if (!inv) return;
    setBusy(true);
    try {
      const r = await apiPost<{ quote: any }>(`/api/invoices/${inv.id}/convert-to-estimate`);
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
      toast.success(`Converted to Estimate ${r.quote.number}`);
      closeModal();
      openModal({ type: "quote-detail", quoteId: r.quote.id });
    } catch (e: any) {
      toast.error(e.message || "Failed to convert to estimate");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this invoice?")) return;
    setBusy(true);
    try {
      await apiDelete(`/api/invoices/${invoiceId}`);
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      closeModal();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  if (!inv) return null;

  const theme = getTemplateTheme(inv.pdfTemplate, "classic-corporate-blue");
  const isPaid = inv.status === "PAID" || (inv.balance <= 0 && inv.total > 0);
  const items = inv.items || [];

  return (
    <div className="fixed inset-0 z-40 bg-[#eef2f6] overflow-y-auto">
      {/* Top sticky navbar */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur shadow-sm">
        <button onClick={closeModal} className="text-stone-600 hover:text-stone-900 flex items-center gap-1.5 text-sm font-medium">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h2 className="text-base font-bold text-stone-900">{inv.number}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomed(!zoomed)}
            className="h-8 w-8 p-0 text-slate-600"
            title={zoomed ? "Standard view" : "Zoom view"}
          >
            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal({ type: "invoice-edit", invoiceId: inv.id })}>
                <Edit className="mr-2 h-4 w-4" /> Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal({ type: "customize", documentId: inv.id, documentType: "invoice" })}>
                <Palette className="mr-2 h-4 w-4" /> Customize Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal({ type: "send-invoice", invoiceId: inv.id })}>
                <Send className="mr-2 h-4 w-4" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={duplicateInvoice}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={convertToEstimate}>
                <FileText className="mr-2 h-4 w-4" /> Convert to Estimate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={remove} className="text-red-600 focus:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="px-3 py-6 pb-48 md:px-6">
        {/* The White A4 Document Sheet (1:1 with media_1790971011559.jpg) */}
        <div
          id="invoice-document-sheet"
          className={`invoice-preview relative mx-auto rounded bg-white p-6 shadow-md transition-all md:p-8 ${
            zoomed ? "max-w-4xl" : "max-w-2xl"
          }`}
          style={{ minHeight: "520px" }}
        >
          {/* Document Header: Logo & BizName on left, INVOICE large text on right */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {business?.logoUrl && (
                <img
                  src={business.logoUrl}
                  alt={business?.name || "Logo"}
                  className="mb-2 h-10 w-auto object-contain"
                />
              )}
              <h1 className="text-base font-bold text-slate-900">
                {business?.name || "Your Company"}
              </h1>
              {business?.email && (
                <p className="text-xs text-slate-500">{business.email}</p>
              )}
              {business?.phone && (
                <p className="text-xs text-slate-500">{business.phone}</p>
              )}
            </div>
            <div className="text-right">
              <h2
                className="text-2xl font-black tracking-wider md:text-3xl"
                style={{ color: theme.accent }}
              >
                INVOICE
              </h2>
            </div>
          </div>

          {/* Thin Horizontal Divider Rule */}
          <div
            className="my-4 h-px w-full"
            style={{ backgroundColor: theme.accent, opacity: 0.3 }}
          />

          {/* Two-Column Info Bar: BILL TO on left, Metadata Grid on right */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
            {/* BILL TO */}
            <div className="flex-1">
              <p className="mb-1 text-xs font-extrabold uppercase text-slate-900">
                BILL TO
              </p>
              <p className="text-sm font-bold text-slate-900">
                {inv.customer?.name || "Unknown Client"}
              </p>
              {inv.customer?.address && (
                <p className="text-xs text-slate-500">{inv.customer.address}</p>
              )}
              {inv.customer?.phone && (
                <p className="text-xs text-slate-500">{inv.customer.phone}</p>
              )}
              {inv.customer?.email && (
                <p className="text-xs text-slate-500">{inv.customer.email}</p>
              )}
            </div>

            {/* Key-Value Metadata 2-Column Block */}
            <div className="grid grid-cols-2 gap-x-3 text-xs sm:w-56">
              <div className="space-y-1 font-bold text-slate-900">
                <p>INVOICE #</p>
                <p>DATE</p>
                <p>DUE DATE</p>
              </div>
              <div className="space-y-1 text-right text-slate-600">
                <p>{inv.number}</p>
                <p>
                  {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-GB")}
                </p>
                <p>
                  {inv.dueDate
                    ? new Date(inv.dueDate).toLocaleDateString("en-GB")
                    : "On receipt"}
                </p>
              </div>
            </div>
          </div>

          {/* Bordered Table Grid with Vertical Column Dividers */}
          <div
            className="mb-6 overflow-hidden rounded border text-xs"
            style={{ borderColor: theme.gridBorderColor }}
          >
            {/* Header Row */}
            <div
              className="flex items-center px-3 py-2 font-extrabold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              <div className="flex-1">Description</div>
              <div className="w-14 text-center">QTY</div>
              <div className="w-24 text-right">Price</div>
              <div className="w-28 text-right">Amount</div>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div
                className="flex items-center border-b px-3 py-4 text-center text-slate-400"
                style={{ borderColor: theme.gridBorderColor }}
              >
                No items added
              </div>
            ) : (
              items.map((it: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center border-b"
                  style={{
                    borderColor: theme.gridBorderColor,
                    backgroundColor: idx % 2 === 1 ? theme.lightAccent : "#ffffff",
                  }}
                >
                  <div
                    className="flex-1 border-r px-3 py-2.5 font-bold text-slate-900"
                    style={{ borderColor: theme.gridBorderColor }}
                  >
                    {it.description}
                  </div>
                  <div
                    className="w-14 border-r px-2 py-2.5 text-center text-slate-700"
                    style={{ borderColor: theme.gridBorderColor }}
                  >
                    {it.qty}
                  </div>
                  <div
                    className="w-24 border-r px-2 py-2.5 text-right text-slate-700"
                    style={{ borderColor: theme.gridBorderColor }}
                  >
                    {formatCurrency(it.unitPrice, business?.currency, business?.currencySymbol)}
                  </div>
                  <div className="w-28 px-3 py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(
                      it.qty * it.unitPrice,
                      business?.currency,
                      business?.currencySymbol
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Summary Wrap */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(inv.subtotal || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>

              {inv.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Discount</span>
                  <span className="font-bold text-slate-900">
                    -{formatCurrency(inv.discount || 0, business?.currency, business?.currencySymbol)}
                  </span>
                </div>
              )}

              {inv.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Tax ({inv.taxRate || 0}%)</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(inv.tax || 0, business?.currency, business?.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Paid</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(inv.paidAmount || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>

              {/* Solid Accent BALANCE DUE Banner */}
              <div
                className="mt-2 flex items-center justify-between px-3 py-2 text-xs font-black tracking-wide text-white"
                style={{ backgroundColor: theme.accent }}
              >
                <span>BALANCE DUE</span>
                <span className="text-sm">
                  {formatCurrency(inv.balance || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Watermark stamp if paid */}
          {isPaid && (
            <div className="pointer-events-none absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-emerald-600 px-6 py-2 font-black tracking-widest text-emerald-600 opacity-80 text-3xl">
              PAID
            </div>
          )}
        </div>

        {/* Floating Bottom Summary Card (1:1 with media_1790971011559.jpg) */}
        <div className="no-print mx-auto mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          {/* Row 1: Due date on left, Status pill on right */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Due on{" "}
              {inv.dueDate
                ? new Date(inv.dueDate).toLocaleDateString("en-GB")
                : "On receipt"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-semibold ${
                isPaid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {isPaid ? "Paid" : "Unpaid"}
            </span>
          </div>

          {/* Row 2: Large total amount */}
          <div className="my-1 text-2xl font-black text-slate-900">
            {formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}
          </div>

          {/* Row 3: Client name on left, Not sent / Sent pill on right */}
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-700">
            <span>{inv.customer?.name || "Unknown Client"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
              Not sent
            </span>
          </div>

          {/* Primary Send Button */}
          <Button
            onClick={() => openModal({ type: "send-invoice", invoiceId: inv.id })}
            className="w-full gap-2 py-2.5 font-semibold text-white shadow-sm"
            style={{ backgroundColor: theme.accent }}
          >
            <Send className="h-4 w-4" /> Send Invoice
          </Button>

          {/* Quick Actions Row */}
          <div className="mt-3 flex items-center justify-around border-t border-slate-100 pt-3 text-xs">
            <button
              onClick={handleDownloadPdf}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Download className="h-4 w-4" />
              </div>
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Printer className="h-4 w-4" />
              </div>
              <span>Print</span>
            </button>
            <button
              onClick={() => openModal({ type: "invoice-edit", invoiceId: inv.id })}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Edit className="h-4 w-4" />
              </div>
              <span>Edit</span>
            </button>
            {inv.status !== "PAID" && (
              <button
                onClick={() => setShowPayForm(!showPayForm)}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Pay</span>
              </button>
            )}
          </div>

          {/* Optional inline pay form */}
          {showPayForm && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <label className="text-xs font-semibold text-slate-800">Record Payment</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(inv.balance)}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <Button
                  onClick={recordPayment}
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Record
                </Button>
                <Button
                  onClick={markPaid}
                  size="sm"
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-100"
                >
                  Mark Full
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
