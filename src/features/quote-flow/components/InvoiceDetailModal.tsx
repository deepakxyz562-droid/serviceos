"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch, apiDelete, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, MoreHorizontal, Send, Download, CheckCircle2, Edit, Printer, Palette, Copy, FileText, ArrowLeft, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/quote-flow-calc";
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
      const items = (inv.items || []).map((it: any) => ({
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));
      const r = await apiPost<{ quote: any }>("/api/quotes", {
        customerId: inv.customerId,
        items,
        discountValue: inv.discountValue,
        discountType: inv.discountType,
        taxRate: inv.taxRate,
        notes: inv.notes,
        pdfTemplate: inv.pdfTemplate,
      });
      window.dispatchEvent(new CustomEvent("quote-list-changed"));
      openModal({ type: "quote-detail", quoteId: r.quote.id });
    } catch (e: any) {
      alert(e.message);
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

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
      {/* Full-page header with back button + actions */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-stone-900">Invoice {inv.number}</h2>
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
            <DropdownMenuItem onClick={() => openModal({ type: "template-select" })}>
              <Palette className="mr-2 h-4 w-4" /> Customize
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
            <DropdownMenuItem onClick={() => window.open(`/api/quote-flow/invoices/${inv.id}/pdf?download=1`, "_blank")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`/api/quote-flow/invoices/${inv.id}/pdf`, "_blank")}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
            <DropdownMenuItem onClick={remove} className="text-red-600 focus:text-red-700">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto max-w-md px-5 py-4 pb-24">

        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-stone-700">
            {inv.status.toLowerCase().replace("_", " ")}
          </span>
          {inv.dueDate && (
            <span className="text-xs text-stone-500">
              Due {new Date(inv.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mb-4 rounded-xl bg-stone-50 p-3">
          <div className="text-xs text-stone-400">Customer</div>
          <div className="text-sm font-semibold text-stone-900">
            {inv.customer?.name || "—"}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase text-stone-400">Items</div>
          <div className="space-y-1">
            {inv.items?.map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm">
                <div className="text-stone-700">
                  {it.description}
                  {it.qty !== 1 && <span className="ml-1 text-stone-400">× {it.qty}</span>}
                </div>
                <div className="font-medium text-stone-900">
                  {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-stone-200 pt-3 text-sm">
          <Row label="Subtotal" value={formatCurrency(inv.subtotal, business?.currency, business?.currencySymbol)} />
          {inv.discount > 0 && (
            <Row label="Discount" value={`- ${formatCurrency(inv.discount, business?.currency, business?.currencySymbol)}`} />
          )}
          {inv.tax > 0 && (
            <Row label={`Tax (${inv.taxRate}%)`} value={formatCurrency(inv.tax, business?.currency, business?.currencySymbol)} />
          )}
          <div className="flex justify-between pt-2 text-base font-bold text-stone-900">
            <span>TOTAL</span>
            <span>{formatCurrency(inv.total, business?.currency, business?.currencySymbol)}</span>
          </div>
          <div className="mt-2 flex justify-between text-emerald-700">
            <span>Paid</span>
            <span>{formatCurrency(inv.paidAmount, business?.currency, business?.currencySymbol)}</span>
          </div>
          {inv.balance > 0 && (
            <div className="flex justify-between font-semibold text-stone-900">
              <span>Balance</span>
              <span>{formatCurrency(inv.balance, business?.currency, business?.currencySymbol)}</span>
            </div>
          )}
        </div>

        {showPayForm && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <label className="text-xs font-medium text-stone-700">Payment amount</label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={String(inv.balance)}
                className="flex-1 rounded-md border border-stone-200 px-2 py-1 text-sm"
              />
              <Button
                onClick={recordPayment}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Record
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {inv.status !== "PAID" && (
            <>
              <Button
                onClick={() => setShowPayForm(!showPayForm)}
                variant="outline"
                className="flex-1"
              >
                Record payment
              </Button>
              <Button
                onClick={markPaid}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Mark paid
              </Button>
            </>
          )}
          <Button
            onClick={() => openModal({ type: "send-invoice", invoiceId: inv.id })}
            variant="outline"
            className="flex-1"
          >
            <Send className="mr-1 h-4 w-4" /> Share
          </Button>
        </div>

        {busy && (
          <div className="mt-3 flex items-center justify-center text-xs text-stone-400">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Working...
          </div>
        )}
      </div>

      {/* Bottom action bar — Download, Print, Edit, More */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-stone-200 bg-white px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openModal({ type: "invoice-edit", invoiceId: inv.id })}
          className="flex-1 text-xs gap-1.5"
        >
          <Edit className="size-4" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/quote-flow/invoices/${inv.id}/pdf?download=1`, "_blank")}
          className="flex-1 text-xs gap-1.5"
        >
          <Download className="size-4" /> PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/quote-flow/invoices/${inv.id}/pdf`, "_blank")}
          className="flex-1 text-xs gap-1.5"
        >
          <Printer className="size-4" /> Print
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <MoreHorizontal className="size-4" /> More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openModal({ type: "template-select" })}>
              <Palette className="mr-2 h-4 w-4" /> Customize
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
            <DropdownMenuItem onClick={() => toast.info("Thank you for your feedback! We'll use it to improve.")}>
              <MessageSquare className="mr-2 h-4 w-4" /> Feedback
            </DropdownMenuItem>
            <DropdownMenuItem onClick={remove} className="text-red-600 focus:text-red-700">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
