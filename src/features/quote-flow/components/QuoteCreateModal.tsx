"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  X,
  Plus,
  Trash2,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Building2,
  Users2,
  Calendar,
  DollarSign,
  Crown,
} from "lucide-react";
import {
  computeInvoiceTotals,
  formatCurrency,
  type DocumentType,
  type CalcLineItem,
} from "@/lib/quote-flow-calc";
import { TemplateSelectModal } from "./TemplateSelectModal";

interface Item extends CalcLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  taxRate?: number;
}

export function QuoteCreateModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);

  const [docType, setDocType] = useState<DocumentType>("ESTIMATE");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");

  // Items
  const [items, setItems] = useState<Item[]>([
    { description: "Service Estimate", qty: 1, unitPrice: 25000, taxRate: 18 },
  ]);

  // Adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [shippingFee, setShippingFee] = useState(0);
  const [globalTaxRate, setGlobalTaxRate] = useState(0);

  // Details
  const [quoteNumber, setQuoteNumber] = useState("EST0001");
  const [validUntilText, setValidUntilText] = useState("Valid for 30 days");
  const [currency, setCurrency] = useState(business?.currency || "INR");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ customers: any[] }>("/api/customers").then((r) => {
      const list = r.customers || [];
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(list[0].id);
      }
    });
  }, []);

  const totals = computeInvoiceTotals({
    items,
    documentType: docType === "ESTIMATE" ? "TAX_INVOICE" : docType,
    discountValue,
    discountType,
    globalTaxRate,
    shippingFee,
    currency,
  });

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((arr) => [
      ...arr,
      { description: "", qty: 1, unitPrice: 0, taxRate: 18 },
    ]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!selectedCustomerId) {
      setError("Please select a client for 'Bill To'");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError("Please fill in descriptions for all items");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ quote: any }>("/api/quotes/create-with-items", {
        customerId: selectedCustomerId,
        items: items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        discountValue,
        discountType,
        taxRate: 18,
        notes: notes || undefined,
        pdfTemplate: `${docType}:${selectedTemplateId}`,
      });

      window.dispatchEvent(new CustomEvent("quote-list-changed"));
      closeModal();
      openModal({ type: "quote-detail", quoteId: res.quote.id });
    } catch (e: any) {
      setError(e.message || "Failed to create estimate");
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl flex flex-col">
        {/* Top Navbar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-bold text-stone-900">Create Estimate</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal({ type: "pro-upgrade" as any })}
              className="flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-0.5 text-xs font-black text-white shadow-xs"
            >
              <Crown className="h-3.5 w-3.5 fill-white" />
              <span>18M FREE</span>
            </button>
          </div>
        </div>

        {/* Top Segmented Document Type Selector */}
        <div className="p-4 bg-white border-b border-stone-100">
          <div className="flex rounded-xl bg-stone-100 p-1">
            {(
              [
                { id: "ESTIMATE", label: "Estimate" },
                { id: "TAX_INVOICE", label: "Tax Quote" },
                { id: "SIMPLE_BILL", label: "Simple Quote" },
              ] as const
            ).map((t) => {
              const active = docType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setDocType(t.id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-3.5 p-4 pb-28">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* Card 1: Document Details */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-black tracking-tight text-stone-900">{quoteNumber}</div>
                <div className="mt-0.5 text-xs font-medium text-stone-500">{validUntilText}</div>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-stone-50 px-2 py-1 text-xs font-bold text-stone-700">
                <span>ESTIMATE</span>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </div>
            </div>
          </div>

          {/* Card 2: Templates Preview */}
          <div
            onClick={() => setShowTemplatePicker(true)}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs transition hover:border-stone-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-stone-800">Templates</span>
                <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">All 100+ Free</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-7 rounded border border-blue-200 bg-blue-50/60 p-0.5 shadow-2xs flex flex-col justify-between">
                <div className="h-1 w-full bg-blue-600 rounded-xs" />
                <div className="h-0.5 w-3/4 bg-stone-300 rounded-xs" />
                <div className="h-0.5 w-full bg-stone-200 rounded-xs" />
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Card 3: Connected Parties */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            {/* Bill From */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">Bill From</div>
                  <div className="text-xs text-stone-500">
                    {business?.name || "Add Business"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => openModal({ type: "onboarding" })}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Vertical Dotted Connector Line */}
            <div className="my-1.5 ml-5 flex h-6 w-0 border-l-2 border-dashed border-stone-300" />

            {/* Bill To */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">Bill To</div>
                  <div className="text-xs text-stone-500">
                    {selectedCustomer ? selectedCustomer.name : "Add Clients"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Customer Picker Dropdown */}
          {showCustomerPicker && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Select Client</span>
                <button
                  onClick={() => setShowCustomerPicker(false)}
                  className="text-xs font-semibold text-blue-600"
                >
                  Done
                </button>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setShowCustomerPicker(false);
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl bg-white p-2.5 shadow-2xs ${
                      selectedCustomerId === c.id ? "ring-2 ring-blue-600" : ""
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900">{c.name}</div>
                      <div className="text-[10px] text-stone-500">{c.email || c.phone || "No details"}</div>
                    </div>
                    {selectedCustomerId === c.id && (
                      <span className="text-xs font-bold text-blue-600">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 4: Items & Subtotals */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">Items</div>
                  <div className="text-xs text-stone-400">Add Items</div>
                </div>
              </div>
              <button
                onClick={addItem}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Line items rows */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200/60">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder="Item description (e.g. Electrical wiring)"
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-900"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400">QTY</span>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 1 })}
                        className="mt-0.5 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400">PRICE</span>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="mt-0.5 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400">GST %</span>
                      <select
                        value={item.taxRate ?? 18}
                        onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) })}
                        className="mt-0.5 w-full rounded-lg border border-stone-200 bg-white px-1.5 py-1 text-xs font-semibold"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-4 space-y-1.5 border-t border-dashed border-stone-200 pt-3 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span>Taxable Amount</span>
                <span className="font-semibold text-stone-800">
                  {formatCurrency(totals.taxableAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>GST Amount</span>
                <span className="font-semibold text-stone-800">
                  {formatCurrency(totals.gstAmount, currency)}
                </span>
              </div>
              <div className="my-1 border-b border-dashed border-stone-200" />
              <div className="flex items-center justify-between text-sm font-bold text-stone-900">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal, currency)}</span>
              </div>
            </div>
          </div>

          {/* Card 5: Adjustment */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div
              onClick={() => setShowAdjustments(!showAdjustments)}
              className="flex cursor-pointer items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">Adjustment</div>
                  <div className="text-xs text-stone-400">Add Discount &amp; Terms</div>
                </div>
              </div>
              <div className="text-stone-400">
                {showAdjustments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {showAdjustments && (
              <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">DISCOUNT</span>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold"
                      />
                      <button
                        onClick={() =>
                          setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")
                        }
                        className="rounded-lg bg-stone-100 px-2 text-xs font-bold text-stone-700"
                      >
                        {discountType === "PERCENT" ? "%" : "₹"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-stone-500">SHIPPING / LOGISTICS</span>
                    <input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-stone-200 pt-3">
              <span className="text-sm font-bold text-stone-900">Total Estimate</span>
              <span className="text-base font-black text-stone-900">
                {formatCurrency(totals.total, currency)}
              </span>
            </div>
          </div>

          {/* Card 6: Currency */}
          <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-stone-800">Currency</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
              <span>INR ₹</span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Card 7: Validity / Terms */}
          <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-stone-800">Validity Period</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
              <span>30 Days</span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Floating Bottom Sticky Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 p-3.5 backdrop-blur sm:absolute sm:rounded-b-3xl">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                alert(`Previewing Estimate with ${items.length} items. Total: ${formatCurrency(totals.total, currency)}`);
              }}
              className="flex-1 h-12 rounded-full border-blue-600 text-sm font-bold text-blue-600 hover:bg-blue-50"
            >
              Preview
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-12 rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Estimate
            </Button>
          </div>
        </div>

        {/* Template Picker Modal */}
        {showTemplatePicker && (
          <TemplateSelectModal
            currentTemplateId={selectedTemplateId}
            onSelect={(id) => setSelectedTemplateId(id)}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}
      </div>
    </div>
  );
}
