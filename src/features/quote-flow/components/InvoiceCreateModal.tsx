"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Plus, Trash2, Sparkles, Pencil, Search, FileText } from "lucide-react";
import { computeTotals, formatCurrency } from "@/lib/quote-flow-calc";

interface Item {
  description: string;
  qty: number;
  unitPrice: number;
}

export function InvoiceCreateModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [mode, setMode] = useState<"choose" | "manual" | "ai-text" | "from-quote">("choose");
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState(business?.defaultTaxRate ?? 0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState<"modern" | "simple">("modern");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI state
  const [aiInput, setAiInput] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    api<{ customers: any[] }>("/api/customers").then((r) => setCustomers(r.customers || []));
    api<{ quotes: any[] }>("/api/quotes").then((r) =>
      setQuotes((r.quotes || []).filter((q) => q.status === "ACCEPTED" || q.status === "DRAFT"))
    );
  }, []);

  const totals = computeTotals(items, discountValue, discountType, taxRate, business?.currency);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((arr) => [...arr, { description: "", qty: 1, unitPrice: 0 }]);
  }
  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function applyAiDraft(draft: any) {
    if (draft.items && draft.items.length > 0) {
      setItems(
        draft.items.map((i: any) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        }))
      );
    }
    if (typeof draft.discountValue === "number") setDiscountValue(draft.discountValue);
    if (draft.discountType) setDiscountType(draft.discountType as any);
    if (typeof draft.taxRate === "number") setTaxRate(draft.taxRate);
    if (draft.notes) setNotes(draft.notes);
    if (draft.summary) setAiSummary(draft.summary);
  }

  async function processAiText() {
    if (aiInput.trim().length < 5) {
      setError("Please describe the invoice in more detail");
      return;
    }
    setAiProcessing(true);
    setError(null);
    try {
      // Reuse the quote-from-text endpoint — same shape (items + discount + tax)
      const r = await apiPost<{ draft: any }>("/api/ai/quote-from-text", {
        text: aiInput,
        defaultTaxRate: business?.defaultTaxRate ?? 0,
      });
      if (!r.draft) {
        setError("AI failed to parse your description");
        setAiProcessing(false);
        return;
      }
      applyAiDraft(r.draft);
      setMode("manual");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiProcessing(false);
    }
  }

  async function save() {
    if (!selectedCustomerId) {
      setError("Please pick a customer");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError("Please fill in all item descriptions");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<{ invoice: any }>("/api/invoices/create-with-items", {
        customerId: selectedCustomerId,
        items: items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        discountValue,
        discountType,
        taxRate,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes || undefined,
        aiRawInput: aiInput || undefined,
        pdfTemplate,
      });
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      closeModal();
      openModal({ type: "invoice-detail", invoiceId: r.invoice.id });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function convertFromQuote(quoteId: string) {
    setLoading(true);
    setError(null);
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
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Choose screen
  if (mode === "choose") {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
        <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Create Invoice</h2>
            <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-4 text-sm text-stone-500">Choose how you want to create it.</p>
          <div className="space-y-2">
            <ModeCard
              icon={<Sparkles className="h-5 w-5 text-emerald-600" />}
              title="Describe it"
              subtitle='"Invoice ABC for $2,500 website work..."'
              tag="Now"
              onClick={() => setMode("ai-text")}
            />
            <ModeCard
              icon={<FileText className="h-5 w-5 text-emerald-600" />}
              title="From a Quote"
              subtitle="Convert an accepted quote"
              tag="Now"
              onClick={() => setMode("from-quote")}
            />
            <ModeCard
              icon={<Pencil className="h-5 w-5 text-emerald-600" />}
              title="Create manually"
              subtitle="Traditional invoice"
              tag="Now"
              onClick={() => setMode("manual")}
            />
          </div>
        </div>
      </div>
    );
  }

  // From Quote mode
  if (mode === "from-quote") {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
            <button onClick={() => setMode("choose")} className="text-sm text-stone-500">
              ‹ Back
            </button>
            <h2 className="text-base font-semibold text-stone-900">From Quote</h2>
            <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5">
            {quotes.length === 0 ? (
              <div className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
                No accepted quotes yet. Accept a quote first, then convert it to an invoice.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="mb-2 text-xs text-stone-500">
                  Tap a quote to convert it to an invoice with one tap.
                </p>
                {quotes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => convertFromQuote(q.id)}
                    disabled={loading}
                    className="w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-stone-900">
                          {q.customer?.name || "—"}
                        </div>
                        <div className="text-xs text-stone-500">
                          {q.number} · {q.items?.length || 0} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-stone-900">
                          {formatCurrency(q.total, business?.currency, business?.currencySymbol)}
                        </div>
                        <div className="text-xs capitalize text-stone-500">{q.status.toLowerCase()}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            {loading && (
              <div className="mt-3 flex items-center justify-center text-xs text-stone-400">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Converting...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // AI text mode
  if (mode === "ai-text") {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
            <button onClick={() => setMode("choose")} className="text-sm text-stone-500">
              ‹ Back
            </button>
            <h2 className="text-base font-semibold text-stone-900">Describe it</h2>
            <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="text-xs text-emerald-700">
                Type your invoice description in plain English. AI will extract line items, discount, tax.
              </p>
            </div>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Invoice ABC for $2,500 website development, 10% discount, 8% tax."
              rows={5}
              className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
            />
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <Button
              onClick={processAiText}
              disabled={aiProcessing || !aiInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {aiProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {aiProcessing ? "AI is thinking..." : "Create Invoice"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Manual builder
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
          <button onClick={() => setMode("choose")} className="text-sm text-stone-500">
            ‹ Back
          </button>
          <h2 className="text-base font-semibold text-stone-900">Manual Invoice</h2>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {aiSummary && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-2 text-xs text-emerald-700">
            <span className="font-semibold">AI summary:</span> {aiSummary}
          </div>
        )}

        <div className="space-y-4 p-5">
          {/* Customer */}
          <div>
            <Label>Customer *</Label>
            {selectedCustomer ? (
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="mt-1 flex w-full items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-stone-900">{selectedCustomer.name}</div>
                  <div className="text-xs text-stone-500">{selectedCustomer.email || selectedCustomer.phone || "—"}</div>
                </div>
                <Pencil className="h-4 w-4 text-stone-400" />
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="mt-1 flex w-full items-center gap-2 rounded-md border border-dashed border-stone-300 px-3 py-2 text-stone-500 hover:border-stone-400"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Pick a customer</span>
              </button>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-stone-400">Items</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="space-y-2 rounded-lg bg-stone-50 p-3">
                  <div className="flex gap-2">
                    <input
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder="Item description"
                      className="flex-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(i)}
                        className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-stone-400">Qty</label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.qty}
                        onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-stone-400">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-stone-400">Amount</label>
                      <div className="rounded-md bg-white px-2 py-1.5 text-sm font-medium text-stone-700">
                        {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-stone-300 py-2 text-sm text-stone-500 hover:border-stone-400"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>

          {/* Discount + tax */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount</Label>
              <div className="mt-1 flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 rounded-md border border-stone-200 px-2 py-1.5 text-sm"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="AMOUNT">$</option>
                  <option value="PERCENT">%</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Tax (%)</Label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* PDF template */}
          <div>
            <Label>Template</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                onClick={() => setPdfTemplate("modern")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  pdfTemplate === "modern"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => setPdfTemplate("simple")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  pdfTemplate === "simple"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                Simple
              </button>
            </div>
          </div>

          {/* Due date + notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-stone-50 p-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal, business?.currency, business?.currencySymbol)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Discount</span>
                <span>- {formatCurrency(totals.discount, business?.currency, business?.currencySymbol)}</span>
              </div>
            )}
            {totals.tax > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Tax</span>
                <span>{formatCurrency(totals.tax, business?.currency, business?.currencySymbol)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-bold text-stone-900">
              <span>Total</span>
              <span>{formatCurrency(totals.total, business?.currency, business?.currencySymbol)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => setMode("choose")} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Customer picker */}
      {showCustomerPicker && (
        <CustomerPicker
          customers={customers}
          onPick={(c) => {
            setSelectedCustomerId(c.id);
            setShowCustomerPicker(false);
          }}
          onClose={() => setShowCustomerPicker(false)}
          onNew={() => {
            setShowCustomerPicker(false);
            openModal({ type: "customer-form" });
          }}
        />
      )}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  tag,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-stone-50 p-3 text-left ring-1 ring-stone-200 transition enabled:hover:ring-stone-300 disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-stone-900">{title}</div>
        <div className="text-xs text-stone-500">{subtitle}</div>
      </div>
      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
        {tag}
      </span>
    </button>
  );
}

function CustomerPicker({
  customers,
  onPick,
  onClose,
  onNew,
}: {
  customers: any[];
  onPick: (c: any) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.email || "").toLowerCase().includes(q.toLowerCase())
      )
    : customers;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">Pick customer</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="mb-3 w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
        />
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <button
              onClick={onNew}
              className="w-full rounded-md bg-stone-50 p-3 text-left text-sm text-stone-500 hover:bg-stone-100"
            >
              No matches — create a new customer?
            </button>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                className="w-full rounded-md p-3 text-left hover:bg-stone-50"
              >
                <div className="text-sm font-medium text-stone-900">{c.name}</div>
                <div className="text-xs text-stone-500">{c.email || c.phone || "—"}</div>
              </button>
            ))
          )}
        </div>
        <button
          onClick={onNew}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-stone-300 py-2 text-sm text-emerald-600 hover:border-emerald-400"
        >
          <Plus className="h-4 w-4" /> New customer
        </button>
      </div>
    </div>
  );
}
