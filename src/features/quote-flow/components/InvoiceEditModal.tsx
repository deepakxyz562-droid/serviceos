"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch, apiDelete } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  SlidersHorizontal,
  Building2,
  Users2,
  Receipt,
  CreditCard,
  Banknote,
  PenTool,
  FileText,
  Paperclip,
  Bookmark,
  Crown,
  MoreVertical,
  CheckCircle2,
  ChevronsUpDown,
  LayoutTemplate,
} from "lucide-react";
import { formatCurrency, computeTotals, type DocumentType } from "@/lib/quote-flow-calc";
import { TemplateSelectModal } from "./TemplateSelectModal";
import { toast } from "sonner";

interface Item {
  id?: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export function InvoiceEditModal({ invoiceId }: { invoiceId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  // Core Document Fields
  const [docType, setDocType] = useState<DocumentType>("SIMPLE_BILL");
  const [invoiceNumber, setInvoiceNumber] = useState("INV0001");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt");
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Parties & Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Line items
  const [items, setItems] = useState<Item[]>([]);

  // Financial adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);

  // Extended settings
  const [currency, setCurrency] = useState(business?.currency || "INR");
  const [paymentMethod, setPaymentMethod] = useState("Bank / UPI");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("UNPAID");
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  // Sub-dialogs
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [invData, custData] = await Promise.all([
          api<{ invoice: any }>(`/api/invoices/${invoiceId}`),
          api<{ customers: any[] }>("/api/customers").catch(() => ({ customers: [] })),
        ]);

        const inv = invData.invoice;
        setInvoice(inv);
        setInvoiceNumber(inv.number || "INV0001");
        setItems(inv.items || []);
        setDiscountValue(inv.discountValue || 0);
        setDiscountType(inv.discountType || "AMOUNT");
        setTaxRate(inv.taxRate || 0);
        setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
        setNotes(inv.notes || "");
        setStatus(inv.status || "UNPAID");
        setSelectedCustomerId(inv.customerId || "");
        setCustomers(custData.customers || []);

        if (inv.pdfTemplate) {
          const tpl = inv.pdfTemplate.includes(":")
            ? inv.pdfTemplate.split(":").pop()!
            : inv.pdfTemplate;
          setSelectedTemplateId(tpl);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const totals = computeTotals(
    items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
    discountValue,
    discountType,
    taxRate,
    currency
  );

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) {
      toast.info("Invoice must have at least one line item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save(thenPreview = false) {
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiPatch(`/api/invoices/${invoiceId}`, {
        customerId: selectedCustomerId || undefined,
        items: items.map((i) => ({
          description: i.description,
          qty: Number(i.qty) || 0,
          unitPrice: Number(i.unitPrice) || 0,
        })),
        discountValue: Number(discountValue) || 0,
        discountType,
        taxRate: Number(taxRate) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes || undefined,
        status,
        pdfTemplate: `${docType}:${selectedTemplateId}`,
      });

      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      closeModal();
      if (thenPreview) {
        openModal({ type: "invoice-detail", invoiceId });
      }
    } catch (e: any) {
      setError(e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to permanently delete this invoice?")) {
      return;
    }
    setDeleting(true);
    try {
      await apiDelete(`/api/invoices/${invoiceId}`);
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      closeModal();
      toast.success("Invoice deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-100/90 font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-28">
        {/* Top App Bar (matching edit.jpeg) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur-md">
          <button
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-800 hover:bg-slate-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-bold text-slate-900">Edit Invoice</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal({ type: "pro-upgrade" as any })}
              className="text-amber-500 hover:text-amber-600"
            >
              <Crown className="h-5 w-5 fill-amber-500" />
            </button>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Dropdown Menu */}
        {showStatusMenu && (
          <div className="absolute right-4 top-14 z-30 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {(["UNPAID", "PAID", "OVERDUE", "PARTIALLY_PAID"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatus(st);
                  setShowStatusMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  status === st ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{st.replace("_", " ")}</span>
                {status === st && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}

        {/* Segmented Document Type Selector (Tax Invoice | Bill of Supply | Simple Bill) */}
        <div className="px-4 pt-3.5">
          <div className="flex rounded-xl bg-slate-200/70 p-1">
            {(
              [
                { id: "TAX_INVOICE", label: "Tax Invoice" },
                { id: "BILL_OF_SUPPLY", label: "Bill of Supply" },
                { id: "SIMPLE_BILL", label: "Simple Bill" },
              ] as const
            ).map((t) => {
              const active = docType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setDocType(t.id);
                    if (t.id === "TAX_INVOICE" && taxRate === 0) setTaxRate(18);
                    if (t.id === "BILL_OF_SUPPLY") setTaxRate(0);
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    active
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Cards */}
        <div className="flex-1 space-y-3 p-4">
          {error && (
            <div className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* Card 1: Invoice Number & Due date */}
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-xs">
            <div>
              <div className="text-base font-black tracking-tight text-slate-900">
                {invoiceNumber}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {dueDate ? `Due on ${dueDate}` : paymentTerms}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
              <span>INVOICE</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Card 2: Templates Picker */}
          <div
            onClick={() => setShowTemplatePicker(true)}
            className="flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 shadow-xs transition hover:bg-slate-50/80"
          >
            <div className="flex items-center gap-3">
              <LayoutTemplate className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-bold text-slate-800">Templates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-7 flex-col justify-between rounded-xs border border-blue-200 bg-white p-1 shadow-2xs">
                <div className="h-1.5 w-full rounded-xs bg-blue-600" />
                <div className="h-0.5 w-3/4 rounded-xs bg-slate-300" />
                <div className="h-0.5 w-full rounded-xs bg-slate-200" />
                <div className="h-1 w-2/5 self-end rounded-xs bg-blue-400" />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Card 3: Connected Parties (Bill From connected by dotted line to Bill To) */}
          <div className="rounded-2xl bg-white p-4 shadow-xs">
            {/* Bill From */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Bill From</div>
                  <div className="text-xs text-slate-500">
                    {business?.name || "Add Business"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => openModal({ type: "onboarding" })}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Vertical Dotted Connector Line */}
            <div className="my-1.5 ml-5 flex h-5 w-0 border-l-2 border-dashed border-slate-300" />

            {/* Bill To */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Bill To</div>
                  <div className="text-xs text-slate-500">
                    {selectedCustomer ? selectedCustomer.name : "Add Clients"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs hover:bg-blue-700"
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
                      <div className="text-xs font-bold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.email || c.phone || "No details"}</div>
                    </div>
                    {selectedCustomerId === c.id && (
                      <span className="text-xs font-bold text-blue-600">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 4: Items Card */}
          <div className="rounded-2xl bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Items</div>
                  <div className="text-xs text-slate-400">
                    {items.length > 0 ? `${items.length} item(s)` : "Add Items"}
                  </div>
                </div>
              </div>
              <button
                onClick={addItem}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Item description / service"
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => updateItem(idx, "qty", Number(e.target.value) || 1)}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold"
                      />
                    </div>
                    <span className="text-slate-400 text-xs">×</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Price</span>
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold"
                      />
                    </div>
                    <div className="text-right text-xs font-bold text-slate-900">
                      {formatCurrency((it.qty || 0) * (it.unitPrice || 0), currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Unified Financial Summary Card (Subtotal, Adjustment, Total) (edit.jpeg) */}
          <div className="rounded-2xl bg-white p-4 shadow-xs">
            {/* Subtotal Row */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-bold text-slate-900">Subtotal</span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>

            <div className="my-3 border-t border-dashed border-slate-200" />

            {/* Adjustment Row */}
            <div
              onClick={() => setShowAdjustments(!showAdjustments)}
              className="flex cursor-pointer items-center justify-between py-1"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Adjustment</div>
                  <div className="text-xs text-slate-500">
                    Add Discount, Tax & Shipping
                  </div>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-500" />
            </div>

            {/* Expandable Adjustments Drawer */}
            {showAdjustments && (
              <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">DISCOUNT</span>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")
                        }
                        className="rounded-lg bg-slate-200 px-2 text-xs font-bold text-slate-700"
                      >
                        {discountType === "PERCENT" ? "%" : "₹"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">SHIPPING FEE</span>
                    <input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500">TAX RATE (%)</span>
                  <input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            <div className="my-3 border-t border-dashed border-slate-200" />

            {/* Total Row */}
            <div className="flex items-center justify-between py-1">
              <span className="text-base font-extrabold text-slate-900">Total</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatCurrency(totals.total, currency)}
              </span>
            </div>
          </div>

          {/* Card 6: Extended Options Card (Currency, Payment Method, Signature, Terms or Notes) (edit-2.jpeg) */}
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-xs">
            {/* Currency */}
            <div
              onClick={() => {
                const nextCurr = currency === "INR" ? "USD" : currency === "USD" ? "EUR" : "INR";
                setCurrency(nextCurr);
              }}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50/80 transition"
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Currency</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <span>{currency} {currency === "INR" ? "₹" : "$"}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Payment Method */}
            <div
              onClick={() => toast.info("Payment method: Bank Transfer & UPI configured")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50/80 transition"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Payment Method</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Signature */}
            <div
              onClick={() => toast.info("Default business signature is applied to this invoice.")}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50/80 transition"
            >
              <div className="flex items-center gap-3">
                <PenTool className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Signature</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Terms or Notes */}
            <div
              onClick={() => setShowNotesModal(true)}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50/80 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Terms or Notes</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Card 7: Attachments Card (edit-2.jpeg) */}
          <div
            onClick={() => toast.info("Attachments: Photos / PDFs supported")}
            className="flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 shadow-xs hover:bg-slate-50/80 transition"
          >
            <div className="flex items-center gap-3">
              <Paperclip className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Attachments</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>

          {/* Card 8: Mark as Status & Stamp Card (edit-2.jpeg) */}
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-xs">
            {/* Mark as */}
            <div
              onClick={() => setShowStatusMenu(true)}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50/80 transition"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Mark as</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <span>{status === "PAID" ? "Paid" : "Unpaid"}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Show 'PAID' Stamp on Invoice */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">
                  Show &apos;PAID&apos; Stamp on Invoice
                </span>
              </div>
              <input
                type="checkbox"
                checked={showPaidStamp}
                onChange={(e) => setShowPaidStamp(e.target.checked)}
                className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Card 9: Delete Invoice Button (edit-2.jpeg) */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-xs hover:bg-red-50/60 transition"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-600" />
            )}
            <span>Delete Invoice</span>
          </button>
        </div>

        {/* Sticky Bottom Action Bar (edit.jpeg & edit-2.jpeg) */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex-[0.38] rounded-full border border-slate-300 bg-white py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
            >
              Preview
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-[0.62] rounded-full border-2 border-blue-600 bg-white py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        {/* Template Select Modal */}
        {showTemplatePicker && (
          <TemplateSelectModal
            currentTemplateId={selectedTemplateId}
            onSelect={(id) => {
              setSelectedTemplateId(id);
              setShowTemplatePicker(false);
            }}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}

        {/* Notes / Terms Editor Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">Terms or Notes</h3>
              <p className="mt-1 text-xs text-slate-500">
                Payment instructions, delivery terms, or client notes.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Payment due within 15 days..."
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowNotesModal(false)}
                  className="rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
