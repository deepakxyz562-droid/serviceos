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
  Sparkles,
  Wand2,
  Check,
  ArrowRight,
  Layers,
} from "lucide-react";
import {
  computeInvoiceTotals,
  formatCurrency,
  type DocumentType,
  type CalcLineItem,
  type ProposalTier,
  generateDefaultTiers,
  computeTierTotals,
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
  const modal = useAppStore((s) => s.modal);

  const initialDraft = modal.type === "quote-create" ? modal.initialDraft : null;

  const [docType, setDocType] = useState<DocumentType>("ESTIMATE");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialDraft?.matchedCustomer?.id || ""
  );
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");

  // Items
  const [items, setItems] = useState<Item[]>(
    initialDraft?.items?.length
      ? initialDraft.items
      : [{ description: "Service Estimate", qty: 1, unitPrice: 25000, taxRate: 18 }]
  );

  // Multi-Tier Proposals (Good / Better / Best)
  const [isMultiTier, setIsMultiTier] = useState<boolean>(!!initialDraft?.isMultiTier);
  const [tiers, setTiers] = useState<ProposalTier[]>(
    initialDraft?.tiers || generateDefaultTiers(items)
  );
  const [activeTierId, setActiveTierId] = useState<string>("professional");

  // Conversational "Ask AI"
  const [showAskAi, setShowAskAi] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(
    initialDraft?.summary ? `AI Draft: ${initialDraft.summary}` : null
  );

  // Adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState<number>(initialDraft?.discountValue ?? 0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">(
    initialDraft?.discountType ?? "AMOUNT"
  );
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(0);

  // Details
  const [quoteNumber, setQuoteNumber] = useState("EST0001");
  const [validUntilText, setValidUntilText] = useState("Valid for 30 days");
  const [currency, setCurrency] = useState(initialDraft?.currency || business?.currency || "INR");
  const [notes, setNotes] = useState(initialDraft?.terms || initialDraft?.notes || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ customers: any[] }>("/api/customers").then((r) => {
      const list = r.customers || [];
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        // If initialDraft customer name matches, select it
        if (initialDraft?.customer?.name) {
          const match = list.find((c) =>
            c.name.toLowerCase().includes(initialDraft.customer.name.toLowerCase())
          );
          if (match) {
            setSelectedCustomerId(match.id);
            return;
          }
        }
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
    if (isMultiTier) {
      setTiers((prev) =>
        prev.map((t) =>
          t.id === activeTierId
            ? {
                ...t,
                items: t.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
              }
            : t
        )
      );
    }
  }

  function addItem() {
    const newItem = { description: "", qty: 1, unitPrice: 0, taxRate: 18 };
    setItems((arr) => [...arr, newItem]);
    if (isMultiTier) {
      setTiers((prev) =>
        prev.map((t) => (t.id === activeTierId ? { ...t, items: [...t.items, newItem] } : t))
      );
    }
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems((arr) => arr.filter((_, i) => i !== idx));
    if (isMultiTier) {
      setTiers((prev) =>
        prev.map((t) =>
          t.id === activeTierId ? { ...t, items: t.items.filter((_, i) => i !== idx) } : t
        )
      );
    }
  }

  // Conversational "Ask AI" document editor
  async function handleAskAi(customPrompt?: string) {
    const prompt = customPrompt || aiInstruction;
    if (!prompt.trim()) return;

    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await apiPost<{
        updated: {
          items: Item[];
          discountValue: number;
          discountType: "AMOUNT" | "PERCENT";
          taxRate: number;
          notes?: string;
        };
        summary: string;
      }>("/api/quote-flow/ai/edit-quote", {
        currentQuote: {
          items,
          discountValue,
          discountType,
          taxRate: 18,
          notes,
        },
        instruction: prompt,
      });

      if (res?.updated) {
        if (res.updated.items?.length) setItems(res.updated.items);
        if (typeof res.updated.discountValue === "number") setDiscountValue(res.updated.discountValue);
        if (res.updated.discountType) setDiscountType(res.updated.discountType);
        if (res.updated.notes) setNotes(res.updated.notes);
        setAiFeedback(res.summary || `Applied: "${prompt}"`);
        setAiInstruction("");
      }
    } catch (e: any) {
      setAiFeedback(e.message || "Failed to apply AI edit");
    } finally {
      setAiLoading(false);
    }
  }

  function switchTier(tierId: string) {
    setActiveTierId(tierId);
    const target = tiers.find((t) => t.id === tierId);
    if (target && target.items.length > 0) {
      setItems(target.items as Item[]);
    }
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
      // If multi-tier, serialize tier details in metadata
      const computedTiers = isMultiTier
        ? tiers.map((t) => computeTierTotals(t, docType, currency))
        : null;

      const payloadNotes = isMultiTier
        ? JSON.stringify({
            clientNote: notes || "Review the 3 options and select your preferred package.",
            isMultiTier: true,
            tiers: computedTiers,
          })
        : notes || undefined;

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
        notes: payloadNotes,
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

          {/* 2026 CORE: Conversational "Ask AI" Document Assistant */}
          <div className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-white p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-black text-stone-900">Ask AI Assistant</span>
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                    2026 Live
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAskAi(!showAskAi)}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                {showAskAi ? "Hide AI Controls" : "Open AI Chat"}
              </button>
            </div>

            {aiFeedback && (
              <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-emerald-50/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{aiFeedback}</span>
              </div>
            )}

            {/* AI Prompt Input Bar */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                placeholder="Ask AI: 'Give 10% discount', 'Add 3 hrs support for $150'..."
                className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/30"
              />
              <Button
                onClick={() => handleAskAi()}
                disabled={aiLoading || !aiInstruction.trim()}
                className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Quick Action Chips */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[
                { label: "💡 10% Discount", action: "give 10% discount" },
                { label: "💡 18% GST", action: "add 18% GST tax rate" },
                { label: "💡 50% Deposit Terms", action: "add 50% upfront deposit terms" },
                { label: "💡 Add 1 Year Support ($350)", action: "add 1 Year VIP Support for $350" },
                { label: "💡 Professional Rewrite", action: "make all item descriptions more professional" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAskAi(chip.action)}
                  disabled={aiLoading}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 ring-1 ring-stone-200/80 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-300"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2026 CORE: Good / Better / Best Multi-Tier Proposal Switcher */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900">Proposal Mode</span>
                  <span className="ml-1.5 text-[10px] text-stone-500">
                    {isMultiTier ? "3 Tier Packages" : "Single Estimate"}
                  </span>
                </div>
              </div>
              <div className="flex rounded-lg bg-stone-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setIsMultiTier(false)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    !isMultiTier ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiTier(true);
                    if (!tiers || tiers.length === 0) setTiers(generateDefaultTiers(items));
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    isMultiTier ? "bg-white text-blue-600 shadow-xs" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  3-Tier (Good / Better / Best) ⭐
                </button>
              </div>
            </div>

            {isMultiTier && (
              <div className="mt-2 border-t border-stone-100 pt-2.5">
                <div className="flex gap-1.5">
                  {tiers.map((tier) => {
                    const isActive = activeTierId === tier.id;
                    const tierTotals = computeTierTotals(tier, docType, currency).totals;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => switchTier(tier.id)}
                        className={`flex-1 rounded-xl p-2 text-left transition border ${
                          isActive
                            ? "border-blue-500 bg-blue-50/40 shadow-xs"
                            : "border-stone-200/80 bg-stone-50/50 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase ${isActive ? "text-blue-700" : "text-stone-500"}`}>
                            {tier.name.split(" ")[0]}
                          </span>
                          {tier.isRecommended && (
                            <span className="rounded bg-amber-100 px-1 py-0.2 text-[8px] font-black text-amber-800">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-black text-stone-900">
                          {formatCurrency(tierTotals?.total || 0, currency)}
                        </div>
                        <div className="mt-0.5 text-[9px] text-stone-500 line-clamp-1">
                          {tier.items.length} items included
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-stone-400">
                  Editing items below updates the currently selected tier. Clients can select their preferred package on the interactive link.
                </p>
              </div>
            )}
          </div>

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
