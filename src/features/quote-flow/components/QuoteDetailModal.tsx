"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch, apiDelete, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Pencil, Copy, Trash2, MoreHorizontal, Send, Download, Sparkles, Edit, Printer, Palette, ZoomIn, ZoomOut, CheckCircle2, FileText } from "lucide-react";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";
import { getTemplateTheme } from "@/features/quote-flow/lib/template-themes";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DiffEntry {
  field: string;
  before: string | null;
  after: string | null;
}

export function QuoteDetailModal({ quoteId }: { quoteId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // AI edit state
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiDiff, setAiDiff] = useState<DiffEntry[] | null>(null);
  const [aiPending, setAiPending] = useState<any | null>(null); // pending updated quote
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ quote: any }>(`/api/quotes/${quoteId}`);
      setQuote(r.quote);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [quoteId]);

  async function markAccepted() {
    setBusy(true);
    try {
      await apiPatch(`/api/quotes/${quoteId}`, { status: "ACCEPTED" });
      await load();
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markDeclined() {
    setBusy(true);
    try {
      await apiPatch(`/api/quotes/${quoteId}`, { status: "DECLINED" });
      await load();
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!quote) return;
    try {
      toast.loading("Preparing PDF...", { id: "pdf-dl" });
      const res = await fetch(`/api/quote-flow/quotes/${quote.id}/pdf?download=1`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.number}.pdf`;
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

  async function convertToInvoice() {
    setBusy(true);
    try {
      const r = await apiPost<{ invoice: any; alreadyExists?: boolean }>(
        `/api/quotes/${quoteId}/convert-to-invoice`
      );
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      closeModal();
      if (r.alreadyExists) {
        alert("This quote was already converted — opening the existing invoice.");
      }
      openModal({ type: "invoice-detail", invoiceId: r.invoice.id });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function aiEdit() {
    if (!aiInstruction.trim() || !quote) return;
    setAiProcessing(true);
    setAiDiff(null);
    setAiPending(null);
    setAiSummary(null);
    try {
      const r = await apiPost<{ edit: any }>("/api/ai/edit-quote", {
        currentQuote: {
          items: quote.items.map((i: any) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
          discountValue: quote.discountValue,
          discountType: quote.discountType,
          taxRate: quote.taxRate,
          notes: quote.notes,
        },
        instruction: aiInstruction,
      });
      setAiPending(r.edit);
      setAiDiff(r.edit.diff || []);
      setAiSummary(r.edit.summary || null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAiProcessing(false);
    }
  }

  async function applyAiChanges() {
    if (!aiPending) return;
    setBusy(true);
    try {
      await apiPatch(`/api/quotes/${quoteId}`, {
        discountValue: aiPending.discountValue,
        discountType: aiPending.discountType,
        taxRate: aiPending.taxRate,
        notes: aiPending.notes,
        items: aiPending.items.map((i: any) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
      });
      setAiPending(null);
      setAiDiff(null);
      setAiSummary(null);
      setAiInstruction("");
      await load();
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function discardAiChanges() {
    setAiPending(null);
    setAiDiff(null);
    setAiSummary(null);
    setAiInstruction("");
  }

  async function duplicateQuote() {
    setBusy(true);
    try {
      // create a copy with new number
      if (!quote) return;
      const nextNumber = `Q-${(business?.quoteSeq ?? 1000) + 1}`;
      // Use server endpoint? for simplicity, use quotes POST if it exists; otherwise skip
      // For Phase 1 just close
      alert("Duplicate will be implemented in Phase 3.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this quote?")) return;
    setBusy(true);
    try {
      await apiDelete(`/api/quotes/${quoteId}`);
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
      closeModal();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  if (!quote) return null;

  const theme = getTemplateTheme(quote.pdfTemplate, "soft-emerald-wave");
  const isAccepted = quote.status === "ACCEPTED";
  const items = quote.items || [];

  return (
    <div className="fixed inset-0 z-40 bg-[#eef2f6] overflow-y-auto">
      {/* Top sticky navbar */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur shadow-sm">
        <button onClick={closeModal} className="text-stone-600 hover:text-stone-900 flex items-center gap-1.5 text-sm font-medium">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h2 className="text-base font-bold text-stone-900">{quote.number}</h2>
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
              <DropdownMenuItem onClick={() => openModal({ type: "quote-edit", quoteId: quote.id })}>
                <Edit className="mr-2 h-4 w-4" /> Edit Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal({ type: "customize", documentId: quote.id, documentType: "quote" })}>
                <Palette className="mr-2 h-4 w-4" /> Customize Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal({ type: "send-quote", quoteId: quote.id })}>
                <Send className="mr-2 h-4 w-4" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={duplicateQuote}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={convertToInvoice}>
                <FileText className="mr-2 h-4 w-4" /> Convert to Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markAccepted}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Mark accepted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markDeclined}>
                Mark declined
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
          id="quote-document-sheet"
          className={`invoice-preview relative mx-auto rounded bg-white p-6 shadow-md transition-all md:p-8 ${
            zoomed ? "max-w-4xl" : "max-w-2xl"
          }`}
          style={{ minHeight: "520px" }}
        >
          {/* Document Header: Logo & BizName on left, ESTIMATE large text on right */}
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
                ESTIMATE
              </h2>
            </div>
          </div>

          {/* Thin Horizontal Divider Rule */}
          <div
            className="my-4 h-px w-full"
            style={{ backgroundColor: theme.accent, opacity: 0.3 }}
          />

          {/* Two-Column Info Bar: ESTIMATE FOR on left, Metadata Grid on right */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
            {/* ESTIMATE FOR */}
            <div className="flex-1">
              <p className="mb-1 text-xs font-extrabold uppercase text-slate-900">
                ESTIMATE FOR
              </p>
              <p className="text-sm font-bold text-slate-900">
                {quote.customer?.name || "Unknown Client"}
              </p>
              {quote.customer?.address && (
                <p className="text-xs text-slate-500">{quote.customer.address}</p>
              )}
              {quote.customer?.phone && (
                <p className="text-xs text-slate-500">{quote.customer.phone}</p>
              )}
              {quote.customer?.email && (
                <p className="text-xs text-slate-500">{quote.customer.email}</p>
              )}
            </div>

            {/* Key-Value Metadata 2-Column Block */}
            <div className="grid grid-cols-2 gap-x-3 text-xs sm:w-56">
              <div className="space-y-1 font-bold text-slate-900">
                <p>QUOTE #</p>
                <p>DATE</p>
                <p>VALID UNTIL</p>
              </div>
              <div className="space-y-1 text-right text-slate-600">
                <p>{quote.number}</p>
                <p>
                  {new Date(quote.createdAt || Date.now()).toLocaleDateString("en-GB")}
                </p>
                <p>
                  {quote.validUntil
                    ? new Date(quote.validUntil).toLocaleDateString("en-GB")
                    : "30 days"}
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
                  {formatCurrency(quote.subtotal || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>

              {quote.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Discount</span>
                  <span className="font-bold text-slate-900">
                    -{formatCurrency(quote.discount || 0, business?.currency, business?.currencySymbol)}
                  </span>
                </div>
              )}

              {quote.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Tax ({quote.taxRate || 0}%)</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(quote.tax || 0, business?.currency, business?.currencySymbol)}
                  </span>
                </div>
              )}

              {/* Solid Accent ESTIMATE TOTAL Banner */}
              <div
                className="mt-2 flex items-center justify-between px-3 py-2 text-xs font-black tracking-wide text-white"
                style={{ backgroundColor: theme.accent }}
              >
                <span>ESTIMATE TOTAL</span>
                <span className="text-sm">
                  {formatCurrency(quote.total || 0, business?.currency, business?.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Watermark stamp if accepted */}
          {isAccepted && (
            <div className="pointer-events-none absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-emerald-600 px-6 py-2 font-black tracking-widest text-emerald-600 opacity-80 text-3xl">
              ACCEPTED
            </div>
          )}
        </div>

        {/* AI edit panel */}
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-800">
            <Sparkles className="h-4 w-4" />
            Edit with AI
          </div>
          <p className="mb-2 text-xs text-stone-600">
            Try: &quot;make labor $150&quot; · &quot;add disposal fee $50&quot; · &quot;give 10% discount&quot;
          </p>
          <textarea
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="What would you like to change?"
            rows={2}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button
            onClick={aiEdit}
            disabled={aiProcessing || !aiInstruction.trim()}
            size="sm"
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {aiProcessing ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3 w-3" />
            )}
            {aiProcessing ? "AI is thinking..." : "Update with AI"}
          </Button>
          {aiSummary && (
            <div className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-stone-700">
              <span className="font-semibold">Summary:</span> {aiSummary}
            </div>
          )}
          {aiDiff && aiDiff.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-semibold text-stone-700">Changes:</div>
              {aiDiff.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-xs"
                >
                  <span className="font-medium text-stone-700">{d.field}</span>
                  <span className="text-stone-500">
                    <span className="text-red-500 line-through">{d.before ?? "—"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-emerald-700 font-medium">{d.after ?? "removed"}</span>
                  </span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={discardAiChanges}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Discard
                </Button>
                <Button
                  onClick={applyAiChanges}
                  disabled={busy}
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Apply changes
                </Button>
              </div>
            </div>
          )}
          {aiDiff && aiDiff.length === 0 && aiPending && (
            <div className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-stone-700">
              No changes detected. Try rephrasing.
            </div>
          )}
        </div>

        {/* Floating Bottom Summary Card (1:1 with media_1790971011559.jpg) */}
        <div className="no-print mx-auto mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          {/* Row 1: Valid until on left, Status pill on right */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Valid until{" "}
              {quote.validUntil
                ? new Date(quote.validUntil).toLocaleDateString("en-GB")
                : "30 days"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-semibold ${
                isAccepted
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {isAccepted ? "Accepted" : quote.status?.toLowerCase() || "Draft"}
            </span>
          </div>

          {/* Row 2: Large total amount */}
          <div className="my-1 text-2xl font-black text-slate-900">
            {formatCurrency(quote.total || 0, business?.currency, business?.currencySymbol)}
          </div>

          {/* Row 3: Client name on left, Not sent / Sent pill on right */}
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-700">
            <span>{quote.customer?.name || "Unknown Client"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
              Not sent
            </span>
          </div>

          {/* Primary Send Button */}
          <Button
            onClick={() => openModal({ type: "send-quote", quoteId: quote.id })}
            className="w-full gap-2 py-2.5 font-semibold text-white shadow-sm"
            style={{ backgroundColor: theme.accent }}
          >
            <Send className="h-4 w-4" /> Send Estimate
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
              onClick={() => openModal({ type: "quote-edit", quoteId: quote.id })}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Edit className="h-4 w-4" />
              </div>
              <span>Edit</span>
            </button>
            {!isAccepted ? (
              <button
                onClick={markAccepted}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span>Accept</span>
              </button>
            ) : (
              <button
                onClick={convertToInvoice}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <span>To Invoice</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
