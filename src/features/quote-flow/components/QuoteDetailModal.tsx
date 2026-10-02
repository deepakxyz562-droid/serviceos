"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch, apiDelete, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, Pencil, Copy, Trash2, MoreHorizontal, Send, Download, Sparkles } from "lucide-react";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";
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
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  if (!quote) return null;

  const totals = {
    subtotal: quote.subtotal,
    discount: quote.discount,
    tax: quote.tax,
    total: quote.total,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={closeModal}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-stone-900">Quote {quote.number}</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={duplicateQuote}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markAccepted}>
                Mark accepted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markDeclined}>
                Mark declined
              </DropdownMenuItem>
              <DropdownMenuItem onClick={convertToInvoice}>
                Convert to invoice →
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={remove}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-stone-700">
            {quote.status.toLowerCase()}
          </span>
          {quote.validUntil && (
            <span className="text-xs text-stone-500">
              Valid until {new Date(quote.validUntil).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mb-4 rounded-xl bg-stone-50 p-3">
          <div className="text-xs text-stone-400">Customer</div>
          <div className="text-sm font-semibold text-stone-900">
            {quote.customer?.name || "—"}
          </div>
          {quote.customer?.email && (
            <div className="text-xs text-stone-500">{quote.customer.email}</div>
          )}
          {quote.customer?.phone && (
            <div className="text-xs text-stone-500">{quote.customer.phone}</div>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase text-stone-400">Items</div>
          <div className="space-y-1">
            {quote.items?.map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm">
                <div className="text-stone-700">
                  {it.description}
                  {it.qty !== 1 && (
                    <span className="ml-1 text-stone-400">× {it.qty}</span>
                  )}
                </div>
                <div className="font-medium text-stone-900">
                  {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-stone-200 pt-3 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal, business?.currency, business?.currencySymbol)} />
          {totals.discount > 0 && (
            <Row label="Discount" value={`- ${formatCurrency(totals.discount, business?.currency, business?.currencySymbol)}`} />
          )}
          {totals.tax > 0 && (
            <Row label={`Tax (${quote.taxRate}%)`} value={formatCurrency(totals.tax, business?.currency, business?.currencySymbol)} />
          )}
          <div className="flex justify-between pt-2 text-base font-bold text-stone-900">
            <span>TOTAL</span>
            <span>{formatCurrency(totals.total, business?.currency, business?.currencySymbol)}</span>
          </div>
        </div>

        {/* AI edit panel */}
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
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
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
          />
          <Button
            onClick={aiEdit}
            disabled={aiProcessing || !aiInstruction.trim()}
            size="sm"
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {aiProcessing ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3 w-3" />
            )}
            {aiProcessing ? "AI is thinking..." : "Update with AI"}
          </Button>
          {aiSummary && (
            <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-xs text-stone-700">
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Apply changes
                </Button>
              </div>
            </div>
          )}
          {aiDiff && aiDiff.length === 0 && aiPending && (
            <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-xs text-stone-700">
              No changes detected. Try rephrasing.
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button
            onClick={() => openModal({ type: "send-quote", quoteId: quote.id })}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="mr-1 h-4 w-4" /> Send
          </Button>
        </div>

        {busy && (
          <div className="mt-3 flex items-center justify-center text-xs text-stone-400">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Working...
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
